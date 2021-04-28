#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { logger } = require('log-instance');
const APP_DIR = path.join(__dirname, '..', '..');
const LOCAL_DIR = path.join(APP_DIR, 'local');
const {
    BilaraData,
    Seeker,
} = require(`${APP_DIR}/index.js`);
const SRC_DIR = path.join(APP_DIR, 'src');
const EXAMPLES_PATH = path.join(SRC_DIR, 'examples.json');
const EBT_DATA_DIR = path.join(LOCAL_DIR, 'ebt-data');
const EXAMPLES_DIR = path.join(EBT_DATA_DIR, 'examples');

logger.logLevel = 'info';

(async function(){ try {
    let bilaraData = new BilaraData();
    await bilaraData.syncEbtData();
    let exampleFiles = (await fs.promises.readdir(EXAMPLES_DIR))
        .filter(f=>/examples-/.test(f));
    logger.info(`exampleFiles`, exampleFiles);

    let examples = {};
    let languages = [];
    for (exampleFile of exampleFiles) {
        let examplePath = path.join(EXAMPLES_DIR, exampleFile);
        let langExamples = (await fs.promises.readFile(examplePath))
            .toString()
            .split('\n')
            .filter(ex=>!!ex);
        if (langExamples.length) {
            let lang = exampleFile.split('-')[1].split('.')[0];
            languages.push(lang);
            examples[lang] = langExamples;
            logger.log(`${exampleFile}: ${langExamples.length}`);
        }
    }
    let examplesJson = JSON.stringify(examples,null,2) + '\n';
    await fs.promises.writeFile(EXAMPLES_PATH, examplesJson);
    logger.info(`DONE: updated ${EXAMPLES_PATH} (OK)`);
} catch(e) {
    logger.warn(e);
}})();
