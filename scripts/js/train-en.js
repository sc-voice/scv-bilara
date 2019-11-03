#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const {
    BilaraData,
    FuzzyWordSet,
    SegDoc,
    ExecGit,

} = require('../../index');
const {
    js,
    logger,
    LOCAL_DIR,
} = require('just-simple').JustSimple;


(async function() { try {
    logger.info('train-en initializing...');

    var bd = await new BilaraData({
        logLevel: false,
    }).initialize();
    var pliWords = {};
    for (var i = 0; i < bd.suttaIds.length; i++) {
        suid = bd.suttaIds[i];
        var sdpli = await bd.loadSegDoc({suid, lang:'pli'});
        sdpli.fillWordMap(pliWords, false);
    }
    logger.info(`Pali words:${Object.keys(pliWords).length}`);
    
    var langs = ['de'];
    var foreignWords = {};
    langs.forEach(lang => {
        var wordsPath = path.join(__dirname, 
            `../../src/assets/words-${lang}.txt`);
        var wordList = fs.readFileSync(wordsPath).toString().split('\n');
        wordList.forEach(w => foreignWords[w] = false);
        logger.info(`${lang} words:${Object.keys(foreignWords).length}`);
    });

    var langs = ['en'];
    var langWords = {};
    langs.forEach(lang => {
        var wordsPath = path.join(__dirname, 
            `../../src/assets/words-${lang}.txt`);
        var wordList = fs.readFileSync(wordsPath).toString().split('\n');
        wordList.forEach(w => langWords[w] = true);
        logger.info(`${lang} words:${Object.keys(langWords).length}`);
    });

    logger.info(`Training English FuzzyWordSet...`);
    var wordMap = Object.assign({}, pliWords, foreignWords, langWords);
    var fws = new FuzzyWordSet({
        maxTrain: 50,
    });
    var iterations = fws.train(wordMap, true);
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
