(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require('just-simple').JustSimple;
    const {
        execSync,
    } = require('child_process');
    const SegDoc = require('./seg-doc');
    const SuttaCentralId = require('./sutta-central-id');
    const FuzzyWordSet = require('./fuzzy-word-set');
    const Pali = require('./pali');
    const ExecGit = require('./exec-git');

    const BILARA_DATA_GIT = 'https://github.com/sc-voice/bilara-data.git';
    const NIKAYAS_PATH = path.join(__dirname, '../src/assets/nikayas.json');
    const NIKAYAS = JSON.parse(fs.readFileSync(NIKAYAS_PATH));

    class BilaraData {
        constructor(opts={}) {
            this.name = opts.name || 'bilara-data';
            this.root = opts.root || path.join(LOCAL_DIR, 'bilara-data');
            logger.logInstance(this, opts);
            this.nikayas = opts.nikayas || [
                'an','mn','dn','sn', 'kn/thig', 'kn/thag'
            ];
            this.execGit = opts.execGit || new ExecGit({
                repo: BILARA_DATA_GIT,
                logLevel: this.logLevel,
            });
            this.reNikayas = new RegExp(
                `/(${this.nikayas.join('|')})/`, 'ui');
            Object.defineProperty(this, "_suttaMap", {
                writable: true,
                value: null,
            });
            Object.defineProperty(this, "_suttaIds", {
                writable: true,
                value: null,
            });
            this.initialized = false;
        }

        initialize() {
            if (this.initialized) {
                return Promise.resolve(this);
            }
            return new Promise((resolve, reject) => {
                var that = this;
                (async function() { try {
                    await that.sync();

                    var map = that.suttaMap = {};
                    var rootPath = path.join(that.root, 'root');
                    if (!fs.existsSync(rootPath)) {
                        throw new Error(
                            `Root document directory not found:${rootPath}`); 
                    }
                    that.rootFiles = that.dirFiles(rootPath)
                        .filter(f => that.isSuttaPath(f));
                    that.rootFiles.forEach((f,i) => {
                        var file = f.replace(/.*\/root\//,'root/');
                        var parts = file.split('/');
                        var lang = parts[1];
                        var author = parts[2];
                        var nikaya = parts[3];
                        var suid = parts[parts.length-1].split('_')[0].toLowerCase();
                        map[suid] = map[suid] || [];
                        map[suid].push({
                            suid,
                            lang,
                            nikaya,
                            author,
                            bilaraPath: file,
                        });
                    });

                    var transPath = path.join(that.root, 'translation');
                    if (!fs.existsSync(transPath)) {
                        throw new Error(
                            `Translation directory not found:${transPath}`); 
                    }
                    that.translations = that.dirFiles(transPath)
                        .filter(f => that.isSuttaPath(f));
                    that.translations.forEach((f,i) => {
                        var file = f.replace(/.*\/translation\//,'translation/');
                        var parts = file.split('/');
                        var lang = parts[1];
                        var author = parts[2];
                        var nikaya = parts[3];
                        var suid = parts[parts.length-1].split('_')[0].toLowerCase();
                        map[suid] = map[suid] || [];
                        map[suid].push({
                            suid,
                            lang,
                            nikaya,
                            author,
                            bilaraPath: file,
                        });
                    });
                    var uidExpPath = path.join(that.root, 
                        '.voice', 'uid_expansion.json');
                    that.uid_expansion = JSON.parse(fs.readFileSync(uidExpPath));

                    that.paliWords = await Pali.wordSet();

                    that.initialized = true;
                    resolve(that);
                } catch(e) {reject(e);} })();
            });
        }

        get suttaIds() {
            if (this._suttaIds == null) {
                this._suttaIds = Object.keys(this.suttaMap)
                    .sort(SuttaCentralId.compareLow);
            }

            return this._suttaIds;
        }

        sync() {
            return this.execGit.sync();
        }

        isSuttaPath(fpath) {
            return this.reNikayas.test(fpath);
        }

        suttaInfo(suid) {
            if (!this.initialized) {
                throw new Error('Expected preceding call to initialize()');
            }
            return this.suttaMap[suid];
        }

        dirFiles(root) {
            var files = [];
            var cmd = `find ${root} -path '*.git*' -prune -o -type f -print`;
            var execOpts = {
                cwd: LOCAL_DIR,
            };
            var res = execSync(cmd, execOpts).toString();
            return res.split('\n');
        }

        loadTranslation(...args) {
            if (typeof args[0] === 'string') {
                var opts = {
                    suid: args[0],
                    lang: args[1] || 'en',
                    author: args[2],
                }
            } else {
                var opts = args[0] || {};
            }
            opts.lang = opts.lang || 'en';
            return this.loadSegDoc(opts);
        }

        loadSegDoc(opts={}) {
            if (!this.initialized) {
                throw new Error('Expected preceding call to initialize()');
            }
            var {
                suid,
                lang,
                author,
                logLevel,
            } = opts;
            lang = lang || 'pli';
            var info = this.suttaInfo(suid);
            if (info == null) {
                return new Error(`no suttaInfo({suid:${suid})`);
            }
            info.sort((a,b) => {
                try {
                    var cmp = a.lang.localeCompare(b.lang);
                    if (cmp === 0) {
                        cmp = a.author.localeCompare(b.author);
                    }
                } catch(e) {
                    logger.error(`a:${js.simpleString(a)} `);
                    logger.error(`b:${js.simpleString(b)} `);
                    throw e;
                }
            });
            if (lang == null && author == null) {
                lang = info[0].lang;
                author = info[0].author;
            }
            var suttaInfo = info.filter( i => 
                (!lang || i.lang === lang) && 
                (!author || i.author === author)
            )[0];
            if (suttaInfo == null || suttaInfo.bilaraPath == null) {
                this.log(`loadSegDoc(${suid}) info:${js.simpleString(info)}`);
                throw new Error(
                    `No information for ${suid}/${lang}/${author}`);
            }
            suttaInfo.logLevel = logLevel === undefined
                ? this.logLevel : logLevel;
            return new SegDoc(suttaInfo).load(this.root);
        }

        normalizeSuttaId(id) {
            if (!this.initialized) {
                throw new Error(`${this.constructor.name}.initialize() required`);
            }
            var {
                suttaMap,
                uid_expansion,
            } = this;
            var suttaIds = Object.keys(suttaMap);
            if (typeof id !== 'string') {
                if (id.scid) {
                    id = id.scid;
                } else {
                    throw new Error(`expected string:${JSON.stringify(id)}`);
                }
            }
            id = id.trim();
            var sutta_uid = null;
            if (/[^0-9][1-9]/.test(id)) {
                var tokens = id.toLowerCase().split(' ');
                if (tokens.length > 1) {
                    var matches = uid_expansion.filter(ue => 
                        0 === ue.acro.toLowerCase().localeCompare(tokens[0]));
                    if (matches.length > 0) {
                        sutta_uid = `${matches[0].uid}${tokens.slice(1).join('')}`;
                    }
                }
                sutta_uid = sutta_uid || id;
            }
            sutta_uid = sutta_uid && suttaIds.filter(sid => {
                return SuttaCentralId.compareLow(sid, sutta_uid) <= 0 &&
                    0 <= SuttaCentralId.compareHigh(sid, sutta_uid);
            })[0] || sutta_uid;
            return sutta_uid;
        }

        suttaPath(...args) { // DEPRECATED: use translationPaths
            this.log(`DEPRECATED: suttaPath => translationPaths`);
            return this.translationPaths.apply(this, args)[0];
        }

        translationPaths(...args) {
            if (!this.initialized) {
                throw new Error(`${this.constructor.name}.initialize() is required`);
            }
            var opts = args[0];
            if (typeof opts === 'string') {
                var opts = {
                    scid: args[0],
                    lang: args[1],
                    //language: args[1], // DEPRECATED
                    author_uid: args[2],
                }
            }
            // TODO mn1/en/sujato sutta_uid
            var scid = new SuttaCentralId(opts.scid || opts.sutta_uid);
            var sutta_uid = this.normalizeSuttaId(scid.sutta);
            if (!sutta_uid) {
                throw new Error('sutta_uid is required');
            }
            var lang = opts.lang || 'en';
            var author = opts.author_uid;
            var translations = this.suttaMap[sutta_uid] || [];
            return translations
                .filter(t => t.lang === lang && !author || author === t.author)
                .map(t => path.join(this.root, t.bilaraPath));
        }

        nikayaSuttaIds(nikaya, lang='pli', author) {
            var that = this;
            if (nikaya == null) {
                return Promise.reject(new Error(
                    `nikayaSuttaIds() nikaya is required`));
            }
            var reNikaya = author
                ? new RegExp(`.*/${lang}/${author}/.*${nikaya}/`)
                : new RegExp(`.*/${lang}/.*/${nikaya}/`);
            return new Promise((resolve, reject) => {
                (async function() { try {
                    await that.initialize();
                    var srcFiles = lang === 'pli' 
                        ? that.rootFiles 
                        : that.translations;
                    var sutta_uids = srcFiles.reduce((a,t) => {
                        if (reNikaya.test(t)) {
                            var f = path.basename(t, '.json');
                            var sutta_uid = f.replace(/_.*$/,'');
                            a.push(sutta_uid);
                        }
                        return a;
                    }, []);
                    var cmp = SuttaCentralId.compareLow;
                    sutta_uids.sort(cmp);
                    resolve(sutta_uids);
                } catch(e) {reject(e);} })();
            });
        }

        suttaIndex(suttaRef, strict=true) {
            if (!this.initialized) {
                throw new Error("initialize() is required");
            }
            if (suttaRef == null) {
                throw new Error("suttaIndex(suttaRef?)");
            }
            var sutta_uid = suttaRef.split('/')[0];
            var iEnd = this.suttaIds.length;
            var i1 = 0;
            var i2 = iEnd;
            var cmp;
            while (i1 <= i2) {
                var i = Math.trunc((i1+i2)/2);
                var sf = this.suttaIds[i];
                cmp = SuttaCentralId.compareLow(sutta_uid, sf);

                if (cmp === 0) {
                    return i;
                }
                if (cmp < 0) {
                    if (i < i2) {
                        i2 = i;
                    } else {
                        break;
                    }
                } else if (i1 < i) { // cmp > 0
                    i1 = i;
                } else {
                    break;
                }
            }
            if (cmp < 0) {
                return i === 0 ? null : i;
            } 
            if (strict) {
                var uidNext = this.sutta_uidSuccessor(this.suttaIds[i], true);
                var cmpNext = SuttaCentralId.compareLow(sutta_uid, uidNext);
                if (cmpNext < 0) {
                    return i;
                }
                return null;
            }
            return i;
        }

        sutta_uidSuccessor(sutta_uid, logical) {
            var prefix = sutta_uid.replace(/[-0-9.:]*$/u, '');
            var dotParts = sutta_uid.substring(prefix.length).split(".");
            var dotLast = dotParts.length-1;
            var rangeParts = sutta_uid.split("-");
            var rangeLast = rangeParts.length - 1;
            if (logical) { // logical
                dotParts[dotParts.length-1] = (rangeParts.length < 2) 
                    ? `${Number(dotParts[dotLast])+1}`
                    : `${Number(rangeParts[rangeLast])+1}`;
                var uidEnd = prefix+dotParts.join(".");
                return uidEnd;
            } else { // physical
                dotParts[dotParts.length-1] = (rangeParts.length < 2) 
                    ? `${Number(dotParts[dotLast])}`
                    : `${Number(rangeParts[rangeLast])}`;
                var uidLast = prefix+dotParts.join(".");
                var iLast = this.suttaIndex(uidLast, false);
                var uidNext = this.suttaIds[iLast+1];
                return uidNext;
            }
        }

        suttaList(list) {
            if (typeof list === 'string') {
                list = list.split(',');
            }
            try {
                return list.reduce((acc, item) => {
                    var suttaRef = item.toLowerCase().replace(/ /gu, '');
                    this.expandRange(suttaRef).forEach(item => acc.push(item));
                    return acc;
                }, []);
            } catch (e) {
                throw e;
            }
        }

        expandRange(suttaRef) {
            var reCname = new RegExp("[-.:0-9.].*", "u");
            var cname = suttaRef.replace(reCname, '');
            var suffix = suttaRef.replace(/[^/]*([a-z\/]*)$/iu, '$1');
            var sref = suttaRef.replace(suffix, '');
            var range = sref.substring(cname.length);
            if (/^[-a-z]+$/.test(range)) { 
                // e.g., kusalagnana-maitrimurti-traetow
                return [ suttaRef ];
            }
            var coll = Object.keys(NIKAYAS).reduce((acc,ck) => {
                var c = NIKAYAS[ck];
                return acc || cname === c.name && c;
            }, false);
            var result = [];
            if (!coll) { // no collection
                throw new Error(`Unrecognized sutta collection: ${suttaRef} [E4]`);
            }
            var rangeParts = range.split('-');
            var dotParts = rangeParts[0].split('.');
            if (dotParts.length > 2) {
                throw new Error(`Invalid sutta reference: ${suttaRef} [E3]`);
            }
            if (coll.subchapters) { // e.g., SN, AN, KN
                if (dotParts.length === 1) { // e.g. SN50
                    var prefix = `${sref}.`;
                    var first = rangeParts.length === 1 ? 1 : Number(rangeParts[0]);
                    var last = rangeParts.length === 1 ? 999 : Number(rangeParts[1]);
                } else if (rangeParts.length === 1) {
                    var prefix = `${cname}${dotParts[0]}.`;
                    rangeParts[0] = dotParts[1];
                    var first = Number(rangeParts[0]);
                    var last = first;
                } else { // e.g., SN50.1
                    var prefix = `${cname}${dotParts[0]}.`;
                    var first = Number(dotParts[1]);
                    var last = Number(rangeParts[1]);
                }
                if (isNaN(first) || isNaN(last)) {
                    throw new Error(`Invalid sutta reference: ${suttaRef} [E1]`);
                }
                var firstItem = `${prefix}${first}`;
                var iCur = this.suttaIndex(firstItem, false);
                if (iCur == null) {
                    throw new Error(`Sutta ${firstItem} not found`);
                }
                var endUid = this.sutta_uidSuccessor(`${prefix}${last}`);
                var iEnd = endUid && this.suttaIndex(endUid) || (iCur+1);
                for (var i = iCur; i < iEnd; i++) {
                    result.push(`${this.suttaIds[i]}${suffix}`);
                }
            } else { // e.g., MN, DN
                if (rangeParts.length === 1) {
                    var first = Number(rangeParts[0]);
                    var last = first;
                } else {
                    var first = Number(rangeParts[0]);
                    var last = Number(rangeParts[1]);
                }
                if (isNaN(first) || isNaN(last)) {
                    throw new Error(`Invalid sutta reference: ${suttaRef} [E2]`);
                }
                var firstItem = `${cname}${first}`;
                var iCur = this.suttaIndex(firstItem, false);
                if (iCur == null) {
                    throw new Error(`Sutta ${firstItem} not found`);
                }
                var lastItem = `${cname}${last}`;
                var endUid = this.sutta_uidSuccessor(lastItem);
                var iEnd = this.suttaIndex(endUid);
                for (var i = iCur; i < iEnd; i++) {
                    result.push(`${this.suttaIds[i]}${suffix}`);
                }
            }
            return result;
        }

        sutta_uidSearch(pattern, maxResults=5, lang='en') {
            var method = 'sutta_uid';
            var uids = this.suttaList(pattern).slice(0, maxResults);
            var suttaRefs = uids.map(ref => {
                var refParts = ref.split('/');
                var uid = refParts[0];
                var refLang = refParts[1] || lang;
                var refTranslator = refParts[2];
                return refTranslator 
                    ? `${uid}/${refLang}/${refTranslator}`
                    : `${uid}/${refLang}`;
            });

            return {
                method,
                uids,
                suttaRefs,
            }
        }

    }

    module.exports = exports.BilaraData = BilaraData;
})(typeof exports === "object" ? exports : (exports = {}));
