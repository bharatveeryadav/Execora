/**
 * Devanagari Transliteration — Comprehensive Indian Names Test
 *
 * Two layers of assertions:
 *  1. noDevBatch() — verifies no Devanagari survives in output for 300+ names
 *     from all Indian states.  This is the CRITICAL guarantee for customer-name
 *     lookup: the engine must never emit raw Devanagari into the DB.
 *
 *  2. exactBatch() — verifies the exact Roman spelling for a curated subset of
 *     names where the algorithm's output is unambiguous.
 *
 * Algorithm behaviour notes (important for setting correct expectations):
 *  - Long vowel matras (ी ू) map to the same Roman as short (ि ु) → 'i', 'u'
 *    (so संदीप → 'Sandip', NOT 'Sandeep')
 *  - Inherent 'a' is added between consonants but DROPPED at end of word
 *    (so 'धर्मेंद्र' → 'Dharmendr', not 'Dharmendra')
 *  - No schwa deletion between syllables (unlike spoken Hindi)
 *    (so 'जगदीश' → 'Jagadish', not 'Jagdish')
 *  Fuzzy matching compensates for all these variations in real use.
 *
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 */
export {};
//# sourceMappingURL=devanagari.test.d.ts.map