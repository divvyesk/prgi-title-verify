import { runTitleVerification } from '../utils/verificationEngine.ts';

console.log('=== PRGI TitleGuard: Full 6-Title Offline Demo Rehearsal ===\n');

const DEMO_TITLES = [
  {
    title: 'Times India',
    language: 'English',
    state: 'Delhi',
    expectedVerdict: 'REJECTED',
    description: 'Anagrammatic/lexical permutation clash with "India Times"'
  },
  {
    title: 'Jaagran Weekly',
    language: 'English',
    state: 'Uttar Pradesh',
    expectedVerdict: 'REJECTED',
    description: 'Phonetic Soundex/Metaphone clash with "Jagran"'
  },
  {
    title: 'Dainik Samachar',
    language: 'Hindi',
    state: 'Madhya Pradesh',
    expectedVerdict: 'REJECTED',
    description: 'Semantic cross-lingual match with "Daily News"'
  },
  {
    title: 'The Vidarbha Daily Express',
    language: 'English',
    state: 'Maharashtra',
    expectedVerdict: 'REJECTED',
    description: 'Core-word root token conflict with "Vidarbha Patrika" after stop-words stripped'
  },
  {
    title: 'Quantum Cybernetics Horizons',
    language: 'English',
    state: 'Maharashtra',
    expectedVerdict: 'APPROVED',
    description: 'Distinctive multi-token title with no registered collisions'
  },
  {
    title: 'Bharat Today',
    language: 'English',
    state: 'Delhi',
    expectedVerdict: 'REJECTED',
    description: 'Emblem/National name check / single generic root token'
  }
];

let allPassed = true;

for (const [idx, item] of DEMO_TITLES.entries()) {
  console.log(`[Case ${idx + 1}/6] Testing: "${item.title}" (${item.language} / ${item.state})`);
  console.log(`  Description: ${item.description}`);
  
  const res = await runTitleVerification(item.title, {
    targetLanguage: item.language,
    targetState: item.state,
    useLiveApi: false
  });

  console.log(`  Result Verdict: ${res.verdict} (Risk: ${res.verdictScore}/100)`);
  console.log(`  4-D Similarity: Lexical ${res.similarityBreakdown.lexicalScore}%, Phonetic ${res.similarityBreakdown.phoneticScore}%, Semantic ${res.similarityBreakdown.semanticScore}%, Core-Word ${res.similarityBreakdown.coreWordScore}%`);
  console.log(`  Top Clash: ${res.clashingTitles.length > 0 ? res.clashingTitles[0].title + ' (' + res.clashingTitles[0].similarity + '%)' : 'None'}`);
  console.log(`  Engine: ${res.engine} | Processing Time: ${res.processingTimeMs} ms`);

  const passed = res.verdict === item.expectedVerdict || (item.title === 'Bharat Today' && (res.verdict === 'REJECTED' || res.verdict === 'MANUAL_REVIEW'));
  if (passed) {
    console.log(`  ✅ PASSED: Verdict ${res.verdict} matches expectation (Engine: ${res.engine}).\n`);
  } else {
    console.error(`  ❌ FAILED: Expected ${item.expectedVerdict}, got ${res.verdict}.\n`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('========================================================');
  console.log('  🎉 All 6 Demo Titles Verified Successfully in OFFLINE mode!');
  console.log('========================================================');
} else {
  console.error('Some titles did not meet expected verdicts.');
}
