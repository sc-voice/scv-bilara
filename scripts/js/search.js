#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { logger } = require('log-instance');
const {
    BilaraData,
    BilaraPath,
    English,
    ExecGitMock,
    FuzzyWordSet,
    Pali,
    Seeker,
    SegDoc,
    SuttaCentralId,
    Verse,

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

    -b0, --break0
        By default, verse grouped lines are joined separated by a single space.

    -b1, --break1
        Separate verse grouped lines by two spaces followed by a newline. In
        Markdown blockquotes, each line will stand alone.

    -c, --color COLORNUMBER
        Display matches with colors. The default color is 201.
        Use "--color auto" to remove color when stdout is not a console.
        Use "--color none" to remove color.
        See https://misc.flogisoft.com/bash/tip_colors_and_formatting

    -d, --maxDoc NUMBER
        specify maximum number of documents to display. Default is 50.

    -f, --filter MODE
        Filter segments according to mode: "pattern", "none".
        If mode is "pattern", then only segments matching pattern
        will be shown. If mode is "none", segments will not be filtered.

    --gitMock 
        Ignore all git operations. This option is for containers with fixed content.

    -gb BRANCH, --gitBranch BRANCH
        Choose git branch for bilara-data. Default is "unpublished".

    -l, --lang ISO_LANG_2
        Specify ISO 2-letter language code for primary translation language.
        Default is "en" for English.

    -ll, --logLevel LOGLEVEL
        Logging is normally turned off, but you can specificy a LOGLEVEL:
        debug, warn, info, error. The most useful will be "info".
        The default is "warn".

    -ml, --minLang NUMBER
        Only show segments from documents with at least minLang languages. 
        Default is 3 unless the pattern language is 'en', in which case 
        it is 2.

    -mr, --maxResults NUMBER
        Maximum number of grep result files to work with (default 1000).

    -nm, --no-memo
        Don't use memoizer cache (slow search for new content)

    -oc, --outCSV
        Output comma-separated values.

    -oj, --outJSON
        Output JSON 

    -oh, --outHuman
        Output human format (default).

    -oh1, --outHuman1
        Output human format in translation language.

    -oh2, --outHuman2
        Output human format in Pali and translation language.

    -oh3, --outHuman3
        Output human format in Pali, English and translation language.

    -ol, --outLines
        Output lines only.

    -ol1
        Output translation lines only.

    -ol2 
        Output matching lines as well as the corresponding translation or root text.

    -ol3 
        Output trilingual lines.

    -om, --outMarkdown
        Output Markdown for matching segments. Default.

    -om1, --outMarkdown1
        Output translation for matching segments, formatted with Markdown.

    -om2, --outMarkdown2
        Output Pali and translation for matching segments, formatted with Markdown.

    -om3, --outMarkdown3
        Output matching segments, formatted with tri-lingual Markdown.

    -op, --outPaths
        Output file paths of matching suttas

    -os, --outScore
        Output sutta references and score

    -ot, --outTrans
        Output translation only for matching segments.

    -ov, --outVerse
        Output text by verse (vs. by line)

    -ov1, --outVerse1
        Output matching monoligual translation verses (e.g., English)

    -ov2, --outVerse2 
        Output matching bilingual verses (e.g., Pali, English)

    -ov3, --outVerse3 
        Output matching trilingual verses (e.g., Pali, English, German)

    --outLegacy
        Output legacy format. (NO LONGER SUPPORTED)

    -sl, --searchLang ISO_LANG_2
        Specify ISO 2-letter language code for language to search.
        Default is determined from pattern language.

    -sy, --sync
        Fetch the latest bilara-data

    -up, --unpublished
        Search unpublished documents in current branch

    -tc:CATEGORIES
        Restrict searches to listed categories. For example, "-tc:bi,pj"
        will search for information in the Bhikkhuni Pārājika.
        To see only suttas, use "-tc:sutta" or "-tc:su"

`);
    process.exit(0);
}

var pattern;
var maxResults = 1000;
var logLevel = 'warn';
var color = 201;
var outFormat = 'human';
var showMatchesOnly = true;
var includeUnpublished = false;
var isTTY = process.stdout.isTTY;
var tipitakaCategories = '';
var verbose = false;
var readFile = true;
var sync = undefined;
var execGit = undefined;
var groupBy = 'line';
var linebreak = ' ';
var branch = 'unpublished';

//var searchLang;

var nargs = process.argv.length;
if (nargs < 3) {
    help();
}
for (var i = 2; i < nargs; i++) {
    var arg = process.argv[i];
    if (i<2) { continue; }
    if (arg === '-?' || arg === '--help') {
        help();
    } else if (arg === '-b0' || arg === '--break0') {
        linebreak = ' ';
    } else if (arg === '-b1' || arg === '--break1') {
        linebreak = '  \n';
    } else if (arg === '-ll' || arg === '--logLevel') {
        logLevel = process.argv[++i];
    } else if (arg === '-f' || arg === '--filter') {
        var filter  = process.argv[++i];
        showMatchesOnly = filter === 'pattern';
    } else if (arg === '-sy' || arg === '--sync') {
        sync = true;
    } else if (arg === '-gb' || arg === '--gitBranch') {
        branch = process.argv[++i];
    } else if (arg === '-nm' || arg === '--no-memo') {
        readFile  = false;
    } else if (arg === '-c' || arg === '--color') {
        color = process.argv[++i];
    } else if (arg === '--gitMock') {
        execGit = new ExecGitMock();
    } else if (arg === '-ov' || arg === '--outVerse') {
        groupBy = 'verse';
        outFormat = 'verse';
        showMatchesOnly = false;
    } else if (arg === '-ov1' || arg === '--outVerse1') {
        groupBy = 'verse1';
        outFormat = 'verse';
        showMatchesOnly = false;
    } else if (arg === '-ov2' || arg === '--outVerse2') {
        groupBy = 'verse2';
        outFormat = 'verse';
        showMatchesOnly = false;
    } else if (arg === '-ov3' || arg === '--outVerse3') {
        groupBy = 'verse3';
        outFormat = 'verse';
        showMatchesOnly = false;
    } else if (arg === '-os' || arg === '--outScore') {
        outFormat = 'score';
    } else if (arg === '-oj' || arg === '--outJSON') {
        outFormat = 'json';
    } else if (arg === '-om' || arg === '--outMarkdown') {
        outFormat = 'markdown';
    } else if (arg === '-om1' || arg === '--outMarkdown1') {
        outFormat = 'markdown1';
    } else if (arg === '-om2' || arg === '--outMarkdown2') {
        outFormat = 'markdown2';
    } else if (arg === '-om3' || arg === '--outMarkdown3') {
        outFormat = 'markdown3';
    } else if (arg === '-ot' || arg === '--outTrans') {
        outFormat = 'trans';
    } else if (arg === '-ol' || arg === '--outLines') {
        outFormat = 'lines';
    } else if (arg === '-ol1') {
        outFormat = 'lines1';
    } else if (arg === '-ol2') {
        outFormat = 'lines2';
    } else if (arg === '-ol3') {
        outFormat = 'lines3';
    } else if (arg === '-op' || arg === '--outPaths') {
        outFormat = 'paths';
    } else if (arg === '-oh' || arg === '--outHuman') {
        outFormat = 'human';
    } else if (arg === '-oh1' || arg === '--outHuman1') {
        outFormat = 'human1';
    } else if (arg === '-oh2' || arg === '--outHuman2') {
        outFormat = 'human2';
    } else if (arg === '-oh3' || arg === '--outHuman3') {
        outFormat = 'human3';
    } else if (arg === '--outLegacy') {
        outFormat = 'legacy';
        help();
    } else if (arg === '-oc' || arg === '--outCSV') {
        outFormat = 'csv';
    } else if (arg === '-mr' || arg === '--maxResults') {
        maxResults = Number(process.argv[++i]);
    } else if (arg === '-up' || arg === '--unpublished') {
        includeUnpublished = true;
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

function outHuman(res, pattern, nLang=1) {
    var {
        mlDocs,
        suttaRefs,
        elapsed,
        searchLang,
        method,
        minLang,
        lang,
        segsMatched,
    } = res;
    var refs = res.suttaRefs.map(s=>s.split('/')[0])
        .sort(SuttaCentralId.compareLow)
        .join(',');
    var nRefs = res.suttaRefs.length;
    var nDocs = mlDocs.length;
    console.log(
`pattern      : "${res.pattern}" grep:${res.resultPattern}
languages    : translation:${res.lang} search:${searchLang} minLang:${res.minLang}
output       : ${outFormat} color:${color} elapsed:${elapsed}s maxDoc:${res.maxDoc}
found        : segs:${segsMatched} by:${method} mlDocs:${nDocs} docs:${nRefs} ${refs}`);
    mlDocs.forEach((mld,im) => {
        var suid = mld.suid;
        mld.segments().forEach((seg,i) => {
            var scid = seg.scid;
            var sep = '-----------------------';
            if (i === 0) {
                let sm = mld.hasOwnProperty('segsMatched')
                    ? mld.segsMatched : '';
                let score = mld.score.toFixed(3);
                let title = `doc:${im+1}/${nDocs} ${suid} score:${score}`;
                console.log(`${sep} ${title} ${sep}`);
            }
            let scidText = [
                `\u001b[38;5;80m`,
                scid,
                `\u001b[0m`,
            ].join('');
            if (nLang === 1) {
                console.log(`${scidText}: ${seg[searchLang]}`);
            } else {
                console.log(`scid: ${scidText}`);
                console.log(` pli: ${seg.pli || ''}`);
                if (nLang === 3 || searchLang==='en' || lang === 'en') {
                    console.log(`  en: ${seg.en || ''}`);
                }
                if (searchLang !== 'pli' && searchLang !== 'en') {
                    var text = seg[searchLang] || '';
                    console.log(`  ${searchLang}: ${text}`);
                } else if (lang !== 'pli' && lang !== 'en') {
                    var text = seg[lang] || '';
                    console.log(`  ${lang}: ${text}`);
                }
            }
        });
    });
}

function outScore(res, pattern) {
    res.mlDocs.forEach(mld => {
        console.log(`${mld.score}\t${mld.suid}`);
    });
}

function outPaths(res, pattern) {
    res.bilaraPaths.forEach(p => {
        console.log(path.join(BILARA_DATA, p));
    });
}

function suttacentralLink(scid, lang, author_uid) {
    var suid = scid.split(':')[0];
    var linkText = new SuttaCentralId(scid).standardForm();
    var link =  `https://suttacentral.net/${suid}`;
    if (lang) {
        var author = author_uid.split(', ')[0] || author_uid;
        link =  `https://suttacentral.net/${suid}/${lang}/${author}#${scid}`;
    }
    return `[${linkText}](${link})`;
}

function outVerse(res, pattern, n=0) {
    var {
        lang,
        searchLang,
    } = res;
    n = Number(n);
    let showPli = n===2 && searchLang===lang || 
        n>2 && searchLang!=='pli' && lang!=='pli';
    let showEn = n>2 && searchLang!=='en' && lang!=='en';
    let verse = new Verse({
        linebreak,
        lang,
        searchLang,
        showPli,
        showEn,
    });
    res.mlDocs.forEach(mld => {
        var suid = mld.suid;
        let segments = mld.segments();
        let lines = verse.versify(segments, mld.lang, mld.author_uid);
        console.log(lines.join('\n'));
    });
}

function outLines(res, pattern, n=0) {
    var {
        lang,
        searchLang,
    } = res;
    n = Number(n);
    res.mlDocs.forEach(mld => {
        var suid = mld.suid;
        mld.segments().forEach((seg,i) => {
            var scid = seg.scid;
            var langText = seg[lang] || '';
            var searchText = (
                    n===0 && searchLang!==lang ||
                    n===2 && searchLang!==lang ||
                    n>2 && searchLang!==lang && searchLang!=='pli'
                ) &&
                seg[searchLang] 
                || '';
            var enText = n>2 && searchLang!=='en' && lang!=='en' &&
                seg.en || '';
            var pliText = (
                    n===2 && searchLang===lang || 
                    n>2 && searchLang!=='pli' && lang!=='pli'
                ) &&
                lang!=='pli' && seg.pli 
                || '';

            pliText && console.log(`${scid}: ${pliText}`);
            enText && console.log(`${scid}: ${enText}`);
            searchText && console.log(`${scid}: ${searchText}`);
            langText && console.log(`${scid}: ${langText}`);
            if (!pliText && !searchText && !langText) {
                console.log(seg);
            }
        });
    });
}

function outMarkdown(res, pattern, nLang=3) {
    res.mlDocs.forEach(mld => {
        var suid = mld.suid;
        mld.segments().forEach((seg,i) => {
            var scid = seg.scid;
            var langText = (seg[res.lang] || '').trim();
            var scLink = suttacentralLink(scid, mld.lang, mld.author_uid);
            if (nLang > 1) {
                console.log(`> ${scLink}: ${seg.pli}`);
            }
            if (nLang > 2 && res.lang !== 'en') {
                console.log(`> ${scLink}: ${seg.en}`);
            }
            langText && console.log(`> ${scLink}: ${langText}`);
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
    var epath = path.join(LOCAL, `bls_edit.${editor}`);
    fs.writeFileSync(epath, script);
}

function scriptEditor(res, pattern) {
    write_editor(res, '', 'subl');

    var vipat = res.resultPattern
        .replace(/\\b/, '\\<')
        .replace(/[|()]/g,'\\$&');
    write_editor(res, `'+/${vipat}'`, 'vi');
}

logger.logLevel = logLevel;

(async function() { try {
    var bilaraData = await new BilaraData({
        execGit,
        branch,
        includeUnpublished,
    }).initialize(sync);

    let enWords = await English.wordSet({source:'file'});
    var skr = await new Seeker({
        matchColor: color,
        maxResults,
        bilaraData,
        readFile,
        logger,
        enWords,
    }).initialize();
    var matchHighlight = matchBash(color);
    var findOpts = {
        pattern,
        matchHighlight,
        showMatchesOnly,
    };
    logger.info(`findOpts`, findOpts);
    var msStart = Date.now();
    var res = await skr.find(findOpts);
    var secElapsed = (Date.now() - msStart)/1000;
    logger.info(`find() ${secElapsed.toFixed(1)}s`);
    if (outFormat === 'verse') {
        if (groupBy === 'verse1') {
            outVerse(res, pattern, 1);
        } else if (groupBy === 'verse2') {
            outVerse(res, pattern, 2);
        } else if (groupBy === 'verse3') {
            outVerse(res, pattern, 3);
        } else {
            outVerse(res, pattern);
        }
    } else if (outFormat === 'csv') {
        outCSV(res, pattern);
    } else if (outFormat === 'json') {
        outJSON(res, pattern);
    } else if (outFormat === 'paths') {
        outPaths(res, pattern);
    } else if (outFormat === 'lines') {
        outLines(res, pattern);
    } else if (outFormat === 'lines1') {
        outLines(res, pattern, 1);
    } else if (outFormat === 'lines2') {
        outLines(res, pattern, 2);
    } else if (outFormat === 'lines3') {
        outLines(res, pattern, 3);
    } else if (outFormat === 'markdown') {
        outMarkdown(res, pattern);
    } else if (outFormat === 'markdown1') {
        outMarkdown(res, pattern, 1);
    } else if (outFormat === 'markdown2') {
        outMarkdown(res, pattern, 2);
    } else if (outFormat === 'markdown3') {
        outMarkdown(res, pattern, 3);
    } else if (outFormat === 'trans') {
        outTrans(res, pattern);
    } else if (outFormat === 'human1') {
        outHuman(res, pattern, 1);
    } else if (outFormat === 'human2') {
        outHuman(res, pattern, 2);
    } else if (outFormat === 'human3') {
        outHuman(res, pattern, 3);
    } else if (outFormat === 'human3') {
        outScore(res);
    } else if (outFormat === 'score') {
        outScore(res);
    } else {
        outHuman(res, pattern, 3);
    }
    scriptEditor(res, pattern);
} catch(e) { logger.warn(e.stack); }})();
