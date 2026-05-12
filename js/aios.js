/* ============================================================
   APEX NETWORK — AIOS DASHBOARD DATA & STATE
   All data marked as DEMO — replace with live API calls
   ============================================================ */

const DEMO_DATA = {
  operator: {
    name: 'Rachel P.',
    location: 'Gold Coast',
    tier: 'LAUNCHER',
    rank: '6A',
    since: 'Oct 2024'
  },
  pipeline: {
    capture: 34,
    educate: 187,
    qualify: 11,
    convert: 6,
    leads: [
      { name: 'Tom H.', email: 'tom.h@email.com', stage: 'qualify', score: 'HOT', time: '2h ago' },
      { name: 'Angela M.', email: 'angela.m@email.com', stage: 'qualify', score: 'HOT', time: '4h ago' },
      { name: 'Derek F.', email: 'derek.f@email.com', stage: 'educate', score: 'WARM', time: '6h ago' },
      { name: 'Lisa B.', email: 'lisa.b@email.com', stage: 'capture', score: 'NEW', time: '1d ago' },
      { name: 'Sam K.', email: 'sam.k@email.com', stage: 'convert', score: 'HOT', time: '2d ago' },
      { name: 'Jen T.', email: 'jen.t@email.com', stage: 'educate', score: 'WARM', time: '3d ago' }
    ]
  },
  commissions: {
    thisWeek: 12900,
    thisMonth: 38700,
    pending: 8600,
    overrides: 2140,
    history: [
      { month: 'Aug', amount: 8600 },
      { month: 'Sep', amount: 17200 },
      { month: 'Oct', amount: 12900 },
      { month: 'Nov', amount: 38700 },
      { month: 'Dec', amount: 25800 },
      { month: 'Jan', amount: 34400 }
    ],
    transactions: [
      { date: 'Dec 15', name: 'Cameron J.', tier: 'Launcher', amount: 4300, status: 'paid' },
      { date: 'Dec 12', name: 'Priya N.', tier: 'Nuke', amount: 6330, status: 'paid' },
      { date: 'Dec 8', name: 'Aaron W.', tier: 'Launcher', amount: 4300, status: 'paid' },
      { date: 'Dec 3', name: 'Bella S.', tier: 'Striker', amount: 2400, status: 'paid' },
      { date: 'Nov 28', name: 'Ross L.', tier: 'Launcher', amount: 4300, status: 'pending' },
      { date: 'Nov 24', name: 'Mia F.', tier: 'Nuke', amount: 6330, status: 'pending' }
    ]
  },
  operators: [
    { name: 'Sarah K.', location: 'Brisbane', tier: 'STRIKER', monthly: 4800, hotLeads: 8, status: 'active' },
    { name: 'Marcus V.', location: 'Sydney', tier: 'LAUNCHER', monthly: 8600, hotLeads: 3, status: 'active' },
    { name: 'Ben N.', location: 'Melbourne', tier: 'NUKE', monthly: 6330, hotLeads: 2, status: 'active' },
    { name: 'Rachel P.', location: 'Gold Coast', tier: 'LAUNCHER', monthly: 12900, hotLeads: 12, status: 'active' },
    { name: 'Lisa T.', location: 'Perth', tier: 'STRIKER', monthly: 0, hotLeads: 0, status: 'onboarding' }
  ],
  emailSequences: {
    active: 187,
    sequences: [
      { lead: 'Tom H.', day: 4, subject: 'The machine nobody tells you about', opened: true, clicked: true },
      { lead: 'Angela M.', day: 6, subject: 'Why quiet operators win', opened: true, clicked: false },
      { lead: 'Derek F.', day: 2, subject: 'The machine that runs without you', opened: true, clicked: true },
      { lead: 'Lisa B.', day: 1, subject: 'Your AI Income Blueprint is here', opened: false, clicked: false },
      { lead: 'Sam K.', day: 7, subject: 'This is your invitation', opened: true, clicked: true }
    ]
  },
  chatbot: {
    conversations: 23,
    hot: 4,
    warm: 11,
    cold: 8,
    recent: [
      { user: 'Tom H.', score: 'HOT', lastMsg: 'I have capital ready', time: '2h ago' },
      { user: 'Angela M.', score: 'HOT', lastMsg: 'How do I register with Enagic?', time: '3h ago' },
      { user: 'Derek F.', score: 'WARM', lastMsg: 'Need 2-3 weeks to decide', time: '5h ago' },
      { user: 'Prue L.', score: 'COLD', lastMsg: 'Investment is too high right now', time: '8h ago' }
    ]
  },
  content: {
    topPiece: 'Why quiet operators win — TikTok Reel',
    topOptins: 312,
    bestSource: 'TikTok',
    totalOptins: 847,
    pieces: [
      { title: 'Why quiet operators win', platform: 'TikTok', views: 48200, optins: 312, cta: '0.65%' },
      { title: 'The $4,300 per sale reality check', platform: 'Instagram', views: 21000, optins: 187, cta: '0.89%' },
      { title: 'Enagic commissions — the honest breakdown', platform: 'TikTok', views: 15800, optins: 142, cta: '0.90%' },
      { title: 'Month 3 income reveal', platform: 'TikTok', views: 31000, optins: 206, cta: '0.66%' }
    ],
    sources: [
      { source: 'TikTok', optins: 634, pct: 74.9 },
      { source: 'Instagram', optins: 143, pct: 16.9 },
      { source: 'Direct', optins: 42, pct: 5.0 },
      { source: 'Other', optins: 28, pct: 3.3 }
    ]
  },
  briefing: {
    date: 'Thursday, December 19',
    summary: "Strong week. 2 new HOT leads in the qualify stage — follow up recommended today. Commission pipeline shows $8,600 pending clearance. Content performance: your 'quiet operators' reel is still driving 15+ opt-ins daily. Network activity: Sarah K. (Brisbane) closed her first Launcher sale yesterday.",
    actions: [
      { label: 'Review HOT leads', icon: '🔥', action: 'pipeline' },
      { label: 'Check pending commissions', icon: '💰', action: 'commissions' },
      { label: 'View top content', icon: '📡', action: 'content' }
    ],
    metrics: [
      { label: 'New opt-ins (24h)', value: '18', trend: '+12%' },
      { label: 'Applications (7d)', value: '11', trend: '+3' },
      { label: 'HOT leads active', value: '4', trend: '▲' },
      { label: 'Pending commissions', value: '$8,600', trend: 'clearing' }
    ]
  }
};
