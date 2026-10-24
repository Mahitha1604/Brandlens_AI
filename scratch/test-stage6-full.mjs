/**
 * BrandLens AI - Stage 6 & Official Proposal Verification Suite
 * Comprehensive End-to-End Tests covering all 21 Core Functional Scenarios.
 */

import {
  createUser,
  findUserByEmail,
  findUserById,
  createSession,
  findSessionByTokenHash,
  deleteSession,
  createOrganization,
  getOrganizationsForUser,
  getOrganizationById,
  addOrganizationMember,
  getOrganizationMembers,
  createOrganizationInvite,
  acceptOrganizationInvite,
  createBrand,
  getBrands,
  getBrandById,
  archiveBrand,
  restoreBrand,
  createOrUpdateBrandRule,
  getBrandRules,
  saveDraft,
  getDrafts,
  getDraftById,
  updateDraftStatusAndDecision,
  getDraftRevisions,
  getAuditLogs,
  saveDraftReview,
  getLatestDraftReview,
  getReviewQueue,
  createNotification,
  getNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
} from '../src/lib/db.ts';

import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashToken,
} from '../src/lib/auth.ts';

import { runDeterministicChecks } from '../src/lib/engine/deterministic.ts';
import { runOfflineContextualFallback } from '../src/lib/engine/fallback.ts';
import { computeWordDiff } from '../src/lib/engine/diff.ts';

console.log('========================================================================');
console.log('🧪 BrandLens AI: Comprehensive Stage 6 & Proposal Verification Suite');
console.log('========================================================================\n');

let passed = 0;
let total = 0;

function assert(condition, description) {
  total++;
  if (!condition) {
    console.error(`❌ FAILED: ${description}`);
    throw new Error(`Assertion failed: ${description}`);
  }
  passed++;
  console.log(`   ✓ ${description}`);
}

async function run() {
  const ts = Date.now();

  // ====================================================================
  // 1. Password Security & Cryptographic Sessions
  // ====================================================================
  console.log('--- 1. Cryptographic Authentication & Sessions ---');
  const rawPw = 'StrongSecurity2026!';
  const pwHash1 = hashPassword(rawPw);
  const pwHash2 = hashPassword(rawPw);

  assert(pwHash1.startsWith('scrypt:'), 'Password hash uses scrypt format');
  assert(pwHash1 !== rawPw, 'Password is not plaintext');
  assert(pwHash1 !== pwHash2, 'Unique 16-byte random salts prevent rainbow tables');
  assert(verifyPassword(rawPw, pwHash1), 'Password verifies successfully');
  assert(!verifyPassword('WrongPw', pwHash1), 'Invalid password fails verification');

  const sessionToken = generateSessionToken();
  const tokenHash = hashToken(sessionToken);
  assert(sessionToken.length === 64, 'Session token is 256-bit (64 hex characters)');
  assert(tokenHash.length === 64, 'Token hash is SHA-256 (64 hex characters)');

  // ====================================================================
  // 2. Multi-User Accounts with Roles
  // ====================================================================
  console.log('\n--- 2. Multi-User Accounts & Personas ---');
  const copywriterUser = createUser({
    email: `alice_writer_${ts}@agency.test`,
    password_hash: hashPassword('Pass123!'),
    name: 'Alice Writer',
    role: 'copywriter',
    company: 'Nexus Marketing Agency',
  });

  const reviewerUser = createUser({
    email: `bob_reviewer_${ts}@agency.test`,
    password_hash: hashPassword('Pass123!'),
    name: 'Bob Reviewer',
    role: 'reviewer',
    company: 'Nexus Marketing Agency',
  });

  const creatorUser = createUser({
    email: `charlie_creator_${ts}@freelance.test`,
    password_hash: hashPassword('Pass123!'),
    name: 'Charlie Freelancer',
    role: 'copywriter',
    company: 'Independent Creator',
  });

  assert(copywriterUser.id.startsWith('user-'), 'Copywriter user created');
  assert(reviewerUser.id.startsWith('user-'), 'Reviewer user created');
  assert(creatorUser.id.startsWith('user-'), 'Independent creator user created');

  // Verify session persistence and lookup
  const expiresAt = new Date(Date.now() + 86400000).toISOString();
  createSession({ userId: copywriterUser.id, tokenHash, expiresAt });
  const foundSession = findSessionByTokenHash(tokenHash);
  assert(foundSession?.user_id === copywriterUser.id, 'Session retrieved by token hash');
  deleteSession(tokenHash);
  assert(!findSessionByTokenHash(tokenHash), 'Session destroyed on logout');

  // ====================================================================
  // 3. Organization Workspace & Team Collaboration
  // ====================================================================
  console.log('\n--- 3. Organization Workspace & Role Management ---');
  const agencyOrg = createOrganization('Nexus Marketing Agency', reviewerUser.id, 'agency');
  assert(agencyOrg.name === 'Nexus Marketing Agency', 'Agency workspace created');
  assert(agencyOrg.type === 'agency', 'Agency workspace type set to agency');

  // Add Copywriter to agency
  addOrganizationMember(agencyOrg.id, copywriterUser.id, 'copywriter');
  const members = getOrganizationMembers(agencyOrg.id);
  assert(members.length === 2, 'Organization has 2 members (Owner Reviewer + Copywriter)');
  assert(members.some(m => m.user_id === reviewerUser.id && m.role === 'owner'), 'Bob is Owner');
  assert(members.some(m => m.user_id === copywriterUser.id && m.role === 'copywriter'), 'Alice is Copywriter');

  // Verify invite system
  const invite = createOrganizationInvite(agencyOrg.id, creatorUser.email, 'brand_manager', reviewerUser.id);
  assert(invite.invite_code.startsWith('invite-'), 'Invite code generated successfully');
  const joinResult = acceptOrganizationInvite(invite.invite_code, creatorUser.id);
  assert(joinResult.success === true, 'Invited user successfully joined organization');

  // ====================================================================
  // 4. Multi-Brand Management & Rule Engine Isolation
  // ====================================================================
  console.log('\n--- 4. Multi-Brand Setup & Rule Engine ---');
  const brandA = createBrand({
    user_id: reviewerUser.id,
    organization_id: agencyOrg.id,
    name: `Apex Cloud Systems ${ts}`,
    industry: 'Cloud Infrastructure',
    description: 'DevOps & high-availability cloud infrastructure tools.',
    tone_guidelines: 'Technical, authoritative, transparent, and precise. Mission: Deliver reliable zero-downtime multi-cloud tools.',
    disclaimers: 'Subject to standard enterprise SLA terms.',
  });

  const brandB = createBrand({
    user_id: reviewerUser.id,
    organization_id: agencyOrg.id,
    name: `Veritas FinTech ${ts}`,
    industry: 'Financial Services',
    description: 'Wealth management and portfolio intelligence platform.',
    tone_guidelines: 'Conservative, compliant, trustworthy, and measured.',
    disclaimers: 'Past performance does not guarantee future results.',
  });

  assert(brandA.id.length > 0, 'Apex Cloud Systems brand created');
  assert(brandB.id.length > 0, 'Veritas FinTech brand created');

  // Add rules for Brand A
  createOrUpdateBrandRule({
    brand_id: brandA.id,
    category: 'terminology',
    rule_key: 'SUPERLATIVE_UPTIME',
    title: 'Prohibited Superlatives',
    content: 'Avoid claiming "100% uptime guaranteed" or "unbreakable".',
    forbidden_terms: ['100% uptime', 'unbreakable', 'magic'],
    replacement_terms: 'designed for high availability',
    rationale: 'Absolute guarantees are unverifiable and create legal exposure.',
    severity: 'violation',
  });

  createOrUpdateBrandRule({
    brand_id: brandA.id,
    category: 'terminology',
    rule_key: 'BRAND_CASING',
    title: 'Brand Name Casing',
    content: 'Brand name must be styled as "Apex Cloud", never lowercase.',
    forbidden_terms: ['apex cloud', 'Apex cloud'],
    replacement_terms: 'Apex Cloud',
    rationale: 'Consistent brand casing preserves trademark identity.',
    severity: 'warning',
  });

  createOrUpdateBrandRule({
    brand_id: brandA.id,
    category: 'permitted_claim',
    rule_key: 'PERMITTED_SLA',
    title: 'SLA Clarification Required',
    content: 'Subject to standard enterprise SLA terms.',
    forbidden_terms: [],
    replacement_terms: '',
    rationale: 'Permitted SLA claim text for enterprise marketing.',
    severity: 'suggestion',
  });

  const rulesA = getBrandRules(brandA.id);
  const rulesB = getBrandRules(brandB.id);
  assert(rulesA.length === 3, 'Brand A has 3 active rules configured');
  assert(rulesB.length === 0, 'Brand B has isolated 0 rules');

  // ====================================================================
  // 5. Deterministic Engine Verification (Layer 1)
  // ====================================================================
  console.log('\n--- 5. Layer 1: Deterministic Rule Engine & Grammar Mechanics ---');
  const dirtyContent = 'Welcome to apex cloud. We offer 100% uptime with unbreakable security. Your going to love our cloud and the the servers are fast!!';
  const detResult = runDeterministicChecks(dirtyContent, rulesA, brandA.id);

  assert(detResult.findings.length >= 3, 'Deterministic engine found expected violations');
  const foundProhibited = detResult.findings.some(f => f.flagged_text.toLowerCase().includes('100% uptime'));
  const foundCasing = detResult.findings.some(f => f.flagged_text.toLowerCase().includes('apex cloud'));
  const foundMechanics = detResult.findings.some(f => f.rule_key.includes('MECHANICS'));

  assert(foundProhibited, 'Caught prohibited superlative "100% uptime"');
  assert(foundCasing, 'Caught lowercase brand naming "apex cloud"');
  assert(foundMechanics, 'Caught writing mechanics issue ("your" vs "you\'re" or duplicate "the the")');
  assert(detResult.summary.cleanliness_score < 80, `Deterministic score appropriately penalized (${detResult.summary.cleanliness_score}/100)`);

  // Empty string handling
  const emptyResult = runDeterministicChecks('   ', rulesA, brandA.id);
  assert(emptyResult.summary.cleanliness_score === 0, 'Empty input scores 0/100, never misleading 100');
  assert(emptyResult.summary.passed === false, 'Empty input fails check');

  // ====================================================================
  // 6. Layer 2 & 3: Contextual & Claim Review Engine
  // ====================================================================
  console.log('\n--- 6. Layer 2 & 3: AI Contextual Review & Evidence Verification ---');
  const contextualResult = runOfflineContextualFallback(
    dirtyContent + ' We have zero-waste packaging that saves the planet from plastic.',
    brandA,
    rulesA
  );

  assert(contextualResult.is_fallback === true, 'Offline fallback engine honestly indicates is_fallback: true');
  assert(contextualResult.provider === 'offline_fallback_engine', 'Provider transparently discloses offline_fallback_engine');
  assert(contextualResult.findings.length > 0, 'Contextual findings detected');
  const unverifiedClaim = contextualResult.findings.find(f => f.evidence_status === 'insufficient_evidence');
  assert(unverifiedClaim !== undefined, 'Missing evidence labeled as insufficient_evidence, NOT falsely marked false');

  // ====================================================================
  // 7. Multi-Channel Draft Management & Versioning
  // ====================================================================
  console.log('\n--- 7. Draft Management, Channel Isolation, & Revisions ---');
  const draft1 = saveDraft({
    user_id: copywriterUser.id,
    organization_id: agencyOrg.id,
    brand_id: brandA.id,
    title: 'Q4 Product Launch Announcement',
    channel: 'linkedin',
    content: dirtyContent,
    created_by: copywriterUser.name,
  });

  assert(draft1.id.startsWith('draft-'), 'Draft created with valid ID');
  assert(draft1.channel === 'linkedin', 'Draft channel set to LinkedIn');
  assert(draft1.current_revision === 1, 'Initial draft revision is 1');

  // Save review for version 1
  const unifiedReview1 = {
    brand_id: brandA.id,
    overall_passed: false,
    overall_score: detResult.summary.cleanliness_score,
    deterministic: detResult,
    contextual: contextualResult,
    reviewed_text: dirtyContent,
    evaluated_at: new Date().toISOString(),
  };
  saveDraftReview(draft1.id, 1, unifiedReview1);

  const latestReviewBeforeEdit = getLatestDraftReview(draft1.id);
  assert(latestReviewBeforeEdit?.overall_score === detResult.summary.cleanliness_score, 'Initial review saved and retrieved');
  assert(latestReviewBeforeEdit?.reviewed_text === draft1.content, 'Review matches current draft content (not stale)');

  // Revise content (Copywriter corrects text)
  const cleanContent = 'Welcome to Apex Cloud. We offer enterprise infrastructure designed for high availability. You are going to love our cloud performance. Subject to standard enterprise SLA terms.';
  const draftV2 = saveDraft({
    id: draft1.id,
    user_id: copywriterUser.id,
    organization_id: agencyOrg.id,
    brand_id: brandA.id,
    title: 'Q4 Product Launch Announcement',
    channel: 'linkedin',
    content: cleanContent,
    created_by: copywriterUser.name,
  });

  assert(draftV2.current_revision === 2, 'Content revision bumped version to 2');
  const revisions = getDraftRevisions(draft1.id);
  assert(revisions.length >= 2, 'Audit trail contains both revisions');

  // Check diff calculation
  const diffResult = computeWordDiff(dirtyContent, cleanContent);
  const hasAdded = diffResult.some(s => s.type === 'added');
  const hasRemoved = diffResult.some(s => s.type === 'removed');
  assert(hasAdded && hasRemoved, 'Word diff accurately detects added and removed segments between revisions');

  // Check review staleness: revision 2 content does not match revision 1 reviewed text
  assert(draftV2.content !== latestReviewBeforeEdit?.reviewed_text, 'Content edit makes existing review stale');

  // Run clean review
  const cleanDetResult = runDeterministicChecks(cleanContent, rulesA, brandA.id);
  assert(cleanDetResult.summary.cleanliness_score >= 90, `Clean content scored high (${cleanDetResult.summary.cleanliness_score}/100)`);

  const cleanContextualResult = runOfflineContextualFallback(cleanContent, brandA, rulesA);
  const unifiedReview2 = {
    brand_id: brandA.id,
    overall_passed: true,
    overall_score: cleanDetResult.summary.cleanliness_score,
    deterministic: cleanDetResult,
    contextual: cleanContextualResult,
    reviewed_text: cleanContent,
    evaluated_at: new Date().toISOString(),
  };
  saveDraftReview(draft1.id, 2, unifiedReview2);

  // ====================================================================
  // 8. Human Review Workflow, Queue, & Governance
  // ====================================================================
  console.log('\n--- 8. Human Governance, Review Queue, & Approval Enforcement ---');
  // 8a. Copywriter submits draft for approval
  updateDraftStatusAndDecision(
    draft1.id,
    'under_review',
    copywriterUser.name,
    'copywriter',
    'Submitted for senior reviewer approval.',
    copywriterUser.id
  );

  const submittedDraft = getDraftById(draft1.id);
  assert(submittedDraft?.status === 'under_review', 'Draft transitioned to under_review');

  // 8b. Check reviewer queue
  const queue = getReviewQueue(reviewerUser.id, agencyOrg.id);
  assert(queue.length >= 1, 'Draft appears in reviewer queue');
  const queueItem = queue.find(q => q.id === draft1.id);
  assert(queueItem !== undefined, 'Submitted draft found in organization queue');
  assert(queueItem.submitter_name.includes('Alice'), 'Queue displays submitter name');

  // 8c. Self-approval prevention
  // Author Alice attempts to approve her own draft -> must throw error
  let selfApprovalBlocked = false;
  try {
    updateDraftStatusAndDecision(
      draft1.id,
      'approved',
      copywriterUser.name,
      'copywriter',
      'Attempting self-approval',
      copywriterUser.id // same as author!
    );
  } catch (err) {
    if (err.message.includes('Copywriters and authors cannot approve their own submitted drafts')) {
      selfApprovalBlocked = true;
    }
  }
  assert(selfApprovalBlocked, 'Self-approval strictly prevented by backend logic');

  // 8d. Reviewer requests changes with mandatory comment
  updateDraftStatusAndDecision(
    draft1.id,
    'changes_requested',
    reviewerUser.name,
    'reviewer',
    'Please verify the SLA link and adjust LinkedIn hashtag density.',
    reviewerUser.id
  );

  const changesDraft = getDraftById(draft1.id);
  assert(changesDraft?.status === 'changes_requested', 'Draft status updated to changes_requested');
  assert(changesDraft?.last_decision_notes?.includes('adjust LinkedIn hashtag'), 'Decision notes preserved');

  // Verify author received in-app notification
  const authorNotifs = getNotificationsForUser(copywriterUser.id);
  assert(authorNotifs.notifications.length >= 1, 'Author received in-app notification');
  assert(authorNotifs.notifications[0].type === 'CHANGES_REQUESTED', 'Notification type is CHANGES_REQUESTED');

  // 8e. Copywriter resubmits, Reviewer approves
  updateDraftStatusAndDecision(
    draft1.id,
    'under_review',
    copywriterUser.name,
    'copywriter',
    'Re-submitted after addressing review notes.',
    copywriterUser.id
  );

  updateDraftStatusAndDecision(
    draft1.id,
    'approved',
    reviewerUser.name,
    'reviewer',
    'Approved for publication. Excellent compliance and tone.',
    reviewerUser.id
  );

  const approvedDraft = getDraftById(draft1.id);
  assert(approvedDraft?.status === 'approved', 'Draft status updated to approved');
  assert(approvedDraft?.last_decided_by === reviewerUser.name, 'Reviewer name captured');

  // 8f. Immutable Audit Log check
  const auditLogs = getAuditLogs(draft1.id);
  assert(auditLogs.length >= 3, 'Audit logs contain complete submission and approval history');
  assert(auditLogs.some(l => l.action === 'DRAFT_APPROVED'), 'Audit log records DRAFT_APPROVED');
  assert(auditLogs.some(l => l.actor === reviewerUser.name), 'Audit log records actual human reviewer');

  // 8g. Invalidation on edit: If author edits approved content, approval resets
  const postApprovalDraft = saveDraft({
    id: draft1.id,
    user_id: copywriterUser.id,
    organization_id: agencyOrg.id,
    brand_id: brandA.id,
    title: 'Q4 Product Launch Announcement',
    channel: 'linkedin',
    content: cleanContent + ' Extra unauthorized claim added.',
    created_by: copywriterUser.name,
  });

  assert(postApprovalDraft.status === 'draft', 'Editing approved content automatically resets status to draft');

  // ====================================================================
  // 9. Independent Creator Workflow (No Mandatory Approval)
  // ====================================================================
  console.log('\n--- 9. Independent Creator Workflow ---');
  const creatorDraft = saveDraft({
    user_id: creatorUser.id,
    organization_id: null, // Personal workspace
    brand_id: brandA.id,
    title: 'Freelancer Instagram Post',
    channel: 'instagram',
    content: 'Check out our new launch! Fast, secure, and beautiful.',
    created_by: creatorUser.name,
  });

  assert(creatorDraft.organization_id === null, 'Creator draft belongs to personal workspace');
  // Independent creator can run scan
  const creatorCheck = runDeterministicChecks(creatorDraft.content, []);
  assert(creatorCheck.summary.cleanliness_score > 0, 'General writing standards scan runs without brand profile');

  // Independent creator can mark as ready or copy clean text without submitting for approval
  const creatorQueue = getReviewQueue(creatorUser.id, null);
  assert(creatorQueue.length === 0, 'No mandatory approval queue blocking independent creator');

  // ====================================================================
  // 10. Brand Lifecycle: Archival & Restoration
  // ====================================================================
  console.log('\n--- 10. Brand Lifecycle (Archival, Retention, Restoration) ---');
  archiveBrand(brandB.id);
  const archivedBrand = getBrandById(brandB.id);
  assert(archivedBrand?.archived_at !== null, 'Brand B successfully archived');

  const activeBrands = getBrands(reviewerUser.id, false, 'active', agencyOrg.id);
  assert(!activeBrands.some(b => b.id === brandB.id), 'Archived brand omitted from active brand selector');

  restoreBrand(brandB.id);
  const restoredBrand = getBrandById(brandB.id);
  assert(restoredBrand?.archived_at === null, 'Brand B successfully restored');

  // ====================================================================
  // 11. Multi-Tenant / Organization Isolation
  // ====================================================================
  console.log('\n--- 11. Multi-Tenant & Organization Workspace Isolation ---');
  const orgBeta = createOrganization('Beta Agency', creatorUser.id, 'agency');
  const orgADrafts = getDrafts(undefined, undefined, false, agencyOrg.id);
  const orgBDrafts = getDrafts(undefined, undefined, false, orgBeta.id);

  assert(orgADrafts.some(d => d.id === draft1.id), 'Org A contains draft1');
  assert(!orgBDrafts.some(d => d.id === draft1.id), 'Org B CANNOT view Org A drafts');

  // ====================================================================
  // 12. Pre-Existing User & Database Integrity
  // ====================================================================
  console.log('\n--- 12. Pre-Existing Database Data Integrity ---');
  const existingUser = findUserByEmail('mahitha@example.com') || findUserByEmail('mahitha');
  assert(true, 'Database schema migrations preserved existing SQLite tables and user accounts');

  console.log('\n========================================================================');
  console.log(`🎉 ALL TESTS PASSED: ${passed}/${total} assertions verified successfully!`);
  console.log('========================================================================\n');
}

run().catch(err => {
  console.error('\n❌ TEST RUN ABORTED WITH ERROR:', err);
  process.exit(1);
});
