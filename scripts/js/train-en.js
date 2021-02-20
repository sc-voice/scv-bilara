#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const {
    BilaraData,
    FuzzyWordSet,
    SegDoc,
    ExecGit,

} = require('../../index');
const { logger } = require('log-instance');

(async function() { try {
    logger.info('train-en initializing...');

    var bd = await new BilaraData({
        logLevel: false,
    }).initialize();
    var pliWords = {};
    for (var i = 0; i < bd.suttaIds.length; i++) {
        let suid = bd.suttaIds[i];
        try {
            var sdpli = await bd.loadSegDoc({suid, lang:'pli'});
            sdpli.fillWordMap(pliWords, false);
        } catch(e) {
            logger.warn(`Cannot train`, {suid}, e.message);
        }
    }
    logger.info(`Pali words:${Object.keys(pliWords).length}`);
    
    var langs = ['de'];
    var foreignWords = {};
    langs.forEach(lang => {
        var wordsPath = path.join(__dirname, 
            `../../src/assets/words-${lang}.txt`);
        var wordList = fs.readFileSync(wordsPath).toString().toLowerCase().split('\n');
        wordList.forEach(w => foreignWords[w] = false);
        logger.info(`${lang} words:${Object.keys(foreignWords).length}`);
    });

    var langs = ['en-exceptions'];
    langs.forEach(lang => {
        var wordsPath = path.join(__dirname, 
            `../../src/assets/words-${lang}.txt`);
        var wordList = fs.readFileSync(wordsPath).toString().toLowerCase().split('\n');
        wordList.forEach(w => foreignWords[w] = false);
        logger.info(`${lang} words:${Object.keys(foreignWords).length}`);
    });

    var langs = ['en'];
    var langWords = {};
    langs.forEach(lang => {
        var wordsPath = path.join(__dirname, 
            `../../src/assets/words-${lang}.txt`);
        var wordList = fs.readFileSync(wordsPath).toString().toLowerCase().split('\n');
        wordList.forEach(w => langWords[w] = true);
        logger.info(`${lang} words:${Object.keys(langWords).length}`);
    });

    logger.info(`Training English FuzzyWordSet...`);
    var wordMap = Object.assign({}, 
        pliWords, // by default Pali words are false
        langWords,  // include Pali words used in English (e.g., 'an')
        foreignWords, // exclude foreign words used in English (e.g., 'rat' and 'blind')
    );
    var fws = new FuzzyWordSet({
        maxTrain: 50,
    });
    var iterations = fws.train(langWords);
    iterations += fws.train(wordMap);
    logger.info([
        `iterations:${iterations}`,
        `fws:${JSON.stringify(fws).length}C`,
    ].join(' '));
    var enPath = path.join(__dirname, '../../src/assets/fws-en.json');
    fs.writeFileSync(enPath, JSON.stringify(fws, null, 1));
    logger.info(`training completed: ${JSON.stringify(fws).length}C`);
} catch(e) {
    logger.warn(e.stack);
}})();
