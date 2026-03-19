const crypto = require('crypto');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Verify webhook signature if secret is configured
  if (process.env.WEBHOOK_SECRET) {
    const signature = event.headers['x-webhook-signature'] || event.headers['x-ac-signature'];
    if (signature) {
      const expected = crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET)
        .update(event.body)
        .digest('hex');

      if (signature !== expected) {
        return { statusCode: 401, body: 'Invalid signature' };
      }
    }
  }

  try {
    const payload = JSON.parse(event.body);
    const eventType = payload.type || payload.event || 'unknown';

    console.log('Webhook received:', eventType, JSON.stringify(payload, null, 2));

    switch (eventType) {
      case 'contact_tag_added':
        await handleTagAdded(payload);
        break;

      case 'automation_complete':
        await handleAutomationComplete(payload);
        break;

      case 'contact_added':
        await handleContactAdded(payload);
        break;

      // Zapier events
      case 'ss_hot_lead':
        await handleHotLead(payload);
        break;

      default:
        console.log('Unhandled webhook event:', eventType);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, event: eventType })
    };

  } catch (err) {
    console.error('Webhook error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

async function handleTagAdded(payload) {
  const tag = payload.tag || payload.data?.tag;
  const contactEmail = payload.contact?.email || payload.data?.contact?.email;

  if (!tag || !contactEmail) return;

  if (tag === 'SS-HOT') {
    console.log(`HOT lead: ${contactEmail} — sending offer page email`);
    // Trigger offer email via ActiveCampaign automation
    // This is handled by the AC automation itself when SS-HOT tag is applied
  }

  if (tag === 'SS-APPLIED') {
    console.log(`New application: ${contactEmail} — notifying owner`);
  }
}

async function handleAutomationComplete(payload) {
  const automationName = payload.automation?.name || 'Unknown';
  const contact = payload.contact?.email || 'Unknown';
  console.log(`Automation completed: ${automationName} for ${contact}`);
}

async function handleContactAdded(payload) {
  const email = payload.contact?.email;
  console.log(`New contact added: ${email}`);
}

async function handleHotLead(payload) {
  console.log('Zapier HOT lead event:', payload);
}
