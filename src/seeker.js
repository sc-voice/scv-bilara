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
            this.matchWordEnd = opts.matchWordEnd;
            this.maxResults = opts.maxResults == null ? 5 : opts.maxResults;
            this.minLang = opts.minLang || 2;
        }

        static isUidPattern(pattern) {
            var commaParts = pattern.toLowerCase().split(',').map(p=>p.trim());
            return commaParts.reduce((acc,part) => {
                return acc && /^[a-z]+ ?[0-9]+[-0-9a-z.:\/]*$/i.test(part);
            }, true);
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
            return this.paliWords != null && this.enWords != null;
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
            maxResults = maxResults == null ? this.maxResults : maxResults;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    if (pattern == null) {
                        throw new Error(`phraseSearch() requires pattern`);
                    }
                    lang = that.patternLanguage(pattern, lang || language);
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

        findSuttas(...args) { // DEPRECATED
            return this.find.apply(this, args);
        }

        findArgs(args) {
            var {
                pattern,
                lang,
                language, // DEPRECATED
                languages,
                minLang,    // minimum number of languages
                maxResults,
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
                filterSegments = !Seeker.isUidPattern(pattern);
            }
            lang = lang || language || 'en';
            languages = languages || this.languages || [];
            (lang && languages.indexOf(lang)<0) && languages.push(lang);
            var maxResults = Number(
                maxResults==null ? this.maxResults : maxResults);
            if (isNaN(maxResults)) {
                throw new Error("maxResults must be a number");
            }
            return {
                pattern,
                filterSegments,
                languages,
                maxResults,
                minLang,
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
                filterSegments,
            } = this.findArgs(args);
            var that = this;
            var bd = that.bilaraData;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    var resultPattern = pattern;
                    if (Seeker.isUidPattern(pattern)) {
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
                    var nResults = Math.min(maxResults, suttaRefs.length);
                    for (var i = 0; i < nResults; i++) {
                        var mld = await bd.loadMLDoc({
                            suid: suttaRefs[i],
                            languages,
                        });
                        if (filterSegments) {
                            mld.filterSegments(resultPattern, languages);
                        }
                        if (mld.bilaraPaths.length >= minLang) {
                            mlDocs.push(mld);
                        }
                    }
                    resolve({
                        method,
                        suttaRefs,
                        maxResults,
                        minLang,
                        mlDocs,
                        resultPattern,
                        lang,
                    });
                } catch(e) {reject(e);} })();
            });
        }



    }

    module.exports = exports.Seeker = Seeker;

    /*`
    const {
        logger,
    } = require('rest-bundle');
    const {
        exec,
    } = require('child_process');
    const Playlist = require('./playlist');
    const Sutta = require('./sutta');
    const Task = require('./task');
    const SuttaDuration = require('./sutta-duration');
    const SuttaCentralApi = require('./sutta-central-api');
    const SuttaCentralId = require('./sutta-central-id');
    const SuttaFactory = require('./sutta-factory');
    const Words = require('./words');
    const ROOT = path.join(__dirname, '..', '..', 'local', 'suttas');
    const maxBuffer = 10 * 1024 * 1024;
    const SUTTAIDS_PATH = path.join(__dirname, '..', '..', 'src', 'node', 'sutta-ids.json');

    var suttaPaths = {};
    var supportedSuttas = {}; // from https://github.com/sc-voice/scv-suttas

    class SuttaStore {
        constructor(opts={}) {
            this.suttaCentralApi = opts.suttaCentralApi || new SuttaCentralApi();
            this.suttaFactory = opts.suttaFactory || new SuttaFactory({
                suttaCentralApi: this.suttaCentralApi,
                autoSection: true,
            });
            this.suttaIds = opts.suttaIds;
            this.maxDuration = opts.maxDuration || 3 * 60 * 60;
            this.root = opts.root || ROOT;
            this.maxResults = opts.maxResults || 5;
            this.voice = opts.voice;
            this.words = opts.words || new Words();
            this.suttaDuration = opts.suttaDuration || new SuttaDuration();
            Object.defineProperty(this, 'isInitialized', {
                writable: true,
                value: false,
            });
        }

        grepSearchResults(args) {
            var {
                lines,
                pattern,
                sortLines,
            } = args;
            var rexlang = new RegExp(`\\b${pattern}\\b`,'i');
            var rexpli = new RegExp(`\\b${pattern}`,'i');
            sortLines && lines.sort(sortLines);
            return lines.length && lines.map(line => {
                var iColon = line.indexOf(':');
                var fname = path.join(ROOT,line.substring(0,iColon));
                try {
                    var fnameparts = fname.split('/');
                    var collection_id = fnameparts[fnameparts.length-4];
                    var text = fs.readFileSync(fname);
                    var json = JSON.parse(text);
                    var sutta = new Sutta(json);
                } catch(e) {
                    logger.warn(`${e.message} fname:${fname}`);
                    throw e;
                }
                sutta = this.suttaFactory.sectionSutta(sutta);
                var stats = this.suttaDuration.measure(sutta);
                var suttaplex = sutta.suttaplex;
                var nSegments = sutta.segments.length;
                var translation = sutta.translation;
                var lang = translation.lang;
                var quote = sutta.segments.filter(seg => 
                    seg[lang] && 
                    (rexlang.test(seg[lang]) || rexpli.test(seg.pli))
                )[0];
                if (quote == null || !quote[lang]) {
                    // Pali search with no translated text
                    quote = sutta.segments[1]; // usually title
                }
                var count = Number(line.substring(iColon+1));
                var score = count + count/nSegments;
                return {
                    count: Number(line.substring(iColon+1)),
                    uid: translation.uid,
                    author: translation.author,
                    author_short: translation.author_short,
                    author_uid: translation.author_uid,
                    author_blurb: translation.author_blurb,
                    lang,
                    nSegments,
                    score,
                    stats,
                    title: translation.title,
                    collection_id,
                    suttaplex,
                    quote,
                    sutta
                }
            }) || [];
        }

        suttaSearchResults(args) {
            var {
                suttaRefs,
                lang,
                maxResults,
            } = args;
            var that = this;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    var results = [];
                    for (var i = 0; i < Math.min(maxResults,suttaRefs.length); i++) {
                        var ref = suttaRefs[i];
                        var refParts = ref.split('/');
                        var uid = refParts[0];
                        var refLang = refParts[1] || lang;
                        var refTranslator = refParts[2];
                        if (refTranslator == null) {
                            var localPath = suttaPaths[that.root]
                                .filter(sp => sp.indexOf(uid) >= 0)[0];
                            var suttaPath = path.join(that.root, localPath);
                            var spParts = suttaPath.split('/');
                            refTranslator = spParts[spParts.length-2];
                        }
                        var collection_id = uid.replace(/[-0-9.:]*$/,'');
                        var sutta = await that.suttaFactory.loadSutta({
                            scid: uid,
                            translator: refTranslator,
                            language: refLang,
                            expand: true,
                        });
                        var stats = that.suttaDuration.measure(sutta);
                        var suttaplex = sutta.suttaplex;
                        var nSegments = sutta.segments.length;
                        var translation = sutta.translation;
                        results.push({
                            count: 1,
                            uid: translation.uid,
                            author: translation.author,
                            author_short: translation.author_short,
                            author_uid: translation.author_uid,
                            author_blurb: translation.author_blurb,
                            lang,
                            stats,
                            nSegments,
                            title: translation.title,
                            collection_id,
                            suttaplex,
                            quote: sutta.segments[1], // usually title
                            sutta,
                        });
                    }
                    resolve(results);
                } catch(e) { reject(e); } })();
            });
        }

        voiceResults(grepSearchResults, lang) {
            var voice = this.voice;
            if (voice == null) {
                return Promise.resolve(grepSearchResults);
            }
            return new Promise((resolve, reject) => {
                (async function() { try {
                    for (var i = 0; i < grepSearchResults.length; i++) {
                        var result = grepSearchResults[i];
                        var quote = result.quote;
                        result.audio = {
                            [lang]: null,
                            pli: null,
                        };
                        if (quote[lang] != null) {
                            var vr = await voice.speak(quote[lang]);
                            result.audio[lang] = vr.signature.guid;
                            logger.debug(`voiceResults(${quote.scid}) `+
                                `${lang}:${vr.signature.guid}`);
                        }
                        if (quote.pli != null) {
                            var vr = await voice.speak(quote.pli);
                            result.audio.pli = vr.signature.guid;
                            logger.debug(`voiceResults(${quote.scid}) `+
                                `pli:${vr.signature.guid}`);
                        }
                    }
                    resolve(grepSearchResults);
                } catch(e) {reject(e);} })();
            });
        }

        createPlaylist(...args) {
            var that = this;
            var opts = args[0];
            if (typeof opts === 'string') {
                opts = {
                    pattern: args[0],
                    maxResults: args[1],
                };
            }
            return new Promise((resolve, reject) => {
                (async function() { try {
                    var {
                        language,
                        method,
                        suttaRefs,
                        suttas,
                        resultPattern,
                    } = await that.findSuttas(opts);
                    var maxDuration = opts.maxDuration || that.maxDuration;
                    var playlist = new Playlist({
                        languages: opts.languages || ['pli', language],
                    });
                    suttas.forEach(sutta => {
                        playlist.addSutta(sutta);
                    });
                    var duration = playlist.stats().duration;
                    if (duration > that.maxDuration) {
                        playlist = new Playlist({
                            languages: opts.languages || [language],
                        });
                        var minutes = (that.maxDuration / 60).toFixed(0);
                        playlist.addTrack("createPlaylist_error1", 
                            `Play list is too long to be played. `+
                            `All play lists must be less than ${minutes} minutes long`);
                    }
                    resolve(playlist);
                } catch(e) {reject(e);} })();
            });
        }

        findSuttas(...args) {
            var that = this;
            var opts = args[0];
            if (typeof opts === 'string') {
                opts = {
                    pattern: args[0],
                    maxResults: args[1],
                };
            }
            var searchMetadata = opts.searchMetadata == null 
                ? false 
                : opts.searchMetadata == true || opts.searchMetadata === 'true';
            var pattern = SuttaStore.sanitizePattern(opts.pattern);
            var language = opts.language || 'en';
            var maxResults = Number(
                opts.maxResults==null ? that.maxResults : opts.maxResults);
            if (isNaN(maxResults)) {
                throw new Error("SuttaStore.search() maxResults must be a number");
            }
            var sortLines = opts.sortLines;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    if (SuttaStore.isUidPattern(pattern)) {
                        var {
                            method,
                            uids,
                            suttaRefs,
                        } = that.sutta_uidSearch(pattern, maxResults, language);
                    } else {
                        var method = 'phrase';
                        var lines = [];
                        pattern = SuttaStore.normalizePattern(pattern);
                        var searchOpts = {
                            pattern, 
                            maxResults, 
                            language, 
                            searchMetadata
                        };

                        if (!lines.length && !/^[a-z]+$/iu.test(pattern)) {
                            lines = await that.phraseSearch(searchOpts);
                        }
                        var resultPattern = pattern;
                        if (!lines.length) {
                            var method = 'keywords';
                            var data = await that.keywordSearch(searchOpts);
                            lines = data.lines;
                            resultPattern = data.resultPattern;
                        }
                        sortLines && lines.sort(sortLines);
                        var suttaRefs = lines.map(line => {
                            var iColon = line.indexOf(':');
                            var pathParts = line.substring(0,iColon).split('/');
                            var suttaRef = 
                                pathParts[3].replace(/.json/,'') + '/' +
                                pathParts[1] + '/' +
                                pathParts[2];
                            return suttaRef;
                        });
                    }
                    var suttas = [];
                    for (var i = 0; i < suttaRefs.length; i++) {
                        var refParts = suttaRefs[i].split('/');
                        var sutta = await that.suttaFactory.loadSutta({
                            scid: refParts[0],
                            language: refParts[1],
                            translator: refParts[2],
                            expand: true,
                        });
                        suttas.push(sutta);
                    }
                    resolve({
                        method,
                        suttaRefs,
                        suttas,
                        resultPattern,
                        language,
                    });
                } catch(e) {reject(e);} })();
            });
        }

        search(...args) { 
            // implementation deprecated. should use findSuttas
            var that = this;
            var opts = args[0];
            if (typeof opts === 'string') {
                opts = {
                    pattern: args[0],
                    maxResults: args[1],
                };
            }
            var searchMetadata = opts.searchMetadata == null 
                ? false 
                : opts.searchMetadata == true || opts.searchMetadata === 'true';
            var pattern = SuttaStore.sanitizePattern(opts.pattern);
            var language = opts.language || 'en';
            var maxResults = opts.maxResults==null ? that.maxResults : opts.maxResults;
            var maxResults = Number(maxResults);
            var sortLines = opts.sortLines;
            if (isNaN(maxResults)) {
                throw new Error("SuttaStore.search() maxResults must be a number");
            }
            return new Promise((resolve, reject) => {
                (async function() { try {
                    if (SuttaStore.isUidPattern(pattern)) {
                        var method = 'sutta_uid';
                        logger.info(`SuttaStore.search(${pattern})`+
                            `lang:${language} `+
                            `maxResults:${maxResults}`);
                        var uids = that.suttaList(pattern).slice(0, maxResults);
                        var results = await that.suttaSearchResults({
                            suttaRefs: uids, 
                            lang: language,
                            maxResults,
                        });
                    } else {
                        var method = 'phrase';
                        var lines = [];
                        pattern = SuttaStore.normalizePattern(pattern);
                        var searchOpts = {
                            pattern, 
                            maxResults, 
                            language, 
                            searchMetadata
                        };

                        if (!lines.length && !/^[a-z]+$/iu.test(pattern)) {
                            lines = await that.phraseSearch(searchOpts);
                        }
                        var resultPattern = pattern;
                        if (!lines.length) {
                            var method = 'keywords';
                            var data = await that.keywordSearch(searchOpts);
                            lines = data.lines;
                            resultPattern = data.resultPattern;
                        }
                        var grepSearchResults = that.grepSearchResults({
                            lines,
                            sortLines,
                            pattern: resultPattern,
                        });
                        var results = await that.voiceResults(grepSearchResults, language);
                    }
                    resolve({
                        method,
                        results,
                        resultPattern,
                    });
                } catch(e) {reject(e);} })();
            });
        }

    }

    module.exports = exports.SuttaStore = SuttaStore;
*/
})(typeof exports === "object" ? exports : (exports = {}));

