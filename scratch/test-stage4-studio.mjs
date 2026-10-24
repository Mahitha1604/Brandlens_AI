import assert from 'node:assert/strict';
import { applyCorrectionToText, shiftFindingOffsets } from '../src/lib/engine/corrections.ts';
import { getAppStats, getDraftRevisions, saveDraft } from '../src/lib/db.ts';

console.log('=== Stage 4: Review Studio & Corrections Engine Tests ===\n');

// -------------------------------------------------------------
// Test 1: applyCorrectionToText - Exact Match
// -------------------------------------------------------------
console.log('Test 1: applyCorrectionToText with exact match...');
{
  const text = 'Welcome to apex pay for modern business.';
  const start = 11;
  const end = 19;
  assert.equal(text.slice(start, end), 'apex pay');

  const result = applyCorrectionToText(text, {
    id: 'f-1',
    flagged_text: 'apex pay',
    suggested_replacement: 'ApexPay',
    start_index: start,
    end_index: end,
  });

  assert.equal(result.success, true);
  assert.equal(result.updatedText, 'Welcome to ApexPay for modern business.');
  assert.equal(result.actualStartIndex, 11);
  assert.equal(result.actualEndIndex, 19);
  assert.equal(result.deltaLength, 'ApexPay'.length - 'apex pay'.length); // 7 - 8 = -1
  console.log('  ✓ Exact slice replacement passed.');
}

// -------------------------------------------------------------
// Test 2: applyCorrectionToText - Shifted Offsets (Proximity Recovery)
// -------------------------------------------------------------
console.log('Test 2: applyCorrectionToText with shifted position...');
{
  // User typed 10 characters at the beginning
  const text = 'PREFIX123 Welcome to apex pay for modern business.';
  const oldStart = 11;
  const oldEnd = 19;

  const result = applyCorrectionToText(text, {
    id: 'f-2',
    flagged_text: 'apex pay',
    suggested_replacement: 'ApexPay',
    start_index: oldStart,
    end_index: oldEnd,
  });

  assert.equal(result.success, true);
  assert.equal(result.updatedText, 'PREFIX123 Welcome to ApexPay for modern business.');
  assert.equal(result.actualStartIndex, 21);
  assert.equal(result.actualEndIndex, 29);
  console.log('  ✓ Proximity recovery passed.');
}

// -------------------------------------------------------------
// Test 3: applyCorrectionToText - Repeated Phrases
// -------------------------------------------------------------
console.log('Test 3: applyCorrectionToText with repeated phrases...');
{
  const text = 'We love apex pay because apex pay is fast.';
  // First 'apex pay' is at 8..16
  // Second 'apex pay' is at 25..33
  const targetSecond = {
    id: 'f-second',
    flagged_text: 'apex pay',
    suggested_replacement: 'ApexPay',
    start_index: 25,
    end_index: 33,
  };

  const result = applyCorrectionToText(text, targetSecond);
  assert.equal(result.success, true);
  assert.equal(result.updatedText, 'We love apex pay because ApexPay is fast.');
  assert.equal(result.actualStartIndex, 25);
  assert.equal(result.actualEndIndex, 33);
  console.log('  ✓ Repeated phrases targeted correctly.');
}

// -------------------------------------------------------------
// Test 4: shiftFindingOffsets - Subsequent Finding Position Shifting
// -------------------------------------------------------------
console.log('Test 4: shiftFindingOffsets with positive and negative delta...');
{
  const findings = [
    { id: 'f-1', start_index: 10, end_index: 18 }, // Target finding
    { id: 'f-2', start_index: 30, end_index: 40 }, // Downstream finding
    { id: 'f-0', start_index: 0, end_index: 5 },   // Upstream finding
  ];

  // Replacing with longer text: delta = +5
  const shiftedLonger = shiftFindingOffsets(findings, 'f-1', 18, 5);
  assert.equal(shiftedLonger[0].start_index, 10); // Applied finding unchanged
  assert.equal(shiftedLonger[1].start_index, 35); // 30 + 5
  assert.equal(shiftedLonger[1].end_index, 45);   // 40 + 5
  assert.equal(shiftedLonger[2].start_index, 0);  // Upstream unchanged
  assert.equal(shiftedLonger[2].end_index, 5);

  // Replacing with shorter text: delta = -3
  const shiftedShorter = shiftFindingOffsets(findings, 'f-1', 18, -3);
  assert.equal(shiftedShorter[1].start_index, 27); // 30 - 3
  assert.equal(shiftedShorter[1].end_index, 37);   // 40 - 3
  assert.equal(shiftedShorter[2].start_index, 0);
  console.log('  ✓ Downstream finding offsets shifted accurately.');
}

// -------------------------------------------------------------
// Test 5: Database Stats & Revision History
// -------------------------------------------------------------
console.log('Test 5: Database stats and revision audit tracking...');
{
  const stats = getAppStats();
  assert(stats.brands_count >= 2, 'Should have at least 2 seeded brands');
  assert(stats.rules_count >= 15, 'Should have at least 15 seeded rules');
  console.log(`  ✓ App stats: ${stats.brands_count} brands, ${stats.rules_count} rules, ${stats.drafts_count} drafts, ${stats.revisions_count} revisions.`);

  // Create a draft with revisions
  const draft = saveDraft({
    brand_id: 'apexpay',
    title: 'Stage 4 Integration Draft',
    content: 'Initial v1 draft content for testing.',
    channel: 'social_ad',
    target_audience: 'Engineers',
    created_by: 'Sarah Chen (Copywriter)',
  });

  assert(draft.id);
  assert.equal(draft.current_revision, 1);

  // Save an update to create v2 revision
  const draftV2 = saveDraft({
    id: draft.id,
    brand_id: 'apexpay',
    title: 'Stage 4 Integration Draft',
    content: 'Updated v2 draft content after compliance review.',
    channel: 'social_ad',
    target_audience: 'Engineers',
    created_by: 'Marcus Vance (Reviewer)',
  });

  assert.equal(draftV2.current_revision, 2);

  const revisions = getDraftRevisions(draft.id);
  assert(revisions.length >= 2, 'Should have at least 2 revisions');
  assert.equal(revisions[0].version, 2);
  assert.equal(revisions[1].version, 1);
  assert.equal(revisions[0].brand_name, 'ApexPay');
  console.log(`  ✓ Draft revisions persisted and retrieved with brand metadata.`);
}

console.log('\n=== All Stage 4 Unit & DB Tests Passed 100%! ===');
