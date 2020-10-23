(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const { logger } = require('log-instance');
    const {
        exec,
    } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    const { ScApi } = require('suttacentral-api');
    const { MerkleJson } = require("merkle-json");
    const { Memoizer, Files } = require("memo-again");
    const FuzzyWordSet = require('./fuzzy-word-set');
    const BilaraPath = require('./bilara-path');
    const MLDoc = require('./ml-doc');
    const Pali = require('./pali');
    const Unicode = require('./unicode');
    const English = require('./english');
    const BilaraData = require('./bilara-data');
    const SuttaCentralId = require('./sutta-central-id');

    const BILARA_PATH = path.join(Files.LOCAL_DIR, 'bilara-data');
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
            this.scApi = opts.scApi || new ScApi();
            this.unicode = opts.unicode || new Unicode();
            this.paliWords = opts.paliWords;
            this.patPrimary = opts.patPrimary || '/sutta/';
            this.mj = new MerkleJson();
            this.memoizer = opts.memoizer || new Memoizer({
                writeMem: false, // avoid monotonic increasing memory usage
                writeFile: opts.writeFile == null
                    ? true
                    : opts.writeFile, // only cache examples!
                readFile: opts.readFile,
                serialize: Seeker.serialize,
                deserialize: Seeker.deserialize,
                storeName: opts.memoStore,
                logger: this,
            });
            this.enWords = opts.enWords;
            this.matchColor = opts.matchColor == null ? 121 : opts.matchColor;
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

        isExample(pattern) {
            var examples = this.bilaraData.examples;
            var reExamples = this.reExamples;
            if (!reExamples) {
                let patExamples = Object.keys(examples)
                    .reduce((ak,k)=>{
                        let ae = examples[k].reduce((a,e)=>[...a,e],ak);
                        return ak.concat(ae);
                    }, [])
                    .join("|");
                this.reExamples = 
                reExamples = new RegExp(`(\\b)?\(${patExamples}\)(\\b)?`, "iu");
            }
            return reExamples.test(pattern);
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
                'sutta': '/sutta/',
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
            let re;
            if (pats.length) {
                re = new RegExp(`(${pats.join('|')})`, "iu");
            }
            re && this.info(`tiptakaCategories`, re.toString());
            return re;
        }

        grep(opts={}) {
            var {
                pattern,
                maxResults,
                lang,
                language, // DEPRECATED
                searchMetadata, // TODO
                tipitakaCategories,
                patPrimary,
            } = opts;
            var reTipCat = this.tipitakaRegExp(tipitakaCategories);
            lang = lang || language || this.lang;
            var root = this.root.replace(`${Files.APP_DIR}/`,'');
            var slowOpts = {
                pattern,
                maxResults,
                lang,
                language, // DEPRECATED
                searchMetadata, // TODO
                tipitakaCategories,
                reTipCat,
                root,
                patPrimary,
            }
            var msStart = Date.now();
            var result;
            var { memoizer, grepMemo } = this;
            if (grepMemo == null) {
                this.grepMemo = 
                grepMemo = memoizer.memoize(Seeker.slowGrep, Seeker);
            }
            result = grepMemo(slowOpts);
            var msElapsed = Date.now()-msStart; // about 20ms

            return result;
        }

        static orderPrimary(lines, patPrimary) {
            let rePrimary = new RegExp(patPrimary, "ui");
            let {primary,secondary} = lines.reduce((a, line) => {
                if (rePrimary.test(line)) {
                    a.primary.push(line);
                } else {
                    a.secondary.push(line);
                }
                return a;
            },{primary:[],secondary:[]});
            return primary.concat(secondary);
        }

        static async slowGrep(opts) { try {
            var {
                pattern,
                maxResults,
                lang,
                language, // DEPRECATED
                searchMetadata, // TODO
                reTipCat,
                root,
                patPrimary,
            } = opts;
            if (!root.startsWith("/")) {
                root = `${Files.APP_DIR}/${root}`;
            }

            logger.info(`slowGrep`,{pattern,lang, root});
            if (searchMetadata) {
                return Promise.reject(new Error(
                    `searchMetadata not supported`));
            }
            var grex = pattern;
            var cwd = lang === 'pli'
                ? path.join(root, 'root/pli')
                : path.join(root, `translation/${lang}`);
            var cmd = [
                `rg -c -i -e '${grex}' `,
                `-g='!atthakatha' `,  // exclude pli/vri
                `-g='!_*' `,            // top-level JSON files
                `-g '!blurb'`,     // exclude blurbs
                `-g '!ea'`,   // exclude Chinese 
                `-g '!ka'`,   // exclude Chinese
                `-g '!sa'`,   // exclude Chinese
                `-g '!ma'`,   // exclude Chinese
                `|sort -g -r -k 2,2 -k 1,1 -t ':'`,
            ].join(' ');
            maxResults && (cmd += `|head -${maxResults}`);
            var pathPrefix = cwd.replace(root, '').replace(/^\/?/, '');
            var cwdMsg = cwd.replace(`${root}/`,'');
            logger.info(`grep(${cwdMsg}) ${cmd}`);
            var execOpts = {
                cwd,
                shell: '/bin/bash',
                maxBuffer: MAXBUFFER,
            };
            let { stdout, stderr }  = await execPromise(cmd, execOpts);
            let lines = stdout && stdout.trim().split('\n') || [];
            let raw = Seeker.orderPrimary(lines, patPrimary);
            let rawTipCat = reTipCat ? raw.filter(f=>reTipCat.test(f)) : raw;
            let paths = rawTipCat.map(f => path.join(pathPrefix, f));
            return paths;
        } catch(e) {
            logger.warn(`slowGrep()`, JSON.stringify(opts), e.message);
            throw e;
        }}

        async phraseSearch(args) {
            this.validate();
            var {
                searchLang,
                lang,
                language,
                pattern,
                maxResults,
                tipitakaCategories,
                patPrimary,
            } = args;
            lang = lang || language || this.lang;
            patPrimary = patPrimary || this.patPrimary;
            maxResults = maxResults == null ? this.maxResults : maxResults;
            if (pattern == null) {
                throw new Error(`phraseSearch() requires pattern`);
            }
            lang = searchLang == null
                ? this.patternLanguage(pattern, lang)
                : searchLang;
            if (lang === 'pli') {
                var romPat = this.unicode.romanize(pattern);
                var pat = romPat === pattern
                    ? `\\b${Pali.romanizePattern(pattern)}` 
                    : pattern;
            } else {
                var pat = `\\b${pattern}`;
            }
            this.info(`phraseSearch(${pat},${lang})`);
            var grepArgs = Object.assign({}, args, {
                pattern:pat,
                lang,
                maxResults,
                tipitakaCategories,
                patPrimary,
            });
            var lines = await this.grep(grepArgs);
            return {
                method: 'phrase',
                lang,
                pattern:pat,
                lines,
            }
        }

        async keywordSearch(args) { try {
            var {
                pattern,
                maxResults,
                lang,
                searchLang,
                language, // DEPRECATED
                searchMetadata,
                comparator,
                tipitakaCategories,
                patPrimary,
            } = args;
            comparator = comparator || this.grepComparator;
            patPrimary = patPrimary || this.patPrimary;
            lang = lang || language || this.lang;
            maxResults = maxResults == null ? this.maxResults : maxResults;
            var keywords = this.patternKeywords(pattern);
            lang = searchLang == null
                ? this.patternLanguage(pattern, lang || language)
                : searchLang;
            var wordArgs = Object.assign({}, args, {
                maxResults: 0, // don't clip prematurely
                lang,
                patPrimary,
            });
            this.info(`keywordSearch(${keywords}) lang:${lang}`);
            var mrgOut = [];
            var mrgIn = [];
            for (var i=0; i< keywords.length; i++) {
                var keyword = keywords[i];
                wordArgs.pattern = this.keywordPattern(keyword, lang);
                var wordlines = await this.grep(wordArgs);
                wordlines.sort();  // sort for merging path
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
            lines = Seeker.orderPrimary(lines, patPrimary);
            if (maxResults) {
                lines = lines.slice(0,maxResults);
            }
            return({
                method: 'keywords',
                resultPattern: keywords
                    .map(k=> this.keywordPattern(k, lang))
                    .join('|'),
                lang,
                maxResults,
                lines,
            });
        } catch(e) {
            this.warn(`keywordSearch()`, JSON.stringify(args), e.message);
            throw e;
        }}

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
                includeUnpublished=this.includeUnpublished,
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
            (lang && !languages.includes(lang)) && languages.push(lang);
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
                includeUnpublished,
            }
        }

        clearMemo(name) {
            var cache = this.memoizer.cache;
            if (name === 'find') {
                return cache.clearVolume(`Seeker.callSlowFind`);
            } else if (name === 'grep') {
                return cache.clearVolume(`Seeker.slowGrep`);
            }
        }

        find(...args) {
            var {
                findMemo,
                memoizer,
            } = this;
            var findArgs = this.findArgs(args);
            var that = this;
            var callSlowFind = (args)=>{
                return that.slowFind.call(that, args);
            };
            var msStart = Date.now();
            //var pattern =  typeof args === 'string'
                //? args
                //: args[0].pattern;
            var pattern = findArgs.pattern;
            if (this.isExample(pattern)) {
                if (findMemo == null) {
                    that.findMemo = 
                    findMemo = memoizer.memoize(callSlowFind, Seeker);
                }
                var promise = findMemo(findArgs);
                this.debug(`find() example:${pattern}`);
            } else {
                this.info(`find() non-example:${pattern}`);
                var promise = callSlowFind(findArgs);
            }
            return promise;
        }

        slowFindId({ lang, languages, maxResults, pattern, }) { 
            var bd = this.bilaraData;
            var examples = bd.examples;
            var resultPattern = pattern;
            let method, uids, suttaRefs;

            if (!SuttaCentralId.test(pattern)) {
                return undefined;
            }

            maxResults = maxResults || this.maxResults;
            if (pattern.indexOf('/') < 0) {
                pattern = pattern.split(',')
                    .map(p=>`${p}/${lang}`)
                    .join(',');
            }
            let res = bd.sutta_uidSearch(pattern, maxResults);
            method = res.method;
            uids = res.uids;
            suttaRefs = res.suttaRefs;
            res.lang && (lang = res.lang);
            if (!languages.includes(lang)) {
                languages = [...languages.filter(l=>l!=='en'), lang];
            }
            this.debug(`slowFindId()`, {pattern, lang}, suttaRefs);

            return {
                lang,
                maxResults,
                pattern,
                method,
                uids,
                suttaRefs,
                languages,
            };
        }

        async slowFind(findArgs) { try {
            var msStart = Date.now();
            var {
                includeUnpublished,
                lang,
                languages,
                matchHighlight,
                maxDoc,
                maxResults,
                minLang,
                pattern,
                searchLang,
                showMatchesOnly,
                sortLines,
                tipitakaCategories,
                types,
            } = findArgs;
            var bd = this.bilaraData;
            var examples = bd.examples;
            var resultPattern = pattern;
            var scoreDoc = true;
            let method, uids, suttaRefs;

            if (examples[lang] && examples[lang].indexOf(pattern) >= 0) {
                searchLang = lang;
            }

            if (SuttaCentralId.test(pattern)) {
                let res = this.slowFindId({ lang, languages, maxResults, pattern, });
                lang = res.lang;
                maxResults = res.maxResults;
                pattern = res.pattern;
                method = res.method;
                uids = res.uids;
                suttaRefs = res.suttaRefs;
                languages = res.languages;
                scoreDoc = false;
            } else {
                let res = await this.slowFindPhrase({ 
                    lang, maxResults, pattern, searchLang, showMatchesOnly,
                    sortLines, tipitakaCategories, });
                method = res.method;
                resultPattern = res.resultPattern;
                sortLines = res.sortLines;
                suttaRefs = res.suttaRefs;
            } 

            var mlDocs = [];
            var segsMatched = 0;
            var bilaraPaths = [];
            var matchingRefs = [];
            var msStart = Date.now();
            for (var i = 0; i < suttaRefs.length; i++) {
                let suttaRef = suttaRefs[i];
                let [suid,refLang,author] = suttaRef.split('/');
                let suttaInfo = bd.suttaInfo(suttaRef);
                if (!suttaInfo) {
                    this.debug(`skipping ${suttaRef}`);
                    continue; 
                }
                let isBilDoc = bd.isBilaraDoc({ 
                    suid, 
                    lang:refLang||lang, 
                    author,
                    includeUnpublished,
                });
                let mld;
                if (isBilDoc) {
                    this.debug(`slowFind() -> loadMLDoc(${suid},${lang})`);
                    mld = await bd.loadMLDoc({
                        suid,
                        languages,
                        lang,
                        types,
                    });
                    var mldBilaraPaths = mld.bilaraPaths;
                    if (mldBilaraPaths.length < minLang) {
                        this.debug(`skipping ${mld.suid} minLang`,
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
                        //this.info(`Ignoring ${mld.suid} ${pattern}`);
                    } else if (mld.bilaraPaths.length >= minLang) {
                        if (Object.keys(mld.segMap).length ) {
                            mlDocs.push(mld);
                            matchingRefs.push(suttaRef);
                        } else {
                            this.info(`skipping ${mld.suid} segments:0`);
                        }
                    } else {
                        this.info(`skipping ${mld.suid} minLang:${minLang}`);
                    }
                } else {
                    let isBilDocUnpub = bd.isBilaraDoc({ 
                        suid, 
                        lang:refLang||lang, 
                        author,
                        includeUnpublished: true, 
                    });
                    if (isBilDocUnpub) {
                        this.debug(`slowFind() -> unpublished:`,
                            `${suid}/${refLang||lang}/${author}`);
                    } else {
                        this.debug(`slowFind() -> loadMLDocLegacy(${suid}/${lang})`);
                        mld = await bd.loadMLDocLegacy(suttaRef);
                        mlDocs.push(mld);
                        matchingRefs.push(suttaRef);
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
                    }
                }
            }
            var msElapsed = Date.now()-msStart;
            scoreDoc && mlDocs.sort(MLDoc.compare);
            mlDocs = mlDocs.slice(0, maxDoc);
            var result = {
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
            return result;
        } catch(e) {
            this.warn(`slowFind()`, JSON.stringify(findArgs), e.message);
            throw e;
        }}

        async slowFindPhrase({ lang, maxResults, pattern, searchLang, showMatchesOnly,
                sortLines, tipitakaCategories, }) { try {
            var msStart = Date.now();
            var bd = this.bilaraData;
            var examples = bd.examples;
            var resultPattern = pattern;
            var scoreDoc = true;
            let method, uids, suttaRefs;

            method = 'phrase';
            var searchOpts = {
                pattern, 
                searchLang,
                maxResults, 
                lang, 
                showMatchesOnly,
                tipitakaCategories,
            };


            var {
                lines,
                pattern: resultPattern,
            } = await this.phraseSearch(searchOpts);
            if (lines.length) {
                this.info(`findArgs phrase`, {resultPattern, lines:lines.length});
            } else {
                method = 'keywords';
                var data = await this.keywordSearch(searchOpts);
                var {
                    lines,
                    resultPattern,
                } = data;
                this.info(`findArgs keywords`, {resultPattern, lines:lines.length});
            }
            sortLines && lines.sort(sortLines);
            suttaRefs = lines.map(line =>BilaraPath.pathParts(line).suttaRef);
            this.debug(`findArgs suttaRefs`, suttaRefs);
            return {
                method,
                resultPattern,
                sortLines,
                suttaRefs,
            };
        } catch(e) {
            this.warn(`slowFindPhrase()`, 
                JSON.stringify({ 
                    lang, maxResults, pattern, searchLang, showMatchesOnly,
                    sortLines, tipitakaCategories, }), 
                e.message);
            throw e;
        }}

        static serialize(obj) {
            return JSON.stringify(obj, null, 2);
        }

        static deserialize(buf) {
            var json = JSON.parse(buf);
            var {
                volume,
                args,
                value,
            } = json;
            if (volume === 'Seeker.callSlowFind') {
                json.value.mlDocs = json.value.mlDocs.map(m=>new MLDoc(m));
            }
            return json;
        }

    }

    module.exports = exports.Seeker = Seeker;

})(typeof exports === "object" ? exports : (exports = {}));

