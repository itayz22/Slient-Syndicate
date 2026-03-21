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
=== SILENT SYNDICATE APPLICATION ===
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
  const ownerEmail = process.env.OWNER_EMAIL;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.NOTIFY_FROM_EMAIL || 'notifications@silentsyndicate.com';

  console.log('NEW APPLICATION:', {
    name: `${firstName} ${lastName}`,
    email,
    phone,
    score,
    investmentReady,
    incomeGoal,
    timestamp: new Date().toISOString()
  });

  if (!ownerEmail || !resendApiKey) return;
  if (score === 'COLD') return; // Don't notify for cold leads

  const isHot = score === 'HOT';
  const subject = isHot
    ? `🔥 HOT Lead: ${firstName} ${lastName} just applied`
    : `⚡ WARM Lead: ${firstName} ${lastName} just applied`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: ${isHot ? '#ef4444' : '#f59e0b'}; margin: 0 0 8px;">
        ${isHot ? '🔥 HOT Lead' : '⚡ WARM Lead'}
      </h2>
      <p style="color: #6b7280; margin: 0 0 24px; font-size: 14px;">
        New application submitted — ${new Date().toUTCString()}
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr style="background: #f9fafb;">
          <td style="padding: 10px 14px; font-weight: 600; width: 40%; border-bottom: 1px solid #e5e7eb;">Name</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;">${firstName} ${lastName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Email</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${email}">${email}</a></td>
        </tr>
        <tr style="background: #f9fafb;">
          <td style="padding: 10px 14px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Phone</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;">${phone || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Score</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;">
            <strong style="color: ${isHot ? '#ef4444' : '#f59e0b'};">${score}</strong>
          </td>
        </tr>
        <tr style="background: #f9fafb;">
          <td style="padding: 10px 14px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Investment Ready</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;">${investmentReady || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-weight: 600;">Income Goal</td>
          <td style="padding: 10px 14px;">${incomeGoal || 'Not provided'}</td>
        </tr>
      </table>

      ${isHot ? `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #991b1b; font-weight: 600;">
          🔥 This is a HOT lead — they're ready to invest now. Follow up within the hour.
        </p>
      </div>` : `
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #92400e; font-weight: 600;">
          ⚡ WARM lead — nurture sequence triggered. They may need 2–4 weeks.
        </p>
      </div>`}

      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Silent Syndicate — Automated notification
      </p>
    </div>
  `;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: ownerEmail,
        subject,
        html
      })
    });
  } catch (err) {
    console.error('Owner notification failed:', err.message);
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}
