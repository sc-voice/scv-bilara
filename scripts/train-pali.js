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
    var bd = await new BilaraData({
        logLevel: false,
    }).initialize();
    logger.info(`Scanning English translations for words`);
    var enWords = {};
    bd.suttaIds.forEach(suid => {
        var sden = bd.loadSegDoc({suid, lang:'en'});
        sden.fillWordMap(enWords, false);
    });
    logger.info(`English words:${Object.keys(enWords).length}`);

    var pliWords = {};
    bd.suttaIds.forEach(suid => {
        var sdpli = bd.loadSegDoc({suid, lang:'pli'});
        sdpli.fillWordMap(pliWords, true);
    });
    logger.info(`Pali words:${Object.keys(pliWords).length}`);
    
    // Some english words appear in root text
    var enExceptions = {
        an: false, // English acronym for Anguttara Nikaya
    };
    var wordMap = Object.assign({}, enWords, pliWords, enExceptions);

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
    fs.writeFileSync(paliPath, JSON.stringify(fws, null, 2));
    logger.info(`training completed: ${JSON.stringify(fws).length}C`);
} catch(e) {
    logger.warn(e.stack);
}})();
