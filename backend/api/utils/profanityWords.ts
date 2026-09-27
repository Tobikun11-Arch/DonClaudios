// Bad-word lists for customer feedback moderation (English + Tagalog).
// Keep the term arrays identical to
// frontend/lib/utils/profanityFilter.ts
//
// Severity:
//   2 = severe -> total score >= PROFANITY_BLOCK_THRESHOLD, submission is blocked
//                 outright and nothing is saved
//   1 = mild   -> submission is saved but auto-rejected and flagged for the owner
//
// Only add a term if you are sure it is rude when used in a restaurant review.
// Do NOT add words that double as legitimate complaints (disgusting, cold, burnt,
// scam, late, worst, undercooked, dirty). Those belong to manual review by the owner.
// Single words are matched with separator tolerance, so "bobo" also catches
// "b*b0" and "b.o.b.o". Phrases are matched as exact token sequences, so
// "tang ina" is caught but "tangi na" ("let's go") is not.

export type ProfanitySeverity = 1 | 2;

export const PROFANITY_BLOCK_THRESHOLD = 2;

export const MAX_MATCHED_WORDS_STORED = 5;

// Kill switch. Read from process.env the same way logger.ts reads LOG_LEVEL
// so the filter can be disabled without touching config/env.ts.
export const PROFANITY_FILTER_ENABLED =
  process.env.PROFANITY_FILTER_ENABLED !== 'false';

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
  // 'loko' is intentionally omitted: it is used as a compliment
  // ("crazy good"), so only the insulting form is listed below.
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

// Terms that are legitimate in other contexts. A match is ignored when one of
// its exemption phrases is present in the same submission.
export const PROFANITY_ALLOWLIST: Record<string, string[]> = {
  titi: ['titi maria', 'titi rosa', 'titi dawn', 'si titi']
};
