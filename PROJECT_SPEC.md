# BA Relationship Manager — Claude Code Project Spec

## HOW TO USE THIS FILE

1. Create a new folder on your computer for this project
2. Save this file in that folder as `PROJECT_SPEC.md`
3. Add your Baseline branding files (logo, etc.) to a `/branding` subfolder
4. Open your terminal, `cd` into the folder
5. Run `claude` to start Claude Code
6. Paste: **"Read PROJECT_SPEC.md and build this project step by step. Start with project scaffolding and Supabase schema."**

Claude Code will take it from there. It will ask you questions along the way if it needs clarification.

---

## Project Overview

**App Name:** BA Relationship Manager
**Purpose:** A private internal CRM for Baseline Analytics to track contacts, log interactions, and manage follow-ups. Two users: Chase Spivey (Founder & CEO) and Sheldon McClelland (Founder & COO). Both have full edit access. No authentication required. The URL is private and only shared between the two of them.

**Deployed to:** Vercel
**Database:** Supabase (new free-tier project)
**Stack:** Next.js (App Router), Tailwind CSS, Supabase JS client

---

## Supabase Setup Instructions

Before Claude Code starts building, you need to create a Supabase project:

1. Go to **supabase.com** and create a new account (or sign in)
2. Click **"New Project"**
3. Name it: `ba-relationship-manager`
4. Set a database password (save it somewhere)
5. Choose the region closest to you (West US)
6. Wait for the project to spin up (~2 minutes)
7. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (the long string under "Project API keys")
8. Create a `.env.local` file in your project root with:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## Database Schema

Create these two tables in Supabase. Claude Code should generate the SQL migration and walk you through running it in the Supabase SQL Editor.

### Table: `contacts`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| name | text | NOT NULL | Full name |
| organization | text | | Company, team, league |
| role | text | | Their title |
| email | text | | |
| phone | text | | |
| category | text | NOT NULL, default 'Other' | One of: MLB, Investor, IAB, Partner, Vendor, University, Other |
| linkedin | text | | URL |
| notes | text | | Freeform notes |
| created_at | timestamptz | default now() | Auto-set |
| updated_at | timestamptz | default now() | Auto-update via trigger |

### Table: `interactions`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| contact_id | uuid | FK → contacts.id, ON DELETE CASCADE | |
| summary | text | NOT NULL | One-line description |
| date | date | NOT NULL | When it happened |
| type | text | NOT NULL | One of: Call, Email, Meeting, Text, LinkedIn, In-Person |
| details | text | | Full notes |
| follow_up_needed | boolean | default false | |
| follow_up_date | date | | When to follow up |
| follow_up_action | text | | What needs to happen |
| status | text | default 'Pending' | One of: Pending, Done, Overdue |
| created_at | timestamptz | default now() | |

### Row Level Security

Disable RLS on both tables (this is a private app, no auth). Claude Code should run:

```sql
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON contacts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON interactions FOR ALL USING (true) WITH CHECK (true);
```

---

## Branding

**Company:** Baseline Analytics, Inc.
**Primary dark color (header/nav):** Dark navy/charcoal (#1a1a2e or similar dark tone)
**Accent color:** Sunglow Gold #FFC233
**Text on dark backgrounds:** White
**Font:** Clean sans-serif (Inter or system font stack)
**Logo:** Will be provided in `/branding` folder. Use it in the top-left of the nav bar.

The overall feel should be: dark, professional, modern. Similar to a sports analytics dashboard. Not playful. Not corporate gray. Think ESPN or Sportradar's internal tools.

---

## Pages & Features

### 1. Dashboard (Home Page) — `/`

The landing page when you open the app. At a glance:

- **Stat cards at the top:**
  - Total Contacts
  - Interactions This Week
  - Pending Follow-Ups
  - Overdue Follow-Ups (highlighted in red/warning)

- **Upcoming Follow-Ups** (list of the next 5-7 follow-ups sorted by date, with contact name, action, and date)

- **Recent Interactions** (last 5-7 interactions logged, showing contact name, type, summary, and date)

- Quick action buttons: "+ Add Contact" and "+ Log Interaction"

### 2. Contacts Page — `/contacts`

- **Table view** of all contacts, sortable by name, organization, category, and date added
- **Search bar** at the top (filters by name or organization as you type)
- **Category filter** (dropdown or pill buttons: All, MLB, Investor, IAB, Partner, Vendor, University, Other)
- Click a row to open the **Contact Detail** view

#### Contact Detail — `/contacts/[id]`

- Shows all contact fields, editable inline or via an edit form
- Below the contact info: **Interaction History** for this contact (all interactions linked to them, sorted newest first)
- Button: "+ Log Interaction" (pre-fills the contact)
- Button: "Edit Contact"
- Button: "Delete Contact" (with confirmation modal)

### 3. Interactions Page — `/interactions`

- **Table view** of all interactions, sortable by date, contact, type, status
- **Filters:**
  - By type (Call, Email, Meeting, etc.)
  - By status (Pending, Done, Overdue)
  - By follow-up needed (checkbox)
- **Search** by summary or contact name
- Click a row to open the **Interaction Detail** view

#### Interaction Detail — `/interactions/[id]`

- Full details of the interaction
- Edit and delete buttons
- Link to the associated contact

### 4. Follow-Ups Page — `/follow-ups`

- Focused view showing ONLY interactions where `follow_up_needed = true`
- Grouped or filterable by status: Pending, Done, Overdue
- Overdue items (follow_up_date < today AND status = Pending) should be visually flagged (red text or badge)
- Quick action: click to mark as "Done" without opening the full record
- This is the "morning check" page

### 5. Add/Edit Forms

- **Add Contact** form: modal or dedicated page, all fields from the schema
- **Add Interaction** form: modal or dedicated page, with a dropdown to select the contact (searchable), all fields from schema
- **Edit** versions of both forms pre-populate with existing data

---

## Navigation

Top nav bar (dark background, Sunglow Gold accent on active item):

| Nav Item | Route |
|---|---|
| Dashboard | `/` |
| Contacts | `/contacts` |
| Interactions | `/interactions` |
| Follow-Ups | `/follow-ups` |

Logo in the top-left. App name "BA Relationship Manager" next to it (or just the logo if it's wide enough).

---

## Key Behaviors

- **Overdue auto-detection:** Any interaction where `follow_up_needed = true`, `status = 'Pending'`, and `follow_up_date < today` should display as "Overdue" with a visual indicator. This can be computed client-side; no need for a cron job.
- **Sorting defaults:** Interactions default to newest first. Contacts default to alphabetical by name. Follow-ups default to soonest due date first.
- **Responsive:** Should work on desktop and mobile (Chase will check it on his phone sometimes).
- **No auth:** No login page. The app is open to anyone with the URL. The URL is kept private.
- **Deletes:** Always require a confirmation modal ("Are you sure you want to delete [Name]?").

---

## Project Structure (Suggested)

```
ba-relationship-manager/
├── branding/               ← Logo and brand assets (Chase adds these)
├── public/                 ← Static assets
├── src/
│   ├── app/                ← Next.js App Router pages
│   │   ├── page.tsx        ← Dashboard
│   │   ├── contacts/
│   │   ├── interactions/
│   │   └── follow-ups/
│   ├── components/         ← Reusable UI components
│   ├── lib/
│   │   └── supabase.ts     ← Supabase client init
│   └── types/              ← TypeScript interfaces
├── .env.local              ← Supabase credentials (not committed to git)
├── PROJECT_SPEC.md         ← This file
├── package.json
└── tailwind.config.ts
```

---

## Deployment

Deploy to Vercel:

1. Push the project to a GitHub repo
2. Go to vercel.com, import the repo
3. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in Vercel project settings
4. Deploy

Chase already knows this workflow from StakeholderPulse.

---

## Future Ideas (Not for V1)

- CSV export of contacts or interactions
- Weekly email digest of pending follow-ups
- Tags/labels on contacts (beyond the single category)
- Interaction templates (pre-filled forms for common meeting types)
- Integration with Google Calendar
- Kanban board view for follow-ups

---

## Summary for Claude Code

Build a private, no-auth CRM web app for Baseline Analytics using Next.js (App Router), Supabase, and Tailwind CSS. Two tables: contacts and interactions (linked by contact_id). Four pages: Dashboard, Contacts, Interactions, Follow-Ups. Dark theme with Sunglow Gold (#FFC233) accents. Full CRUD on both tables. Deployed to Vercel. No authentication. Mobile-responsive. Start by scaffolding the project, setting up Supabase, then build page by page.