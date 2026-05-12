const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders() };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { firstName, email } = JSON.parse(event.body);

    if (!firstName || !email) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ success: false, error: 'firstName and email are required' })
      };
    }

    // 1. Create/update contact in ActiveCampaign
    const contact = await createACContact({ firstName, email });

    if (contact && contact.id) {
      // 2. Add to list
      if (process.env.AC_LIST_ID) {
        await addToACList(contact.id, process.env.AC_LIST_ID);
      }

      // 3. Apply SS-NEW tag
      await applyACTag(contact.id, 'SS-NEW');

      // 4. Trigger welcome automation
      if (process.env.AC_AUTOMATION_ID) {
        await triggerACAutomation(contact.id, process.env.AC_AUTOMATION_ID);
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: true,
        redirect: '/apex-page2.html'
      })
    };

  } catch (err) {
    console.error('Subscribe error:', err);
    // Still return success to not block the funnel
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ success: true, redirect: '/apex-page2.html', warning: err.message })
    };
  }
};

async function createACContact({ firstName, email }) {
  const res = await fetch(`${process.env.AC_BASE_URL}/api/3/contacts`, {
    method: 'POST',
    headers: {
      'Api-Token': process.env.AC_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contact: { email, firstName }
    })
  });

  if (!res.ok) {
    // Try sync endpoint for existing contacts
    const syncRes = await fetch(`${process.env.AC_BASE_URL}/api/3/contact/sync`, {
      method: 'POST',
      headers: {
        'Api-Token': process.env.AC_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contact: { email, firstName }
      })
    });
    const syncData = await syncRes.json();
    return syncData.contact;
  }

  const data = await res.json();
  return data.contact;
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
  // Search for existing tag
  const tagRes = await fetch(
    `${process.env.AC_BASE_URL}/api/3/tags?search=${encodeURIComponent(tagName)}`,
    { headers: { 'Api-Token': process.env.AC_API_KEY } }
  );
  const tagData = await tagRes.json();
  let tagId = tagData.tags && tagData.tags[0] ? tagData.tags[0].id : null;

  // Create tag if it doesn't exist
  if (!tagId) {
    const createTagRes = await fetch(`${process.env.AC_BASE_URL}/api/3/tags`, {
      method: 'POST',
      headers: {
        'Api-Token': process.env.AC_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tag: { tag: tagName, tagType: 'contact' } })
    });
    const createTagData = await createTagRes.json();
    tagId = createTagData.tag ? createTagData.tag.id : null;
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

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}
