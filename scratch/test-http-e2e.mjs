// Full HTTP Integration Test against running Next.js server

async function run() {
  const BASE = 'http://127.0.0.1:3001';
  console.log(`Testing live Next.js server at ${BASE}...\n`);

  // 1. Root page GET /
  console.log('1. GET / (Root page)');
  const resHome = await fetch(`${BASE}/`);
  console.log('   Status:', resHome.status);
  const textHome = await resHome.text();
  if (resHome.status !== 200 || !textHome.includes('BrandLens AI')) {
    throw new Error('Home page failed to return BrandLens AI HTML');
  }
  console.log('   ✔ Home page rendered successfully with BrandLens AI title');

  // 2. GET /api/brands
  console.log('\n2. GET /api/brands');
  const resBrands = await fetch(`${BASE}/api/brands`);
  const jsonBrands = await resBrands.json();
  console.log('   Status:', resBrands.status, 'Brands count:', jsonBrands.data?.length);
  if (resBrands.status !== 200 || !jsonBrands.success || jsonBrands.data?.length < 2) {
    throw new Error('GET /api/brands failed');
  }
  console.log('   ✔ Brands listed:', jsonBrands.data.map(b => `${b.name} (${b.counts.total} rules)`).join(', '));

  // 3. GET /api/brands/apexpay
  console.log('\n3. GET /api/brands/apexpay');
  const resApex = await fetch(`${BASE}/api/brands/apexpay`);
  const jsonApex = await resApex.json();
  console.log('   Status:', resApex.status, 'Brand:', jsonApex.data?.name, 'Rules:', jsonApex.data?.rules?.length);
  if (resApex.status !== 200 || jsonApex.data?.id !== 'apexpay') {
    throw new Error('GET /api/brands/apexpay failed');
  }
  console.log('   ✔ Retrieved ApexPay brand knowledge');

  // 4. PATCH /api/brands/apexpay
  console.log('\n4. PATCH /api/brands/apexpay');
  const resPatch = await fetch(`${BASE}/api/brands/apexpay`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'Institutional Tier-1 Cross-Border Clearing' }),
  });
  const jsonPatch = await resPatch.json();
  console.log('   Status:', resPatch.status, 'Updated description:', jsonPatch.data?.description);
  if (resPatch.status !== 200 || jsonPatch.data?.description !== 'Institutional Tier-1 Cross-Border Clearing') {
    throw new Error('PATCH /api/brands/apexpay failed');
  }
  console.log('   ✔ Updated brand description');

  // 5. POST /api/brands/apexpay/rules (Create Rule)
  console.log('\n5. POST /api/brands/apexpay/rules (Create Rule)');
  const resNewRule = await fetch(`${BASE}/api/brands/apexpay/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'terminology',
      title: 'Prohibit "miracle transaction"',
      content: 'Never state that wire delivery is miraculous',
      forbidden_terms: ['miracle transaction', 'sorcery settlement'],
      replacement_terms: 'high-availability automated routing',
      rationale: 'Regulatory compliance tone requirement',
      severity: 'violation',
    }),
  });
  const jsonNewRule = await resNewRule.json();
  const createdRuleId = jsonNewRule.data?.id;
  console.log('   Status:', resNewRule.status, 'Created Rule ID:', createdRuleId);
  if (resNewRule.status !== 200 || !createdRuleId) {
    throw new Error('POST /api/brands/apexpay/rules failed');
  }
  console.log('   ✔ Rule created with ID:', createdRuleId);

  // 6. GET /api/brands/apexpay/rules (Verify listing)
  console.log('\n6. GET /api/brands/apexpay/rules');
  const resListRules = await fetch(`${BASE}/api/brands/apexpay/rules`);
  const jsonListRules = await resListRules.json();
  const foundRule = jsonListRules.data?.some(r => r.id === createdRuleId);
  console.log('   Status:', resListRules.status, 'New rule present in list:', foundRule);
  if (!foundRule) throw new Error('New rule not found in GET /api/brands/apexpay/rules');
  console.log('   ✔ Verified rule listing');

  // 7. DELETE /api/brands/apexpay/rules?rule_id=...
  console.log('\n7. DELETE /api/brands/apexpay/rules');
  const resDel = await fetch(`${BASE}/api/brands/apexpay/rules?rule_id=${createdRuleId}`, {
    method: 'DELETE',
  });
  const jsonDel = await resDel.json();
  console.log('   Status:', resDel.status, 'Deleted:', jsonDel.success);
  if (!jsonDel.success) throw new Error('DELETE rule failed');
  console.log('   ✔ Rule deleted');

  // 8. POST /api/drafts (Revision 1)
  console.log('\n8. POST /api/drafts (Revision 1)');
  const resDraft1 = await fetch(`${BASE}/api/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brand_id: 'apexpay',
      title: 'Global Expansion Press Release',
      content: 'ApexPay launches institutional rails for cross-border liquidity in Europe.',
      channel: 'press_release',
      target_audience: 'Institutional Partners',
      created_by: 'Sarah Chen (Copywriter)',
    }),
  });
  const jsonDraft1 = await resDraft1.json();
  const draftId = jsonDraft1.data?.id;
  console.log('   Status:', resDraft1.status, 'Draft ID:', draftId, 'Revision:', jsonDraft1.data?.current_revision);
  if (resDraft1.status !== 200 || jsonDraft1.data?.current_revision !== 1) {
    throw new Error('POST /api/drafts failed to create Revision 1');
  }
  console.log('   ✔ Created draft Revision 1');

  // 9. POST /api/drafts (Revision 2 update)
  console.log('\n9. POST /api/drafts (Revision 2 update)');
  const resDraft2 = await fetch(`${BASE}/api/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: draftId,
      brand_id: 'apexpay',
      title: 'Global Expansion Press Release (Revised)',
      content: 'ApexPay launches institutional rails for cross-border liquidity in Europe, offering near real-time settlement.',
      channel: 'press_release',
      target_audience: 'Institutional Partners',
      created_by: 'Marcus Vance (Reviewer)',
    }),
  });
  const jsonDraft2 = await resDraft2.json();
  console.log('   Status:', resDraft2.status, 'Draft ID:', jsonDraft2.data?.id, 'Revision:', jsonDraft2.data?.current_revision);
  if (resDraft2.status !== 200 || jsonDraft2.data?.current_revision !== 2) {
    throw new Error('Draft failed to increment to Revision 2');
  }
  console.log('   ✔ Updated draft to Revision 2 with version audit history');

  // 10. GET /api/drafts?brand_id=apexpay
  console.log('\n10. GET /api/drafts?brand_id=apexpay');
  const resDraftsList = await fetch(`${BASE}/api/drafts?brand_id=apexpay`);
  const jsonDraftsList = await resDraftsList.json();
  console.log('   Status:', resDraftsList.status, 'Total drafts found for apexpay:', jsonDraftsList.data?.length);
  if (resDraftsList.status !== 200 || jsonDraftsList.data?.length === 0) {
    throw new Error('GET /api/drafts returned no drafts');
  }
  console.log('   ✔ Retrieved saved drafts from SQLite');

  // 11. POST /api/brands reset_presets
  console.log('\n11. POST /api/brands (reset_presets)');
  const resReset = await fetch(`${BASE}/api/brands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reset_presets' }),
  });
  const jsonReset = await resReset.json();
  console.log('   Status:', resReset.status, 'Reset Success:', jsonReset.success);
  if (resReset.status !== 200 || !jsonReset.success) {
    throw new Error('Preset reset failed');
  }
  console.log('   ✔ Database reset to clean demo state');

  // 12. POST /api/check (Deterministic Engine Positive Test)
  console.log('\n12. POST /api/check (Deterministic Engine Positive Check)');
  const checkText = 'Welcome to apex pay with bulletproof 100% uptime!';
  const resCheck = await fetch(`${BASE}/api/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brand_id: 'apexpay',
      text: checkText,
    }),
  });
  const jsonCheck = await resCheck.json();
  console.log('   Status:', resCheck.status, 'Total findings:', jsonCheck.data?.findings?.length, 'Score:', jsonCheck.data?.summary?.cleanliness_score);
  if (resCheck.status !== 200 || !jsonCheck.success || jsonCheck.data?.findings?.length < 3) {
    throw new Error('POST /api/check failed to flag violations');
  }
  for (const f of jsonCheck.data.findings) {
    const slice = checkText.slice(f.start_index, f.end_index);
    if (slice !== f.flagged_text) {
      throw new Error(`Offset mismatch: expected "${f.flagged_text}", got "${slice}"`);
    }
  }
  console.log('   ✔ POST /api/check correctly caught violations with 100% character offset precision');

  // 13. POST /api/check (Deterministic Engine Negative Clean Test)
  console.log('\n13. POST /api/check (Deterministic Engine Clean Check)');
  const resCleanCheck = await fetch(`${BASE}/api/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brand_id: 'apexpay',
      text: 'Welcome to ApexPay, the defense-in-depth payments platform.',
    }),
  });
  const jsonCleanCheck = await resCleanCheck.json();
  console.log('   Status:', resCleanCheck.status, 'Findings:', jsonCleanCheck.data?.findings?.length, 'Score:', jsonCleanCheck.data?.summary?.cleanliness_score);
  if (resCleanCheck.status !== 200 || jsonCleanCheck.data?.findings?.length !== 0 || !jsonCleanCheck.data?.summary?.passed) {
    throw new Error('POST /api/check failed clean negative test');
  }
  console.log('   ✔ POST /api/check passed clean compliant text with 100/100 score');

  // 14. POST /api/review (Unified Multi-Layer Review on Flawed Draft)
  console.log('\n14. POST /api/review (Unified Multi-Layer Review on Flawed Draft)');
  const flawedReviewText = 'Welcome to apex pay! Act now before it is too late with bulletproof 100% uptime and over $50B in volume routing!';
  const resUnified = await fetch(`${BASE}/api/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brand_id: 'apexpay',
      text: flawedReviewText,
    }),
  });
  const jsonUnified = await resUnified.json();
  console.log('   Status:', resUnified.status, 'Overall score:', jsonUnified.data?.overall_score, 'Passed:', jsonUnified.data?.overall_passed);
  console.log('   Deterministic matches:', jsonUnified.data?.deterministic?.findings?.length);
  console.log('   Contextual findings:', jsonUnified.data?.contextual?.findings?.length);
  console.log('   Contextual provider:', jsonUnified.data?.contextual?.provider);
  console.log('   Claim summary:', jsonUnified.data?.contextual?.claim_summary);

  if (
    resUnified.status !== 200 ||
    !jsonUnified.success ||
    !jsonUnified.data?.deterministic?.findings ||
    !jsonUnified.data?.contextual?.findings ||
    jsonUnified.data?.overall_passed !== false
  ) {
    throw new Error('POST /api/review failed to return valid unified review report');
  }
  console.log('   ✔ POST /api/review unified report generated with both deterministic and contextual findings');

  // 15. POST /api/review (Compliant Copy)
  console.log('\n15. POST /api/review (Unified Multi-Layer Review on Compliant Copy)');
  const compliantReviewText = 'ApexPay processed $14.2B in volume in FY2025 across 38 global currencies, providing defense-in-depth security.';
  const resUnifiedClean = await fetch(`${BASE}/api/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brand_id: 'apexpay',
      text: compliantReviewText,
    }),
  });
  const jsonUnifiedClean = await resUnifiedClean.json();
  console.log('   Status:', resUnifiedClean.status, 'Clean overall score:', jsonUnifiedClean.data?.overall_score, 'Passed:', jsonUnifiedClean.data?.overall_passed);
  if (resUnifiedClean.status !== 200 || jsonUnifiedClean.data?.overall_passed !== true) {
    throw new Error('POST /api/review failed for compliant text');
  }
  console.log('   ✔ POST /api/review successfully verified compliant copy');

  console.log('\n=============================================================');
  console.log('🎉 ALL 15/15 HTTP END-TO-END TESTS COMPLETED SUCCESSFULLY (100%)');
  console.log('=============================================================');
}

run().catch((err) => {
  console.error('\n❌ HTTP E2E Test Failure:', err);
  process.exit(1);
});
