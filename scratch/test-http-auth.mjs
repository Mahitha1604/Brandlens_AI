import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function testHttpAuthWorkflow() {
  console.log('=== BRANDLENS AI: LIVE HTTP AUTHENTICATION & MULTI-TENANT ISOLATION ===\n');

  // 1. Initial state: unauthenticated
  const resMeUnauth = await fetch(`${BASE_URL}/api/auth/me`);
  const jsonMeUnauth = await resMeUnauth.json();
  assert.strictEqual(jsonMeUnauth.success, true);
  assert.strictEqual(jsonMeUnauth.data, null, 'Unauthenticated /api/auth/me should return null');
  console.log('1. ✓ Unauthenticated /api/auth/me returns null');

  // 2. Unauthenticated access to /api/brands is rejected with 401
  const resBrandsUnauth = await fetch(`${BASE_URL}/api/brands`);
  assert.strictEqual(resBrandsUnauth.status, 401, 'Unauthenticated /api/brands must return 401');
  console.log('2. ✓ Unauthenticated access to /api/brands correctly blocked with 401');

  // 3. Demo mode access to /api/brands returns sample brands
  const resBrandsDemo = await fetch(`${BASE_URL}/api/brands?demo=true`);
  const jsonBrandsDemo = await resBrandsDemo.json();
  assert.strictEqual(resBrandsDemo.status, 200);
  assert(jsonBrandsDemo.data.length >= 2, 'Demo mode should return sample brands');
  console.log(`3. ✓ Demo mode returns ${jsonBrandsDemo.data.length} sample brands`);

  // 4. Register User 1 (Copywriter)
  const timestamp = Date.now();
  const emailUser1 = `jane_copywriter_${timestamp}@example.com`;
  const resReg1 = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailUser1,
      password: 'JanePassword123!',
      name: 'Jane Copywriter',
      role: 'copywriter',
    }),
  });

  const cookieHeader1 = resReg1.headers.get('set-cookie');
  assert(cookieHeader1 && cookieHeader1.includes('brandlens_session='), 'Must set session cookie');
  assert(cookieHeader1.includes('HttpOnly'), 'Cookie must be HttpOnly');
  const cookieUser1 = cookieHeader1.split(';')[0];
  console.log('4. ✓ Registered User 1 (Jane Copywriter) with secure HttpOnly cookie');

  // 5. User 1 Workspace is Clean (0 brands, 0 stats)
  const resUser1Brands = await fetch(`${BASE_URL}/api/brands`, {
    headers: { Cookie: cookieUser1 },
  });
  const jsonUser1Brands = await resUser1Brands.json();
  assert.strictEqual(jsonUser1Brands.data.length, 0, 'New user workspace must start with 0 brands');

  const resUser1Stats = await fetch(`${BASE_URL}/api/stats`, {
    headers: { Cookie: cookieUser1 },
  });
  const jsonUser1Stats = await resUser1Stats.json();
  assert.strictEqual(jsonUser1Stats.data.brands_count, 0);
  assert.strictEqual(jsonUser1Stats.data.drafts_count, 0);
  console.log('5. ✓ User 1 workspace confirmed empty (0 brands, 0 drafts)');

  // 6. User 1 creates a Brand Profile
  const resCreateBrand1 = await fetch(`${BASE_URL}/api/brands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
    body: JSON.stringify({
      name: 'Jane Therapeutics',
      industry: 'HealthTech',
      description: 'Cardiovascular telehealth platform.',
      tone_guidelines: 'Empathetic and clinically rigorous.',
      disclaimers: 'Consult licensed medical practitioners.',
    }),
  });
  const jsonCreateBrand1 = await resCreateBrand1.json();
  assert.strictEqual(jsonCreateBrand1.success, true);
  const brand1Id = jsonCreateBrand1.data.id;
  console.log(`6. ✓ User 1 created brand profile "${jsonCreateBrand1.data.name}" (${brand1Id})`);

  // 7. Register User 2 (Compliance Reviewer)
  const emailUser2 = `bob_reviewer_${timestamp}@example.com`;
  const resReg2 = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailUser2,
      password: 'BobPassword123!',
      name: 'Bob Reviewer',
      role: 'reviewer',
    }),
  });
  const cookieHeader2 = resReg2.headers.get('set-cookie');
  const cookieUser2 = cookieHeader2.split(';')[0];
  console.log('7. ✓ Registered User 2 (Bob Reviewer) in separate session');

  // 8. Cross-User Isolation: User 2 CANNOT see User 1's brand in list
  const resUser2Brands = await fetch(`${BASE_URL}/api/brands`, {
    headers: { Cookie: cookieUser2 },
  });
  const jsonUser2Brands = await resUser2Brands.json();
  assert.strictEqual(jsonUser2Brands.data.length, 0, 'User 2 must see 0 brands');
  console.log("8. ✓ User 2 brand listing is empty (does not see User 1's brand)");

  // 9. Cross-User Isolation: User 2 CANNOT view User 1's brand by ID
  const resUser2AccessBrand1 = await fetch(`${BASE_URL}/api/brands/${brand1Id}`, {
    headers: { Cookie: cookieUser2 },
  });
  assert([403, 404].includes(resUser2AccessBrand1.status), 'User 2 accessing User 1 brand must return 403 or 404');
  console.log("9. ✓ Direct GET of User 1's brand by User 2 correctly blocked (403/404)");

  // 10. Cross-User Isolation: User 2 CANNOT delete User 1's brand
  const resUser2DeleteBrand1 = await fetch(`${BASE_URL}/api/brands/${brand1Id}`, {
    method: 'DELETE',
    headers: { Cookie: cookieUser2 },
  });
  assert([403, 404].includes(resUser2DeleteBrand1.status), 'User 2 deleting User 1 brand must return 403 or 404');
  console.log("10. ✓ Direct DELETE of User 1's brand by User 2 correctly blocked (403/404)");

  // 11. Protected Sample Demo Brands cannot be deleted by anyone
  const resDeleteSample = await fetch(`${BASE_URL}/api/brands/apexpay`, {
    method: 'DELETE',
    headers: { Cookie: cookieUser1 },
  });
  assert.strictEqual(resDeleteSample.status, 403, 'Deleting sample demo brand must return 403');
  console.log('11. ✓ Deleting protected sample demo brand "apexpay" blocked (403)');

  // 12. User 1 saves a draft
  const resSaveDraft = await fetch(`${BASE_URL}/api/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
    body: JSON.stringify({
      brand_id: brand1Id,
      title: 'Spring Wellness Launch',
      content: 'Empathetic care management for chronic cardiovascular patients.',
      channel: 'social_ad',
      target_audience: 'Patients',
    }),
  });
  const jsonSaveDraft = await resSaveDraft.json();
  assert.strictEqual(jsonSaveDraft.success, true);
  const draftId = jsonSaveDraft.data.id;
  console.log(`12. ✓ User 1 saved draft "${jsonSaveDraft.data.title}"`);

  // 13. Copywriter submits draft for review
  const resSubmitReview = await fetch(`${BASE_URL}/api/governance/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
    body: JSON.stringify({
      draft_id: draftId,
      decision: 'submit_review',
      comment: 'Ready for governance team review',
    }),
  });
  const jsonSubmitReview = await resSubmitReview.json();
  assert.strictEqual(jsonSubmitReview.success, true);
  assert.strictEqual(jsonSubmitReview.data.status, 'under_review');
  console.log('13. ✓ Copywriter successfully transitioned draft status to "under_review"');

  // 14. SERVER-SIDE PERMISSION ENFORCEMENT: Copywriter ATTEMPTS to approve draft -> must fail with 403!
  const resCopywriterApprove = await fetch(`${BASE_URL}/api/governance/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieUser1 },
    body: JSON.stringify({
      draft_id: draftId,
      decision: 'approve',
      comment: 'Attempting self-approval as copywriter',
      actor_role: 'admin', // Even if forged in request body, session role is enforced!
    }),
  });
  assert.strictEqual(resCopywriterApprove.status, 403, 'Copywriter approval must be blocked with 403 Forbidden');
  console.log('14. ✓ Role-based permission enforced: Copywriter self-approval blocked (403)');

  // 15. User 1 deletes their own brand
  const resDeleteOwnBrand = await fetch(`${BASE_URL}/api/brands/${brand1Id}`, {
    method: 'DELETE',
    headers: { Cookie: cookieUser1 },
  });
  assert.strictEqual(resDeleteOwnBrand.status, 200);
  const jsonDeleteOwnBrand = await resDeleteOwnBrand.json();
  assert.strictEqual(jsonDeleteOwnBrand.success, true);
  console.log(`15. ✓ User 1 successfully deleted brand "${jsonCreateBrand1.data.name}"`);

  // 16. Verify User 1 brand count is back to 0
  const resUser1FinalBrands = await fetch(`${BASE_URL}/api/brands`, {
    headers: { Cookie: cookieUser1 },
  });
  const jsonUser1FinalBrands = await resUser1FinalBrands.json();
  assert.strictEqual(jsonUser1FinalBrands.data.length, 0, 'Workspace must be back to 0 brands');
  console.log('16. ✓ User 1 workspace confirmed empty after brand deletion');

  console.log('\n=== ALL 16 LIVE HTTP CHECKS PASSED (100% VERIFIED)! ===');
}

testHttpAuthWorkflow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
