# CLAUDE.md - scv-bilara Project Guidelines

## Bug Types

Two kinds of bugs can cause test failures:

1. **Code Bug**: Code logic is broken (e.g., search algorithm, filtering logic)
   - Fix: Update source code logic
   - Test: Use TESTTEST prefix, run with mocha --grep

2. **Content Bug**: Content has changed since test was written
   - Fix: Update test expectations to match new content
   - Test: Use TESTTEST prefix, run with mocha --grep

## Determining Bug Type During Analysis

1. **Check the actual vs expected values** in test failure
2. **Look at the content files** that are being tested
3. **Determine if content is present**:
   - If content IS there and test expects it missing → Content Bug
   - If content is missing and test expects it there → Content Bug
   - If content hasn't changed but behavior is wrong → Code Bug

## Content Bug Fixing Process

When tests fail due to content changes:

### Understanding
- Tests represent **past truth** (when tests were written)
- Content in bilara-data/ebt-data changes over time
- Test failures indicate content has changed, not that code is broken
- **Our job**: Update test expectations to match new content reality
- NOT: Fix code to filter out or exclude content

### Process for Each Failing Test

1. **Analyze**:
   - Run failing test, capture output
   - Check content files (JSON translation files) for what's actually there
   - Identify what changed since test was written
   - **Determine bug type** (Content or Code)

2. **Agree**:
   - Share analysis with developer
   - Confirm understanding of the change

3. **Propose**:
   - Suggest fix (update test expectations)
   - Explain which content was added/changed

4. **Approve**:
   - Get developer approval before making changes

5. **Implement**:
   - Update test file with new expected values
   - Add TESTTEST prefix to test name (e.g., `it("TESTTESTexampleSuttas()"`)

6. **Test**:
   - Run: `npx mocha test/<file>.mjs --grep "TESTTEST"`
   - Verify test passes
   - Remove TESTTEST prefix when confirmed

7. **Next**:
   - Move to next failing test

### Key Files
- Test files: `/test/*.mjs` and `/test/*.js`
- Content files: `/local/bilara-data/translation/` and `/local/ebt-data/translation/`
- JSON structure: `{suttaId:segmentId: "translation text", ...}`

### Example
When `mn105/de/sabbamitta` content changed to include "Wurzel des Leidens", tests that search for that phrase now return mn105. Update test expectations to include mn105 in expected results.

## Build Status

- **v3.192.3**: Node v20 tests all passing (255 tests). All 7 failing tests were Content Bugs fixed by updating test expectations for mn105 German translations.
