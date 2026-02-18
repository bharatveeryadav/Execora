/**
 * Test cases for Indian name fuzzy matching
 * Run with: npx ts-node src/lib/indian-fuzzy-match.test.ts
 */

import { matchIndianName, findBestMatch, isSamePerson, findAllMatches } from './indian-fuzzy-match';

console.log('🧪 Testing Indian Name Fuzzy Matching\n');
console.log('=====================================\n');

// Test cases
const testCases = [
    // Exact matches
    { query: 'Bharat', target: 'Bharat', expectedMatch: true, category: 'Exact Match' },
    { query: 'bharat', target: 'Bharat', expectedMatch: true, category: 'Case Insensitive' },

    // Phonetic variations
    { query: 'Bharat', target: 'Bharath', expectedMatch: true, category: 'Phonetic (h at end)' },
    { query: 'Rahul', target: 'Rahool', expectedMatch: true, category: 'Phonetic (vowel variation)' },
    { query: 'Deepak', target: 'Dipak', expectedMatch: true, category: 'Phonetic (ee → i)' },
    { query: 'Sandeep', target: 'Sandip', expectedMatch: true, category: 'Phonetic (ee → i)' },
    { query: 'Suresh', target: 'Sauresh', expectedMatch: true, category: 'Phonetic (vowel variation)' },
    { query: 'Ganesh', target: 'Ganesha', expectedMatch: true, category: 'Phonetic (a at end)' },

    // Aspirated consonants
    { query: 'Bharat', target: 'Barat', expectedMatch: true, category: 'Aspirated (bh → b)' },
    { query: 'Pritam', target: 'Preetam', expectedMatch: true, category: 'Aspirated + vowel' },
    { query: 'Khatri', target: 'Katri', expectedMatch: true, category: 'Aspirated (kh → k)' },

    // Nickname matches
    { query: 'Raju', target: 'Rahul', expectedMatch: true, category: 'Nickname' },
    { query: 'Sonu', target: 'Saurabh', expectedMatch: true, category: 'Nickname' },
    { query: 'Abhi', target: 'Abhishek', expectedMatch: true, category: 'Nickname' },
    { query: 'Sandy', target: 'Sandeep', expectedMatch: true, category: 'Nickname' },
    { query: 'Vicky', target: 'Vivek', expectedMatch: true, category: 'Nickname' },

    // Honorifics
    { query: 'Bharat', target: 'Bharat Bhai', expectedMatch: true, category: 'Honorific (Bhai)' },
    { query: 'Suresh bhai', target: 'Suresh', expectedMatch: true, category: 'Honorific removal' },
    { query: 'Ramesh Ji', target: 'Ramesh', expectedMatch: true, category: 'Honorific (Ji)' },

    // V/W confusion
    { query: 'Vikas', target: 'Wikas', expectedMatch: true, category: 'V/W confusion' },
    { query: 'Vijay', target: 'Wijay', expectedMatch: true, category: 'V/W confusion' },

    // Transliteration variations
    { query: 'Lakshmi', target: 'Laxmi', expectedMatch: true, category: 'Transliteration (ksh → x)' },
    { query: 'Srinivas', target: 'Shreenivaas', expectedMatch: true, category: 'Transliteration (complex)' },
    { query: 'Krishna', target: 'Kishan', expectedMatch: true, category: 'Transliteration (regional)' },

    // Sibilant variations
    { query: 'Ashok', target: 'Asok', expectedMatch: true, category: 'Sibilant (sh → s)' },
    { query: 'Prakash', target: 'Prakas', expectedMatch: true, category: 'Sibilant variation' },

    // Typos and minor errors
    { query: 'Ankit', target: 'Ankitt', expectedMatch: true, category: 'Double consonant' },
    { query: 'Aditya', target: 'Aditay', expectedMatch: true, category: 'Typo' },

    // Should NOT match (different names)
    { query: 'Bharat', target: 'Rahul', expectedMatch: false, category: 'Different names' },
    { query: 'Amit', target: 'Sumit', expectedMatch: false, category: 'Different names' },
    { query: 'Ram', target: 'Shyam', expectedMatch: false, category: 'Different names' },
];

console.log('📋 Running Test Cases:\n');

let passed = 0;
let failed = 0;

for (const test of testCases) {
    const result = matchIndianName(test.query, test.target, 0.7);
    const matched = result !== null;
    const success = matched === test.expectedMatch;
    
    const icon = success ? '✅' : '❌';
    const score = result?.score.toFixed(2) || 'N/A';
    const matchType = result?.matchType || 'none';
    
    console.log(`${icon} [${test.category}]`);
    console.log(`   Query: "${test.query}" → Target: "${test.target}"`);
    console.log(`   Expected: ${test.expectedMatch}, Got: ${matched}, Score: ${score}, Type: ${matchType}`);
    
    if (success) {
        passed++;
    } else {
        failed++;
    }
    console.log();
}

console.log('=====================================');
console.log(`✅ Passed: ${passed}/${testCases.length}`);
console.log(`❌ Failed: ${failed}/${testCases.length}`);
console.log(`📊 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%\n`);

// Test findBestMatch
console.log('🔍 Testing findBestMatch:\n');

const customerNames = [
    'Bharat',
    'Rahul Kumar',
    'Saurabh Sharma',
    'Deepak Agarwal',
    'Priya Singh',
    'Amit Patel'
];

const queries = [
    'Bharath',      // Phonetic match → Bharat
    'Raju',         // Nickname → Rahul
    'Sonu',         // Nickname → Saurabh
    'Dipak',        // Phonetic → Deepak
    'Priyu',        // Nickname → Priya
    'Amitbhai',     // Honorific → Amit
];

for (const query of queries) {
    const match = findBestMatch(query, customerNames, 0.7);
    if (match) {
        console.log(`Query: "${query}" → Matched: "${match.matched}" (score: ${match.score.toFixed(2)}, type: ${match.matchType})`);
    } else {
        console.log(`Query: "${query}" → No match found`);
    }
}

console.log('\n=====================================');
console.log('🎯 Testing isSamePerson:\n');

const samePersonTests = [
    ['Bharat', 'Bharath', true],
    ['Rahul', 'Raju', true],
    ['Saurabh', 'Sonu', true],
    ['Deepak', 'Dipak', true],
    ['Amit', 'Sumit', false],
    ['Ram', 'Shyam', false],
];

for (const [name1, name2, expected] of samePersonTests) {
    const result = isSamePerson(name1 as string, name2 as string);
    const icon = result === expected ? '✅' : '❌';
    console.log(`${icon} "${name1}" vs "${name2}": ${result} (expected: ${expected})`);
}

console.log('\n=====================================');
console.log('📊 Testing findAllMatches:\n');

const ambiguousQuery = 'Raju';
const allMatches = findAllMatches(ambiguousQuery, [
    'Rahul',
    'Rajesh',
    'Rajendra',
    'Rajiv',
    'Bharat'
], 0.6);

console.log(`Query: "${ambiguousQuery}"\n`);
console.log('All matches (sorted by score):');
for (const match of allMatches) {
    console.log(`  - ${match.matched}: ${match.score.toFixed(2)} (${match.matchType})`);
}

console.log('\n✨ All tests completed!');
