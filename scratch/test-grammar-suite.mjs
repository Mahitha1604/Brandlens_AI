/**
 * Test script to verify detection and correction of 35 real-world grammar errors
 */

import { runComprehensiveVerification } from '../src/lib/engine/verifier.ts';

const testSentences = [
  // Subject-Verb Agreement: Pronouns
  { text: "He have a great idea.", errorPhrase: "He have" },
  { text: "She don't understand the platform.", errorPhrase: "don't" },
  { text: "It don't matter what they say.", errorPhrase: "don't" },
  { text: "We was working on the feature.", errorPhrase: "We was" },
  { text: "They was late to the demo.", errorPhrase: "They was" },
  { text: "I has been a customer for years.", errorPhrase: "I has" },

  // Subject-Verb Agreement: Nouns
  { text: "The company have announced new rates.", errorPhrase: "company have" },
  { text: "Our team are ready to assist.", errorPhrase: "team are" },
  { text: "Our software help you save time.", errorPhrase: "software help" },
  { text: "This tool provide reliable analytics.", errorPhrase: "tool provide" },
  { text: "The system don't crash under load.", errorPhrase: "don't" },

  // Demonstratives: This/These, That/Those
  { text: "This tools are very helpful.", errorPhrase: "This tools" },
  { text: "These feature is amazing.", errorPhrase: "These feature" },
  { text: "Each users should verify their email.", errorPhrase: "Each users" },
  { text: "Every days we monitor uptime.", errorPhrase: "Every days" },

  // Quantifiers: Much/Many, Less/Fewer
  { text: "Too much people attended the webinar.", errorPhrase: "much people" },
  { text: "We have less customers this month.", errorPhrase: "less customers" },

  // Existential Agreement
  { text: "There is many reasons to upgrade.", errorPhrase: "There is many" },
  { text: "There's multiple solutions available.", errorPhrase: "There's multiple" },

  // Verb Forms & Past Participles
  { text: "Did you went to the conference?", errorPhrase: "went" },
  { text: "We didn't knew about the outage.", errorPhrase: "knew" },
  { text: "I have went to their office.", errorPhrase: "have went" },
  { text: "They have saw the reports.", errorPhrase: "have saw" },
  { text: "I seen this happen yesterday.", errorPhrase: "seen" },
  { text: "You should of called us.", errorPhrase: "should of" },

  // Pronoun Case
  { text: "Between you and I, this is better.", errorPhrase: "Between you and I" },
  { text: "Me and him went to the meeting.", errorPhrase: "Me and him" },

  // Homophones & Confused Words
  { text: "Your going to love our updates.", errorPhrase: "Your going" },
  { text: "Its a great day to launch.", errorPhrase: "Its a" },
  { text: "Its easy to get started.", errorPhrase: "Its easy" },
  { text: "Faster then our competitors.", errorPhrase: "then" },
  { text: "Don't loose your access.", errorPhrase: "loose" },
  { text: "This will effect our performance.", errorPhrase: "effect" },
  { text: "For all intensive purposes, we passed.", errorPhrase: "all intensive purposes" },
  { text: "In regards to your inquiry.", errorPhrase: "In regards to" },
];

console.log('Testing current detection rate on 35 common grammar errors:');
let detected = 0;

for (const item of testSentences) {
  const result = runComprehensiveVerification(item.text, { name: 'BrandLens' });
  const allFindings = [...result.deterministicFindings, ...result.contextualFindings];
  const isDetected = allFindings.some(f => 
    f.flagged_text.toLowerCase().includes(item.errorPhrase.toLowerCase()) ||
    item.errorPhrase.toLowerCase().includes(f.flagged_text.toLowerCase())
  );
  if (isDetected) {
    detected++;
    console.log(`   ✓ DETECTED: "${item.text}"`);
  } else {
    console.log(`   ✗ MISSED:   "${item.text}" (Expected: "${item.errorPhrase}")`);
  }
}

console.log(`\nCurrent Detection Score: ${detected}/${testSentences.length} (${Math.round((detected / testSentences.length) * 100)}%)`);
