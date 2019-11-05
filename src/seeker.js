(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require('just-simple').JustSimple;
    const {
        exec,
    } = require('child_process');
    const FuzzyWordSet = require('./fuzzy-word-set');
    const BilaraPath = require('./bilara-path');
    const Pali = require('./pali');
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
            var root = this.root = opts.root || BILARA_PATH;
            logger.logInstance(this, opts);
            this.lang = opts.lang || 'en';
            this.languages = opts.languages || ['pli', 'en'];
            this.grepAllow = opts.grepAllow ||
                new RegExp("^[^/]+/(an|sn|mn|kn|dn)/","iu");
            this.grepDeny = opts.grepDeny ||
                new RegExp("/(dhp)/","iu");
            this.paliWords = opts.paliWords;
            this.bilaraData = opts.bilaraData || new BilaraData(opts);
            this.enWords = opts.enWords;
            this.matchColor = opts.matchColor == null ? 121 : opts.matchColor;
            this.matchHighlight = opts.matchHighlight || 
                `\u001b[38;5;${this.matchColor}m$&\u001b[0m`;
            this.matchWordEnd = opts.matchWordEnd;
            this.maxResults = opts.maxResults == null ? 5 : opts.maxResults;
            this.maxDoc = opts.maxDoc == null ? 5 : opts.maxDoc;
            this.minLang = opts.minLang || 2;
        }

        static sanitizePattern(pattern) {
            if (!pattern) {
                throw new Error("search pattern is required");
            }
            const MAX_PATTERN = 1024;
            var excess = pattern.length - MAX_PATTERN;
            if (excess > 0) {
                throw new Error(`Search text too long by ${excess} characters.`);
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
                    that.log(`Seeker.initialize resolve ${msg}`); 
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
            if (this.paliWords.contains(keyword)) {
                keyword = Pali.romanizePattern(keyword);
            }
            var pat = `\\b${keyword}`;
            if (this.matchWordEnd === undefined && lang === 'en') {
                pat += '\\b';
            } else if (this.matchWordEnd === true) {
                pat += '\\b';
            }
            return pat;
        }

        grep(opts) {
            var {
                pattern,
                maxResults,
                lang,
                language, // DEPRECATED
                searchMetadata, // TODO
            } = opts;
            var {
                grepAllow,
                grepDeny,
                root,
            } = this;
            lang = lang || language || this.lang;
            if (searchMetadata) {
                return Promise.reject(new Error(
                    `searchMetadata not supported`));
            }
            var grex = pattern;
            var cmd = `grep -rciE '${grex}' `+
                `--exclude-dir=.git `+
                `--exclude='*.md' `+
                `|grep -v ':0'`+
                `|sort -g -r -k 2,2 -k 1,1 -t ':'`;
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
                        var rawFiltered = raw.filter(f=>
                            grepAllow.test(f) && !grepDeny.test(f))
                            .map(f => path.join(pathPrefix, f));
                        resolve(rawFiltered);
                    }
                });
            });
        }

        phraseSearch(args) {
            this.validate();
            var that = this;
            var {
                lang,
                language,
                pattern,
                maxResults,
            } = args;
            lang = lang || language || this.lang;
            maxResults = maxResults == null ? this.maxResults : maxResults;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    if (pattern == null) {
                        throw new Error(`phraseSearch() requires pattern`);
                    }
                    lang = that.patternLanguage(pattern, lang);
                    pattern = lang === 'pli' 
                        ? `\\b${Pali.romanizePattern(pattern)}` 
                        : `\\b${pattern}`;
                    that.log(`phraseSearch(${pattern},${lang})`);
                    var grepArgs = Object.assign({}, args, {
                        pattern,
                        lang,
                        maxResults,
                    });
                    var lines = await that.grep(grepArgs);
                    resolve({
                        method: 'phrase',
                        lang,
                        pattern,
                        lines,
                    });
                } catch(e) { reject(e); }})();
            });
        }

        keywordSearch(args) {
            var {
                pattern,
                maxResults,
                lang,
                language, // DEPRECATED
                searchMetadata,
                comparator,
            } = args;
            comparator = comparator || this.grepComparator;
            var that = this;
            lang = lang || language || this.lang;
            maxResults = maxResults == null ? this.maxResults : maxResults;
            var keywords = this.patternKeywords(pattern);
            lang = this.patternLanguage(pattern, lang || language);
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
                        wordArgs.pattern = that.keywordPattern(keyword, lang);
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
                                var cmp = mrgIn[0].fpath.localeCompare(fpath);
                                if (cmp === 0) {
                                    var newItem = {
                                        fpath,
                                        count: Math.min(mrgIn[0].count, count),
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
                        resultPattern: keywords.join('|'),
                        lang,
                        maxResults,
                        lines,
                    });
                } catch(e) {reject(e);} })();
            });
        }

        findArgs(args) {
            var {
                pattern,
                lang,
                language, // DEPRECATED
                languages,
                minLang,    // minimum number of languages
                maxResults, // maximum number of grep files
                maxDoc,     // maximum number of returned documents
                matchHighlight,
                sortLines,
                filterSegments,
            } = typeof opts !== 'string' 
                ? args[0]
                : {
                    pattern: args[0],
                    maxResults: args[1],
                };
            if (pattern == null) {
                throw new Error(`pattern is required`);
            }
            pattern = Seeker.sanitizePattern(pattern);
            pattern = Seeker.normalizePattern(pattern);
            minLang = minLang || this.minLang;
            if (filterSegments == null) {
                filterSegments = true; //!SuttaCentralId.test(pattern);
            }
            lang = lang || language || 'en';
            languages = languages || this.languages || [];
            (lang && languages.indexOf(lang)<0) && languages.push(lang);
            maxResults = Number(
                maxResults==null ? this.maxResults : maxResults);
            if (isNaN(maxResults)) {
                throw new Error("maxResults must be a number");
            }
            maxDoc = Number(maxDoc==null ? this.maxDoc : maxDoc);
            matchHighlight = matchHighlight || this.matchHighlight;
            return {
                pattern,
                filterSegments,
                languages,
                maxResults,
                maxDoc,
                minLang,
                matchHighlight,
                sortLines,
                lang,
            }
        }

        find(...args) {
            var {
                pattern,
                lang,
                minLang,
                languages,
                sortLines,
                maxResults,
                maxDoc,
                matchHighlight,
                filterSegments,
            } = this.findArgs(args);
            var that = this;
            var bd = that.bilaraData;
            var pbody = (resolve, reject) => {(async function() { try {
                var resultPattern = pattern;
                if (SuttaCentralId.test(pattern)) {
                    var {
                        method,
                        uids,
                        suttaRefs,
                    } = bd.sutta_uidSearch(pattern, maxResults, lang);
                } else {
                    var method = 'phrase';
                    var searchOpts = {
                        pattern, 
                        maxResults, 
                        lang, 
                        filterSegments,
                    };

                    var {
                        lines,
                        pattern: resultPattern,
                    } = await that.phraseSearch(searchOpts);
                    if (!lines.length) {
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
                }

                var mlDocs = [];
                var searchLang = that.patternLanguage(pattern, lang);
                var bilaraPaths = [];
                for (var i = 0; i < suttaRefs.length; i++) {
                    let suttaRef = suttaRefs[i];
                    let [suid,lang,author] = suttaRef.split('/');
                    let mld = await bd.loadMLDoc({
                        suid: bd.isSourceDoc({suid,lang,author})
                            ? suid : suttaRef,
                        languages,
                    });
                    bilaraPaths = [...bilaraPaths, ...mld.bilaraPaths];
                    if (filterSegments) {
                        mld.filterSegments(resultPattern, [searchLang]);
                        mld.highlightMatch(resultPattern, matchHighlight);
                    }
                    if (mld.bilaraPaths.length >= minLang) {
                        if (mlDocs.length >= maxDoc) {
                            break;
                        }
                        mlDocs.push(mld);
                    }
                }
                resolve({
                    lang,
                    searchLang,
                    maxResults,
                    maxDoc,
                    method,
                    minLang,
                    resultPattern,
                    bilaraPaths,
                    suttaRefs,
                    mlDocs,
                });
            } catch(e) {reject(e);}})()};
            return new Promise(pbody);
        }

    }

    module.exports = exports.Seeker = Seeker;

})(typeof exports === "object" ? exports : (exports = {}));

