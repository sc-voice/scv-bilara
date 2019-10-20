#!/usr/bin/node
const fs = require('fs');
const path = require('path');
const {
    SegDoc,
    Seeker,
    DETranslation,
    BilaraData,
    ExecGit,
} = require('../index');
const {
    js,
    logger,
    LOCAL_DIR,
} = require('just-simple').JustSimple;

logger.info('de-suttas.js');

var patAllow = ".*/(AN|DN|MN|KN|SN)/.*";
var reAllow = new RegExp(patAllow);

(async function() { try {
    var bd = await new BilaraData().initialize();
    var skr = await new Seeker().initialize();
    var dePath = path.join(LOCAL_DIR, 'de-suttas');
    var wordMap = {};
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
                if (bd.paliWords.contains(w) && 
                    !/[āāīūṁṃḍṅñṇḷṭ]/.test(w) &&
                    !/ti$/.test(w) &&
                    !/cc/.test(w) &&
                    !/ji/.test(w) &&
                    !/ika/.test(w) &&
                    w !== 'pe' &&
                    w !== 'vo' &&
                    w !== 'y' &&
                    w !== 'bhikkhu' &&
                    w !== 'de' &&
                    w !== 'me' &&
                    w !== 'nd' &&
                    w !== 'no' &&
                    w !== 'of' &&
                    w !== 'on' &&
                    w !== 're' &&
                    w !== 'scid' &&
                    w !== 'side' &&
                    w !== 't' &&
                    w !== 'use' &&
                    w !== 've' &&
                    w !== 'de_sn' &&
                    w !== 'd' &&
                    w !== 'doesn' &&
                    w !== 'dukkhe' &&
                    w !== 'is_root' &&
                    w !== 'kho' &&
                    w !== 'ime' &&
                    w.trim() &&
                    true) {
                    wordMap[w] = true;
                }
           });
        });
    });
    var deWordPath = path.join(LOCAL_DIR, '../src/assets/words-de.txt');
    fs.writeFileSync(deWordPath, Object.keys(wordMap).sort().join('\n'));
    
} catch(e) {
    logger.warn(e.stack);
}})();
