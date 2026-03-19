exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders() };
  }

  try {
    const data = JSON.parse(event.body);
    const score = scoreLead(data);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ score, redirect: getRedirectUrl(score) })
    };
  } catch (err) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message })
    };
  }
};

function scoreLead(data) {
  const { investmentReady, incomeGoal, tier, situation } = data;

  // HOT criteria (any one = HOT)
  if (investmentReady === 'yes-ready') return 'HOT';
  if (tier === 'launcher' || tier === 'nuke') return 'HOT';
  if (incomeGoal === '10000-20000' || incomeGoal === '20000+') return 'HOT';

  // WARM criteria
  if (investmentReady === 'close-2-4-weeks') return 'WARM';
  if (situation === 'sales' || situation === 'business') return 'WARM';

  // COLD criteria
  return 'COLD';
}

function getRedirectUrl(score) {
  if (score === 'HOT') return '/page4-offer.html';
  if (score === 'WARM') return '/page2-manifesto.html';
  return '/index.html';
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}
