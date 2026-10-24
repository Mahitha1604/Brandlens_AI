const newUserText = `Eating healthy are very important for your body and mind because without proper nutrition you will feel tired all the time, many people thinks that skipping breakfast help them lose weight fastly but it actually lowers your metabolism and makes you overeat later in the day. If a person wants to improve their health they should drink more water, exercising daily, and avoids sugary drinks which causes inflammation and weight gain. Doctors always says to get eight hours of sleep every night but who has time for that?`;

const testRules = [
  // 1. Gerund / Action phrase subject + are/were/have (Eating healthy are -> Eating healthy is)
  {
    name: 'Gerund Subject Agreement',
    regex: /\b([A-Z][a-z]+ing(?:\s+[a-z]+){0,3})\s+(are|were|have)\b/g,
    fix: (m) => {
      const parts = m.split(/\s+/);
      const verb = parts[parts.length - 1];
      const prefix = parts.slice(0, parts.length - 1).join(' ');
      const fixed = verb === 'are' ? 'is' : verb === 'were' ? 'was' : 'has';
      return `${prefix} ${fixed}`;
    },
    explanation: 'Subject-verb agreement: A gerund phrase acting as a singular action requires a singular verb (e.g., "Eating healthy is").',
  },

  // 2. Plural subjects + 3rd person singular verb ending in -s (people thinks -> people think, Doctors always says -> Doctors always say)
  {
    name: 'Plural Subject with Singular Verb -s',
    regex: /\b(many\s+people|most\s+people|some\s+people|all\s+people|people|children|men|women|doctors|experts|scientists|researchers|studies|reports|results|users|clients|customers|members|employees|athletes|patients)\s+(?:always\s+|never\s+|often\s+|usually\s+|actually\s+|sometimes\s+|generally\s+)?(thinks|says|believes|knows|wants|needs|helps|works|takes|runs|makes|gives|provides|allows|causes|shows|suggests|indicates|leads|eats|drinks)\b/gi,
    fix: (m) => {
      const parts = m.split(/\s+/);
      const verb = parts[parts.length - 1];
      const prefix = parts.slice(0, parts.length - 1).join(' ');
      const base = verb.endsWith('es') && (verb.endsWith('shes') || verb.endsWith('ches') || verb.endsWith('sses')) ? verb.slice(0, -2) : verb.slice(0, -1);
      return `${prefix} ${base}`;
    },
    explanation: 'Subject-verb agreement: Plural subject requires base verb without "-s" (e.g., "people think", "doctors always say").',
  },

  // 3. Singular Gerund Subject + Base Verb Missing -s (skipping breakfast help them -> skipping breakfast helps them)
  {
    name: 'Singular Gerund Subject Missing -s',
    regex: /\b([a-z]+ing\s+[a-z]+)\s+(help|improve|boost|keep|lead|make|give|provide|allow|cause|require)\s+(them|you|us|him|her|it|people|users|to)\b/gi,
    fix: (m, _text, matchArr) => {
      const subject = matchArr[1];
      const verb = matchArr[2];
      const obj = matchArr[3];
      const fixedVerb = verb === 'make' ? 'makes' : verb === 'give' ? 'gives' : verb + 's';
      return `${subject} ${fixedVerb} ${obj}`;
    },
    explanation: 'Subject-verb agreement: Singular action/gerund requires verb ending in "-s" (e.g., "skipping breakfast helps").',
  },

  // 4. Non-standard adverb "fastly" -> "fast"
  {
    name: 'Non-standard adverb fastly',
    regex: /\bfastly\b/gi,
    fix: () => 'fast',
    explanation: 'Word choice error: "Fastly" is not a word in standard English. Use the adverb "fast".',
  },

  // 5. Missing comma after introductory conditional clause (If ... they should -> If ..., they should)
  {
    name: 'Introductory Conditional Clause Missing Comma',
    regex: /\b(if\s+[a-z\s]+?\s+wants\s+to\s+[a-z\s]+?)\s+(they|he|she|we|you)\s+(should|must|can|will)\b/gi,
    fix: (_m, _text, matchArr) => {
      const cond = matchArr[1];
      const pron = matchArr[2];
      const modal = matchArr[3];
      return `${cond}, ${pron} ${modal}`;
    },
    explanation: 'Punctuation: Place a comma after an introductory dependent clause (e.g., "If someone wants..., they should...").',
  },

  // 6. Coordinate Faulty Parallelism after modal (they should drink ..., exercising ... -> exercise)
  {
    name: 'Parallelism after Modal (Gerund to Base)',
    regex: /\b(should|could|would|must|can|will)\s+([a-z]+)\s+([a-z\s]+?),\s+([a-z]+ing)\b/gi,
    fix: (_m, _text, matchArr) => {
      const gerund = matchArr[4];
      const irregulars = {
        exercising: 'exercise', drinking: 'drink', eating: 'eat',
        sleeping: 'sleep', running: 'run', walking: 'walk',
        working: 'work', taking: 'take', making: 'make',
      };
      const base = irregulars[gerund.toLowerCase()] || (gerund.endsWith('ing') ? gerund.slice(0, -3) : gerund);
      return {
        flagged: gerund,
        replacement: base,
        startIndex: matchArr.index + matchArr[0].lastIndexOf(gerund),
        endIndex: matchArr.index + matchArr[0].lastIndexOf(gerund) + gerund.length,
        explanation: `Parallel structure error: Use base verb form "${base}" to match the modal auxiliary series ("should drink ..., ${base} ...").`,
      };
    },
    explanation: 'Parallel structure error: Coordinate verbs in a series after a modal verb must all be in base form.',
  },

  // 7. Coordinate Faulty Parallelism after modal (..., and avoids ... -> and avoid)
  {
    name: 'Parallelism after Modal (3rd Person -s to Base)',
    regex: /,\s*and\s+([a-z]+s)\s+(which|that|[a-z]+)\b/gi,
    fix: (_m, _text, matchArr) => {
      const verb = matchArr[1];
      const base = verb.endsWith('s') ? verb.slice(0, -1) : verb;
      const flagged = `and ${verb}`;
      const replacement = `and ${base}`;
      const offset = matchArr.index + matchArr[0].indexOf('and');
      return {
        flagged,
        replacement,
        startIndex: offset,
        endIndex: offset + flagged.length,
        explanation: `Parallel structure error: Use base verb "${base}" to maintain parallel verb forms in a coordinate series.`,
      };
    },
    explanation: 'Parallel structure error: Coordinate verbs in a series must maintain parallel form.',
  },

  // 8. Relative Clause Subject-Verb Agreement (sugary drinks which causes -> sugary drinks which cause)
  {
    name: 'Relative Clause Plural Agreement',
    regex: /\b([a-z]+s)\s+(which|that)\s+(causes|leads|helps|makes|provides|gives|allows|creates|requires|destroys|harms|affects)\b/gi,
    fix: (_m, _text, matchArr) => {
      const noun = matchArr[1];
      const rel = matchArr[2];
      const verb = matchArr[3];
      const base = verb.endsWith('s') ? verb.slice(0, -1) : verb;
      return `${noun} ${rel} ${base}`;
    },
    explanation: 'Subject-verb agreement: Plural antecedent requires a plural verb without "-s" (e.g., "drinks which cause").',
  },

  // 9. Comma Splice before many people / people (all the time, many people thinks -> all the time; many people)
  {
    name: 'Comma Splice with People',
    regex: /\b([a-zA-Z]+),\s+(many\s+people|most\s+people|some\s+people|people)\s+(thinks?|feels?|believes?|is|are|helps?|has|can|will|should)\b/gi,
    fix: (_m, _text, matchArr) => {
      const word = matchArr[1];
      const subj = matchArr[2];
      const verb = matchArr[3];
      return `${word}; ${subj} ${verb}`;
    },
    explanation: 'Comma splice: Independent clauses cannot be joined by a comma alone. Use a semicolon (";") or period.',
  },
];

console.log('Testing prototype rules against new user text...\n');

const findings = [];
for (const rule of testRules) {
  rule.regex.lastIndex = 0;
  let m;
  while ((m = rule.regex.exec(newUserText)) !== null) {
    let flagged = m[0];
    let replacement = '';
    let startIndex = m.index;
    let endIndex = startIndex + m[0].length;
    let explanation = rule.explanation;

    const res = rule.fix(m[0], newUserText, m);
    if (typeof res === 'string') {
      replacement = res;
    } else if (res && typeof res === 'object') {
      flagged = res.flagged || flagged;
      replacement = res.replacement;
      if (res.startIndex !== undefined) startIndex = res.startIndex;
      if (res.endIndex !== undefined) endIndex = res.endIndex;
      if (res.explanation) explanation = res.explanation;
    }

    findings.push({
      rule: rule.name,
      flagged,
      replacement,
      startIndex,
      endIndex,
      explanation,
    });
  }
}

// Filter overlapping spans
const nonOverlapping = [];
const sortedCandidates = [...findings].sort((a, b) => (b.endIndex - b.startIndex) - (a.endIndex - a.startIndex));
for (const cand of sortedCandidates) {
  const hasOverlap = nonOverlapping.some((acc) => cand.startIndex < acc.endIndex && cand.endIndex > acc.startIndex);
  if (!hasOverlap) {
    nonOverlapping.push(cand);
  }
}
nonOverlapping.sort((a, b) => a.startIndex - b.startIndex);

console.log(`Found ${nonOverlapping.length} flaws in user new text:`);
for (const f of nonOverlapping) {
  const slice = newUserText.slice(f.startIndex, f.endIndex);
  const ok = slice === f.flagged ? '✓' : '✗ MISMATCH!';
  console.log(`- [${ok}] "${f.flagged}" -> "${f.replacement}" (${f.startIndex}..${f.endIndex})`);
  console.log(`    ${f.explanation}`);
}

// Batch replacement
console.log('\nTesting Auto-Fix All replacement...');
const sorted = [...nonOverlapping].sort((a, b) => b.startIndex - a.startIndex);
let fixedText = newUserText;
for (const f of sorted) {
  fixedText = fixedText.slice(0, f.startIndex) + f.replacement + fixedText.slice(f.endIndex);
}

console.log('\n--- Corrected Text ---');
console.log(fixedText);
