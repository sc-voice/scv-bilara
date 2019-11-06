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
    BilaraPath,
    FuzzyWordSet,
    Pali,
    Seeker,
    SegDoc,
    SuttaCentralId,

} = require('../../index');
const LOCAL = path.join(__dirname, '../../local');
const BILARA_DATA = path.join(LOCAL, '/bilara-data');

function help() {
    console.log(`
NAME
        search - search bilara-data root text and translations

SYNOPSIS
        search [OPTIONS] PATTERN_KEYWORDS

DESCRIPTION
        Searches bilara-data for root text or translations. Writes
        output results in JSON to stdout, highlighting matches if
        output is console.

    -c, --color COLORNUMBER
        Display matches with colors. The default color is 201.
        Use "--color auto" to remove color when stdout is not a console.
        Use "--color none" to remove color.
        See https://misc.flogisoft.com/bash/tip_colors_and_formatting

    -d, --maxDoc NUMBER
        specify maximum number of documents to display. Default is 10.

    -f, --filter MODE
        Filter segments according to mode: "pattern", "none".
        If mode is "pattern", then only segments matching pattern
        will be shown. If mode is "none", segments will not be filtered.

    -l, --lang ISO_LANG_2
        Specify ISO 2-letter language code for primary translation language.
        Default is "en" for English.

    -ll, --logLevel LOGLEVEL
        Logging is normally turned off, but you can specificy a LOGLEVEL:
        debug, warn, info, error. The most useful will be "info".

    -ml, --minLang NUMBER
        Only show segments from documents having at least minLang languages. 
        Default is 3 unless the pattern language is 'en', in which case 
        it is 2.

    -mr, --maxResults NUMBER
        Maximum number of grep result files to work with (default 1000).

    -oc, --outCSV
        Output comma-separated values.

    -oj, --outJSON
        Output JSON 

    -oh, --outHuman
        Output human format (default).

    -om, --outMarkdown
        Output translation for matching segments, formatted with Markdown.

    -om2, --outMarkdown2
        Output Pali and translation for matching segments, formatted with Markdown.

    -ol, --outLines
        Output matching lines only.

    -op, --outPaths
        Output file paths of matching suttas

    -ot, --outTrans
        Output translation only for matching segments.

    --outLegacy
        Output legacy format. (NO LONGER SUPPORTED)
`);
    process.exit(0);
}

var pattern;
var lang = 'en';
var maxDoc = 10;
var maxResults = 1000;
var minLang = 0;
var logLevel = false;
var color = 201;
var outFormat = 'human';
var filterSegments = true;
var isTTY = process.stdout.isTTY;

var nargs = process.argv.length;
if (nargs < 3) {
    help();
}
for (var i = 2; i < nargs; i++) {
    var arg = process.argv[i];
    if (i<2) { continue; }
    if (arg === '-?' || arg === '--help') {
        help();
    } else if (arg === '-d' || arg === '--maxDoc') {
        maxDoc = Number(process.argv[++i]);
    } else if (arg === '-ll' || arg === '--logLevel') {
        logLevel = process.argv[++i];
    } else if (arg === '-f' || arg === '--filter') {
        var filter  = process.argv[++i];
        filterSegments = filter === 'pattern';
    } else if (arg === '-c' || arg === '--color') {
        color = process.argv[++i];
    } else if (arg === '-oj' || arg === '--outJSON') {
        outFormat = 'json';
    } else if (arg === '-om' || arg === '--outMarkdown') {
        outFormat = 'markdown';
    } else if (arg === '-om2' || arg === '--outMarkdown2') {
        outFormat = 'markdown2';
    } else if (arg === '-ot' || arg === '--outTrans') {
        outFormat = 'trans';
    } else if (arg === '-ol' || arg === '--outLines') {
        outFormat = 'lines';
    } else if (arg === '-op' || arg === '--outPaths') {
        outFormat = 'paths';
    } else if (arg === '-oh' || arg === '--outHuman') {
        outFormat = 'human';
    } else if (arg === '--outLegacy') {
        outFormat = 'legacy';
        help();
    } else if (arg === '-oc' || arg === '--outCSV') {
        outFormat = 'csv';
    } else if (arg === '-mr' || arg === '--maxResults') {
        maxResults = Number(process.argv[++i]);
    } else if (arg === '-ml' || arg === '--minLang') {
        minLang = Number(process.argv[++i]);
        console.error(`minLang:${minLang}`);
    } else if (arg === '-l' || arg === '--lang') {
        lang = process.argv[++i];
    } else {
        pattern = pattern ? `${pattern} ${arg}` : arg;
    }
}

pattern = pattern || `wurzel des leidens`;
function matchBash(color) {
    if (color === 'none' || 
        color==='auto' && (isTTY || outFormat==='json')) {
        return `$&`
    }
    if (color === 'auto') {
        return `\u001b[38;5;201m$&\u001b[0m`
    }
    var c = Number(color);
    return `\u001b[38;5;${c}m$&\u001b[0m`
}

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
    if (color !== 'none' && (isTTY || color !== 'auto')) {
        var rex = new RegExp(resultPattern, "giu");
        text = text.replace(rex, matchBash(color));
    }
    console.log(text);
}

function outHuman(res, pattern) {
    var {
        mlDocs,
        suttaRefs,
        elapsed,
        method,
    } = res;
    var refs = res.suttaRefs.map(s=>s.split('/')[0])
        .sort(SuttaCentralId.compareLow)
        .join(',');
    var nRefs = res.suttaRefs.length;
    var nDocs = mlDocs.length;
    console.log(
`pattern      : "${pattern}" grep:${res.resultPattern}
languages    : translation:${lang} search:${res.searchLang} minLang:${res.minLang}
output       : ${outFormat} color:${color} elapsed:${elapsed} seconds
found        : ${method} in ${nDocs}/${nRefs} documents ${refs}; maxDoc:${maxDoc} maxResults:${maxResults}`);
    mlDocs.forEach((mld,im) => {
        var suid = mld.suid;
        mld.segments().forEach((seg,i) => {
            var scid = seg.scid;
            var sep = '-------------------------------';
            i===0 && console.log(
                `${sep} [${im+1}/${mlDocs.length}] ${suid} ${sep}`);
            Object.keys(seg).forEach(k => {
                var key = `    ${k}`;
                key = key.substring(key.length-4);
                console.log(`${key}: ${seg[k]}`);
            });
        });
    });
}

function outPaths(res, pattern) {
    res.bilaraPaths.forEach(p => {
        console.log(path.join(BILARA_DATA, p));
    });
}

function outLines(res, pattern) {
    res.mlDocs.forEach(mld => {
        var suid = mld.suid;
        mld.segments().forEach((seg,i) => {
            var scid = seg.scid;
            var text = seg[res.searchLang] || '';
            var line = `${scid}: ${text}`;
            console.log(line);
        });
    });
}

function outMarkdown(res, pattern, nLang=1) {
    res.mlDocs.forEach(mld => {
        var suid = mld.suid;
        mld.segments().forEach((seg,i) => {
            var scid = seg.scid;
            var text = (seg[res.lang] || '').trim();
            var linkText = suid;
            var link = `https://suttacentral.net/${suid}/en/sujato#${scid}`;
            if (nLang > 1) {
                console.log(`> [${linkText}](${link}): ${seg.pli}`);
            }
            text && console.log(`> [${linkText}](${link}): ${text}`);
        });
    });
}

function outTrans(res, pattern) {
    res.mlDocs.forEach(mld => {
        var suid = mld.suid;
        mld.segments().forEach((seg,i) => {
            var scid = seg.scid;
            var text = (seg[res.lang] || '').trim();
            if (i === 0) {
                console.log(`--- [${suid}](https://suttacentral.net/${suid}) ---`);
            }
            text && console.log(text);
        });
    });
}

function write_editor(res, args, editor) {
    var searchPaths = res.bilaraPaths.filter(p => 
        BilaraPath.pathParts(p).lang === res.searchLang
    )
    .map(p => path.join(BILARA_DATA, p));
    script = [
        args,
        ...searchPaths,
    ].join(' ');
    var epath = path.join(LOCAL, `bilara_edit.${editor}`);
    fs.writeFileSync(epath, script);
}

function scriptEditor(res, pattern) {
    write_editor(res, '', 'subl');

    var vipat = res.resultPattern
        .replace(/\\b/, '\\<')
        .replace(/[|()]/g,'\\$&');
    write_editor(res, `'+/${vipat}'`, 'vi');
}

(async function() { try {
    var bd = await new BilaraData({
        logLevel,
    }).initialize();

    if (outFormat === 'legacy') {
        minLang = minLang || (lang === 'en' ? 2 : 3);
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
            maxResults,
            maxDoc,
            logLevel,
        }).initialize();
        var patLang = skr.patternLanguage(pattern, lang);
        minLang = minLang || (lang === 'en' || patLang === 'en' ? 2 : 3);
        var matchHighlight = matchBash(color);
        var res = await skr.find({
            pattern,
            matchHighlight,
            filterSegments,
            minLang,
            lang,
        });
        if (outFormat === 'csv') {
            outCSV(res, pattern);
        } else if (outFormat === 'json') {
            outJSON(res, pattern);
        } else if (outFormat === 'paths') {
            outPaths(res, pattern);
        } else if (outFormat === 'lines') {
            outLines(res, pattern);
        } else if (outFormat === 'markdown') {
            outMarkdown(res, pattern, 1);
        } else if (outFormat === 'markdown2') {
            outMarkdown(res, pattern, 2);
        } else if (outFormat === 'trans') {
            outTrans(res, pattern);
        } else {
            outHuman(res, pattern);
        }
        scriptEditor(res, pattern);
    }
} catch(e) { logger.warn(e.stack); }})();
