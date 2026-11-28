import {
  MAX_MATCHED_WORDS_STORED,
  MILD_PHRASES,
  MILD_TERMS,
  PROFANITY_ALLOWLIST,
  PROFANITY_BLOCK_THRESHOLD,
  PROFANITY_FILTER_ENABLED,
  SEVERE_PHRASES,
  SEVERE_TERMS,
  type ProfanitySeverity
} from './profanityWords';

export type ProfanityAction = 'allow' | 'auto_reject' | 'block';

export type ProfanityMatch = {
  term: string;
  severity: ProfanitySeverity;
};

export type ProfanityScan = {
  action: ProfanityAction;
  score: number;
  matches: ProfanityMatch[];
  terms: string[];
};

type TermEntry = {
  term: string;
  severity: ProfanitySeverity;
  // "f*ck", "f.u.c.k", "f-u-c-k": punctuation gaps only
  regex: RegExp;
  // "f u c k": every character separated by spaces
  spacedRegex: RegExp;
};

// Reverse leetspeak. Digits are always folded back to letters. Symbols are only
// folded when they sit between two alphanumeric characters, so "g@g0" becomes
// "gago" while a sentence-ending "Tangina!" keeps its exclamation mark instead of
// turning into "tanginai".
const LEET_DIGIT_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b'
};

const LEET_SYMBOL_MAP: Record<string, string> = {
  $: 's',
  '!': 'i',
  '@': 'a',
  '|': 'i'
};

function applyLeet(text: string): string {
  const chars = text.split('');
  return chars
    .map((char, index) => {
      if (LEET_DIGIT_MAP[char]) {
        return LEET_DIGIT_MAP[char];
      }
      const symbol = LEET_SYMBOL_MAP[char];
      if (!symbol) {
        return char;
      }
      const before = index > 0 ? chars[index - 1] : '';
      const after = index < chars.length - 1 ? chars[index + 1] : '';
      const isInfix =
        /[a-z0-9]/.test(before) && /[a-z0-9]/.test(after);
      return isInfix ? symbol : char;
    })
    .join('');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Separators are restricted to punctuation and symbols, never to whitespace, so a
// gap can never bridge two real words. Without that rule "tangi na" ("let's go")
// normalizes into the severe term "tangina". Word boundaries are enforced
// separately to keep the Scunthorpe problem away ("classic" is not "ass").
function buildTermRegexes(term: string): {regex: RegExp; spacedRegex: RegExp} {
  const chars = term.split('').map(escapeRegExp);
  return {
    regex: new RegExp(chars.join('[^a-z0-9\\s]*'), 'g'),
    spacedRegex: new RegExp(chars.join(' {1,3}'), 'g')
  };
}

function buildEntries(
  terms: string[],
  severity: ProfanitySeverity
): TermEntry[] {
  return terms.map(term => ({
    term,
    severity,
    ...buildTermRegexes(term)
  }));
}

const TERM_ENTRIES: TermEntry[] = [
  ...buildEntries(SEVERE_TERMS, 2),
  ...buildEntries(MILD_TERMS, 1)
];

const PHRASE_ENTRIES: {phrase: string; severity: ProfanitySeverity; words: string[]}[] = [
  ...SEVERE_PHRASES.map(phrase => ({
    phrase,
    severity: 2 as const,
    words: phrase.split(' ')
  })),
  ...MILD_PHRASES.map(phrase => ({
    phrase,
    severity: 1 as const,
    words: phrase.split(' ')
  }))
];

function isAlphanumeric(char: string): boolean {
  return /[a-z0-9]/.test(char);
}

// Punctuation is deliberately kept: it is what the separator-tolerant matcher
// treats as a gap, and word-boundary checks treat it as a boundary.
export function normalizeText(text: string): string {
  return applyLeet(
    text
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2018\u2019\u02bc]/g, "'")
      .toLowerCase()
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(haystack: string): string[] {
  return haystack.split(/[^a-z0-9']+/).filter(Boolean);
}

// "fuuuuck" -> "fuck"
function squeezeRepeats(text: string): string {
  return text.replace(/(.)\1+/g, '$1');
}

// First match of `regex` that sits on word boundaries, as [start, end).
function findCleanMatch(regex: RegExp, haystack: string): [number, number] | null {
  regex.lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec(haystack);
  while (match !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const startsClean = start === 0 || !isAlphanumeric(haystack[start - 1]);
    const endsClean = end === haystack.length || !isAlphanumeric(haystack[end]);
    if (startsClean && endsClean) {
      return [start, end];
    }
    if (match[0].length === 0) {
      regex.lastIndex += 1;
    }
    match = regex.exec(haystack);
  }
  return null;
}

function matchesTerm(entry: TermEntry, haystack: string): boolean {
  return (
    findCleanMatch(entry.regex, haystack) !== null ||
    findCleanMatch(entry.spacedRegex, haystack) !== null
  );
}

function containsPhrase(haystack: string, words: string[]): boolean {
  const tokens = tokenize(haystack);
  for (let start = 0; start + words.length <= tokens.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < words.length; offset += 1) {
      if (tokens[start + offset] !== words[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return true;
    }
  }
  return false;
}

function isAllowlisted(term: string, haystacks: string[]): boolean {
  const exemptions = PROFANITY_ALLOWLIST[term];
  if (!exemptions) {
    return false;
  }
  return haystacks.some(haystack =>
    exemptions.some(phrase => containsPhrase(haystack, phrase.split(' ')))
  );
}

function collectMatches(haystacks: string[]): ProfanityMatch[] {
  const found = new Map<string, ProfanitySeverity>();

  for (const entry of TERM_ENTRIES) {
    if (found.has(entry.term) || isAllowlisted(entry.term, haystacks)) {
      continue;
    }
    if (haystacks.some(haystack => matchesTerm(entry, haystack))) {
      found.set(entry.term, entry.severity);
    }
  }

  for (const {phrase, severity, words} of PHRASE_ENTRIES) {
    // A phrase adds nothing once one of its words is already flagged,
    // otherwise "gago ka" would score again on top of "gago".
    if (
      found.has(phrase) ||
      isAllowlisted(phrase, haystacks) ||
      words.some(word => found.has(word))
    ) {
      continue;
    }
    if (haystacks.some(haystack => containsPhrase(haystack, words))) {
      found.set(phrase, severity);
    }
  }

  return [...found.entries()]
    .map(([term, severity]) => ({term, severity}))
    .sort((a, b) => b.severity - a.severity);
}

export function scanText(text: string): ProfanityScan {
  const normalized = normalizeText(text);
  const haystacks = normalized.length > 0
    ? [normalized, squeezeRepeats(normalized)]
    : [];
  const matches = haystacks.length > 0 ? collectMatches(haystacks) : [];
  const score = matches.reduce((total, match) => total + match.severity, 0);

  let action: ProfanityAction = 'allow';
  if (PROFANITY_FILTER_ENABLED && score > 0) {
    action = score >= PROFANITY_BLOCK_THRESHOLD ? 'block' : 'auto_reject';
  }

  return {
    action,
    score,
    matches,
    terms: matches
      .map(match => match.term)
      .slice(0, MAX_MATCHED_WORDS_STORED)
  };
}

// --- Masking -----------------------------------------------------------------
// Bad words are shown as their first character followed by one asterisk per
// remaining character ("gago" -> "g***", "f.u.c.k!" -> "f******!"; spaced-out
// letters "f u c k" -> "* * * *"). Leading and
// trailing punctuation is kept so sentences still read normally. Only terms that
// scanText() reports are masked, so the allowlist and word boundaries behave
// exactly like the scanner.

type Token = {start: number; end: number; core: string; norm: string};

const EDGE_LEAD = /^[("'\[‘“]+/;
const EDGE_TRAIL = /[.,!?;:)"'\]’”]+$/;

// A single-character token is fully masked, otherwise "f u c k" would stay
// readable letter by letter.
function maskCore(core: string): string {
  const chars = Array.from(core);
  if (chars.length <= 1) return '*';
  return chars[0] + '*'.repeat(chars.length - 1);
}

function splitTokens(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(/\S+/g)) {
    const raw = match[0];
    const lead = raw.match(EDGE_LEAD)?.[0].length ?? 0;
    const trail = raw.slice(lead).match(EDGE_TRAIL)?.[0].length ?? 0;
    const core = raw.slice(lead, raw.length - trail);
    if (!core) continue;
    const start = (match.index ?? 0) + lead;
    tokens.push({
      start,
      end: start + core.length,
      core,
      norm: normalizeText(core)
    });
  }
  return tokens;
}

function tokenHits(token: Token, entries: TermEntry[]): boolean {
  const haystacks = [token.norm, squeezeRepeats(token.norm)];
  return entries.some(entry =>
    haystacks.some(haystack => findCleanMatch(entry.regex, haystack) !== null)
  );
}

function applyMasks(text: string, tokens: Token[], masked: Set<number>): string {
  let out = '';
  let cursor = 0;
  tokens.forEach((token, index) => {
    if (!masked.has(index)) return;
    out += text.slice(cursor, token.start) + maskCore(token.core);
    cursor = token.end;
  });
  return out + text.slice(cursor);
}

export function maskText(text: string): string {
  if (!PROFANITY_FILTER_ENABLED || !text) return text;
  const found = new Set(scanText(text).matches.map(match => match.term));
  if (found.size === 0) return text;

  const tokens = splitTokens(text);
  const masked = new Set<number>();
  const words = TERM_ENTRIES.filter(entry => found.has(entry.term));

  // 1. Whole tokens: "gago", "f*ck", "b.o.b.o", "fuuuck".
  tokens.forEach((token, index) => {
    if (tokenHits(token, words)) masked.add(index);
  });

  // 2. Letters split by spaces: "f u c k". Single-character tokens are joined
  //    with one space so each token sits at an even offset.
  for (let i = 0; i < tokens.length; ) {
    let j = i;
    while (j < tokens.length && tokens[j].norm.length === 1) j += 1;
    if (j - i >= 2) {
      const spaced = tokens.slice(i, j).map(t => t.norm).join(' ');
      for (const entry of words) {
        const hit = findCleanMatch(entry.spacedRegex, spaced);
        if (!hit) continue;
        for (let k = hit[0] / 2; k <= (hit[1] - 1) / 2; k += 1) {
          masked.add(i + Math.floor(k));
        }
      }
    }
    i = Math.max(j, i + 1);
  }

  // 3. Phrases: "tang ina".
  const plain = tokens.map(t => t.norm.replace(/[^a-z0-9']/g, ''));
  for (const {phrase, words: parts} of PHRASE_ENTRIES) {
    if (!found.has(phrase)) continue;
    for (let s = 0; s + parts.length <= plain.length; s += 1) {
      if (parts.every((part, o) => plain[s + o] === part)) {
        parts.forEach((_, o) => masked.add(s + o));
      }
    }
  }

  const result = applyMasks(text, tokens, masked);
  // Safety net: public text must never leak a listed word. If a spelling the
  // passes above missed is still detected, mask every remaining word.
  if (scanText(result).matches.length > 0) {
    return applyMasks(text, tokens, new Set(tokens.map((_, index) => index)));
  }
  return result;
}

export function isProfane(text: string): boolean {
  return scanText(text).action !== 'allow';
}

export const profanityFilter = {
  normalize: normalizeText,
  scan: scanText,
  mask: maskText,
  isProfane
};
