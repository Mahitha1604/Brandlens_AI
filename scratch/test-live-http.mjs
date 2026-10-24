async function testLive2() {
  try {
    const res = await fetch('http://localhost:3000/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand_id: 'general',
        text: "Its easy to get more better results if you don't loose your customers. Did you went to their office?",
      }),
    });
    const json = await res.json();
    console.log('HTTP Status:', res.status);
    console.log('Success:', json.success);
    console.log('Deterministic Findings Count:', json.data?.deterministic?.findings?.length);
    for (const f of json.data?.deterministic?.findings || []) {
      console.log(` - Flagged: "${f.flagged_text}" -> Suggested: "${f.suggested_replacement}" (${f.rule_key})`);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testLive2();
