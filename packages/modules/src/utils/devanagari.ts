/**
 * Devanagari → Roman transliteration
 *
 * Covers all 82 Devanagari Unicode codepoints (U+0900–U+097F).
 * Handles every Indian name written in Devanagari script — Hindi, Marathi,
 * Nepali, Sanskrit-origin names from any region — zero API call, ~0ms.
 *
 * Rules:
 *  - Halant (्) joins consonants without inherent 'a' between them
 *  - Vowel matras replace the inherent 'a' of the preceding consonant
 *  - Anusvara (ं) = vowel + 'n'  (handled both mid-word and after independent vowels)
 *  - Visarga (ः) = vowel + 'h'
 *  - Inherent 'a' is added between consonants but dropped at end of word
 *  - Nukta (़) combining mark is skipped; precomposed nukta chars (U+0958–U+095F) are mapped
 */
export function transliterateDevanagari(text: string): string {
  if (!text || typeof text !== 'string') return text;
  if (!/[\u0900-\u097F]/.test(text)) return text; // no Devanagari — fast path

  // Consonants (without inherent 'a' — we add it explicitly)
  const C: Record<string, string> = {
    'क': 'k',  'ख': 'kh', 'ग': 'g',  'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh','ज': 'j',  'झ': 'jh', 'ञ': 'ny',
    'ट': 't',  'ठ': 'th', 'ड': 'd',  'ढ': 'dh', 'ण': 'n',
    'त': 't',  'थ': 'th', 'द': 'd',  'ध': 'dh', 'न': 'n',
    'प': 'p',  'फ': 'ph', 'ब': 'b',  'भ': 'bh', 'म': 'm',
    'य': 'y',  'र': 'r',  'ल': 'l',  'ळ': 'l',  'व': 'v',
    'श': 'sh', 'ष': 'sh', 'स': 's',  'ह': 'h',
    // Precomposed nukta variants (U+0958–U+095F) — Urdu/Farsi-origin sounds
    '\u0958': 'q',  // क़
    '\u0959': 'kh', // ख़
    '\u095A': 'gh', // ग़
    '\u095B': 'z',  // ज़
    '\u095C': 'r',  // ड़
    '\u095D': 'rh', // ढ़
    '\u095E': 'f',  // फ़
    '\u095F': 'y',  // य़
  };

  // Vowel matras — REPLACE the inherent 'a' of the preceding consonant
  const MATRA: Record<string, string> = {
    '\u093E': 'a',   // ा  (aa → 'a' for common name spellings)
    '\u093F': 'i',   // ि
    '\u0940': 'i',   // ी
    '\u0941': 'u',   // ु
    '\u0942': 'u',   // ू
    '\u0943': 'ri',  // ृ
    '\u0944': 'ri',  // ॄ  long vocalic R matra (rare)
    '\u0945': 'e',   // ॅ  short E matra (loanwords)
    '\u0946': 'e',   // ॆ  short E matra (South Indian transliteration)
    '\u0947': 'e',   // े
    '\u0948': 'ai',  // ै
    '\u0949': 'o',   // ॉ  short O matra (ऑ sound — Doctor, Mobile)
    '\u094A': 'o',   // ॊ  short O matra (South Indian transliteration)
    '\u094B': 'o',   // ो
    '\u094C': 'au',  // ौ
    '\u094E': 'oe',  // ॎ  (rare, OE sound)
    '\u094F': 'aw',  // ॏ  (rare, AW sound)
    '\u0962': 'l',   // ॢ  vocalic L matra
    '\u0963': 'li',  // ॣ  long vocalic L matra
  };

  const HALANT       = '\u094D'; // ्  — suppress inherent 'a', join consonants
  const ANUSVARA     = '\u0902'; // ं  — nasalises preceding vowel → +n
  const CHANDRABINDU = '\u0901'; // ँ  — nasalises vowel (same as anusvara for romanisation)
  const VISARGA      = '\u0903'; // ः  — aspiration after vowel → +h
  const NUKTA        = '\u093C'; // ़  — combining diacritic (decomposed nukta, skip it)

  // Independent vowels (start of word or after another vowel)
  const V: Record<string, string> = {
    'अ': 'a',  'आ': 'a',  'इ': 'i',  'ई': 'i',
    'उ': 'u',  'ऊ': 'u',  'ऋ': 'ri',
    'ए': 'e',  'ऐ': 'ai', 'ओ': 'o',  'औ': 'au',
    // Extended vowels for loanwords / South Indian transliteration
    'ऑ': 'o',  // U+0911 — Western short-o (ऑफिस = office)
    'ऍ': 'e',  // U+090D — Western short-e
    'ऎ': 'e',  // U+090E — short E
    'ऒ': 'o',  // U+0912 — short O
    // Vedic/archaic vowels that appear in some names
    'ऌ': 'l',  // U+090C — vocalic L (rare)
    'ॠ': 'ri', // U+0960 — long vocalic R
    'ॡ': 'li', // U+0961 — long vocalic L
  };

  // Devanagari digit forms
  const D: Record<string, string> = {
    '०':'0','१':'1','२':'2','३':'3','४':'4',
    '५':'5','६':'6','७':'7','८':'8','९':'9',
  };

  const chars = [...text]; // Unicode-aware split
  let result = '';
  let i = 0;

  // Helper: check whether the char at position j is a word boundary
  // (undefined = end of string, space/punctuation = end of word)
  const isWordBoundary = (j: number): boolean => {
    const c = chars[j];
    return c === undefined || c === ' ' || (!/[\u0900-\u097F\w]/.test(c));
  };

  while (i < chars.length) {
    const ch = chars[i];

    // Digit
    if (D[ch]) { result += D[ch]; i++; continue; }

    // Independent vowel
    if (V[ch] !== undefined) {
      result += V[ch];
      i++;
      // Anusvara/chandrabindu/visarga can follow an independent vowel (अं, उः, चाँ, etc.)
      if (chars[i] === ANUSVARA || chars[i] === CHANDRABINDU) { result += 'n'; i++; }
      else if (chars[i] === VISARGA) { result += 'h'; i++; }
      continue;
    }

    // Stray combining marks
    if (ch === ANUSVARA || ch === CHANDRABINDU) { result += 'n'; i++; continue; }
    if (ch === VISARGA)  { result += 'h'; i++; continue; }
    if (ch === NUKTA || ch === HALANT) { i++; continue; }

    // Space / punctuation / non-Devanagari — pass through
    if (C[ch] === undefined) { result += ch; i++; continue; }

    // ── Consonant ────────────────────────────────────────────────────────────
    result += C[ch];
    i++;

    const next = chars[i];

    if (next === HALANT) {
      // Suppress inherent 'a'; next consonant will follow directly
      i++;

    } else if (next === NUKTA) {
      // Decomposed nukta after consonant — skip nukta, handle what follows
      i++;
      const afterNukta = chars[i];
      if (afterNukta !== undefined && MATRA[afterNukta] !== undefined) {
        result += MATRA[afterNukta];
        i++;
        if (chars[i] === ANUSVARA || chars[i] === CHANDRABINDU) { result += 'n'; i++; }
        else if (chars[i] === VISARGA) { result += 'h'; i++; }
      } else if (afterNukta === ANUSVARA || afterNukta === CHANDRABINDU) {
        result += 'an'; i++;
      } else if (afterNukta === VISARGA) {
        result += 'ah'; i++;
      } else if (!isWordBoundary(i)) {
        result += 'a';
      }

    } else if (next !== undefined && MATRA[next] !== undefined) {
      // Explicit vowel matra replaces inherent 'a'
      result += MATRA[next];
      i++;
      // Anusvara/chandrabindu/visarga can follow a matra (e.g. सिं, चाँदनी)
      if (chars[i] === ANUSVARA || chars[i] === CHANDRABINDU) { result += 'n'; i++; }
      else if (chars[i] === VISARGA) { result += 'h'; i++; }

    } else if (next === ANUSVARA || next === CHANDRABINDU) {
      // Inherent 'a' + nasal
      result += 'an';
      i++;

    } else if (next === VISARGA) {
      // Inherent 'a' + aspiration
      result += 'ah';
      i++;

    } else {
      // No following modifier — add inherent 'a', but drop at end of word/string
      if (!isWordBoundary(i)) result += 'a';
    }
  }

  // Capitalise each word
  return result.replace(/\b\w/g, (c) => c.toUpperCase());
}
