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

logger.info('train-pali.js');

function suttaWordMap(bd, suid, wordMap) {
    var wordMap = {};
    return wordMap;
}

(async function() { try {
    var bd = await new BilaraData({
        logLevel: false,
    }).initialize();
    var paliEnPath = path.join(__dirname, '../src/assets/fws-pali-en.json');
    var paliEnJson = JSON.parse(fs.readFileSync(paliEnPath));
    var paliPath = path.join(__dirname, '../src/assets/fws-pali.json');
    var fws = new FuzzyWordSet();
    var enWords = {};
    bd.suttaIds.forEach(suid => {
        var sden = bd.loadSegDoc({suid, lang:'en'});
        sden.fillWordMap(enWords, false);
    });
    logger.info(`English enWords:${JSON.stringify(enWords).length}`);
    logger.info(`English enWords.ananda:${enWords.ananda} ${enWords['ānanda']}`);

    var pliWords = Object.assign({}, paliEnJson.states);
    bd.suttaIds.forEach(suid => {
        var sdpli = bd.loadSegDoc({suid, lang:'pli'});
        sdpli.fillWordMap(pliWords, true);
    });
    logger.info(`Pali pliWords:${JSON.stringify(pliWords).length}`);
    logger.info(`Pali pliWords.ananda:${pliWords.ananda} ${pliWords['ānanda']}`);
    
    // Some english words appear in root text
    var enExceptions = {
        an: false, // English acronym for Anguttara Nikaya
    };
    var wordMap = Object.assign({}, enWords, pliWords, enExceptions);
    fs.writeFileSync('/tmp/foo.json', JSON.stringify(wordMap, null, 2));
    var iterations = fws.train(wordMap, true);
    logger.info([
        `wordMap[ananda]:${wordMap.ananda} ${wordMap['ānanda']}`,
        `iterations:${iterations}`,
        `fws:${JSON.stringify(fws).length}`,
    ].join(' '));
    fs.writeFileSync(paliPath, JSON.stringify(fws, null, 2));
    logger.info(`training completed: ${JSON.stringify(fws).length}`);
} catch(e) {
    logger.warn(e.stack);
}})();
