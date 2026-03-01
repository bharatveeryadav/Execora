/**
 * Indian Name Fuzzy Matching — Test Suite
 * Covers exact, phonetic, aspirated, nickname, honorific, V/W, transliteration, and sibilant cases.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { matchIndianName, findBestMatch, isSamePerson, findAllMatches } from '../infrastructure/fuzzy-match';

// ── matchIndianName — should match ──────────────────────────────────────────

test('exact match: "Bharat" matches "Bharat"', () => {
  assert.ok(matchIndianName('Bharat', 'Bharat', 0.7) !== null);
});

test('case insensitive: "bharat" matches "Bharat"', () => {
  assert.ok(matchIndianName('bharat', 'Bharat', 0.7) !== null);
});

test('phonetic: trailing-h variation "Bharat" matches "Bharath"', () => {
  assert.ok(matchIndianName('Bharat', 'Bharath', 0.7) !== null);
});

test('phonetic: vowel variation "Rahul" matches "Rahool"', () => {
  assert.ok(matchIndianName('Rahul', 'Rahool', 0.7) !== null);
});

test('phonetic: ee→i "Deepak" matches "Dipak"', () => {
  assert.ok(matchIndianName('Deepak', 'Dipak', 0.7) !== null);
});

test('phonetic: ee→i "Sandeep" matches "Sandip"', () => {
  assert.ok(matchIndianName('Sandeep', 'Sandip', 0.7) !== null);
});

test('phonetic: vowel variation "Suresh" matches "Sauresh"', () => {
  assert.ok(matchIndianName('Suresh', 'Sauresh', 0.7) !== null);
});

test('phonetic: trailing-a "Ganesh" matches "Ganesha"', () => {
  assert.ok(matchIndianName('Ganesh', 'Ganesha', 0.7) !== null);
});

test('aspirated: bh→b "Bharat" matches "Barat"', () => {
  assert.ok(matchIndianName('Bharat', 'Barat', 0.7) !== null);
});

test('aspirated + vowel: "Pritam" matches "Preetam"', () => {
  assert.ok(matchIndianName('Pritam', 'Preetam', 0.7) !== null);
});

test('aspirated: kh→k "Khatri" matches "Katri"', () => {
  assert.ok(matchIndianName('Khatri', 'Katri', 0.7) !== null);
});

test('nickname: "Raju" matches "Rahul"', () => {
  assert.ok(matchIndianName('Raju', 'Rahul', 0.7) !== null);
});

test('nickname: "Sonu" matches "Saurabh"', () => {
  assert.ok(matchIndianName('Sonu', 'Saurabh', 0.7) !== null);
});

test('nickname: "Abhi" matches "Abhishek"', () => {
  assert.ok(matchIndianName('Abhi', 'Abhishek', 0.7) !== null);
});

test('nickname: "Sandy" matches "Sandeep"', () => {
  assert.ok(matchIndianName('Sandy', 'Sandeep', 0.7) !== null);
});

test('nickname: "Vicky" matches "Vivek"', () => {
  assert.ok(matchIndianName('Vicky', 'Vivek', 0.7) !== null);
});

test('honorific: "Bharat" matches "Bharat Bhai"', () => {
  assert.ok(matchIndianName('Bharat', 'Bharat Bhai', 0.7) !== null);
});

test('honorific removal: "Suresh bhai" matches "Suresh"', () => {
  assert.ok(matchIndianName('Suresh bhai', 'Suresh', 0.7) !== null);
});

test('honorific: "Ramesh Ji" matches "Ramesh"', () => {
  assert.ok(matchIndianName('Ramesh Ji', 'Ramesh', 0.7) !== null);
});

test('V/W confusion: "Vikas" matches "Wikas"', () => {
  assert.ok(matchIndianName('Vikas', 'Wikas', 0.7) !== null);
});

test('V/W confusion: "Vijay" matches "Wijay"', () => {
  assert.ok(matchIndianName('Vijay', 'Wijay', 0.7) !== null);
});

test('transliteration: ksh→x "Lakshmi" matches "Laxmi"', () => {
  assert.ok(matchIndianName('Lakshmi', 'Laxmi', 0.7) !== null);
});

test('transliteration complex: "Srinivas" matches "Shreenivaas"', () => {
  assert.ok(matchIndianName('Srinivas', 'Shreenivaas', 0.7) !== null);
});

test('transliteration regional: "Krishna" matches "Kishan"', () => {
  assert.ok(matchIndianName('Krishna', 'Kishan', 0.7) !== null);
});

test('sibilant: sh→s "Ashok" matches "Asok"', () => {
  assert.ok(matchIndianName('Ashok', 'Asok', 0.7) !== null);
});

test('sibilant variation: "Prakash" matches "Prakas"', () => {
  assert.ok(matchIndianName('Prakash', 'Prakas', 0.7) !== null);
});

test('double consonant typo: "Ankit" matches "Ankitt"', () => {
  assert.ok(matchIndianName('Ankit', 'Ankitt', 0.7) !== null);
});

test('transposition typo: "Aditya" matches "Aditay"', () => {
  assert.ok(matchIndianName('Aditya', 'Aditay', 0.7) !== null);
});

// ── matchIndianName — should NOT match ──────────────────────────────────────

test('no match: "Bharat" does not match "Rahul"', () => {
  assert.equal(matchIndianName('Bharat', 'Rahul', 0.7), null);
});

test('no match: "Amit" does not match "Sumit"', () => {
  assert.equal(matchIndianName('Amit', 'Sumit', 0.7), null);
});

test('no match: "Ram" does not match "Shyam"', () => {
  assert.equal(matchIndianName('Ram', 'Shyam', 0.7), null);
});

// ── findBestMatch ────────────────────────────────────────────────────────────
// Matching a short query (nickname/variant) against full names (first + last)
// scores lower than against first-name-only candidates.  Use first-name list
// at 0.7 threshold for crisp assertions; test full-name list at 0.5.

const FIRST_NAMES = ['Bharat', 'Rahul', 'Saurabh', 'Deepak', 'Priya', 'Amit'];
const FULL_NAMES  = ['Bharat', 'Rahul Kumar', 'Saurabh Sharma', 'Deepak Agarwal', 'Priya Singh', 'Amit Patel'];

test('findBestMatch: "Bharath" resolves to "Bharat" (first-name list)', () => {
  const match = findBestMatch('Bharath', FIRST_NAMES, 0.7);
  assert.ok(match !== null, 'should find a match');
  assert.equal(match?.matched, 'Bharat');
});

test('findBestMatch: "Raju" resolves to "Rahul" (first-name list)', () => {
  const match = findBestMatch('Raju', FIRST_NAMES, 0.7);
  assert.ok(match !== null, 'should find a match');
  assert.equal(match?.matched, 'Rahul');
});

test('findBestMatch: "Sonu" resolves to "Saurabh" (first-name list)', () => {
  const match = findBestMatch('Sonu', FIRST_NAMES, 0.7);
  assert.ok(match !== null, 'should find a match');
  assert.equal(match?.matched, 'Saurabh');
});

test('findBestMatch: "Dipak" resolves to "Deepak" (first-name list)', () => {
  const match = findBestMatch('Dipak', FIRST_NAMES, 0.7);
  assert.ok(match !== null, 'should find a match');
  assert.equal(match?.matched, 'Deepak');
});

test('findBestMatch: "Amitbhai" resolves to "Amit" via honorific stripping', () => {
  const match = findBestMatch('Amitbhai', FIRST_NAMES, 0.7);
  assert.ok(match !== null, 'should find a match');
  assert.equal(match?.matched, 'Amit');
});

test('findBestMatch: "Bharath" still matches in full-name list at lower threshold', () => {
  const match = findBestMatch('Bharath', FULL_NAMES, 0.5);
  assert.ok(match !== null, 'should find a match');
  assert.ok(match?.matched.startsWith('Bharat'));
});

test('findBestMatch: returns null when no candidates meet the threshold', () => {
  const match = findBestMatch('Zephyr', FIRST_NAMES, 0.7);
  assert.equal(match, null);
});

// ── isSamePerson ─────────────────────────────────────────────────────────────

test('isSamePerson: "Bharat" and "Bharath" are the same', () => {
  assert.equal(isSamePerson('Bharat', 'Bharath'), true);
});

test('isSamePerson: "Rahul" and "Raju" are the same', () => {
  assert.equal(isSamePerson('Rahul', 'Raju'), true);
});

test('isSamePerson: "Saurabh" and "Sonu" are the same', () => {
  assert.equal(isSamePerson('Saurabh', 'Sonu'), true);
});

test('isSamePerson: "Deepak" and "Dipak" are the same', () => {
  assert.equal(isSamePerson('Deepak', 'Dipak'), true);
});

test('isSamePerson: "Amit" and "Sumit" are NOT the same', () => {
  assert.equal(isSamePerson('Amit', 'Sumit'), false);
});

test('isSamePerson: "Ram" and "Shyam" are NOT the same', () => {
  assert.equal(isSamePerson('Ram', 'Shyam'), false);
});

// ── findAllMatches ────────────────────────────────────────────────────────────

test('findAllMatches: "Raju" returns >=2 matches from Raj* names, sorted by score', () => {
  const candidates = ['Rahul', 'Rajesh', 'Rajendra', 'Rajiv', 'Bharat'];
  const matches = findAllMatches('Raju', candidates, 0.6);

  assert.ok(matches.length >= 2, `expected >=2, got ${matches.length}`);

  // Verify descending score order
  for (let i = 1; i < matches.length; i++) {
    assert.ok(
      matches[i - 1].score >= matches[i].score,
      `score at [${i - 1}] (${matches[i - 1].score}) should be >= score at [${i}] (${matches[i].score})`
    );
  }
});

test('findAllMatches: "Bharat" does not match completely different names', () => {
  const matches = findAllMatches('Bharat', ['Zephyr', 'Quintus', 'Xander'], 0.7);
  assert.equal(matches.length, 0);
});
