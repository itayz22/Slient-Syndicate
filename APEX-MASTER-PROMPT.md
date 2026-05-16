# APEX NETWORK — MASTER BRIEFING PROMPT
### Use this at the start of any new AI session to restore full project context instantly.

---

You are the AI build partner for **Isaac Taylor — Apex Network (Australia)**.

Paste this entire document at the start of any new session. It is the single source of truth for the project state, architecture, what works, what doesn't, and what's left to build.

---

## WHO IS ISAAC

Isaac Taylor is building an independent AI-powered distribution network in Australia called **Apex Network**. He is an Enagic authorised distributor. His model: recruit operators online via a fully automated funnel, collect a commission (~$365–$2,595 AUD) on every product sale, and provide operators with a plug-and-play AI content system to duplicate the process.

Isaac is the sole builder and operator. The site and all its pages have been built collaboratively via Claude Code (AI). Isaac is hands-on and technically involved but relies on AI for code output.

---

## THE BUSINESS MODEL

**What Apex Network sells:** Enagic water ioniser and wellness machine distributorships.

**How it works:**
1. Isaac drives traffic (TikTok / Instagram) to his opt-in funnel
2. Leads enter the funnel, are qualified via an application form, and are invited to register
3. Isaac earns a direct commission from Enagic for every sale that goes through his Sponsor IDs
4. Registered operators also get access to Apex's internal systems (AIOS, Operator System, Hub) to duplicate the funnel

**Products offered:**

| Product | Investment (AUD) | Commission/Sale | Sponsor ID | Rank |
|---------|-----------------|-----------------|------------|------|
| K8 Single | $6,787 | ~$365 | 29000059770 | 1A |
| Trifecta | ~$11,682 | ~$1,322 | 29000059770 | 2A |
| Quad | ~$18,469 | ~$2,595 | 29000059770 | 3A |
| emGuarde (pos 1) | $2,475 | ~$225 | 29000059769 | 1A |
| emGuarde (pos 2) | $2,475 | ~$225 | 29000059768 | 1A |

**Legal structure:** Apex Network is an independent distributor network — not affiliated with or endorsed by Enagic International. All income disclosure language is included across all public pages.

---

## REPOSITORY & DEPLOYMENT

| Item | Detail |
|------|--------|
| GitHub repo | `github.com/itayz22/Slient-Syndicate` (note: typo in repo name — "Slient" not "Silent") |
| Branch | `main` → auto-deploys to Netlify on push |
| Live URL | `https://silent-syndicate.netlify.app` |
| Local path | `C:/Users/footb/Slient-Syndicate` |
| Netlify account | Connected to GitHub, auto-deploy active |
| Custom domain | NOT yet purchased — target: `apexnetwork.com.au` |

**To deploy any change:** `git add [files] && git commit -m "message" && git push origin main`

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | Plain HTML/CSS/JS — no framework, no build step |
| Hosting | Netlify (free tier) |
| Functions | Netlify serverless functions (Node.js) |
| Email CRM | ActiveCampaign (account: silentsyndicatebiz52734 — the AC subdomain, cannot be changed without new AC account) |
| Analytics | **NOT YET IMPLEMENTED** — needs GA4 + Facebook Pixel |
| Content tools | HeyGen (AI avatar) + CapCut (editing) + Later (scheduling) |
| Font stack | Bebas Neue (display), DM Mono (mono/labels), Archivo (body) |
| Blue accent | `#0066ff` |
| Design language | Dark (#000), high contrast, military/operator aesthetic, custom crosshair cursor |

---

## FILE INVENTORY — ALL PAGES

### Public Funnel Pages (the conversion sequence)

| File | Status | Purpose |
|------|--------|---------|
| `apex-index.html` | ✅ Built & live | Front door opt-in. Headline: "EARN UP TO $2,595 PER SALE". Collects first name + email → subscribe.js → redirects to apex-page2.html |
| `apex-page2.html` | ✅ Built & live | Platform story / system explainer. "THE APEX SYSTEM". Explains the mechanism. CTA → apex-apply.html |
| `apex-apply.html` | ✅ Built & live | Application form. Collects situation, income goal, investment readiness, why join. → apply.js → apex-offer.html |
| `apex-offer.html` | ✅ Built & live | Offer page. Shows Sponsor IDs (all 3). CTA → apex-join.html |
| `apex-join.html` | ✅ Built & live | 5-step registration wizard. Collects full personal + bank + product details. → register.js → apex-thank-you.html |
| `apex-thank-you.html` | ✅ Built & live | Post-registration confirmation page |

### Internal / Private Pages (passcode: `DIESEL2025`)

| File | Status | Purpose |
|------|--------|---------|
| `apex-hub.html` | ✅ Built & live | Private command centre. Shows pipeline status, blockers list, quick-access links to all pages and tools |
| `apex-agent-os.html` | ✅ Built & live | AI Agent OS. 8-module system — daily ops, content, lead handling, scripts, CRM, analytics, commission tracking, recruiting |
| `apex-operator-system.html` | ✅ Built & live | Operator activation guide. Week 1 checklist, content formula, pipeline scripts, commission reference, recruiting process |
| `apex-content-calendar.html` | ✅ Built & live | 30-day content calendar, 30 scripts, HeyGen workflow, hook bank |
| `apex-tracker.html` | ✅ Built & live | Build tracker / progress dashboard |

### Legal Pages (public)

| File | Status | Purpose |
|------|--------|---------|
| `apex-terms.html` | ✅ Built & live | Terms of Service |
| `apex-privacy.html` | ✅ Built & live | Privacy Policy |
| `apex-disclosure.html` | ✅ Built & live | Income Disclosure Statement |

### Missing / Not Yet Built

| File | Status |
|------|--------|
| `apex-cinematic-v4.html` | ❌ MISSING — planned cinematic landing page variant, never built |

---

## NETLIFY FUNCTIONS

Located at `netlify/functions/`

### `subscribe.js` — Opt-in handler
- **Trigger:** apex-index.html form submit
- **Collects:** `firstName`, `email`
- **Does:**
  1. Creates/updates contact in ActiveCampaign
  2. Adds to AC list (if `AC_LIST_ID` set)
  3. Applies tag: `SS-NEW`
  4. Triggers welcome automation (if `AC_AUTOMATION_ID` set)
- **Returns redirect:** `/apex-page2.html`
- **Owner notification:** ❌ None — no email fires to Isaac on opt-in
- **Error handling:** ✅ Graceful — returns success even on AC failure to not block funnel

### `apply.js` — Application handler + lead scorer
- **Trigger:** apex-apply.html form submit
- **Collects:** firstName, lastName, email, phone, situation, incomeGoal, investmentReady, whyJoin, tier, source
- **Does:**
  1. Scores lead (HOT / WARM / COLD)
  2. Syncs contact to ActiveCampaign
  3. Adds note with all application answers
  4. Adds to AC list
  5. Applies tags: `SS-APPLIED` + `SS-HOT` or `SS-WARM` based on score
  6. Triggers HOT or WARM automation if IDs configured
  7. Sets custom field `lead_score` (if `AC_LEAD_SCORE_FIELD_ID` configured)
  8. Calls `notifyOwner()` — **logs to console only, no actual email fires**
- **Scoring logic:**
  - HOT: `investmentReady=yes-ready` OR `tier=launcher/nuke` OR `incomeGoal=10k+`
  - WARM: `close in 2–4 weeks` OR specific situations (sales, business, high-ticket)
  - COLD: `no-capital` or `need-to-understand`
- **Returns redirect:** `/apex-offer.html` (HOT or WARM) or `/apex-index.html` (COLD)
- **Owner notification:** ⚠️ Console.log only — no real email without SendGrid or similar

### `register.js` — Full registration handler
- **Trigger:** apex-join.html step-5 submit
- **Collects:** Full personal info (firstName, lastName, DOB, ID number, address), bank details (BSB, account), product choice, sponsor ID, payment method, delivery address
- **Does:**
  1. Syncs contact to AC, applies `SS-CONVERTED` + `SS-DISTRIBUTOR` tags
  2. Adds full registration note to AC contact
  3. Adds to AC list
  4. Emails Isaac (owner) with full registration summary + next-step instructions
  5. Emails client confirmation with "what happens next"
- **Returns:** `{ success: true }` — frontend redirects to `/apex-thank-you.html`
- **Owner email:** ✅ Fires via AC transactional email (if AC is configured)

### Other functions (not part of main funnel)
- `score.js` — standalone scoring endpoint
- `webhook.js` — generic webhook handler

---

## NETLIFY CONFIG

### `netlify.toml`
```toml
[build]
  publish = "."
  functions = "netlify/functions"
  # No build command — static HTML, no build step
```

### `_redirects`
```
/hub              /apex-hub.html       200
/apply            /apex-apply.html     200
/offer            /apex-offer.html     200
/join             /apex-join.html      200
/start            /apex-index.html     200
/api/subscribe    /.netlify/functions/subscribe  200
/api/apply        /.netlify/functions/apply  200
/api/register     /.netlify/functions/register  200
/api/score        /.netlify/functions/score  200
/api/webhook      /.netlify/functions/webhook  200
```

Short URLs: `/start`, `/apply`, `/offer`, `/join`, `/hub` all work as clean links.

---

## ENVIRONMENT VARIABLES (Netlify → Site config → Environment variables)

These MUST be set in Netlify before the funnel processes any leads. **None are set yet — this is the #1 critical blocker.**

| Variable | Required | Purpose |
|----------|----------|---------|
| `AC_BASE_URL` | ✅ CRITICAL | Your AC API URL — find in AC → Settings → Developer → API Access URL (format: `https://YOUR_ACCOUNT.api-us1.com`) |
| `AC_API_KEY` | ✅ CRITICAL | AC → Settings → Developer → copy API key |
| `OWNER_EMAIL` | ✅ CRITICAL | Isaac's email — receives registration notifications |
| `AC_LIST_ID` | Recommended | ID of your main AC list (find in AC → Lists) |
| `AC_AUTOMATION_ID` | Optional | ID of your welcome automation for new opt-ins |
| `AC_HOT_AUTOMATION_ID` | Optional | Automation triggered when HOT lead applies |
| `AC_WARM_AUTOMATION_ID` | Optional | Automation triggered when WARM lead applies |
| `AC_DIST_LIST_ID` | Optional | Separate list ID for distributor-page leads |
| `AC_LEAD_SCORE_FIELD_ID` | Optional | Custom field ID for storing HOT/WARM/COLD score |

**After setting vars:** Netlify → Deploys → Trigger deploy → Deploy site (vars only take effect after redeploy).

---

## ACTIVECAMPAIGN TAGS

The following tags are applied automatically by the functions. They must exist in your AC account OR will be auto-created on first use (the functions search for existing tags before creating).

| Tag | Applied by | When |
|-----|-----------|------|
| `SS-NEW` | subscribe.js | On every opt-in |
| `SS-APPLIED` | apply.js | On every application submission |
| `SS-HOT` | apply.js | HOT lead score |
| `SS-WARM` | apply.js | WARM lead score |
| `SS-CONVERTED` | register.js | On registration submission |
| `SS-DISTRIBUTOR` | register.js | On registration submission |

Note: `SS-` prefix is intentional — carries over from the Silent Syndicate origin account name. Functionally correct, cosmetically an old brand remnant.

---

## CONVERSION FUNNEL — CONFIRMED WORKING SEQUENCE

```
apex-index.html
  ↓ [form: firstName + email → /.netlify/functions/subscribe → tag: SS-NEW]
apex-page2.html
  ↓ [CTA button: "READ THE SYSTEM NOW →"]
apex-apply.html
  ↓ [form: full application → /.netlify/functions/apply → score → tag: SS-APPLIED + HOT/WARM]
apex-offer.html
  ↓ [CTA button: "BEGIN OPERATOR REGISTRATION →"]
apex-join.html (5-step wizard)
  ↓ [form: full registration → /.netlify/functions/register → tag: SS-CONVERTED + SS-DISTRIBUTOR]
apex-thank-you.html
```

All steps confirmed ✅ after diagnostic and fixes applied 2026-05-16.

---

## WHAT IS WORKING ✅

- All 14 pages built, deployed, and returning HTTP 200
- Full conversion sequence functional end-to-end
- All 3 Netlify functions wired correctly to correct endpoints
- All 3 Sponsor IDs present and correct on offer + join pages
- Passcode gates active on all 3 private pages (DIESEL2025)
- All pages mobile responsive (viewport + @media)
- Income disclaimer present on all public pages
- Design system consistent across all pages
- Git repo connected to Netlify, auto-deploy working
- Short URL routes active (/start, /join, /hub etc)
- Lead scoring system (HOT/WARM/COLD) functional in apply.js
- Application note written to AC contact with full answers
- Registration confirmation email logic built (fires when AC is configured)
- Owner notification email logic built in register.js

---

## WHAT IS NOT WORKING ❌

### CRITICAL BLOCKERS (blocks revenue)

1. **AC environment variables not set in Netlify**
   - `AC_BASE_URL`, `AC_API_KEY`, `OWNER_EMAIL` are all missing
   - Effect: Every form submission silently fails to reach ActiveCampaign. No contacts are being created. No tags applied. No emails fired. The funnel looks like it works (returns success to user) but nothing lands in CRM.
   - Fix: Isaac must add these in Netlify dashboard. AI cannot do this.

2. **No analytics on any page**
   - No Google Analytics GA4 tag
   - No Facebook/Meta Pixel
   - Effect: Cannot track conversions, cannot run retargeting ads, cannot measure funnel performance
   - Fix: Isaac provides GA4 Measurement ID + FB Pixel ID → Claude adds them to all pages

### NON-CRITICAL GAPS

3. **apply.js owner notification is console.log only**
   - When a HOT or WARM lead applies, `notifyOwner()` logs to Netlify console but sends no email
   - Isaac won't know in real-time when a strong lead comes in
   - Fix: Wire up a real email via SendGrid, Resend, or AC transactional email

4. **apex-cinematic-v4.html not built**
   - A cinematic landing page variant was planned but never created
   - Not blocking anything currently

5. **No custom domain**
   - Currently on `silent-syndicate.netlify.app` — old brand in the URL
   - Fix: Isaac purchases `apexnetwork.com.au` → points to Netlify

6. **No TikTok or Instagram content published yet**
   - HeyGen account not yet set up
   - No videos posted
   - Funnel has zero organic traffic

7. **AC tags not verified in dashboard**
   - Tags auto-create on first use if not found, but this hasn't been tested with real credentials
   - Worth verifying once env vars are live

---

## WHAT HAS BEEN BUILT — FULL HISTORY

| Date | Build |
|------|-------|
| Early builds | apex-join.html (5-step wizard), apex-hub.html, apex-agent-os.html, apex-legal pages (terms/privacy/disclosure) |
| Mid-build | apex-tracker.html (build tracker dashboard) |
| Rebrand | Complete Silent Syndicate → Apex Network rebrand across all pages |
| Recent | apex-operator-system.html (operator activation guide), apex-content-calendar.html (30-day calendar + scripts) |
| 2026-05-16 | Full system diagnostic + repairs (see below) |

### Diagnostic & Repairs Applied 2026-05-16

1. `_redirects` file was corrupted (prompt text written into it via IDE) — restored to correct state
2. Added missing `/api/register` route to `_redirects`
3. `apex-join.html` — fixed wrong function call (`apply` → `register`)
4. `apex-join.html` — fixed success flow to redirect to `apex-thank-you.html` (was showing inline success state)
5. `apex-agent-os.html` — fixed doc reference (`apply.js` → `register.js`), removed old AC account URL
6. `apex-hub.html` — removed hardcoded `silentsyndicatebiz52734` AC URL from setup instructions, replaced with generic instruction

---

## DESIGN SYSTEM

| Element | Value |
|---------|-------|
| Background | `#000000` |
| White | `#ffffff` |
| Blue accent | `#0066ff` |
| Blue dark | `#0044cc` |
| Muted text | `rgba(255,255,255,0.45)` |
| Edge borders | `rgba(255,255,255,0.08)` |
| Display font | Bebas Neue (Google Fonts) |
| Mono font | DM Mono (Google Fonts) |
| Body font | Archivo (Google Fonts) |
| Cursor | `crosshair` on body |
| Aesthetic | Dark military/operator — no rounded corners, minimal, high contrast |

All pages load fonts from Google Fonts CDN. No local font files.

---

## CONTENT STRATEGY

**Platform:** TikTok (primary) + Instagram Reels (secondary)
**Frequency:** 1 video/day — TikTok 7pm AEST, Instagram 6pm AEST
**Format:** 9:16 vertical, ~45 seconds, AI avatar (HeyGen), auto-captions
**Tool chain:** HeyGen → CapCut (captions) → Later (scheduling)
**HeyGen plan:** $29 USD/month

**Transparency formula (every video):**
- Name the investment ($6,787 – $18,469)
- Name the commission ($365 – $2,595)
- Name the break-even (7–19 sales)
- CTA to bio link

**4 Content Pillars:**
1. Franchise Math (compare to traditional business cost)
2. System vs Job (time leverage)
3. Platform Thinking (why AI + Enagic)
4. Operator Proof (show the dashboard, the funnel, real numbers)

**Bio link target:** `/start` → `apex-index.html` (short clean URL)
**Instagram handle:** @apexnetwork.au

---

## MANUAL ACTIONS — ISAAC ONLY

These cannot be done by AI. Isaac must complete each one.

**CRITICAL (blocks revenue):**
- [ ] Set `AC_BASE_URL` in Netlify environment variables
- [ ] Set `AC_API_KEY` in Netlify environment variables
- [ ] Set `OWNER_EMAIL` in Netlify environment variables
- [ ] Trigger redeploy in Netlify after setting vars

**HIGH PRIORITY:**
- [ ] Add GA4 Measurement ID (format: `G-XXXXXXXXXX`) — provide to Claude to add to all pages
- [ ] Add Facebook/Meta Pixel ID (format: 15-digit number) — provide to Claude to add to all pages
- [ ] Set up HeyGen account ($29 USD/mo) and create AI avatar
- [ ] Post first TikTok video

**WHEN READY:**
- [ ] Purchase domain `apexnetwork.com.au` → point to Netlify
- [ ] Add bio link on Instagram @apexnetwork.au → `/start`
- [ ] Verify AC tags are created in AC dashboard (SS-NEW, SS-APPLIED, SS-HOT, SS-WARM, SS-CONVERTED, SS-DISTRIBUTOR)
- [ ] Set `AC_LIST_ID` in Netlify env vars once AC list is created
- [ ] Test a full funnel run-through with a real email after env vars are set

---

## HOW TO WORK WITH THIS PROJECT

**Repo path (local):** `C:/Users/footb/Slient-Syndicate`
**Always cd there first:** `cd /c/Users/footb/Slient-Syndicate`

**To make any change:**
1. Edit the relevant file(s)
2. `git add [changed files]`
3. `git commit -m "type: description"`
4. `git push origin main`
5. Netlify auto-deploys within ~30 seconds

**Commit message convention used:** `fix:`, `build:`, `update:`, `rebrand:`

**Do NOT:**
- Add a build step or package.json unless absolutely necessary — everything is plain HTML
- Break the `_redirects` file (it has been corrupted before via IDE)
- Create new pages without adding them to `apex-hub.html` quick-links and `apex-tracker.html`
- Add Orbitron font (design uses Bebas Neue) or `#00d4ff` (design uses `#0066ff`)

**When adding analytics (GA4 + Pixel):**
- Add to ALL apex-*.html pages inside `<head>`
- GA4 snippet goes before closing `</head>`
- FB Pixel snippet goes immediately after opening `<body>`

---

## LIVE SITE STATUS (as of 2026-05-16)

| Page | URL | HTTP | Notes |
|------|-----|------|-------|
| Front door | /apex-index.html | 200 ✅ | Opt-in form live |
| Platform story | /apex-page2.html | 200 ✅ | |
| Application | /apex-apply.html | 200 ✅ | |
| Offer | /apex-offer.html | 200 ✅ | |
| Registration | /apex-join.html | 200 ✅ | 5-step wizard |
| Thank you | /apex-thank-you.html | 200 ✅ | |
| Hub | /apex-hub.html | 200 ✅ | Passcode gated |
| Agent OS | /apex-agent-os.html | 200 ✅ | Passcode gated |
| Operator System | /apex-operator-system.html | 200 ✅ | Passcode gated |
| Content Calendar | /apex-content-calendar.html | 200 ✅ | Passcode gated |
| Tracker | /apex-tracker.html | 200 ✅ | Passcode gated |
| Terms | /apex-terms.html | 200 ✅ | |
| Privacy | /apex-privacy.html | 200 ✅ | |
| Disclosure | /apex-disclosure.html | 200 ✅ | |

**Overall system health: ~85% complete**
The funnel is fully built and technically correct. The only thing preventing it from working end-to-end is that the AC environment variables have not been set in Netlify. Once those are live, the system is operational.

---

*Last full diagnostic: 2026-05-16 by Claude Sonnet 4.6 via Claude Code*
*Commit at time of last diagnostic: `94953cb`*
