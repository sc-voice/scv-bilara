(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const json5 = require("json5");
    const {
        readFile,
    } = fs.promises;
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require('just-simple').JustSimple;
    const {
        execSync,
    } = require('child_process');
    const SegDoc = require('./seg-doc');
    const MLDoc = require('./ml-doc');
    const SuttaCentralId = require('./sutta-central-id');
    const FuzzyWordSet = require('./fuzzy-word-set');
    const Pali = require('./pali');
    const English = require('./english');
    const ExecGit = require('./exec-git');

    const SUTTA_FOLDER = path.join(LOCAL_DIR, "bilara-data", 
        "root", "pli", "ms", "sutta");
    const BILARA_DATA_GIT = 'https://github.com/sc-voice/bilara-data.git';
    const PUB_PREFIX = /^https:.*translation\//;

    class BilaraData {
        constructor(opts={}) {
            this.name = opts.name || 'bilara-data';
            this.root = opts.root || path.join(LOCAL_DIR, 'bilara-data');
            this.lang = opts.lang || 'en';
            logger.logInstance(this, opts);
            this.execGit = opts.execGit || new ExecGit({
                repo: BILARA_DATA_GIT,
                logLevel: this.logLevel,
            });
            this.languages = opts.languages || [ 'pli', this.lang ];
            this.authors = {};
            this.sva = fs.existsSync(SUTTA_FOLDER);
            Object.defineProperty(this, "_sources", {
                writable: true,
                value: null,
            });
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

        isBilaraDoc({suid, lang, author}) {
            if (this._sources == null) {
                var sourcesPath = path.join(__dirname, 
                    "../src/assets/sources.json");
                this._sources = JSON.parse(fs.readFileSync(sourcesPath));
            }
            var authors = this._sources[lang];
            return authors && authors.indexOf(author)>=0;
        }

        initialize(sync=false) {
            if (this.initialized) {
                return Promise.resolve(this);
            }
            var that = this;
            var {
                authors,
                sva,
            } = that;
            var pbody = (resolve, reject) => {(async function() { try {
                sync && await that.sync();

                let pubJson = json5.parse(await readFile(
                    path.join(that.root, `_publication.json`)));
                that.publication = Object.keys(pubJson)
                    .map(k=>pubJson[k]);
                let authorJson = JSON.parse(await readFile(
                    path.join(that.root, `_author.json`)));
                that.addAuthor('ms', Object.assign({
                    lang: 'pli'
                }, authorJson.ms));
                var suttaMap = that.suttaMap = {};
                var rootPath = path.join(that.root, 'root');
                if (!fs.existsSync(rootPath)) {
                    throw new Error(`Root document directory `+
                        `not found:${rootPath}`); 
                }

                // The following code must be synchronous
                that.initialized = true;
                that.rootFiles = that.dirFiles(rootPath)
                    .filter(f => that.isPublishedPath(f))
                that.rootFiles.forEach((f,i) => {
                    var file = f.replace(/.*\/root\//,'root/');
                    var parts = file.split('/');
                    var lang = parts[1];
                    var author = parts[2];
                    var category = sva ? parts[3] : 'sutta';
                    var nikaya = parts[sva ? 4 : 3];
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
                    .filter(f => that.isPublishedPath(f))
                    .sort();
                that.translations.forEach((f,i) => {
                    var file = f.replace(/.*\/translation\//,
                        'translation/');
                    var parts = file.split('/');
                    var lang = parts[1];
                    var author = parts[2];
                    var category = sva ? parts[3] : 'sutta';
                    var nikaya = parts[sva ? 4 : 3];
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
                    '.voice', 'uid_expansion.json');
                that.uid_expansion = 
                    JSON.parse(fs.readFileSync(uidExpPath));
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
                this.log(`addAuthor(${author}:${js.simpleString(info)})`);
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

        published() {
            var that = this;
            var {
                root,
            } = that;
            var loadPublished = ()=>{
                return that.publication.reduce( (a,p) => {
                    let {
                        is_published,
                        text_uid,
                        source_url,
                    } = p;
                    var bilPath = source_url.replace(/.*master\//,'');
                    if (is_published!=="true" && p.is_published!==true){
                        return a;
                    }
                    if (a[text_uid]) {
                        return a;
                    }
                    var rootBilPath = path.join(root, bilPath);
                    var subchapters = false;
                    if (!fs.existsSync(rootBilPath)) {
                        a[text_uid] = {
                            name: text_uid,
                            //folder: bilPath.split("/")[3],
                            subchapters,
                        };
                    } else if (fs.statSync(rootBilPath).isFile()) {
                        //console.log(`it's a file:`, bilPath);
                        a[text_uid] = {
                            name: text_uid,
                            //folder: bilPath.split("/")[3],
                            subchapters,
                        };
                    } else {
                        var dirs = fs.readdirSync(rootBilPath);
                        subchapters = dirs.reduce(
                            (a,d) => (d.match(/.*json$/) ? false : a),
                            true);
                        a[text_uid] = {
                            name: text_uid,
                            //folder: bilPath.split("/")[3],
                            subchapters,
                        };
                    }
                    return a;
                }, {});
            }
            if (this._published == null && this.publication) {
                Object.defineProperty(this, "_published", {
                    value: loadPublished(),
                });
            }
            return this._published;
        }

        publishedPaths() {
            return this.publication && this.publication.reduce((a,p) => {
                if (p.is_published==="true" || p.is_published===true) {
                    a.push(p.source_url.replace(PUB_PREFIX, ''));
                }
                return a;
            }, []).sort();
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

        sync() {
            return this.execGit.sync();
        }

        isSuttaPath(fpath) {
            console.trace(`DEPRECATED: isSuttaPath => isPublishedPath`);
            return this.isPublishedPath(fpath);
        }

        isPublishedPath(fpath) {
            if (!this.initialized) {
                throw new Error('Expected preceding call to initialize()');
            }
            if (this._rePubPaths == null) {
                var published = [...this.publishedPaths(), 
                    this.sva ? 'root/pli/ms/sutta' : 'root/pli/ms'];
                this.log(`published paths:\n${published.join('\n')}`);
                Object.defineProperty(this, "_rePubPaths", {
                    value: new RegExp(`(${published.join("|")}).*`),
                });
            }
            return this._rePubPaths.test(fpath);
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
                cwd: LOCAL_DIR,
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
                suid,
                lang,
                language,
                author,
                logLevel,
                returnNull,
                languages,
            } = opts;
            var thisLang = this.lang;
            lang = lang || language || thisLang;
            languages = languages || (this.languages.indexOf(lang) <= 0
                ? [...this.languages, lang]
                : this.languages);
            logLevel = logLevel === undefined ? this.logLevel : logLevel;
            return {
                suid,
                lang,
                author,
                logLevel,
                languages,
                returnNull,
            }
        }

        loadSegDoc(...args) {
            var {
                suid,
                lang,
                author,
                logLevel,
                returnNull,
            } = this.loadArgs(args);

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
            var {
                suid:suidRef,
                author,
                lang,
                logLevel,
                returnNull,
                languages,
            } = this.loadArgs(args);

            var suidParts = suidRef.split('/');
            var suid = suidParts[0];
            (suidParts.length > 1) && (lang = suidParts[1]);
            (suidParts.length > 2) && (author = suidParts[2]);
            var info = this.suttaInfo(suid);
            if (info == null) {
                if (returnNull) {
                    return null;
                }
                throw new Error(`no suttaInfo(suid:${suid})`);
            }
            var langMap = languages.reduce((a,l) => (a[l] = true, a), {});
            var bilaraPaths = info
                .filter(i=>langMap[i.lang])
                .filter(i=> !author ||
                    i.lang === lang && i.author === author ||
                    i.lang !== lang && this.isBilaraDoc(i))
                .map(i=>i.bilaraPath);
            if (bilaraPaths.length === 0) {
                if (returnNull) {
                    this.log(`loadMLDoc(${suid}) no info:${languages}`);
                    return null;
                }
                throw new Error(author 
                    ? `No information for ${suid}/${lang}`
                    : `No information for ${suid}/${lang}/${author}`);
            }
            return new MLDoc({
                logLevel,
                lang,
                bilaraPaths,
            }).load(this.root);
        }

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
            var reCname = new RegExp("[-.:0-9.].*", "u");
            var cname = suttaRef.replace(reCname, '');
            var suffix = suttaRef.replace(/[^/]*([a-z\/]*)$/iu, '$1');
            var sref = suttaRef.replace(suffix, '');
            var range = sref.substring(cname.length);
            if (/^[-a-z]+$/.test(range)) { 
                // e.g., kusalagnana-maitrimurti-traetow
                return [ suttaRef ];
            }
            var coll = Object.keys(this.published()).reduce((acc,ck) => {
                var c = this.published()[ck];
                return acc || cname === c.name && c;
            }, false);
            var result = [];
            if (!coll) { // no collection
                throw new Error(`Not published: ${suttaRef} [E4]`);
            }
            var rangeParts = range.split('-');
            var dotParts = rangeParts[0].split('.');
            if (dotParts.length > 3) {
                throw new Error(
                    `Invalid sutta reference: ${suttaRef} [E3]`);
            }
            if (coll.subchapters) { // e.g., SN, AN, KN
                if (dotParts.length === 1) { // e.g. SN50
                    var prefix = `${sref}.`;
                    var first = rangeParts.length === 1 
                        ? 1 : Number(rangeParts[0]);
                    var last = rangeParts.length === 1 
                        ? 999 : Number(rangeParts[1]);
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

        authorInfo(author) {
            return this.authors[author];
        }

        sutta_uidSearch(pattern, maxResults=5) {
            var method = 'sutta_uid';
            var uids = this.suttaList(pattern).slice(0, maxResults);
            var suttaRefs = uids.map(ref => {
                var refParts = ref.split('/');
                var refTranslator = refParts[2];
                var uid = refParts[0];
                var refLang = refParts[1];
                return refTranslator 
                    ? `${uid}/${refLang}/${refTranslator}`
                    : (refLang ? `${uid}/${refLang}` : uid);
            });

            return {
                method,
                uids,
                suttaRefs,
            }
        }

        readBlurb({suid, lang}) {
            var that = this;
            var pbody = (resolve, reject)=>(async function() { try {
                if (!suid) {
                    resolve(null);
                }
                suid = suid.toLowerCase();
                lang = lang || that.lang;
                var dir = path.join(that.root, 'root', lang, 'blurb');
                var nikaya = suid.replace(/[1-9].*/,'');
                var fname = `${nikaya}-blurbs_root-${lang}.json`;
                var fpath = path.join(dir, fname);
                if (!fs.existsSync(fpath)) {
                    if (lang !== 'en') {
                        var enBlurb = await 
                            that.readBlurb({suid,lang:'en'});
                        if (enBlurb) {
                            logger.info(
                                `Not found: ${fpath}. Using en blurb`);

                        }
                        resolve(enBlurb);
                    }
                    resolve(null);
                }
                var json = await fs.promises.readFile(fpath);
                var blurbs = JSON.parse(json);
                resolve(blurbs[suid] || null);
            } catch(e) { reject(e); } })();
            return new Promise(pbody);
        }
    }

    module.exports = exports.BilaraData = BilaraData;
})(typeof exports === "object" ? exports : (exports = {}));
