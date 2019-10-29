#!/usr/bin/env node
const {
    js,
    logger,
    LOCAL_DIR,
} = require('just-simple').JustSimple;
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
const BILARA_DATA = path.join(__dirname, '../local/bilara-data');

function help() {
    console.log(`
NAME
        search.js - seach bilara-data root text and translations

SYNOPSIS
        search.js [OPTIONS] PATTERN_KEYWORDS

DESCRIPTION
        Searches bilara-data for root text or translations. Writes
        output results in JSON to stdout, highlighting matches if
        output is console.

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

    -oh, --outHuman
        Output human format (default).

    -oc, --outCSV
        Output comma-separated values.

    -oj, --outJSON
        Output JSON 

    -ol, --outLegacy
        Output legacy format. (DEPRECATED)

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
var outFormat = 'human';

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
    } else if (arg === '-oj' || arg === '--outJSON') {
        outFormat = 'json';
    } else if (arg === '-oh' || arg === '--outHuman') {
        outFormat = 'human';
    } else if (arg === '-ol' || arg === '--outLegacy') {
        outFormat = 'legacy';
    } else if (arg === '-oc' || arg === '--outCSV') {
        outFormat = 'csv';
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
const matchBash = `\u001b[38;5;${color}m$&\u001b[0m`;

function outCSV(res) {
    var {
        mlDocs,
    } = res;
    console.log(`scid,lang,text`);
    mlDocs.forEach(mld => {
        mld.segments().forEach(seg => {
            var scid = seg.scid;
            Object.keys(seg).forEach(k => {
                if (k === 'scid') { return; }
                console.log([
                    `"${scid}"`, 
                    `"${k}"`,
                    `"${seg[k]}"`, 
                ].join(','));
            });
        });
    });
}

function outJSON(res) {
    var {
        resultPattern,
    } = res;
    var text = JSON.stringify(res, null, 2);
    console.log(`dbg `, process.stdout.isTTY);
    if (process.stdout.isTTY) {
        var rex = new RegExp(resultPattern, "giu");
        text = text.replace(rex, matchBash);
    }
    console.log(text);
}

function outHuman(res, pattern) {
    var {
        mlDocs,
    } = res;
    var refs = res.suttaRefs.map(s=>s.split('/')[0]).join(',');
    console.log(
`pattern      : "${pattern}" (${res.resultPattern})
languages    : translation:${lang} search:${res.searchLang} minLang:${res.minLang}
date         : ${new Date().toLocaleString()}
output       : ${outFormat} color:${color}
found        : ${res.method} in ${refs}; maxResults:${maxDoc}
`);
    mlDocs.forEach(mld => {
        mld.segments().forEach((seg,i) => {
            var scid = seg.scid;
            var sep = '-------------------------------';
            var suid = scid.split(':')[0];
            i===0 && console.log(
                `${sep} ${suid} ${sep}`);
            Object.keys(seg).forEach(k => {
                var key = `    ${k}`;
                key = key.substring(key.length-4);
                console.log(`${key}: ${seg[k]}`);
            });
        });
    });
}

(async function() { try {
    var bd = await new BilaraData({
        logLevel,
    }).initialize();
    if (outFormat === 'legacy') {
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
        for (var iFile = 0; iFile < files.length; iFile++) {
            var f = files[iFile];
            var suid = path.basename(f, '.json').split('_')[0];
            found.push(suid);
            var actLang = 0;
            var loadOpts = {
                suid,
                returnNull: true,
            };

            loadOpts.lang = 'pli';
            var sdpli = await bd.loadSegDoc(loadOpts);
            sdpli && actLang++;

            loadOpts.lang = 'en';
            var sden = await bd.loadSegDoc(loadOpts);
            sden && actLang++;

            loadOpts.lang = lang;
            sdlang = lang !== 'en' && lang !== 'pli' && 
                await bd.loadSegDoc(loadOpts);
            sdlang && actLang++;

            if (actLang < minLang) { 
                continue; 
            }
            output.shown.push(suid);
            if (output.shown.length >= maxDoc) {
                continue;
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
        }
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
    } else {
        var skr = await new Seeker({
            matchColor: color,
            maxResults: maxDoc,
            logLevel,
        }).initialize();
        var matchHighlight = process.stdout.isTTY && outFormat!=='json'
            ? matchBash : `$&`;
        var res = await skr.find({
            pattern,
            matchHighlight,
            lang,
        });
        if (outFormat === 'csv') {
            outCSV(res);
        } else if (outFormat === 'json') {
            outJSON(res);
        } else {
            outHuman(res, pattern);
        }
    }
} catch(e) { logger.warn(e.stack); }})();
