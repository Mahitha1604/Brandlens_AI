import { runComprehensiveVerification } from '../src/lib/engine/verifier.ts';

const userText = `Regular exercise are highly beneficial for the human body, it helps to improve cardiovascular health and boosting immunity. Many people doesn't realize that even a short twenty minute walk can have a huge impact on your mental well-being, reducing stress and anxiety levels. If someone wants to improve their health, they should starts exercising daily, eating a balanced diet is also important. However, skipping meals or working out too hard can lead to injury or fatigue, so its crucial to listen to your body.`;

console.log('Testing user paragraph on current verifier.ts:');
const res = runComprehensiveVerification(userText, { name: 'BrandLens' });
console.log('Current deterministic findings count:', res.deterministicFindings.length);
for (const f of res.deterministicFindings) {
  console.log(`- "${f.flagged_text}" -> "${f.suggested_replacement}" (${f.rule_key})`);
}
