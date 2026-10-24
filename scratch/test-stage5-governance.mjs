import assert from 'node:assert/strict';
import {
  createBrand,
  getBrands,
  saveDraft,
  getDraftById,
  updateDraftStatusAndDecision,
  getAuditLogs,
} from '../src/lib/db.ts';
import { computeWordDiff } from '../src/lib/engine/diff.ts';

console.log('=== Stage 5: Governance, Approvals, & Version Diffing Test Suite ===\n');

// ------------------------------------------------------------------
// Test 1: Brand Creation & Sample Brand Distinction
// ------------------------------------------------------------------
console.log('Test 1: Brand Creation & Sample Brand Distinction...');
{
  const newBrand = createBrand({
    name: 'Horizon Health',
    industry: 'Digital Therapeutics & Telehealth',
    description: 'AI-guided clinical care management for chronic cardiovascular patients.',
    tone_guidelines: 'Empathetic, clinically accurate, reassuring, and objective.',
    disclaimers: 'Not a substitute for emergency medical care. Consult your physician.',
    is_sample: false,
  });

  assert(newBrand.id, 'New brand should have an ID');
  assert.equal(newBrand.name, 'Horizon Health');
  assert.equal(newBrand.is_sample, false, 'User-created brand must have is_sample = false');

  const allBrands = getBrands();
  const apex = allBrands.find((b) => b.id === 'apexpay');
  const verdant = allBrands.find((b) => b.id === 'verdant-aura');
  const horizon = allBrands.find((b) => b.id === newBrand.id);

  assert.equal(apex?.is_sample, true, 'ApexPay must be marked as a sample brand');
  assert.equal(verdant?.is_sample, true, 'Verdant Aura must be marked as a sample brand');
  assert.equal(horizon?.is_sample, false, 'Horizon Health must be marked as a user brand');

  console.log('  ✓ Brand creation and sample distinction verified.');
}

// ------------------------------------------------------------------
// Test 2: Word Diff Engine (Additions, Deletions, Unchanged)
// ------------------------------------------------------------------
console.log('Test 2: Word Diff Engine...');
{
  const v1 = 'Welcome to apex pay for modern business.';
  const v2 = 'Welcome to ApexPay, the defense-in-depth platform for modern enterprises.';

  const diff = computeWordDiff(v1, v2);
  assert(diff.length > 0, 'Diff should produce segments');

  const addedSegments = diff.filter((s) => s.type === 'added');
  const removedSegments = diff.filter((s) => s.type === 'removed');
  const unchangedSegments = diff.filter((s) => s.type === 'unchanged');

  assert(addedSegments.length > 0, 'Should detect additions');
  assert(removedSegments.length > 0, 'Should detect removals');
  assert(unchangedSegments.length > 0, 'Should detect unchanged words');

  // Verify specific added terms
  const addedText = addedSegments.map((s) => s.value).join(' ');
  assert(addedText.includes('ApexPay'), 'Should identify ApexPay as added');
  assert(addedText.includes('defense-in-depth'), 'Should identify defense-in-depth as added');

  // Verify removed terms
  const removedText = removedSegments.map((s) => s.value).join(' ');
  assert(removedText.includes('apex pay'), 'Should identify apex pay as removed');

  console.log('  ✓ Visual word diff correctly categorized added, removed, and unchanged words.');
}

// ------------------------------------------------------------------
// Test 3: Governance Workflow Lifecycle (Draft -> Under Review -> Changes Requested -> Approved)
// ------------------------------------------------------------------
console.log('Test 3: Governance Workflow Lifecycle...');
{
  // 1. Copywriter creates draft
  const draft = saveDraft({
    brand_id: 'apexpay',
    title: 'Enterprise Q4 Treasury Overhaul',
    content: 'Our zero-risk engine delivers 100% uptime for cross-border wires.',
    channel: 'press_release',
    target_audience: 'Institutional Treasurers',
    created_by: 'Sarah Chen (Copywriter)',
  });

  assert.equal(draft.status, 'draft', 'Initial status must be draft');

  // 2. Submit for review
  const underReview = updateDraftStatusAndDecision(
    draft.id,
    'under_review',
    'Sarah Chen (Copywriter)',
    'copywriter',
    'Submitted for compliance sign-off'
  );
  assert.equal(underReview.status, 'under_review');

  // 3. Reviewer requests changes
  const changesReq = updateDraftStatusAndDecision(
    draft.id,
    'changes_requested',
    'Marcus Vance (Brand Compliance Lead)',
    'reviewer',
    'Please remove "zero-risk" and qualify the 100% uptime statement.'
  );
  assert.equal(changesReq.status, 'changes_requested');
  assert.equal(changesReq.last_decided_by, 'Marcus Vance (Brand Compliance Lead)');

  // 4. Copywriter applies corrections
  const correctedDraft = saveDraft({
    id: draft.id,
    brand_id: 'apexpay',
    title: 'Enterprise Q4 Treasury Overhaul',
    content: 'Our risk-mitigated engine delivers 99.97% audited uptime for cross-border wires.',
    created_by: 'Sarah Chen (Copywriter)',
  });
  assert.equal(correctedDraft.current_revision, 2);

  // 5. Reviewer approves
  const approvedDraft = updateDraftStatusAndDecision(
    draft.id,
    'approved',
    'Marcus Vance (Brand Compliance Lead)',
    'reviewer',
    'Approved. All terminology and claims are compliant with FY2025 guidelines.'
  );
  assert.equal(approvedDraft.status, 'approved');

  console.log('  ✓ Workflow state transitions verified from draft -> under_review -> changes_requested -> approved.');
}

// ------------------------------------------------------------------
// Test 4: Approval Invalidation on Subsequent Content Edits
// ------------------------------------------------------------------
console.log('Test 4: Approval Invalidation on Subsequent Edits...');
{
  // Create an approved draft
  const draft = saveDraft({
    brand_id: 'apexpay',
    title: 'Approved Launch Campaign',
    content: 'Our risk-mitigated engine provides 99.97% availability.',
    created_by: 'Sarah Chen (Copywriter)',
  });

  updateDraftStatusAndDecision(
    draft.id,
    'approved',
    'Elena Rostova (VP Brand & Governance)',
    'admin',
    'Officially approved for global distribution.'
  );

  const verifyApproved = getDraftById(draft.id);
  assert.equal(verifyApproved?.status, 'approved', 'Must be approved prior to edit');

  // Now, modify content after approval
  const editedDraft = saveDraft({
    id: draft.id,
    brand_id: 'apexpay',
    title: 'Approved Launch Campaign',
    content: 'Sneaking in unapproved text: guaranteed zero risk platform!',
    created_by: 'Sarah Chen (Copywriter)',
  });

  // CRITICAL RULE: Editing approved copy must reset status to draft!
  assert.equal(editedDraft.status, 'draft', 'Approval must be invalidated and status reset to draft');

  // Check audit log for APPROVAL_INVALIDATED entry
  const logs = getAuditLogs(draft.id);
  const invalidationLog = logs.find((l) => l.action === 'APPROVAL_INVALIDATED');
  assert(invalidationLog, 'Audit log must record APPROVAL_INVALIDATED event');
  assert(invalidationLog.details.includes('Previous approval invalidated'));

  console.log('  ✓ Modifying approved draft immediately invalidated approval and logged audit event.');
}

// ------------------------------------------------------------------
// Test 5: Audit Trail Integrity
// ------------------------------------------------------------------
console.log('Test 5: Audit Trail Integrity...');
{
  const allLogs = getAuditLogs();
  assert(allLogs.length >= 4, 'Audit logs should contain multiple recorded events');

  const actions = allLogs.map((l) => l.action);
  assert(actions.includes('BRAND_CREATED'), 'Should log brand creation');
  assert(actions.includes('DRAFT_CREATED'), 'Should log draft creation');
  assert(actions.includes('DRAFT_APPROVED'), 'Should log draft approval');
  assert(actions.includes('CHANGES_REQUESTED'), 'Should log changes requested');

  console.log(`  ✓ Audit trail logged ${allLogs.length} verified events with actors, timestamps, and details.`);
}

console.log('\n=== All Stage 5 Governance & Visual Diff Unit Tests Passed 100%! ===');
