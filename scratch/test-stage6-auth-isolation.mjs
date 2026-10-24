import assert from 'node:assert';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashToken,
} from '../src/lib/auth.ts';
import {
  createUser,
  findUserByEmail,
  findUserById,
  createSession,
  findSessionByTokenHash,
  deleteSession,
  getBrands,
  getBrandById,
  createBrand,
  deleteBrand,
  getBrandRules,
  createOrUpdateBrandRule,
  deleteBrandRule,
  getDrafts,
  saveDraft,
  updateDraftStatusAndDecision,
  getAppStats,
} from '../src/lib/db.ts';

console.log('=== BRANDLENS AI: STAGE 6 AUTH & DATA ISOLATION VERIFICATION ===\n');

// 1. Password Hashing & Salt Verification
console.log('1. Testing Password Security (scrypt + 16-byte random salt)...');
const rawPassword = 'SuperSecretPassword123!';
const hash1 = hashPassword(rawPassword);
const hash2 = hashPassword(rawPassword);

assert.notStrictEqual(hash1, rawPassword, 'Password must not be stored in plaintext');
assert(hash1.startsWith('scrypt:'), 'Hash format must use scrypt prefix');
assert.notStrictEqual(hash1, hash2, 'Identical passwords must produce distinct hashes due to random salts');
assert.strictEqual(verifyPassword(rawPassword, hash1), true, 'Valid password must verify against its hash');
assert.strictEqual(verifyPassword('WrongPassword', hash1), false, 'Invalid password must fail verification');
console.log('   ✓ scrypt cryptographic hashing & salting verified.');

// 2. Session Token & Hash Verification
console.log('\n2. Testing 256-bit Cryptographic Session Tokens...');
const sessionToken = generateSessionToken();
const tokenHash = hashToken(sessionToken);
assert.strictEqual(sessionToken.length, 64, 'Token must be 32 bytes (64 hex characters)');
assert.strictEqual(tokenHash.length, 64, 'SHA-256 hash must be 64 hex characters');
console.log('   ✓ Session token generation & SHA-256 hashing verified.');

// 3. Multi-User Creation & Isolation
console.log('\n3. Testing Multi-User Account Creation in SQLite...');
const timestamp = Date.now();
const user1Email = `copywriter_${timestamp}@acme.test`;
const user2Email = `reviewer_${timestamp}@fintech.test`;

const user1 = createUser({
  email: user1Email,
  password_hash: hashPassword('Pass123456!'),
  name: 'Alice Copywriter',
  role: 'copywriter',
});

const user2 = createUser({
  email: user2Email,
  password_hash: hashPassword('Pass123456!'),
  name: 'Bob Reviewer',
  role: 'reviewer',
});

assert.strictEqual(user1.role, 'copywriter');
assert.strictEqual(user2.role, 'reviewer');
assert.strictEqual(user1.onboarding_completed, false);
console.log(`   ✓ Created User 1: ${user1.name} (${user1.id})`);
console.log(`   ✓ Created User 2: ${user2.name} (${user2.id})`);

// 4. Clean Workspace (Zero Brands for New Users)
console.log('\n4. Verifying Empty Workspace for New Users...');
const user1Brands = getBrands(user1.id, false);
const user1Stats = getAppStats(user1.id, false);
assert.strictEqual(user1Brands.length, 0, 'New user workspace must start with 0 brands');
assert.strictEqual(user1Stats.brands_count, 0, 'Stats brands_count must be 0');
assert.strictEqual(user1Stats.rules_count, 0, 'Stats rules_count must be 0');
assert.strictEqual(user1Stats.drafts_count, 0, 'Stats drafts_count must be 0');
console.log('   ✓ New user workspace correctly isolated with 0 brands & 0 stats.');

// 5. Demo Mode Isolation Check
console.log('\n5. Verifying Demo Mode Isolation...');
const demoBrands = getBrands(null, true);
const demoStats = getAppStats(null, true);
assert(demoBrands.length >= 2, 'Demo mode must return at least 2 sample brands (ApexPay, Verdant Aura)');
assert(demoBrands.some((b) => b.id === 'apexpay'), 'ApexPay must be in demo brands');
assert(demoStats.brands_count >= 2, 'Demo stats must reflect demo brands');
assert(demoStats.rules_count > 0, 'Demo stats must reflect demo rules');
console.log(`   ✓ Demo mode isolated with ${demoBrands.length} sample brands (${demoStats.rules_count} rules).`);

// 6. User 1 Creates Brand & Rules
console.log('\n6. Testing Brand & Rule Creation for User 1...');
const brand1 = createBrand({
  name: `Acme Cloud ${timestamp}`,
  industry: 'Enterprise Cloud Infrastructure',
  description: 'Scalable multi-cloud orchestration for financial institutions.',
  tone_guidelines: 'Authoritative, calm, and rigorous.',
  disclaimers: 'Services subject to SLA tier 4 terms.',
  user_id: user1.id,
});

const rule1 = createOrUpdateBrandRule({
  brand_id: brand1.id,
  category: 'terminology',
  rule_key: 'NO_HACK_PROOF',
  title: 'Prohibit "Hack-Proof" Claim',
  content: 'Never state cloud infrastructure is hack-proof.',
  forbidden_terms: ['hack-proof', 'unbreakable security'],
  replacement_terms: 'defense-in-depth security architecture',
  rationale: 'Cybersecurity compliance standards require accurate posture representation.',
  severity: 'violation',
});

assert.strictEqual(brand1.user_id, user1.id);
const user1RefreshedBrands = getBrands(user1.id, false);
assert.strictEqual(user1RefreshedBrands.length, 1, 'User 1 must now have 1 brand');
assert.strictEqual(user1RefreshedBrands[0].id, brand1.id);
console.log(`   ✓ User 1 created brand "${brand1.name}" with rule "${rule1.title}".`);

// 7. Isolation Check: User 2 CANNOT see User 1's Brand
console.log('\n7. Verifying Cross-User Isolation (User 2 vs User 1)...');
const user2Brands = getBrands(user2.id, false);
assert.strictEqual(user2Brands.length, 0, 'User 2 must NOT see User 1 brands');
const user2AccessBrand1 = getBrandById(brand1.id, user2.id);
assert.strictEqual(user2AccessBrand1, null, 'User 2 accessing User 1 brand by ID must return null');
console.log('   ✓ User 2 strictly isolated from User 1 brand profile.');

// 8. Protected Sample Brands Cannot Be Deleted
console.log('\n8. Verifying Sample Brand Protection Against Deletion...');
const deleteSampleResult = deleteBrand('apexpay', user1.id);
assert.strictEqual(deleteSampleResult, false, 'deleteBrand must reject deleting protected sample brands');
console.log('   ✓ Protected sample brand deletion prevented.');

// 9. Unauthorized Deletion Check
console.log('\n9. Verifying User 2 cannot delete User 1 brand...');
const unauthorizedDelete = deleteBrand(brand1.id, user2.id);
assert.strictEqual(unauthorizedDelete, false, 'User 2 must NOT be allowed to delete User 1 brand');
assert.notStrictEqual(getBrandById(brand1.id, user1.id), null, 'Brand 1 must still exist');
console.log('   ✓ Unauthorized brand deletion blocked.');

// 10. Role-Based Governance Enforcement: Copywriter vs Reviewer
console.log('\n10. Testing Role-Based Governance & Approvals...');
const draft1 = saveDraft({
  brand_id: brand1.id,
  title: 'Cloud Launch Ad Copy',
  content: 'Experience our scalable multi-cloud platform with enterprise defense-in-depth.',
  channel: 'landing_page',
  target_audience: 'CTOs',
  created_by: user1.name,
  user_id: user1.id,
});

assert.strictEqual(draft1.status, 'draft');

// Copywriter submits for review
const submittedDraft = updateDraftStatusAndDecision(
  draft1.id,
  'under_review',
  user1.name,
  user1.role,
  'Ready for brand review',
  user1.id
);
assert.strictEqual(submittedDraft.status, 'under_review');
console.log('   ✓ Copywriter successfully submitted draft for review.');

// Reviewer approves draft
const approvedDraft = updateDraftStatusAndDecision(
  draft1.id,
  'approved',
  user2.name,
  user2.role,
  'Copy conforms to all brand guidelines.',
  user2.id
);
assert.strictEqual(approvedDraft.status, 'approved');
console.log('   ✓ Compliance reviewer approved draft.');

// Rule: Any edit to approved draft invalidates approval and resets status to draft
const editedDraft = saveDraft({
  id: draft1.id,
  brand_id: brand1.id,
  title: 'Cloud Launch Ad Copy',
  content: 'Modified text after approval.',
  user_id: user1.id,
});
assert.strictEqual(editedDraft.status, 'draft', 'Editing approved copy must invalidate approval');
console.log('   ✓ Edit to approved content correctly resets status to draft.');

// 11. Brand Deletion with Full Cascading Removal
console.log('\n11. Testing Brand Deletion with Cascading Cleanup...');
const deleteResult = deleteBrand(brand1.id, user1.id);
assert.strictEqual(deleteResult, true, 'User 1 must be able to delete their own brand');
const user1FinalBrands = getBrands(user1.id, false);
assert.strictEqual(user1FinalBrands.length, 0, 'User 1 brand list must be empty after deletion');
const user1FinalRules = getBrandRules(brand1.id);
assert.strictEqual(user1FinalRules.length, 0, 'Brand rules must be deleted on brand deletion');
const user1FinalDrafts = getDrafts(brand1.id, user1.id);
assert.strictEqual(user1FinalDrafts.length, 0, 'Brand drafts must be deleted on brand deletion');
console.log('   ✓ Brand deleted with cascading cleanup of rules and drafts.');

console.log('\n=== ALL 11 AUTHENTICATION & DATA ISOLATION CHECKS PASSED! ===');
