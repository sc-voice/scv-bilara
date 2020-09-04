#!/usr/bin/env node
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
const { js, LOCAL_DIR, } = require('just-simple').JustSimple;
const { logger } = require('log-instance');

logger.info('de-suttas');

var patAllow = ".*/(AN|DN|MN|KN|SN)/.*";
var reAllow = new RegExp(patAllow,"ui");

function writeTags({files, tagPath}) {
    var wordMap = {};
    files.forEach(f => {
        if (!fs.existsSync(f) || !reAllow.test(f)) {
            logger.info(`Rejecting file:${f}`);
            return;
        }
        var suid = f.split('/').pop().split('_')[0];
        logger.info(`Processing suid:${suid} file:${f}`);
        var json = JSON.parse(fs.readFileSync(f).toString());
        var lines = Object.keys(json).map(k=>json[k]);
        var suttaMap = {};
        lines.forEach(line => {
            var words = line.toLowerCase()  
                .replace(/[-–”’„‚’”!?…<>0-9—.,:;"'‚‘““{}()[\]]/ug,' ')
                .split(/ +/);
            words.forEach(w => {
                if (!suttaMap[w]) {
                    wordMap[w] = wordMap[w] || [];
                    wordMap[w].push(suid);
                    suttaMap[w] = true;
                }
           });
        });
    });
    fs.writeFileSync(tagPath, JSON.stringify(wordMap, null, "  "));
    logger.info(`wrote ${tagPath}`);
    return wordMap;
}

(async function() { try {
    var lang = 'en';
    var tagDir = path.join(LOCAL_DIR, 'tags');
    var tagPath = path.join(tagDir, `tags_${lang}.json`);
    if (fs.existsSync(tagPath)) {
        var wordMap = JSON.parse(fs.readFileSync(tagPath).toString());
    } else {
        if (!fs.existsSync(tagDir)) {
            fs.mkdirSync(tagDir);
        }
        var suttaRoot = path.join(LOCAL_DIR, 
            'bilara-data/translation/en/sujato/sutta');
        var bd = await new BilaraData().initialize();
        var files = await bd.dirFiles(suttaRoot);
        var wordMap = writeTags({
            files, 
            tagPath,
        });
    }
    var wordUsage = Object.keys(wordMap).reduce((a,w) => {
        var len = wordMap[w].length;
        a[len] = (a[len]||0) + 1;
        return a;
    }, {});
} catch(e) {
    logger.warn(e.stack);
}})();
