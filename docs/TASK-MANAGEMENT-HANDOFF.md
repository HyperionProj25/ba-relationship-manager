# Task Management — Build Handoff

**Project:** BA Relationship Manager
**Feature:** Add a Tasks module to the existing CRM
**Date:** 2026-05-13
**Author:** Chase Spivey + AI brainstorm session
**Audience:** Both Chase (non-technical) and the developer building it

---

## TL;DR (for Chase)

We're adding a fast, mobile-first task tracker to the CRM. Three buckets:

1. **Quick Todos** — generic to-dos
2. **Talk About** — running agenda items for specific people (Sheldon, Jeff, a contact). Cleared when you next see them.
3. **Reach Out Now** — urgent contact actions (call/text someone today)

Designed for one-handed phone capture. A floating **"+"** button sits in the bottom-right of every page. Two taps to capture a new task.

**AI is deferred.** We're building the dumb-but-fast version first. After two weeks of real use, we'll layer in AI (Ollama on desktop, or Claude in the cloud) based on what friction actually shows up — not what we *think* it'll be.

---

## 1. Current state of the codebase (what the dev is walking into)

### Stack
- **Framework:** Next.js 16.2.2 (App Router) — note: this is a newer version with breaking changes from older Next.js docs. The dev should skim `node_modules/next/dist/docs/` before non-trivial changes.
- **UI:** React 19, Tailwind CSS 4 (theme defined in `src/app/globals.css` via `@theme inline`)
- **Database:** Supabase (Postgres + JS client, no auth — single shared URL)
- **Fonts:** Manrope (sans), Space Mono (mono)
- **Deployment:** Vercel
- **TypeScript:** Strict, currently 0 errors. ESLint: 0 errors, 1 trivial warning.

### What's already built (do NOT rebuild)
- Contacts CRUD (`/contacts`, `/contacts/[id]`)
- Interactions CRUD (`/interactions`, `/interactions/[id]`)
- Follow-Ups page (`/follow-ups`) — filtered view of interactions with `follow_up_needed = true`
- Dashboard (`/`) — contact cadence cards (green/yellow/red freshness)
- Presentation mode (`/present`), Print report (`/print`)
- Freeform categories (any text allowed, with built-in suggestions: Baseline, MLB, Investor, IAB, Partner, Vendor, University, Other)

### Reusable patterns the dev should use
| Pattern | File | Use it for |
|---|---|---|
| Modal w/ focus trap + dirty-guard | `src/components/Modal.tsx` | Task capture sheet, edit task |
| Dirty-form callback pattern | `ContactForm.tsx` / `InteractionForm.tsx` | Task form |
| Status colors (Pending/Done/Overdue) | `src/lib/statusColors.ts` | Task status badges (reuse exact same scheme) |
| Local-date helper (avoids UTC off-by-one) | `src/lib/dates.ts` → `todayLocal()` | Anywhere we save a date |
| Cadence color gradient | `src/lib/cadence.ts` → `cadenceColor()` | Days-since-created urgency on stale tasks |
| Category pill filter | Dashboard page | Filter tasks by kind/contact |
| Supabase client singleton | `src/lib/supabase.ts` | All DB calls |

### Design system (don't invent new colors)
Defined in `src/app/globals.css`:
- Background: black `#000`
- Cards: `--color-dark-card` (`#0a0a0a`), `--color-dark-elevated` (`#111`)
- Accent: `--color-gold` (`#FFC655`), with `gold-hover`, `gold-dim`
- Borders: `--color-border` (`#1a1a1a`)
- Text: `--color-text-primary` (white), `text-secondary` (`#999`), `text-muted` (`#555`)
- Status: `--color-danger` (red), `--color-success` (green)

Tailwind classes already wired: `bg-dark-card`, `text-gold`, `border-border`, etc. **Use these, don't add new shades.**

### Files the dev will touch
- New: `src/app/tasks/page.tsx`, `src/components/TaskForm.tsx`, `src/components/TaskCard.tsx`, `src/components/QuickCaptureFab.tsx`, `supabase/migration_004_tasks.sql`
- Modify: `src/types/index.ts` (add Task types), `src/components/Navbar.tsx` (add Tasks nav item), `src/app/layout.tsx` (mount the floating button globally), `src/app/contacts/[id]/page.tsx` (show this contact's open "Talk About" items)

---

## 2. The Tasks feature — full spec

### Data model

One new table: `tasks`.

```sql
-- supabase/migration_004_tasks.sql
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('quick', 'talk', 'reach')),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  done boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  -- enforce: talk/reach require a contact, quick must not have one
  CONSTRAINT contact_required_for_talk_reach
    CHECK (
      (kind = 'quick' AND contact_id IS NULL)
      OR (kind IN ('talk', 'reach') AND contact_id IS NOT NULL)
    )
);

CREATE INDEX idx_tasks_kind_done ON tasks(kind, done);
CREATE INDEX idx_tasks_contact_id ON tasks(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_tasks_open ON tasks(done, created_at DESC) WHERE done = false;

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON tasks FOR ALL USING (true) WITH CHECK (true);
```

**TypeScript types** to add in `src/types/index.ts`:

```ts
export type TaskKind = 'quick' | 'talk' | 'reach'

export interface Task {
  id: string
  title: string
  kind: TaskKind
  contact_id: string | null
  done: boolean
  notes: string | null
  created_at: string
  completed_at: string | null
}

export interface TaskWithContact extends Task {
  contacts: Pick<Contact, 'id' | 'name'> | null
}
```

### Pages & UX

#### A) Tasks page — `/tasks`
Three stacked sections on one page (not tabs — Chase wants everything visible at once):

```
┌─ TO DO ──────────────────────┐
│ ☐ Send proposal              │
│ ☐ Review Q3 numbers          │
│ ☐ Order more coffee          │
└──────────────────────────────┘

┌─ TALK ABOUT ─────────────────┐
│ Sheldon                      │
│  ☐ Pricing change for X      │
│  ☐ Hire timeline             │
│ Jeff (MLB)                   │
│  ☐ Demo feedback             │
└──────────────────────────────┘

┌─ REACH OUT NOW ──────────────┐
│ ☐ Call Mike (Yankees)        │
│ ☐ Text Sarah re: invite      │
└──────────────────────────────┘
```

- Section headers use the gold accent style from the dashboard (`text-[11px] font-medium text-gold uppercase tracking-widest`)
- **Talk About** items grouped by contact name (alphabetical), all other sections flat
- Each row: checkbox + title + (for talk/reach) small "→ contact" link
- Tapping checkbox marks `done = true`, sets `completed_at = now()`, and the row fades + collapses out
- Long-press / tap-and-hold on a row opens edit sheet (or use a small "⋯" icon)
- Empty state per section: muted helper text ("No items. Tap + to add one.")
- Toggle at top: "Show completed (last 7 days)" — defaults off

#### B) Floating "+" button — `QuickCaptureFab`
- Mounted in `src/app/layout.tsx` so it appears on **every page**
- Bottom-right, 56×56 px, gold background, thumb-reach height (`bottom-6 right-6`, larger on mobile)
- Tap → opens a Modal-based capture sheet
- Sheet contents:
  1. Three big pill buttons at top: **Quick** / **Talk About** / **Reach Out** (default: Quick)
  2. Text input (auto-focused, "What needs doing?")
  3. Contact picker — **hidden** when kind is Quick, **required + auto-focused after kind selection** for Talk/Reach. Use the same searchable contact picker from `InteractionForm.tsx`.
  4. Save button (gold) + Cancel
- Total taps from any page to capture a quick todo: **+, type, Save = 3 taps**
- For talk/reach: **+, kind, contact, type, Save = 5 taps**

#### C) Contact detail page — `/contacts/[id]`
Add a new section above "Interaction History":

```
┌─ OPEN AGENDA ────────────────┐
│ ☐ Pricing change for X       │
│ ☐ Hire timeline              │
│ + Add agenda item            │
└──────────────────────────────┘
```

Shows this contact's open `kind = 'talk'` tasks. Same checkbox UX. Inline "+ Add" creates a new talk-about task pre-filled with this contact.

#### D) Interaction logging — auto-prompt to sweep agenda
When the user saves a new interaction with a contact who has open `kind = 'talk'` items:
- After save succeeds, show a small follow-up sheet: "You have 3 open agenda items for Sheldon. Mark any as discussed?"
- Checkbox list of their open talk items
- Tapping "Mark discussed" sets `done = true, completed_at = now()` on the selected ones
- Skip button always available — no friction if you don't want to

#### E) Navbar
Add `{ label: 'Tasks', href: '/tasks' }` to the nav items in `src/components/Navbar.tsx`, between "Follow-Ups" and "Present".

#### F) Dashboard (optional polish)
Add one new stat card: "Open Tasks" with a count. Skip if it crowds the layout.

---

## 3. Build plan — phased, with Claude Code prompts

Each phase is small enough to verify before moving to the next. The dev should run `npm run lint` and `npx tsc --noEmit` after each phase.

**For Chase:** the dev can paste each "Prompt for Claude Code" block directly into Claude Code in this project folder. Each phase has a clear "you can verify this works by..." line so you can sanity-check progress.

---

### Phase 1 — Database migration

**Goal:** Create the `tasks` table in Supabase.

**Verify by:** Going to Supabase → Table Editor → seeing a new `tasks` table with the right columns.

**Prompt for Claude Code:**
```
Create supabase/migration_004_tasks.sql per the spec in docs/TASK-MANAGEMENT-HANDOFF.md
section "Data model". Use the exact SQL provided there. Then walk me through running it
in the Supabase SQL Editor — give me the steps in plain English.

Also add the Task and TaskWithContact TypeScript types to src/types/index.ts per the
same section.

Run `npx tsc --noEmit` to confirm no type errors.
```

---

### Phase 2 — Tasks page (read-only first)

**Goal:** A `/tasks` page that shows the three sections, pulls from Supabase, and lets you check items off. No capture yet — we'll add the floating button in Phase 3.

**Verify by:** Manually inserting a few test rows into Supabase (one of each `kind`), navigating to `/tasks`, seeing them grouped correctly, checking one off and watching it disappear.

**Prompt for Claude Code:**
```
Build src/app/tasks/page.tsx per docs/TASK-MANAGEMENT-HANDOFF.md section 2A.

Requirements:
- Client component (`'use client'`), same pattern as src/app/page.tsx (Dashboard)
- Three sections: TO DO (quick), TALK ABOUT (talk, grouped by contact name), REACH OUT NOW (reach)
- Reuse the design system from globals.css (bg-dark-card, text-gold, border-border, etc.)
- Section headers use the same style as dashboard: text-[11px] font-medium text-gold uppercase tracking-widest
- Each row: a checkbox button + title. For talk/reach, show contact name as a Link to /contacts/[id]
- Tap checkbox → update Supabase (done=true, completed_at=now()), then optimistically remove from list
- Empty state per section: muted text "No items. Tap + to add one."
- Add a top-right toggle "Show completed (last 7d)" that defaults off; when on, also fetch done=true tasks
  from the last 7 days and render them in muted/struck-through style
- Pull data with a single query: select *, contacts(id, name) from tasks where done=false order by created_at desc
- Loading + error states match the Dashboard's existing pattern

Also add a new nav item { label: 'Tasks', href: '/tasks' } to src/components/Navbar.tsx,
positioned between 'Follow-Ups' and 'Present'.

Run `npx tsc --noEmit` and `npm run lint` after. Fix anything that errors.
```

---

### Phase 3 — Floating "+" button + capture sheet

**Goal:** A gold "+" button appears bottom-right on every page. Tapping it opens a capture sheet to create a task.

**Verify by:** Opening any page on phone or desktop, tapping the +, typing "test todo", hitting Save, navigating to /tasks and seeing it appear.

**Prompt for Claude Code:**
```
Build the global quick-capture experience per docs/TASK-MANAGEMENT-HANDOFF.md section 2B.

Create two new files:

1. src/components/QuickCaptureFab.tsx — a client component that renders:
   - A fixed-position button bottom-6 right-6 (sm: bottom-8 right-8), 56x56px, rounded-full,
     bg-gold text-black, shadow-lg, with a "+" icon (just use a large + character or SVG, your call)
   - Clicking it opens a Modal (reuse src/components/Modal.tsx with wide={false})
   - The Modal contains a <TaskForm /> (see file 2)
   - On successful save, close the modal. Use the existing canClose dirty-guard pattern from Dashboard.

2. src/components/TaskForm.tsx — modeled on src/components/InteractionForm.tsx:
   - Props: { onSaved: () => void, onCancel: () => void, onDirtyChange?: (dirty: boolean) => void,
     preselectedContactId?: string, preselectedKind?: TaskKind }
   - At the top: three pill buttons "Quick" / "Talk About" / "Reach Out" (gold when active, dark-card otherwise)
     — same style as the category filter pills on Dashboard
   - Text input for title, auto-focused on open. Required.
   - Contact picker (only visible when kind is 'talk' or 'reach'): copy the searchable contact
     dropdown from InteractionForm.tsx. Required when visible.
   - Save button (gold) and Cancel button
   - On Save: INSERT into tasks. If kind is 'quick', set contact_id to null.
   - Dirty-tracking via JSON.stringify(form) vs initial — same pattern as ContactForm/InteractionForm

3. Mount <QuickCaptureFab /> in src/app/layout.tsx, after <main> but inside <body>, so it
   appears globally on every page.

Run typecheck + lint. Test by clicking through on the dev server.
```

---

### Phase 4 — Per-contact agenda on contact detail

**Goal:** When viewing a contact's profile, see and manage their open "Talk About" items.

**Verify by:** Opening a contact who has talk-about tasks, seeing them in an "Open Agenda" section, adding a new one inline, checking one off.

**Prompt for Claude Code:**
```
Add the "Open Agenda" section to src/app/contacts/[id]/page.tsx per
docs/TASK-MANAGEMENT-HANDOFF.md section 2C.

- Place it ABOVE the existing "Interaction History" section
- Fetch tasks where contact_id = this contact's id AND kind = 'talk' AND done = false
- Render same checkbox UX as the Tasks page (extract a shared <TaskRow /> component
  if it cleans things up — only if it does)
- Inline "+ Add agenda item" button at the bottom of the section. Clicking it opens
  the existing capture Modal but with preselectedContactId={contact.id} and
  preselectedKind="talk". The form's kind pills should be disabled or hidden in this
  case (don't let the user switch kind mid-flow when they came from the contact page).
- Empty state: muted text "No open agenda items."

Run typecheck + lint.
```

---

### Phase 5 — Auto-sweep agenda on interaction log

**Goal:** When you log an interaction with someone who has open agenda items, the app asks if you discussed them.

**Verify by:** Pick a contact with 2-3 open talk items. Go to "+ Log Interaction", save one. A small sheet appears listing the open items with checkboxes. Tick two, hit "Mark discussed". The two items become done.

**Prompt for Claude Code:**
```
Modify src/components/InteractionForm.tsx per docs/TASK-MANAGEMENT-HANDOFF.md section 2D.

After a successful INSERT of a new interaction (not on edit), check if the contact has
any open kind='talk' tasks. If yes (count > 0):
- Instead of immediately calling onSaved(), set internal state to show a follow-up view
- The follow-up view replaces the form content (same Modal stays open) with:
  - Heading: "You have N open agenda items for {contactName}. Mark any as discussed?"
  - Checkbox list of the open talk tasks (default unchecked)
  - "Mark discussed" button (gold) and "Skip" button
- "Mark discussed": UPDATE selected tasks set done=true, completed_at=now(). Then call onSaved().
- "Skip": just call onSaved().

This logic should ONLY run for new interactions (when the `interaction` prop is null/undefined),
not when editing an existing one.

Run typecheck + lint.
```

---

### Phase 6 — Polish

**Goal:** Make it feel finished.

**Prompt for Claude Code:**
```
Polish pass on the Tasks feature:

1. On the Dashboard (src/app/page.tsx), add one new stat card "Open Tasks" with a count
   pulled from tasks where done=false. Place it after the existing cards. If the grid
   gets too crowded on mobile, restructure to grid-cols-2 lg:grid-cols-5. Use the same
   card styling as existing stat cards.

2. On the Tasks page, when a row's created_at is older than 7 days AND done is false,
   show a small "stale" badge on the right (text-text-muted, small, e.g. "14d old").
   Use src/lib/cadence.ts → daysSinceDate() to compute.

3. Make the FAB respect safe-area-inset-bottom on iOS (add `pb-[env(safe-area-inset-bottom)]`
   or equivalent padding so it doesn't sit under the home indicator).

4. Add a confirmation prompt before deleting a task (reuse DeleteConfirmModal pattern from
   the contact delete flow — find it in the codebase and follow the same pattern).

5. Run `npx tsc --noEmit` and `npm run lint`. Fix all errors. Reduce any new lint warnings to zero.

6. Manually test on mobile viewport (Chrome DevTools mobile mode) and confirm:
   - FAB is thumb-reachable
   - Capture sheet animates up from bottom on mobile (the existing Modal already does this)
   - Three sections on Tasks page stack vertically and scroll smoothly
```

---

## 4. Open decisions (dev should confirm with Chase before starting)

1. **Sheldon and other internal Baseline people:** The plan assumes Sheldon is a Contact with `category = 'Baseline'`. If Chase hasn't added Sheldon as a contact yet, add him as Phase 0. (Alternative: add an `is_internal` boolean to contacts. Not recommended — simpler to use the existing category system.)

2. **Notes field on tasks:** The schema has a `notes` field but the current UI design doesn't surface it. Should we add an expandable "Add note" link in the capture sheet, or strip the field entirely for v1? **Default if Chase doesn't answer: ship the column in the migration but don't expose it in UI yet. Easy to add later.**

3. **Sort order for Talk About contacts:** alphabetical by name. Confirm.

4. **Mobile gesture:** Should swiping a task row right also mark it done (in addition to the checkbox)? Nice-to-have, can defer.

5. **Recurring tasks:** Explicitly out of scope for v1. Not in the schema. Add later if Chase asks.

---

## 5. Out of scope for v1 (parking lot)

- AI / Ollama integration — revisit after 2 weeks of real use
- Recurring tasks
- Reminders / push notifications
- Task assignments (Chase vs Sheldon ownership) — currently no auth, so no user concept
- Subtasks / nested tasks
- Drag-to-reorder
- Bulk operations
- Task templates
- CSV export
- Search across tasks (defer until > ~50 active tasks)

---

## 6. How to run + verify locally (for the dev)

```
cd ba-relationship-manager
# .env.local already has Supabase keys (don't commit it)
npm install
npm run dev   # → http://localhost:3000
```

After each phase:
```
npx tsc --noEmit       # type errors
npm run lint            # lint errors/warnings
npm run build           # full prod build (run before declaring "done")
```

Commit at the end of each phase with a clear message. Don't squash — Chase wants to see the progression.

---

## 7. Deployment

This project deploys to Vercel automatically on push to `main`. The dev can either:
- Push to a feature branch and open a PR for Chase to merge after preview-deploy review (recommended)
- Push to main directly if Chase trusts them with that

The Supabase migration must be run manually in the Supabase SQL Editor before the new code goes live, or the app will throw on the new `/tasks` page.

---

## Questions? Contact Chase: chase@baseline-development.com
