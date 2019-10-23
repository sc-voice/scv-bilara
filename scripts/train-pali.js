#!/usr/bin/node
const fs = require('fs');
const path = require('path');
const {
    BilaraData,
    FuzzyWordSet,
    SegDoc,

} = require('../index');
const {
    js,
    logger,
    LOCAL_DIR,
} = require('just-simple').JustSimple;


(async function() { try {
    logger.info('train-pali.js initializing...');

    var langs = ['en','de'];
    var langWords = {};
    langs.forEach(lang => {
        var wordsPath = path.join(__dirname, `../src/assets/words-${lang}.txt`);
        var wordList = fs.readFileSync(wordsPath).toString().split('\n');
        wordList.forEach(w => langWords[w] = false);
        logger.info(`${lang} words:${Object.keys(langWords).length}`);
    });

    var bd = await new BilaraData({
        logLevel: false,
    }).initialize();
    var pliWords = {};
    bd.suttaIds.forEach(suid => {
        var sdpli = await bd.loadSegDoc({suid, lang:'pli'});
        sdpli.fillWordMap(pliWords, true);
    });
    pliWords.an = false, // SuttaCentral abbreviation
    pliWords.mn = false, // SuttaCentral abbreviation
    pliWords.sn = false, // SuttaCentral abbreviation
    pliWords.kn = false, // SuttaCentral abbreviation
    pliWords.dn = false, // SuttaCentral abbreviation
    pliWords.thig = false, // SuttaCentral abbreviation
    pliWords.thag = false, // SuttaCentral abbreviation
    logger.info(`Pali words:${Object.keys(pliWords).length}`);
    
    var wordMap = Object.assign({}, langWords, pliWords);

    logger.info(`Training Pali FuzzyWordSet...`);
    var fws = new FuzzyWordSet({
        maxTrain: 50,
    });
    var iterations = fws.train(wordMap, true);
    logger.info([
        `iterations:${iterations}`,
        `fws:${JSON.stringify(fws).length}C`,
    ].join(' '));
    var paliPath = path.join(__dirname, '../src/assets/fws-pali.json');
    fs.writeFileSync(paliPath, JSON.stringify(fws, null, 1));
    logger.info(`training completed: ${JSON.stringify(fws).length}C`);
} catch(e) {
    logger.warn(e.stack);
}})();
