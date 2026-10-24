const userText = `Regular exercise are highly beneficial for the human body, it helps to improve cardiovascular health and boosting immunity. Many people doesn't realize that even a short twenty minute walk can have a huge impact on your mental well-being, reducing stress and anxiety levels. If someone wants to improve their health, they should starts exercising daily, eating a balanced diet is also important. However, skipping meals or working out too hard can lead to injury or fatigue, so its crucial to listen to your body.`;

async function testLiveReview() {
  const res = await fetch('http://localhost:3000/api/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brand_id: 'general',
      text: userText,
    }),
  });

  const json = await res.json();
  const data = json.data;
  console.log('HTTP Status:', res.status);
  console.log('Overall Passed:', data.overall_passed);
  console.log('Overall Score:', data.overall_score);

  const findings = data.deterministic?.findings || [];
  console.log(`Live HTTP returned ${findings.length} findings:`);
  for (const f of findings) {
    console.log(`- "${f.flagged_text}" -> "${f.suggested_replacement}" (${f.rule_key})`);
  }

  // Batch apply fixes
  const sorted = [...findings].sort((a, b) => b.start_index - a.start_index);
  let fixed = userText;
  for (const f of sorted) {
    fixed = fixed.slice(0, f.start_index) + f.suggested_replacement + fixed.slice(f.end_index);
  }

  console.log('\n=== RE-CHECKING CORRECTED COPY OVER LIVE HTTP ===');
  const res2 = await fetch('http://localhost:3000/api/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brand_id: 'general',
      text: fixed,
    }),
  });

  const json2 = await res2.json();
  const data2 = json2.data;
  console.log('HTTP Status:', res2.status);
  console.log('Overall Passed:', data2.overall_passed);
  console.log('Overall Score:', data2.overall_score);
  console.log('Remaining Findings:', data2.deterministic?.findings?.length || 0);
}

testLiveReview().catch(console.error);
