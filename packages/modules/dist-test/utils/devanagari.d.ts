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
export declare function transliterateDevanagari(text: string): string;
//# sourceMappingURL=devanagari.d.ts.map