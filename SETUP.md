# Silent Syndicate — Setup Guide

Complete setup guide for deploying the Silent Syndicate AI-automated Enagic distribution funnel. Follow each step in order.

---

## Prerequisites

Before starting, ensure you have the following:

- **Node.js 18+** — [nodejs.org](https://nodejs.org). Verify with `node --version`.
- **Netlify CLI** — Install with `npm install -g netlify-cli`. Verify with `netlify --version`.
- **ActiveCampaign account** — Any paid plan (Lite or above). You need API access.
- **Enagic distributor account** — You must be an active Enagic distributor at Striker, Launcher, or Nuke tier to use this system legally.
- **Git** — For version control and Netlify deployment.
- **A GitHub account** — For connecting to Netlify CI/CD.

---

## Step 1: Local Development Setup

### 1.1 Clone the Repository

```bash
git clone https://github.com/your-username/silent-syndicate.git
cd silent-syndicate
```

### 1.2 Install Dependencies

```bash
npm install
```

This installs the Netlify Functions runtime and any serverless function dependencies.

### 1.3 Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` in your editor and fill in every value. See Step 2 for where to find your ActiveCampaign IDs.

**Important:** Never commit `.env` to git. It is already listed in `.gitignore`.

### 1.4 Run the Local Development Server

```bash
netlify dev
```

This starts:
- The static site at `http://localhost:8888`
- All Netlify Functions at `http://localhost:8888/.netlify/functions/`
- Environment variable injection from your `.env` file

### 1.5 Verify Local Setup

Open `http://localhost:8888` and confirm:
- The homepage loads with the full design system
- The chatbot widget appears and responds
- Form submissions reach the API (check terminal for function logs)

---

## Step 2: ActiveCampaign Setup

### 2.1 Create Your Lists

Navigate to **Lists** in ActiveCampaign and create two lists:

| List Name | Purpose |
|---|---|
| **Silent Syndicate Leads** | All opt-in subscribers from the funnel |
| **SS Distributors** | Converted operators who joined as distributors |

After creating each list, note the **List ID** — visible in the list's URL or Properties panel. Add these to your `.env` as `AC_LIST_ID` and `AC_DIST_LIST_ID`.

### 2.2 Create Your Tags

Navigate to **Lists > Tags** and create the following six tags exactly as named:

| Tag | Applied When |
|---|---|
| `SS-NEW` | Contact opts in via the landing page |
| `SS-HOT` | Lead score is HOT (≥ 70 points) after application |
| `SS-WARM` | Lead score is WARM (40–69 points) after application |
| `SS-APPLIED` | Application form submitted |
| `SS-CONVERTED` | Distributor joined and paid |
| `SS-DISTRIBUTOR` | Active operator in the network |

Note each Tag ID from the tag's URL and add the relevant ones to `.env`.

### 2.3 Create Your Automations

You need three automations. For each one: go to **Automations > New Automation > Start from Scratch**.

---

#### Automation 1: SS Welcome Sequence

**Trigger:** Tag is added → `SS-NEW`

**Purpose:** Educate cold leads over 7 days before they receive an application prompt.

**Configuration:**
- Set start condition: "When a tag is added" → select `SS-NEW`
- Set to run: "Once per contact"
- Disable re-entry

**Email sequence:**

| Step | Delay | Action |
|---|---|---|
| 1 | Immediate | Send email: Day 0 Welcome |
| 2 | Wait 1 day | Send email: Day 1 The Model |
| 3 | Wait 1 day | Send email: Day 2 The Math |
| 4 | Wait 1 day | Send email: Day 3 Objections |
| 5 | Wait 1 day | Send email: Day 4 Traffic |
| 6 | Wait 1 day | Send email: Day 5 Proof |
| 7 | Wait 1 day | Send email: Day 6 The Decision |
| 8 | Wait 1 day | Send email: Day 7 Apply Now |
| 9 | Immediate | End automation |

After creating, copy the Automation ID from the URL and add to `.env` as `AC_AUTOMATION_ID`.

---

#### Automation 2: SS HOT Lead Routing

**Trigger:** Tag is added → `SS-HOT`

**Purpose:** Immediately route hot leads to the offer page with urgency messaging.

**Configuration:**
- Set start condition: "When a tag is added" → select `SS-HOT`
- Set to run: "Once per contact"
- Goal: Contact applies and converts

**Email sequence:**

| Step | Delay | Action |
|---|---|---|
| 1 | Immediate | Send email: HOT — Your Application Was Reviewed |
| 2 | Wait 2 hours | Send email: HOT Follow-Up — Spots Are Limited |
| 3 | Wait 1 day | Send email: HOT Final — Last Chance This Cohort |
| 4 | Immediate | End automation |

After creating, copy the ID and add to `.env` as `AC_HOT_AUTOMATION_ID`.

---

#### Automation 3: SS Warm Nurture

**Trigger:** Tag is added → `SS-WARM`

**Purpose:** Keep warm leads engaged for 30 days until they're ready to apply or self-qualify as HOT.

**Configuration:**
- Set start condition: "When a tag is added" → select `SS-WARM`
- Set to run: "Once per contact"
- Add goal: If contact gets `SS-HOT` tag → exit automation and enter HOT automation

**Email sequence:**

| Step | Delay | Action |
|---|---|---|
| 1 | Immediate | Send email: WARM — Here's Everything You Need to Evaluate |
| 2 | Wait 3 days | Send email: WARM — The Break-Even Math |
| 3 | Wait 4 days | Send email: WARM — Real Operator Timeline |
| 4 | Wait 7 days | Send email: WARM — Still Thinking? Here's the Full FAQ |
| 5 | Wait 7 days | Send email: WARM — Final Nudge |
| 6 | Wait 9 days | End automation |

After creating, copy the ID and add to `.env` as `AC_WARM_AUTOMATION_ID`.

---

### 2.4 Create a Custom Field for Lead Score (Optional)

Navigate to **Lists > Manage Fields > Add New Field**:
- Field type: **Text**
- Field name: `Lead Score`
- Add to all lists

Copy the Field ID and add to `.env` as `AC_LEAD_SCORE_FIELD_ID`.

---

## Step 3: Email Sequence Content

Write your email copy for each of the 7 days in the Welcome Sequence. Below are the subject lines and content briefs:

### Day 0 — Welcome (Send Immediately After Opt-In)
**Subject:** `You're in. Here's the AI Income Blueprint.`
**Body:** Welcome, confirm what they signed up for, deliver the blueprint PDF or link. Set expectations: over the next 7 days, they'll receive the full breakdown of the system. Include a single CTA: read the blueprint at their own pace.

### Day 1 — The Model
**Subject:** `How a water machine pays $4,300 commission`
**Body:** Explain the Enagic distributor model clearly. Name the company, the product category (water ionisers), and the exact commission tiers (Striker $2,400 / Launcher $4,300 / Nuke $6,330). Transparency is the hook. Explain that your buyers are people who want the business, not random consumers.

### Day 2 — The Math
**Subject:** `Break-even at 4 sales. Here's the full equation.`
**Body:** Walk through the break-even calculation for Launcher tier: $15,000 investment ÷ $4,300 per sale = 3.5 sales to break even. Cover month-by-month projections at 1 sale/month vs 2 sales/month. Include the income disclaimer. No hype — just arithmetic.

### Day 3 — Objections
**Subject:** `"Is this an MLM?" — Let me answer that directly.`
**Body:** Address the top 3 objections head-on: MLM/pyramid scheme, too good to be true, requires a big network. Use the same transparency-first language as the chatbot responses. This email filters out the wrong people and builds trust with the right ones.

### Day 4 — Traffic
**Subject:** `The only skill you actually need (it's not sales)`
**Body:** Explain the content strategy: 60-second TikTok/Instagram videos using the transparency hook formula. No followers needed. Describe what a day of content creation looks like. Cover the funnel stages the traffic runs into automatically. Emphasise: your job is content, the system does the rest.

### Day 5 — Proof
**Subject:** `Sarah made $14,200 in month 3. Here's what her first 30 days looked like.`
**Body:** Share 2–3 operator case studies with real timelines and realistic numbers. Include the median stats: 21 days to first lead, 28 days to first sale for daily content operators. Add the income disclaimer. Acknowledge that results vary and most operators earn less initially.

### Day 6 — The Decision
**Subject:** `Three questions that tell you if this is right for you.`
**Body:** Give them the self-qualification checklist: (1) Do you have the capital? (2) Can you post content consistently? (3) Are you comfortable with a 30-day ramp? If yes to all three, they're a fit. If no to any — be honest that this isn't right for them right now. Redirect non-fits to the free blueprint.

### Day 7 — Apply Now
**Subject:** `Your spot. 3 minutes to apply.`
**Body:** Direct CTA to the application page. Remind them what happens after they apply: AI scoring within minutes, routing to HOT/WARM/COLD path, owner review within 24 hours. Create urgency: cohorts are limited. Include the application link prominently.

---

## Step 4: Netlify Deployment

### 4.1 Connect Your GitHub Repository

1. Push your project to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) and click **Add new site > Import an existing project**
3. Select GitHub and authorise Netlify
4. Choose your repository
5. Build settings:
   - **Build command:** (leave blank — this is a static site)
   - **Publish directory:** `.` (root)
   - **Functions directory:** `netlify/functions`

### 4.2 Set Environment Variables in Netlify Dashboard

Go to **Site Settings > Environment Variables** and add every variable from `.env.example`:

| Variable | Where to find it |
|---|---|
| `AC_API_KEY` | ActiveCampaign > Account Settings > Developer |
| `AC_BASE_URL` | ActiveCampaign > Account Settings > Developer |
| `AC_LIST_ID` | AC Lists > your list > Properties |
| `AC_DIST_LIST_ID` | AC Lists > distributors list > Properties |
| `AC_AUTOMATION_ID` | AC Automations > Welcome > URL |
| `AC_HOT_AUTOMATION_ID` | AC Automations > HOT > URL |
| `AC_WARM_AUTOMATION_ID` | AC Automations > Warm > URL |
| `AC_HOT_TAG_ID` | AC Lists > Tags > SS-HOT |
| `AC_WARM_TAG_ID` | AC Lists > Tags > SS-WARM |
| `AC_APPLIED_TAG_ID` | AC Lists > Tags > SS-APPLIED |
| `AC_LEAD_SCORE_FIELD_ID` | AC Lists > Manage Fields > Lead Score |
| `OWNER_EMAIL` | Your email address |
| `OWNER_PHONE` | Your phone number |
| `WEBHOOK_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NETLIFY_SITE_ID` | Netlify > Site Settings > General |
| `NETLIFY_SITE_URL` | Your Netlify site URL |

### 4.3 Deploy

Click **Deploy site**. Netlify will build and deploy. First deploy typically takes 60–90 seconds.

After deploy, visit your Netlify URL and verify the site loads correctly.

---

## Step 5: Domain Setup

### 5.1 Add a Custom Domain in Netlify

1. Go to **Site Settings > Domain management > Add custom domain**
2. Enter your domain (e.g. `silentsyndicate.com`)
3. Netlify will verify and ask you to update your DNS

### 5.2 Update DNS Records

In your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):

**Option A — Use Netlify DNS (Recommended):**
- Change your nameservers to Netlify's nameservers (provided in the Netlify domain panel)
- Netlify handles all DNS automatically including SSL

**Option B — Keep existing DNS:**
- Add a CNAME record: `www` → `your-site-name.netlify.app`
- Add an A record: `@` → Netlify's load balancer IP (shown in Netlify dashboard)

### 5.3 Enable HTTPS

Netlify provisions a free Let's Encrypt SSL certificate automatically within ~5 minutes of DNS propagation. Verify HTTPS is active in **Site Settings > Domain management > HTTPS**.

### 5.4 Set Up Redirects

Your `_redirects` file should already handle:
- `http://` → `https://` (forced HTTPS)
- Non-www → www (or vice versa)
- API function routes

Verify the `_redirects` file is in your repo root.

---

## Step 6: Testing Checklist

### 6.1 Funnel Flow Test

Run through the complete funnel as a test lead:

- [ ] Submit opt-in form on `index.html` with a test email
- [ ] Confirm contact appears in ActiveCampaign with `SS-NEW` tag
- [ ] Confirm welcome email arrives within 5 minutes
- [ ] Navigate to `page2-manifesto.html` and confirm it loads
- [ ] Submit application on `page3-apply.html` with HOT-qualifying answers
- [ ] Confirm `SS-APPLIED` tag added and `SS-HOT` tag triggers routing
- [ ] Confirm HOT routing email arrives
- [ ] Confirm redirect to `page4-offer.html`

### 6.2 API Endpoint Tests

Test each function endpoint:

```bash
# Test subscribe endpoint
curl -X POST http://localhost:8888/.netlify/functions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Test apply endpoint
curl -X POST http://localhost:8888/.netlify/functions/apply \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","capital":"yes","timeline":"now","commitment":"full"}'

# Test score endpoint
curl -X POST http://localhost:8888/.netlify/functions/score \
  -H "Content-Type: application/json" \
  -d '{"capital":"yes","timeline":"now","commitment":"full","background":"sales"}'
```

### 6.3 Email Delivery Test

- [ ] Confirm welcome email arrives and is not in spam
- [ ] Check email renders correctly on mobile
- [ ] Verify all links in emails resolve correctly
- [ ] Check unsubscribe link works

---

## Step 7: Go Live Checklist

Before announcing your funnel to traffic, verify every item:

**Environment**
- [ ] All environment variables set in Netlify dashboard
- [ ] No `.env` file committed to git
- [ ] Custom domain resolving with HTTPS

**ActiveCampaign**
- [ ] All three automations set to **Active** (not Draft)
- [ ] Both lists created and IDs correct in env vars
- [ ] All six tags created
- [ ] Welcome sequence emails written and saved as Campaigns in each automation step
- [ ] HOT routing emails written and ready
- [ ] Warm nurture emails written and ready

**Funnel Pages**
- [ ] `index.html` — opt-in form working, chatbot initialising
- [ ] `page2-manifesto.html` — loading and readable
- [ ] `page3-apply.html` — form submitting, score returned
- [ ] `page4-offer.html` — accessible only to HOT leads (verify redirect logic)
- [ ] `distributors.html` — private hub accessible
- [ ] Income disclaimer visible on every page

**Testing**
- [ ] Complete funnel flow tested end-to-end with a real email address
- [ ] HOT, WARM, and COLD lead paths tested
- [ ] Chatbot tested on mobile at 390px width
- [ ] Forms tested on mobile
- [ ] All API endpoints returning expected responses

**Legal**
- [ ] Income disclaimer present on all pages that reference earnings
- [ ] Enagic IDS/distributor information accurate
- [ ] No false income claims made without qualifying language

Once all boxes are checked, begin driving traffic. Start with 1–2 pieces of content daily on TikTok/Instagram using the transparency hook formula in the Traffic Strategy guide.
