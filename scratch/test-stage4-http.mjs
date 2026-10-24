import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:3000';

console.log('=== Stage 4 Live HTTP Integration Test Suite ===\n');

async function testRoutes() {
  // 1. Test Dashboard Page
  console.log('1. Testing GET / (Dashboard)...');
  const resHome = await fetch(`${BASE_URL}/`);
  assert.equal(resHome.status, 200, 'Home page must return 200 OK');
  const homeHtml = await resHome.text();
  assert(homeHtml.includes('BrandLens AI'), 'Home must contain BrandLens AI');
  console.log('   ✓ Dashboard returned 200 OK.');

  // 2. Test Review Studio Page
  console.log('2. Testing GET /studio (Review Studio)...');
  const resStudio = await fetch(`${BASE_URL}/studio`);
  assert.equal(resStudio.status, 200, 'Studio page must return 200 OK');
  const studioHtml = await resStudio.text();
  assert(studioHtml.includes('Review Studio'), 'Studio must contain Review Studio');
  console.log('   ✓ Review Studio returned 200 OK.');

  // 3. Test Brand Knowledge Hub Page
  console.log('3. Testing GET /knowledge (Brand Knowledge)...');
  const resKnowledge = await fetch(`${BASE_URL}/knowledge`);
  assert.equal(resKnowledge.status, 200, 'Knowledge page must return 200 OK');
  console.log('   ✓ Brand Knowledge returned 200 OK.');

  // 4. Test Approvals & History Page
  console.log('4. Testing GET /history (Approvals & History)...');
  const resHistory = await fetch(`${BASE_URL}/history`);
  assert.equal(resHistory.status, 200, 'History page must return 200 OK');
  console.log('   ✓ Approvals & History returned 200 OK.');

  // 5. Test API Stats
  console.log('5. Testing GET /api/stats...');
  const resStats = await fetch(`${BASE_URL}/api/stats`);
  assert.equal(resStats.status, 200);
  const jsonStats = await resStats.json();
  assert.equal(jsonStats.success, true);
  assert(jsonStats.data.brands_count >= 2);
  assert(jsonStats.data.rules_count >= 15);
  console.log(`   ✓ Stats: ${jsonStats.data.brands_count} brands, ${jsonStats.data.rules_count} rules, ${jsonStats.data.drafts_count} drafts, ${jsonStats.data.revisions_count} revisions.`);

  // 6. Test API History
  console.log('6. Testing GET /api/history...');
  const resApiHistory = await fetch(`${BASE_URL}/api/history`);
  assert.equal(resApiHistory.status, 200);
  const jsonApiHistory = await resApiHistory.json();
  assert.equal(jsonApiHistory.success, true);
  assert(Array.isArray(jsonApiHistory.data));
  console.log(`   ✓ Stored revisions retrieved: ${jsonApiHistory.data.length} revisions.`);

  // 7. Test POST /api/review with Natural Language Instructions
  console.log('7. Testing POST /api/review with Natural Language Instructions...');
  const reviewPayload = {
    brand_id: 'apexpay',
    text: 'Welcome to apex pay! We guarantee 100% uptime with bulletproof security and over $50B in volume.',
    instructions: 'Focus on FTC disclosure rules and ensure we never claim 100% uptime without qualification.',
  };

  const resReview = await fetch(`${BASE_URL}/api/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reviewPayload),
  });

  assert.equal(resReview.status, 200);
  const jsonReview = await resReview.json();
  assert.equal(jsonReview.success, true);
  assert(jsonReview.data.overall_score < 100, 'Should penalize violations');
  assert.equal(jsonReview.data.overall_passed, false);
  assert(jsonReview.data.deterministic.findings.length > 0);
  assert(jsonReview.data.contextual.findings.length > 0);

  console.log(`   ✓ Review evaluated with score: ${jsonReview.data.overall_score}/100, passed: ${jsonReview.data.overall_passed}`);
  console.log(`   ✓ Deterministic findings: ${jsonReview.data.deterministic.findings.length}`);
  console.log(`   ✓ Contextual findings: ${jsonReview.data.contextual.findings.length}`);
  console.log(`   ✓ Provider: ${jsonReview.data.contextual.provider} (Fallback: ${jsonReview.data.contextual.is_fallback})`);

  console.log('\n=== All Stage 4 HTTP Integration Tests Passed 100%! ===');
}

testRoutes().catch((err) => {
  console.error('HTTP Test Failure:', err);
  process.exit(1);
});
