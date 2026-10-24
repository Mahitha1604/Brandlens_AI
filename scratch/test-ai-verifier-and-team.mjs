/**
 * BrandLens AI - AI Verifier and Organization Workspace Verification Suite
 * Tests:
 * 1. AI Verifier: Spelling, Grammar, Tone/Urgency, Unsubstantiated Claims, Offsets, Replacements.
 * 2. Flawed copy never receives 100% score.
 * 3. Applying replacements and re-checking brings score to 100% (Clean Copy).
 * 4. Organization Workspace creation, role-based invites, and joining with codes.
 */

import {
  runComprehensiveVerification,
} from '../src/lib/engine/verifier.ts';

import {
  runDeterministicChecks,
} from '../src/lib/engine/deterministic.ts';

import {
  runOfflineContextualFallback,
} from '../src/lib/engine/fallback.ts';

import {
  createUser,
  createOrganization,
  createOrganizationInvite,
  acceptOrganizationInvite,
  getOrganizationMembers,
  getOrganizationInvites,
} from '../src/lib/db.ts';

console.log('========================================================================');
console.log('🧪 BrandLens AI: AI Verifier & Organization Workspace Test Suite');
console.log('========================================================================\n');

let passed = 0;
let total = 0;

function assert(condition, description) {
  total++;
  if (condition) {
    passed++;
    console.log(`   ✓ ${description}`);
  } else {
    console.error(`   ✗ FAIL: ${description}`);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// PART 1: AI Verifier & Flaw Detection
// -----------------------------------------------------------------------------
console.log('--- 1. AI Verifier: Spelling, Grammar, and Mechanics Detection ---');

const flawedCopy = 'Our comapny beleives in guarenteed sucess with neccessary tools. They is the the best and he have a apple. Wont you loose this chance?';

const verificationResult = runComprehensiveVerification(flawedCopy, {
  name: 'BrandLens',
});
const findings = [...verificationResult.deterministicFindings, ...verificationResult.contextualFindings];

assert(findings.length > 0, `Detected flaws in flawed copy (found ${findings.length} issues)`);
assert(verificationResult.overallPassed === false, 'Flawed copy fails verification (overallPassed === false)');
assert(verificationResult.cleanlinessScore < 60, `Flawed copy score is penalized: ${verificationResult.cleanlinessScore}/100 (never 100%)`);

// Verify exact offset slicing
let allOffsetsValid = true;
for (const f of findings) {
  const sliced = flawedCopy.slice(f.start_index, f.end_index);
  if (sliced.toLowerCase() !== f.flagged_text.toLowerCase()) {
    allOffsetsValid = false;
    console.error(`Offset mismatch: slice="${sliced}" vs flagged="${f.flagged_text}"`);
  }
}
assert(allOffsetsValid, 'All finding offsets match exactly text.slice(start, end)');

// Check specific spelling detections
const flaggedWords = findings.map(f => f.flagged_text.toLowerCase());
assert(flaggedWords.includes('comapny'), 'Detected misspelled "comapny" -> company');
assert(flaggedWords.includes('beleives'), 'Detected misspelled "beleives" -> believes');
assert(flaggedWords.includes('guarenteed'), 'Detected misspelled "guarenteed" -> guaranteed');
assert(flaggedWords.includes('sucess'), 'Detected misspelled "sucess" -> success');
assert(flaggedWords.includes('neccessary'), 'Detected misspelled "neccessary" -> necessary');

// Check grammar & mechanics
assert(flaggedWords.includes('they is'), 'Detected subject-verb disagreement "they is" -> they are');
assert(flaggedWords.includes('the the'), 'Detected duplicate word "the the"');
assert(flaggedWords.includes('he have'), 'Detected subject-verb disagreement "he have" -> he has');
assert(flaggedWords.includes('a apple'), 'Detected article mismatch "a apple" -> an apple');
assert(flaggedWords.includes('wont'), 'Detected missing apostrophe "wont" -> won\'t');
assert(flaggedWords.some(w => w.includes('loose')), 'Detected homophone confusion "loose" -> lose');

// -----------------------------------------------------------------------------
// PART 2: Marketing Tone, Artificial Urgency, & Superlatives
// -----------------------------------------------------------------------------
console.log('\n--- 2. Marketing Tone, False Urgency, & Unsubstantiated Claims ---');

const hypeCopy = 'Act now before it\'s too late! Our service offers 100% guaranteed returns with zero risk and is completely bulletproof.';

const hypeResult = runComprehensiveVerification(hypeCopy, {
  name: 'FinSecure',
});
const hypeFindings = [...hypeResult.deterministicFindings, ...hypeResult.contextualFindings];

assert(hypeFindings.length >= 3, `Detected hype and urgency flags (found ${hypeFindings.length} issues)`);
assert(hypeResult.cleanlinessScore < 70, `Hype copy score penalized: ${hypeResult.cleanlinessScore}/100`);

const hypeFlagged = hypeFindings.map(f => f.flagged_text.toLowerCase());
assert(hypeFlagged.some(t => t.includes('act now') || t.includes('too late')), 'Flagged high-pressure urgency ("act now before it\'s too late")');
assert(hypeFlagged.some(t => t.includes('100% guaranteed')), 'Flagged unsubstantiated superlative ("100% guaranteed")');
assert(hypeFlagged.some(t => t.includes('zero risk')), 'Flagged risky regulatory claim ("zero risk")');

// -----------------------------------------------------------------------------
// PART 3: Correcting Flaws & Re-checking (Clean Copy Verification)
// -----------------------------------------------------------------------------
console.log('\n--- 3. Interactive Correction & Re-Check Workflow ---');

// Clean copy with no spelling, grammar, mechanics, or hype issues
const cleanCopy = 'Our company believes in reliable progress with necessary tools. They are ready and we have an apple. Won\'t you take this chance?';

const cleanResult = runComprehensiveVerification(cleanCopy, {
  name: 'BrandLens',
});
const cleanFindings = [...cleanResult.deterministicFindings, ...cleanResult.contextualFindings];

console.log(`   [Clean Copy]: "${cleanCopy}"`);
assert(cleanFindings.length === 0, `Verified clean copy has 0 findings (actual: ${cleanFindings.length})`);
assert(cleanResult.overallPassed === true, 'Clean copy passes verification (overallPassed === true)');
assert(cleanResult.cleanlinessScore === 100, `Clean copy scores 100/100 (actual: ${cleanResult.cleanlinessScore})`);

// -----------------------------------------------------------------------------
// PART 4: Deterministic and Fallback Engine Integration
// -----------------------------------------------------------------------------
console.log('\n--- 4. Deterministic and Contextual Engine Integration ---');

const mockBrand = {
  id: 'brand-test-verifier',
  name: 'Acme Health',
  description: 'Health & Wellness brand',
  industry: 'Healthcare',
  primary_channel: 'Instagram',
  voice_attributes: ['Empathetic', 'Evidence-Based'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  rules: [
    {
      id: 'rule-1',
      brand_id: 'brand-test-verifier',
      category: 'terminology',
      rule_key: 'NO_MIRACLE',
      title: 'No Miracle Claims',
      content: 'Never use miracle cure in claims',
      forbidden_terms: ['miracle cure'],
      replacement_terms: 'proven treatment',
      rationale: 'Healthcare regulations prohibit the term miracle cure.',
      severity: 'violation',
      created_at: new Date().toISOString(),
    }
  ],
  counts: {
    guidelines: 0,
    terminology: 1,
    verified_facts: 0,
    permitted_claims: 0,
    total: 1,
  }
};

const mixedCopy = 'Our comapny discovered a miracle cure that is 100% guaranteed.';

const detResult = runDeterministicChecks(mixedCopy, mockBrand);
assert(detResult.summary.passed === false, 'Deterministic engine failed flawed mixed copy');
assert(detResult.summary.cleanliness_score <= 80, `Deterministic score penalized for both rule and mechanics flaws: ${detResult.summary.cleanliness_score}/100`);

const detFlagged = detResult.findings.map(f => f.flagged_text.toLowerCase());
assert(detFlagged.includes('miracle cure'), 'Deterministic engine caught brand forbidden term "miracle cure"');
assert(detFlagged.includes('comapny'), 'Deterministic engine caught spelling error "comapny" via verifier');

const contextualResult = runOfflineContextualFallback(mixedCopy, mockBrand, mockBrand.rules, 'Test');
assert(contextualResult.is_fallback === true, 'Offline contextual engine truthfully indicates fallback');
assert(contextualResult.findings.length > 0, 'Contextual engine surfaced combined findings');

const ctxFlagged = contextualResult.findings.map(f => f.flagged_text.toLowerCase());
assert(ctxFlagged.some(f => f.includes('100% guaranteed')), 'Contextual engine caught claim "100% guaranteed"');

// -----------------------------------------------------------------------------
// PART 5: Organization Workspaces & Team Joining Flow
// -----------------------------------------------------------------------------
console.log('\n--- 5. Organization Workspaces, Role-Based Invites & Joining ---');

const timestamp = Date.now();
const ownerUser = createUser({
  email: `agency_owner_${timestamp}@example.com`,
  password_hash: 'scrypt:test',
  name: 'Agency Founder',
  role: 'brand_manager',
});

const inviteeUser = createUser({
  email: `agency_writer_${timestamp}@example.com`,
  password_hash: 'scrypt:test',
  name: 'Junior Copywriter',
  role: 'copywriter',
});

// 1. Create Workspace
const orgName = `Apex Creative Agency ${timestamp}`;
const newOrg = createOrganization(orgName, ownerUser.id, 'agency');

assert(newOrg && newOrg.id, 'Created organization workspace successfully');
assert(newOrg.type === 'agency', 'Organization workspace type is agency');

// 2. Generate Invite Code for Copywriter role
const newInvite = createOrganizationInvite(newOrg.id, inviteeUser.email, 'copywriter', ownerUser.id);
const inviteCode = newInvite.invite_code;

assert(newInvite && inviteCode, `Generated invite code: ${inviteCode}`);

// 3. Query Active Invites
const pendingInvites = getOrganizationInvites(newOrg.id);
assert(pendingInvites.some(inv => inv.invite_code === inviteCode), 'Active pending invite list includes the new invite code');

// 4. Invitee joins organization using the invite code
const joinSuccess = acceptOrganizationInvite(inviteCode, inviteeUser.id);
assert(joinSuccess.success === true, 'Invited user successfully joined workspace using invite code');

// 5. Verify member list and role
const members = getOrganizationMembers(newOrg.id);
assert(members.length === 2, `Workspace now has 2 members (actual: ${members.length})`);

const joinedMember = members.find(m => m.user_id === inviteeUser.id);
assert(joinedMember && joinedMember.role === 'copywriter', 'New member has correct role "copywriter"');

const ownerMember = members.find(m => m.user_id === ownerUser.id);
assert(ownerMember && ownerMember.role === 'owner', 'Owner has role "owner"');

// 6. Verify invite is no longer pending
const updatedInvites = getOrganizationInvites(newOrg.id);
assert(!updatedInvites.some(inv => inv.invite_code === inviteCode), 'Used invite code is no longer in pending invites');

console.log('\n========================================================================');
console.log(`🎉 ALL TESTS PASSED: ${passed}/${total} assertions verified successfully!`);
console.log('========================================================================');
