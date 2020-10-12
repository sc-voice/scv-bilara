#!/usr/bin/node
const fs = require('fs');
const path = require('path');
const {
    Pali,
    SegDoc,
    Seeker,
    DETranslation,
    BilaraData,
    ExecGit,
} = require('../../index');
const { logger } = require('log-instance');
const { Files } = require('memo-again');

logger.info('de-suttas');

var patAllow = ".*/(AN|DN|MN|KN|SN)/.*";
var reAllow = new RegExp(patAllow);

(async function() { try {
    var wordMap = {};
    var deWordPath = path.join(Files.LOCAL_DIR, '../src/assets/words-de.txt');
    if (fs.existsSync(deWordPath)) {
        var deLines = fs.readFileSync(deWordPath).toString().split('\n');
        deLines.forEach(w => (wordMap[w.trim()] = true));
    }
    //fs.writeFileSync(deWordPath, ''); // clear out currrent file 
    var dePath = path.join(Files.LOCAL_DIR, 'de-suttas');
    var bd = await new BilaraData().initialize();
    var skr = await new Seeker().initialize();
    var paliWords = await Pali.wordSet();
    var deFiles = await bd.dirFiles(dePath);
    deFiles.forEach(f => {
        if (!reAllow.test(f)) {
            return;
        }
        logger.info(`Processing file:${f}`);
        var lines = fs.readFileSync(f).toString().split('\n');
        lines.forEach(line => {
            var words = line.toLowerCase()  
                .replace('"de":','')
                .replace(/[-–”’„‚’”!?…<>0-9—.,:;"'‚‘““{}()[\]]/ug,' ')
                .split(/ +/);
            words.forEach(w => {
                if (paliWords.contains(w) && 
                    !/[āāīūṁṃḍṅñṇḷṭ]/.test(w) &&
                    !/ti$/.test(w) &&
                    !/cc/.test(w) &&
                    !/ji/.test(w) &&
                    !/ika/.test(w) &&
                    w !== 'bhedo' &&
                    w !== 'bhikkhu' &&
                    w !== 'd' &&
                    w !== 'de' &&
                    w !== 'de_sn' &&
                    w !== 'doesn' &&
                    w !== 'dukkhe' &&
                    w !== 'ime' &&
                    w !== 'is_root' &&
                    w !== 'kho' &&
                    w !== 'me' &&
                    w !== 'he' &&
                    w !== 'nd' &&
                    w !== 'nikkhepo' &&
                    w !== 'nirodho' &&
                    w !== 'no' &&
                    w !== 'of' &&
                    w !== 'on' &&
                    w !== 'only' &&
                    w !== 'pe' &&
                    w !== 'pli' &&
                    w !== 'pure' &&
                    w !== 're' &&
                    w !== 'scid' &&
                    w !== 'section' &&
                    w !== 'side' &&
                    w !== 'snp' &&
                    w !== 't' &&
                    w !== 'te' &&
                    w !== 'there' &&
                    w !== 'title' &&
                    w !== 'uid' &&
                    w !== 'use' &&
                    w !== 've' &&
                    w !== 'vo' &&
                    w !== 'y' &&

                    w.trim() &&
                    true) {
                    wordMap[w] = true;
                }
           });
        });
    });
    fs.writeFileSync(deWordPath, Object.keys(wordMap).sort().join('\n'));
    
} catch(e) {
    logger.warn(e.stack);
}})();
