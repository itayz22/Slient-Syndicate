# Apex Network — Testing Guide

Complete testing procedures for the Apex Network AI funnel. Run these tests before every deployment and after any code change.

---

## Local Testing Setup

### Start the Development Server

```bash
# Install dependencies if not already done
npm install

# Copy env file and fill in values (see SETUP.md for where to find each value)
cp .env.example .env

# Start Netlify Dev — serves static site + functions on the same port
netlify dev
```

The dev server starts at `http://localhost:8888`. All Netlify Functions are available at `http://localhost:8888/.netlify/functions/<function-name>`.

### Using Dummy ActiveCampaign Credentials for Offline Testing

If you do not yet have an ActiveCampaign account or want to test without making real API calls, set these values in `.env`:

```
AC_API_KEY=dummy_key_for_testing
AC_BASE_URL=https://invalid.api-us1.com
AC_LIST_ID=999
AC_DIST_LIST_ID=998
AC_AUTOMATION_ID=1
AC_HOT_AUTOMATION_ID=2
AC_WARM_AUTOMATION_ID=3
OWNER_EMAIL=test@localhost.invalid
WEBHOOK_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

With dummy credentials, the Netlify functions will fail their AC API calls but are designed to **still return success** and redirect the user through the funnel. All redirect logic is testable without a live AC account.

To verify the function logic without AC, check the terminal output in the `netlify dev` window — all application data and scores are logged to stdout.

### Watching Function Logs

Keep a terminal window open running `netlify dev`. Each serverless function invocation logs to that window. Look for:
- `NEW APPLICATION:` — logs the full application payload and score
- `Subscribe error:` / `Apply error:` — logs any caught errors

---

## Funnel Flow Tests

Run through each path end-to-end. Use a real email address or a service like [Mailinator](https://mailinator.com) for disposable addresses.

---

### Test 1: Consumer Opt-In Flow (Happy Path)

**Goal:** Verify that a new lead enters the funnel and is routed to the manifesto page.

**Steps:**
1. Open `http://localhost:8888/` (or your live URL)
2. Fill in the opt-in form: First Name = `Test`, Email = `testlead@mailinator.com`
3. Click "Send Me The Blueprint"
4. **Expected:** Browser redirects to `/page2-manifesto.html`
5. **Expected (AC):** Contact appears in ActiveCampaign with tag `SS-NEW`
6. **Expected (email):** Welcome email arrives within 5 minutes to the test inbox
7. **Expected (terminal):** Function log shows successful contact creation

**Pass criteria:** Redirect fires, contact is in AC, welcome email delivered.

---

### Test 2: HOT Lead Flow

**Goal:** Verify that a high-intent applicant is tagged HOT and routed to the offer page.

**Steps:**
1. Open `http://localhost:8888/page3-apply.html`
2. Fill in all fields. For the qualifying questions, select:
   - Investment Readiness: **"Yes — I have the capital right now"** (`yes-ready`)
   - Target Tier: **"Launcher (6A)"** or **"Nuke (6A-2)"**
   - Income Goal: **"$10,000–$20,000/month"** or **"$20,000+/month"**
3. Submit the form
4. **Expected:** Response JSON contains `{"score":"HOT","redirect":"/page4-offer.html"}`
5. **Expected:** Browser redirects to `/page4-offer.html`
6. **Expected (AC):** Contact gets tags `SS-APPLIED` + `SS-HOT`
7. **Expected (AC):** HOT routing automation triggered

**Pass criteria:** Score = HOT, redirect to offer page, both tags applied in AC.

---

### Test 3: WARM Lead Flow

**Goal:** Verify that a considering-but-not-ready lead is tagged WARM and routed back to the manifesto.

**Steps:**
1. Open `http://localhost:8888/page3-apply.html`
2. Fill in all fields. For the qualifying questions, select:
   - Investment Readiness: **"Close — within 2–4 weeks"** (`close-2-4-weeks`)
   - Situation: **"In sales / own business"** (`sales` or `business`)
   - Income Goal: **"$5,000–$10,000/month"**
3. Submit the form
4. **Expected:** Response JSON contains `{"score":"WARM","redirect":"/page2-manifesto.html"}`
5. **Expected:** Browser redirects to `/page2-manifesto.html`
6. **Expected (AC):** Contact gets tags `SS-APPLIED` + `SS-WARM`
7. **Expected (AC):** Warm nurture automation triggered

**Pass criteria:** Score = WARM, redirect to manifesto, warm nurture enrolled.

---

### Test 4: COLD Lead Flow

**Goal:** Verify that a non-qualifying lead is tagged appropriately and routed to the homepage.

**Steps:**
1. Open `http://localhost:8888/page3-apply.html`
2. Fill in all fields. For the qualifying questions, select:
   - Investment Readiness: **"No — I don't have the capital"** (`no-capital`)
   - Income Goal: **"Under $2,000/month"**
3. Submit the form
4. **Expected:** Response JSON contains `{"score":"COLD","redirect":"/index.html"}`
5. **Expected:** Browser redirects to `/index.html`
6. **Expected (AC):** Contact gets tag `SS-APPLIED` only (no HOT or WARM tag)
7. **Expected:** No HOT or WARM automation triggered

**Pass criteria:** Score = COLD, redirect to homepage, no routing automation triggered.

---

### Test 5: Distributor Page Flow

**Goal:** Verify that the operator-facing hub is accessible and the application form works with the correct list routing.

**Steps:**
1. Open `http://localhost:8888/distributors.html`
2. Verify the page loads the private hub content
3. Submit any form on the page with `source: "distributors-page"` in the payload
4. **Expected (AC):** Contact is added to `AC_DIST_LIST_ID` (the distributors list), not the main list
5. Verify all resource links on the page resolve without 404

**Pass criteria:** Page loads, list routing uses distributor list ID.

---

## API Endpoint Tests

Run these curl commands against your local dev server. Replace `localhost:8888` with your Netlify URL for production testing.

### /subscribe — Consumer Opt-In

```bash
# Happy path — valid email and name
curl -s -X POST http://localhost:8888/.netlify/functions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","email":"testlead@mailinator.com"}' | jq .

# Expected response:
# {"success":true,"redirect":"/page2-manifesto.html"}

# Missing email — should return 400
curl -s -X POST http://localhost:8888/.netlify/functions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test"}' | jq .

# Expected response:
# {"success":false,"error":"firstName and email are required"}

# Wrong HTTP method — should return 405
curl -s -X GET http://localhost:8888/.netlify/functions/subscribe | jq .

# Expected response:
# {"error":"Method not allowed"}
```

### /apply — Application Submission and Scoring

```bash
# HOT lead — should score HOT and redirect to offer page
curl -s -X POST http://localhost:8888/.netlify/functions/apply \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Sarah",
    "lastName": "K",
    "email": "sarah.hot@mailinator.com",
    "phone": "+61400000001",
    "situation": "sales",
    "incomeGoal": "10000-20000",
    "investmentReady": "yes-ready",
    "tier": "launcher",
    "whyJoin": "Ready to go, have capital allocated.",
    "source": "consumer-funnel"
  }' | jq .

# Expected response:
# {"success":true,"score":"HOT","redirect":"/page4-offer.html"}

# WARM lead
curl -s -X POST http://localhost:8888/.netlify/functions/apply \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Marcus",
    "lastName": "V",
    "email": "marcus.warm@mailinator.com",
    "situation": "employed",
    "incomeGoal": "5000-10000",
    "investmentReady": "close-2-4-weeks",
    "source": "consumer-funnel"
  }' | jq .

# Expected response:
# {"success":true,"score":"WARM","redirect":"/page2-manifesto.html"}

# COLD lead
curl -s -X POST http://localhost:8888/.netlify/functions/apply \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Rachel",
    "email": "rachel.cold@mailinator.com",
    "situation": "student",
    "incomeGoal": "under-2000",
    "investmentReady": "no-capital",
    "source": "consumer-funnel"
  }' | jq .

# Expected response:
# {"success":true,"score":"COLD","redirect":"/index.html"}
```

### /score — Standalone Scoring (No AC Write)

```bash
# HOT score check
curl -s -X POST http://localhost:8888/.netlify/functions/score \
  -H "Content-Type: application/json" \
  -d '{"investmentReady":"yes-ready","tier":"launcher","incomeGoal":"10000-20000"}' | jq .

# Expected response:
# {"score":"HOT","redirect":"/page4-offer.html"}

# WARM score check
curl -s -X POST http://localhost:8888/.netlify/functions/score \
  -H "Content-Type: application/json" \
  -d '{"investmentReady":"close-2-4-weeks","situation":"sales"}' | jq .

# Expected response:
# {"score":"WARM","redirect":"/page2-manifesto.html"}

# COLD score check
curl -s -X POST http://localhost:8888/.netlify/functions/score \
  -H "Content-Type: application/json" \
  -d '{"investmentReady":"no-capital"}' | jq .

# Expected response:
# {"score":"COLD","redirect":"/index.html"}
```

### /webhook — ActiveCampaign Inbound Webhook

```bash
# Valid webhook ping (signature verification will fail with dummy secret — check logs for payload receipt)
curl -s -X POST http://localhost:8888/.netlify/functions/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_webhook_secret_here" \
  -d '{"type":"contact_tag_added","contact":{"email":"test@mailinator.com"},"tag":"SS-HOT"}' | jq .

# Invalid secret — should return 401
curl -s -X POST http://localhost:8888/.netlify/functions/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: wrong_secret" \
  -d '{}' | jq .

# Expected response:
# {"error":"Unauthorized"}
```

---

## Lead Scoring Tests

The scoring logic lives in `netlify/functions/apply.js` and `netlify/functions/score.js`. The rules are:

- **HOT:** `investmentReady === 'yes-ready'` OR `tier === 'launcher'` OR `tier === 'nuke'` OR `incomeGoal === '10000-20000'` OR `incomeGoal === '20000+'`
- **WARM:** `investmentReady === 'close-2-4-weeks'` OR `situation` is `sales`, `business`, `high-ticket`, `own-business`, or `other-dist`
- **COLD:** `investmentReady === 'no-capital'` OR `investmentReady === 'need-to-understand'`
- **Default fallback:** WARM (if no other rule matches)

| Scenario | `investmentReady` | `tier` | `incomeGoal` | `situation` | Expected Score |
|---|---|---|---|---|---|
| Committed, has capital | `yes-ready` | — | — | — | **HOT** |
| Launcher tier selected | — | `launcher` | — | — | **HOT** |
| Nuke tier selected | — | `nuke` | — | — | **HOT** |
| High income goal | — | — | `10000-20000` | — | **HOT** |
| Very high income goal | — | — | `20000+` | — | **HOT** |
| Almost ready, 2–4 weeks | `close-2-4-weeks` | — | — | — | **WARM** |
| Sales background | — | — | — | `sales` | **WARM** |
| No capital available | `no-capital` | — | — | — | **COLD** |

---

## Chatbot Tests

### Testing in the Browser

The chatbot widget appears on all funnel pages. To test:

1. Open `http://localhost:8888/` in your browser
2. Click the purple chat bubble (bottom-right corner)
3. The opening message appears automatically
4. Work through each path using the buttons and typing in the free-text fields

### How to Test Each of the 12 Objection Handlers

The chatbot detects objections from **typed free-text input**. To trigger each handler, type a message containing one of its keywords, then press Send or Enter.

| # | Objection | Trigger Keywords to Type |
|---|---|---|
| 1 | Is this an MLM? | `mlm`, `pyramid`, `scheme`, `scam` |
| 2 | Is this too good to be true? | `too good`, `not real`, `legit`, `legitimate` |
| 3 | I don't have tech skills | `tech`, `technical`, `coding`, `not techy` |
| 4 | I don't have an audience | `audience`, `followers`, `no following`, `small` |
| 5 | How long before first sale? | `how long`, `first sale`, `timeline`, `when` |
| 6 | The investment is too high | `too expensive`, `can't afford`, `investment`, `expensive` |
| 7 | I've tried things like this | `tried before`, `failed before`, `lost money`, `similar` |
| 8 | Do I have to recruit people? | `recruit`, `recruiting`, `sponsor` |
| 9 | What support do I get? | `support`, `help`, `training`, `coaching` |
| 10 | Can I see proof? | `proof`, `evidence`, `results`, `screenshot` |
| 11 | I need to think about it | `think about it`, `need time`, `maybe`, `sleep on` |
| 12 | Do I have to sell water machines? | `water machine`, `kangen`, `sell water`, `machine` |

After each objection response, the chatbot offers three follow-up options: apply now, ask another question, or take more time. Verify all three work correctly.

### Testing the Qualification Flow

The qualification flow uses button-click navigation, not free text. Test in order:

**Q1 Path — Employed:**
1. Click "I have a specific question" → triggers Q1
2. Click "Employed full-time" → triggers Q2 (freeText mode)
3. Type any income goal answer → triggers Q3
4. Click each of the three Q3 options and verify routing:
   - "Yes — I have the capital" → HOT path (Apply link)
   - "Possibly — need to evaluate first" → WARM path (Blueprint link)
   - "That's more than I expected" → COLD path (Blueprint link)

**Q1 Path — Sales Background:**
1. Click "I have a specific question" → Q1
2. Click "In sales / own business" → triggers Q2-hot variant (with different opening message)
3. Type income goal → Q3
4. Verify same Q3 routing as above

**Commission Info Path:**
1. Click "Tell me about the commissions" → commissions message
2. Click each follow-up option and verify they resolve without errors

**Funnel Info Path:**
1. Click "How does the AI funnel work?" → funnel message
2. Click "What traffic do I need?" → traffic message
3. Verify "I'm ready to apply" links to `/page3-apply.html`

### Chatbot State Persistence Test

The chatbot preserves stage and score in memory (`CHATBOT_STATE`). Verify:
1. Open chatbot, click through to the HOT path ("I'm ready to apply")
2. `CHATBOT_STATE.score` should be `'HOT'`
3. Close and re-open the chat widget — the conversation history should still be visible (DOM is preserved, not cleared on toggle)

---

## Mobile Responsiveness Tests

Test at three breakpoints. Use browser DevTools (F12 > Device Toolbar) or a real device.

### 390px (iPhone 14 / Small Mobile)

Pages to check: `index.html`, `page2-manifesto.html`, `page3-apply.html`, `page4-offer.html`

| Item | Expected |
|---|---|
| Navigation | Brand name and status indicator visible. No overflow. |
| Hero section | Single column layout. No horizontal scroll. |
| Hero headline | Text wraps cleanly, no clipping |
| Form card | Full width, inputs tap-friendly (min height 44px) |
| Commission rows | All three tiers visible without horizontal scroll |
| Chatbot widget | Chat bubble in bottom-right. Chat window is `calc(100vw - 48px)` wide. |
| Chat window | Scrollable message area, input field accessible above keyboard |
| Buttons | Full-width, minimum 44px touch targets |
| Grid layouts | All grids collapse to single column |
| Income disclaimer | Readable, no text clipping |

### 768px (Tablet / iPad Mini)

| Item | Expected |
|---|---|
| Navigation | Full nav bar with all elements visible |
| Hero layout | Consider single or two-column depending on CSS — verify no overflow |
| Grid-2 | May render as single column (check `@media (max-width: 768px)`) |
| Grid-3, Grid-4 | Collapse to single column at 768px |
| Form card | Comfortable width, not too narrow |
| Chatbot window | Standard 360px width or responsive |

### 1024px (iPad Pro / Small Laptop)

| Item | Expected |
|---|---|
| Full desktop layout active | Two-column hero, three-column grids |
| No layout breakage | All design system components render as intended |
| Commission bar | Proper alignment of tier names and amounts |
| Navigation | Full-width with proper spacing |

---

## Performance Tests

### Running Lighthouse

**In Chrome DevTools:**
1. Open your site URL in Chrome
2. Press F12 → Lighthouse tab
3. Select categories: Performance, Accessibility, Best Practices, SEO
4. Set device to Mobile
5. Click "Analyze page load"

**Via CLI:**
```bash
# Install Lighthouse globally
npm install -g lighthouse

# Run against local dev server
lighthouse http://localhost:8888 --output html --output-path ./lighthouse-report.html --view

# Run against production
lighthouse https://your-site.netlify.app --output html --output-path ./lighthouse-prod.html --view
```

### Target Scores

| Category | Target Score | Notes |
|---|---|---|
| Performance | ≥ 85 | CSS and fonts from CDN; minification optional |
| Accessibility | ≥ 90 | All form inputs need labels; contrast ratios checked |
| Best Practices | ≥ 90 | HTTPS required; no console errors |
| SEO | ≥ 90 | Meta description on all pages |

### Common Performance Issues to Watch

| Issue | Fix |
|---|---|
| Google Fonts blocking render | Already using `display=swap` in `@import` — verify |
| Unoptimised images | Compress any added images to WebP |
| No caching headers | Netlify adds default cache headers; check `_headers` file |
| Large layout shift (CLS) | Set explicit dimensions on any images |
| Slow TTFB on functions | Functions cold start — acceptable for serverless |

### Accessibility Checks

Run `axe` in DevTools or use the Accessibility tab:
- All form inputs have associated `<label>` elements with correct `for` attributes
- All buttons have visible focus states
- Colour contrast ratios: verify against WCAG AA (4.5:1 for normal text)
- The chatbot messages are readable by screen readers (use `aria-live` region if required)

---

## Pre-Deploy Regression Checklist

Run before every production deployment:

- [ ] `netlify dev` starts without errors
- [ ] `index.html` loads and opt-in form submits
- [ ] `page3-apply.html` scores HOT/WARM/COLD correctly for each test case
- [ ] All 12 chatbot objection keywords produce correct responses
- [ ] Chatbot qualification flow reaches terminal states (HOT, WARM, COLD)
- [ ] All curl endpoint tests return expected responses
- [ ] No JavaScript console errors on any page (check DevTools)
- [ ] Mobile layout correct at 390px on all funnel pages
- [ ] Lighthouse Performance ≥ 85 on index.html
- [ ] Income disclaimer visible on `index.html`, `page2-manifesto.html`, `page4-offer.html`
