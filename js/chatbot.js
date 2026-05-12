/* ============================================================
   APEX NETWORK — CHATBOT CONVERSATION ENGINE
   Qualification flow + 12 objection handlers
   ============================================================ */

const CHATBOT_STATE = {
  initialized: false,
  stage: 'opening',
  score: 'UNKNOWN',
  answers: {}
};

const OBJECTION_RESPONSES = {
  'mlm': {
    keywords: ['mlm', 'pyramid', 'scheme', 'multi level', 'multilevel', 'scam'],
    response: `Enagic is classified as a direct-sales company, not an MLM pyramid scheme. The distinction matters: in a pyramid scheme, income comes primarily from recruiting, not from product sales. With Enagic, you earn $2,400–$6,330 per direct product sale — that's your main income. The team override structure exists, but it's a bonus on top of direct commission, not the primary income mechanism. Enagic has operated for 50 years across 190 countries with real products. That's not something a scheme sustains.`
  },
  'too-good': {
    keywords: ['too good', 'sounds too', 'not real', 'scam', 'legit', 'legitimate', 'real'],
    response: `Fair scepticism — here's why it's not: the investment is $8,500–$20,000. That's real money at risk. We disclose that upfront because it filters out people who aren't serious. The commissions are high because the product is high-ticket. A Kangen machine costs the buyer $3,000–$5,000+. You're earning commission on a premium product sale, not getting paid to click ads.`
  },
  'tech': {
    keywords: ['tech', 'technical', 'not techy', 'coding', 'website', 'not good with', 'no experience'],
    response: `You don't need tech skills. We provide the funnel template, the email sequences are pre-written, and the chatbot is pre-configured. Your job is to drive traffic (create content on TikTok/Instagram) and review applications. If you can post a video and check email, you can run this system.`
  },
  'audience': {
    keywords: ['audience', 'followers', 'no following', 'no platform', 'nobody follows', 'small'],
    response: `The funnel is built for cold traffic — not your warm market or existing followers. TikTok's algorithm shows content to non-followers based on interest. Most operators start with 0 followers and build while the funnel runs. You need content, not followers.`
  },
  'how-long': {
    keywords: ['how long', 'first sale', 'when', 'timeline', 'long does it take', 'quickly'],
    response: `Typical timeline: Week 1 setup, Week 2 first content, Week 3 first applications, Week 4 first close. Most active operators make their first sale between Day 15–30. Some take 60 days. It depends entirely on your content output and traffic volume. We track our median: 21 days to first application, 28 days to first sale for operators posting daily.`
  },
  'investment': {
    keywords: ['too expensive', 'too much', 'can\'t afford', 'investment', 'cost too', 'price', 'expensive', 'too high'],
    response: `The break-even math at Launcher tier: $15,000 ÷ $4,300 = 3.5 sales. Four sales and you've recovered your investment. If you can make 4 sales in 90 days, you're profitable. The question isn't whether $15,000 is a lot — it is. The question is whether you can make 4 sales in 90 days with a pre-built AI funnel. If the answer is no, this isn't right for you right now.`
  },
  'tried': {
    keywords: ['tried before', 'failed before', 'didn\'t work', 'other programs', 'lost money', 'similar'],
    response: `Most things people try online fail because: they're low-ticket (need massive volume), they require building an audience first, or the margins are too thin to advertise. This model is different in one specific way — $4,300+ per sale changes the math. You can afford paid traffic with those margins. You can break even on a few sales. Low-ticket models can't absorb that cost.`
  },
  'recruit': {
    keywords: ['recruit', 'recruiting', 'bring people', 'sign people', 'sponsor'],
    response: `You don't have to recruit anyone. Your commission is earned on direct sales to end buyers — people who want to become distributors themselves. They're buying the machine and the business opportunity. You don't cold-pitch strangers or run a team unless you want to. Building a downline accelerates income but isn't required.`
  },
  'support': {
    keywords: ['support', 'help', 'training', 'stuck', 'alone', 'coaching'],
    response: `You get: the full funnel system (opt-in page, email sequences, chatbot scripts), onboarding documentation, the private hub with all resources, and network support from other operators. We review your funnel setup in week 1. After that, you operate independently with system-level support when needed.`
  },
  'proof': {
    keywords: ['proof', 'evidence', 'results', 'show me', 'screenshot', 'income'],
    response: `Sarah K. (Brisbane, Launcher): first sale Day 19, $14,200 gross in month 3. Marcus V. (Sydney, Nuke): 8 HOT applications/week at peak. Rachel P. (Gold Coast, Launcher): $12,900 in one month. These are real network members. Results are above average — most operators earn less initially. The funnel data we track: median 21 days to first lead, 28 days to first sale, for operators posting content daily.`
  },
  'think': {
    keywords: ['think about it', 'need time', 'not sure', 'maybe', 'consider', 'decide later', 'sleep on'],
    response: `Completely fine. The application process takes 3 minutes and the spots in this cohort are limited. If you want to think — think specifically about: (1) Do you have the capital?, (2) Can you post content consistently?, (3) Are you okay with a 30-day ramp before first income? If yes to all three, you're a fit. Apply when you're ready. The system isn't going anywhere.`
  },
  'water': {
    keywords: ['water machine', 'kangen', 'sell water', 'water ioniser', 'machine', 'product'],
    response: `Your buyers are people who want to become Enagic distributors themselves — they're buying the machine as their entry into the business. You're not cold-selling water machines to random people. Your funnel attracts people who specifically want a high-ticket distribution business. The machine is the vehicle; the commission is the product for your market.`
  }
};

const FLOW = {
  opening: {
    message: "Hey 👋 — I saw you checking out the system. Got questions about the commissions, the model, or how to get started?",
    options: [
      { label: "Tell me about the commissions", action: 'commissions' },
      { label: "How does the AI funnel work?", action: 'funnel' },
      { label: "I have a specific question", action: 'qualify-q1' },
      { label: "I'm ready to apply", action: 'ready' }
    ]
  },
  commissions: {
    message: "The commission structure comes directly from Enagic's distributor plan:\n\n• Striker (D3): $2,400 per sale — entry at $8,500\n• Launcher (6A): $4,300 per sale — entry at $15,000 ✓ Most popular\n• Nuke (6A-2): $6,330 per sale — entry at $20,000\n\nBreak-even on every tier is ~4 sales. The investment buys you a Kangen machine and a distributor licence. What else do you want to know?",
    options: [
      { label: "What's the investment risk?", action: 'risk' },
      { label: "How do I get started?", action: 'ready' },
      { label: "Ask me something", action: 'qualify-q1' }
    ]
  },
  funnel: {
    message: "The funnel has 4 stages that run automatically:\n\n1. Opt-in capture (this page was built by that funnel)\n2. 7-day email education sequence\n3. Application form + AI scoring\n4. Offer page for HOT leads only\n\nYour job: drive traffic (TikTok/Instagram content). The system handles education, qualification, and follow-up. What questions do you have?",
    options: [
      { label: "What traffic do I need?", action: 'traffic' },
      { label: "I'm ready to apply", action: 'ready' },
      { label: "I have an objection", action: 'qualify-q1' }
    ]
  },
  traffic: {
    message: "Traffic comes from short-form content — 60-second TikTok and Instagram reels. The hook is transparency: you name the commissions, name Enagic, show the funnel. Honest hooks attract serious people.\n\nYou need 1–2 pieces of content daily to generate consistent leads. Most operators see their first HOT application within 2–3 weeks of consistent posting.",
    options: [
      { label: "I'm ready to apply", action: 'ready' },
      { label: "Walk me through getting started", action: 'qualify-q1' }
    ]
  },
  risk: {
    message: "The investment risk is real: $8,500–$20,000 goes in before you earn a dollar. Break-even is ~4 sales. If you make 4 sales in 90 days, you recover the investment. If you don't, you've lost money.\n\nThe mitigation: the AI funnel pre-qualifies leads heavily. By the time someone reaches the offer page, they've read the system explainer, completed an application, and been scored HOT. Your closing rate on pre-qualified leads is dramatically higher than cold outreach.",
    options: [
      { label: "I have capital and I'm ready", action: 'ready' },
      { label: "I need a few more weeks", action: 'warm' },
      { label: "The investment is too high for me", action: 'cold' }
    ]
  },
  'qualify-q1': {
    message: "What's your current situation?",
    options: [
      { label: "Employed full-time", action: 'qualify-q2', answer: 'employed' },
      { label: "In sales / own business", action: 'qualify-q2-hot', answer: 'sales' },
      { label: "Freelance / consulting", action: 'qualify-q2', answer: 'freelance' },
      { label: "Other", action: 'qualify-q2', answer: 'other' }
    ]
  },
  'qualify-q2': {
    message: "What income would actually change things for you?",
    freeText: true,
    nextAction: 'qualify-q3'
  },
  'qualify-q2-hot': {
    message: "Good — sales background helps. What income would actually change things for you?",
    freeText: true,
    nextAction: 'qualify-q3'
  },
  'qualify-q3': {
    message: "One thing worth knowing upfront — there's a real investment to join ($8,500–$20,000 depending on tier). Is that something you could consider if the opportunity made sense?",
    options: [
      { label: "Yes — I have the capital", action: 'ready-hot' },
      { label: "Possibly — need to evaluate first", action: 'warm' },
      { label: "That's more than I expected", action: 'cold' }
    ]
  },
  ready: {
    message: "Great. The application takes 3 minutes and we review within 24 hours. You'll be scored and routed to the right next step automatically.",
    link: { text: "Apply Now →", url: "/page3-apply.html" },
    score: 'HOT'
  },
  'ready-hot': {
    message: "Perfect — that's exactly the right mindset. Apply now and we'll review your answers within 24 hours. You'll be routed directly to the offer page if you qualify as HOT.",
    link: { text: "Apply Now — 3 Minutes →", url: "/page3-apply.html" },
    score: 'HOT'
  },
  warm: {
    message: "Fair enough — the blueprint has the full breakdown so you can evaluate properly first. In the meantime, the email sequence will cover everything: the Enagic model, exact commissions, realistic timelines, and break-even math.",
    link: { text: "Back to the Blueprint →", url: "/index.html" },
    score: 'WARM'
  },
  cold: {
    message: "Understood — if capital isn't accessible right now, this isn't the right timing. The AI Income Blueprint is free and gives you the full picture. When your situation changes, the system will still be here.",
    link: { text: "Get the Free Blueprint →", url: "/index.html" },
    score: 'COLD'
  }
};

let chatInitialized = false;

function initChatbot() {
  if (chatInitialized) return;
  chatInitialized = true;
  CHATBOT_STATE.stage = 'opening';
  const flow = FLOW['opening'];
  addBotMessage(flow.message);
  showOptions(flow.options);
}

function addBotMessage(text) {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;

  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.innerHTML = text.replace(/\n/g, '<br>');
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function addUserMessage(text) {
  const messages = document.getElementById('chat-messages');
  if (!messages) return;

  const div = document.createElement('div');
  div.className = 'chat-msg user';
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function showOptions(options) {
  const container = document.getElementById('chat-options');
  if (!container) return;

  container.innerHTML = '';
  if (!options) return;

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'chat-option';
    btn.textContent = opt.label;
    btn.onclick = () => selectOption(opt);
    container.appendChild(btn);
  });
}

function showLink(link) {
  const container = document.getElementById('chat-options');
  if (!container) return;

  container.innerHTML = '';
  if (!link) return;

  const a = document.createElement('a');
  a.href = link.url;
  a.className = 'btn btn-primary btn-full';
  a.style.marginBottom = '8px';
  a.textContent = link.text;
  container.appendChild(a);
}

function selectOption(opt) {
  addUserMessage(opt.label);
  if (opt.answer) CHATBOT_STATE.answers[CHATBOT_STATE.stage] = opt.answer;

  clearOptions();
  setTimeout(() => processAction(opt.action), 400);
}

function clearOptions() {
  const container = document.getElementById('chat-options');
  if (container) container.innerHTML = '';
}

function processAction(action) {
  // Check for objection keywords
  const flow = FLOW[action];
  if (!flow) return;

  CHATBOT_STATE.stage = action;
  if (flow.score) CHATBOT_STATE.score = flow.score;

  addBotMessage(flow.message);

  if (flow.link) {
    showLink(flow.link);
  } else if (flow.freeText) {
    // Enable text input for free-form answers
    document.getElementById('chat-input').placeholder = 'Type your answer...';
    document.getElementById('chat-input').dataset.nextAction = flow.nextAction;
  } else if (flow.options) {
    showOptions(flow.options);
  }
}

function handleChatInput(text) {
  // Check for objection keywords
  const lowerText = text.toLowerCase();
  for (const [key, objection] of Object.entries(OBJECTION_RESPONSES)) {
    if (objection.keywords.some(kw => lowerText.includes(kw))) {
      addUserMessage(text);
      clearOptions();
      setTimeout(() => {
        addBotMessage(objection.response);
        // Route to next step based on current state
        setTimeout(() => {
          addBotMessage("Does that help? Anything else you want to know, or are you ready to apply?");
          showOptions([
            { label: "I'm ready to apply", action: 'ready-hot' },
            { label: "I have another question", action: 'qualify-q1' },
            { label: "I need more time", action: 'warm' }
          ]);
        }, 600);
      }, 400);
      return;
    }
  }

  // Handle free-text flow stages
  const input = document.getElementById('chat-input');
  const nextAction = input ? input.dataset.nextAction : null;

  addUserMessage(text);
  clearOptions();

  if (nextAction) {
    input.dataset.nextAction = '';
    input.placeholder = 'Type a message...';
    setTimeout(() => processAction(nextAction), 400);
  } else {
    // Generic fallback
    setTimeout(() => {
      addBotMessage("Got it. The best next step is to submit your application — it takes 3 minutes and we'll route you to the right place.");
      showOptions([
        { label: "Apply Now", action: 'ready' },
        { label: "I have a question", action: 'qualify-q1' }
      ]);
    }, 400);
  }
}
