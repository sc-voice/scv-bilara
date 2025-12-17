# WORK.md

**Build**: v3.192.2
**Status**: In Progress
**Started**: 2025-12-16

## Objective

Fix errors found by "npm run test" one-by-one with developer

## Process for Fixing Each Bug (1-7)

1. **Analyze**: Run test, capture failure output, identify what's wrong
2. **Agree**: Share analysis with developer, get agreement
3. **Propose**: Suggest fix based on analysis, explain reasoning
4. **Approve**: Get developer approval before making changes
5. **Implement**: Make code changes and add TESTTEST prefix to test name
6. **Test**: Run `npx mocha test/<file>.mjs --grep "TESTTEST"` to verify fix works
7. **Next**: Move to next bug

## Plan

1. [x] Bug 1: example-v2 exampleSuttas()
2. [x] Bug 2: example-v2 suttasOfExamples()
3. [x] Bug 3: Seeker phraseSearch(...) finds Deutsch results
4. [x] Bug 4: Seeker find({minLang:3}) root of suffering
5. [x] Bug 5: Seeker find(...) => finds phrase
6. [x] Bug 6: Seeker find() keywords: wurzel leidens
7. [x] Bug 7: Seeker find(...) ignores translation stubs

## Current Step

Complete - All 7 bugs fixed, 255 tests passing

## Blockers

None

## Notes

- 248 passing, 7 failing tests
- All failures involve unwanted inclusion of mn105 in search results
- Bug 1 FIXED: Updated test to include mn105 in expected results
- All bugs appear to be Content Bugs (content changed, not code broken)
