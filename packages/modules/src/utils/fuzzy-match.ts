/**
 * Advanced fuzzy matching for Indian names
 * Handles phonetic variations, transliterations, and common nicknames
 */

interface MatchResult {
    score: number; // 0-1, higher is better
    matched: string;
    matchType: 'exact' | 'phonetic' | 'nickname' | 'fuzzy' | 'transliteration';
}

/**
 * Indian name phonetic normalization rules
 * Handles common variations in transliteration from Hindi/regional languages
 */
const PHONETIC_RULES: Array<[RegExp, string]> = [
    // Vowel variations
    [/aa|aaa/gi, 'a'],
    [/ee|ii/gi, 'i'],
    [/oo|uu/gi, 'u'],
    [/ai|ay|ey/gi, 'e'],
    [/au|aw|ow/gi, 'o'],

    // Consonant variations (aspirated/non-aspirated)
    [/bh/gi, 'b'],
    [/ph/gi, 'p'], // But not 'f' sound
    [/th/gi, 't'],
    [/dh/gi, 'd'],
    [/kh/gi, 'k'],
    [/gh/gi, 'g'],
    [/ch/gi, 'c'],
    [/jh/gi, 'j'],

    // Retroflex variations
    [/tt|ṭ/gi, 't'],
    [/dd|ḍ/gi, 'd'],
    [/nn|ṇ/gi, 'n'],

    // Sibilant variations (s, sh, ś, ṣ all sound similar)
    [/sh|ṣ|ś/gi, 's'],

    // Hard/soft 'r' sound
    [/rr|ṛ/gi, 'r'],

    // V/W confusion (common in North India)
    [/v/gi, 'w'],

    // Silent 'h' at end
    [/h$/gi, ''],

    // Double consonants
    [/([a-z])\1+/gi, '$1'],
];

/**
 * Common Indian nickname mappings
 */
const NICKNAME_MAP: Record<string, string[]> = {
    // Hindi/North Indian names
    'saurabh': ['sonu', 'sorabh'],
    'rahul': ['raju', 'rahool'],
    'rajesh': ['raju', 'raj'],
    'priya': ['priyu', 'pari'],
    'amit': ['amitbhai', 'amit bhai', 'mittu'],
    'suresh': ['suri', 'suresh bhai'],
    'ramesh': ['ramu', 'ramesh bhai'],
    'ganesh': ['ganu', 'gannu', 'ganesha'],
    'mahesh': ['mahi', 'mahesh bhai'],
    'abhishek': ['abhi', 'abhishekh'],
    'aditya': ['adi', 'aditay'],
    'aniket': ['ani', 'anikett'],
    'ankit': ['anki', 'ankitt'],
    'arjun': ['arju', 'arjoon'],
    'dinesh': ['dinu', 'dinesh bhai'],
    'kiran': ['kiru'],
    'mukesh': ['mukku', 'mukesh bhai'],
    'prakash': ['prakash bhai'],
    'rakesh': ['raki', 'rakesh bhai'],
    'sachin': ['sachinbhai', 'sachi'],
    'sandeep': ['sandy', 'sandip'],
    'sanjay': ['sanju', 'sanjoy'],
    'vijay': ['viju', 'vijju', 'bijay'],
    'deepak': ['deepu', 'dipak', 'deepakbhai'],
    'vivek': ['vicky', 'vivekh'],

    // Female names
    'anita': ['anu', 'anitabhabhi'],
    'kavita': ['kavi', 'kavitabhabhi'],
    'meena': ['meenu', 'meenabhabhi'],
    'neeta': ['neetu', 'neetabhabhi'],
    'pooja': ['puja', 'pujabhabhi'],
    'rekha': ['rekhabhabhi'],
    'savita': ['savitabhabhi', 'savithri'],
    'sunita': ['sunitabhabhi', 'suni'],

    // South Indian names
    'krishna': ['krish', 'krishnanand', 'kishan'],
    'lakshmi': ['laxmi', 'lakshimi'],
    'venkatesh': ['venky', 'venkateshwar', 'venkat'],
    'srinivas': ['srini', 'shreenivaas'],
    'balaji': ['balajibhai'],
    'murali': ['murlidhar', 'murlidharan'],

    // Common regional variations
    'bharat': ['bharath', 'bharatbhai'],
    'gaurav': ['gaurab', 'gauravbhai'],
    'harish': ['harischandra', 'harishbhai'],
};

/**
 * Build reverse nickname map
 */
function buildReverseNicknameMap(): Record<string, string> {
    const reverse: Record<string, string> = {};
    for (const [full, nicknames] of Object.entries(NICKNAME_MAP)) {
        for (const nick of nicknames) {
            reverse[nick.toLowerCase()] = full;
        }
    }
    return reverse;
}

const REVERSE_NICKNAME_MAP = buildReverseNicknameMap();

/**
 * Normalize name for phonetic comparison
 */
function phoneticNormalize(name: string): string {
    let normalized = name.toLowerCase().trim();

    // Remove honorifics
    normalized = normalized
        .replace(/\b(bhai|bhabhi|ji|sir|madam|sahab|saheb|bhaiya|didi|anna|akka)\b/gi, '')
        .trim();

    // Apply phonetic rules
    for (const [pattern, replacement] of PHONETIC_RULES) {
        normalized = normalized.replace(pattern, replacement);
    }

    // Remove spaces and special characters
    normalized = normalized.replace(/[^a-z0-9]/g, '');

    return normalized;
}

/**
 * Calculate Levenshtein distance
 */
function levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    const matrix: number[][] = Array(len1 + 1)
        .fill(null)
        .map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1, // deletion
                matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return matrix[len1][len2];
}

/**
 * Calculate similarity score (0-1)
 */
function similarityScore(str1: string, str2: string): number {
    const distance = levenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

/**
 * Check if names match as nickname variations
 */
function checkNicknameMatch(name1: string, name2: string): boolean {
    const n1 = name1.toLowerCase();
    const n2 = name2.toLowerCase();

    // Check if one is nickname of the other
    const nicknames1 = NICKNAME_MAP[n1] || [];
    const nicknames2 = NICKNAME_MAP[n2] || [];

    if (nicknames1.includes(n2) || nicknames2.includes(n1)) {
        return true;
    }

    // Check reverse map
    const full1 = REVERSE_NICKNAME_MAP[n1];
    const full2 = REVERSE_NICKNAME_MAP[n2];

    if (full1 && full1 === n2) return true;
    if (full2 && full2 === n1) return true;
    if (full1 && full2 && full1 === full2) return true;

    return false;
}

/**
 * Advanced fuzzy match for Indian names
 */
export function matchIndianName(query: string, target: string, threshold: number = 0.75): MatchResult | null {
    const queryNorm = query.toLowerCase().trim();
    const targetNorm = target.toLowerCase().trim();

    // 1. Exact match (case-insensitive)
    if (queryNorm === targetNorm) {
        return { score: 1.0, matched: target, matchType: 'exact' };
    }

    // 2. Nickname match
    if (checkNicknameMatch(queryNorm, targetNorm)) {
        return { score: 0.95, matched: target, matchType: 'nickname' };
    }

    // 3. Phonetic match (after normalization)
    const queryPhonetic = phoneticNormalize(query);
    const targetPhonetic = phoneticNormalize(target);

    if (queryPhonetic === targetPhonetic) {
        return { score: 0.9, matched: target, matchType: 'phonetic' };
    }

    // 4. Partial match (substring)
    if (targetNorm.includes(queryNorm) || queryNorm.includes(targetNorm)) {
        const score = Math.min(queryNorm.length, targetNorm.length) / Math.max(queryNorm.length, targetNorm.length);
        if (score >= threshold) {
            return { score, matched: target, matchType: 'transliteration' };
        }
    }

    // 5. Fuzzy match with Levenshtein distance
    const exactScore = similarityScore(queryNorm, targetNorm);
    if (exactScore >= threshold) {
        return { score: exactScore, matched: target, matchType: 'fuzzy' };
    }

    // 6. Phonetic fuzzy match
    const phoneticScore = similarityScore(queryPhonetic, targetPhonetic);
    if (phoneticScore >= threshold) {
        return { score: phoneticScore * 0.9, matched: target, matchType: 'phonetic' };
    }

    return null;
}

/**
 * Find best match from a list of names
 */
export function findBestMatch(query: string, candidates: string[], threshold: number = 0.75): MatchResult | null {
    let bestMatch: MatchResult | null = null;

    for (const candidate of candidates) {
        const match = matchIndianName(query, candidate, threshold);
        if (match && (!bestMatch || match.score > bestMatch.score)) {
            bestMatch = match;
        }
    }

    return bestMatch;
}

/**
 * Get all matches above threshold, sorted by score
 */
export function findAllMatches(query: string, candidates: string[], threshold: number = 0.75): MatchResult[] {
    const matches: MatchResult[] = [];

    for (const candidate of candidates) {
        const match = matchIndianName(query, candidate, threshold);
        if (match) {
            matches.push(match);
        }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
}

/**
 * Check if two names likely refer to the same person
 */
export function isSamePerson(name1: string, name2: string): boolean {
    const match = matchIndianName(name1, name2, 0.8);
    return match !== null && match.score >= 0.8;
}
