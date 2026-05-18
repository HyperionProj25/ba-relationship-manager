// Source of truth: docs/BASELINE-KNOWLEDGE-BASE.md
// When that file changes materially, copy the contents into the template literal below.
// Embedded as a string (rather than read from disk) so the bundle works on Vercel serverless.
export const BASELINE_KNOWLEDGE_BASE = `# Baseline Analytics — Copilot Knowledge Base
# Last updated: 2026-05-14
# This file is loaded into every copilot request to provide institutional context.
# Update this file whenever strategic context changes materially.

## COMPANY OVERVIEW

Baseline Analytics, Inc. is a Wyoming C-Corporation building the Arm Care Intelligence System (ACIS), an AI-powered pitcher fatigue monitoring and workload intelligence platform targeting Major League Baseball. The company was co-founded by Chase Spivey (Founder & CEO) and Sheldon McClelland (Founder & COO).

ACIS uses an XGBoost machine learning model trained on publicly available MLB data (Statcast, pitch-level metrics, velocity trends, rest patterns, workload history) to classify each tracked pitcher appearance into a fatigue risk tier. It does NOT predict injuries — it monitors fatigue signals and flags workload risk. This distinction is critical to everything Baseline communicates.

The company is pre-revenue, in active fundraise mode, pursuing an MLB data partnership that would give ACIS access to proprietary biomechanical data (Hawk-Eye) to dramatically improve model accuracy.

## LANGUAGE RULES (NON-NEGOTIABLE)

These rules apply to ALL communications, drafts, and recommendations:

- NEVER say "injury prevention" or "injury prediction" — use "fatigue monitoring," "workload intelligence," "arm health insights," or "durability optimization"
- The product is "Arm Care Intelligence System (ACIS)" — full name on first mention, then "ACIS"
- Chase Spivey = "Founder & CEO" always
- Sheldon McClelland = "Founder & COO" always
- When drafting emails for Chase, NEVER use em dashes (--)
- Baseline does NOT have an active MLB Letter of Intent (LOI). Current MLB status is legal review for biomechanical (Hawk-Eye) data access. Never reference an active LOI in any materials.

## CURRENT FUNDRAISE

- Structure: $3-4M SAFE, no valuation cap, 20% discount
- Stage: Active raise, early traction with one closed investor (Robbie Erlin, $25K SAFE via Carta, April 2026)
- Positioning: Framed as an "expansion story" — the NFL Digital Athlete is used as validation evidence, not a comparison
- Executive Chairman: Jeff Newman leads strategic investor intros and relationships

## CORE TEAM

- Chase Spivey — Founder & CEO. Former baseball player. Handles product vision, MLB relationships, investor meetings, strategic positioning. Based in SF Bay Area.
- Sheldon McClelland — Founder & COO. Manages operations, legal coordination, IAB outreach, partner relationships (owns TrackMan/Adam Katz relationship). Handles day-to-day follow-ups and care package distribution.
- Jeff Newman — Executive Chairman. Leads strategic intros and investor relationships. Advises on pitch positioning and deal structure.
- Ramesh Bobba — CTO (incoming). Former DvSum, Cisco SVP. Building out the dev team. Validated that ML applied to TrackMan V3 radar data can estimate elbow varus torque.
- John Mendez — Lead Developer. Veteran tech consultant. Proposed MCP server concept for natural language ACIS queries.

## ACIS MODEL — TECHNICAL CONTEXT

- Model type: XGBoost classifier
- Last retrained: May 1, 2026 — redeployed to Streamlit
- Key improvement: Six new prior injury history features added. Most impactful: FBVeloDropFromMultiYrPeak and RestDaysVsBaseline
- Current AUC: 0.729
- Risk scale: Five tiers — Low (0-20), Moderate (21-40), Elevated (41-60), High (61-80), Critical (81-100)
- Data sources: Publicly available Statcast/pitch-level data. Does NOT currently use proprietary biomechanical data.
- Active research: ACIS Travel Load Case Study connecting MLB's 2023 balanced schedule (increased travel miles) to pitcher fatigue signals. Three pitcher case studies pending: Shane McClanahan, Spencer Strider, Tyler Glasnow.
- Case study library: 11 studies across injured and healthy cohorts (Cole, deGrom, Strider, Ohtani, Glasnow, Chapman, Skenes, Webb, Skubal, Yamamoto, plus Birdsong as Giants proof-of-concept)

## MLB RELATIONSHIP — CURRENT STATUS

Primary MLB champion: Rob Engel — IAB MLB Committee Chair; SVP of Baseball & Content Engineering at MLB. He facilitated the original data access conversations and introduced Baseline to John D'Angelo.

John D'Angelo — SVP Amateur and Medical at MLB. Owns the medical/player health data side. Representing Paul Mifsud (SVP Baseball Ops Counsel).

Current status: Legal review for biomechanical (Hawk-Eye) data access. NO active LOI. The LOI language was narrowed to Hawk-Eye biomechanical data specifically.

MLB meeting history: March 24, 2026 — MLB Amateur Medical & Baseball Operations meeting. Covered data assets, ACIS demo, off-balance-sheet subsidiary concept, and potential online wagering angle.

## CLUB RELATIONSHIPS

San Francisco Giants: Eleanor Martin — Coordinator, Amateur Scouting & Baseball Administration. IAB legal approval granted with conflict-of-interest restrictions. Strategy focuses on her organic influence within the Giants organization. Connection represents proof of club-level interest.

Los Angeles Dodgers: Tom Kunis — Scout, IAB member. Connected Baseline to Mark O'Brien/CAA Sports.

Toronto Blue Jays: Ricky Meinhold — Pitching Coordinator. Technical methodology PDF created specifically for his biomechanics expertise level using deGrom, Strider, and Logan Webb case studies.

## INDUSTRY ADVISORY BOARD (IAB)

The IAB is a strategic asset, not just an advisory group. Members provide credibility, warm introductions, and validation of the ACIS thesis. IAB expansion is ongoing.

Key IAB members and why they matter:
- Robbie Erlin — Former MLB Pitcher / LA Dodgers Pitching Coach. Also an investor ($25K SAFE). Connection to Tyson Ross, Mitch Haniger. Sheldon owns relationship.
- Tony Gonsolin — Former RHP, Dodgers. Multiple arm injuries. Deeply connected to ACIS mission.
- Adam Cimber — Former MLB Pitcher (Ret. 2025). Connection through Robbie Erlin.
- Stephen Piscotty — Roving Coach, Oakland A's. Former outfielder. Validated ACIS thesis. Sparta Science/Phil Wagner connection.
- Tyson Ross — Former MLB Pitcher. Validated arm injury epidemic thesis. Surfaced Dick's Sporting Goods / GameChanger opportunity.
- Mark Ibanez — Retired KTVU broadcaster. Connections to pro athletes through fundraisers. Wants a "hit list" of outreach targets.
- Cindy Leeper — COO, Breakthrough Energy. Cross-industry ops perspective. Connection to Dave Kaval, Paul Hartzell.
- Joe Revels — Google Cloud, B2B Tech Sales. Stanford connections, potential investor. Sheldon owns.
- Marc Gallo — Capital connector. Reviewing TrackMan proposal.
- Mark O'Brien — CAA Sports, MLBPA Certified Agent. Discovery call held March 17. Pending CAA clearance for IAB.
- Eleanor Martin — SF Giants (approved with restrictions, see above).

## KEY PARTNERSHIPS

TrackMan: Active strategic partnership discussion. Adam Katz (Manager, Diamond Sports Strategy) is key contact. Sheldon owns relationship. Two-tier investment structure proposed ($1M/$3M) with exclusivity options naming Hawk-Eye, Rapsodo, Yakkertech, and FlightScope. Ramesh validated that ML on TrackMan V3 radar data can estimate elbow varus torque.

## KEY INVESTORS / PROSPECTS

- Robbie Erlin — Closed. $25K SAFE issued April 1, 2026 via Carta.
- Brian Doyle — BDUCK Capital. Pitched March 6. Former MLB BAM, Amazon AI. Sports/athlete/consumer thesis.
- Britton Stackhouse — Fortress GB / PwC. Discovery call Feb 20. No active direction.
- Dave Kaval — Former Oakland A's President. Indirect connection via Cindy Leeper. Potential investor.
- Kris Withrow — M&A attorney, Fenwick & West. Not a direct investor but providing legal guidance and investor intros. Sees possibility MLB itself funds ACIS deployment.
- Edwin Prather — Attorney. Son TK has $10M fund with ties to Toronto Blue Jays.

## COMPETITIVE LANDSCAPE

- Zone7: Acquired by Svexa. Was the closest competitor.
- Teamworks Intelligence (formerly Zelus): In the space but different approach.
- Baseline's positioning: ACIS is specifically focused on pitcher arm care, not general sports injury. The MLB data partnership (Hawk-Eye) would be a unique competitive moat.

## STRATEGIC CONTEXT

- Highest-leverage near-term move: A free real-time ACIS pilot to an existing MLB club contact
- MLB insurance market (NFP, Lloyd's syndicates) researched as a new commercial angle
- MLB deal structure research: BAMTech, Sportradar, Genius Sports, AWS Digital Athlete comparables. Component-based pricing model with Option A ($14M+ run rate) and Option B ($22.5M+ run rate)
- DSG/GameChanger and TrackMan partnership theses developed as multi-party triangulation strategies
- MLBPA data governance: Attachment 56 and JCWT approval identified as key regulatory factors

## OTHER CONTEXT

- Chase has a newborn, two small dogs, and is based in the SF Bay Area
- Chase's wife Aimee works in the elevator industry
- Chase coaches softball at West Valley College and does scouting/game-charting
- Chase does content work for Dutch Pet Care (wife's employer) — social media strategy, video scripts. This is a separate workstream from Baseline.
- StakeholderPulse: Internal investor portal (Next.js, Supabase, Vercel) for stakeholder timeline tracking. Confirmed current through March 26, 2026 BOD Meeting.
`
