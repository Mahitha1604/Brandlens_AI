import {
  runDeterministicChecks,
  runDeterministicChecksForBrand,
} from '../src/lib/engine/deterministic.ts';
import { getBrandRules } from '../src/lib/db.ts';

console.log('======================================================');
console.log('🧪 Starting Stage 2 Deterministic Rule Engine Test Suite');
console.log('======================================================\n');

// ------------------------------------------------------------------
// Test 1: Positive Test - Flagged ApexPay Draft
// ------------------------------------------------------------------
console.log('Test 1: Positive Test (Flawed ApexPay Draft)...');
const flawedDraft = `Welcome to apex pay, the bulletproof payments solution for modern business. Our zero-risk treasury engine delivers 100% uptime with instantaneous cross-border wire transfers. Act now before it is too late to lock in completely free platform access and over $50B in processed volume!`;

const apexRules = getBrandRules('apexpay');
const flawedResult = runDeterministicChecks(flawedDraft, apexRules, 'apexpay');

console.log(`   Total rules evaluated: ${flawedResult.total_rules_evaluated}`);
console.log(`   Findings count: ${flawedResult.findings.length}`);
console.log(`   Summary:`, flawedResult.summary);

if (flawedResult.findings.length === 0) {
  throw new Error('Test 1 Failed: Expected violations in flawed draft, got 0');
}
if (flawedResult.summary.passed !== false) {
  throw new Error('Test 1 Failed: Expected passed=false for flawed draft');
}

// Verify expected rule keys were caught
const caughtKeys = flawedResult.findings.map(f => f.rule_key);
console.log('   Caught rule keys:', caughtKeys);

const expectedKeys = [
  'APEX_TRADEMARK_CASING',
  'APEX_TERM_BULLETPROOF',
  'APEX_TERM_RISK_FREE',
  'APEX_TERM_UPTIME_100',
  'APEX_TERM_INSTANT',
  'APEX_GUIDE_NO_FOMO',
  'APEX_CLAIM_ZERO_MAINTENANCE',
  'APEX_FACT_AUDITED_VOLUME',
];

for (const exp of expectedKeys) {
  if (!caughtKeys.includes(exp)) {
    throw new Error(`Test 1 Failed: Expected rule key "${exp}" to be caught!`);
  }
}
console.log('✔ Test 1 Passed: All expected violations correctly flagged.');

// ------------------------------------------------------------------
// Test 2: Negative Test - Fully Compliant Draft
// ------------------------------------------------------------------
console.log('\nTest 2: Negative Test (Compliant ApexPay Draft)...');
const compliantDraft = `Welcome to ApexPay, the defense-in-depth payments platform for modern enterprises. Our risk-mitigated treasury architecture provides 99.97% audited availability with near real-time settlement across 38 global currencies ($14.2B processed volume in FY2025). Enjoy zero monthly account maintenance fees (standard per-transaction interchange applies).`;

const compliantResult = runDeterministicChecks(compliantDraft, apexRules, 'apexpay');
console.log(`   Findings count: ${compliantResult.findings.length}`);
console.log(`   Cleanliness score: ${compliantResult.summary.cleanliness_score}`);
console.log(`   Passed: ${compliantResult.summary.passed}`);

if (compliantResult.findings.length !== 0 || compliantResult.summary.cleanliness_score !== 100 || !compliantResult.summary.passed) {
  throw new Error(`Test 2 Failed: Expected 0 findings and 100 score, got ${compliantResult.findings.length} findings, score: ${compliantResult.summary.cleanliness_score}`);
}
console.log('✔ Test 2 Passed: Compliant draft yielded 0 findings and 100 score.');

// ------------------------------------------------------------------
// Test 3: Exact Character Offset & Slice Integrity
// ------------------------------------------------------------------
console.log('\nTest 3: Character Offset Integrity Verification...');
for (const finding of flawedResult.findings) {
  const actualSlice = flawedDraft.slice(finding.start_index, finding.end_index);
  if (actualSlice !== finding.flagged_text) {
    throw new Error(
      `Offset mismatch for rule ${finding.rule_key}: expected "${finding.flagged_text}", slice produced "${actualSlice}" at [${finding.start_index}, ${finding.end_index}]`
    );
  }
  console.log(`   ✔ [${finding.start_index}, ${finding.end_index}]: "${finding.flagged_text}" matches text.slice exactly.`);
}
console.log('✔ Test 3 Passed: 100% character offset precision verified.');

// ------------------------------------------------------------------
// Test 4: Boundary Matching (Symbols, Hyphens, Embedded Words)
// ------------------------------------------------------------------
console.log('\nTest 4: Boundary Matching & Embedded Substrings...');
const boundaryText = 'We offer free transfers. Do not freeze the account, nor restrict human freedom. Guarantee 100% with $50B scale.';

// Rule with forbidden term "free"
const mockRuleFree = {
  id: 'mock-free',
  brand_id: 'test',
  category: 'terminology',
  rule_key: 'TERM_FREE',
  title: 'No free claims',
  content: 'Do not claim free',
  forbidden_terms: ['free'],
  replacement_terms: 'zero monthly fee',
  rationale: 'Pricing compliance',
  severity: 'warning',
  created_at: new Date().toISOString(),
};

const boundaryResult = runDeterministicChecks(boundaryText, [mockRuleFree], 'test');
console.log(`   Findings for term "free": ${boundaryResult.findings.length}`);
for (const f of boundaryResult.findings) {
  console.log(`   Matched: "${f.flagged_text}" at [${f.start_index}, ${f.end_index}]`);
}

// Should match isolated "free" at index 9..13, but NOT inside "freeze" or "freedom"
if (boundaryResult.findings.length !== 1 || boundaryResult.findings[0].start_index !== 9) {
  throw new Error(`Test 4 Failed: Expected exactly 1 match for "free" at index 9, got ${boundaryResult.findings.length}`);
}
console.log('✔ Test 4 Passed: Isolated words matched; embedded letters in "freeze" & "freedom" correctly ignored.');

// ------------------------------------------------------------------
// Test 5: Overlapping Matches Resolution
// ------------------------------------------------------------------
console.log('\nTest 5: Overlapping Matches Resolution...');
const overlapText = 'Our system is completely risk-free for all users.';

const mockRuleRiskFree = {
  id: 'rule-risk-free',
  brand_id: 'test',
  category: 'terminology',
  rule_key: 'TERM_RISK_FREE',
  title: 'No risk-free',
  content: '',
  forbidden_terms: ['risk-free'],
  replacement_terms: 'risk-mitigated',
  rationale: '',
  severity: 'violation', // higher severity + longer
  created_at: '',
};

const mockRuleFree2 = {
  id: 'rule-free',
  brand_id: 'test',
  category: 'terminology',
  rule_key: 'TERM_FREE',
  title: 'No free',
  content: '',
  forbidden_terms: ['free'],
  replacement_terms: 'transparent pricing',
  rationale: '',
  severity: 'warning', // lower severity + shorter
  created_at: '',
};

const overlapResult = runDeterministicChecks(overlapText, [mockRuleRiskFree, mockRuleFree2], 'test');
console.log(`   Overlap findings count: ${overlapResult.findings.length}`);
overlapResult.findings.forEach(f => console.log(`   - "${f.flagged_text}" (${f.rule_key}, ${f.severity})`));

if (overlapResult.findings.length !== 1 || overlapResult.findings[0].flagged_text !== 'risk-free') {
  throw new Error('Test 5 Failed: Expected longer/higher-severity "risk-free" to win over "free"');
}
console.log('✔ Test 5 Passed: Longer/higher-severity match resolved overlapping substring cleanly.');

// ------------------------------------------------------------------
// Test 6: Repeated Phrases Across Document
// ------------------------------------------------------------------
console.log('\nTest 6: Repeated Phrases at Multiple Offsets...');
const repeatedText = 'First mention of bulletproof security, followed by another bulletproof claim in paragraph two.';
const mockRuleBulletproof = {
  id: 'rule-bp',
  brand_id: 'test',
  category: 'terminology',
  rule_key: 'TERM_BP',
  title: 'No bulletproof',
  content: '',
  forbidden_terms: ['bulletproof'],
  replacement_terms: 'resilient',
  rationale: '',
  severity: 'violation',
  created_at: '',
};

const repeatedResult = runDeterministicChecks(repeatedText, [mockRuleBulletproof], 'test');
console.log(`   Repeated findings count: ${repeatedResult.findings.length}`);
repeatedResult.findings.forEach(f => console.log(`   - "${f.flagged_text}" at [${f.start_index}, ${f.end_index}]`));

if (repeatedResult.findings.length !== 2) {
  throw new Error(`Test 6 Failed: Expected 2 occurrences of "bulletproof", got ${repeatedResult.findings.length}`);
}
if (repeatedResult.findings[0].start_index === repeatedResult.findings[1].start_index) {
  throw new Error('Test 6 Failed: Repeated findings should have distinct start indices');
}
console.log('✔ Test 6 Passed: Multiple occurrences of the same term flagged at their respective exact offsets.');

// ------------------------------------------------------------------
// Test 7: Case-Sensitive Trademark Check
// ------------------------------------------------------------------
console.log('\nTest 7: Case-Sensitive Trademark Rules...');
const trademarkText = 'Try apex pay, Apexpay, and APEXPAY. But do not flag ApexPay!';
const tmRule = apexRules.find(r => r.rule_key === 'APEX_TRADEMARK_CASING');

const tmResult = runDeterministicChecks(trademarkText, [tmRule], 'apexpay');
console.log(`   Trademark findings count: ${tmResult.findings.length}`);
tmResult.findings.forEach(f => console.log(`   - Flagged: "${f.flagged_text}"`));

const flaggedTm = tmResult.findings.map(f => f.flagged_text);
if (!flaggedTm.includes('apex pay') || !flaggedTm.includes('Apexpay') || !flaggedTm.includes('APEXPAY')) {
  throw new Error('Test 7 Failed: Expected all mis-cased variants to be flagged');
}
if (flaggedTm.includes('ApexPay')) {
  throw new Error('Test 7 Failed: Properly capitalized "ApexPay" should NOT be flagged');
}
console.log('✔ Test 7 Passed: Mis-cased variants flagged; proper trademark casing ignored.');

// ------------------------------------------------------------------
// Test 8: Permitted Claim Qualification Requirement
// ------------------------------------------------------------------
console.log('\nTest 8: Permitted Claim Mandatory Qualification...');
const unqualifiedText = 'We provide zero monthly fee for all standard commercial accounts.';
const qualifiedText = 'We provide zero monthly fee for all standard commercial accounts, with standard per-transaction interchange applying.';

const claimRule = apexRules.find(r => r.rule_key === 'APEX_CLAIM_ZERO_MAINTENANCE');

const unqualResult = runDeterministicChecks(unqualifiedText, [claimRule], 'apexpay');
console.log(`   Unqualified claim findings: ${unqualResult.findings.length}`);
if (unqualResult.findings.length !== 1) {
  throw new Error('Test 8 Failed: Unqualified claim should be flagged with a warning');
}

const qualResult = runDeterministicChecks(qualifiedText, [claimRule], 'apexpay');
console.log(`   Qualified claim findings: ${qualResult.findings.length}`);
if (qualResult.findings.length !== 0) {
  throw new Error('Test 8 Failed: Qualified claim should NOT be flagged');
}
console.log('✔ Test 8 Passed: Unqualified claim flagged; properly qualified claim accepted without warning.');

// ------------------------------------------------------------------
// Test 9: Database Integration Test (runDeterministicChecksForBrand)
// ------------------------------------------------------------------
console.log('\nTest 9: Database Integration Test (runDeterministicChecksForBrand)...');
const dbResult = runDeterministicChecksForBrand(flawedDraft, 'apexpay');
console.log(`   Evaluated from DB: ${dbResult.total_rules_evaluated} rules, ${dbResult.findings.length} findings.`);
if (dbResult.total_rules_evaluated < 8 || dbResult.findings.length === 0) {
  throw new Error('Test 9 Failed: Failed to run checks using active DB rules');
}
console.log('✔ Test 9 Passed: Successfully loaded and executed active DB rules.');

// ------------------------------------------------------------------
// Test 10: Verdant Aura Positive Test (Flawed Clean Beauty Draft)
// ------------------------------------------------------------------
console.log('\nTest 10: Verdant Aura Positive Test (Flawed Clean Beauty Draft)...');
const flawedVADraft = `Introducing our miraculous formula that cures acne and is 100% natural and chemical-free. Enjoy zero emission shipping!`;
const vaRules = getBrandRules('verdant-aura');
const vaFlawedResult = runDeterministicChecks(flawedVADraft, vaRules, 'verdant-aura');

console.log(`   Verdant Aura rules evaluated: ${vaFlawedResult.total_rules_evaluated}`);
console.log(`   Verdant Aura findings count: ${vaFlawedResult.findings.length}`);
vaFlawedResult.findings.forEach(f => console.log(`   - "${f.flagged_text}" (${f.rule_key}, ${f.severity})`));

if (vaFlawedResult.findings.length < 4) {
  throw new Error(`Test 10 Failed: Expected at least 4 findings in flawed VA draft, got ${vaFlawedResult.findings.length}`);
}
console.log('✔ Test 10 Passed: Verdant Aura clean-beauty violations correctly caught.');

// ------------------------------------------------------------------
// Test 11: Verdant Aura Negative Test (Compliant Clean Beauty Draft)
// ------------------------------------------------------------------
console.log('\nTest 11: Verdant Aura Negative Test (Compliant Clean Beauty Draft)...');
const compliantVADraft = `Discover Verdant Aura botanical skincare. Formulated with 98.4% plant-derived ingredients and safe clean preservatives, our serum helps visibly diminish the appearance of fine lines. Packaged in 100% post-consumer recycled aluminum, with carbon-neutral delivery verified through Pachama reforestation credits.`;
const vaCompliantResult = runDeterministicChecks(compliantVADraft, vaRules, 'verdant-aura');

console.log(`   Findings count: ${vaCompliantResult.findings.length}, Cleanliness: ${vaCompliantResult.summary.cleanliness_score}`);
if (vaCompliantResult.findings.length !== 0 || !vaCompliantResult.summary.passed) {
  throw new Error(`Test 11 Failed: Compliant VA draft should have 0 findings`);
}
console.log('✔ Test 11 Passed: Compliant Verdant Aura draft passed cleanly.');

console.log('\n======================================================');
console.log('🎉 ALL 11/11 DETERMINISTIC ENGINE TESTS PASSED (100%)');
console.log('======================================================\n');
