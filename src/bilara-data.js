(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const json5 = require("json5");
    const {
        readFile,
    } = fs.promises;
    const { logger } = require("log-instance");
    const {
        execSync,
    } = require('child_process');
    const {
        Memoizer,
        MemoCache,
        Files,
    } = require('memo-again');
    const {
        ScApi,
    } = require('suttacentral-api');
    const SegDoc = require('./seg-doc');
    const MLDoc = require('./ml-doc');
    const BilaraPath = require('./bilara-path');
    const SuttaCentralId = require('./sutta-central-id');
    const FuzzyWordSet = require('./fuzzy-word-set');
    const Publication = require('./publication');
    const Pali = require('./pali');
    const English = require('./english');
    const ExecGit = require('./exec-git');
    const PUB_PREFIX = /^https:.*translation\//;
    const ROOT_PLI_MS = path.join("root", "pli", "ms");
    const STUBFILESIZE = 10;
    const MAXBUFFER = 10 * 1024 * 1024;

    class BilaraData {
        constructor(opts={}) {
            (opts.logger || logger).logInstance(this, opts);
            this.name = opts.name || 'bilara-data';
            this.root = opts.root || path.join(Files.LOCAL_DIR, this.name);
            this.log(`root:${this.root}`);
            this.lang = opts.lang || 'en';
            this.branch = opts.branch;
            this.scApi = opts.scApi || new ScApi();
            var includeUnpublished = opts.includeUnpublished == null 
                ? false : opts.includeUnpublished;
            this.publication = opts.publication || new Publication({
                includeUnpublished,
                root: this.root,
            });
            this.bilaraPathMap = this.publication.bilaraPathMap;
            this.execGit = opts.execGit || new ExecGit({
                repo: `https://github.com/sc-voice/${this.name}.git`,
                logger: this,
            });
            this.languages = opts.languages || [ 'pli', this.lang ];
            this.authors = {};
            Object.defineProperty(this, "_sources", {
                writable: true,
                value: null,
            });
            Object.defineProperty(this, "_suttaIds", {
                writable: true,
                value: null,
            });
            this.initialized = false;
        }

        get includeUnpublished() {
            return this.publication.includeUnpublished;
        }

        set includeUnpublished(value) {
            return this.publication.includeUnpublished = value;
        }

        isBilaraDoc({suid, lang, author}) {
            let {
                bilaraPathMap: bpm,
            } = this;
            let sp = bpm.suidPaths(suid);
            let spKeys = Object.keys(sp);
            if (lang) {
                spKeys = spKeys.filter(p=>p.indexOf(`/${lang}/`) >= 0);
            }
            if (author) {
                spKeys = spKeys.filter(p=>p.endsWith(author));
            }
            return spKeys.length > 0;
        }

        initialize(sync=false) {
            if (this.initialized) {
                return Promise.resolve(this);
            }
            var that = this;
            var {
                root,
                authors,
            } = that;
            var pbody = (resolve, reject) => {(async function() { try {
                var version = that.version();
                var EXPECTED_VERSION = 1
                var purge = false;
                if (version.major < EXPECTED_VERSION) {
                    that.log(`Expected bilara-data version `+
                        `actual:${version.major} `+
                        `expected:${EXPECTED_VERSION} `+
                        `(re-cloning repository...)`);
                    purge = true;
                }
                (sync || purge) && await that.sync({
                    purge,
                    initializing: true,
                });
                if (that.branch) {
                    let res = await that.execGit.branch(that.branch);
                    that.log(`initialize: ${res.stdout} ${res.stderr}`);
                }
                await that.publication.initialize();
                await that.scApi.initialize();
                let langPath = path.join(that.root, '_language.json');
                that.languageInfo = JSON.parse(
                    await fs.promises.readFile(langPath));

                let authPath = path.join(that.root, `_author.json`);
                let authorJson = fs.existsSync(authPath)
                    ? json5.parse(await readFile(authPath)) 
                    : {};
                that.addAuthor('ms', Object.assign({
                    lang: 'pli'
                }, authorJson.ms));
                var suttaMap = that.suttaMap = {};
                var rootPath = path.join(that.root, 'root');
                if (!fs.existsSync(rootPath)) {
                    throw new Error(`Root document directory `+
                        `not found:${rootPath}`); 
                }

                that.examples = {};
                let exPath = path.join(that.root, `.helpers`, `examples`);
                let exEntries = await fs.promises.readdir(exPath);
                for (let i = 0; i < exEntries.length; i++) {
                    let entry = exEntries[i];
                    let lang = entry.split('-')[1].split('.')[0];
                    let entryPath = path.join(exPath, entry);
                    let entryBuf = await fs.promises.readFile(entryPath);
                    that.examples[lang] = entryBuf.toString()
                        .trim().split('\n')
                        .sort((a,b) => 
                            a.toLowerCase().localeCompare(b.toLowerCase()));
                };

                // The following code must be synchronous
                that.initialized = true;
                that.rootFiles = that.dirFiles(rootPath)
                    .filter(f => that.publication.isPublishedPath(f))
                that.rootFiles.forEach((f,i) => {
                    var file = f.replace(/.*\/root\//,'root/');
                    var parts = file.split('/');
                    var lang = parts[1];
                    var author = parts[2];
                    var category = parts[3];
                    var nikaya = parts[4];
                    var suid = parts[parts.length-1]
                        .split('_')[0].toLowerCase();
                    suttaMap[suid] = suttaMap[suid] || [];
                    suttaMap[suid].push({
                        suid,
                        lang,
                        category,
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
                    .filter(f => that.publication.isPublishedPath(f))
                    .sort();
                that.translations.forEach((f,i) => {
                    var file = f.replace(/.*\/translation\//,
                        'translation/');
                    var stat = fs.statSync(path.join(root, file));
                    if (stat.size < STUBFILESIZE) {
                        return;
                    }
                    var parts = file.split('/');
                    var lang = parts[1];
                    var author = parts[2];
                    var category = parts[3];
                    var nikaya = parts[4];
                    var suid = parts[parts.length-1]
                        .split('_')[0].toLowerCase();
                    that.addAuthor(author, Object.assign({
                        lang,
                    }, authorJson[author]));
                    suttaMap[suid] = suttaMap[suid] || [];
                    suttaMap[suid].push({
                        suid,
                        lang,
                        category,
                        nikaya,
                        author,
                        bilaraPath: file,
                    });
                });
                var uidExpPath = path.join(that.root, 
                    '.helpers', 'uid_expansion.json');
                that.uid_expansion = 
                    json5.parse(fs.readFileSync(uidExpPath));
                resolve(that);
            } catch(e) {reject(e);} })()};
            return new Promise(pbody);
        }

        addAuthor(author, info) {
            var {
                authors,
            } = this;
            if (authors[author] == null) {
                authors[author] = Object.assign({}, authors[author], info);
            }
        }

        supportedLanguages() {
            if (!this.initialized) {
                throw new Error('Expected preceding call to initialize()');
            }
            var authors = this.authors;
            return Object.keys(
                Object.keys(authors)
                    .reduce((a,auth) => {
                    a[authors[auth].lang] = true;
                    return a;
                }, {})).sort();
        }

        authorInfo(author) {
            if (!this.initialized) {
                throw new Error('Expected preceding call to initialize()');
            }
            return authors[authors];
        }

        get suttaIds() {
            if (this._suttaIds == null) {
                this._suttaIds = Object.keys(this.suttaMap)
                    .sort(SuttaCentralId.compareLow);
            }

            return this._suttaIds;
        }

        async sync(opts={}) { try {
            var purge = opts.purge || false;
            var initializing = opts.initializing || false;
            var branches = opts.branches || 
                [this.branch || "unpublished"];
            if (purge) {
                var cmd = `rm -rf ${this.name}`;
                var execOpts = {
                    cwd: Files.LOCAL_DIR,
                };
                this.log(`Purging repository: ${cmd}`);
                var res = execSync(cmd, execOpts).toString();
            }
            var res = await this.execGit
                .sync(undefined, undefined, branches);

            // clear memoizer
            var mzr = new Memoizer({writeMem: false});
            var mc = mzr.cache;
            var volumes = mc.volumes();
            this.info(`clearing memoizer bytes:`, 
                await mc.fileSize(), volumes);
            for await (let v of volumes) {
                mc.clearVolume(v);
            }

            if (purge && !initializing) {
                await this.initialize();
            }
            return this;
        } catch(e) {
            this.warn(`sync()`, JSON.stringify(opts), e.message);
            throw e;
        }}

        isSuttaPath(fpath) {
            console.trace(`DEPRECATED: isSuttaPath => isPublishedPath`);
            return this.isPublishedPath(fpath);
        }

        suttaInfo(suttaRef) {
            if (!this.initialized) {
                throw new Error('Expected preceding call to initialize()');
            }
            if (suttaRef == null) {
                throw new Error('suid is required');
            }
            var refParts = suttaRef.split('/');
            var suid = refParts[0];
            var lang = refParts[1];
            var author = refParts[2];
            var info = this.suttaMap[suid];
            if (!info) { // binary search
                var suttaIds = this.suttaIds;
                var j = suttaIds.length-1;
                for (var i = 0; i<j; ) {
                    var k = Math.floor((i+j)/2);
                    var sk = suttaIds[k];
                    var cmp = SuttaCentralId.compareLow(suid, sk);
                    if (cmp <= 0) {
                        j = k;
                    } else if (i !== k) {
                        i = k;
                    } else {
                        break;
                    }
                }
                var nikaya = new SuttaCentralId(suid).nikaya;
                var suidMaybe = suttaIds[i];
                var nikayaMaybe = new SuttaCentralId(suidMaybe).nikaya;
                if (nikaya !== nikayaMaybe) {
                    return null; // no information
                }
                
                info = this.suttaMap[suidMaybe];
            }
            return info.filter(i => 
                (!lang || i.lang === lang) &&
                (!author || i.author === author)
            );
        }

        dirFiles(root) {
            var files = [];
            var prune = `-path '*.git*' -prune`;
            var cmd = `find ${root} ${prune} -o -type f -print`;
            var execOpts = {
                cwd: Files.LOCAL_DIR,
                maxBuffer: MAXBUFFER,
            };
            var res = execSync(cmd, execOpts).toString();
            return res.split('\n');
        }

        loadArgs(args) {
            if (!this.initialized) {
                throw new Error('Expected preceding call to initialize()');
            }
            var opts = typeof args[0] !== 'string'
                ? args[0]
                : {
                    suid: args[0].split('/')[0],
                    lang: args[0].split('/')[1],
                    author: args[0].split('/')[2],
                };
            var {
                verbose,
                suid,
                lang,
                language,
                author,
                logLevel,
                returnNull,
                languages,
                types,
            } = opts;
            types = types || ['root', 'translation' ];
            var thisLang = this.lang;
            lang = lang || language || thisLang;
            languages = languages || (this.languages.indexOf(lang) <= 0
                ? [...this.languages, lang]
                : this.languages);
            logLevel = logLevel === undefined ? this.logLevel : logLevel;
            return {
                verbose,
                suid,
                lang,
                author,
                logLevel,
                languages,
                returnNull,
                types,
            }
        }

        loadSegDoc(...args) {
            var that = this;
            var loadArgs = this.loadArgs(args);
            var {
                verbose,
                suid,
                lang,
                author,
                logLevel,
                returnNull,
            } = loadArgs;
            verbose && console.log(`loadSegDoc(${JSON.stringify(loadArgs)})`);

            var info = this.suttaInfo(suid);
            if (info == null) {
                if (returnNull) {
                    return null;
                }
                throw new Error(`no suttaInfo(suid:${suid})`);
            }
            info.sort((a,b) => {
                try {
                    var cmp = a.lang.localeCompare(b.lang);
                    if (cmp === 0) {
                        cmp = a.author.localeCompare(b.author);
                    }
                } catch(e) {
                    that.error(`a:${JSON.stringify(a)} `);
                    that.error(`b:${JSON.stringify(b)} `);
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
                this.log(
                    `loadSegDoc(${suid}) info:${JSON.stringify(info)}`);
                if (returnNull) {
                    return null;
                }
                throw new Error(author 
                    ? `No information for ${suid}/${lang}`
                    : `No information for ${suid}/${lang}/${author}`);
            }
            suttaInfo.logLevel = logLevel;
            return new SegDoc(suttaInfo).load(this.root);
        }

        loadMLDoc(...args) {
            var loadArgs = this.loadArgs(args);
            var {
                verbose,
                suid:suidRef,
                author,
                lang,
                logLevel,
                returnNull,
                languages,
                types,
            } = loadArgs;
            var {
                bilaraPathMap: bpm,
                root,
            } = this;

            var suidParts = suidRef.split('/');
            var suid = suidParts[0];
            (suidParts.length > 1) && (lang = suidParts[1]);
            (suidParts.length > 2) && (author = suidParts[2]);
            var info = this.suttaInfo(suid);
            if (info == null) {
                if (returnNull) {
                    return null;
                }
                var msgData = JSON.stringify({suidRef,suid});
                throw new Error(`no suttaInfo(${msgData})`);
            }
            var langMap = languages.reduce((a,l) => (a[l] = true, a), {});
            var bilaraPaths = info
                .filter(i=>langMap[i.lang])
                .filter(i=> !author ||
                    i.lang === lang && i.author === author ||
                    i.lang !== lang && this.isBilaraDoc(i))
                .map(i=>i.bilaraPath);
            if (types.length > 2) {
                var xTypes = types.filter(t=>
                    t!=='translation' && t!=='root');
                var xbps = bpm.bilaraPaths({suid, types:xTypes});
                bilaraPaths = bilaraPaths.concat(
                    xbps.map(bp=>bp.bilaraPath));
            }
            if (bilaraPaths.length === 0) {
                if (returnNull) {
                    this.log(`loadMLDoc(${suid}) no info:${languages}`);
                    return null;
                }
                throw new Error(author 
                    ? `No information for ${suid}/${lang}`
                    : `No information for ${suid}/${lang}/${author}`);
            }
            let author_uid = author == null
                ?   bilaraPaths.reduce((alist,bp)=>{
                        let [s, l, a] = bp.split('/');
                        if (l===lang && !alist.includes(a)) {
                            alist.push(a);
                        }
                        return alist;
                    },[]).join(', ')
                : author;
            return new MLDoc({
                logLevel,
                lang,
                author_uid,
                bilaraPaths,
            }).load(this.root);
        }

        async loadMLDocLegacy(suidRef) { try {
            let suidParts = suidRef.split('/');
            let sutta = await this.scApi.loadSutta.apply(this.scApi, suidParts);
            let {
                lang,
                author_uid,
                sutta_uid,
                segmented,
                suttaplex,
            } = sutta;
            let segMap = {};
            let segments = sutta.segments;
            segments.forEach(seg=>{
                segMap[seg.scid] = seg;
            });
            this.info(`loadMLDocLegacy(${suidRef})`);
            return new MLDoc({
                bilaraPaths: [], // legacy have no paths
                lang,
                author_uid,
                segMap,
                suttaplex,
                segmented,
                sutta_uid,
                langSegs: {
                    [lang]: segments.length,
                },
            });
        } catch(e) {
            this.warn(`loadMLDocLegacy(${suidRef})`, e.message);
            throw e;
        }}

        normalizeSuttaId(id) {
            if (!this.initialized) {
                throw new Error(`${this.constructor.name}.`+
                    `initialize() required`);
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

        suttaPath(...args) { // DEPRECATED: use docPaths
            this.log(`DEPRECATED: suttaPath => docPaths`);
            return this.docPaths.apply(this, args)[0];
        }

        docPaths(...args) {
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
            var docs = this.suttaMap[sutta_uid] || []
            return docs
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
            var rangeParts = sutta_uid.substring(prefix.length).split("-");
            rangeParts[0] = prefix+rangeParts[0];
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
                    this.expandRange(suttaRef)
                        .forEach(item => acc.push(item));
                    return acc;
                }, []);
            } catch (e) {
                throw e;
            }
        }

        expandRange(suttaRef) {
            suttaRef = suttaRef.split(':')[0];
            var reCollection = new RegExp("[0-9].*", "u");
            var collName = suttaRef.replace(reCollection, '');
            var suffix = suttaRef.replace(/[^/]*([a-z\/]*)$/iu, '$1');
            var sref = suttaRef.replace(suffix, '');
            var range = sref.substring(collName.length);
            if (/^[-a-z]+$/.test(range)) { 
                // e.g., kusalagnana-maitrimurti-traetow
                return [ suttaRef ];
            }
            var rl = SuttaCentralId.rangeLow(suttaRef);
            var suttaRefLow = this.suttaIds[this.suttaIndex(rl)];
            if (!suttaRefLow) {
                throw new Error(
                    `Document not found: ${suttaRef} [E5]`);
            }
            var coll = this.publication.pubInfo(suttaRefLow);
            var result = [];
            if (!coll || !coll.length) { // no collection
                throw new Error(
                    `Unpublished:${suttaRef} collection:${collName} [E4]`);
            }
            var rangeParts = range.split('-');
            var dotParts = rangeParts[0].split('.');
            if (dotParts.length > 3) {
                throw new Error(
                    `Invalid sutta reference: ${suttaRef} [E3]`);
            }
            if (dotParts.length>1 || coll[0].subchapters) { // SN, AN, KN
                if (dotParts.length === 1) { // e.g. SN50
                    var prefix = `${sref}.`;
                    var first = rangeParts.length === 1 
                        ? 1 : Number(rangeParts[0]);
                    var last = rangeParts.length === 1 
                        ? 999 : Number(rangeParts[1]);
                } else if (rangeParts.length === 1) {
                    var prefix = `${collName}${dotParts[0]}.`;
                    rangeParts[0] = dotParts[1];
                    var first = Number(rangeParts[0]);
                    var last = first;
                } else { // e.g., SN50.1
                    var prefix = `${collName}${dotParts[0]}.`;
                    var first = Number(dotParts[1]);
                    var last = Number(rangeParts[1]);
                }
                if (isNaN(first) || isNaN(last)) {
                    throw new Error(
                        `Invalid sutta reference: ${suttaRef} [E1]`);
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
                    throw new Error(
                        `Invalid sutta reference: ${suttaRef} [E2]`);
                }
                var firstItem = `${collName}${first}`;
                var iCur = this.suttaIndex(firstItem, false);
                if (iCur == null) {
                    throw new Error(`Sutta ${firstItem} not found`);
                }
                var lastItem = `${collName}${last}`;
                var endUid = this.sutta_uidSuccessor(lastItem);
                var iEnd = endUid
                    ? this.suttaIndex(endUid)
                    : iCur+1;
                for (var i = iCur; i < iEnd; i++) {
                    result.push(`${this.suttaIds[i]}${suffix}`);
                }
            }
            return result;
        }

        authorInfo(author) {
            return this.authors[author];
        }

        sutta_uidSearch(pattern, maxResults=5) {
            var method = 'sutta_uid';
            var uids = this.suttaList(pattern).slice(0, maxResults);
            var lang = undefined;
            var suttaRefs = uids.map(ref => {
                var refParts = ref.split('/');
                var refTranslator = refParts[2];
                var uid = refParts[0];
                var refLang = refParts[1];
                lang == null && (lang = refLang);
                return refTranslator 
                    ? `${uid}/${refLang}/${refTranslator}`
                    : (refLang ? `${uid}/${refLang}` : uid);
            });

            return {
                method,
                uids,
                suttaRefs,
                lang,
            }
        }

        version() {
            var pkgPath = path.join(this.root, "package.json");
            var result = {
                major: 0,
                minor: 0,
                patch: 0,
            };
            if (fs.existsSync(pkgPath)) {
                var json = json5.parse(fs.readFileSync(pkgPath).toString());
                var verParts = json.version.split(".");
                result.major = Number(verParts[0]);
                result.minor = Number(verParts[1]);
                result.patch = Number(verParts[2]);
            }

            return result;
        }

        readBlurb({suid, lang}) {
            var that = this;
            var pbody = (resolve, reject)=>(async function() { try {
                if (!suid) {
                    resolve(null);
                }
                suid = suid.toLowerCase();
                lang = lang || that.lang;
                var nikaya = suid.replace(/[1-9].*/,'');
                if (lang === 'pli' || lang ==='en') {
                    var dir = path.join(that.root, 
                        'root', lang, 'blurb');
                    var fname = `${nikaya}-blurbs_root-${lang}.json`;
                    var fpath = path.join(dir, fname);
                } else {
                    var dir = path.join(that.root, 
                        'translation', lang, 'blurb');
                    var fname = `${nikaya}-blurbs_translation-${lang}.json`;
                    var fpath = path.join(dir, fname);
                }
                if (!fs.existsSync(fpath)) {
                    if (lang !== 'en') {
                        var enBlurb = await that.readBlurb({suid,lang:'en'});
                        if (enBlurb) {
                            that.info(`Not found: ${fpath}. Using en blurb`);
                        }
                        resolve(enBlurb);
                    }
                    resolve(null);
                }
                var json = await fs.promises.readFile(fpath);
                var blurbs = json5.parse(json);
                var key = `${nikaya}-blurbs:${suid}`;
                var blurbKey = blurbs[key];
                var blurbSuid = blurbs[suid];
                resolve(blurbKey || blurbSuid || null);
            } catch(e) { reject(e); } })();
            return new Promise(pbody);
        }

        async loadSuttaplexJson(scid, lang, author_uid) { try {
            let suttaplex = await this.scApi.loadSuttaplexJson(scid);
            var translations = suttaplex && suttaplex.translations || [];
            var allTranslations = translations;
            if ((lang || author_uid)) {
                const ANY_LANGUAGE = '*';
                suttaplex.translations =
                translations = 
                    translations.filter(t => 
                        (!lang || lang === ANY_LANGUAGE || t.lang === lang)
                        &&
                        (!author_uid || t.author_uid === author_uid)
                    );
                translations.sort((a,b) => {
                    if (a.segmented === b.segmented) {
                        return (a.author_uid||'').localeCompare(b.author_uid||'');
                    }
                    return a.segmented ? 1 : -1;
                });
                this.debug(`ScApi.loadSuttaplexJson`+
                    `(${scid}, ${lang}, ${author_uid}) `+
                    `${JSON.stringify(suttaplex,null,2)}`);
            }
            if (translations.length === 0) {
                if (this.isBilaraDoc({suid:scid, lang, author:author_uid})) {
                    let ainfo = this.authorInfo(author_uid);
                    let title = allTranslations.reduce((a,t)=>{
                        return a
                            ? a
                            : t.lang === 'en' && t.title;
                    },null);
                    let langInfo = this.languageInfo[lang];

                    translations.push({
                        author: ainfo.name,
                        author_short: ainfo.name.split(' ').pop(),
                        author_uid,
                        is_root: false,
                        lang,
                        lang_name: langInfo && langInfo.name || lang,
                        id: `${lang}_${scid}_${author_uid}`,
                        segmented: true,
                        publication_date: null,
                        title,
                        volpage: null,
                    });
                }
            }
            if (translations.length === 0) {
                throw new Error(`suttaplex has no translations`);
            }
            return suttaplex;
        } catch (e) {
            this.warn(`loadSuttaplexJson()`, {scid, lang, author_uid}, e);
            throw e;
        }}
    }

    module.exports = exports.BilaraData = BilaraData;
})(typeof exports === "object" ? exports : (exports = {}));
