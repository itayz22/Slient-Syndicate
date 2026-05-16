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
      firstName, lastName, email, mobile,
      productName, product, investment, commission,
      sponsorId, startingRank, payment, extraDocs,
      address, suburb, statePostcode, dob, idNumber,
      bankName, accountName, bsb, accountNumber,
      delivery, altAddress, notes, submittedAt
    } = body;

    // 1 — Add to ActiveCampaign as SS-CONVERTED
    const contact = await syncACContact({ firstName, lastName, email, phone: mobile });
    if (contact && contact.id) {
      await applyACTag(contact.id, 'SS-CONVERTED');
      await applyACTag(contact.id, 'SS-DISTRIBUTOR');
      await addACNote(contact.id, buildACNote(body));
      if (process.env.AC_LIST_ID) await addToACList(contact.id, process.env.AC_LIST_ID);
    }

    // 2 — Email the owner (you) with full details
    await notifyOwner(body);

    // 3 — Email the client confirmation
    await confirmClient(body);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error('Register error:', err);
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ success: true, warning: err.message })
    };
  }
};

// ── ActiveCampaign helpers ──────────────────────────────────────
async function syncACContact({ firstName, lastName, email, phone }) {
  const res = await fetch(`${process.env.AC_BASE_URL}/api/3/contact/sync`, {
    method: 'POST',
    headers: { 'Api-Token': process.env.AC_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contact: { email, firstName, lastName, phone } })
  });
  const data = await res.json();
  return data.contact;
}

async function addToACList(contactId, listId) {
  await fetch(`${process.env.AC_BASE_URL}/api/3/contactLists`, {
    method: 'POST',
    headers: { 'Api-Token': process.env.AC_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactList: { contact: contactId, list: listId, status: 1 } })
  });
}

async function applyACTag(contactId, tagName) {
  const tagRes = await fetch(`${process.env.AC_BASE_URL}/api/3/tags?search=${encodeURIComponent(tagName)}`,
    { headers: { 'Api-Token': process.env.AC_API_KEY } });
  const tagData = await tagRes.json();
  let tagId = tagData.tags && tagData.tags[0] ? tagData.tags[0].id : null;

  if (!tagId) {
    const createRes = await fetch(`${process.env.AC_BASE_URL}/api/3/tags`, {
      method: 'POST',
      headers: { 'Api-Token': process.env.AC_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: { tag: tagName, tagType: 'contact' } })
    });
    const createData = await createRes.json();
    tagId = createData.tag ? createData.tag.id : null;
  }

  if (!tagId) return;
  await fetch(`${process.env.AC_BASE_URL}/api/3/contactTags`, {
    method: 'POST',
    headers: { 'Api-Token': process.env.AC_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactTag: { contact: contactId, tag: tagId } })
  });
}

async function addACNote(contactId, note) {
  await fetch(`${process.env.AC_BASE_URL}/api/3/notes`, {
    method: 'POST',
    headers: { 'Api-Token': process.env.AC_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: { note, relid: contactId, reltype: 'subscriber' } })
  });
}

function buildACNote(b) {
  return `REGISTRATION SUBMITTED — ${new Date(b.submittedAt).toLocaleString('en-AU')}

PACKAGE: ${b.productName}
INVESTMENT: ${b.investment} AUD
STARTING RANK: ${b.startingRank}
COMMISSION/SALE: ${b.commission}
SPONSOR ID: ${b.sponsorId}
PAYMENT METHOD: ${b.payment}

PERSONAL DETAILS:
Name: ${b.firstName} ${b.lastName}
DOB: ${b.dob}
ID: ${b.idNumber}
Address: ${b.address}, ${b.suburb} ${b.statePostcode}
Mobile: ${b.mobile}
Email: ${b.email}

BANK DETAILS:
Bank: ${b.bankName}
Account Name: ${b.accountName}
BSB: ${b.bsb}
Account: ${b.accountNumber}

DELIVERY: ${b.delivery}
${b.altAddress ? 'Alt Address: ' + b.altAddress : ''}
${b.notes ? 'Notes: ' + b.notes : ''}

EXTRA DOCS REQUIRED: ${(b.extraDocs || []).join(', ') || 'None'}`;
}

// ── Email helpers via ActiveCampaign or direct ──────────────────
async function notifyOwner(b) {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) return;

  const subject = `🔥 NEW REGISTRATION — ${b.firstName} ${b.lastName} — ${b.productName}`;
  const body = `
NEW APEX NETWORK REGISTRATION
Submitted: ${new Date(b.submittedAt).toLocaleString('en-AU')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PACKAGE & COMMISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Package:        ${b.productName}
Investment:     ${b.investment} AUD
Starting Rank:  ${b.startingRank}
Your Commission: ${b.commission} per future sale
SPONSOR ID:     ${b.sponsorId}  ← goes on Enagic form
Payment Method: ${b.payment.toUpperCase()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:     ${b.firstName} ${b.lastName}
DOB:      ${b.dob}
ID No:    ${b.idNumber}
Mobile:   ${b.mobile}
Email:    ${b.email}
Address:  ${b.address}, ${b.suburb} ${b.statePostcode}
Delivery: ${b.delivery}${b.altAddress ? '\nAlt Address: ' + b.altAddress : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BANK DETAILS (for Enagic form)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Bank:     ${b.bankName}
Acc Name: ${b.accountName}
BSB:      ${b.bsb}
Acc No:   ${b.accountNumber}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXTRA DOCUMENTS REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(b.extraDocs || []).length > 0 ? b.extraDocs.join('\n') : 'None — standard package'}

${b.notes ? '━━━━━━━━━━━━━━━━━━━━\nNOTES FROM CLIENT\n━━━━━━━━━━━━━━━━━━━━\n' + b.notes : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT STEPS FOR YOU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Verify Sponsor ID ${b.sponsorId} is correct for ${b.productName}
2. Download correct Enagic AU order form from kanjuni.com/order-forms
3. Pre-fill form with client details + your Sponsor ID
4. Contact client to arrange payment with Enagic AU
5. Email complete package to info@enagic-australia.com

Enagic AU: info@enagic-australia.com | +61-2-9878-1200
`;

  await sendEmail(ownerEmail, subject, body);
}

async function confirmClient(b) {
  if (!b.email) return;

  const subject = `Your Apex Network Registration — ${b.productName}`;
  const body = `
Hi ${b.firstName},

Your registration has been received. Here's a summary of what you submitted.

PACKAGE: ${b.productName}
Investment: ${b.investment} AUD
Starting Rank: ${b.startingRank}
Sponsor ID (for your Enagic form): ${b.sponsorId}
Payment Method: ${b.payment.toUpperCase()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT HAPPENS NEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. We review your details and verify the Sponsor ID (within a few hours).

2. We'll email you to confirm everything looks correct and walk you through the next step — which is arranging payment directly with Enagic Australia.

3. Once Enagic processes your order (7–10 business days), your machine ships and your Distributor ID is issued.

4. Your Apex Network AIOS dashboard and funnel access activates on the same day.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXTRA DOCUMENTS (if applicable)
━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(b.extraDocs || []).length > 0 ? 'Your payment method requires these additional documents:\n' + b.extraDocs.join('\n') : 'No additional documents required for your payment method.'}

Questions? Reply to this email or contact us at ${process.env.OWNER_EMAIL || 'hello@apexnetwork.com.au'}

— Apex Network Chairman
`;

  await sendEmail(b.email, subject, body);
}

async function sendEmail(to, subject, text) {
  // Uses ActiveCampaign transactional email if available
  // Falls back gracefully if not configured
  try {
    if (!process.env.AC_API_KEY || !process.env.AC_BASE_URL) return;

    await fetch(`${process.env.AC_BASE_URL}/api/3/emails`, {
      method: 'POST',
      headers: { 'Api-Token': process.env.AC_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: { subject, fromEmail: process.env.OWNER_EMAIL || 'hello@apexnetwork.com.au', fromName: 'Apex Network', to, body: text.replace(/\n/g,'<br>'), bodyText: text }
      })
    });
  } catch(e) {
    console.log('Email send note:', e.message);
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
