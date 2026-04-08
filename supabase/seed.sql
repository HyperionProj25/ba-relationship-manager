-- BA Relationship Manager — Seed Data
-- Run this in the Supabase SQL Editor after running migration.sql

-- ============================================
-- CONTACTS
-- ============================================

-- Internal Team (Other)
INSERT INTO contacts (name, role, organization, email, category, notes) VALUES
('Jeff Newman', 'Executive Chairman', 'Baseline Analytics', 'jeff@catalystadvisors.com', 'Other', 'Executive Chairman, leads strategic intros and investor relationships. Also jnewman@baselineanalytics.net'),
('Sheldon McClelland', 'Founder & COO', 'Baseline Analytics', 'sheldon@baselineanalytics.net', 'Other', 'Co-founder, manages ops, legal coordination, and IAB outreach'),
('Ramesh Bobba', 'Incoming CTO', 'Baseline Analytics', 'rameshkbobba@gmail.com', 'Other', 'Formerly DvSum, Cisco SVP. Building out dev team'),
('John Mendez', 'Lead Developer', 'Baseline Analytics', 'johnmendez00@gmail.com', 'Other', 'Veteran tech consultant, has been working on ACIS as a side project. Also jmendez@baselineanalytics.net');

-- MLB
INSERT INTO contacts (name, role, organization, email, category, notes) VALUES
('Rob Engel', 'SVP Software Engineering', 'Major League Baseball', 'Rob.Engel@mlb.com', 'MLB', 'Primary internal MLB champion. IAB member. Facilitating LOI and Hawk-Eye data access. Introduced BA to John D''Angelo'),
('John D''Angelo', 'SVP Amateur and Medical', 'Major League Baseball', NULL, 'MLB', 'Owns medical/player health data side. Representing Paul Mifsud (SVP Baseball Ops Counsel). Met March 24, 2026'),
('Eleanor Martin', 'Coordinator, Amateur Scouting & Baseball Administration', 'San Francisco Giants', 'emartin@sfgiants.com', 'MLB', 'Front office ops, Draft Ops focus. Running IAB agreement up the chain with Giants leadership. Dodgers involvement creates competitive leverage. Responded April 6 that she''s had discussions with leadership'),
('Tom Kunis', 'Scout', 'Los Angeles Dodgers', NULL, 'MLB', 'IAB member. Connected BA to Mark O''Brien/CAA. Initial call Jan 30, 2026');

-- IAB Members
INSERT INTO contacts (name, role, organization, email, category, notes) VALUES
('Robbie Erlin', 'Former MLB Pitcher / LA Dodgers Pitching Coach', NULL, NULL, 'IAB', 'IAB member AND investor ($25K SAFE issued April 1, 2026 via Carta). Connection to Tyson Ross, Mitch Haniger. Relationship owned by Sheldon'),
('Tony Gonsolin', 'Former RHP', 'Los Angeles Dodgers', NULL, 'IAB', 'Accepted IAB seat. Multiple arm injuries, deeply connected to ACIS mission. Discovery call ~March 12 with Chase, Sheldon, Tom Kunis'),
('Adam Cimber', 'Former MLB Pitcher (Ret. 2025)', NULL, NULL, 'IAB', 'IAB discovery call held. Connection through Robbie Erlin'),
('Stephen Piscotty', 'Roving Coach', 'Oakland Athletics', NULL, 'IAB', 'Former MLB outfielder. IAB discovery call April 2. Validated ACIS thesis. Sparta Science/Phil Wagner connection. Follow-up scheduled week of April 7'),
('Tyson Ross', 'Former MLB Pitcher', 'San Diego Padres / Texas Rangers', NULL, 'IAB', 'Connection via Robbie Erlin. Accepted IAB appointment March 30. Validated arm injury epidemic thesis. Surfaced Dick''s Sporting Goods / GameChanger opportunity'),
('Mark Ibanez', 'Retired Broadcaster', 'KTVU Fox 2 (Bay Area)', NULL, 'IAB', 'IAB discovery call April 2. Wants a "hit list" of people to reach out to. Connections to pro athletes through fundraisers. Next steps: care package + dinner with Chase/Sheldon/Jeff/Mark'),
('Cindy Leeper', 'COO', 'Breakthrough Energy', NULL, 'IAB', 'IAB member. Cross-industry ops perspective. Connection to Dave Kaval, Paul Hartzell'),
('Joe Revels', 'B2B Tech Sales', 'Google Cloud', NULL, 'IAB', 'IAB member. Stanford connections, potential investor. Owned by Sheldon'),
('Tom Castillo', NULL, 'HPE', NULL, 'IAB', 'IAB member. Connection to Scott Price'),
('Ryan Pollace', NULL, 'Teledyne', NULL, 'IAB', 'IAB member. Established investor'),
('Marc Gallo', NULL, NULL, 'marc.gallo.ca@gmail.com', 'IAB', 'IAB member. Capital connector. Reviewing TrackMan proposal. Lunch scheduled April 10 with Baseline team'),
('Mark Webster', NULL, 'QuantumScape', 'mwebster@quantumscape.com', 'IAB', 'IAB member. Care package sent April 4');

-- Partners
INSERT INTO contacts (name, role, organization, email, category, notes) VALUES
('Adam Katz', 'Manager, Diamond Sports Strategy', 'TrackMan', NULL, 'Partner', 'Key TrackMan contact. Strategic partnership proposal sent. Two-tier investment structure ($1M/$3M) with exclusivity options. Sheldon owns relationship. Last contact ~April 4'),
('Dan Poeltl', 'Data Desk Supervisor', 'TrackMan Baseball', NULL, 'Partner', 'Technical contact. Escalated BA to Adam Katz internally'),
('Mark O''Brien', 'MLBPA Certified Agent', 'CAA Sports', NULL, 'Partner', 'Discovery call March 17. Follow-up materials sent. Connection via Tom Kunis');

-- Investors
INSERT INTO contacts (name, role, organization, email, category, notes) VALUES
('Brian Doyle', 'Founder', 'BDUCK Capital', NULL, 'Investor', 'Pitched March 6. Former MLB BAM, Amazon AI. Sports/athlete/consumer thesis. Micro-fund. Recognizes baseball tech opportunity'),
('Britton Stackhouse', NULL, 'Fortress GB / PwC', NULL, 'Investor', 'Discovery call Feb 20. No active deal or direction yet. Pending'),
('Dave Kaval', 'Former President', 'Oakland Athletics', NULL, 'Investor', 'Indirect connection via Cindy Leeper. Potential investor');

-- Vendors / Legal
INSERT INTO contacts (name, role, organization, email, category, notes) VALUES
('Kris Withrow', 'Attorney', 'Fenwick & West', NULL, 'Vendor', 'M&A attorney. Lunch April 2 at Out of Barrel, Los Gatos. Sees possibility MLB itself funds ACIS deployment. Offered informal legal guidance and investor intros. Next: intro to Jeff Newman'),
('Edwin Prather', 'General Counsel', 'Alexander''s Steakhouse', NULL, 'Vendor', 'Discovery call April 2, 7PM. Bay Area attorney. Sparta Science connection. Son TK has $10M fund, ties to Toronto Blue Jays. Willing to serve on IAB or as legal sounding board');

-- University
INSERT INTO contacts (name, role, organization, email, category, notes) VALUES
('Tom Walter', 'Head Coach', 'Wake Forest Baseball', NULL, 'University', 'Pitching lab connection with Dr. Kristen Nicholson');

-- New / Recent (Other)
INSERT INTO contacts (name, role, organization, email, category, notes) VALUES
('Scott Price', NULL, NULL, 'scgrad99@gmail.com', 'Other', 'Connection via Tom Castillo. Discovery call April 7, 2026 at 11:30am. Sheldon sent follow-up materials'),
('Mark Shirman', NULL, NULL, 'mark@shirman.co', 'Other', 'Accepted discovery call invite'),
('Ferbs', NULL, NULL, NULL, 'Other', 'Baseball contact. Sent intro pitch + IAB overview March 17'),
('Chaz', NULL, NULL, NULL, 'Other', 'Baseball contact. Sent intro pitch + IAB overview March 17');


-- ============================================
-- INTERACTIONS
-- ============================================

-- Rob Engel — MLB Meeting March 24
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Rob Engel'),
 'MLB Amateur Medical & Baseball Ops meeting', '2026-03-24', 'Meeting',
 'Meeting with Rob Engel, John D''Angelo. Explored strategic alignment. John sees beneficial relationship for both parties. Recommended modifying LOI language.',
 true, '2026-04-14', 'Modify LOI to define Hawk-Eye data access, work on player health data approval', 'Pending');

-- Rob Engel — Care package email April 2
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, status) VALUES
((SELECT id FROM contacts WHERE name = 'Rob Engel'),
 'Sheldon sent care package to Rob for IAB intro distribution', '2026-04-02', 'Email',
 'Sheldon sent care package (outreach materials) to Rob for IAB intro distribution.',
 false, 'Done');

-- Eleanor Martin — IAB Discovery Call March 30
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Eleanor Martin'),
 'IAB discovery call — Giants front office', '2026-03-30', 'Meeting',
 'Virtual, 30 min. Jeff briefed on GTM. Chase/Sheldon presented ACIS. Eleanor interested but Giants historically restrictive. Dodgers involvement creates competitive leverage.',
 true, '2026-04-10', 'Eleanor running IAB agreement up chain. Provide NDA (Sheldon). Schedule follow-up (Chase)', 'Pending');

-- Eleanor Martin — Email response April 6
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Eleanor Martin'),
 'Eleanor responded — had discussions with leadership', '2026-04-06', 'Email',
 'Eleanor responded to Sheldon''s follow-up. Had discussions with leadership. Happy to share more.',
 true, '2026-04-09', 'Schedule follow-up call', 'Pending');

-- Tony Gonsolin — IAB Discovery Call ~March 12
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Tony Gonsolin'),
 'IAB discovery call — accepted IAB seat', '2026-03-12', 'Meeting',
 'Discovery call with Chase, Sheldon, Tom Kunis. Tony accepted IAB seat. Deep personal connection to arm care mission.',
 true, '2026-04-14', 'Send formal IAB seat agreement, reconnect to discuss how he can help', 'Pending');

-- Adam Cimber — IAB Discovery Call
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Adam Cimber'),
 'IAB discovery call', '2026-03-15', 'Meeting',
 'IAB discovery call held. Connection through Robbie Erlin.',
 true, '2026-04-14', 'Onboarding', 'Pending');

-- Stephen Piscotty — IAB Discovery Call April 2
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Stephen Piscotty'),
 'IAB discovery call — validated ACIS thesis', '2026-04-02', 'Call',
 'IAB discovery call at 2PM. Validated ACIS thesis. Strong interest in IAB. Surfaced Phil Wagner/Sparta Science reconnection.',
 true, '2026-04-09', 'Send care package + IAB materials. Schedule follow-up week of April 7', 'Pending');

-- Tyson Ross — IAB Discovery Call March 30
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Tyson Ross'),
 'IAB discovery call — accepted appointment', '2026-03-30', 'Call',
 'Sheldon-led. Accepted IAB appointment. Validated arm injury epidemic thesis. Surfaced DSG/GameChanger opportunity.',
 true, 'Send formal IAB seat agreement', 'Done');

-- Mark Ibanez — IAB Discovery Call April 2
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Mark Ibanez'),
 'IAB discovery call — wants hit list of outreach targets', '2026-04-02', 'Call',
 'Retired broadcaster. Wants hit list of people to reach out to. Connections to pro athletes. Passions: baseball + autism community.',
 true, '2026-04-11', 'Send care package. Set dinner with Chase/Sheldon/Jeff/Mark (Thu or Fri). Build hit list', 'Pending');

-- Adam Katz / TrackMan — Meeting March 6
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Adam Katz'),
 'TrackMan partnership discussion — preferred vendor program', '2026-03-06', 'Meeting',
 'Sheldon-led call. Discussed preferred vendor program, amateur market strategy.',
 true, '2026-04-10', 'TrackMan strategic partnership proposal drafted and sent', 'Pending');

-- Adam Katz / TrackMan — Email April 2
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Adam Katz'),
 'Sent TrackMan Strategic Partnership Proposal for review', '2026-04-02', 'Email',
 'Sheldon sent TrackMan Strategic Partnership Proposal to Jeff Newman and Marc Gallo for review. Marc Gallo asked about exclusivity terms.',
 true, '2026-04-10', 'Finalize exclusivity terms', 'Pending');

-- Mark O'Brien / CAA — Call March 17
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Mark O''Brien'),
 'CAA discovery call — follow-up materials sent', '2026-03-17', 'Call',
 'Discovery call. Follow-up materials (deck + IAB overview) sent. Connection via Tom Kunis.',
 true, '2026-04-14', 'Schedule next call to dig deeper', 'Pending');

-- Brian Doyle — Pitch Meeting March 6
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Brian Doyle'),
 'Investor pitch meeting — BDUCK Capital', '2026-03-06', 'Meeting',
 'Former MLB BAM, Amazon AI background. Sports/athlete/consumer thesis. Micro-fund. Recognizes baseball tech opportunity.',
 true, '2026-04-14', 'TBD', 'Pending');

-- Robbie Erlin — SAFE Investment April 1
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, status) VALUES
((SELECT id FROM contacts WHERE name = 'Robbie Erlin'),
 '$25K SAFE investment issued via Carta', '2026-04-01', 'In-Person',
 'SAFE investment of $25K issued via Carta.',
 false, 'Done');

-- Marc Gallo — Email April 4-5
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Marc Gallo'),
 'Reviewing TrackMan proposal — lunch scheduled April 10', '2026-04-04', 'Email',
 'Reviewing TrackMan proposal. Asked about exclusivity. Lunch scheduled April 10.',
 true, '2026-04-10', 'Lunch April 10', 'Pending');

-- Kris Withrow — Lunch April 2
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Kris Withrow'),
 'Lunch at Out of Barrel — legal guidance + investor intros', '2026-04-02', 'In-Person',
 'Lunch at Out of Barrel, Los Gatos. Acknowledged BA progress. Proposed MLB could fund ACIS directly. Offered informal legal guidance and investor intros.',
 true, '2026-04-10', 'Intro Withrow to Jeff Newman. Share LOI when ready', 'Pending');

-- Edwin Prather — Call April 2
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Edwin Prather'),
 'Discovery call — Sparta Science, son TK fund + Blue Jays ties', '2026-04-02', 'Call',
 'Discovery call at 7PM. Reconnected over Sparta Science. Son TK has $10M fund + Blue Jays ties. Willing to serve on IAB or legal sounding board.',
 true, '2026-04-14', 'Explore TK connection. Send IAB materials', 'Pending');

-- Tom Kunis / Dodgers — Call January 30
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Tom Kunis'),
 '3-way call — Dodgers scout regions, internal app discussion', '2026-01-30', 'Call',
 '3-way call Chase/Sheldon/Tom. Discussed expansive scout regions, Dodgers internal app. Updated on BA amateur + pro GTM.',
 true, '2026-04-14', 'Reconnect when Tom''s busy season ends', 'Pending');

-- Ferbs & Chaz — Email March 17 (Ferbs)
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Ferbs'),
 'Sent intro pitch + IAB overview after get-together', '2026-03-17', 'Email',
 'Sent intro pitch + IAB overview after get-together.',
 true, '2026-04-01', 'Circle back in a week or two', 'Pending');

-- Ferbs & Chaz — Email March 17 (Chaz)
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Chaz'),
 'Sent intro pitch + IAB overview after get-together', '2026-03-17', 'Email',
 'Sent intro pitch + IAB overview after get-together.',
 true, '2026-04-01', 'Circle back in a week or two', 'Pending');

-- Scott Price — Meeting April 7
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Scott Price'),
 'Discovery call via Google Meet — connection through Tom Castillo', '2026-04-07', 'Meeting',
 'Discovery call at 11:30am via Google Meet. Connection through Tom Castillo. Sheldon sent follow-up materials.',
 true, 'Sheldon sent follow-up materials', 'Pending');

-- Mark Webster — Email April 4
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Mark Webster'),
 'IAB expansion care package sent', '2026-04-04', 'Email',
 'Sheldon sent IAB expansion care package to mwebster@quantumscape.com.',
 true, '2026-04-14', 'TBD', 'Pending');

-- Jeff Newman — Email April 3
INSERT INTO interactions (contact_id, summary, date, type, details, follow_up_needed, follow_up_date, follow_up_action, status) VALUES
((SELECT id FROM contacts WHERE name = 'Jeff Newman'),
 'Forwarded "Baseline business profile, top-down" from Prem', '2026-04-03', 'Email',
 'Forwarded "Baseline business profile, top-down" from Prem for review.',
 true, '2026-04-10', 'Discuss pricing model options for MLB white label/enterprise license', 'Pending');
