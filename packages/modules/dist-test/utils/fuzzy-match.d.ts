/**
 * Advanced fuzzy matching for Indian names
 * Handles phonetic variations, transliterations, and common nicknames
 */
interface MatchResult {
    score: number;
    matched: string;
    matchType: 'exact' | 'phonetic' | 'nickname' | 'fuzzy' | 'transliteration';
}
/**
 * Advanced fuzzy match for Indian names
 */
export declare function matchIndianName(query: string, target: string, threshold?: number): MatchResult | null;
/**
 * Find best match from a list of names
 */
export declare function findBestMatch(query: string, candidates: string[], threshold?: number): MatchResult | null;
/**
 * Get all matches above threshold, sorted by score
 */
export declare function findAllMatches(query: string, candidates: string[], threshold?: number): MatchResult[];
/**
 * Check if two names likely refer to the same person
 */
export declare function isSamePerson(name1: string, name2: string): boolean;
export {};
//# sourceMappingURL=fuzzy-match.d.ts.map