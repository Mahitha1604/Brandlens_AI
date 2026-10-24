/**
 * Prototype and test expanded rules for the user's exact paragraph
 */

const userText = `Regular exercise are highly beneficial for the human body, it helps to improve cardiovascular health and boosting immunity. Many people doesn't realize that even a short twenty minute walk can have a huge impact on your mental well-being, reducing stress and anxiety levels. If someone wants to improve their health, they should starts exercising daily, eating a balanced diet is also important. However, skipping meals or working out too hard can lead to injury or fatigue, so its crucial to listen to your body.`;

console.log('Original Text:\n', userText);
console.log('\n--- Flaws Present in Text ---');
console.log('1. "exercise are" -> Subject-verb agreement (mass noun "exercise" is singular -> "exercise is")');
console.log('2. "body, it helps" -> Comma splice (run-on sentence -> "body. It helps" or "body; it helps")');
console.log('3. "to improve ... and boosting" -> Faulty parallel structure -> "to improve ... and boost"');
console.log('4. "people doesn\'t" -> Subject-verb agreement (plural "people" -> "people don\'t")');
console.log('5. "twenty minute walk" -> Missing hyphen in compound adjective -> "twenty-minute walk"');
console.log('6. "should starts" -> Modal auxiliary error (modal "should" takes base verb -> "should start")');
console.log('7. "daily, eating" -> Comma splice / run-on sentence -> "daily. Eating" or "daily; eating"');
console.log('8. "its crucial" -> Contraction homophone / missing apostrophe -> "it\'s crucial"');
