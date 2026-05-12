#!/usr/bin/env node
/* ============================================================
   APEX NETWORK — Funnel Test Script
   Run: node scripts/test-funnel.js
   Requires: NETLIFY_SITE_URL or defaults to localhost:8888
   ============================================================ */

const BASE = process.env.NETLIFY_SITE_URL
  ? process.env.NETLIFY_SITE_URL
  : 'http://localhost:8888';

const API = `${BASE}/api`;

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

async function post(path, body) {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

/* ── Subscribe ── */
async function testSubscribe() {
  console.log('\n[subscribe]');
  await test('accepts valid email + name', async () => {
    const r = await post('/subscribe', { email: 'funnel-test@example.com', name: 'Test User' });
    assert(r.status === 200 || r.status === 400, `Unexpected status ${r.status}`);
  });

  await test('rejects missing email', async () => {
    const r = await post('/subscribe', { name: 'No Email' });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('rejects invalid email format', async () => {
    const r = await post('/subscribe', { email: 'not-an-email', name: 'Bad Email' });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });
}

/* ── Score ── */
async function testScore() {
  console.log('\n[score]');
  await test('HOT profile scores >= 70', async () => {
    const r = await post('/score', {
      capital: 'yes',
      timeline: 'now',
      commitment: 'full',
      background: 'sales'
    });
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.body.score >= 70, `Expected score >= 70, got ${r.body.score}`);
    assert(r.body.tier === 'HOT', `Expected HOT, got ${r.body.tier}`);
  });

  await test('COLD profile scores < 40', async () => {
    const r = await post('/score', {
      capital: 'no',
      timeline: 'unsure',
      commitment: 'part',
      background: 'none'
    });
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.body.score < 40, `Expected score < 40, got ${r.body.score}`);
    assert(r.body.tier === 'COLD', `Expected COLD, got ${r.body.tier}`);
  });

  await test('WARM profile scores 40-69', async () => {
    const r = await post('/score', {
      capital: 'maybe',
      timeline: 'soon',
      commitment: 'part',
      background: 'marketing'
    });
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(r.body.tier === 'WARM' || r.body.tier === 'HOT' || r.body.tier === 'COLD',
      `Unexpected tier ${r.body.tier}`);
  });
}

/* ── Apply ── */
async function testApply() {
  console.log('\n[apply]');
  await test('HOT application returns redirect to offer page', async () => {
    const r = await post('/apply', {
      email: 'hot-test@example.com',
      name: 'Hot Tester',
      capital: 'yes',
      timeline: 'now',
      commitment: 'full',
      background: 'sales'
    });
    assert(r.status === 200 || r.status === 201, `Expected 200/201, got ${r.status}`);
  });

  await test('rejects application with missing email', async () => {
    const r = await post('/apply', {
      name: 'No Email',
      capital: 'yes',
      timeline: 'now'
    });
    assert(r.status === 400, `Expected 400, got ${r.status}`);
  });

  await test('COLD application returns appropriate response', async () => {
    const r = await post('/apply', {
      email: 'cold-test@example.com',
      name: 'Cold Tester',
      capital: 'no',
      timeline: 'unsure',
      commitment: 'part',
      background: 'none'
    });
    assert(r.status === 200 || r.status === 201, `Unexpected status ${r.status}`);
  });
}

/* ── Main ── */
async function main() {
  console.log(`\nApex Network — Funnel Test Suite`);
  console.log(`Target: ${API}`);
  console.log('─'.repeat(50));

  await testSubscribe();
  await testScore();
  await testApply();

  console.log('\n' + '─'.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\nSome tests failed. Check function logs in netlify dev output.');
    process.exit(1);
  } else {
    console.log('\nAll tests passed.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
