const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders() };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const {
      firstName, lastName, email, phone,
      situation, incomeGoal, investmentReady, whyJoin, tier, source
    } = body;

    if (!email) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ success: false, error: 'email is required' })
      };
    }

    // 1. Score the lead
    const score = scoreLead(body);

    // 2. Find or create contact in ActiveCampaign
    const contact = await syncACContact({ firstName, lastName, email, phone });

    if (contact && contact.id) {
      // 3. Add contact note with all application answers
      await addACNote(contact.id, formatNoteContent(body, score));

      // 4. Add to appropriate list
      const listId = source === 'distributors-page'
        ? (process.env.AC_DIST_LIST_ID || process.env.AC_LIST_ID)
        : process.env.AC_LIST_ID;

      if (listId) await addToACList(contact.id, listId);

      // 5. Apply appropriate tags
      await applyACTag(contact.id, 'SS-APPLIED');

      if (score === 'HOT') {
        await applyACTag(contact.id, 'SS-HOT');
        if (process.env.AC_HOT_AUTOMATION_ID) {
          await triggerACAutomation(contact.id, process.env.AC_HOT_AUTOMATION_ID);
        }
      } else if (score === 'WARM') {
        await applyACTag(contact.id, 'SS-WARM');
        if (process.env.AC_WARM_AUTOMATION_ID) {
          await triggerACAutomation(contact.id, process.env.AC_WARM_AUTOMATION_ID);
        }
      }

      // 6. Set custom field for score
      await updateACContactField(contact.id, 'lead_score', score);
    }

    // 7. Send owner notification
    await notifyOwner({ firstName, lastName, email, phone, score, investmentReady, incomeGoal });

    // 8. Determine redirect
    const redirect = getRedirectUrl(score);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: true,
        score,
        redirect
      })
    };

  } catch (err) {
    console.error('Apply error:', err);
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: true,
        score: 'WARM',
        redirect: '/page4-offer.html',
        warning: err.message
      })
    };
  }
};

function scoreLead(data) {
  const { investmentReady, incomeGoal, tier, situation } = data;

  // HOT criteria
  if (investmentReady === 'yes-ready') return 'HOT';
  if (tier === 'launcher' || tier === 'nuke') return 'HOT';
  if (incomeGoal === '10000-20000' || incomeGoal === '20000+') return 'HOT';

  // WARM criteria
  if (investmentReady === 'close-2-4-weeks') return 'WARM';
  if (situation === 'sales' || situation === 'business' || situation === 'high-ticket') return 'WARM';
  if (situation === 'own-business' || situation === 'other-dist') return 'WARM';

  // COLD criteria
  if (investmentReady === 'no-capital') return 'COLD';
  if (investmentReady === 'need-to-understand') return 'COLD';

  return 'WARM';
}

function getRedirectUrl(score) {
  if (score === 'HOT') return '/page4-offer.html';
  if (score === 'WARM') return '/page2-manifesto.html';
  return '/index.html';
}

function formatNoteContent(data, score) {
  return `
=== APEX NETWORK APPLICATION ===
Score: ${score}
Submitted: ${new Date().toISOString()}

Name: ${data.firstName || ''} ${data.lastName || ''}
Email: ${data.email}
Phone: ${data.phone || 'Not provided'}

Current Situation: ${data.situation || 'Not provided'}
Income Goal: ${data.incomeGoal || 'Not provided'}
Investment Readiness: ${data.investmentReady || 'Not provided'}
Target Tier: ${data.tier || 'Not specified'}
Source: ${data.source || 'consumer-funnel'}

Why They Want To Join:
${data.whyJoin || 'Not provided'}
`.trim();
}

async function syncACContact({ firstName, lastName, email, phone }) {
  const contactData = {
    email,
    firstName: firstName || '',
    lastName: lastName || '',
    phone: phone || ''
  };

  const res = await fetch(`${process.env.AC_BASE_URL}/api/3/contact/sync`, {
    method: 'POST',
    headers: {
      'Api-Token': process.env.AC_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ contact: contactData })
  });

  const data = await res.json();
  return data.contact;
}

async function addACNote(contactId, noteContent) {
  await fetch(`${process.env.AC_BASE_URL}/api/3/notes`, {
    method: 'POST',
    headers: {
      'Api-Token': process.env.AC_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      note: {
        note: noteContent,
        relid: contactId,
        reltype: 'Subscriber'
      }
    })
  });
}

async function addToACList(contactId, listId) {
  await fetch(`${process.env.AC_BASE_URL}/api/3/contactLists`, {
    method: 'POST',
    headers: {
      'Api-Token': process.env.AC_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contactList: { contact: contactId, list: listId, status: 1 }
    })
  });
}

async function applyACTag(contactId, tagName) {
  const tagRes = await fetch(
    `${process.env.AC_BASE_URL}/api/3/tags?search=${encodeURIComponent(tagName)}`,
    { headers: { 'Api-Token': process.env.AC_API_KEY } }
  );
  const tagData = await tagRes.json();
  let tagId = tagData.tags && tagData.tags[0] ? tagData.tags[0].id : null;

  if (!tagId) {
    const createRes = await fetch(`${process.env.AC_BASE_URL}/api/3/tags`, {
      method: 'POST',
      headers: {
        'Api-Token': process.env.AC_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tag: { tag: tagName, tagType: 'contact' } })
    });
    const createData = await createRes.json();
    tagId = createData.tag ? createData.tag.id : null;
  }

  if (!tagId) return;

  await fetch(`${process.env.AC_BASE_URL}/api/3/contactTags`, {
    method: 'POST',
    headers: {
      'Api-Token': process.env.AC_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contactTag: { contact: contactId, tag: tagId }
    })
  });
}

async function updateACContactField(contactId, fieldKey, fieldValue) {
  // This requires a custom field to be created in AC first
  // Skipping gracefully if not configured
  if (!process.env.AC_LEAD_SCORE_FIELD_ID) return;

  await fetch(`${process.env.AC_BASE_URL}/api/3/fieldValues`, {
    method: 'POST',
    headers: {
      'Api-Token': process.env.AC_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fieldValue: {
        contact: contactId,
        field: process.env.AC_LEAD_SCORE_FIELD_ID,
        value: fieldValue
      }
    })
  });
}

async function triggerACAutomation(contactId, automationId) {
  await fetch(`${process.env.AC_BASE_URL}/api/3/contactAutomations`, {
    method: 'POST',
    headers: {
      'Api-Token': process.env.AC_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contactAutomation: { contact: contactId, automation: automationId }
    })
  });
}

async function notifyOwner({ firstName, lastName, email, phone, score, investmentReady, incomeGoal }) {
  if (!process.env.AC_BASE_URL || !process.env.OWNER_EMAIL) return;

  // Send via ActiveCampaign transactional email or log
  console.log('NEW APPLICATION:', {
    name: `${firstName} ${lastName}`,
    email,
    phone,
    score,
    investmentReady,
    incomeGoal,
    timestamp: new Date().toISOString()
  });

  // If you have SendGrid or similar configured, add here
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}
