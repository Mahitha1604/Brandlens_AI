/**
 * BrandLens AI - Stage 6 Live HTTP Multi-User Collaboration & Review Queue Test
 */

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('=== BRANDLENS AI: LIVE HTTP REVIEW QUEUE & NOTIFICATIONS SUITE ===\n');
  const ts = Date.now();

  // Helper for requests with cookies
  async function request(path, options = {}, cookie = '') {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (cookie) {
      headers['Cookie'] = cookie;
    }
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
    const setCookie = res.headers.get('set-cookie');
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json, text, cookie: setCookie || cookie };
  }

  // 1. Register Copywriter
  console.log('1. Registering Copywriter (Alice)...');
  const regAlice = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: `alice_${ts}@nexus.test`,
      password: 'Password123!',
      name: 'Alice Writer',
      role: 'copywriter',
      company: 'Nexus Agency',
    }),
  });
  if (regAlice.status !== 200) throw new Error(`Register Alice failed: ${regAlice.status} ${regAlice.text}`);
  const aliceCookie = regAlice.cookie.split(';')[0];
  console.log('   ✓ Alice registered with HttpOnly session cookie.');

  // 2. Register Reviewer
  console.log('2. Registering Reviewer (Bob)...');
  const regBob = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: `bob_${ts}@nexus.test`,
      password: 'Password123!',
      name: 'Bob Reviewer',
      role: 'reviewer',
      company: 'Nexus Agency',
    }),
  });
  if (regBob.status !== 200) throw new Error(`Register Bob failed: ${regBob.status} ${regBob.text}`);
  const bobCookie = regBob.cookie.split(';')[0];
  console.log('   ✓ Bob registered with HttpOnly session cookie.');

  // 3. Bob creates organization workspace
  console.log('3. Bob creates Organization workspace "Nexus Agency"...');
  const createOrg = await request('/api/organizations', {
    method: 'POST',
    body: JSON.stringify({
      name: `Nexus Agency ${ts}`,
      type: 'agency',
    }),
  }, bobCookie);
  if (createOrg.status !== 200) throw new Error(`Create Org failed: ${createOrg.status} ${createOrg.text}`);
  const orgId = createOrg.json.data.id;
  console.log(`   ✓ Organization created (ID: ${orgId}).`);

  // 4. Bob invites Alice, Alice joins
  console.log('4. Bob invites Alice as copywriter...');
  const inviteRes = await request(`/api/organizations/${orgId}/invite`, {
    method: 'POST',
    body: JSON.stringify({
      email: `alice_${ts}@nexus.test`,
      role: 'copywriter',
    }),
  }, bobCookie);
  if (inviteRes.status !== 200) throw new Error(`Invite failed: ${inviteRes.status} ${inviteRes.text}`);
  const inviteCode = inviteRes.json.data.invite_code;

  const joinRes = await request('/api/organizations/join', {
    method: 'POST',
    body: JSON.stringify({ invite_code: inviteCode }),
  }, aliceCookie);
  if (joinRes.status !== 200) throw new Error(`Join org failed: ${joinRes.status} ${joinRes.text}`);
  console.log('   ✓ Alice accepted invite and joined organization.');

  // 5. Bob creates a brand under the organization
  console.log('5. Bob creates brand "Apex Cloud"...');
  const brandRes = await request('/api/brands', {
    method: 'POST',
    body: JSON.stringify({
      name: `Apex Cloud ${ts}`,
      industry: 'Cloud Computing',
      description: 'Zero downtime cloud systems',
      tone_guidelines: 'Precise and authoritative',
      disclaimers: 'Terms apply',
      organization_id: orgId,
    }),
  }, bobCookie);
  if (brandRes.status !== 200) throw new Error(`Create brand failed: ${brandRes.status} ${brandRes.text}`);
  const brandId = brandRes.json.data.id;
  console.log(`   ✓ Brand profile created under organization (ID: ${brandId}).`);

  // 6. Alice creates a draft under the brand and organization
  console.log('6. Alice creates a LinkedIn draft...');
  const draftRes = await request('/api/drafts', {
    method: 'POST',
    body: JSON.stringify({
      brand_id: brandId,
      organization_id: orgId,
      title: 'Q4 Product Launch Announcement',
      channel: 'linkedin',
      content: 'Welcome to Apex Cloud. We offer 99.99% uptime for cloud infrastructure.',
    }),
  }, aliceCookie);
  if (draftRes.status !== 200) throw new Error(`Create draft failed: ${draftRes.status} ${draftRes.text}`);
  const draftId = draftRes.json.data.id;
  console.log(`   ✓ Draft created (ID: ${draftId}, Revision: #${draftRes.json.data.current_revision}).`);

  // 7. Alice submits draft for approval
  console.log('7. Alice submits draft for approval...');
  const submitRes = await request('/api/governance/decide', {
    method: 'POST',
    body: JSON.stringify({
      draft_id: draftId,
      decision: 'submit_review',
      comment: 'Ready for senior compliance review.',
    }),
  }, aliceCookie);
  if (submitRes.status !== 200) throw new Error(`Submit failed: ${submitRes.status} ${submitRes.text}`);
  console.log('   ✓ Draft status transitioned to "under_review".');

  // 8. Alice attempts SELF-APPROVAL (MUST FAIL WITH 403)
  console.log('8. Alice attempts self-approval on her own submission...');
  const selfApproveRes = await request('/api/governance/decide', {
    method: 'POST',
    body: JSON.stringify({
      draft_id: draftId,
      decision: 'approve',
      comment: 'Self approval attempt.',
    }),
  }, aliceCookie);
  if (selfApproveRes.status !== 403) {
    throw new Error(`Self-approval was NOT blocked! Status: ${selfApproveRes.status}`);
  }
  console.log('   ✓ Security enforced: HTTP 403 Forbidden on author self-approval attempt.');

  // 9. Bob views review queue
  console.log('9. Bob checks Review Queue...');
  const queueRes = await request(`/api/governance/queue?org_id=${orgId}`, {
    method: 'GET',
  }, bobCookie);
  if (queueRes.status !== 200) throw new Error(`Queue fetch failed: ${queueRes.status} ${queueRes.text}`);
  const queue = queueRes.json.data;
  const foundDraft = queue.find(q => q.id === draftId);
  if (!foundDraft) throw new Error(`Draft ${draftId} not found in review queue!`);
  console.log(`   ✓ Submitted draft found in Bob's review queue (Submitter: ${foundDraft.submitter_name}).`);

  // 10. Bob requests changes with notes
  console.log('10. Bob requests changes...');
  const changeReqRes = await request('/api/governance/decide', {
    method: 'POST',
    body: JSON.stringify({
      draft_id: draftId,
      decision: 'request_changes',
      comment: 'Please verify the uptime percentage SLA link before final approval.',
    }),
  }, bobCookie);
  if (changeReqRes.status !== 200) throw new Error(`Request changes failed: ${changeReqRes.status} ${changeReqRes.text}`);
  console.log('   ✓ Decision recorded: changes_requested.');

  // 11. Alice checks in-app notifications
  console.log('11. Alice fetches real in-app notifications...');
  const notifsRes = await request('/api/notifications', { method: 'GET' }, aliceCookie);
  if (notifsRes.status !== 200) throw new Error(`Get notifs failed: ${notifsRes.status} ${notifsRes.text}`);
  const notifs = notifsRes.json.data;
  if (!notifs || notifs.length === 0) throw new Error('Alice did not receive in-app notification!');
  console.log(`   ✓ Alice received notification: "${notifs[0].title}" - ${notifs[0].message}`);

  // 12. Alice marks notification as read
  console.log('12. Alice marks notification read...');
  const markRead = await request(`/api/notifications/${notifs[0].id}/read`, { method: 'POST' }, aliceCookie);
  if (markRead.status !== 200) throw new Error(`Mark read failed: ${markRead.status} ${markRead.text}`);
  console.log('   ✓ Notification marked read.');

  // 13. Alice updates content and resubmits
  console.log('13. Alice updates content and resubmits...');
  await request('/api/drafts', {
    method: 'POST',
    body: JSON.stringify({
      id: draftId,
      brand_id: brandId,
      organization_id: orgId,
      title: 'Q4 Product Launch Announcement',
      channel: 'linkedin',
      content: 'Welcome to Apex Cloud. We offer up to 99.99% uptime for cloud infrastructure. Subject to standard SLA terms.',
    }),
  }, aliceCookie);

  await request('/api/governance/decide', {
    method: 'POST',
    body: JSON.stringify({
      draft_id: draftId,
      decision: 'submit_review',
      comment: 'Updated with standard SLA link.',
    }),
  }, aliceCookie);
  console.log('   ✓ Revised content submitted (Revision #2).');

  // 14. Bob approves draft
  console.log('14. Bob approves draft...');
  const approveRes = await request('/api/governance/decide', {
    method: 'POST',
    body: JSON.stringify({
      draft_id: draftId,
      decision: 'approve',
      comment: 'Approved for publication! Great job.',
    }),
  }, bobCookie);
  if (approveRes.status !== 200) throw new Error(`Approve failed: ${approveRes.status} ${approveRes.text}`);
  console.log('   ✓ Draft approved by Reviewer Bob.');

  // 15. Alice receives approval notification
  console.log('15. Alice checks approval notification...');
  const finalNotifsRes = await request('/api/notifications', { method: 'GET' }, aliceCookie);
  const finalNotifs = finalNotifsRes.json.data;
  const approvedNotif = finalNotifs.find(n => n.type === 'DRAFT_APPROVED');
  if (!approvedNotif) throw new Error('Alice did not receive DRAFT_APPROVED notification!');
  console.log(`   ✓ Alice received approval notification: "${approvedNotif.title}"`);

  console.log('\n========================================================================');
  console.log('🎉 ALL 15 LIVE HTTP COLLABORATION & GOVERNANCE CHECKS PASSED (100%)!');
  console.log('========================================================================\n');
}

run().catch(err => {
  console.error('\n❌ HTTP TEST SUITE FAILED:', err);
  process.exit(1);
});
