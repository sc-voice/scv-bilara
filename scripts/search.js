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

function help() {
    console.log(`
NAME
        search.js - seach bilara-data root text and translations

SYNOPSIS
        search.js [OPTIONS] PATTERN_KEYWORDS

DESCRIPTION
    -l, --lang ISO_LANG_2
        Specify ISO 2-letter language code for primary translation language.
        Default is "de" for German.

    -ml, --minLang NUMBER
        Filters results to segments with at least 'minLang' languages.
        By default, minLang is set to 2, requiring at least two languages 
        to be present in any segment shown.
`);
    process.exit(0);
}

var pattern;
var lang = 'de';
var maxResults = 5;
var minLang = 2;

var nargs = process.argv.length;
if (nargs < 3) {
    help();
}
for (var i = 0; i < nargs; i++) {
    var arg = process.argv[i];
    if (i<2) { continue; }
    if (arg === '-?' || arg === '--help') {
        help();
    } else if (arg === '-ml' || arg === '--minLang') {
        minLang = Number(process.argv[++i]);
    } else if (arg === '-l' || arg === '--lang') {
        lang = process.argv[++i];
    } else {
        pattern = pattern ? `${pattern} ${arg}` : arg;
    }
}
pattern = pattern || `wurzel des leidens`;
logger.info(`search(${lang},ml${minLang}): "${pattern}"...`);

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
        try {
            var sdpli = bd.loadSegDoc({
                suid,
                lang: 'pli',
            });
        } catch(e) {
            var sdpli = null;
        }
        try {
            var sden = bd.loadSegDoc({
                suid,
                lang: 'en',
            });
        } catch(e) {
            var sden = null;
        }
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
            seg.pli = sdpli.segMap[seg.scid];
            seg.en = sden.segMap[seg.scid];
            sdlang && (seg[lang] = sdlang.segMap[seg.scid]);

            var actLang = [];
            seg.pli && actLang.push('pli');
            seg.en && actLang.push('en');
            lang !== 'en' && seg[lang] && actLang.push(lang);

            if (rex.test(seg[data.lang])) {
                if (actLang.length >= minLang) {
                    console.log(seg);
                } else {
                    console.log(`${seg.scid} matched ${actLang}`);
                }
            }
        });
    }, []);
} catch(e) { logger.warn(e.stack); }})();
