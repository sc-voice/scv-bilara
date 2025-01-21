#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { logger } = require('log-instance');
const { Files } = require("memo-again");
const {
    BilaraData,
    English,
    ExampleV2,
    ExecGitMock,
    FuzzyWordSet,
    Pali,
    Seeker,
    SegDoc,
    SuttaCentralId,
    Verse,

} = require('../../index');
const { DBG, } = require('../../src/defines.cjs');
const { 
  AuthorsV2,
  BilaraPath, 
} = require("scv-esm");
const LOCAL = path.join(__dirname, '../../local');
const BILARA_DATA = path.join(LOCAL, '/bilara-data');
var bdName = 'bilara-data';
var bilaraData;

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

    -bd, --bilara-data DATA_NAME
        specifiy name of Bilara data directory (e.g., "ebt-data"). 
        Default is 'bilara-data'

    -d, --maxDoc NUMBER
        specify maximum number of documents to display. Default is 50.

    -da, --doc-author AUTHOR
        Specify document author (e.g., sujato)

    -dl, --doc-lang ISO_LANG_2
        Specify document language (e.g., en)

    -es, --exampleSuttas
        Return JSON map of examples to matching suttas. Use examples
        for given docAuthor and docLang values. Matching suttas
        are listed in descending order of relevant scores.  Suttas
        with the highest score are "definitional suttas" that
        provide the most explanation for a given example.
        
    -esk, --exampleSuttaKeywords
        Like "-es" option but only returns results for 
        keyword searches only.

    -esp, --exampleSuttaPhrases
        Like "-es" option but only returns results for 
        phrase searches only.
        
    -esd3, --exampleSuttaD3
        Return JSON D3 graph of examples and matching suttas. 
        Use examples for given docAuthor and docLang values. 
        
    -f, --filter MODE
        Filter segments according to mode: "pattern", "none".
        If mode is "pattern", then only segments matching pattern
        will be shown. If mode is "none", segments will not be filtered.

    -ga ACCOUNT, --gitAccount ACCOUNT
        Choose GitHub account name. Default is "suttacentral".

    -gb BRANCH, --gitBranch BRANCH
        Choose git branch for bilara-data. Default is "unpublished".

    --gitMock 
        Ignore all git operations. This option is for containers with fixed content.

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

    -ra, --ref-author AUTHOR
        Specify reference author (e.g., sujato)

    -rl, --ref-lang ISO_LANG_2
        Specify reference language (e.g., en)

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

var gitAccount = "suttacentral";
var pattern;
var root;
var maxResults = 1000;
var logLevel = 'warn';
var color = 201;
var outFormat = 'human';
var showMatchesOnly = true;
var includeUnpublished = false;
var isTTY = process.stdout.isTTY;
var verbose = false;
var readFile = true;
var sync = undefined;
var execGit = undefined;
var groupBy = 'line';
var linebreak = ' ';
var branch = 'unpublished';
var trilingual = true;
var exampleSuttas = false;
var exampleSuttaD3 = false;
var exampleSuttaKeywords = false;
var exampleSuttaPhrases = false;
var docLang = 'en';
var docAuthor;

//var searchLang;

var nargs = process.argv.length;
if (nargs < 3) {
    help();
}
for (var i = 2; i < nargs; i++) {
    var arg = process.argv[i];
    if (i<2) { continue; }

    // peek
    if (arg === '-dl' || arg === '--docLang') {
        docLang = process.argv[i+1];
    } else if (arg === '-da' || arg === '--docAuthor') {
        docAuthor = process.argv[i+1];
    }

    // shift
    if (arg === '-?' || arg === '--help') {
        help();
    } else if (arg === '-b0' || arg === '--break0') {
        linebreak = ' ';
    } else if (arg === '-b1' || arg === '--break1') {
        linebreak = '  \n';
    } else if (arg === '-bd' || arg === '--bilara-data') {
        bdName = process.argv[++i];
        if (bdName === 'ebt-data') {
          branch = 'published';
        }
    } else if (arg === '-esd3' || arg === '--exampleSuttaD3') {
        exampleSuttaD3 = true;
    } else if (arg === '-esk' || arg === '--exampleSuttaKeywords') {
        exampleSuttaKeywords = true;
    } else if (arg === '-esp' || arg === '--exampleSuttaPhrases') {
        exampleSuttaPhrases = true;
    } else if (arg === '-es' || arg === '--exampleSuttas') {
        exampleSuttas = true;
    } else if (arg === '-ll' || arg === '--logLevel') {
        logLevel = process.argv[++i];
    } else if (arg === '-f' || arg === '--filter') {
        var filter  = process.argv[++i];
        showMatchesOnly = filter === 'pattern';
    } else if (arg === '-sy' || arg === '--sync') {
        sync = true;
    } else if (arg === '-ga' || arg === '--gitAccount') {
        gitAccount = process.argv[++i];
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
  const msg = "search.outHuman() ";
  var {
      mlDocs,
      suttaRefs,
      elapsed,
      searchLang,
      method,
      minLang,
      lang,
      segsMatched,
      refLang = '',
      refAuthor = '',
      docLang = '',
      docAuthor = '',
  } = res;
  var refs = res.suttaRefs.map(s=>s.split('/')[0])
      .sort(SuttaCentralId.compareLow)
      .join(',');
  var nRefs = res.suttaRefs.length;
  var nDocs = mlDocs.length;
  console.log(
`pattern   : "${res.pattern}" grep:${res.resultPattern}
source    : ${root}@${branch}
languages : translation:${res.lang} search:${searchLang} minLang:${res.minLang}
output    : ${outFormat} color:${color} elapsed:${elapsed}s maxDoc:${res.maxDoc}
found     : segs:${segsMatched} by:${method} mlDocs:${nDocs} docs:${nRefs} ${refs}`);
  if (trilingual) {
    console.log(
      `trilingual:`,
      `doc:${docLang}/${docAuthor}`,
      `ref:${refLang}/${refAuthor}`,
    );
  }
  mlDocs.forEach((mld,im) => {
    let {suid, author, author_uid, lang} = mld;
    mld.segments().forEach((seg,i) => {
      var scid = seg.scid;
      var sep = '---';
      if (i === 0) {
        let sm = mld.hasOwnProperty('segsMatched') ? mld.segsMatched : '';
        let score = mld.score.toFixed(3);
        let title = [
          `doc:${im+1}/${nDocs}`,
          `${author} ${suid}/${lang}/${author_uid}`,
          `score:${score}`
        ].join(' ');
        console.log(`${sep} ${title} ${sep}`);
      }
      let scidText = [
        `\u001b[38;5;80m`,
        scid,
        `\u001b[0m`,
      ].join('');
      switch (nLang) {
        case 1:
          console.log(`${scidText}: ${seg[searchLang]}`);
          break;
        case 2: 
          if (trilingual) {
            let { name } = bilaraData;
            console.log(`scid: ${scidText}`);
            if (docAuthor !== refAuthor) {
              console.log(` ref: ${seg.ref || ''}`);
              console.log(` ${docLang}: ${seg[docLang] || ''}`);
            } else {
              console.log(` pli: ${seg.pli || ''}`);
              console.log(` ${docLang}: ${seg[docLang] || ''}`);
            }
          } else {
            console.log(`scid: ${scidText}`);
            console.log(` pli: ${seg.pli || ''}`);
            console.log(`  en: ${seg.en || ''}`);
            if (searchLang !== 'pli' && searchLang !== 'en') {
              var text = seg[searchLang] || '';
              console.log(`  ${searchLang}: ${text}`);
            } else if (lang !== 'pli' && lang !== 'en') {
              var text = seg[lang] || '';
              console.log(`  ${lang}: ${text}`);
            }
          }
          break;
        case 3:
        default:
          if (trilingual) {
            console.log(`scid: ${scidText}`);
            console.log(` pli: ${seg.pli || ''}`);
            console.log(` ref: ${seg.ref || ''}`);
            console.log(` ${docLang}: ${seg[docLang] || ''}`);
          } else {
            console.log(`scid: ${scidText}`);
            console.log(` pli: ${seg.pli || ''}`);
            console.log(`  en: ${seg.en || ''}`);
            if (searchLang !== 'pli' && searchLang !== 'en') {
              var text = seg[searchLang] || '';
              console.log(`  ${searchLang}: ${text}`);
            } else if (lang !== 'pli' && lang !== 'en') {
              var text = seg[lang] || '';
              console.log(`  ${lang}: ${text}`);
            }
          }
          break;
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
    if (lang && author_uid) {
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
    const msg = "search.outLines() ";
    var {
        lang,
        searchLang,
        author,
        docLang, 
        docAuthor,
        docAuthorName,
        refLang,
        refAuthor,
    } = res;
    console.log(
      `---:pli/ms`,
      `doc:${docLang}/${docAuthor} ${docAuthorName}`,
      `ref:${refLang}/${refAuthor}`
    );
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
            var docText = seg[docLang] || '';
            var refText = (
              n > 2
            ) && seg[refLang] || '';

            pliText && console.log(`${scid} ---: ${pliText}`);
            refText && console.log(`${scid} ref: ${refText}`);
            docText && console.log(`${scid} doc: ${docText}`);
            //enText && console.log(`${scid}   en: ${enText}`);
            //searchText && console.log(`${scid} find: ${searchText}`);
            //langText && console.log(`${scid} lang: ${langText}`);
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

async function outExampleSuttaD3(opts={}) {
  let lang = docLang;
  let author = docAuthor || AuthorsV2.langAuthor(lang);
  let memoize = readFile;
  let ev2 = await new ExampleV2({lang, author, memoize}).initialize();
  let examples = await ev2.examples();
  let links = [];
  let nodes = [];

  examples = examples.filter(eg=>!!eg);
  let egSuttaMap = await ev2.suttasOfExamples(examples, opts);
  let suidLinks = {};
  let suidRank = {};
  for (let i=0; i < examples.length; i++) {
    let eg = examples[i];
    let egSuttas = egSuttaMap[eg];
    egSuttas.forEach((egs,i)=>{
      let rank = i+1;
      suidRank[egs] = Math.min(rank, suidRank[egs]||rank);
      suidLinks[egs] = suidLinks[egs] || 0;
      suidLinks[egs]++;
      links.push({ source: eg, target: egs, rank});
    });
    nodes.push({ 
      id: eg, 
      group: "Examples", 
      links: egSuttas.length,
    });
  }
  Object.keys(suidLinks).forEach(sutta_uid=>{
    nodes.push({
      id: sutta_uid,
      group: sutta_uid.replace(/[^a-z]+/i, ''),
      rank: suidRank[sutta_uid],
      links: suidLinks[sutta_uid],
    });
  });
  let graph = { nodes, links }
  console.log(JSON.stringify(graph, null, 2));
}

async function outExampleSuttas(opts={}) {
  let lang = docLang;
  let author = docAuthor || AuthorsV2.langAuthor(lang);
  let memoize = readFile;
  let ev2 = await new ExampleV2({lang, author, memoize}).initialize();
  //let examples = ['wurzel des leidens'];
  let examples = await ev2.examples();
  examples = examples.filter(eg=>!!eg);
  let suttas = await ev2.suttasOfExamples(examples, opts);
  for (let i=0; i < examples.length; i++) {
    let key = examples[i];
    let value = suttas[key];
    suttas[key] = value.join(' ');
  }
  console.log(JSON.stringify(suttas, null, 2));
}

logger.logLevel = logLevel;

(async function() { try {
    const msg = "js/search() ";
    const dbg = DBG.SEARCH_SCRIPT;
    const dbgv = DBG.VERBOSE && dbg;
    logger.info(msg, `creating BilaraData ${bdName} ${branch}`);
    let localRoot = path.join(process.cwd(), 'local', bdName);
    let libRoot = path.join(Files.LOCAL_DIR, bdName);
    root = fs.existsSync(localRoot) ? localRoot : libRoot;
    dbgv && console.warn(msg, '[1]root', root, '@', branch);
    bilaraData = new BilaraData({
        name: bdName,
        root,
        execGit,
        branch,
        gitAccount,
        includeUnpublished,
    });
    logger.info(msg, 'initializing BilaraData', {sync});
    await bilaraData.initialize(sync);
    if (exampleSuttaD3) {
      outExampleSuttaD3();
      return;
    } else if (exampleSuttaPhrases) {
      outExampleSuttas({method:"phrase"});
      return;
    } else if (exampleSuttaKeywords) {
      outExampleSuttas({method:"keywords"});
      return;
    } else if (exampleSuttas) {
      outExampleSuttas();
      return;
    }

    logger.info(msg, 'load English.wordSet');
    let enWords = await English.wordSet({source:'file'});
    logger.info(msg, 'creating Seeker');
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
        trilingual,
    };
    logger.info(msg, `findOpts`, findOpts);
    var msStart = Date.now();
    var res = await skr.find(findOpts);
    var secElapsed = (Date.now() - msStart)/1000;
    logger.info(msg, `find() ${secElapsed.toFixed(1)}s`);
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
