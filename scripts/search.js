#!/usr/bin/node
const fs = require('fs');
const path = require('path');
const {
    BilaraData,
    FuzzyWordSet,
    Pali,
    Seeker,
    SegDoc,
    SuttaCentralId,

} = require('../index');
const {
    js,
    logger,
    LOCAL_DIR,
} = require('just-simple').JustSimple;
const BILARA_DATA = path.join(__dirname, '../local/bilara-data');

function help() {
    console.log(`
NAME
        search.js - seach bilara-data root text and translations

SYNOPSIS
        search.js [OPTIONS] PATTERN_KEYWORDS

DESCRIPTION
        Searches bilara-data for root text or translations. Writes
        output results in JSON to stdout.

    -c, --color COLORNUMBER
        Display matches with colors. Default is 201.
        See https://misc.flogisoft.com/bash/tip_colors_and_formatting

    -d, --maxDoc NUMBER
        specify maximum number of documents to display. Default is 10.

    -l, --lang ISO_LANG_2
        Specify ISO 2-letter language code for primary translation language.
        Default is "de" for German.

    -ll, --logLevel LOGLEVEL
        Logging is normally turned off, but you can specificy a LOGLEVEL:
        debug, warn, info, error. The most useful will be "info".

    -ml, --minLang NUMBER
        Only show segments from documents having at least minLang languages. 
        Default is 3 unless lang is 'en', in which case it is 2.
`);
    process.exit(0);
}

var pattern;
var lang = 'de';
var maxDoc = 10;
var minLang = 0;
var logLevel = false;
var color = 201;

var nargs = process.argv.length;
if (nargs < 3) {
    help();
}
for (var i = 0; i < nargs; i++) {
    var arg = process.argv[i];
    if (i<2) { continue; }
    if (arg === '-?' || arg === '--help') {
        help();
    } else if (arg === '-d' || arg === '--maxDoc') {
        maxDoc = Number(process.argv[++i]);
    } else if (arg === '-ll' || arg === '--logLevel') {
        logLevel = process.argv[++i];
    } else if (arg === '-c' || arg === '--color') {
        color = Number(process.argv[++i]);
    } else if (arg === '-ml' || arg === '--minLang') {
        minLang = Number(process.argv[++i]);
    } else if (arg === '-l' || arg === '--lang') {
        lang = process.argv[++i];
    } else {
        pattern = pattern ? `${pattern} ${arg}` : arg;
    }
}
minLang = minLang || (lang === 'en' ? 2 : 3);
pattern = pattern || `wurzel des leidens`;
console.error(`search(${lang},ml${minLang},d${maxDoc}): "${pattern}"...`);

(async function() { try {
    var bd = await new BilaraData({
        logLevel,
    }).initialize();
    var skr = await new Seeker({
        lang,
        maxResults: 0,
        logLevel,
    }).initialize();

    var data = await skr.phraseSearch({ 
        pattern,
        lang,
    });
    var rex = data.lang === 'pli'
        ? new RegExp("\\b"+Pali.romanizePattern(pattern), 'uig')
        : new RegExp("\\b"+pattern, 'uig');
    var output = {
        lang,
        searchLang: data.lang,
        message: '',
        maxDoc,
        minLang,
        pattern,
        regExp: rex.toString(),
        shown: [],
        segments: [],
    };
    if (data.lines.length === 0) {
        output.data = data;
    }
    var pliRoot = path.join(BILARA_DATA, `root/${data.lang}`);
    var enRoot = path.join(BILARA_DATA, `translation/en`);
    var searchRoot = data.lang === 'pli' 
        ? pliRoot
        : path.join(BILARA_DATA, `translation/${data.lang}`);
    var files = data.lines.map(line => 
        path.join(searchRoot, line.split(':')[0]))
        .sort(SuttaCentralId.compareLow);
    var found = [];
    files.forEach(f=>{
        var suid = path.basename(f, '.json').split('_')[0];
        found.push(suid);
        var actLang = 0;
        var loadOpts = {
            suid,
            returnNull: true,
        };

        loadOpts.lang = 'pli';
        var sdpli = bd.loadSegDoc(loadOpts);
        sdpli && actLang++;

        loadOpts.lang = 'en';
        var sden = bd.loadSegDoc(loadOpts);
        sden && actLang++;

        loadOpts.lang = lang;
        sdlang = lang !== 'en' && lang !== 'pli' && bd.loadSegDoc(loadOpts);
        sdlang && actLang++;

        if (actLang < minLang) { 
            return; 
        }
        output.shown.push(suid);
        if (output.shown.length >= maxDoc) {
            return;
        }

        sdsearch = data.lang === 'pli' ? sdpli
            : data.lang === 'en' ? sden
            : sdlang;

        sdsearch.segments().forEach(seg => {
            seg.pli = sdpli.segMap[seg.scid];
            seg.en = sden.segMap[seg.scid];
            sdlang && (seg[lang] = sdlang.segMap[seg.scid]);

            if (rex.test(seg[data.lang])) {
                output.segments.push(seg);
            }
        });
    }, []);
    if (output.shown.length === 0) {
        output.message = `All ${found.length} documents found `+
            `have less than ${minLang} languages: `+
            `${found.join(', ')}`;
    } else if (output.shown.length < maxDoc) {
        output.message = `Found ${output.shown.length} document(s) `+
            `with at least ${minLang} languages`;
    } else {
        output.message = `Showing ${maxDoc}/${found.length} documents`;
    }
    var outText = JSON.stringify(output, null, 2);
    if (color) {
        outText = outText.replace(rex, 
            `\u001b[38;5;${color}m$&\u001b[0m`);
    }
    console.log(outText);
} catch(e) { logger.warn(e.stack); }})();
