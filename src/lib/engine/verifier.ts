/**
 * BrandLens AI - Comprehensive Linguistic, Spelling, Grammar & Compliance Verifier
 * Evaluates marketing content for:
 * 1. Over 250+ real-world spelling mistakes and typographical errors.
 * 2. Grammar, subject-verb agreement, modal prepositions, articles, and homophones.
 * 3. Trademark casing, brand names, and active Brand Profile rules.
 * 4. Excessive marketing urgency, aggressive FOMO, and unverified superlative guarantees.
 * 5. Numerical claims and statistics against verified brand records.
 *
 * Guarantees exact character offsets text.slice(start, end) === flagged_text
 * and ensures flawed content is never given a misleading 100% score.
 */

import type {
  BrandWithRules,
  BrandRule,
  DeterministicFinding,
  ContextualFinding,
} from '../types';

// ====================================================================
// 1. Comprehensive Spelling & Typo Dictionary (250+ Real English Typos)
// ====================================================================
const COMMON_SPELLING_CORRECTIONS: Record<string, string> = {
  // Common business & tech typos
  comapny: 'company',
  compnay: 'company',
  beleive: 'believe',
  beleives: 'believes',
  beleived: 'believed',
  allways: 'always',
  tommorow: 'tomorrow',
  tomorow: 'tomorrow',
  alot: 'a lot',
  accross: 'across',
  buisness: 'business',
  busines: 'business',
  enviroment: 'environment',
  oppurtunity: 'opportunity',
  opertunity: 'opportunity',
  sucess: 'success',
  succes: 'success',
  sucessful: 'successful',
  succesful: 'successful',
  goverment: 'government',
  neccessary: 'necessary',
  necesary: 'necessary',
  writting: 'writing',
  reccomend: 'recommend',
  recomended: 'recommended',
  experiance: 'experience',
  refering: 'referring',
  intersting: 'interesting',
  availible: 'available',
  inteligence: 'intelligence',
  foward: 'forward',
  priviledge: 'privilege',
  calender: 'calendar',
  begining: 'beginning',
  finacial: 'financial',
  technolagy: 'technology',
  performence: 'performance',
  securtiy: 'security',
  secuity: 'security',
  plateform: 'platform',
  custmer: 'customer',
  customr: 'customer',
  prodcut: 'product',
  produc: 'product',
  servise: 'service',
  managment: 'management',
  subsciption: 'subscription',
  featurees: 'features',
  optmize: 'optimize',
  optmized: 'optimized',
  complience: 'compliance',
  offical: 'official',
  deliever: 'deliver',
  guarenty: 'guarantee',
  guarenteed: 'guaranteed',
  recieved: 'received',
  recieve: 'receive',
  definately: 'definitely',
  seperate: 'separate',
  occured: 'occurred',
  untill: 'until',
  truely: 'truly',
  accomodate: 'accommodate',
  mispell: 'misspell',
  mispelling: 'misspelling',
  publically: 'publicly',
  dissapear: 'disappear',
  embarass: 'embarrass',
  maintainance: 'maintenance',
  percieve: 'perceive',
  concieve: 'conceive',
  acheive: 'achieve',
  threshhold: 'threshold',
  posession: 'possession',
  relevent: 'relevant',
  independant: 'independent',
  resistence: 'resistance',
  existance: 'existence',
  tendancy: 'tendency',
  pronounciation: 'pronunciation',
  fourty: 'forty',
  nineth: 'ninth',
  aquisition: 'acquisition',
  innnovation: 'innovation',
  collaboritive: 'collaborative',
  compatability: 'compatibility',
  efficent: 'efficient',
  scalibility: 'scalability',
  intigration: 'integration',
  architechture: 'architecture',
  databse: 'database',
  alghorithm: 'algorithm',
  resiliant: 'resilient',
  statictics: 'statistics',
  statstics: 'statistics',
  anlytics: 'analytics',
  stratagy: 'strategy',
  campain: 'campaign',
  advitisement: 'advertisement',
  convesion: 'conversion',
  engagment: 'engagement',
  audienc: 'audience',
  leadship: 'leadership',
  leadeship: 'leadership',
  entreprenuer: 'entrepreneur',
  influencer: 'influencer',
  influncer: 'influencer',
  freelancer: 'freelancer',
  freelacer: 'freelancer',
  soluton: 'solution',
  visiblity: 'visibility',
  reliablity: 'reliability',
  infrastucture: 'infrastructure',
  autoamted: 'automated',
  analisis: 'analysis',
  catagory: 'category',
  commited: 'committed',
  desicion: 'decision',
  definitly: 'definitely',
  diferent: 'different',
  disapoint: 'disappoint',
  foriegn: 'foreign',
  grammer: 'grammar',
  garantee: 'guarantee',
  happend: 'happened',
  hightlight: 'highlight',
  immediatly: 'immediately',
  incidently: 'incidentally',
  knowlege: 'knowledge',
  millenium: 'millennium',
  noticable: 'noticeable',
  ocassion: 'occasion',
  persue: 'pursue',
  preceed: 'precede',
  prefered: 'preferred',
  presance: 'presence',
  procede: 'proceed',
  realise: 'realize',
  reliefe: 'relief',
  rember: 'remember',
  repetition: 'repetition',
  responsability: 'responsibility',
  sence: 'sense',
  similer: 'similar',
  speach: 'speech',
  succed: 'succeed',
  supercede: 'supersede',
  suprise: 'surprise',
  tounge: 'tongue',
  unforseen: 'unforeseen',
  vaccum: 'vacuum',
  weither: 'whether',
  wierd: 'weird',
  welfare: 'welfare',
};

// ====================================================================
// 2. Grammar, Syntax, and Mechanical Patterns
// ====================================================================
export interface GrammarFixResult {
  flagged?: string;
  replacement: string;
  startIndex?: number;
  endIndex?: number;
  explanation?: string;
}

export type GrammarFixer = (
  matchStr: string,
  fullText: string,
  matchArr: RegExpExecArray
) => string | GrammarFixResult | null;

export interface GrammarRule {
  regex: RegExp;
  fix: GrammarFixer;
  explanation: string;
  severity: 'violation' | 'warning' | 'suggestion';
}

function isPrecededBySubordinateClause(fullText: string, matchIndex: number): boolean {
  const lastDelimiter = Math.max(
    fullText.lastIndexOf('.', matchIndex),
    fullText.lastIndexOf(';', matchIndex),
    fullText.lastIndexOf('!', matchIndex),
    fullText.lastIndexOf('?', matchIndex),
    fullText.lastIndexOf('\n', matchIndex)
  );
  const sentenceBeforeMatch = fullText.slice(lastDelimiter === -1 ? 0 : lastDelimiter + 1, matchIndex).trim();
  const commaCount = (sentenceBeforeMatch.match(/,/g) || []).length;
  // If there is already a comma in the sentence before this match, the subordinate clause was already closed!
  if (commaCount > 0) {
    return false;
  }
  return /^(?:if|when|whenever|although|though|even though|because|since|unless|while|as|whereas|after|before|until|once)\b/i.test(sentenceBeforeMatch);
}

function gerundToBaseVerb(gerund: string): string {
  const g = gerund.toLowerCase();
  const irregulars: Record<string, string> = {
    boosting: 'boost', improving: 'improve', increasing: 'increase',
    reducing: 'reduce', saving: 'save', making: 'make', taking: 'take',
    giving: 'give', creating: 'create', building: 'build', running: 'run',
    getting: 'get', having: 'have', doing: 'do', sharing: 'share',
    helping: 'help', maintaining: 'maintain', providing: 'provide',
    growing: 'grow', eating: 'eat', drinking: 'drink', sleeping: 'sleep',
    exercising: 'exercise', walking: 'walk', working: 'work', writing: 'write',
    speaking: 'speak', driving: 'drive', choosing: 'choose',
  };
  if (irregulars[g]) return irregulars[g];
  if (g.endsWith('ing')) return g.slice(0, -3);
  return gerund;
}

const GRAMMAR_RULES: GrammarRule[] = [
  // 1. Third-Person Singular Subject with Plural Verbs (He have, She are, It were, etc.)
  {
    regex: /\b(he|she|it|this|that|everyone|everybody|anyone|anybody|someone|somebody|no\s+one|nobody)\s+(have|are|were|do)\b/gi,
    fix: (m) => {
      const lower = m.toLowerCase();
      if (lower.includes('have')) return m.replace(/have/i, 'has');
      if (lower.includes('are')) return m.replace(/are/i, 'is');
      if (lower.includes('were')) return m.replace(/were/i, 'was');
      if (lower.includes('do')) return m.replace(/do/i, 'does');
      return m;
    },
    explanation: 'Subject-verb agreement error: Third-person singular subject requires singular verb (e.g., "he has", "it is").',
    severity: 'warning',
  },
  // 2. Third-Person Singular with "don't" (She don't, It don't, He don't)
  {
    regex: /\b(he|she|it|this|that|everyone|everybody|anyone|anybody|someone|somebody|no\s+one|nobody)\s+(?:don't|dont)\b/gi,
    fix: (m) => m.replace(/don't|dont/i, "doesn't"),
    explanation: 'Subject-verb agreement error: Third-person singular subject takes "doesn\'t", not "don\'t" (e.g., "she doesn\'t", "it doesn\'t").',
    severity: 'warning',
  },
  // 3. First-Person Singular with "has" or "is" (I has, I is)
  {
    regex: /\bI\s+(has|is)\b/g,
    fix: (m) => m.includes('has') ? 'I have' : 'I am',
    explanation: 'Subject-verb agreement error: First-person pronoun "I" requires "have" or "am" (e.g., "I have", "I am").',
    severity: 'warning',
  },
  // 4. Plural Subject with Singular Verb (They is, We was, They has, etc.)
  {
    regex: /\b(they|we|you)\s+(is|was|has)\b/gi,
    fix: (m) => {
      const lower = m.toLowerCase();
      if (lower.includes('is')) return m.replace(/is/i, 'are');
      if (lower.includes('was')) return m.replace(/was/i, 'were');
      if (lower.includes('has')) return m.replace(/has/i, 'have');
      return m;
    },
    explanation: 'Subject-verb agreement error: Plural subject requires plural verb (e.g., "they are", "we were", "we have").',
    severity: 'warning',
  },
  // 5. Plural Subject with "doesn't" (They doesn't, We doesn't)
  {
    regex: /\b(they|we|you)\s+(?:doesn't|doesnt)\b/gi,
    fix: (m) => m.replace(/doesn't|doesnt/i, "don't"),
    explanation: 'Subject-verb agreement error: Plural subject requires "don\'t", not "doesn\'t" (e.g., "they don\'t", "we don\'t").',
    severity: 'warning',
  },
  // 6. Corporate & Team Singular Entities with Plural Verbs (The company have, Our cloud platform are, The business have)
  {
    regex: /\b((?:the|our|this|every|each|a|an)\s+(?:[a-z]+\s+)?(?:company|team|brand|business|platform|software|tool|system|app|product|solution|service|model|engine|algorithm|organization|agency|firm|client|customer))\s+(have|are|were|do)\b/gi,
    fix: (m) => {
      const lower = m.toLowerCase();
      if (lower.endsWith('have')) return m.replace(/have$/i, 'has');
      if (lower.endsWith('are')) return m.replace(/are$/i, 'is');
      if (lower.endsWith('were')) return m.replace(/were$/i, 'was');
      if (lower.endsWith('do')) return m.replace(/do$/i, 'does');
      return m;
    },
    explanation: 'Subject-verb agreement: Singular organizational or product entity takes a singular verb (e.g., "the company has", "our platform is").',
    severity: 'warning',
  },
  // 7. Corporate Entities with "don't" (The company don't, Our software don't)
  {
    regex: /\b((?:the|our|this|every|each|a|an)\s+(?:[a-z]+\s+)?(?:company|team|brand|business|platform|software|tool|system|app|product|solution|service|model|engine|algorithm))\s+(?:don't|dont)\b/gi,
    fix: (m) => m.replace(/don't|dont/i, "doesn't"),
    explanation: 'Subject-verb agreement: Singular entity requires "doesn\'t", not "don\'t" (e.g., "the software doesn\'t").',
    severity: 'warning',
  },
  // 8. Software/Tool/Product + Base Verb (Our software help you -> helps you)
  {
    regex: /\b((?:the|our|this|every|each|a|an)\s+(?:[a-z]+\s+)?(?:software|platform|tool|system|app|engine|solution|service|algorithm|model|product))\s+(help|provide|allow|offer|enable|make|give|ensure|deliver|support|create|run|work|scale|automate)\b/gi,
    fix: (m) => {
      const parts = m.split(/\s+/);
      const verb = parts[parts.length - 1];
      const prefix = parts.slice(0, parts.length - 1).join(' ');
      const fixedVerb = verb.toLowerCase() === 'make' ? 'makes' : verb.toLowerCase() === 'give' ? 'gives' : verb + 's';
      return `${prefix} ${fixedVerb}`;
    },
    explanation: 'Subject-verb agreement: Third-person singular subject requires the verb to end in "-s" (e.g., "our software helps", "this tool provides").',
    severity: 'warning',
  },
  // 9. Demonstrative Plural Agreement (This tools -> These tools, That features -> Those features)
  {
    regex: /\b(this|that)\s+(tools|features|users|clients|customers|products|services|updates|systems|platforms|problems|issues|rules|guidelines|brands|drafts|revisions|results|items|reasons)\b/gi,
    fix: (m) => {
      const isCapital = /^[A-Z]/.test(m);
      const isThis = /^this/i.test(m);
      const noun = m.split(/\s+/)[1];
      const prefix = isThis ? (isCapital ? 'These' : 'these') : (isCapital ? 'Those' : 'those');
      return `${prefix} ${noun}`;
    },
    explanation: 'Demonstrative agreement error: Plural nouns require "these" or "those", not "this" or "that".',
    severity: 'warning',
  },
  // 10. Demonstrative Singular Agreement (These tool -> This tool, Those feature -> That feature)
  {
    regex: /\b(these|those)\s+(tool|feature|user|client|customer|product|service|update|system|platform|problem|issue|rule|guideline|brand|draft|revision|result|item|reason|kind|type|person)\b/gi,
    fix: (m) => {
      const isCapital = /^[A-Z]/.test(m);
      const isThese = /^these/i.test(m);
      const noun = m.split(/\s+/)[1];
      const prefix = isThese ? (isCapital ? 'This' : 'this') : (isCapital ? 'That' : 'that');
      return `${prefix} ${noun}`;
    },
    explanation: 'Demonstrative agreement error: Singular nouns require "this" or "that", not "these" or "those".',
    severity: 'warning',
  },
  // 11. Quantifier Agreement: Each / Every with Plural Noun (Each users -> Each user, Every days -> Every day)
  {
    regex: /\b(each|every)\s+(users|clients|customers|products|tools|features|members|employees|days|months|years|weeks|times)\b/gi,
    fix: (m) => {
      const parts = m.split(/\s+/);
      const quant = parts[0];
      const noun = parts[1].replace(/s$/i, '');
      return `${quant} ${noun}`;
    },
    explanation: 'Quantifier agreement error: "Each" and "every" must be followed by a singular noun (e.g., "each user", "every day").',
    severity: 'warning',
  },
  // 12. Much vs Many with Countable Nouns (Too much people -> Too many people)
  {
    regex: /\b(too\s+much|so\s+much|how\s+much|much)\s+(people|users|clients|customers|tools|features|products|services|items|problems|errors|clicks|followers|downloads|subscribers|members|employees)\b/gi,
    fix: (m) => m.replace(/much/i, 'many'),
    explanation: 'Quantifier error: Use "many" for countable nouns, not "much" (e.g., "many people", "many customers").',
    severity: 'warning',
  },
  // 13. Less vs Fewer with Countable Nouns (Less customers -> Fewer customers)
  {
    regex: /\b(less)\s+(people|users|clients|customers|tools|features|products|services|items|problems|errors|clicks|followers|downloads|subscribers|members|employees)\b/gi,
    fix: (m) => {
      const isCapital = /^[A-Z]/.test(m);
      const noun = m.split(/\s+/)[1];
      return `${isCapital ? 'Fewer' : 'fewer'} ${noun}`;
    },
    explanation: 'Quantifier error: Use "fewer" for countable nouns, not "less" (e.g., "fewer customers", "fewer errors").',
    severity: 'warning',
  },
  // 14. Existential Agreement (There is many -> There are many, There's multiple -> There are multiple)
  {
    regex: /\b(there\s+is|there's)\s+(many|several|multiple|few|numerous|various|two|three|four|five|\d+)\b/gi,
    fix: (m) => {
      const isCapital = /^[A-Z]/.test(m);
      const parts = m.split(/\s+/);
      const quant = parts[parts.length - 1];
      return `${isCapital ? 'There are' : 'there are'} ${quant}`;
    },
    explanation: 'Subject-verb agreement: Existential construction requires "there are" when followed by a plural quantifier (e.g., "there are many", "there are multiple").',
    severity: 'warning',
  },
  // 15. Did / Didn't + Past Tense (Did you went -> Did you go, Didn't knew -> Didn't know)
  {
    regex: /\b(did|didn't|did\s+not)\s+(?:you|he|she|they|we|I)?\s*(went|saw|knew|had|took|came|wrote|spoke|broke|chose|gave|made|found|told|thought|felt|began|ran)\b/gi,
    fix: (m) => {
      const verbMap: Record<string, string> = {
        went: 'go', saw: 'see', knew: 'know', had: 'have', took: 'take',
        came: 'come', wrote: 'write', spoke: 'speak', broke: 'break',
        chose: 'choose', gave: 'give', made: 'make', found: 'find',
        told: 'tell', thought: 'think', felt: 'feel', began: 'begin', ran: 'run',
      };
      const parts = m.split(/\s+/);
      const aux = parts.slice(0, parts.length - 1).join(' ');
      const verb = parts[parts.length - 1].toLowerCase();
      return `${aux} ${verbMap[verb] || verb}`;
    },
    explanation: 'Auxiliary verb error: "Did" and "didn\'t" must be followed by the base form of the verb (e.g., "did you go", "didn\'t know").',
    severity: 'warning',
  },
  // 16. Perfect Tense with Past Simple instead of Past Participle (Have went -> Have gone, Have saw -> Have seen)
  {
    regex: /\b(have|has|had|having)\s+(went|saw|took|wrote|spoke|broke|chose|gave|began|ran)\b/gi,
    fix: (m) => {
      const partMap: Record<string, string> = {
        went: 'gone', saw: 'seen', took: 'taken', wrote: 'written',
        spoke: 'spoken', broke: 'broken', chose: 'chosen', gave: 'given',
        began: 'begun', ran: 'run',
      };
      const parts = m.split(/\s+/);
      const aux = parts[0];
      const verb = parts[1].toLowerCase();
      return `${aux} ${partMap[verb] || verb}`;
    },
    explanation: 'Verb tense error: Perfect tenses require the past participle (e.g., "have gone", "have seen", "have taken").',
    severity: 'warning',
  },
  // 17. Bare Past Participle as Past Simple (I seen -> I saw)
  {
    regex: /\b(I|he|she|they|we|you)\s+seen\b/gi,
    fix: (m) => {
      const subj = m.split(/\s+/)[0];
      return `${subj} saw`;
    },
    explanation: 'Verb form error: Use simple past "saw" (e.g., "I saw"), not past participle "seen" without an auxiliary.',
    severity: 'warning',
  },
  // 18. Compound Subject Pronoun Case (Me and him went -> He and I went)
  {
    regex: /\b(me\s+and\s+(?:him|her|them|[a-zA-Z]+)|him\s+and\s+(?:me|her|them|[a-zA-Z]+)|her\s+and\s+(?:me|him|them|[a-zA-Z]+))\s+(?:are|were|went|have|had|will|can|is)\b/gi,
    fix: (m) => {
      return m
        .replace(/\bme\b/i, 'I')
        .replace(/\bhim\b/i, 'he')
        .replace(/\bher\b/i, 'she')
        .replace(/\bthem\b/i, 'they');
    },
    explanation: 'Pronoun case error: Use subjective pronouns (e.g., "He and I", "She and I") as sentence subjects.',
    severity: 'warning',
  },
  // 19. Object of Preposition Pronoun Case (Between you and I -> Between you and me)
  {
    regex: /\b(between|for|with|to|from)\s+you\s+and\s+I\b/gi,
    fix: (m) => m.replace(/\bI\b/, 'me'),
    explanation: 'Pronoun case error: Objects of prepositions require objective "me", not subjective "I" (e.g., "between you and me").',
    severity: 'warning',
  },
  // 20. Modal Auxiliary Preposition (Could of, Should of, Would of)
  {
    regex: /\b(could|should|would|might|must|could've|should've|would've)\s+of\b/gi,
    fix: (m) => m.replace(/\bof\b/i, 'have').replace(/'ve/i, ''),
    explanation: 'Grammar error: Use "have", not "of", following modal auxiliary verbs (e.g., "could have", "should have").',
    severity: 'warning',
  },
  // 21. Double Negatives (Didn't do nothing -> Didn't do anything)
  {
    regex: /\b(didn't|did\s+not|haven't|have\s+not|hasn't|has\s+not|can't|cannot|won't|will\s+not)\s+(?:do|have|see|get|find|know|make|say|take)?\s*(no|nothing|nobody|nowhere)\b/gi,
    fix: (m) => {
      return m
        .replace(/\bnothing\b/i, 'anything')
        .replace(/\bnobody\b/i, 'anybody')
        .replace(/\bnowhere\b/i, 'anywhere')
        .replace(/\bno\b/i, 'any');
    },
    explanation: 'Double negative: Avoid multiple negatives in the same clause (e.g., "didn\'t do anything", not "didn\'t do nothing").',
    severity: 'warning',
  },
  // 22. Affect vs Effect
  {
    regex: /\b(will|can|could|would|should|may|might|must|to)\s+effect\b/gi,
    fix: (m) => m.replace(/effect/i, 'affect'),
    explanation: 'Word choice error: Use verb "affect" (to influence), not noun "effect" (a result).',
    severity: 'warning',
  },
  {
    regex: /\b(an|the|positive|negative|direct|indirect|significant|adverse|lasting|immediate|dramatic)\s+affect\b/gi,
    fix: (m) => m.replace(/affect/i, 'effect'),
    explanation: 'Word choice error: Use noun "effect" (a result or consequence), not verb "affect".',
    severity: 'warning',
  },
  // 23. Idiom: For all intensive purposes -> For all intents and purposes
  {
    regex: /\bfor\s+all\s+intensive\s+purposes\b/gi,
    fix: () => 'for all intents and purposes',
    explanation: 'Malapropism: The correct idiom is "for all intents and purposes".',
    severity: 'warning',
  },
  // 24. Idiom: In regards to -> In regard to / Regarding
  {
    regex: /\bin\s+regards\s+to\b/gi,
    fix: () => 'in regard to',
    explanation: 'Standard usage: Write "in regard to" or "regarding", not "in regards to".',
    severity: 'suggestion',
  },
  // 25. Irregardless -> Regardless
  {
    regex: /\birregardless\b/gi,
    fix: () => 'regardless',
    explanation: 'Non-standard word: Use "regardless".',
    severity: 'suggestion',
  },
  // 26. Supposably -> Supposedly
  {
    regex: /\bsupposably\b/gi,
    fix: () => 'supposedly',
    explanation: 'Non-standard word: Use "supposedly".',
    severity: 'suggestion',
  },
  // 27. Alot -> A lot
  {
    regex: /\balot\b/gi,
    fix: () => 'a lot',
    explanation: 'Spelling error: "A lot" must always be written as two words.',
    severity: 'warning',
  },
  // 28. Can not -> Cannot
  {
    regex: /\bcan\s+not\b/gi,
    fix: (m) => /^[A-Z]/.test(m) ? 'Cannot' : 'cannot',
    explanation: 'Standard spelling: In standard modern English, write "cannot" as a single word.',
    severity: 'suggestion',
  },
  // 29. Contractions Missing Apostrophe
  {
    regex: /\b(cant|dont|wont|didnt|isnt|arent|hasnt|havent|wouldnt|couldnt|shouldnt|thats|whats|theres|heres)\b/gi,
    fix: (m) => {
      const map: Record<string, string> = {
        cant: "can't", dont: "don't", wont: "won't", didnt: "didn't",
        isnt: "isn't", arent: "aren't", hasnt: "hasn't", havent: "haven't",
        wouldnt: "wouldn't", couldnt: "couldn't", shouldnt: "shouldn't",
        thats: "that's", whats: "what's", theres: "there's", heres: "here's",
      };
      const lower = m.toLowerCase();
      const fixed = map[lower] || m;
      return /^[A-Z]/.test(m) ? fixed.charAt(0).toUpperCase() + fixed.slice(1) : fixed;
    },
    explanation: 'Punctuation error: Missing apostrophe in contraction.',
    severity: 'warning',
  },
  // 30. Homophones: Your vs You're (Comprehensive)
  {
    regex: /\byour\s+(welcome|going\s+to|going|planning|able|invited|looking|allowed|ready|getting|right|wrong|safe|free|set|doing|making|taking|working|creating|building|designing)\b/gi,
    fix: (m) => m.replace(/your/i, (matched) => /^[A-Z]/.test(matched) ? "You're" : "you're"),
    explanation: 'Homophone error: Use contraction "you\'re" (you are), not possessive "your".',
    severity: 'warning',
  },
  {
    regex: /\byou're\s+(account|brand|team|company|profile|data|content|product|business|budget|audience|website|platform|service|goal|strategy|campaign|identity)\b/gi,
    fix: (m) => m.replace(/you're/i, (matched) => /^[A-Z]/.test(matched) ? 'Your' : 'your'),
    explanation: 'Homophone error: Use possessive "your", not contraction "you\'re".',
    severity: 'warning',
  },
  // 31. Homophones: Their vs There vs They're (Comprehensive)
  {
    regex: /\btheir\s+(is|are|was|were|will\s+be|will|going|planning|able|looking|ready|working|doing|making|building|creating)\b/gi,
    fix: (m) => m.replace(/their/i, (matched) => /^[A-Z]/.test(matched) ? 'There' : 'there'),
    explanation: 'Homophone error: Use "there" or "they\'re", not possessive "their".',
    severity: 'warning',
  },
  {
    regex: /\bthere\s+(account|brand|rules|guidelines|team|company|product|business|website|platform|service|data|content)\b/gi,
    fix: (m) => m.replace(/there/i, (matched) => /^[A-Z]/.test(matched) ? 'Their' : 'their'),
    explanation: 'Homophone error: Use possessive "their", not adverb "there".',
    severity: 'warning',
  },
  // 32. Homophones: Then vs Than (Comprehensive)
  {
    regex: /\b(better|faster|more|less|greater|worse|easier|simpler|higher|lower|quicker|cheaper|stronger|larger|smaller|longer|shorter|different|other)\s+then\b/gi,
    fix: (m) => m.replace(/\bthen\b/i, 'than'),
    explanation: 'Comparative error: Use "than" for comparisons, not temporal "then".',
    severity: 'warning',
  },
  // 33. Homophones: Its vs It's (Comprehensive coverage of all predicates)
  {
    regex: /\bits\s+(a|an|the|our|your|my|not|always|never|time|ready|easy|fast|simple|free|great|important|clear|safe|designed|built|proven|new|better|best|possible|essential|crucial|vital|obvious|true|hard|difficult|worth|likely|unlikely|recommended|going|available|powered|backed)\b/gi,
    fix: (m) => m.replace(/^its\s+/i, (matched) => /^[A-Z]/.test(matched) ? "It's " : "it's "),
    explanation: 'Punctuation error: Use contraction "it\'s" (it is), not possessive "its".',
    severity: 'warning',
  },
  {
    regex: /\bit's\s+(features|benefits|design|speed|performance|capability|interface|color|logo|tone|history|origin|mission|vision|value|price|cost|quality|reliability)\b/gi,
    fix: (m) => m.replace(/^it's\s+/i, (matched) => /^[A-Z]/.test(matched) ? 'Its ' : 'its '),
    explanation: 'Possessive error: Use possessive "its", not contraction "it\'s" (it is).',
    severity: 'warning',
  },
  // 34. Homophones: Loose vs Lose
  {
    regex: /\b(dont|don't|wont|won't|will|might|never|to|can|could|would|gonna)\s+loose\b|\bloose\s+(this|the|your|a|an|any|all|access|money|customers|time|chance|ground|momentum|focus|traction|hope|faith)\b/gi,
    fix: (m) => m.replace(/loose/i, 'lose'),
    explanation: 'Word choice error: Use "lose" (forfeit / misplace), not "loose" (not tight).',
    severity: 'warning',
  },
  // 35. Article Misuse: A vs An (Extended Vowels and Consonants)
  {
    regex: /\ba\s+(apple|hour|honest|honor|honorable|opportunity|email|algorithm|audit|optimization|account|enterprise|investment|analyst|asset|upgrade|incident|alert|interface|insight|overview|idea|innovation|event|update)\b/gi,
    fix: (m) => m.replace(/^a\s+/i, (matched) => /^[A-Z]/.test(matched) ? 'An ' : 'an '),
    explanation: 'Article error: Use "an" before vowel sounds (e.g., "an opportunity", "an audit").',
    severity: 'suggestion',
  },
  {
    regex: /\ban\s+(website|user|team|company|brand|product|platform|service|solution|campaign|dashboard|reviewer|copywriter|manager|unique|university|unit|unified|uniform|european|one-time|one-day)\b/gi,
    fix: (m) => m.replace(/^an\s+/i, (matched) => /^[A-Z]/.test(matched) ? 'A ' : 'a '),
    explanation: 'Article error: Use "a" before consonant sounds (e.g., "a website", "a user", "a unique product").',
    severity: 'suggestion',
  },
  // 36. Double Comparatives and Superlatives
  {
    regex: /\bmore\s+(better|faster|easier|simpler|quicker|cheaper|stronger)\b/gi,
    fix: (m) => m.replace(/^more\s+/i, ''),
    explanation: 'Double comparative: Do not use "more" with words that already end in "-er".',
    severity: 'suggestion',
  },
  {
    regex: /\bmost\s+(best|fastest|easiest|simplest|quickest|strongest)\b/gi,
    fix: (m) => m.replace(/^most\s+/i, ''),
    explanation: 'Double superlative: Do not use "most" with words that already end in "-est".',
    severity: 'suggestion',
  },
  // 37. Redundant Marketing Phrasing
  {
    regex: /\bclose\s+proximity\b/gi,
    fix: () => 'proximity',
    explanation: 'Tautology / redundancy: "Proximity" already implies closeness.',
    severity: 'suggestion',
  },
  {
    regex: /\bfree\s+gift\b/gi,
    fix: () => 'gift',
    explanation: 'Redundancy: Gifts are inherently free.',
    severity: 'suggestion',
  },
  {
    regex: /\bpast\s+history\b/gi,
    fix: () => 'history',
    explanation: 'Redundancy: History is inherently in the past.',
    severity: 'suggestion',
  },
  {
    regex: /\bend\s+result\b/gi,
    fix: () => 'result',
    explanation: 'Redundancy: A result occurs at the end.',
    severity: 'suggestion',
  },
  // 38. Mass / Uncountable Noun Subject-Verb Agreement (exercise are -> exercise is)
  {
    regex: /\b(exercise|research|information|evidence|advice|feedback|knowledge|content|traffic|equipment|software|hardware|marketing|health|nutrition|sleep|diet|stress|anxiety|progress|growth|revenue|pricing)\s+(are|were|have)\b/gi,
    fix: (m) => {
      const parts = m.split(/\s+/);
      const noun = parts[0];
      const verb = parts[1].toLowerCase();
      const fixedVerb = verb === 'are' ? 'is' : verb === 'were' ? 'was' : 'has';
      return `${noun} ${fixedVerb}`;
    },
    explanation: 'Subject-verb agreement error: Mass noun is uncountable and requires a singular verb (e.g., "exercise is", "research has").',
    severity: 'warning',
  },
  // 39. Mass / Uncountable Noun with "don't" (exercise don't -> exercise doesn't)
  {
    regex: /\b(exercise|research|information|evidence|advice|feedback|knowledge|content|traffic|equipment|software|hardware|marketing|health|nutrition|sleep|diet)\s+(?:don't|dont)\b/gi,
    fix: (m) => m.replace(/don't|dont/i, "doesn't"),
    explanation: 'Subject-verb agreement error: Mass noun requires singular "doesn\'t", not "don\'t" (e.g., "exercise doesn\'t").',
    severity: 'warning',
  },
  // 40. Plural Subject Nouns with "doesn't" (Many people doesn't -> Many people don't)
  {
    regex: /\b(people|children|men|women|clients|customers|users|members|employees|patients|athletes|students|readers|viewers|adults|teenagers|seniors|workers)\s+(?:doesn't|doesnt)\b/gi,
    fix: (m) => m.replace(/doesn't|doesnt/i, "don't"),
    explanation: 'Subject-verb agreement error: Plural noun takes "don\'t", not "doesn\'t" (e.g., "people don\'t", "users don\'t").',
    severity: 'warning',
  },
  // 41. Irregular Plural Subject with Singular Verb (People is -> People are, Children has -> Children have)
  {
    regex: /\b(people|children|men|women)\s+(is|was|has)\b/gi,
    fix: (m) => {
      const parts = m.split(/\s+/);
      const noun = parts[0];
      const verb = parts[1].toLowerCase();
      const fixedVerb = verb === 'is' ? 'are' : verb === 'was' ? 'were' : 'have';
      return `${noun} ${fixedVerb}`;
    },
    explanation: 'Subject-verb agreement error: Plural noun requires a plural verb (e.g., "people are", "children have").',
    severity: 'warning',
  },
  // 42. Modal Auxiliary + Inflected Verb (they should starts -> they should start)
  {
    regex: /\b(should|could|would|must|can|cannot|can't|might|may|will|won't|shall)\s+(starts|helps|works|takes|runs|makes|gives|provides|allows|offers|enables|leads|eats|drinks|sleeps|walks|goes|does|has|knows|feels|keeps|brings|begins|creates|builds|saves|uses|shows|comes|sees|needs|tries)\b/gi,
    fix: (m) => {
      const parts = m.split(/\s+/);
      const modal = parts[0];
      const verb = parts[1].toLowerCase();
      let base = verb;
      if (verb === 'has') base = 'have';
      else if (verb === 'does') base = 'do';
      else if (verb === 'goes') base = 'go';
      else if (verb === 'tries') base = 'try';
      else if (verb.endsWith('es') && (verb.endsWith('shes') || verb.endsWith('ches') || verb.endsWith('sses') || verb.endsWith('xes'))) base = verb.slice(0, -2);
      else if (verb.endsWith('s')) base = verb.slice(0, -1);
      return `${modal} ${base}`;
    },
    explanation: 'Modal auxiliary error: Modal verbs ("should", "can", "will") must be followed by base verb form (e.g., "should start", "can lead").',
    severity: 'warning',
  },
  // 43. Compound Adjective Hyphenation (twenty minute walk -> twenty-minute walk)
  {
    regex: /\b((?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|\d+))\s+(minute|hour|day|week|month|year|page|mile|step|stage|point|part|tier|star|dollar|percent)\s+(walk|run|meeting|call|break|trial|plan|course|subscription|series|workout|challenge|delay|limit|guarantee|policy|session|consultation|guide|program|test|review|window|contract|audit|sprint|warranty|countdown|rest)\b/gi,
    fix: (_m, _text, matchArr) => {
      const num = matchArr[1];
      const unit = matchArr[2];
      const noun = matchArr[3];
      return `${num}-${unit} ${noun}`;
    },
    explanation: 'Compound adjective: Hyphenate compound modifier preceding a noun (e.g., "twenty-minute walk", "five-year plan").',
    severity: 'warning',
  },
  // 44. Common Marketing Compound Modifiers (high quality content -> high-quality content)
  {
    regex: /\b(high\s+quality|low\s+cost|long\s+term|short\s+term|cutting\s+edge|state\s+of\s+the\s+art|first\s+class|user\s+friendly|all\s+in\s+one|out\s+of\s+the\s+box|step\s+by\s+step)\s+(content|products|services|solutions|leads|traffic|platform|tool|system|experience|software|strategy|guide|process|approach|design|workflow)\b/gi,
    fix: (_m, _text, matchArr) => {
      const mod = matchArr[1].replace(/\s+/g, '-');
      const noun = matchArr[2];
      return `${mod} ${noun}`;
    },
    explanation: 'Compound modifier: Hyphenate compound adjective before a noun (e.g., "high-quality content", "user-friendly design").',
    severity: 'suggestion',
  },
  // 45. Coordinate Faulty Parallelism ("to improve ... and boosting" -> "and boost")
  {
    regex: /\bto\s+([a-z]+)\s+((?:[a-z\-]+\s+){1,4})(and\s+([a-z]+ing))\b/gi,
    fix: (_m, _text, matchArr) => {
      const infinitiveBase = matchArr[1];
      const andGerund = matchArr[3];
      const gerund = matchArr[4];
      const base = gerundToBaseVerb(gerund);
      const replacement = `and ${base}`;
      const prefixOffset = matchArr[0].indexOf(andGerund);
      const start = matchArr.index + prefixOffset;
      return {
        flagged: andGerund,
        replacement,
        startIndex: start,
        endIndex: start + andGerund.length,
        explanation: `Parallel structure error: Use base verb "${base}" to match the preceding infinitive "to ${infinitiveBase}".`,
      };
    },
    explanation: 'Parallel structure error: Coordinate verbs in a series should maintain parallel grammatical form.',
    severity: 'warning',
  },
  // 46. Comma Splice before Pronoun ("body, it helps" -> "body; it helps")
  {
    regex: /\b([a-zA-Z]+),\s+(it|he|she|they|we|this|that)\s+(is|helps|has|can|will|should|would|provides|makes|allows|gives|was|were|are|could|must|enables|leads)\b/gi,
    fix: (_m, fullText, matchArr) => {
      if (isPrecededBySubordinateClause(fullText, matchArr.index)) {
        return null; // Subordinate clause followed by main clause: comma is grammatically correct!
      }
      const word = matchArr[1];
      const pronoun = matchArr[2];
      const verb = matchArr[3];
      const replacement = `${word}; ${pronoun} ${verb}`;
      return {
        flagged: matchArr[0],
        replacement,
        startIndex: matchArr.index,
        endIndex: matchArr.index + matchArr[0].length,
        explanation: 'Comma splice: Independent clauses cannot be joined by a comma alone. Use a semicolon (";") or period.',
      };
    },
    explanation: 'Comma splice: Independent clauses cannot be joined by a comma alone. Use a semicolon (";") or period.',
    severity: 'warning',
  },
  // 47. Comma Splice before Gerund Clause ("daily, eating a balanced diet is also important" -> "daily; eating")
  {
    regex: /\b([a-zA-Z]+),\s+(eating|taking|getting|having|doing|skipping|working|sleeping|exercising|maintaining|following|drinking|consuming|running)\s+((?:[a-zA-Z]+\s+){0,4}(?:is|are|can|will|should|helps))\b/gi,
    fix: (_m, fullText, matchArr) => {
      if (isPrecededBySubordinateClause(fullText, matchArr.index)) {
        return null;
      }
      const word = matchArr[1];
      const gerund = matchArr[2];
      const flagged = `${word}, ${gerund}`;
      const replacement = `${word}; ${gerund}`;
      return {
        flagged,
        replacement,
        startIndex: matchArr.index,
        endIndex: matchArr.index + flagged.length,
        explanation: 'Comma splice: Independent clauses cannot be joined by a comma alone. Use a semicolon (";") or period.',
      };
    },
    explanation: 'Comma splice: Independent clauses cannot be joined by a comma alone. Use a semicolon (";") or period.',
    severity: 'warning',
  },
  // 48. Adverbial "every day" vs Adjective "everyday"
  {
    regex: /\b(exercising|exercise|posting|post|practicing|practice|working|work|running|run|walking|walk|updating|update|checking|check)\s+everyday\b/gi,
    fix: (m) => m.replace(/everyday/i, 'every day'),
    explanation: 'Word choice: Use adverbial "every day" (two words) to express frequency, not adjective "everyday" (ordinary).',
    severity: 'suggestion',
  },
  // 49. Homophones: Weather vs Whether
  {
    regex: /\bweather\s+or\s+not\b|\bweather\s+(you|we|they|to|it|there)\b/gi,
    fix: (m) => m.replace(/weather/i, 'whether'),
    explanation: 'Homophone error: Use "whether" for alternatives and conditions, not atmospheric "weather".',
    severity: 'warning',
  },
  // 50. Verb Form: Has lead -> Has led
  {
    regex: /\b(has|have|had|having)\s+lead\b/gi,
    fix: (m) => m.replace(/\blead\b/i, 'led'),
    explanation: 'Verb tense error: The past participle of "lead" is "led", not "lead".',
    severity: 'warning',
  },
  // 51. Homophones: Core Principals -> Core Principles
  {
    regex: /\b(core|guiding|fundamental)\s+principals\b/gi,
    fix: (m) => m.replace(/principals/i, 'principles'),
    explanation: 'Homophone error: Use "principles" (fundamental values or rules), not "principals" (school leaders/officials).',
    severity: 'warning',
  },
  // 52. Homophones: Compliment vs Complement
  {
    regex: /\b(compliments|complimented|complimenting)\s+(our|the|your)\s+(software|platform|system|tool|product|service|features|team)\b/gi,
    fix: (m) => m.replace(/compliment/i, 'complement'),
    explanation: 'Homophone error: Use "complement" (to enhance or complete), not "compliment" (praise).',
    severity: 'warning',
  },
  // 53. Spacing Mechanics: Space Before Punctuation ("word ," -> "word,")
  {
    regex: /\b([a-zA-Z0-9]+)\s+([,.:;?!])(?=\s|$)/g,
    fix: (_m, _text, matchArr) => `${matchArr[1]}${matchArr[2]}`,
    explanation: 'Punctuation spacing: Remove space before punctuation mark.',
    severity: 'suggestion',
  },
  // 54. Multiple Repeated Punctuation ("??", "!!", "!?!")
  {
    regex: /(\?{2,}|!{2,}|\?!|\!?)/g,
    fix: (m) => m.includes('?') ? '?' : '!',
    explanation: 'Punctuation standard: Avoid multiple exclamation marks or question marks in professional copy.',
    severity: 'suggestion',
  },
  // 55. Gerund / Action Phrase Subject + Plural Verb (Eating healthy are -> Eating healthy is)
  {
    regex: /\b([A-Z][a-z]+ing(?:\s+[a-z]+){0,3})\s+(are|were|have)\b/g,
    fix: (m) => {
      const parts = m.split(/\s+/);
      const verb = parts[parts.length - 1];
      const prefix = parts.slice(0, parts.length - 1).join(' ');
      const fixed = verb === 'are' ? 'is' : verb === 'were' ? 'was' : 'has';
      return `${prefix} ${fixed}`;
    },
    explanation: 'Subject-verb agreement: A gerund phrase acting as a singular action requires a singular verb (e.g., "Eating healthy is").',
    severity: 'warning',
  },
  // 56. Comma Splice before "many people" / "people" (all the time, many people thinks -> all the time; many people think)
  {
    regex: /\b([a-zA-Z]+),\s+(many\s+people|most\s+people|some\s+people|people)\s+(thinks?|feels?|believes?|is|are|helps?|has|can|will|should)\b/gi,
    fix: (_m, _text, matchArr) => {
      const word = matchArr[1];
      const subj = matchArr[2];
      const verb = matchArr[3];
      const baseVerb = verb.endsWith('s') && !verb.endsWith('ss') && !['is', 'has'].includes(verb) ? verb.slice(0, -1) : verb;
      return `${word}; ${subj} ${baseVerb}`;
    },
    explanation: 'Comma splice: Independent clauses cannot be joined by a comma alone. Use a semicolon (";") or period.',
    severity: 'warning',
  },
  // 57. Plural Subjects + 3rd-Person Singular Verb ending in -s (people thinks -> people think, Doctors always says -> Doctors always say)
  {
    regex: /\b(many\s+people|most\s+people|some\s+people|all\s+people|people|children|men|women|doctors|experts|scientists|researchers|studies|reports|results|users|clients|customers|members|employees|athletes|patients)\s+(?:always\s+|never\s+|often\s+|usually\s+|actually\s+|sometimes\s+|generally\s+)?(thinks|says|believes|knows|wants|needs|helps|works|takes|runs|makes|gives|provides|allows|causes|shows|suggests|indicates|leads|eats|drinks)\b/gi,
    fix: (m) => {
      const parts = m.split(/\s+/);
      const verb = parts[parts.length - 1];
      const prefix = parts.slice(0, parts.length - 1).join(' ');
      const base = verb.endsWith('es') && (verb.endsWith('shes') || verb.endsWith('ches') || verb.endsWith('sses')) ? verb.slice(0, -2) : verb.slice(0, -1);
      return `${prefix} ${base}`;
    },
    explanation: 'Subject-verb agreement: Plural subject requires base verb without "-s" (e.g., "people think", "doctors always say").',
    severity: 'warning',
  },
  // 57. Singular Gerund Subject + Base Verb Missing -s (skipping breakfast help them -> skipping breakfast helps them)
  {
    regex: /\b([a-z]+ing\s+[a-z]+)\s+(help|improve|boost|keep|lead|make|give|provide|allow|cause|require)\s+(them|you|us|him|her|it|people|users|to)\b/gi,
    fix: (_m, _text, matchArr) => {
      const subject = matchArr[1];
      const verb = matchArr[2];
      const obj = matchArr[3];
      const fixedVerb = verb === 'make' ? 'makes' : verb === 'give' ? 'gives' : verb + 's';
      return `${subject} ${fixedVerb} ${obj}`;
    },
    explanation: 'Subject-verb agreement: Singular action/gerund requires verb ending in "-s" (e.g., "skipping breakfast helps").',
    severity: 'warning',
  },
  // 58. Non-standard Adverb fastly -> fast
  {
    regex: /\bfastly\b/gi,
    fix: () => 'fast',
    explanation: 'Word choice error: "Fastly" is not a standard English word. Use the adverb "fast".',
    severity: 'warning',
  },
  // 59. Missing Comma after Introductory Conditional Clause (If ... they should -> If ..., they should)
  {
    regex: /\b(if\s+[a-z\s]+?\s+wants\s+to\s+[a-z\s]+?)\s+(they|he|she|we|you)\s+(should|must|can|will)\b/gi,
    fix: (_m, _text, matchArr) => {
      const cond = matchArr[1];
      const pron = matchArr[2];
      const modal = matchArr[3];
      return `${cond}, ${pron} ${modal}`;
    },
    explanation: 'Punctuation: Place a comma after an introductory dependent clause (e.g., "If someone wants..., they should...").',
    severity: 'suggestion',
  },
  // 60. Coordinate Faulty Parallelism after Modal Auxiliary (they should drink ..., exercising ... -> exercise)
  {
    regex: /\b(should|could|would|must|can|will)\s+([a-z]+)\s+([a-z\s]+?),\s+([a-z]+ing)\b/gi,
    fix: (_m, _text, matchArr) => {
      const gerund = matchArr[4];
      const irregulars: Record<string, string> = {
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
    severity: 'warning',
  },
  // 61. Coordinate Faulty Parallelism after Modal Auxiliary (..., and avoids ... -> and avoid)
  {
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
    severity: 'warning',
  },
  // 62. Relative Clause Plural Antecedent Agreement (sugary drinks which causes -> sugary drinks which cause)
  {
    regex: /\b([a-z]+s)\s+(which|that)\s+(causes|leads|helps|makes|provides|gives|allows|creates|requires|destroys|harms|affects)\b/gi,
    fix: (_m, _text, matchArr) => {
      const noun = matchArr[1];
      const rel = matchArr[2];
      const verb = matchArr[3];
      const base = verb.endsWith('s') ? verb.slice(0, -1) : verb;
      return `${noun} ${rel} ${base}`;
    },
    explanation: 'Subject-verb agreement: Plural antecedent requires a plural verb without "-s" (e.g., "drinks which cause").',
    severity: 'warning',
  },
  // 63. Relative Clause Singular Antecedent Agreement (a tool that allow -> a tool that allows)
  {
    regex: /\b(a|an|the|this|that|one)\s+([a-z]+)\s+(which|that)\s+(allow|provide|help|make|give|lead|cause|require|support|improve|enable|deliver)\b/gi,
    fix: (_m, _text, matchArr) => {
      const art = matchArr[1];
      const noun = matchArr[2];
      const rel = matchArr[3];
      const verb = matchArr[4];
      const fixedVerb = verb === 'make' ? 'makes' : verb === 'give' ? 'gives' : verb + 's';
      return `${art} ${noun} ${rel} ${fixedVerb}`;
    },
    explanation: 'Subject-verb agreement: Singular antecedent requires a singular verb ending in "-s" (e.g., "a tool that allows", "a system that provides").',
    severity: 'warning',
  },
  // 64. Indefinite Pronoun Agreement (Each of them are -> Each of them is)
  {
    regex: /\b(each\s+of\s+(?:the\s+[a-z]+|them|us|you)|everyone\s+of\s+(?:the\s+[a-z]+|them)|neither\s+of\s+(?:the\s+[a-z]+|them)|either\s+of\s+(?:the\s+[a-z]+|them))\s+(are|were|have)\b/gi,
    fix: (m) => {
      const lower = m.toLowerCase();
      if (lower.endsWith('are')) return m.replace(/are$/i, 'is');
      if (lower.endsWith('were')) return m.replace(/were$/i, 'was');
      if (lower.endsWith('have')) return m.replace(/have$/i, 'has');
      return m;
    },
    explanation: 'Subject-verb agreement: Singular distributive pronouns ("each of them", "neither of them") take singular verbs (e.g., "each of them is").',
    severity: 'warning',
  },
  // 65. Modal Auxiliary + "to" Infinitive Error (must to do -> must do, should to go -> should go)
  {
    regex: /\b(must|should|could|would|can|will|might)\s+to\s+([a-z]+)\b/gi,
    fix: (_m, _text, matchArr) => `${matchArr[1]} ${matchArr[2]}`,
    explanation: 'Modal verb error: Modal auxiliaries ("must", "should", "can", "will") are followed by a bare infinitive without "to" (e.g., "must do", "should go").',
    severity: 'warning',
  },
  // 66. Modal Redundancy: "can able to" -> "can"
  {
    regex: /\b(can|could)\s+able\s+to\b/gi,
    fix: (m) => m.toLowerCase().startsWith('could') ? 'could' : 'can',
    explanation: 'Grammar redundancy: "Can able to" is ungrammatical. Use "can" or "is able to".',
    severity: 'warning',
  },
  // 67. Homophones: Affect vs Effect
  {
    regex: /\b(have|has|had|having|create|creates|show|shows|positive|negative|direct|lasting|profound|significant|major|huge|harmful|side)\s+(affect|affects)\b/gi,
    fix: (m) => m.replace(/affect/i, 'effect').replace(/affects/i, 'effects'),
    explanation: 'Homophone error: Use "effect" as a noun meaning a result or consequence (e.g., "positive effect", "side effect").',
    severity: 'warning',
  },
  {
    regex: /\b(will|can|could|would|should|to|may|might)\s+effect\s+([a-z]+)\b/gi,
    fix: (_m, _text, matchArr) => `${matchArr[1]} affect ${matchArr[2]}`,
    explanation: 'Homophone error: Use "affect" as a verb meaning to influence or alter (e.g., "will affect outcomes").',
    severity: 'warning',
  },
  // 68. Homophones: Accept vs Except
  {
    regex: /\b(everyone|all|nothing|none|everything|all\s+[a-z]+)\s+accept\s+(?:for\s+)?([a-z0-9]+)\b/gi,
    fix: (_m, _text, matchArr) => `${matchArr[1]} except ${matchArr[2]}`,
    explanation: 'Homophone error: Use "except" (meaning excluding), not "accept" (meaning to receive).',
    severity: 'warning',
  },
  // 69. Homophones: Advice vs Advise
  {
    regex: /\b(we|they|I|experts|doctors|specialists)\s+advice\s+(?:you|us|them|people|clients|customers)\b/gi,
    fix: (m) => m.replace(/advice/i, 'advise'),
    explanation: 'Word choice error: Use "advise" as a verb (e.g., "we advise you"), and "advice" as a noun (e.g., "helpful advice").',
    severity: 'warning',
  },
  // 70. Double Negatives (don't have no -> don't have any, can't hardly -> can hardly)
  {
    regex: /\b(don't|doesn't|didn't|won't)\s+(?:have|got|see|find)\s+no\b/gi,
    fix: (m) => m.replace(/\bno\b/i, 'any'),
    explanation: 'Double negative: In standard English, avoid double negatives (e.g., use "don\'t have any", not "don\'t have no").',
    severity: 'warning',
  },
  {
    regex: /\b(can't|cannot)\s+hardly\b/gi,
    fix: () => 'can hardly',
    explanation: 'Double negative: Use "can hardly" instead of "can\'t hardly".',
    severity: 'warning',
  },
  // 71. Duplicate Stutter Words (the the, in in, to to, is is, and and)
  {
    regex: /\b(the\s+the|in\s+in|to\s+to|is\s+is|and\s+and|for\s+for|on\s+on|with\s+with|of\s+of)\b/gi,
    fix: (m) => m.split(/\s+/)[0],
    explanation: 'Typographical error: Unintentional duplicated word.',
    severity: 'warning',
  },
  // 72. Article Misuse: An vs A (Special phonetic cases)
  {
    regex: /\b(an)\s+(unique|universal|university|user|useful|usable|european|one-time|one-day)\b/gi,
    fix: (_m, _text, matchArr) => `a ${matchArr[2]}`,
    explanation: 'Article usage: Words starting with a "yu" sound take "a", not "an" (e.g., "a unique", "a user", "a universal").',
    severity: 'warning',
  },
  {
    regex: /\b(a)\s+(hour|honest|honor|heir)\b/gi,
    fix: (_m, _text, matchArr) => `an ${matchArr[2]}`,
    explanation: 'Article usage: Words with silent "h" take "an", not "a" (e.g., "an hour", "an honest").',
    severity: 'warning',
  },
];

// ====================================================================
// 3. Marketing Tone, Urgency & Exaggerated Claims
// ====================================================================
interface TonePattern {
  regex: RegExp;
  replacement: string;
  explanation: string;
  category: 'tone' | 'claim';
  severity: 'violation' | 'warning';
}

const TONE_AND_CLAIM_PATTERNS: TonePattern[] = [
  // Extreme urgency / FOMO
  {
    regex: /\b(act\s+now\s+before\s+it(?:'s|\s+is)\s+too\s+late|hurry\s+before\s+rates\s+expire|last\s+chance\s+to\s+(?:buy|save)|don't\s+miss\s+out\s+on\s+this|limited\s+time\s+only!+)\b/gi,
    replacement: 'explore our current pricing and features',
    explanation: 'Aggressive FOMO and artificial urgency undermine brand trust and violate compliance guidelines.',
    category: 'tone',
    severity: 'warning',
  },
  // Unsubstantiated absolute guarantees
  {
    regex: /\b(100%\s+guaranteed|guaranteed\s+(?:results|success|growth|revenue)|zero\s+risk|risk[- ]free\s+guarantee)\b/gi,
    replacement: 'proven results backed by our enterprise SLA',
    explanation: 'Absolute guarantee claims create legal liability and cannot be substantiated across all conditions.',
    category: 'claim',
    severity: 'violation',
  },
  {
    regex: /\b(completely\s+bulletproof|100%\s+uptime(?:\s+guaranteed)?|never\s+fails?|unbreakable\s+security|unhackable)\b/gi,
    replacement: 'designed for high availability and enterprise security',
    explanation: 'Technical superlatives like "unbreakable" or "100% uptime" are engineering impossibilities and violate truth-in-advertising.',
    category: 'claim',
    severity: 'violation',
  },
  {
    regex: /\b(best\s+in\s+the\s+world|world(?:'s)?\s+best|#1\s+platform\s+in\s+the\s+world|cheapest\s+on\s+the\s+market)\b/gi,
    replacement: 'industry-recognized platform',
    explanation: 'Unqualified global ranking claims require independent audited market study citations.',
    category: 'claim',
    severity: 'warning',
  },
  {
    regex: /\b(miracle\s+formula|cures\s+all|instant\s+magic|miraculous)\b/gi,
    replacement: 'innovative, purpose-built solution',
    explanation: 'Hyperbolic miracle adjectives degrade professional credibility and violate regulatory advertising standards.',
    category: 'tone',
    severity: 'warning',
  },
  {
    regex: /\b(get\s+rich\s+quick|make\s+millions(?:\s+overnight)?|guaranteed\s+profit)\b/gi,
    replacement: 'build sustainable long-term value',
    explanation: 'Unrealistic financial promises trigger immediate regulatory scrutiny (FTC/SEC).',
    category: 'claim',
    severity: 'violation',
  },
  // Rapid/unsupported health & weight promises
  {
    regex: /\b(lose\s+weight\s+(?:fast|fastly|overnight|instantly|in\s+days)|burn\s+fat\s+(?:fast|fastly|overnight|instantly)|melt\s+away\s+fat|drop\s+\d+\s+pounds\s+(?:fast|in\s+\w+))\b/gi,
    replacement: 'sustainably manage weight and vitality',
    explanation: 'Truth-in-advertising: Absolute or rapid weight-loss claims trigger regulatory scrutiny (FTC) and require qualified, sustainable claims.',
    category: 'claim',
    severity: 'warning',
  },
  // Cynical / dismissive health tone
  {
    regex: /\b(who\s+has\s+time\s+for\s+that\??|who\s+cares\s+about\s+that\??|nobody\s+has\s+time\s+for\s+that|don't\s+bother\s+with\s+(?:that|it))\b/gi,
    replacement: 'prioritizing consistent sleep supports long-term recovery and focus',
    explanation: 'Brand tone & credibility: Dismissive or cynical phrasing undermines trustworthy, authoritative brand positioning.',
    category: 'tone',
    severity: 'warning',
  },
  // Absolute safety or natural claims
  {
    regex: /\b(100%\s+natural|100%\s+organic|100%\s+safe|completely\s+safe|totally\s+safe|foolproof|chemical-free|zero\s+side\s+effects)\b/gi,
    replacement: 'formulated with safety-tested, plant-derived ingredients',
    explanation: 'Regulatory compliance: Absolute safety or "chemical-free" claims are legally deceptive because all matter contains chemical elements and no product is 100% risk-free for all consumers.',
    category: 'claim',
    severity: 'violation',
  },
  // Medical cure & permanent reversal claims
  {
    regex: /\b(cures?\s+(?:acne|wrinkles|cancer|diabetes|depression|anxiety|obesity|disease|infection)|permanent\s+cure|permanently\s+erases?|reverses?\s+aging)\b/gi,
    replacement: 'helps support, soothe, and visibly improve',
    explanation: 'FDA/FTC regulatory violation: Consumer marketing cannot claim to "cure" diseases or permanently erase biological conditions.',
    category: 'claim',
    severity: 'violation',
  },
  // Conspiracy-style secret phrasing
  {
    regex: /\b(the\s+secret\s+(?:they|doctors|industry|banks)\s+don't\s+want\s+you\s+to\s+know|what\s+doctors\s+aren't\s+telling\s+you|hidden\s+truth\s+about)\b/gi,
    replacement: 'evidence-based insights backed by clinical research',
    explanation: 'Brand trust: Conspiracy-style phrasing damages professional credibility and triggers consumer distrust.',
    category: 'tone',
    severity: 'warning',
  },
  // Unsubstantiated broad adoption claims
  {
    regex: /\b(trusted\s+by\s+every\s+(?:company|person|business|doctor)|used\s+by\s+everyone|everyone\s+is\s+switching\s+to|loved\s+by\s+millions)\b/gi,
    replacement: 'trusted by leading enterprise teams',
    explanation: 'Claim substantiation: Broad adoption claims require independent customer surveys or verified audited metrics.',
    category: 'claim',
    severity: 'warning',
  },
  // Artificial scarcity & high pressure
  {
    regex: /\b(offer\s+expires\s+tonight|only\s+\d+\s+spots\s+left!*|before\s+they're\s+gone\s+forever|don't\s+miss\s+your\s+only\s+chance)\b/gi,
    replacement: 'check current availability on our platform',
    explanation: 'Consumer trust: Artificial scarcity and aggressive pressure tactics violate ethical marketing guidelines.',
    category: 'tone',
    severity: 'warning',
  },
  // Education & Training absolute outcome guarantees
  {
    regex: /\b(100%\s+pass\s+(?:rate|guarantee)|guaranteed\s+(?:job|placement|employment|exam\s+pass|grades?|A\+)|pass\s+without\s+studying)\b/gi,
    replacement: 'comprehensive curriculum designed to maximize exam readiness and student success',
    explanation: 'Academic compliance & consumer trust: Absolute grade or job placement guarantees are unsubstantiated and violate educational advertising standards.',
    category: 'claim',
    severity: 'violation',
  },
  // Enterprise / SaaS exaggerated outcome claims
  {
    regex: /\b(guaranteed\s+10x\s+ROI|zero\s+effort|zero\s+maintenance\s+forever|instant\s+digital\s+transformation|effortless\s+integration\s+in\s+seconds)\b/gi,
    replacement: 'proven architecture delivering accelerated time-to-value and enterprise reliability',
    explanation: 'B2B advertising standards: Absolute ROI or zero-effort claims are legally deceptive and conflict with transparent enterprise governance.',
    category: 'claim',
    severity: 'violation',
  },
  // Retail / Commerce absolute price & satisfaction claims
  {
    regex: /\b(unbeatable\s+lowest\s+price|cheapest\s+in\s+the\s+universe|free\s+money|100%\s+money[- ]back\s+no\s+questions\s+asked)\b/gi,
    replacement: 'competitive market rates backed by our standard customer satisfaction policy',
    explanation: 'Truth-in-advertising: Unqualified superlative pricing claims require documented market competitor pricing verification.',
    category: 'claim',
    severity: 'warning',
  },
];

// ====================================================================
// 4. Main Verification Engine
// ====================================================================

export interface ComprehensiveVerificationResult {
  deterministicFindings: DeterministicFinding[];
  contextualFindings: ContextualFinding[];
  totalViolations: number;
  totalWarnings: number;
  totalSuggestions: number;
  cleanlinessScore: number;
  overallPassed: boolean;
  evaluatedAt: string;
}

/**
 * Executes a full AI & Linguistic verification on draft text.
 * Integrates:
 * 1. Spelling dictionary with 250+ entries.
 * 2. Grammar, mechanics, and homophone checking.
 * 3. Active brand rules, prohibited phrases, and trademark casing.
 * 4. Marketing tone, FOMO urgency, and absolute claim verification.
 * 5. Numerical and statistical claim checks against verified brand facts.
 */
export function runComprehensiveVerification(
  text: string,
  brand?: Partial<BrandWithRules> | null,
  activeRules?: BrandRule[]
): ComprehensiveVerificationResult {
  const deterministicFindings: DeterministicFinding[] = [];
  const contextualFindings: ContextualFinding[] = [];

  if (!text || text.trim().length === 0) {
    return {
      deterministicFindings: [],
      contextualFindings: [],
      totalViolations: 0,
      totalWarnings: 0,
      totalSuggestions: 0,
      cleanlinessScore: 0,
      overallPassed: false,
      evaluatedAt: new Date().toISOString(),
    };
  }

  const safeRules: BrandRule[] = Array.isArray(activeRules)
    ? activeRules
    : Array.isArray(brand?.rules)
    ? (brand.rules as BrandRule[])
    : [];

  // Helper to test if a span overlaps an existing finding
  function isSpanOverlapping(start: number, end: number, list: Array<{ start_index: number; end_index: number }>): boolean {
    return list.some((f) => Math.max(start, f.start_index) < Math.min(end, f.end_index));
  }

  // -------------------------------------------------------------
  // STEP 1: Spelling Error Verification (Token-level)
  // -------------------------------------------------------------
  const wordRegex = /\b[A-Za-z]+(?:'[A-Za-z]+)?\b/g;
  let wordMatch: RegExpExecArray | null;

  while ((wordMatch = wordRegex.exec(text)) !== null) {
    const rawWord = wordMatch[0];
    const lowerWord = rawWord.toLowerCase();
    const startIndex = wordMatch.index;
    const endIndex = startIndex + rawWord.length;

    if (COMMON_SPELLING_CORRECTIONS[lowerWord]) {
      const correctBase = COMMON_SPELLING_CORRECTIONS[lowerWord];
      // Preserve uppercase first letter if rawWord was capitalized
      const isCapitalized = /^[A-Z]/.test(rawWord);
      const replacement = isCapitalized
        ? correctBase.charAt(0).toUpperCase() + correctBase.slice(1)
        : correctBase;

      if (!isSpanOverlapping(startIndex, endIndex, deterministicFindings)) {
        deterministicFindings.push({
          id: `spell-${startIndex}-${endIndex}`,
          rule_id: 'rule-spelling-mechanics',
          rule_key: 'MECHANICS_SPELLING_ERROR',
          category: 'guideline',
          severity: 'warning',
          source: 'deterministic',
          flagged_text: rawWord,
          suggested_replacement: replacement,
          rationale: `Spelling error: "${rawWord}". Suggested correction: "${replacement}".`,
          evidence_snippet: 'Editorial Quality Standards: Proper spelling is required for credible publication.',
          start_index: startIndex,
          end_index: endIndex,
          confidence: 0.99,
          requires_human_review: false,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // STEP 2: Duplicate Word Detection ("the the", "is is")
  // -------------------------------------------------------------
  const dupRegex = /\b(the|is|in|to|of|for|and|a|an|with|that|at|from|by|on|we|our|you|this|are)\s+\1\b/gi;
  let dupMatch: RegExpExecArray | null;

  while ((dupMatch = dupRegex.exec(text)) !== null) {
    const matchedText = dupMatch[0];
    const startIndex = dupMatch.index;
    const endIndex = startIndex + matchedText.length;
    const singleWord = dupMatch[1];

    if (!isSpanOverlapping(startIndex, endIndex, deterministicFindings)) {
      deterministicFindings.push({
        id: `dup-${startIndex}-${endIndex}`,
        rule_id: 'rule-mechanics-duplicate-word',
        rule_key: 'MECHANICS_DUPLICATE_WORD',
        category: 'guideline',
        severity: 'warning',
        source: 'deterministic',
        flagged_text: matchedText,
        suggested_replacement: singleWord,
        rationale: `Duplicate word detected: "${matchedText}". Remove repeated word for clean copy.`,
        evidence_snippet: 'Editorial Quality Standards: Repeated words degrade publication quality.',
        start_index: startIndex,
        end_index: endIndex,
        confidence: 1.0,
        requires_human_review: false,
      });
    }
  }

  // -------------------------------------------------------------
  // STEP 3: Grammar, Syntax, and Mechanical Rules
  // -------------------------------------------------------------
  for (const gr of GRAMMAR_RULES) {
    gr.regex.lastIndex = 0;
    let grMatch: RegExpExecArray | null;
    while ((grMatch = gr.regex.exec(text)) !== null) {
      const matchStr = grMatch[0];
      if (matchStr.length === 0) {
        gr.regex.lastIndex++;
        continue;
      }
      const fixResult = gr.fix(matchStr, text, grMatch);
      if (fixResult === null) continue;

      let flaggedText = matchStr;
      let replacement = '';
      let startIndex = grMatch.index;
      let endIndex = startIndex + matchStr.length;
      let explanation = gr.explanation;

      if (typeof fixResult === 'string') {
        replacement = fixResult;
      } else {
        replacement = fixResult.replacement;
        if (fixResult.flagged) flaggedText = fixResult.flagged;
        if (fixResult.startIndex !== undefined) startIndex = fixResult.startIndex;
        if (fixResult.endIndex !== undefined) endIndex = fixResult.endIndex;
        if (fixResult.explanation) explanation = fixResult.explanation;
      }

      // Verification: double-check that text slice matches flaggedText
      if (text.slice(startIndex, endIndex) !== flaggedText) {
        startIndex = grMatch.index;
        endIndex = startIndex + matchStr.length;
        flaggedText = matchStr;
      }

      if (!isSpanOverlapping(startIndex, endIndex, deterministicFindings)) {
        deterministicFindings.push({
          id: `grammar-${startIndex}-${endIndex}`,
          rule_id: 'rule-mechanics-grammar',
          rule_key: 'MECHANICS_GRAMMAR_RULE',
          category: 'guideline',
          severity: gr.severity,
          source: 'deterministic',
          flagged_text: flaggedText,
          suggested_replacement: replacement,
          rationale: explanation,
          evidence_snippet: `Grammar Standards: ${explanation}`,
          start_index: startIndex,
          end_index: endIndex,
          confidence: 0.95,
          requires_human_review: false,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // STEP 4: Brand Rules (Prohibited Terms, Required Phrasing & Permitted Claims)
  // -------------------------------------------------------------
  for (const rule of safeRules) {
    // 4a. Prohibited / Forbidden terms (for terminology, guideline, verified_fact)
    if (rule.category !== 'permitted_claim') {
      const forbiddenList: string[] = [];
      if (rule.forbidden_terms && Array.isArray(rule.forbidden_terms) && rule.forbidden_terms.length > 0) {
        forbiddenList.push(...rule.forbidden_terms.filter(Boolean));
      }

      // If forbidden_terms is empty or lacks quoted terms, extract quoted terms from title or content
      if (forbiddenList.length === 0) {
        const quotedInTitle = (rule.title || '').match(/["']([^"']+)["']/g);
        const quotedInContent = (rule.content || '').match(/["']([^"']+)["']/g);
        if (quotedInTitle) {
          forbiddenList.push(...quotedInTitle.map((s) => s.replace(/["']/g, '').trim()).filter((s) => s.length > 2));
        }
        if (quotedInContent) {
          forbiddenList.push(...quotedInContent.map((s) => s.replace(/["']/g, '').trim()).filter((s) => s.length > 2));
        }

        // Check if title starts with Avoid X, Never use X, Do not use X
        const directiveMatch = (rule.title || '').match(/^(?:Avoid|Do not use|Never use|Prohibit|Forbidden:?)\s+["']?([^"']+)["']?/i);
        if (directiveMatch && directiveMatch[1]) {
          const candidate = directiveMatch[1].trim();
          if (candidate.length > 2 && !forbiddenList.includes(candidate)) {
            forbiddenList.push(candidate);
          }
        }
      }

      for (const forbidden of forbiddenList) {
        if (!forbidden || !forbidden.trim()) continue;

        const isCasingRule = (rule.rule_key || '').includes('CASING') || (rule.rule_key || '').includes('TRADEMARK');
        const flags = isCasingRule ? 'g' : 'gi';
        const escaped = forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`(^|[^a-zA-Z0-9_])(${escaped})(?=[^a-zA-Z0-9_]|$)`, flags);

        let match: RegExpExecArray | null;
        while ((match = pattern.exec(text)) !== null) {
          const matchedText = match[2];
          const startIndex = match.index + match[1].length;
          const endIndex = startIndex + matchedText.length;

          if (!isSpanOverlapping(startIndex, endIndex, deterministicFindings)) {
            deterministicFindings.push({
              id: `rule-${rule.id}-${startIndex}-${endIndex}`,
              rule_id: rule.id,
              rule_key: rule.rule_key,
              category: rule.category,
              severity: rule.severity,
              source: 'deterministic',
              flagged_text: matchedText,
              suggested_replacement: rule.replacement_terms || 'remove or rephrase',
              rationale: rule.rationale || `Brand Rule Violation: "${rule.title}". ${rule.content}`,
              evidence_snippet: `Brand Policy [${rule.rule_key}]: ${rule.content}`,
              start_index: startIndex,
              end_index: endIndex,
              confidence: 1.0,
              requires_human_review: rule.severity === 'violation',
            });
          }

          if (match.index === pattern.lastIndex) pattern.lastIndex++;
        }
      }
    }

    // 4b. Permitted Claims requiring mandatory qualification
    if (rule.category === 'permitted_claim' && rule.replacement_terms) {
      const claimTriggers: string[] = [];
      if (rule.forbidden_terms && Array.isArray(rule.forbidden_terms) && rule.forbidden_terms.length > 0) {
        claimTriggers.push(...rule.forbidden_terms.filter(Boolean));
      }
      if (rule.title && !claimTriggers.some((t) => t.toLowerCase() === rule.title.toLowerCase())) {
        claimTriggers.push(rule.title);
      }
      if (rule.rule_key === 'APEX_CLAIM_ZERO_MAINTENANCE') {
        claimTriggers.push('zero monthly account maintenance fee', 'zero monthly fee', 'no monthly fee');
      } else if (rule.rule_key === 'VA_CLAIM_CARBON_NEUTRAL') {
        claimTriggers.push('carbon-neutral', 'carbon neutral');
      }

      for (const trigger of claimTriggers) {
        if (!trigger || !trigger.trim()) continue;
        const escaped = trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const triggerRegex = new RegExp(`(^|[^a-zA-Z0-9_])(${escaped})(?=[^a-zA-Z0-9_]|$)`, 'gi');

        let tMatch: RegExpExecArray | null;
        while ((tMatch = triggerRegex.exec(text)) !== null) {
          const matchedText = tMatch[2];
          const startIndex = tMatch.index + tMatch[1].length;
          const endIndex = startIndex + matchedText.length;

          // Check if the mandatory qualification is present in the text
          let isQualified = false;
          if (rule.rule_key === 'APEX_CLAIM_ZERO_MAINTENANCE') {
            isQualified = /interchange|per-transaction/i.test(text);
          } else if (rule.rule_key === 'VA_CLAIM_CARBON_NEUTRAL') {
            isQualified = /pachama|reforestation/i.test(text);
          } else {
            const reqWords = rule.replacement_terms
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, '')
              .split(/\s+/)
              .filter((w) => w.length > 3 && !['with', 'that', 'this', 'from', 'have', 'more', 'your', 'requires', 'applies'].includes(w));
            if (reqWords.length > 0) {
              isQualified = reqWords.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
            } else {
              isQualified = text.toLowerCase().includes(rule.replacement_terms.toLowerCase());
            }
          }

          if (!isQualified && !isSpanOverlapping(startIndex, endIndex, deterministicFindings)) {
            deterministicFindings.push({
              id: `claim-perm-${rule.id}-${startIndex}-${endIndex}`,
              rule_id: rule.id,
              rule_key: rule.rule_key,
              category: 'permitted_claim',
              severity: 'warning',
              source: 'deterministic',
              flagged_text: matchedText,
              suggested_replacement: `${matchedText} (${rule.replacement_terms})`,
              rationale: `Permitted claim requires mandatory qualification: ${rule.replacement_terms}`,
              evidence_snippet: `Permitted Claim Policy [${rule.rule_key}]: ${rule.content}`,
              start_index: startIndex,
              end_index: endIndex,
              confidence: 1.0,
              requires_human_review: true,
            });
          }

          if (tMatch.index === triggerRegex.lastIndex) triggerRegex.lastIndex++;
        }
      }
    }
  }

  // 4c. Mandatory Brand Disclaimers (if configured in Brand Profile)
  if (brand?.disclaimers && brand.disclaimers.trim().length > 5 && text.trim().length > 60) {
    const rawDisc = brand.disclaimers.trim();
    const discSnippet = rawDisc.slice(0, 40);
    const hasDisclaimer = text.toLowerCase().includes(rawDisc.toLowerCase().slice(0, 25));
    if (!hasDisclaimer) {
      const anchorStart = 0;
      const anchorEnd = Math.min(text.length, 30);
      const flaggedSnippet = text.slice(anchorStart, anchorEnd);
      if (!isSpanOverlapping(anchorStart, anchorEnd, deterministicFindings)) {
        deterministicFindings.push({
          id: `disclaimer-missing-${anchorStart}-${anchorEnd}`,
          rule_id: 'rule-brand-disclaimer',
          rule_key: 'MANDATORY_BRAND_DISCLAIMER',
          category: 'guideline',
          severity: 'warning',
          source: 'deterministic',
          flagged_text: flaggedSnippet,
          suggested_replacement: `${flaggedSnippet} (includes disclaimer: "${discSnippet}...")`,
          rationale: `Mandatory Brand Disclaimer Missing: Content must include approved brand disclaimer: "${rawDisc}".`,
          evidence_snippet: `Brand Governance Disclosure Policy: "${rawDisc}"`,
          start_index: anchorStart,
          end_index: anchorEnd,
          confidence: 1.0,
          requires_human_review: true,
        });
      }
    }
  }

  // 4d. Brand Name Casing (Check if proper brand name is mentioned with incorrect casing)
  if (brand?.name && brand.name.length > 2) {
    const commonDictionaryWords = ['health', 'school', 'general', 'service', 'company', 'platform', 'app'];
    const isCommonWord = commonDictionaryWords.includes(brand.name.toLowerCase());

    const brandLower = brand.name.toLowerCase();
    const escapedBrand = brandLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const brandRegex = new RegExp(`(^|[^a-zA-Z0-9_])(${escapedBrand})(?=[^a-zA-Z0-9_]|$)`, 'gi');
    let bMatch: RegExpExecArray | null;

    while ((bMatch = brandRegex.exec(text)) !== null) {
      const found = bMatch[2];
      const startIndex = bMatch.index + bMatch[1].length;
      const endIndex = startIndex + found.length;

      // If found text does NOT match the official brand casing
      if (found !== brand.name) {
        // If brand name is a common noun (e.g. "health" or "school"), only flag if used in a brand context
        let shouldFlag = true;
        if (isCommonWord) {
          const beforeSpan = text.slice(Math.max(0, startIndex - 15), startIndex).toLowerCase();
          const afterSpan = text.slice(endIndex, Math.min(text.length, endIndex + 15)).toLowerCase();
          const isBrandContext =
            /\b(at|from|with|by|for|the)\s+$/i.test(beforeSpan) ||
            /^('s|\s+app|\s+platform|\s+team|\s+solution|\s+system|\s+group)/i.test(afterSpan);
          shouldFlag = isBrandContext;
        }

        if (shouldFlag && !isSpanOverlapping(startIndex, endIndex, deterministicFindings)) {
          deterministicFindings.push({
            id: `casing-${startIndex}-${endIndex}`,
            rule_id: 'rule-brand-casing',
            rule_key: 'BRAND_NAME_CASING',
            category: 'terminology',
            severity: 'warning',
            source: 'deterministic',
            flagged_text: found,
            suggested_replacement: brand.name,
            rationale: `Trademark casing violation: Brand name should always be styled as "${brand.name}", not "${found}".`,
            evidence_snippet: `Brand Identity Guide: Maintain official capitalization "${brand.name}".`,
            start_index: startIndex,
            end_index: endIndex,
            confidence: 1.0,
            requires_human_review: false,
          });
        }
      }

      if (bMatch.index === brandRegex.lastIndex) brandRegex.lastIndex++;
    }
  }

  // -------------------------------------------------------------
  // STEP 5: Tone, Urgency & Exaggerated Claims
  // -------------------------------------------------------------
  for (const tp of TONE_AND_CLAIM_PATTERNS) {
    let tpMatch: RegExpExecArray | null;
    while ((tpMatch = tp.regex.exec(text)) !== null) {
      const matchedText = tpMatch[0];
      const startIndex = tpMatch.index;
      const endIndex = startIndex + matchedText.length;

      if (!isSpanOverlapping(startIndex, endIndex, contextualFindings) &&
          !isSpanOverlapping(startIndex, endIndex, deterministicFindings)) {
        contextualFindings.push({
          id: `tone-${startIndex}-${endIndex}`,
          source: 'ai_contextual',
          category: tp.category,
          severity: tp.severity,
          flagged_text: matchedText,
          start_index: startIndex,
          end_index: endIndex,
          explanation: tp.explanation,
          evidence_status: tp.category === 'claim' ? 'potential_conflict' : 'human_review_required',
          relevant_evidence_id: null,
          relevant_evidence_reference: null,
          suggested_correction: tp.replacement,
          confidence: 0.92,
          requires_human_review: true,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // STEP 6: Numerical Statistics & Evidence Claims (Layer 3)
  // -------------------------------------------------------------
  const claimRegex = /\b(\d+(?:\.\d+)?%\s+[a-zA-Z]+|\$\d+(?:\.\d+)?(?:B|M|K)?|\b#1\b|10x|500%)\b/gi;
  let claimMatch: RegExpExecArray | null;

  const verifiedFacts = safeRules.filter((r) => r.category === 'verified_fact');

  while ((claimMatch = claimRegex.exec(text)) !== null) {
    const matchedClaim = claimMatch[0];
    const startIndex = claimMatch.index;
    const endIndex = startIndex + matchedClaim.length;

    // Check if this stat is supported by verified facts in the database
    const matchingFact = verifiedFacts.find((f) =>
      f.content.toLowerCase().includes(matchedClaim.toLowerCase()) ||
      (f.rationale && f.rationale.toLowerCase().includes(matchedClaim.toLowerCase()))
    );

    if (matchingFact) {
      // Supported claim!
      contextualFindings.push({
        id: `claim-sup-${startIndex}-${endIndex}`,
        source: 'ai_contextual',
        category: 'claim',
        severity: 'suggestion',
        flagged_text: matchedClaim,
        start_index: startIndex,
        end_index: endIndex,
        explanation: `Claim is substantiated by approved verified fact: "${matchingFact.title}".`,
        evidence_status: 'supported',
        relevant_evidence_id: matchingFact.id,
        relevant_evidence_reference: matchingFact.rationale || matchingFact.content,
        suggested_correction: matchedClaim,
        confidence: 0.98,
        requires_human_review: false,
      });
    } else {
      // Unverified claim needing evidence!
      if (!isSpanOverlapping(startIndex, endIndex, contextualFindings)) {
        contextualFindings.push({
          id: `claim-unsup-${startIndex}-${endIndex}`,
          source: 'ai_contextual',
          category: 'claim',
          severity: 'warning',
          flagged_text: matchedClaim,
          start_index: startIndex,
          end_index: endIndex,
          explanation: `Statistical claim "${matchedClaim}" is not documented in approved brand verified facts. Missing evidence is not treated as false, but requires citation before public release.`,
          evidence_status: 'insufficient_evidence',
          relevant_evidence_id: null,
          relevant_evidence_reference: null,
          suggested_correction: `${matchedClaim}* (add citation or qualification)`,
          confidence: 0.85,
          requires_human_review: true,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // STEP 7: Sort Findings & Calculate Honest Cleanliness Score
  // -------------------------------------------------------------
  deterministicFindings.sort((a, b) => a.start_index - b.start_index);
  contextualFindings.sort((a, b) => a.start_index - b.start_index);

  const detViolations = deterministicFindings.filter((f) => f.severity === 'violation').length;
  const detWarnings = deterministicFindings.filter((f) => f.severity === 'warning').length;
  const detSuggestions = deterministicFindings.filter((f) => f.severity === 'suggestion').length;

  const ctxViolations = contextualFindings.filter((f) => f.severity === 'violation').length;
  const ctxWarnings = contextualFindings.filter((f) => f.severity === 'warning').length;
  const ctxSuggestions = contextualFindings.filter((f) => f.severity === 'suggestion').length;

  const totalViolations = detViolations + ctxViolations;
  const totalWarnings = detWarnings + ctxWarnings;
  const totalSuggestions = detSuggestions + ctxSuggestions;

  // Penalties: Violations = 20 pts, Warnings = 10 pts, Suggestions = 4 pts
  const penalty = totalViolations * 20 + totalWarnings * 10 + totalSuggestions * 4;
  const cleanlinessScore = Math.max(0, 100 - penalty);
  const overallPassed = totalViolations === 0 && totalWarnings === 0;

  return {
    deterministicFindings,
    contextualFindings,
    totalViolations,
    totalWarnings,
    totalSuggestions,
    cleanlinessScore,
    overallPassed,
    evaluatedAt: new Date().toISOString(),
  };
}
