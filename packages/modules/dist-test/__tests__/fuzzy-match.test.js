"use strict";
/**
 * Indian Name Fuzzy Matching — Test Suite
 * Covers exact, phonetic, aspirated, nickname, honorific, V/W, transliteration, and sibilant cases.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const fuzzy_match_1 = require("../utils/fuzzy-match");
// ── matchIndianName — should match ──────────────────────────────────────────
(0, node_test_1.default)('exact match: "Bharat" matches "Bharat"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Bharat', 'Bharat', 0.7) !== null);
});
(0, node_test_1.default)('case insensitive: "bharat" matches "Bharat"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('bharat', 'Bharat', 0.7) !== null);
});
(0, node_test_1.default)('phonetic: trailing-h variation "Bharat" matches "Bharath"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Bharat', 'Bharath', 0.7) !== null);
});
(0, node_test_1.default)('phonetic: vowel variation "Rahul" matches "Rahool"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Rahul', 'Rahool', 0.7) !== null);
});
(0, node_test_1.default)('phonetic: ee→i "Deepak" matches "Dipak"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Deepak', 'Dipak', 0.7) !== null);
});
(0, node_test_1.default)('phonetic: ee→i "Sandeep" matches "Sandip"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Sandeep', 'Sandip', 0.7) !== null);
});
(0, node_test_1.default)('phonetic: vowel variation "Suresh" matches "Sauresh"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Suresh', 'Sauresh', 0.7) !== null);
});
(0, node_test_1.default)('phonetic: trailing-a "Ganesh" matches "Ganesha"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Ganesh', 'Ganesha', 0.7) !== null);
});
(0, node_test_1.default)('aspirated: bh→b "Bharat" matches "Barat"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Bharat', 'Barat', 0.7) !== null);
});
(0, node_test_1.default)('aspirated + vowel: "Pritam" matches "Preetam"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Pritam', 'Preetam', 0.7) !== null);
});
(0, node_test_1.default)('aspirated: kh→k "Khatri" matches "Katri"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Khatri', 'Katri', 0.7) !== null);
});
(0, node_test_1.default)('nickname: "Raju" matches "Rahul"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Raju', 'Rahul', 0.7) !== null);
});
(0, node_test_1.default)('nickname: "Sonu" matches "Saurabh"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Sonu', 'Saurabh', 0.7) !== null);
});
(0, node_test_1.default)('nickname: "Abhi" matches "Abhishek"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Abhi', 'Abhishek', 0.7) !== null);
});
(0, node_test_1.default)('nickname: "Sandy" matches "Sandeep"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Sandy', 'Sandeep', 0.7) !== null);
});
(0, node_test_1.default)('nickname: "Vicky" matches "Vivek"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Vicky', 'Vivek', 0.7) !== null);
});
(0, node_test_1.default)('honorific: "Bharat" matches "Bharat Bhai"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Bharat', 'Bharat Bhai', 0.7) !== null);
});
(0, node_test_1.default)('honorific removal: "Suresh bhai" matches "Suresh"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Suresh bhai', 'Suresh', 0.7) !== null);
});
(0, node_test_1.default)('honorific: "Ramesh Ji" matches "Ramesh"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Ramesh Ji', 'Ramesh', 0.7) !== null);
});
(0, node_test_1.default)('V/W confusion: "Vikas" matches "Wikas"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Vikas', 'Wikas', 0.7) !== null);
});
(0, node_test_1.default)('V/W confusion: "Vijay" matches "Wijay"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Vijay', 'Wijay', 0.7) !== null);
});
(0, node_test_1.default)('transliteration: ksh→x "Lakshmi" matches "Laxmi"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Lakshmi', 'Laxmi', 0.7) !== null);
});
(0, node_test_1.default)('transliteration complex: "Srinivas" matches "Shreenivaas"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Srinivas', 'Shreenivaas', 0.7) !== null);
});
(0, node_test_1.default)('transliteration regional: "Krishna" matches "Kishan"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Krishna', 'Kishan', 0.7) !== null);
});
(0, node_test_1.default)('sibilant: sh→s "Ashok" matches "Asok"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Ashok', 'Asok', 0.7) !== null);
});
(0, node_test_1.default)('sibilant variation: "Prakash" matches "Prakas"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Prakash', 'Prakas', 0.7) !== null);
});
(0, node_test_1.default)('double consonant typo: "Ankit" matches "Ankitt"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Ankit', 'Ankitt', 0.7) !== null);
});
(0, node_test_1.default)('transposition typo: "Aditya" matches "Aditay"', () => {
    strict_1.default.ok((0, fuzzy_match_1.matchIndianName)('Aditya', 'Aditay', 0.7) !== null);
});
// ── matchIndianName — should NOT match ──────────────────────────────────────
(0, node_test_1.default)('no match: "Bharat" does not match "Rahul"', () => {
    strict_1.default.equal((0, fuzzy_match_1.matchIndianName)('Bharat', 'Rahul', 0.7), null);
});
(0, node_test_1.default)('no match: "Amit" does not match "Sumit"', () => {
    strict_1.default.equal((0, fuzzy_match_1.matchIndianName)('Amit', 'Sumit', 0.7), null);
});
(0, node_test_1.default)('no match: "Ram" does not match "Shyam"', () => {
    strict_1.default.equal((0, fuzzy_match_1.matchIndianName)('Ram', 'Shyam', 0.7), null);
});
// ── findBestMatch ────────────────────────────────────────────────────────────
// Matching a short query (nickname/variant) against full names (first + last)
// scores lower than against first-name-only candidates.  Use first-name list
// at 0.7 threshold for crisp assertions; test full-name list at 0.5.
const FIRST_NAMES = ['Bharat', 'Rahul', 'Saurabh', 'Deepak', 'Priya', 'Amit'];
const FULL_NAMES = ['Bharat', 'Rahul Kumar', 'Saurabh Sharma', 'Deepak Agarwal', 'Priya Singh', 'Amit Patel'];
(0, node_test_1.default)('findBestMatch: "Bharath" resolves to "Bharat" (first-name list)', () => {
    const match = (0, fuzzy_match_1.findBestMatch)('Bharath', FIRST_NAMES, 0.7);
    strict_1.default.ok(match !== null, 'should find a match');
    strict_1.default.equal(match?.matched, 'Bharat');
});
(0, node_test_1.default)('findBestMatch: "Raju" resolves to "Rahul" (first-name list)', () => {
    const match = (0, fuzzy_match_1.findBestMatch)('Raju', FIRST_NAMES, 0.7);
    strict_1.default.ok(match !== null, 'should find a match');
    strict_1.default.equal(match?.matched, 'Rahul');
});
(0, node_test_1.default)('findBestMatch: "Sonu" resolves to "Saurabh" (first-name list)', () => {
    const match = (0, fuzzy_match_1.findBestMatch)('Sonu', FIRST_NAMES, 0.7);
    strict_1.default.ok(match !== null, 'should find a match');
    strict_1.default.equal(match?.matched, 'Saurabh');
});
(0, node_test_1.default)('findBestMatch: "Dipak" resolves to "Deepak" (first-name list)', () => {
    const match = (0, fuzzy_match_1.findBestMatch)('Dipak', FIRST_NAMES, 0.7);
    strict_1.default.ok(match !== null, 'should find a match');
    strict_1.default.equal(match?.matched, 'Deepak');
});
(0, node_test_1.default)('findBestMatch: "Amitbhai" resolves to "Amit" via honorific stripping', () => {
    const match = (0, fuzzy_match_1.findBestMatch)('Amitbhai', FIRST_NAMES, 0.7);
    strict_1.default.ok(match !== null, 'should find a match');
    strict_1.default.equal(match?.matched, 'Amit');
});
(0, node_test_1.default)('findBestMatch: "Bharath" still matches in full-name list at lower threshold', () => {
    const match = (0, fuzzy_match_1.findBestMatch)('Bharath', FULL_NAMES, 0.5);
    strict_1.default.ok(match !== null, 'should find a match');
    strict_1.default.ok(match?.matched.startsWith('Bharat'));
});
(0, node_test_1.default)('findBestMatch: returns null when no candidates meet the threshold', () => {
    const match = (0, fuzzy_match_1.findBestMatch)('Zephyr', FIRST_NAMES, 0.7);
    strict_1.default.equal(match, null);
});
// ── isSamePerson ─────────────────────────────────────────────────────────────
(0, node_test_1.default)('isSamePerson: "Bharat" and "Bharath" are the same', () => {
    strict_1.default.equal((0, fuzzy_match_1.isSamePerson)('Bharat', 'Bharath'), true);
});
(0, node_test_1.default)('isSamePerson: "Rahul" and "Raju" are the same', () => {
    strict_1.default.equal((0, fuzzy_match_1.isSamePerson)('Rahul', 'Raju'), true);
});
(0, node_test_1.default)('isSamePerson: "Saurabh" and "Sonu" are the same', () => {
    strict_1.default.equal((0, fuzzy_match_1.isSamePerson)('Saurabh', 'Sonu'), true);
});
(0, node_test_1.default)('isSamePerson: "Deepak" and "Dipak" are the same', () => {
    strict_1.default.equal((0, fuzzy_match_1.isSamePerson)('Deepak', 'Dipak'), true);
});
(0, node_test_1.default)('isSamePerson: "Amit" and "Sumit" are NOT the same', () => {
    strict_1.default.equal((0, fuzzy_match_1.isSamePerson)('Amit', 'Sumit'), false);
});
(0, node_test_1.default)('isSamePerson: "Ram" and "Shyam" are NOT the same', () => {
    strict_1.default.equal((0, fuzzy_match_1.isSamePerson)('Ram', 'Shyam'), false);
});
// ── findAllMatches ────────────────────────────────────────────────────────────
(0, node_test_1.default)('findAllMatches: "Raju" returns >=2 matches from Raj* names, sorted by score', () => {
    const candidates = ['Rahul', 'Rajesh', 'Rajendra', 'Rajiv', 'Bharat'];
    const matches = (0, fuzzy_match_1.findAllMatches)('Raju', candidates, 0.6);
    strict_1.default.ok(matches.length >= 2, `expected >=2, got ${matches.length}`);
    // Verify descending score order
    for (let i = 1; i < matches.length; i++) {
        strict_1.default.ok(matches[i - 1].score >= matches[i].score, `score at [${i - 1}] (${matches[i - 1].score}) should be >= score at [${i}] (${matches[i].score})`);
    }
});
(0, node_test_1.default)('findAllMatches: "Bharat" does not match completely different names', () => {
    const matches = (0, fuzzy_match_1.findAllMatches)('Bharat', ['Zephyr', 'Quintus', 'Xander'], 0.7);
    strict_1.default.equal(matches.length, 0);
});
//# sourceMappingURL=fuzzy-match.test.js.map