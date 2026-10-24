const newUserText = `Eating healthy are very important for your body and mind because without proper nutrition you will feel tired all the time, many people thinks that skipping breakfast help them lose weight fastly but it actually lowers your metabolism and makes you overeat later in the day. If a person wants to improve their health they should drink more water, exercising daily, and avoids sugary drinks which causes inflammation and weight gain. Doctors always says to get eight hours of sleep every night but who has time for that?`;

async function testLiveReview() {
  const res = await fetch('http://localhost:3000/api/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brand_id: 'general',
      text: newUserText,
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
  let fixed = newUserText;
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
