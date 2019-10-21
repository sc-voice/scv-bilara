#!/usr/bin/node
const fs = require('fs');
const path = require('path');
const {
    BilaraData,
    FuzzyWordSet,
    Pali,
    Seeker,
    SegDoc,

} = require('../index');
const {
    js,
    logger,
    LOCAL_DIR,
} = require('just-simple').JustSimple;
const logLevel = false;
const BILARA_DATA = path.join(__dirname, '../local/bilara-data');

var pattern;
var lang = 'de';
var maxResults = 5;
for (var i = 0; i < process.argv.length; i++) {
    var arg = process.argv[i];
    if (i<2) { continue; }
    pattern = pattern ? `${pattern} ${arg}` : arg;
}
pattern = pattern || `wurzel des leidens`;
logger.info(`search(${lang}): "${pattern}"...`);

(async function() { try {
    var bd = await new BilaraData({
        logLevel,
    }).initialize();
    var skr = await new Seeker({
        lang,
        maxResults,
        logLevel,
    }).initialize();

    var data = await skr.phraseSearch({ 
        pattern,
        lang,
    });
    logger.info(`found ${data.lines.length} file(s)`);
    if (data.lines.length === 0) {
        console.log(JSON.stringify(data, null, 2));
    }
    var pliRoot = path.join(BILARA_DATA, `root/${data.lang}`);
    var enRoot = path.join(BILARA_DATA, `translation/en`);
    var searchRoot = data.lang === 'pli' 
        ? pliRoot
        : path.join(BILARA_DATA, `translation/${data.lang}`);
    var files = data.lines.map(line => 
        path.join(searchRoot, line.split(':')[0]));
    var rex = data.lang === 'pli'
        ? new RegExp(Pali.romanizePattern(pattern), 'ui')
        : new RegExp(pattern, 'ui');
    files.forEach(f=>{
        var suid = path.basename(f, '.json').split('_')[0];
        var sdpli = bd.loadSegDoc({
            suid,
            lang: 'pli',
        });
        var sden = bd.loadSegDoc({
            suid,
            lang: 'en',
        });
        try {
            var sdlang = bd.loadSegDoc({
                suid,
                lang,
            });
        } catch(e) {
            var sdlang = null;
        }

        sdsearch = data.lang === 'pli' ? sdpli
            : data.lang === 'en' ? sden
            : sdlang;

        sdsearch.segments().forEach(seg => {
            if (!rex.test(seg[data.lang])) {return;}
            seg.pli = sdpli.segMap[seg.scid];
            seg.en = sden.segMap[seg.scid];
            sdlang && (seg[lang] = sdlang.segMap[seg.scid]);
            console.log(seg);
        });
    }, []);
} catch(e) { logger.warn(e.stack); }})();
