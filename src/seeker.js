(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const { logger } = require('log-instance');
    const { js, LOCAL_DIR, } = require('just-simple').JustSimple;
    const {
        exec,
    } = require('child_process');
    const { MerkleJson } = require("merkle-json");
    const FuzzyWordSet = require('./fuzzy-word-set');
    const BilaraPath = require('./bilara-path');
    const MLDoc = require('./ml-doc');
    const Pali = require('./pali');
    const Unicode = require('./unicode');
    const English = require('./english');
    const BilaraData = require('./bilara-data');
    const SuttaCentralId = require('./sutta-central-id');

    const APP_DIR = path.join(__dirname, '..');
    const BILARA_PATH = path.join(LOCAL_DIR, 'bilara-data');
    const TRANSLATION_PATH = path.join(BILARA_PATH, 'translation');
    const MAXBUFFER = 10 * 1024 * 1024;

    var wscount = 0;

    class Seeker {
        constructor(opts={}) {
            (opts.logger || logger).logInstance(this, opts);
            var root = this.root = opts.root || BILARA_PATH;
            this.bilaraData = opts.bilaraData || new BilaraData(opts);
            this.includeUnpublished = opts.includeUnpublished ||
                this.bilaraData.includeUnpublished;
            this.lang = opts.lang || 'en';
            this.languages = opts.languages || ['pli', 'en'];
            this.unicode = opts.unicode || new Unicode();
            this.paliWords = opts.paliWords;
            this.mj = new MerkleJson();
            this.cache = {};
            this.enWords = opts.enWords;
            this.matchColor = opts.matchColor == null 
                ? 121 : opts.matchColor;
            this.matchHighlight = opts.matchHighlight === undefined 
                ? `\u001b[38;5;${this.matchColor}m$&\u001b[0m`
                : '';
            this.matchWordEnd = opts.matchWordEnd;
            this.maxResults = opts.maxResults == null 
                ? 1000 : opts.maxResults;
            this.maxDoc = opts.maxDoc == null ? 50 : opts.maxDoc;
            this.minLang = opts.minLang || 2;
        }

        static sanitizePattern(pattern) {
            if (!pattern) {
                throw new Error("search pattern is required");
            }
            const MAX_PATTERN = 1024;
            var excess = pattern.length - MAX_PATTERN;
            if (excess > 0) {
                throw new Error(
                    `Search text too long by ${excess} characters.`);
            }
            // replace quotes (code injection on grep argument)
            pattern = pattern.replace(/["']/g,'.'); 
            // eliminate tabs, newlines and carriage returns
            pattern = pattern.replace(/\s/g,' '); 
            // remove control characters
            pattern = pattern.replace(/[\u0000-\u001f\u007f]+/g,''); 
            // must be valid
            new RegExp(pattern);

            return pattern;
        }

        static normalizePattern(pattern) {
            // normalize white space to space
            pattern = pattern.trim().replace(/[\s]+/g,' ').toLowerCase(); 
            
            return pattern;
        }

        get initialized() {
            return this.paliWords != null && this.enWords != null
                && this.bilaraData.initialized;
        }

        initialize(msg='') {
            var that = this;
            var {
                paliWords,
                enWords,
            } = this;
            if (paliWords && enWords) {
                return Promise.resolve(that);
            }
            return new Promise((resolve, reject) => {
                (async function() { try {
                    var p_pali = !paliWords && Pali.wordSet();
                    var p_en = !enWords && English.wordSet();
                    p_pali && (paliWords = await p_pali);
                    p_en && (enWords = await p_en);
                    that.paliWords = paliWords;
                    that.enWords = enWords;
                    await that.bilaraData.initialize();
                    //that.log(`Seeker.initialize resolve ${msg}`); 
                    resolve(that);
                } catch(e) { reject(e); }})();
            });
        }

        patternLanguage(pattern, lang=this.lang) {
            this.validate();
            if (SuttaCentralId.test(pattern)) {
                var langs = SuttaCentralId.languages(pattern);
                return langs.length === 0 || langs.indexOf(lang) >= 0 
                    ? lang : langs[0];
            }
            var keywords = pattern.split(/ +/);
            return keywords.reduce((a,k) => {
                if (this.enWords.contains(k)) {
                    (!a || a === 'pli') && (a = 'en');
                } else if (this.paliWords.contains(k)) {
                    a = a || 'pli';
                } else {
                    a = lang;
                }
                return a;
            }, null) || lang;
        }

        langPath(lang) {
            return lang === 'pli' 
                ? path.join(this.root, 'root/pli')
                : path.join(this.root, `translation/${lang}`);
        }

        validate() {
            if (!this.initialized) {
                throw new Error(`initialize() is required`);
            }
            return this;
        }

        grepComparator(a,b) {
            var cmp = b.count - a.count;
            if (cmp === 0) {
                cmp = a.fpath.localeCompare(b.fpath);
            }
            return cmp;
        }

        patternKeywords(pattern) {
            // + was inserted by normalizePattern()
            return pattern.split(/ \+?/); 
        }

        keywordPattern(keyword, lang) {
            var pat = `\\b${keyword}`;
            if (this.paliWords.contains(keyword)) {
                var romKeyword = this.unicode.romanize(keyword);
                pat = keyword === romKeyword
                    ? `\\b${Pali.romanizePattern(keyword)}`
                    : keyword;
            }
            if (this.matchWordEnd === true) {
                pat += '\\b';
            }
            return pat;
        }

        tipitakaRegExp(tc='') {
            var tcParts = tc.toLowerCase().split(',');
            var tcMap = {
                'ab': '/abhidhamma/',
                'as': '-as',
                'ay': '-ay',
                'bi': '-bi-',
                'bu': '-bu-',
                'dn': '/dn/',
                'kd': '-kd',
                'kn': '/kn/',
                'mn': '/mn/',
                'ms': '-ms',
                'np': '-np',
                'pc': '-pc',
                'pd': '-pd',
                'pj': '-pj',
                'pvr': '-pvr',
                'sk': '-sk',
                'sn': '/sn/',
                'ss': '-ss',
                'su': '/sutta/',
                'thag': '/thag/',
                'thig': '/thig/',
                'tv': '-tv-',
                'vb': '-vb-',
                'vin': '/vinaya/',

            }
            var pats = tcParts.reduce((a,p) => {
                tcMap[p] && a.push(tcMap[p]);
                return a;
            }, []);
            if (pats.length) {
                var re = new RegExp(`(${pats.join('|')})`, "iu");
            } else {
                var re = new RegExp(this.includeUnpublished
                    ? '(/vinaya/|/sutta/)' : '(/sutta/)', 
                    "iu")
            }
            return re;
        }


        grep(opts) {
            var { mj, cache } = this;
            var key = mj.hash(opts);
            return cache[key] || (cache[key] = this.slowGrep(opts));
        }

        slowGrep(opts) {
            var {
                pattern,
                maxResults,
                lang,
                language, // DEPRECATED
                searchMetadata, // TODO
                tipitakaCategories,
            } = opts;
            var grepTC = this.tipitakaRegExp(tipitakaCategories);
            var {
                root,
            } = this;
            lang = lang || language || this.lang;
            if (searchMetadata) {
                return Promise.reject(new Error(
                    `searchMetadata not supported`));
            }
            var grex = pattern;
            var cmd = [
                `rg -c -i -e '${grex}' `,
                `--glob='!package.json' `,
                `--glob='!*atthakatha*' `,
                `--glob='!*/reference/*'`,
                `--glob='!*/html/*'`,
                `--glob='!*/comment/*'`,
                `--glob='!*/variant/*'`,
                `--glob='!_*' `,
                `|sort -g -r -k 2,2 -k 1,1 -t ':'`,
            ].join(' ');
            maxResults && (cmd += `|head -${maxResults}`);
            var cwd = this.langPath(lang);
            var pathPrefix = cwd.replace(root, '').replace(/^\/?/, '');
            var cwdMsg = cwd.replace(`${root}/`,'');
            this.log(`grep(${cwdMsg}) ${cmd}`);
            var execOpts = {
                cwd,
                shell: '/bin/bash',
                maxBuffer: MAXBUFFER,
            };
            return new Promise((resolve,reject) => {
                exec(cmd, execOpts, (err,stdout,stderr) => {
                    if (err) {
                        stderr && this.log(stderr);
                        reject(err);
                    } else {
                        var raw = stdout && stdout.trim().split('\n') || [];
                        var rawFiltered = raw.filter(f=> grepTC.test(f))
                            .map(f => path.join(pathPrefix, f));
                        resolve(rawFiltered);
                    }
                });
            });
        }

        async phraseSearch(args) {
            this.validate();
            var that = this;
            var {
                searchLang,
                lang,
                language,
                pattern,
                maxResults,
                tipitakaCategories,
            } = args;
            lang = lang || language || this.lang;
            maxResults = maxResults == null ? this.maxResults : maxResults;
            if (pattern == null) {
                throw new Error(`phraseSearch() requires pattern`);
            }
            lang = searchLang == null
                ? that.patternLanguage(pattern, lang)
                : searchLang;
            if (lang === 'pli') {
                var romPat = that.unicode.romanize(pattern);
                var pat = romPat === pattern
                    ? `\\b${Pali.romanizePattern(pattern)}` 
                    : pattern;
            } else {
                var pat = `\\b${pattern}`;
            }
            that.log(`phraseSearch(${pat},${lang})`);
            var grepArgs = Object.assign({}, args, {
                pattern:pat,
                lang,
                maxResults,
                tipitakaCategories,
            });
            var lines = await that.grep(grepArgs);
            return {
                method: 'phrase',
                lang,
                pattern:pat,
                lines,
            }
        }

        keywordSearch(args) {
            var {
                pattern,
                maxResults,
                lang,
                searchLang,
                language, // DEPRECATED
                searchMetadata,
                comparator,
                tipitakaCategories,
            } = args;
            comparator = comparator || this.grepComparator;
            var that = this;
            lang = lang || language || this.lang;
            maxResults = maxResults == null ? this.maxResults : maxResults;
            var keywords = this.patternKeywords(pattern);
            lang = searchLang == null
                ? this.patternLanguage(pattern, lang || language)
                : searchLang;
            var wordArgs = Object.assign({}, args, {
                maxResults: 0, // don't clip prematurely
                lang,
            });
            this.log(`keywordSearch(${keywords}) lang:${lang}`);
            var keywordsFound = {};
            return new Promise((resolve,reject) => {
                (async function() { try {
                    var mrgOut = [];
                    var mrgIn = [];
                    for (var i=0; i< keywords.length; i++) {
                        var keyword = keywords[i];
                        wordArgs.pattern = that
                            .keywordPattern(keyword, lang);
                        var wordlines = await that.grep(wordArgs);
                        keywordsFound[keyword] = wordlines.length;
                        wordlines.sort();
                        mrgOut = [];
                        for (var iw = 0; iw < wordlines.length; iw++) {
                            var lineparts = wordlines[iw].split(':');
                            var fpath = lineparts[0];
                            var count = Number(lineparts[1]);
                            if (i === 0) {
                                mrgOut.push({
                                    fpath,
                                    count,
                                });
                            } else if (mrgIn.length) {
                                var cmp = mrgIn[0].fpath
                                    .localeCompare(fpath);
                                if (cmp === 0) {
                                    var newItem = {
                                        fpath,
                                        count: Math.min(
                                            mrgIn[0].count, count),
                                    };
                                    mrgOut.push(newItem);
                                    mrgIn.shift();
                                } else if (cmp < 0) {
                                    mrgIn.shift(); // discard left
                                    if (mrgIn.length === 0) {
                                        break;
                                    }
                                    iw--; // re-compare
                                } else {
                                    // discard right
                                }
                            }
                        }
                        mrgIn = mrgOut;
                    }
                    var lines =  mrgOut.sort(comparator)
                        .map(v => `${v.fpath}:${v.count}`);
                    if (maxResults) {
                        lines = lines.slice(0,maxResults);
                    }
                    resolve({
                        method: 'keywords',
                        keywordsFound,
                        resultPattern: keywords
                            .map(k=> that.keywordPattern(k, lang))
                            .join('|'),
                        lang,
                        maxResults,
                        lines,
                    });
                } catch(e) {reject(e);} })();
            });
        }

        findArgs(args) {
            if (!(args instanceof Array)) {
                throw new Error("findArgs(?ARRAY-OF-ARGS?)");
            }
            if (typeof args[0] === 'string') {
                var opts = {
                    pattern: args[0],
                    maxResults: args[1],
                }
            } else {
                var opts = args[0];
            }
            var {
                verbose,
                pattern: rawPattern,
                searchLang,
                lang,
                language, // DEPRECATED
                languages,
                minLang,    // minimum number of languages
                maxResults, // maximum number of grep files
                maxDoc,     // maximum number of returned documents
                matchHighlight,
                sortLines,
                showMatchesOnly,
                tipitakaCategories,
                types,
            } = opts;
            if (rawPattern == null) {
                throw new Error(`pattern is required`);
            }

            // STEP 1. extract embeddable options
            var argv = rawPattern.split(' ');
            var pattern = '';
            for (var i = 0; i < argv.length; i++) {
                var arg = argv[i];
                if (arg === '-d' || arg === '--maxDoc') {
                    let n = Number(argv[++i]);
                    if (!isNaN(n) && 0 < n ) {
                        maxDoc = n;
                    }
                } else if (arg === '-mr' || arg === '--maxResults') {
                    let n = Number(argv[++i]);
                    if (!isNaN(n) && 0 < n && n < 4000 ) {
                        maxResults = n;
                    }
                } else if (arg.startsWith('-tc:')) {
                    tipitakaCategories = arg.substring('-tc:'.length);
                } else if (arg === '-ml1' ) {
                    minLang = 1;
                } else if (arg === '-ml2' ) {
                    minLang = 2;
                } else if (arg === '-ml3' ) {
                    minLang = 3;
                } else if (arg === '-ml' || arg === '--minLang') {
                    let n = Number(argv[++i]);
                    if (!isNaN(n) && 0 < n && n <= 3) {
                        minLang = n;
                    }
                } else if (arg === '-l' || arg === '--lang') {
                    (arg = argv[++i]) && (lang = arg);
                } else if (arg === '-sl' || arg === '--searchLang') {
                    (arg = argv[++i]) && (searchLang = arg);
                } else {
                    pattern  = pattern ? `${pattern} ${arg}` : arg;
                }
            }

            // STEP 2. Assign default values
            var thisLang = this.lang;
            lang = lang || language || thisLang;
            searchLang = searchLang == null 
                ? this.patternLanguage(pattern, lang)
                : searchLang;
            minLang = minLang || 
                (lang === 'en' || searchLang === 'en' ? 2 : 3);
            pattern = Seeker.sanitizePattern(pattern);
            pattern = Seeker.normalizePattern(pattern);
            (showMatchesOnly == null) && (showMatchesOnly = true);
            languages = languages || this.languages.slice() || [];
            (lang && languages.indexOf(lang)<0) && languages.push(lang);
            maxResults = Number(
                maxResults==null ? this.maxResults : maxResults);
            if (isNaN(maxResults)) {
                throw new Error("maxResults must be a number");
            }
            maxDoc = Number(maxDoc==null ? this.maxDoc : maxDoc);
            (matchHighlight == null) && 
                (matchHighlight = this.matchHighlight);

            types = types || ['root', 'translation'];

            return {
                verbose,
                pattern,
                showMatchesOnly,
                languages,
                maxResults,
                searchLang,
                maxDoc,
                minLang,
                matchHighlight,
                sortLines,
                tipitakaCategories,
                lang,
                types,
            }
        }

        async find(...args) {
            var that = this;
            var msStart = Date.now();
            var findArgs = that.findArgs(args);
            var {
                pattern,
                searchLang,
                lang,
                minLang,
                languages,
                sortLines,
                maxResults,
                maxDoc,
                matchHighlight,
                showMatchesOnly,
                tipitakaCategories,
                types,
                verbose,
            } = findArgs;
            var bd = that.bilaraData;
            var examples = bd.examples;
            var resultPattern = pattern;
            var scoreDoc = true;

            if (examples[lang] && examples[lang].indexOf(pattern) >= 0) {
                searchLang = lang;
            }

            if (SuttaCentralId.test(pattern)) {
                verbose && console.log(`findArgs SuttaCentralId`, 
                    js.simpleString(findArgs));
                maxResults = maxResults || this.maxResults;
                var {
                    method,
                    uids,
                    suttaRefs,
                } = bd.sutta_uidSearch(pattern, maxResults, lang);
                scoreDoc = false;
            } else {
                var method = 'phrase';
                var searchOpts = {
                    pattern, 
                    searchLang,
                    maxResults, 
                    lang, 
                    showMatchesOnly,
                    tipitakaCategories,
                    verbose,
                };

                var {
                    lines,
                    pattern: resultPattern,
                } = await that.phraseSearch(searchOpts);
                if (lines.length) {
                    verbose && console.log(`findArgs phrase`, 
                        js.simpleString(findArgs), 
                    );
                } else {
                    verbose && that.log(`findArgs keywords`, 
                        js.simpleString(findArgs));
                    var method = 'keywords';
                    var data = await that.keywordSearch(searchOpts);
                    var {
                        lines,
                        resultPattern,
                    } = data;
                }
                sortLines && lines.sort(sortLines);
                var suttaRefs = lines.map(line => 
                    BilaraPath.pathParts(line).suttaRef);
                verbose && console.log(`findArgs suttaRefs`, suttaRefs);
            }

            var mlDocs = [];
            var segsMatched = 0;
            var bilaraPaths = [];
            var matchingRefs = [];
            for (var i = 0; i < suttaRefs.length; i++) {
                let suttaRef = suttaRefs[i];
                let [suid,refLang,author] = suttaRef.split('/');
                let suttaInfo = bd.suttaInfo(suttaRef);
                if (!suttaInfo) {
                    verbose && console.log(`skipping ${suttaRef}`);
                    continue; 
                }
                let isBilDoc = bd.isBilaraDoc({ suid, lang:refLang, author });
                let mld = await bd.loadMLDoc({
                    verbose,
                    suid: isBilDoc ? suid : suttaRef,
                    languages,
                    lang,
                    types,
                });
                var mldBilaraPaths = mld.bilaraPaths;
                if (mldBilaraPaths.length < minLang) {
                    verbose && that.log(`skipping ${mld.suid} minLang`,
                        `${mldBilaraPaths.length}<${minLang} [${languages}]`, 
                    );
                    continue;
                }
                bilaraPaths = [...bilaraPaths, ...mldBilaraPaths];
                var resFilter = mld.filterSegments({
                    pattern,
                    resultPattern, 
                    languages: [searchLang], 
                    showMatchesOnly,
                });
                segsMatched += resFilter.matched;
                mld.segsMatched = resFilter.matched;
                if (matchHighlight) {
                    mld.highlightMatch(resultPattern, matchHighlight);
                }
                if (resFilter.matched === 0) {
                    //that.log(`Ignoring ${mld.suid} ${pattern}`);
                } else if (mld.bilaraPaths.length >= minLang) {
                    if (Object.keys(mld.segMap).length ) {
                        mlDocs.push(mld);
                        matchingRefs.push(suttaRef);
                    } else {
                        that.log(`skipping ${mld.suid} segments:0`);
                    }
                } else {
                    that.log(`skipping ${mld.suid} minLang:${minLang}`);
                }
            }
            scoreDoc && mlDocs.sort(MLDoc.compare);
            mlDocs = mlDocs.slice(0, maxDoc);
            return {
                lang,   // embeddable option
                searchLang, // embeddable option
                minLang,    // embeddable option
                maxDoc, // embeddable option
                maxResults, // embeddable option

                pattern,
                elapsed: (Date.now()-msStart)/1000,
                method,
                resultPattern,
                segsMatched,
                bilaraPaths,
                suttaRefs: matchingRefs,
                mlDocs,
            };
        }

    }

    module.exports = exports.Seeker = Seeker;

})(typeof exports === "object" ? exports : (exports = {}));

