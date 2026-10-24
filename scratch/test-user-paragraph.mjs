import { runComprehensiveVerification } from '../src/lib/engine/verifier.ts';

const userText = `Regular exercise are highly beneficial for the human body, it helps to improve cardiovascular health and boosting immunity. Many people doesn't realize that even a short twenty minute walk can have a huge impact on your mental well-being, reducing stress and anxiety levels. If someone wants to improve their health, they should starts exercising daily, eating a balanced diet is also important. However, skipping meals or working out too hard can lead to injury or fatigue, so its crucial to listen to your body.`;

console.log('=== STEP 1: INITIAL VERIFICATION ===');
const initialResult = runComprehensiveVerification(userText, { name: 'BrandLens' });
const allFindings = [...initialResult.deterministicFindings, ...initialResult.contextualFindings];

console.log(`Total findings detected: ${allFindings.length}`);
let offsetErrors = 0;

for (const f of allFindings) {
  const slice = userText.slice(f.start_index, f.end_index);
  const isMatch = slice === f.flagged_text;
  if (!isMatch) offsetErrors++;
  console.log(`- [${isMatch ? 'OK' : 'MISMATCH'}] "${f.flagged_text}" -> "${f.suggested_replacement || f.suggested_correction}" (Offset: ${f.start_index}..${f.end_index})`);
  console.log(`  Rationale: ${f.rationale || f.explanation}`);
}

if (offsetErrors > 0) {
  console.error(`\nFAILED: Found ${offsetErrors} character offset mismatches!`);
  process.exit(1);
}

console.log('\n=== STEP 2: AUTO-FIX ALL BATCH REPLACEMENT ===');
// Descending sort by start_index
const sortedFindings = [...initialResult.deterministicFindings]
  .filter((f) => Boolean(f.suggested_replacement))
  .sort((a, b) => b.start_index - a.start_index);

let currentText = userText;
let appliedCount = 0;

for (const f of sortedFindings) {
  const start = f.start_index;
  const end = f.end_index;
  const slice = currentText.slice(start, end);
  if (slice.toLowerCase() === f.flagged_text.toLowerCase()) {
    currentText = currentText.slice(0, start) + f.suggested_replacement + currentText.slice(end);
    appliedCount++;
  }
}

console.log(`Applied ${appliedCount} corrections.`);
console.log('\n=== RESULTING CORRECTED TEXT ===');
console.log(currentText);

console.log('\n=== STEP 3: RE-VERIFICATION OF CORRECTED TEXT ===');
const recheckResult = runComprehensiveVerification(currentText, { name: 'BrandLens' });
const remainingFindings = [...recheckResult.deterministicFindings, ...recheckResult.contextualFindings];

console.log(`Remaining findings: ${remainingFindings.length}`);
console.log(`Cleanliness score: ${recheckResult.cleanlinessScore}%`);
console.log(`Overall passed: ${recheckResult.overallPassed}`);

if (remainingFindings.length > 0) {
  console.error('FAILED: Flaws remain after auto-fix:');
  for (const f of remainingFindings) {
    console.log(`- "${f.flagged_text}" (${f.rule_key || f.category})`);
  }
  process.exit(1);
}

console.log('\nSUCCESS! Clean copy verified: 0 flaws, 100% compliance score.');
