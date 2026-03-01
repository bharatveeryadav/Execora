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

import test from 'node:test';
import assert from 'node:assert/strict';
import { transliterateDevanagari } from '../utils/devanagari';

// ── helpers ──────────────────────────────────────────────────────────────────

function hasNoDevanagari(s: string): boolean {
  return !/[\u0900-\u097F]/.test(s);
}

function isTitleCased(s: string): boolean {
  return s.split(' ').every((w) => !w || w[0] === w[0].toUpperCase());
}

/** Assert: output has no Devanagari characters and is title-cased */
function noDevBatch(names: string[], label: string) {
  const failures: string[] = [];
  for (const name of names) {
    const result = transliterateDevanagari(name);
    if (!hasNoDevanagari(result)) {
      failures.push(`"${name}" → "${result}" (still has Devanagari)`);
    } else if (!isTitleCased(result)) {
      failures.push(`"${name}" → "${result}" (not title-cased)`);
    }
  }
  assert.equal(failures.length, 0,
    `${label}: ${failures.length} failure(s):\n${failures.slice(0, 10).join('\n')}`
  );
}

/** Assert: exact Roman output for name→expected pairs */
function exactBatch(cases: [string, string][]) {
  for (const [input, expected] of cases) {
    const result = transliterateDevanagari(input);
    assert.equal(result, expected, `"${input}" → expected "${expected}", got "${result}"`);
    assert.ok(hasNoDevanagari(result), `Output has Devanagari: "${result}"`);
  }
}

// ─── Fast-path ───────────────────────────────────────────────────────────────

test('fast-path: pure ASCII returns unchanged', () => {
  assert.equal(transliterateDevanagari('Rahul'), 'Rahul');
  assert.equal(transliterateDevanagari('Priya'), 'Priya');
  assert.equal(transliterateDevanagari(''), '');
});

test('fast-path: mixed ASCII+Devanagari preserves ASCII', () => {
  const result = transliterateDevanagari('राहुल Kumar');
  assert.ok(result.includes('Kumar'), 'ASCII part should be preserved');
  assert.ok(hasNoDevanagari(result));
});

// ─── Exact-match — algorithm output is deterministic for these ───────────────

test('exact: common Hindi names — short vowels, simple structure', () => {
  exactBatch([
    ['राम',      'Ram'],
    ['रमेश',     'Ramesh'],
    ['सुरेश',    'Suresh'],
    ['राधा',     'Radha'],
    ['सीता',     'Sita'],
    ['गीता',     'Gita'],
    ['उषा',      'Usha'],
    ['लता',      'Lata'],
    ['रानी',     'Rani'],
    ['विजय',     'Vijay'],
    ['रवि',      'Ravi'],
    ['प्रेम',    'Prem'],
    ['प्रताप',   'Pratap'],
    ['कमल',      'Kamal'],
    ['अमित',     'Amit'],
    ['राहुल',    'Rahul'],
    ['रोहित',    'Rohit'],
    ['मोहित',    'Mohit'],
    ['ललित',     'Lalit'],
    ['मीना',     'Mina'],
  ]);
});

test('exact: anusvara (ं) mid-word nasal', () => {
  exactBatch([
    ['संजय',   'Sanjay'],
    ['संतोष',  'Santosh'],
    ['अंकित',  'Ankit'],
    ['अंजली',  'Anjali'],
    ['वसंत',   'Vasant'],
    ['हेमंत',  'Hemant'],
    ['इंदु',   'Indu'],
    ['गोविंद', 'Govind'],
  ]);
});

test('exact: halant (्) consonant clusters', () => {
  exactBatch([
    ['कृष्ण',    'Krishn'],    // final inherent 'a' dropped (consistent with Ram, Bharat, etc.)
    ['श्रेया',   'Shreya'],
    ['श्रीराम',  'Shriram'],
    ['द्वारिका', 'Dvarika'],
    ['त्रिलोकी', 'Triloki'],
    ['प्रिया',   'Priya'],
    ['प्रकाश',   'Prakash'],
    ['प्रमोद',   'Pramod'],
    ['ब्रजेश',   'Brajesh'],
  ]);
});

test('exact: matra vowel signs', () => {
  exactBatch([
    ['राधा',   'Radha'],   // ा = aa → 'a'
    ['रीता',   'Rita'],    // ी = ii → 'i'
    ['सुमन',   'Suman'],   // ु = u
    ['सूरज',   'Suraj'],   // ू = uu → 'u'
    ['ऋषि',    'Rishi'],   // ृ = ri
    ['रेखा',   'Rekha'],   // े = e
    ['गौरी',   'Gauri'],   // ौ = au
    ['शांति',  'Shanti'],  // ां = an
  ]);
});

test('exact: independent vowels at word start', () => {
  exactBatch([
    ['अनिल',    'Anil'],
    ['अमित',    'Amit'],
    ['उमा',     'Uma'],
    ['उषा',     'Usha'],
    ['ऋषि',     'Rishi'],
    ['ओम',      'Om'],
    ['आकाश',   'Akash'],
  ]);
});

test('exact: Devanagari digits', () => {
  assert.equal(transliterateDevanagari('०'), '0');
  assert.equal(transliterateDevanagari('१२३'), '123');
  assert.equal(transliterateDevanagari('२०२४'), '2024');
  assert.equal(transliterateDevanagari('९'), '9');
});

// ─── No-Devanagari batch tests (300+ names from all Indian states) ───────────

test('no-Devanagari: Hindi belt male names', () => {
  noDevBatch([
    'राम', 'श्याम', 'रमेश', 'सुरेश', 'महेश', 'दिनेश', 'राजेश', 'नरेश',
    'मुकेश', 'गणेश', 'रवि', 'विनय', 'संजय', 'विजय', 'अजय', 'मनोज',
    'राजीव', 'संदीप', 'दीपक', 'अनिल', 'सुनील', 'कमल', 'अमित', 'सुमित',
    'रोहित', 'मोहित', 'अंकित', 'विकास', 'आकाश', 'ललित',
    'गोपाल', 'मोहन', 'केशव', 'माधव', 'नंदलाल', 'बृजलाल',
    'मथुरा', 'वृंदावन', 'द्वारिका', 'बदरीनाथ', 'केदारनाथ',
    'भगवान', 'हनुमान', 'जयप्रकाश', 'रामनाथ', 'उमेश', 'योगेंद्र',
  ], 'Hindi belt male');
});

test('no-Devanagari: Hindi belt female names', () => {
  noDevBatch([
    'प्रिया', 'नेहा', 'पूजा', 'अंजली', 'रेखा', 'सुनीता', 'ममता',
    'कल्पना', 'मीना', 'सीमा', 'गीता', 'रीता', 'निता', 'रानी',
    'मालती', 'उषा', 'लता', 'शीला', 'कविता', 'सरिता', 'अनीता',
    'शांति', 'दुर्गा', 'पार्वती', 'लक्ष्मी', 'सरस्वती', 'राधा', 'सीता',
    'सुधा', 'मधु', 'मधुबाला', 'हेमा', 'रमा', 'जानकी', 'अहिल्या',
    'कुंती', 'सुभद्रा', 'रुक्मिणी', 'सत्यभामा', 'देवयानी', 'शकुंतला',
  ], 'Hindi belt female');
});

test('no-Devanagari: consonant cluster names (halant heavy)', () => {
  noDevBatch([
    'प्रकाश', 'प्रेम', 'प्रमोद', 'प्रताप', 'प्रदीप',
    'ब्रजेश', 'ब्रजमोहन',
    'कृष्ण', 'कृपा', 'स्नेह', 'श्रेया', 'श्रीराम', 'श्रीकांत', 'श्रीवास्तव',
    'द्वारिका', 'स्वयंभू', 'त्रिलोकी', 'त्रिभुवन',
    'चन्द्रशेखर', 'चन्द्रकान्त', 'भगवान',
    'लक्ष्मी', 'राजलक्ष्मी', 'धर्मेंद्र', 'भूपेंद्र',
    'देवेंद्र', 'राजेंद्र', 'नरेंद्र', 'सुरेंद्र', 'महेंद्र',
  ], 'consonant clusters');
});

test('no-Devanagari: Rajasthan names', () => {
  noDevBatch([
    'भंवर', 'भैरव', 'जगदीश', 'जसवंत', 'हनुमान', 'रतन', 'दौलत',
    'फूलचंद', 'शंकर', 'मांगीलाल', 'गौरी', 'सरोज', 'कमला', 'गायत्री', 'चंपा',
    'राठौड़', 'सिसोदिया', 'भाटी', 'तंवर', 'पंवार',
  ], 'Rajasthan');
});

test('no-Devanagari: Haryana names', () => {
  noDevBatch([
    'धर्मेंद्र', 'राजकुमार', 'बलबीर', 'जगबीर', 'सतबीर', 'अजीत',
    'रणबीर', 'जसबीर', 'महाबीर', 'सुभाष', 'भगत', 'देवी', 'सावित्री',
    'निर्मला',
  ], 'Haryana');
});

test('no-Devanagari: MP / Chhattisgarh names', () => {
  noDevBatch([
    'भूपेंद्र', 'नर्मदा', 'हरिशंकर', 'बालकृष्ण', 'श्यामलाल',
    'रमाशंकर', 'खेमलाल', 'मनमोहन', 'त्रिलोक', 'विद्याधर',
    'इंदिरा', 'अमृता', 'विमला', 'सुभद्रा', 'मृदुला',
  ], 'MP/Chhattisgarh');
});

test('no-Devanagari: Bihar / Jharkhand names', () => {
  noDevBatch([
    'बिंदेश्वर', 'रामविलास', 'बजरंगी', 'जयप्रकाश', 'रामनाथ',
    'उमेश', 'योगेंद्र', 'हरेराम', 'बिहारी', 'सत्येंद्र',
    'फूलमती', 'बिमला', 'अवधेश', 'कुमारी', 'चंदावती',
    'झा', 'मिश्र', 'दास', 'प्रसाद', 'सिन्हा', 'शाही',
  ], 'Bihar/Jharkhand');
});

test('no-Devanagari: Maharashtra Marathi names', () => {
  noDevBatch([
    'सचिन', 'रोहन', 'अभिजीत', 'आनंद', 'अशोक', 'विठ्ठल', 'पांडुरंग',
    'दत्तात्रय', 'नामदेव', 'एकनाथ', 'ज्ञानेश्वर', 'तुकाराम',
    'बाबाराव', 'गजानन', 'गणपत',
    'मेघना', 'मधुरा', 'वैशाली', 'स्मिता', 'सुनंदा', 'वंदना', 'छाया',
    'जयश्री', 'शुभांगी', 'रोहिणी', 'मनाली', 'तेजस्विनी', 'विद्या',
    'पाटील', 'देशमुख', 'जाधव', 'मोरे', 'शिंदे', 'ठाकरे', 'कदम',
    'भोसले', 'माने', 'गायकवाड', 'साळुंखे', 'चव्हाण', 'काळे',
    'कुलकर्णी', 'पवार', 'नाईक', 'सावंत', 'गोखले',
  ], 'Maharashtra Marathi');
});

test('no-Devanagari: Gujarat names', () => {
  noDevBatch([
    'नरेंद्र', 'अमित', 'हर्ष', 'रुपेश', 'जिग्नेश', 'ध्रुव', 'मनीष',
    'भावेश', 'केतन', 'दर्शन', 'दिव्या', 'पूर्वी', 'काव्या', 'प्राची',
    'भूमि', 'हंसा', 'वर्षा', 'रमिला', 'निलम', 'सुमन',
    'पटेल', 'शाह', 'मेहता', 'देसाई', 'जोशी', 'परमार', 'चौधरी',
    'दवे', 'भट्ट', 'नायक', 'त्रिवेदी', 'पंड्या', 'सोलंकी', 'राणा',
    'ढोलकिया', 'अंबानी', 'अदानी', 'मोदी', 'छाया', 'मिस्त्री',
  ], 'Gujarat');
});

test('no-Devanagari: Punjab Sikh names', () => {
  noDevBatch([
    'गुरप्रीत', 'मनप्रीत', 'जसप्रीत', 'रविंदर', 'हरजिंदर', 'कुलदीप',
    'बलजिंदर', 'परमजीत', 'सुखजीत', 'हरदीप', 'अमरजीत', 'गुरदीप',
    'नवजोत', 'तेजिंदर', 'सिमरन',
    'हरसिमरत', 'रूपिंदर', 'परमिंदर', 'बलविंदर', 'कुलविंदर',
    'सुखमनी', 'रवनीत', 'दलजीत', 'हरनीत', 'प्रीतम',
    'ग्रेवाल', 'धालीवाल', 'संधू', 'गिल', 'सिद्धू', 'अहलुवालिया',
    'बाजवा', 'मान', 'दुग्गल',
  ], 'Punjab Sikh');
});

test('no-Devanagari: Bengali / Odia names', () => {
  noDevBatch([
    'सुभाष', 'अमिताभ', 'ऋत्विक', 'सत्यजित', 'मृणाल', 'तपन',
    'उत्तम', 'बिमल', 'श्यामल', 'सुचित्रा', 'माधुरी', 'अपर्णा',
    'स्वस्तिका', 'ममता', 'जगन्नाथ', 'बैजनाथ', 'सुरेंद्र',
  ], 'Bengali/Odia');
});

test('no-Devanagari: Tamil names in Devanagari', () => {
  noDevBatch([
    'रजनीकांत', 'कमलहासन', 'विजयकांत', 'विक्रम', 'अजीत', 'धनुष',
    'मुरुगन', 'कार्तिक', 'अरुण', 'वेलु', 'पलनी', 'सेल्वम', 'जयराम',
    'सरोजा', 'मीनाक्षी', 'कमला', 'लावण्या', 'कोकिला', 'चित्रा',
    'ललिता', 'विजया',
  ], 'Tamil');
});

test('no-Devanagari: Telugu names in Devanagari', () => {
  noDevBatch([
    'वेंकटेश', 'श्रीनिवास', 'रामकृष्ण', 'लक्ष्मीनारायण', 'नागार्जुन',
    'सुब्रमण्यम', 'वेंकटरमण', 'रामाराव', 'कृष्णमूर्ति', 'सत्यनारायण',
    'बालकृष्णन', 'नागेश्वर', 'हनुमंत', 'पद्मावती', 'श्यामला',
    'सत्यवती', 'हेमलता', 'यशोदा', 'भवानी', 'अनसूया',
  ], 'Telugu');
});

test('no-Devanagari: Karnataka names in Devanagari', () => {
  noDevBatch([
    'शिवराज', 'राघवेंद्र', 'वेंकटरमण', 'मंजुनाथ', 'श्रीकांत',
    'नागभूषण', 'सिद्धार्थ', 'पुनीत', 'राधाकृष्ण', 'विश्वनाथ',
    'तारावती', 'सुगुणा', 'मंगला', 'सौम्या', 'वर्षा',
    'कीर्ति', 'आनंदी', 'शारदा',
  ], 'Karnataka');
});

test('no-Devanagari: Kerala Malayalam names', () => {
  noDevBatch([
    'मोहनलाल', 'दिलीप', 'पृथ्वीराज', 'सुरेश', 'रवींद्रन', 'बालन',
    'गोपी', 'शोभना', 'रेवती', 'मंजू', 'काव्या', 'उर्वशी', 'मीरा',
    'अम्बिका', 'सरिता', 'नायर', 'थम्पी', 'वारियर', 'मेनन',
  ], 'Kerala');
});

test('no-Devanagari: common Hindi belt surnames', () => {
  noDevBatch([
    'शर्मा', 'वर्मा', 'गुप्ता', 'अग्रवाल', 'यादव', 'सिंह', 'मिश्रा',
    'तिवारी', 'दुबे', 'पांडे', 'त्रिपाठी', 'चौरसिया', 'सोनी', 'सिंघल',
    'श्रीवास्तव', 'अवस्थी', 'खन्ना', 'सक्सेना', 'जैन', 'माथुर',
    'राजपूत', 'चौहान', 'ठाकुर', 'कुशवाहा', 'मौर्य',
  ], 'Hindi belt surnames');
});

test('no-Devanagari: mythology / deity names', () => {
  noDevBatch([
    'राम', 'लक्ष्मण', 'भरत', 'शत्रुघ्न', 'हनुमान',
    'इंद्र', 'वरुण', 'कुबेर', 'यम',
    'दुर्गा', 'काली', 'भवानी', 'अन्नपूर्णा', 'ललिता',
    'महालक्ष्मी', 'सरस्वती',
  ], 'mythology');
});

test('no-Devanagari: Sindhi and other surnames', () => {
  noDevBatch([
    'वासवानी', 'मलहोत्रा', 'खत्री', 'थडानी', 'लालवानी',
    'भावनानी', 'रूपानी', 'हिंदुजा', 'चावला', 'कपूर',
    'हिंदुजा', 'अडवानी', 'चांदनी', 'गिदवानी', 'किर्पलानी',
    'लालचंदानी', 'मखीजा', 'बजाज',
  ], 'Sindhi');
});

test('no-Devanagari: Bollywood / celebrity names', () => {
  noDevBatch([
    'अभिषेक', 'करण', 'अर्जुन', 'सिद्धांत', 'इशान', 'आयुष्मान',
    'राजकुमार', 'वरुण', 'रणवीर',
    'दीपिका', 'ऐश्वर्या', 'प्रियंका', 'काजोल', 'माधुरी',
    'अमिताभ', 'सलमान', 'शाहरुख', 'आमिर',
  ], 'Bollywood');
});

test('no-Devanagari: political figures', () => {
  noDevBatch([
    'इंदिरा', 'राजीव', 'सोनिया', 'मनमोहन', 'शरद', 'मुलायम',
    'नरेंद्र', 'अरविंद', 'ममता', 'मायावती',
    'वाजपेयी', 'आडवाणी',
  ], 'political figures');
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

test('edge: empty and non-Devanagari strings', () => {
  assert.equal(transliterateDevanagari(''), '');
  assert.equal(transliterateDevanagari('   '), '   ');
  assert.equal(transliterateDevanagari('123'), '123');
  assert.equal(transliterateDevanagari('A B C'), 'A B C');
});

test('edge: single-character consonants all map to Roman', () => {
  const consonants = ['क', 'ख', 'ग', 'घ', 'च', 'छ', 'ज', 'झ', 'ट', 'ठ',
    'ड', 'ढ', 'ण', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ', 'ब', 'भ', 'म',
    'य', 'र', 'ल', 'ळ', 'व', 'श', 'ष', 'स', 'ह'];
  for (const ch of consonants) {
    const result = transliterateDevanagari(ch);
    assert.ok(hasNoDevanagari(result), `"${ch}" still has Devanagari: "${result}"`);
    assert.ok(result.length > 0, `"${ch}" gave empty output`);
  }
});

test('edge: all independent vowels map to Roman', () => {
  const vowels = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ'];
  for (const v of vowels) {
    const result = transliterateDevanagari(v);
    assert.ok(hasNoDevanagari(result), `"${v}" still has Devanagari: "${result}"`);
    assert.ok(result.length > 0);
  }
});

test('edge: nukta variants produce no Devanagari', () => {
  // Precomposed nukta chars (U+0958–U+095F)
  const nuktaChars = ['\u0958', '\u0959', '\u095A', '\u095B', '\u095C', '\u095D', '\u095E', '\u095F'];
  for (const ch of nuktaChars) {
    const result = transliterateDevanagari(ch);
    assert.ok(hasNoDevanagari(result), `Nukta char U+${ch.codePointAt(0)!.toString(16)} still has Devanagari: "${result}"`);
  }
});

test('edge: decomposed nukta (consonant + U+093C) produces no Devanagari', () => {
  // ड + ़ (decomposed form of ड़)
  const result1 = transliterateDevanagari('ड\u093C');
  assert.ok(hasNoDevanagari(result1), `Decomposed nukta ड + ़ still has Devanagari: "${result1}"`);

  // Name with decomposed nukta: चोपड़ा (Chopra)
  const result2 = transliterateDevanagari('चोपड\u093Cा');
  assert.ok(hasNoDevanagari(result2), `चोपड़ा (decomposed) has Devanagari: "${result2}"`);
});

test('edge: long vowel matra same as short (i=i, u=u for names)', () => {
  // ी (long i) and ि (short i) → both 'i'
  const deepak = transliterateDevanagari('दीपक'); // ी = long i
  assert.ok(hasNoDevanagari(deepak));
  assert.ok(deepak.toLowerCase().includes('d'));

  // ू (long u) and ु (short u) → both 'u'
  const suraj = transliterateDevanagari('सूरज');
  assert.equal(suraj, 'Suraj');
});

test('edge: visarga (ः) in names', () => {
  const result = transliterateDevanagari('हरिः');
  assert.ok(hasNoDevanagari(result));
  assert.ok(result.length > 0);
});

test('edge: Western loanword vowels (ऑ ॉ) produce no Devanagari', () => {
  // ऑ (U+0911) — used in words like ऑफिस, डॉक्टर
  const r1 = transliterateDevanagari('ऑफिस');
  assert.ok(hasNoDevanagari(r1), `ऑफिस has Devanagari: "${r1}"`);

  const r2 = transliterateDevanagari('डॉक्टर');
  assert.ok(hasNoDevanagari(r2), `डॉक्टर has Devanagari: "${r2}"`);
});

// ─── Similar-name variant tests ───────────────────────────────────────────────
// These verify that commonly confused name variants (short/long vowels, aspirated
// consonants) transliterate to the same or closely similar Roman string.
// The fuzzy matcher handles the final disambiguation in production.

test('similar: नितिन and नितीन both → Nitin (short/long i)', () => {
  // नितिन = न+ि+त+ि+न  (short i in both syllables)
  const nitin1 = transliterateDevanagari('नितिन');
  // नितीन = न+ि+त+ी+न  (long ī in second syllable — same as short for names)
  const nitin2 = transliterateDevanagari('नितीन');

  assert.equal(nitin1, 'Nitin');
  assert.equal(nitin2, 'Nitin');
  // Both produce identical output — fuzzy match trivially recognises them as same
  assert.equal(nitin1, nitin2, 'Both variants must produce identical output');
});

test('similar: राहुल and राहूल both → Rahul (short/long u)', () => {
  const r1 = transliterateDevanagari('राहुल');
  const r2 = transliterateDevanagari('राहूल');
  assert.equal(r1, 'Rahul');
  assert.equal(r2, 'Rahul');
  assert.equal(r1, r2);
});

test('similar: दीपक and दिपक both → Dipak (long/short i)', () => {
  const d1 = transliterateDevanagari('दीपक'); // long ī
  const d2 = transliterateDevanagari('दिपक'); // short i
  assert.equal(d1, 'Dipak');
  assert.equal(d2, 'Dipak');
  assert.equal(d1, d2);
});

test('similar: सुनील and सुनिल both → Sunil (long/short i)', () => {
  const s1 = transliterateDevanagari('सुनील'); // long ī
  const s2 = transliterateDevanagari('सुनिल'); // short i
  assert.equal(s1, 'Sunil');
  assert.equal(s2, 'Sunil');
  assert.equal(s1, s2);
});

test('similar: प्रिया and प्रीया both → Priya (short/long i in second syllable)', () => {
  const p1 = transliterateDevanagari('प्रिया');
  const p2 = transliterateDevanagari('प्रीया');
  assert.equal(p1, 'Priya');
  assert.equal(p2, 'Priya');
  assert.equal(p1, p2);
});

test('similar: विजय and विजयी — Vijay vs Vijayi (suffix -i differs)', () => {
  const v1 = transliterateDevanagari('विजय');
  const v2 = transliterateDevanagari('विजयी');
  assert.equal(v1, 'Vijay');
  assert.equal(v2, 'Vijayi');
  assert.ok(hasNoDevanagari(v1) && hasNoDevanagari(v2));
  // Confirm the base 'vijay' is present in both
  assert.ok(v2.toLowerCase().startsWith(v1.toLowerCase()),
    `"${v2}" should start with "${v1}"`);
});

test('similar: ट (retroflex T) and त (dental T) — Nitesh vs Nitesh', () => {
  // Both ट and त map to 't' — Nitin in North India vs Nithin in South India
  // is a Roman spelling difference, not Devanagari.  Both Devanagari variants → same 't'.
  const t1 = transliterateDevanagari('नितेश');  // dental त
  const t2 = transliterateDevanagari('निटेश');  // retroflex ट
  assert.equal(t1, 'Nitesh');
  assert.equal(t2, 'Nitesh');
  // Fuzzy match treats both as same person ✓
});

test('similar: ण (retroflex N) and न (dental N) — both → n', () => {
  const r1 = transliterateDevanagari('रामन');  // dental न
  const r2 = transliterateDevanagari('रामण');  // retroflex ण
  assert.equal(r1, 'Raman');
  assert.equal(r2, 'Raman');
  assert.equal(r1, r2);
});

test('similar: श and ष (both sibilants) → both sh', () => {
  const s1 = transliterateDevanagari('शांति');   // palatal श → sh
  const s2 = transliterateDevanagari('षण्मुख');  // retroflex ष → sh (Shanmukha, Tamil name)
  assert.ok(s1.toLowerCase().startsWith('sh'), `"शांति" → "${s1}" should start with sh`);
  assert.ok(s2.toLowerCase().startsWith('sh'), `"षण्मुख" → "${s2}" should start with sh`);
  assert.ok(hasNoDevanagari(s1) && hasNoDevanagari(s2));
});

// ─── Complex / long Sanskrit compound names ───────────────────────────────────

test('complex: long Sanskrit compound names produce no Devanagari', () => {
  noDevBatch([
    // 4-syllable compounds
    'चन्द्रशेखर',         // Chandrashekhar
    'नरसिंहराव',          // Narasimharao
    'विश्वनाथप्रसाद',    // Vishvanthanprasad
    'सत्यनारायण',         // Satyanarayan
    'रामकृष्णानंद',      // Ramakrishnananda
    'विद्यासागर',         // Vidyasagar
    'लक्ष्मीनारायण',     // Lakshminarayan
    'राधाकृष्णन',         // Radhakrishnan
    'जगन्नाथ',            // Jagannath
    'नारायणस्वामी',       // Narayanaswami
    // 5+ syllable names
    'श्रीरामकृष्ण',       // Shriramakrishna
    'वेंकटरमणस्वामी',    // Venkataramanaswami
    'कृष्णमूर्तिशास्त्री', // Krishnamurti Shastri
    'चंद्रमौलीश्वर',     // Chandramoulishvara
    'नागेश्वरराव',        // Nageshvaraao
    // Very long
    'श्रीरामचन्द्रप्रसाद', // Shri Ramachandra Prasad
    'विश्वम्भरप्रसाद',    // Vishvambharaprasad
    'गोपालकृष्णदास',      // Gopalkrishnadasa
  ], 'complex Sanskrit compounds');
});

test('complex: multi-halant clusters (3+ consonant conjuncts)', () => {
  noDevBatch([
    'स्त्री',    // stri (woman — appears in names like Stridevi)
    'क्ष्मी',   // kshmi (part of Lakshmi)
    'स्त्रिया', // striya
    'द्ध',      // ddh (Buddha)
    'ज्ञान',    // jnan (Gyan)
    'ज्ञानेश',  // Jnanesh
    'क्षत्रिय', // Kshatriya
    'क्षेत्र',  // Kshetra
    'श्रद्धा',  // Shraddha
    'प्रज्ञा',  // Prajna
    'प्रस्तुत', // Prastut
    'सन्ध्या',  // Sandhya
    'श्रद्धांजलि', // Shraddhanjali
  ], 'triple consonant clusters');
});

test('complex: aspirated vs unaspirated — both produce no Devanagari', () => {
  // Hindi pairs: both produce valid Roman (different characters)
  const pairs: [string, string][] = [
    ['भरत', 'बरत'],   // bh vs b (Bharat vs Barat)
    ['धर्म', 'दर्म'],  // dh vs d
    ['थाल', 'ताल'],   // th vs t
    ['फल', 'पल'],     // ph vs p
    ['घर', 'गर'],     // gh vs g
  ];
  for (const [asp, unasp] of pairs) {
    const r1 = transliterateDevanagari(asp);
    const r2 = transliterateDevanagari(unasp);
    assert.ok(hasNoDevanagari(r1), `${asp} → "${r1}" has Devanagari`);
    assert.ok(hasNoDevanagari(r2), `${unasp} → "${r2}" has Devanagari`);
    assert.ok(r1 !== r2, `Aspirated "${asp}" and unaspirated "${unasp}" should differ: both → "${r1}"`);
  }
});

test('complex: names with embedded anusvara in various positions', () => {
  exactBatch([
    ['संजय',      'Sanjay'],   // anusvara before consonant
    ['अंकित',     'Ankit'],    // anusvara after independent vowel
    ['अंजली',    'Anjali'],    // anusvara after independent vowel + rest
    ['हेमंत',     'Hemant'],   // anusvara mid-name
    ['बसंत',      'Basant'],   // anusvara mid-word
    ['वसंत',      'Vasant'],
    ['गोविंद',    'Govind'],
    ['इंदिरा',    'Indira'],   // anusvara at start (after independent vowel)
    ['इंद्र',     'Indr'],     // anusvara + halant cluster
    ['चंद्र',     'Chandr'],   // anusvara + consonant cluster
  ]);
});

test('complex: full compound names — first + last', () => {
  const cases: string[] = [
    'नरेंद्र मोदी',
    'राहुल गांधी',
    'अमिताभ बच्चन',
    'सचिन तेंडुलकर',
    'विराट कोहली',
    'रोहित शर्मा',
    'महेंद्र सिंह धोनी',
    'प्रियंका चोपड़ा',        // has decomposed nukta
    'श्रेया घोषाल',
    'ए आर रहमान',
    'लता मंगेशकर',
    'मोहम्मद रफी',
    'किशोर कुमार',
    'हेमंत कुमार',
    'जावेद अख्तर',
    'गुलजार',
    'आर के नारायण',
    'सत्यजित राय',
    'मृणाल सेन',
    'बिमल रॉय',
  ];
  noDevBatch(cases, 'compound full names');
});

test('complex: regional surname patterns with unusual characters', () => {
  noDevBatch([
    // Marathi surnames with ळ (retroflex L)
    'काळे',
    'साळुंखे',
    'काळबांडे',
    'वाळके',
    'माळी',
    'कोळी',
    // Names with ऋ (vocalic R)
    'ऋषभ',
    'ऋतु',
    'ऋचा',
    'ऋत्विक',
    'कृतिका',
    'मृदुला',
    'अमृत',
    'अमृता',
    // Names starting with ऐ/ओ/औ
    'ऐश्वर्या',
    'ओमप्रकाश',
    'औरंगजेब',
    // Names with chandrabindu (ँ) — nasal vowel
    'हँसना',
    'चाँदनी',
    'आँचल',
  ], 'unusual regional patterns');
});

test('complex: Urdu/Farsi origin names with nukta sounds', () => {
  noDevBatch([
    'ज़ुबैर',   // z sound (ज़)
    'फ़ारुख',   // f sound (फ़)
    'फ़रीदा',   // f sound
    'ज़ीनत',    // z sound
    'ग़ालिब',   // gh/g sound (ग़)
    'क़ासिम',   // q sound (क़)
    'फ़िरोज़',   // f + z sounds
    'ज़ाहिर',   // z
    'फ़र्ज़ाना', // f + z
    'नासिर',    // standard — no nukta
  ], 'Urdu/Farsi nukta names');
});
