// Bad-word lists for the customer review form hint. Keep the term arrays
// identical to backend/api/utils/profanityWords.ts
//
// This copy is for instant feedback while typing only. The backend is the
// enforcement point (backend/api/utils/profanityFilter.ts), so this matcher is
// deliberately simpler: whole-word matching, no separator/leet handling.

export type ProfanitySeverity = 1 | 2;

export const SEVERE_TERMS: string[] = [
  // English
  'fuck',
  'fucking',
  'fucked',
  'fck',
  'fuk',
  'fux',
  'phuck',
  'shit',
  'shitty',
  'bullshit',
  'motherfucker',
  'motherfucking',
  'bitch',
  'biatch',
  'cunt',
  'wanker',
  'dickhead',
  'prick',
  'twat',
  'asshole',
  'arsehole',
  'jackass',
  'cocksucker',
  'pussy',
  'faggot',
  'nigger',
  // Tagalog
  'tangina',
  'tangsina',
  'tanginas',
  'kangina',
  'putangina',
  'punyeta',
  'mangsya',
  'titi',
  'tits',
  'chuchay',
  'buriter',
  'kantut'
];

export const MILD_TERMS: string[] = [
  // English
  'idiot',
  'idiots',
  'stupid',
  'dumbass',
  'moron',
  'moronic',
  'imbecile',
  'retard',
  'retarded',
  'jerk',
  'fool',
  'clown',
  'loser',
  'pathetic',
  'trash',
  'sucks',
  'sucky',
  // Tagalog
  'gago',
  'gagos',
  'ulol',
  'bobo',
  'bulbol',
  'tanga',
  'tangal',
  'baliw',
  'eto',
  'hamp',
  'caca',
  'ayoko',
  'basura',
  'yawa'
];

export const SEVERE_PHRASES: string[] = [
  'tang ina',
  'mang sya',
  'pok pok',
  'ded na',
  'piece of shit',
  'son of a bitch',
  'kiss my ass',
  'suck my ass'
];

export const MILD_PHRASES: string[] = [
  'gago ka',
  'gago ako',
  'gago tayo',
  'ulol ka',
  'bobo ka',
  'tanga na',
  'loko ka',
  'yawa ka',
  'pangit ka',
  'sira ulol',
  'go to hell',
  'screw you',
  'shut up'
];

export const PROFANITY_ALLOWLIST: Record<string, string[]> = {
  titi: ['titi maria', 'titi rosa', 'titi dawn', 'si titi']
};

function normalize(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TERM_SEVERITY = new Map<string, ProfanitySeverity>();
MILD_TERMS.forEach(term => TERM_SEVERITY.set(term, 1));
SEVERE_TERMS.forEach(term => TERM_SEVERITY.set(term, 2));

const PHRASE_SEVERITY = new Map<string, ProfanitySeverity>();
MILD_PHRASES.forEach(phrase => PHRASE_SEVERITY.set(phrase, 1));
SEVERE_PHRASES.forEach(phrase => PHRASE_SEVERITY.set(phrase, 2));

export type ProfanityHint = {
  hasMatch: boolean;
  severe: boolean;
  terms: string[];
};

export function scanComment(text: string): ProfanityHint {
  const haystack = normalize(text);
  if (!haystack) {
    return {hasMatch: false, severe: false, terms: []};
  }

  const tokens = new Set(haystack.split(' '));
  const padded = ` ${haystack} `;
  const found = new Set<string>();

  for (const term of TERM_SEVERITY.keys()) {
    const exemptions = PROFANITY_ALLOWLIST[term];
    if (
      exemptions?.some(phrase => padded.includes(` ${phrase} `)) === true
    ) {
      continue;
    }
    if (tokens.has(term)) {
      found.add(term);
    }
  }

  for (const phrase of PHRASE_SEVERITY.keys()) {
    const exemptions = PROFANITY_ALLOWLIST[phrase];
    if (
      exemptions?.some(entry => padded.includes(` ${entry} `)) === true
    ) {
      continue;
    }
    if (padded.includes(` ${phrase} `)) {
      found.add(phrase);
    }
  }

  const terms = [...found];
  const severe = terms.some(
    term =>
      (TERM_SEVERITY.get(term) ?? PHRASE_SEVERITY.get(term)) === 2
  );

  return {hasMatch: terms.length > 0, severe, terms};
}
