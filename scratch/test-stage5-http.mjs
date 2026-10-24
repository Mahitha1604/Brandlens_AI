import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:3000';

console.log('=== Stage 5 Live HTTP Server & RBAC Integration Test Suite ===\n');

async function testHttpEndpoints() {
  // 1. Create a draft via /api/drafts
  console.log('1. Creating a draft via POST /api/drafts...');
  const resDraft = await fetch(`${BASE_URL}/api/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brand_id: 'apexpay',
      title: 'HTTP Governance Test Draft',
      content: 'Draft content for testing server-enforced role permissions.',
      channel: 'landing_page',
      target_audience: 'Enterprises',
      created_by: 'Sarah Chen (Copywriter)',
    }),
  });

  assert.equal(resDraft.status, 200, 'Draft creation must return 200');
  const jsonDraft = await resDraft.json();
  const draftId = jsonDraft.data.id;
  assert(draftId);
  console.log(`   ✓ Draft created: ${draftId}`);

  // 2. Submit draft for review (Allowed for copywriter)
  console.log('2. Submitting draft for review via POST /api/governance/decide...');
  const resSubmit = await fetch(`${BASE_URL}/api/governance/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      draft_id: draftId,
      decision: 'submit_review',
      actor_name: 'Sarah Chen (Copywriter)',
      actor_role: 'copywriter',
    }),
  });

  assert.equal(resSubmit.status, 200, 'Submit for review must return 200');
  const jsonSubmit = await resSubmit.json();
  assert.equal(jsonSubmit.data.status, 'under_review');
  console.log('   ✓ Status transitioned to under_review.');

  // 3. SERVER-ENFORCED PERMISSION CHECK (Negative Test):
  // Copywriter attempts to approve draft -> MUST RETURN 403 FORBIDDEN!
  console.log('3. Server-side RBAC Test: Copywriter attempts to approve draft (expect 403 Forbidden)...');
  const resUnauthorizedApprove = await fetch(`${BASE_URL}/api/governance/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      draft_id: draftId,
      decision: 'approve',
      comment: 'Attempting unauthorized approval as copywriter',
      actor_name: 'Sarah Chen (Copywriter)',
      actor_role: 'copywriter',
    }),
  });

  assert.equal(
    resUnauthorizedApprove.status,
    403,
    'Server must reject copywriter approval with 403 Forbidden'
  );
  const jsonUnauthorized = await resUnauthorizedApprove.json();
  assert.equal(jsonUnauthorized.success, false);
  assert(
    jsonUnauthorized.error.includes('Access Denied'),
    'Error message must clearly state Access Denied'
  );
  console.log('   ✓ Server strictly enforced 403 Forbidden on copywriter approval attempt.');

  // 4. Positive Test: Brand Compliance Lead (Reviewer) approves draft -> MUST RETURN 200 OK!
  console.log('4. Server-side RBAC Test: Reviewer approves draft (expect 200 OK)...');
  const resAuthorizedApprove = await fetch(`${BASE_URL}/api/governance/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      draft_id: draftId,
      decision: 'approve',
      comment: 'Officially reviewed and approved for enterprise marketing.',
      actor_name: 'Marcus Vance (Brand Compliance Lead)',
      actor_role: 'reviewer',
    }),
  });

  assert.equal(resAuthorizedApprove.status, 200, 'Reviewer approval must return 200 OK');
  const jsonApproved = await resAuthorizedApprove.json();
  assert.equal(jsonApproved.success, true);
  assert.equal(jsonApproved.data.status, 'approved');
  console.log('   ✓ Reviewer successfully approved draft.');

  // 5. Test Audit Trail via GET /api/audit
  console.log('5. Testing GET /api/audit for draft audit trail...');
  const resAudit = await fetch(`${BASE_URL}/api/audit?draft_id=${draftId}`);
  assert.equal(resAudit.status, 200);
  const jsonAudit = await resAudit.json();
  assert(jsonAudit.data.length >= 2, 'Should have recorded DRAFT_CREATED, SUBMITTED_FOR_REVIEW, DRAFT_APPROVED');

  const actions = jsonAudit.data.map((l) => l.action);
  assert(actions.includes('DRAFT_APPROVED'));
  assert(actions.includes('SUBMITTED_FOR_REVIEW'));
  console.log(`   ✓ Audit trail contains ${jsonAudit.data.length} recorded events for this draft.`);

  // 6. Test Brand Creation via POST /api/brands
  console.log('6. Testing user brand creation via POST /api/brands...');
  const resBrand = await fetch(`${BASE_URL}/api/brands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'CyberShield AI',
      industry: 'Enterprise Cybersecurity',
      description: 'Zero-trust runtime container security platform.',
      tone_guidelines: 'Technical, authoritative, calm, and accurate.',
      disclaimers: 'Certified SOC 2 Type II compliant.',
    }),
  });

  assert.equal(resBrand.status, 200);
  const jsonBrand = await resBrand.json();
  assert.equal(jsonBrand.success, true);
  assert.equal(jsonBrand.data.name, 'CyberShield AI');
  console.log(`   ✓ Custom user brand created: ${jsonBrand.data.id}`);

  console.log('\n=== All Stage 5 Live HTTP Integration Tests Passed 100%! ===');
}

testHttpEndpoints().catch((err) => {
  console.error('Stage 5 HTTP Test Failure:', err);
  process.exit(1);
});
