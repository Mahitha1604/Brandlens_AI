const userText = `Regular exercise are highly beneficial for the human body, it helps to improve cardiovascular health and boosting immunity. Many people doesn't realize that even a short twenty minute walk can have a huge impact on your mental well-being, reducing stress and anxiety levels. If someone wants to improve their health, they should starts exercising daily, eating a balanced diet is also important. However, skipping meals or working out too hard can lead to injury or fatigue, so its crucial to listen to your body.`;

const testRules = [
  // 1. Mass/Uncountable Nouns + Plural Verbs (exercise are -> exercise is)
  {
    name: 'Mass Noun Agreement',
    regex: /\b(exercise|research|information|evidence|advice|feedback|knowledge|content|traffic|equipment|software|hardware|marketing|health|nutrition|sleep|diet|stress|anxiety|progress|growth|revenue|pricing)\s+(are|were|have)\b/gi,
    extractFinding: (match) => {
      const verb = match[2].toLowerCase();
      const fixedVerb = verb === 'are' ? 'is' : verb === 'were' ? 'was' : 'has';
      const replacement = `${match[1]} ${fixedVerb}`;
      return {
        flagged: match[0],
        replacement,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        rationale: `Subject-verb agreement error: Mass noun "${match[1]}" is uncountable and requires singular verb "${fixedVerb}".`,
      };
    },
  },

  // 2. Comma Splice before Pronoun (body, it helps -> body; it helps)
  {
    name: 'Comma Splice with Pronoun',
    regex: /\b([a-zA-Z]+),\s+(it|he|she|they|we|this|that)\s+(is|helps|has|can|will|should|would|provides|makes|allows|gives|was|were|are|could|must|enables|leads)\b/gi,
    extractFinding: (match, fullText) => {
      // Check if current sentence began with a subordinating conjunction (If, When, Although, Because, etc.)
      const lastPeriod = Math.max(
        fullText.lastIndexOf('.', match.index),
        fullText.lastIndexOf(';', match.index),
        fullText.lastIndexOf('!', match.index),
        fullText.lastIndexOf('?', match.index)
      );
      const sentenceBeforeMatch = fullText.slice(lastPeriod === -1 ? 0 : lastPeriod + 1, match.index).trim();
      if (/^(?:if|when|whenever|although|though|even though|because|since|unless|while|as|whereas|after|before|until|once)\b/i.test(sentenceBeforeMatch)) {
        return null; // Subordinate clause followed by main clause: comma is grammatically required!
      }

      const word = match[1];
      const pronoun = match[2];
      const verb = match[3];
      const replacement = `${word}; ${pronoun} ${verb}`;
      return {
        flagged: match[0],
        replacement,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        rationale: `Comma splice: Two independent clauses cannot be joined by a comma alone. Use a semicolon (";") or period.`,
      };
    },
  },

  // 3. Coordinate Faulty Parallelism (to improve ... and boosting -> and boost)
  {
    name: 'Faulty Parallelism with Coordinate Gerund',
    regex: /\bto\s+([a-z]+)\s+((?:[a-z\-]+\s+){1,4})(and\s+([a-z]+ing))\b/gi,
    extractFinding: (match) => {
      const infinitiveBase = match[1];
      const andGerund = match[3];
      const gerund = match[4].toLowerCase();
      
      const irregulars = {
        boosting: 'boost', improving: 'improve', increasing: 'increase',
        reducing: 'reduce', saving: 'save', making: 'make', taking: 'take',
        giving: 'give', creating: 'create', building: 'build', running: 'run',
        getting: 'get', having: 'have', doing: 'do', sharing: 'share',
        helping: 'help', maintaining: 'maintain', providing: 'provide',
        growing: 'grow', eating: 'eat', drinking: 'drink', sleeping: 'sleep',
      };
      const base = irregulars[gerund] || (gerund.endsWith('ing') ? gerund.slice(0, -3) : gerund);
      const replacement = `and ${base}`;
      
      const prefixLength = match[0].indexOf(andGerund);
      const start = match.index + prefixLength;
      return {
        flagged: andGerund,
        replacement,
        startIndex: start,
        endIndex: start + andGerund.length,
        rationale: `Parallel structure error: Use base verb "${base}" to match the preceding infinitive "to ${infinitiveBase}".`,
      };
    },
  },

  // 4. Plural Subject "people doesn't" -> "people don't"
  {
    name: 'Plural Noun Agreement',
    regex: /\b(people|children|men|women|clients|customers|users|members|employees|patients|athletes|students|readers|viewers|adults|teenagers|seniors|workers)\s+(?:doesn't|doesnt)\b/gi,
    extractFinding: (match) => {
      return {
        flagged: match[0],
        replacement: `${match[1]} don't`,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        rationale: `Subject-verb agreement error: Plural noun "${match[1]}" requires "don't", not "doesn't".`,
      };
    },
  },

  // 5. Compound Adjective Hyphenation (twenty minute walk -> twenty-minute walk)
  {
    name: 'Compound Adjective Hyphenation',
    regex: /\b((?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|\d+))\s+(minute|hour|day|week|month|year|page|mile|step|stage|point|part|tier|star|dollar|percent)\s+(walk|run|meeting|call|break|trial|plan|course|subscription|series|workout|challenge|delay|limit|guarantee|policy|session|consultation|guide|program|test|review|window|contract|audit|sprint|warranty|countdown|rest)\b/gi,
    extractFinding: (match) => {
      const num = match[1];
      const unit = match[2];
      const noun = match[3];
      return {
        flagged: match[0],
        replacement: `${num}-${unit} ${noun}`,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        rationale: `Compound adjective: Hyphenate compound modifier preceding a noun (e.g., "${num}-${unit} ${noun}").`,
      };
    },
  },

  // 6. Modal Auxiliary + Inflected Verb (should starts -> should start)
  {
    name: 'Modal Auxiliary Verb Agreement',
    regex: /\b(should|could|would|must|can|cannot|can't|might|may|will|won't|shall)\s+(starts|helps|works|takes|runs|makes|gives|provides|allows|offers|enables|leads|eats|drinks|sleeps|walks|goes|does|has|knows|feels|keeps|brings|begins|creates|builds|saves|uses|shows|comes|sees|needs|tries)\b/gi,
    extractFinding: (match) => {
      const modal = match[1];
      const verb = match[2].toLowerCase();
      let base = verb;
      if (verb === 'has') base = 'have';
      else if (verb === 'does') base = 'do';
      else if (verb === 'goes') base = 'go';
      else if (verb === 'tries') base = 'try';
      else if (verb.endsWith('es') && (verb.endsWith('shes') || verb.endsWith('ches') || verb.endsWith('sses') || verb.endsWith('xes'))) base = verb.slice(0, -2);
      else if (verb.endsWith('s')) base = verb.slice(0, -1);

      return {
        flagged: match[0],
        replacement: `${modal} ${base}`,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        rationale: `Modal auxiliary error: Modal verb "${modal}" must be followed by base verb form "${base}", not inflected "-s" form.`,
      };
    },
  },

  // 7. Comma Splice before Gerund Clause (daily, eating -> daily; eating)
  {
    name: 'Comma Splice with Gerund Clause',
    regex: /\b([a-zA-Z]+),\s+(eating|taking|getting|having|doing|skipping|working|sleeping|exercising|maintaining|following|drinking|consuming|running)\s+((?:[a-zA-Z]+\s+){0,4}(?:is|are|can|will|should|helps))\b/gi,
    extractFinding: (match) => {
      const word = match[1];
      const gerund = match[2];
      const fullClause = match[3];
      const flagged = `${word}, ${gerund}`;
      const replacement = `${word}; ${gerund}`;
      return {
        flagged,
        replacement,
        startIndex: match.index,
        endIndex: match.index + flagged.length,
        rationale: `Comma splice: Independent clauses cannot be joined by a comma alone. Use a semicolon (";") or period.`,
      };
    },
  },

  // 8. Contraction its vs it's (its crucial -> it's crucial)
  {
    name: 'Contraction its vs it\'s',
    regex: /\bits\s+(a|an|the|our|your|my|not|always|never|time|ready|easy|fast|simple|free|great|important|clear|safe|designed|built|proven|new|better|best|possible|essential|crucial|vital|obvious|true|hard|difficult|worth|likely|unlikely|recommended|going|available|powered|backed)\b/gi,
    extractFinding: (match) => {
      return {
        flagged: match[0],
        replacement: match[0].replace(/^its\s+/i, (m) => /^[A-Z]/.test(m) ? "It's " : "it's "),
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        rationale: `Punctuation error: Use contraction "it's" (it is), not possessive "its".`,
      };
    },
  },
];

console.log('Testing prototype grammar rules against user text...\n');

const findings = [];
for (const rule of testRules) {
  let m;
  while ((m = rule.regex.exec(userText)) !== null) {
    const f = rule.extractFinding(m, userText);
    if (f) {
      findings.push({ ruleName: rule.name, ...f });
    }
  }
}

console.log(`Found ${findings.length} flaws in user text:`);
for (const f of findings) {
  const slice = userText.slice(f.startIndex, f.endIndex);
  const matchOk = slice === f.flagged ? '✓' : '✗ MISMATCH!';
  console.log(`- [${matchOk}] "${f.flagged}" -> "${f.replacement}" (Offset: ${f.startIndex}..${f.endIndex})`);
  console.log(`    ${f.rationale}`);
}

// Now test batch replacement (descending by startIndex)
console.log('\nTesting batch replacement (Auto-Fix All)...');
const sorted = [...findings].sort((a, b) => b.startIndex - a.startIndex);
let correctedText = userText;
for (const f of sorted) {
  correctedText = correctedText.slice(0, f.startIndex) + f.replacement + correctedText.slice(f.endIndex);
}

console.log('\n--- Corrected Text ---');
console.log(correctedText);

// Re-check corrected text with the rules to verify 0 findings
let remainingFlaws = 0;
for (const rule of testRules) {
  rule.regex.lastIndex = 0;
  let m;
  while ((m = rule.regex.exec(correctedText)) !== null) {
    const f = rule.extractFinding(m, correctedText);
    if (f) {
      console.log(`Remaining flaw: "${f.flagged}" from rule ${rule.name}`);
      remainingFlaws++;
    }
  }
}

console.log(`\nRemaining flaws after auto-fix: ${remainingFlaws} (Expected: 0)`);
