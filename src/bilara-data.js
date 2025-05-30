(function (exports) {
  const fs = require("fs");
  const path = require("path");
  const json5 = require("json5");
  const { readFile } = fs.promises;
  const { logger } = require("log-instance");
  const { execSync } = require("child_process");
  const { Memoizer, MemoCache, Files } = require("memo-again");
  const { ScApi } = require("suttacentral-api");
  const Examples = require("./examples.json");
  const SegDoc = require("./seg-doc");
  const MLDoc = require("./ml-doc");
  const { BilaraPath, Authors, AuthorsV2 } = require("scv-esm");
  const { SuttaCentralId, SuttaRef } = require("scv-esm");
  const {
    DBG,
    DBG_BD_INIT,
  } = require('./defines.cjs');
  const BilaraPathMap = require("./bilara-path-map");
  const FuzzyWordSet = require("./fuzzy-word-set");
  const Publication = require("./publication");
  const Pali = require("./pali");
  const English = require("./english");
  const ExecGit = require("./exec-git");
  const PUB_PREFIX = /^https:.*translation\//;
  const ROOT_PLI_MS = path.join("root", "pli", "ms");
  const STUBFILESIZE = 10;
  const MAXBUFFER = 10 * 1024 * 1024;

  class BilaraData {
    constructor(opts = {}) {
      const msg = "B8a.ctor()";
      const dbg = DBG_BD_INIT;
      (opts.logger || logger).logInstance(this, opts);
      this.name = opts.name || "bilara-data";
      this.branch = opts.branch || "published";
      let root = this.root = opts.root || 
        path.join(Files.LOCAL_DIR, this.name);
      dbg && console.warn(msg, '[1]root', root, '@', this.branch);
      this.info(`root:${this.root}`);
      this.lang = opts.lang || "en";
      this.scApi = opts.scApi || new ScApi({ logger: this });
      this.gitAccount = opts.gitAccount || "suttacentral";
      let repo = (this.repo =
        opts.repo || `https://github.com/${this.gitAccount}/${this.name}.git`);
      var includeUnpublished =
        opts.includeUnpublished == null ? false : opts.includeUnpublished;
      this.publication =
        opts.publication ||
        new Publication({
          includeUnpublished,
          name: this.name,
          root: this.root,
        });
      this.bilaraPathMap = this.publication.bilaraPathMap;
      this.execGit =
        opts.execGit ||
        new ExecGit({
          repo,
          repoPath: opts.repoPath || root,
          logger: this,
        });
      this.languages = opts.languages || ["pli", this.lang];
      this.authors = Authors.authors;
      this.authorsV2 = AuthorsV2.authors;
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

    static get GITLOG_FNAME() { return ".old" }

    async syncEbtData() {
      this.info("syncEbtData()");
      let repo = "https://github.com/ebt-site/ebt-data.git";
      let execGit = new ExecGit({
        repo,
        logger: this,
      });
      let branches = ["published"];
      var res = await execGit.sync(undefined, undefined, branches);
      return res;
    }

    get includeUnpublished() {
      return this.publication.includeUnpublished;
    }

    set includeUnpublished(value) {
      return (this.publication.includeUnpublished = value);
    }

    isBilaraDoc({
      suid,
      lang,
      author,
      includeUnpublished = this.includeUnpublished,
    }) {
      const msg = "B8a.isBilaraDoc() ";
      let { bilaraPathMap: bpm, publication } = this;
      let sp = bpm.suidPaths(suid);

      let spKeys = (sp && Object.keys(sp)) || [];
      if (lang) {
        spKeys = spKeys.filter((p) => p.indexOf(`/${lang}/`) >= 0);
      }
      if (author) {
        spKeys = spKeys.filter((p) => p.endsWith(author));
      }
      let result = spKeys.length > 0;
      return result;
    }

    async isFresh(save = true) {
      try {
        if (!fs.existsSync(this.root)) {
          this.debug(`isFresh() no repository => false`);
          return false;
        }
        let { stdout } = await this.execGit.gitLog();
        this.debug(`isFresh() ${stdout}`);
        let gitlogPath = path.join(this.root, BilaraData.GITLOG_FNAME);
        let gitlog =
          fs.existsSync(gitlogPath) &&
          (await fs.promises.readFile(gitlogPath)).toString();

        let fresh = stdout === gitlog;
        if (save && !fresh) {
          await fs.promises.writeFile(gitlogPath, stdout);
        }
        return fresh;
      } catch (e) {
        this.warn(`isFresh()`, e.message);
        throw e;
      }
    }

    async initialize(sync) {
      try {
        if (this.initialized) {
          return this;
        }
        sync = sync === undefined ? !(await this.isFresh()) : sync;
        this.debug(`initialize(sync:${sync})`);
        sync && (await this.syncEbtData());
        var { root } = this;
        var version = this.version();
        var EXPECTED_VERSION = 1;
        var purge = !fs.existsSync(this.root);
        if (version.major < EXPECTED_VERSION) {
          this.warn(
            `Expected ${this.name} data version ` +
              `actual:${version.major} ` +
              `expected:${EXPECTED_VERSION} ` +
              `(re-cloning repository...)`
          );
          purge = true;
        }
        (sync || purge) &&
          (await this.sync({
            purge,
            initializing: true,
          }));
        if (this.branch) {
          try {
            let res = await this.execGit.branch(this.branch);
            this.info(`initialize() ${res.stdout} ${res.stderr}`);
          } catch (e) {
            this.warn(`initialize() ${this.branch} failed:`, e.message);
            throw e;
          }
        }
        await this.publication.initialize();
        await this.scApi.initialize();
        let langPath = path.join(this.root, "_language.json");
        this.languageInfo = JSON.parse(await fs.promises.readFile(langPath));

        this.examples = Examples;

        var rootPath = path.join(this.root, "root");
        if (!fs.existsSync(rootPath)) {
          throw new Error(`Root document directory ` + `not found:${rootPath}`);
        }

        // The following code must be synchronous
        this.initialized = true;
        this.rootFiles = this.dirFiles(rootPath).filter((f) =>
          this.publication.isPublishedPath(f)
        );

        var transPath = path.join(this.root, "translation");
        if (!fs.existsSync(transPath)) {
          throw new Error(`Translation directory not found:${transPath}`);
        }
        this.translations = this.dirFiles(transPath)
          .filter((f) => this.publication.isPublishedPath(f))
          .sort();
        this.log(
          `initialize() translations ${transPath}:`,
          this.translations.length
        );
        this.translations.forEach((f, i) => {
          var file = f.replace(/.*\/translation\//, "translation/");
          var stat = fs.statSync(path.join(root, file));
          if (stat.size < STUBFILESIZE) {
            return;
          }
          var parts = file.split("/");
          var lang = parts[1];
          var author = parts[2];
          var category = parts[3];
          var nikaya = parts[4];
          var suid = parts[parts.length - 1].split("_")[0].toLowerCase();
        });
        //var uidExpPath = path.join(this.root, '.helpers', 'uid_expansion.json');
        var uidExpPath = path.join(
          __dirname,
          "..",
          "src",
          "auto",
          "uid_expansion.json"
        );
        this.uid_expansion = json5.parse(fs.readFileSync(uidExpPath));
        return this;
      } catch (e) {
        this.warn(`initialize()`, e.message);
        throw e;
      }
    }

    get suttaIds() {
      if (this._suttaIds == null) {
        let suttaIds = Object.keys(this.bilaraPathMap.suidMap)
          .filter((suid) => SuttaCentralId.test(suid))
          .sort(SuttaCentralId.compareLow);
        if (suttaIds.length === 0) {
          throw new Error(`no suttaIds`);
        }
        this._suttaIds = suttaIds;
        this.info(`suttaIds:${suttaIds.length}`);
      }

      return this._suttaIds;
    }

    async sync(opts = {}) {
      try {
        var purge = opts.purge || false;
        var initializing = opts.initializing || false;
        var branches = opts.branches || [this.branch || "unpublished"];
        if (purge) {
          var cmd = `rm -rf ${this.name}`;
          var execOpts = {
            cwd: Files.LOCAL_DIR,
          };
          this.warn(`Purging repository: ${cmd}`);
          var res = execSync(cmd, execOpts).toString();
        } else {
          this.info(`Updating ${this.name}`);
        }
        var res = await this.execGit.sync(undefined, undefined, branches);

        // clear memoizer
        // TODO: put this in seeker.cjs
        var mzr = new Memoizer({ writeMem: false });
        var mc = mzr.cache;
        var volumes = mc.volumes();
        this.info(`clearing memoizer bytes:`, await mc.fileSize(), volumes);
        for await (let v of volumes) {
          mc.clearVolume(v);
        }

        if (purge && !initializing) {
          await this.initialize();
        }
        this.info(`buildSuidMap()`);
        await this.bilaraPathMap.buildSuidMap();
        return this;
      } catch (e) {
        this.warn(`sync()`, JSON.stringify(opts), e.message);
        throw e;
      }
    }

    isSuttaPath(fpath) {
      console.trace(`DEPRECATED: isSuttaPath => isPublishedPath`);
      return this.publication.isPublishedPath(fpath);
    }

    suttaInfo(suttaRef) {
      if (!this.initialized) {
        throw new Error("Expected preceding call to initialize()");
      }
      if (suttaRef == null) {
        throw new Error("BilaraData.suttaInfo() suid is required");
      }
      var refParts = suttaRef.split("/");
      var suid = refParts[0];
      var lang = refParts[1];
      var author = refParts[2];
      var info = this.bilaraPathMap.suidLanguages(suttaRef);
      if (!info) {
        // binary search
        let { suttaIds } = this;
        var j = suttaIds.length - 1;
        for (var i = 0; i < j; ) {
          var k = Math.floor((i + j) / 2);
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

        info = this.bilaraPathMap.suidLanguages(suidMaybe);
      }
      info = info.filter(
        (i) => (!lang || i.lang === lang) && (!author || i.author === author)
      );
      let { authorsV2 } = this;
      info.forEach((ai) => {
        let aia = this.authorV2Info(ai.author) || {};
        if (ai) {
          ai.exampleVersion = Number(aia.exampleVersion) || 0;
        }
      });
      info.sort((a, b) => {
        // sort by exampleVersion DSC, lang ASC, author ASC
        let cmp = b.exampleVersion - a.exampleVersion;
        if (cmp === 0) {
          cmp = a.lang < b.lang ? -1 : b.lang < a.lang ? 1 : 0;
        }
        if (cmp === 0) {
          cmp = a.author < b.author ? -1 : b.author < a.author ? 1 : 0;
        }
        return cmp;
      });

      return info;
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
      return res.split("\n");
    }

    loadArgs(args) {
      if (!this.initialized) {
        throw new Error("Expected preceding call to initialize()");
      }
      var opts =
        typeof args[0] !== "string"
          ? args[0]
          : {
              suid: args[0].split("/")[0],
              lang: args[0].split("/")[1],
              author: args[0].split("/")[2],
            };
      var {
        suid,
        lang,
        language,
        author,
        logLevel,
        returnNull,
        languages,
        types = ["root", "translation" ],
      } = opts;
      var thisLang = this.lang;
      lang = lang || language || thisLang;
      languages =
        languages ||
        (this.languages.indexOf(lang) <= 0
          ? [...this.languages, lang]
          : this.languages);
      logLevel = logLevel === undefined ? this.infoLevel : logLevel;
      return {
        suid,
        lang,
        author,
        logLevel,
        languages,
        returnNull,
        types,
      };
    }

    loadSegDoc(...args) {
      var that = this;
      var loadArgs = this.loadArgs(args);
      var { suid, lang, author, logLevel, returnNull } = loadArgs;
      this.debug(`loadSegDoc(${JSON.stringify(loadArgs)})`);

      var info = this.suttaInfo(suid);
      if (info == null) {
        if (returnNull) {
          return null;
        }
        throw new Error(`no suttaInfo(suid:${suid})`);
      }
      info.sort((a, b) => {
        try {
          var cmp = a.lang.localeCompare(b.lang);
          if (cmp === 0) {
            cmp = a.author.localeCompare(b.author);
          }
        } catch (e) {
          that.error(`a:${JSON.stringify(a)} `);
          that.error(`b:${JSON.stringify(b)} `);
          throw e;
        }
      });

      if (lang == null && author == null) {
        lang = info[0].lang;
        author = info[0].author;
      }
      var suttaInfo = info.filter(
        (i) => (!lang || i.lang === lang) && (!author || i.author === author)
      )[0];
      if (suttaInfo == null || suttaInfo.bilaraPath == null) {
        this.info(`loadSegDoc(${suid}) info:${JSON.stringify(info)}`);
        if (returnNull) {
          return null;
        }
        throw new Error(
          author
            ? `No information for ${suid}/${lang}`
            : `No information for ${suid}/${lang}/${author}`
        );
      }
      suttaInfo.logLevel = logLevel;
      return new SegDoc(suttaInfo).load(this.root);
    }

    loadMLDoc(...args) {
      const msg = "B8a.loadMLDoc() ";
      var loadArgs = this.loadArgs(args);
      var {
        suid: suidRef,
        author,
        lang,
        logLevel,
        returnNull,
        languages,
        types,
      } = loadArgs;
      var { bilaraPathMap: bpm, root } = this;
      var suidParts = suidRef.split("/");
      var suid = suidParts[0];
      suidParts.length > 1 && (lang = suidParts[1]);
      suidParts.length > 2 && (author = suidParts[2]);
      var info = this.suttaInfo(suid);
      if (info == null) {
        if (returnNull) {
          return null;
        }
        var msgData = JSON.stringify({ suidRef, suid });
        throw new Error(`no suttaInfo(${msgData})`);
      }
      var langMap = languages.reduce((a, l) => ((a[l] = true), a), {});
      var bilaraPaths = info
        .filter((i) => langMap[i.lang])
        .filter((i) => this.isBilaraDoc(i))
        .filter(
          (i) =>
            !author ||
            (i.lang === lang && i.author === author) ||
            (i.lang !== lang && this.isBilaraDoc(i))
        )
        .map((i) => i.bilaraPath);
      if (types.length > 2) {
        var xTypes = types.filter((t) => t !== "translation" && t !== "root");
        var xbps = bpm.bilaraPaths({ suid, types: xTypes });
        bilaraPaths = bilaraPaths.concat(xbps.map((bp) => bp.bilaraPath));
      }
      if (bilaraPaths.length === 0) {
        if (returnNull) {
          this.info(`loadMLDoc(${suid}) no info:${languages}`);
          return null;
        }
        throw new Error(
          author
            ? `No information for ${suid}/${lang}`
            : `No information for ${suid}/${lang}/${author}`
        );
      }
      let authors =
        author == null
          ? bilaraPaths.reduce((alist, bp) => {
              let [s, l, a] = bp.split("/");
              if (l === lang && !alist.includes(a)) {
                alist.push(a);
              }
              return alist;
            }, [])
          : [author];
      let mldOpts = {
        logLevel,
        lang,
        author_uid: authors[0],
        sutta_uid: suid,
        bilaraPaths,
      };
      this.debug(`loadMLDoc mldOpts`, { mldOpts, authors });
      return new MLDoc(mldOpts).load(this.root);
    }

    async trilingualDoc(suttaRef, opts={}) {
      const msg = "B8a.trilingualDoc() ";
      const dbg = DBG.TRILINGUALDOC;
      let { bilaraPathMap: bpm, root } = this; 
      suttaRef = SuttaRef.create(suttaRef); 
      let {
        rootLang = 'pli',
        rootAuthor = 'ms',
        refLang,
        refAuthor = 'sujato',
        refAuthorName,
        docLang = suttaRef.lang,
        docAuthor = suttaRef.author,
        docAuthorName,
        logLevel,
      } = opts;
      let suid = suttaRef.sutta_uid;
      let info = this.suttaInfo(suid);
      if (info == null) {
        let msgData = JSON.stringify({ suidRef, suid });
        throw new Error(`${msg} no suttaInfo(${msgData})`);
      }
      if (docAuthorName == null) {
        let info = AuthorsV2.authorInfo(docAuthor);
        docAuthorName = info?.name?.join(', ');
      }
      if (refAuthorName == null) {
        let info = AuthorsV2.authorInfo(refAuthor);
        refAuthorName = info?.name?.join(', ');
      }

      let bilaraPaths = bpm.trilingualPaths({
        suid,
        rootLang,
        rootAuthor,
        refLang,
        refAuthor,
        docLang,
        docAuthor,
      });
      if (bilaraPaths.length === 0) {
        throw new Error(`${msg} ${suttaRef} not found`);
      }
      let mldOpts = {
        lang: docLang || refLang,
        author_uid: docAuthor || refAuthor,
        sutta_uid: suid,
        bilaraPaths,
        refAuthor,
        refLang,
        refAuthorName,
        docAuthor,
        docAuthorName,
        docLang,
        trilingual:true,
      };
      logLevel && (mldOpts.logLevel = logLevel);
      dbg>1 && console.log(msg, '[1]mldOpts', mldOpts);
      let mld = await new MLDoc(mldOpts).load(root);
      if (dbg) {
        let dbgOut = mld && {
          author: mld.author,
          refLang: mld.refLang,
          refAuthor: mld.refAuthor,
          refAuthorName: mld.refAuthorName,
          docLang: mld.docLang,
          docAuthor: mld.docAuthor,
          docAuthorName: mld.docAuthorName,
          trilingual: mld.trilingual,
          bilaraPaths: mld.bilaraPaths,
          langSegs: mld.langSegs,
          '...': '...',
        };
        console.log(msg, '[2]mld', dbgOut);
      } 
      return mld;
    }

    canonicalSuttaId(id, type="acro") {
      const msg = 'B8a.canonicalSuttaId()';
      if (!this.initialized) {
        let emsg = `${msg}, initialize() required`;
        throw new Error(emsg);
      }
      var { uid_expansion } = this;
      id = this.normalizeSuttaId(id.toLowerCase());
      let nikaya = id.replace(/[-0-9:.]+/, '');
      let [ue] = uid_expansion.filter((ue) => ue.uid === nikaya);
      switch (type) {
        case "name":
          return id.replace(nikaya, ue.name+' ');
        case "acro":
        default:
          return id.replace(nikaya, ue.acro);
      }
    }

    normalizeSuttaId(id) {
      if (!this.initialized) {
        throw new Error(`${this.constructor.name}.` + `initialize() required`);
      }
      var { uid_expansion } = this;
      var suttaIds = this.suttaIds;
      if (typeof id !== "string") {
        if (id.scid) {
          id = id.scid;
        } else {
          throw new Error(`expected string:${JSON.stringify(id)}`);
        }
      }
      id = id.trim();
      var sutta_uid = null;
      if (/[^0-9][1-9]/.test(id)) {
        var tokens = id.toLowerCase().split(" ");
        if (tokens.length > 1) {
          var matches = uid_expansion.filter(
            (ue) => 0 === ue.acro.toLowerCase().localeCompare(tokens[0])
          );
          if (matches.length > 0) {
            sutta_uid = `${matches[0].uid}${tokens.slice(1).join("")}`;
          }
        }
        sutta_uid = sutta_uid || id;
      }
      sutta_uid =
        (sutta_uid &&
          suttaIds.filter((sid) => {
            return (
              SuttaCentralId.compareLow(sid, sutta_uid) <= 0 &&
              0 <= SuttaCentralId.compareHigh(sid, sutta_uid)
            );
          })[0]) ||
        sutta_uid;
      return sutta_uid;
    }

    suttaPath(...args) {
      // DEPRECATED: use docPaths
      this.info(`DEPRECATED: suttaPath => docPaths`);
      return this.docPaths.apply(this, args)[0];
    }

    docPaths(...args) {
      if (!this.initialized) {
        throw new Error(`${this.constructor.name}.initialize() is required`);
      }
      var opts = args[0];
      if (typeof opts === "string") {
        var opts = {
          scid: args[0],
          lang: args[1],
          //language: args[1], // DEPRECATED
          author_uid: args[2],
        };
      }
      // TODO mn1/en/sujato sutta_uid
      var scid = new SuttaCentralId(opts.scid || opts.sutta_uid);
      var sutta_uid = this.normalizeSuttaId(scid.sutta);
      if (!sutta_uid) {
        throw new Error("sutta_uid is required");
      }
      var lang = opts.lang || "en";
      var author = opts.author_uid || opts.author;
      var docs = this.bilaraPathMap.suidLanguages(sutta_uid);
      if (docs.length === 0) {
        return [];
      }
      docs.sort((a,b)=>AuthorsV2.compare(b.author, a.author));
      let authorDocs = docs.filter(doc => doc.author === author);
      if (authorDocs.length) {
        docs = authorDocs;
      } else if (!author) {
        let langDocs = docs.filter(t => t.lang === lang);
        docs = langDocs;
      } else {
        docs = [];
      }
      return docs.map((t) => path.join(this.root, t.bilaraPath));
    }

    nikayaSuttaIds(nikaya, lang = "pli", author) {
      var that = this;
      if (nikaya == null) {
        return Promise.reject(new Error(`nikayaSuttaIds() nikaya is required`));
      }
      var reNikaya = author
        ? new RegExp(`.*/${lang}/${author}/.*${nikaya}/`)
        : new RegExp(`.*/${lang}/.*/${nikaya}/`);
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            await that.initialize();
            var srcFiles = lang === "pli" ? that.rootFiles : that.translations;
            var sutta_uids = srcFiles.reduce((a, t) => {
              if (reNikaya.test(t)) {
                var f = path.basename(t, ".json");
                var sutta_uid = f.replace(/_.*$/, "");
                a.push(sutta_uid);
              }
              return a;
            }, []);
            var cmp = SuttaCentralId.compareLow;
            sutta_uids.sort(cmp);
            resolve(sutta_uids);
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    suttaIndex(suttaRef, strict = true) {
      if (!this.initialized) {
        throw new Error("initialize() is required");
      }
      if (suttaRef == null) {
        throw new Error("suttaIndex(suttaRef?)");
      }
      var sutta_uid = suttaRef.split("/")[0];
      var iEnd = this.suttaIds.length;
      var i1 = 0;
      var i2 = iEnd;
      var cmp;
      while (i1 <= i2) {
        var i = Math.trunc((i1 + i2) / 2);
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
        } else if (i1 < i) {
          // cmp > 0
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
      var prefix = sutta_uid.replace(/[-0-9.:]*$/u, "");
      var dotParts = sutta_uid.substring(prefix.length).split(".");
      var dotLast = dotParts.length - 1;
      var rangeParts = sutta_uid.substring(prefix.length).split("-");
      rangeParts[0] = prefix + rangeParts[0];
      var rangeLast = rangeParts.length - 1;
      if (logical) {
        // logical
        dotParts[dotParts.length - 1] =
          rangeParts.length < 2
            ? `${Number(dotParts[dotLast]) + 1}`
            : `${Number(rangeParts[rangeLast]) + 1}`;
        var uidEnd = prefix + dotParts.join(".");
        return uidEnd;
      } else {
        // physical
        dotParts[dotParts.length - 1] =
          rangeParts.length < 2
            ? `${Number(dotParts[dotLast])}`
            : `${Number(rangeParts[rangeLast])}`;
        var uidLast = prefix + dotParts.join(".");
        var iLast = this.suttaIndex(uidLast, false);
        var uidNext = this.suttaIds[iLast + 1];
        return uidNext;
      }
    }

    suttaList(list) {
      if (typeof list === "string") {
        list = list.split(",");
      }
      try {
        return list.reduce((acc, item) => {
          var suttaRef = item.toLowerCase().replace(/ /gu, "");
          this.expandRange(suttaRef).forEach((item) => acc.push(item));
          return acc;
        }, []);
      } catch (e) {
        throw e;
      }
    }

    expandRange(suttaRef) {
      const msg = "B8a.expandRange";
      const dbg = DBG.SUTTA_UIDSEARCH;
      suttaRef = suttaRef.split(":")[0];
      var reCollection = new RegExp("[0-9].*", "u");
      var collName = suttaRef.replace(reCollection, "");
      var suffix = suttaRef.replace(/[^/]*([a-z\/]*)$/iu, "$1");
      var sref = suttaRef.replace(suffix, "");
      var range = sref.substring(collName.length);
      if (/^[-a-z]+$/.test(range)) {
        // e.g., kusalagnana-maitrimurti-traetow
        return [suttaRef];
      }
      var rl = SuttaCentralId.rangeLow(suttaRef);
      var suttaRefLow = this.suttaIds[this.suttaIndex(rl)];
      if (!suttaRefLow) {
        throw new Error(`Document not found: ${suttaRef} [E5]`);
      }
      var coll = this.publication.pubInfo(suttaRefLow);
      var result = [];
      if (!coll || !coll.length) {
        // no collection
        throw new Error(`Unpublished:${suttaRef} collection:${collName} [E4]`);
      }
      var rangeParts = range.split("-");
      var dotParts = rangeParts[0].split(".");
      let dpLast = dotParts.length - 1;
      if (dpLast > 2) {
        throw new Error(`Invalid sutta reference: ${suttaRef} [E3]`);
      }
      if (dpLast > 0 || coll[0].subchapters) {
        // SN, AN, KN
        if (dpLast === 0) {
          // e.g. SN50
          var prefix = `${sref}.`;
          var first = rangeParts.length === 1 
            ? 1 : Number(rangeParts[0]);
          var last = rangeParts.length === 1 
            ? 999 : Number(rangeParts[1]);
          dbg && console.log(msg, '[1]dpLast0', {prefix, first, last});
        } else {
          var prefix = `${collName}${dotParts.slice(0,dpLast).join('.')}.`;
          var first = Number(dotParts[dpLast]);
          var last = rangeParts.length === 1 
            ? first
            : Number(rangeParts[1]);
          dbg && console.log(msg, '[2]!dpLast0', {prefix, first, last});
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
        var iEnd = (endUid && this.suttaIndex(endUid)) || iCur + 1;
        for (var i = iCur; i < iEnd; i++) {
          result.push(`${this.suttaIds[i]}${suffix}`);
        }
      } else {
        // e.g., MN, DN
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
        var firstItem = `${collName}${first}`;
        var iCur = this.suttaIndex(firstItem, false);
        if (iCur == null) {
          throw new Error(`Sutta ${firstItem} not found`);
        }
        var lastItem = `${collName}${last}`;
        var endUid = this.sutta_uidSuccessor(lastItem);
        var iEnd = endUid ? this.suttaIndex(endUid) : iCur + 1;
        dbg && console.log(msg, '[3]MN_DN', {prefix, first, last});
        for (var i = iCur; i < iEnd; i++) {
          result.push(`${this.suttaIds[i]}${suffix}`);
        }
      }

      dbg && console.log(msg, '=>', result);
      return result;
    }

    authorInfo(author) {
      return Authors.authorInfo(author);
    }

    authorV2Info(author) {
      return AuthorsV2.authorInfo(author);
    }

    sutta_uidSearch(pattern, maxResults = 5) {
      const msg = 'B8a.sutta_uidSearch() ';
      const dbg = DBG.SUTTA_UIDSEARCH;
      var method = "sutta_uid";
      var uids = this.suttaList(pattern).slice(0, maxResults);
      var lang = undefined;
      var suttaRefs = uids.map((ref) => {
        var refParts = ref.split("/");
        var refTranslator = refParts[2];
        var uid = refParts[0];
        var refLang = refParts[1];
        lang == null && (lang = refLang);
        return refTranslator
          ? `${uid}/${refLang}/${refTranslator}`
          : refLang ? `${uid}/${refLang}` : uid;
      });

      let result = {
        method,
        uids,
        suttaRefs,
        lang,
      };

      dbg && console.log(msg, pattern, '=>', result);

      return result;
    }

    version() {
      var pkgPath = path.join(this.root, "package.json");
      var result = {
        major: 1,
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

    readBlurb({ suid, lang }) {
      var that = this;
      var pbody = (resolve, reject) =>
        (async function () {
          try {
            if (!suid) {
              resolve(null);
            }
            suid = suid.toLowerCase();
            lang = lang || that.lang;
            var nikaya = suid.replace(/[1-9].*/, "");
            if (lang === "pli" || lang === "en") {
              var dir = path.join(that.root, "root", lang, "blurb");
              var fname = `${nikaya}-blurbs_root-${lang}.json`;
              var fpath = path.join(dir, fname);
            } else {
              var dir = path.join(that.root, "translation", lang, "blurb");
              var fname = `${nikaya}-blurbs_translation-${lang}.json`;
              var fpath = path.join(dir, fname);
            }
            if (!fs.existsSync(fpath)) {
              if (lang !== "en") {
                var enBlurb = await that.readBlurb({ suid, lang: "en" });
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
          } catch (e) {
            reject(e);
          }
        })();
      return new Promise(pbody);
    }

    async loadSuttaplexJson(
      scid,
      lang,
      author_uid,
      includeUnpublished = this.includeUnpublished
    ) {
      try {
        let suttaplex = await this.scApi.loadSuttaplexJson(scid);
        var allTranslations = (suttaplex && suttaplex.translations) || [];
        var translations = allTranslations;
        if (lang || author_uid) {
          const ANY_LANGUAGE = "*";
          suttaplex.translations = translations = allTranslations.filter(
            (t) =>
              (!lang || lang === ANY_LANGUAGE || t.lang === lang) &&
              (!author_uid || t.author_uid === author_uid)
          );
          this.debug(
            `ScApi.loadSuttaplexJson` +
              `(${scid}, ${lang}, ${author_uid}) ` +
              `${JSON.stringify(suttaplex, null, 2)}`
          );
        }
        translations.sort((a, b) => {
          if (a.segmented === b.segmented) {
            if (a.lang === "pli") {
              return 1;
            }
            if (b.lang === "pli") {
              return -1;
            }
            return (a.author_uid || "").localeCompare(b.author_uid || "");
          }
          return b.segmented ? 1 : -1;
        });
        if (translations.length === 0 || !translations[0].segmented) {
          if (!author_uid) {
            let suidPaths = this.bilaraPathMap.suidPaths(scid);
            let authors = Object.keys(suidPaths).reduce((a, k) => {
              let [t, l, aid] = k.split("/");
              if (t === "translation" && (!lang || lang === l)) {
                a.push(aid);
              }
              return a;
            }, []);
            author_uid = authors[0];
          }
          if (
            this.isBilaraDoc({
              suid: scid,
              lang,
              author: author_uid,
              includeUnpublished,
            })
          ) {
            let ainfo = this.authorV2Info(author_uid);
            let title = allTranslations.reduce((a, t) => {
              return a ? a : t.lang === "pli" && t.title;
            }, null);
            let langInfo = this.languageInfo[lang];

            translations.unshift({
              author: ainfo.author,
              author_short: ainfo.name[0],
              author_uid,
              is_root: false,
              lang,
              lang_name: (langInfo && langInfo.name) || lang,
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
        this.warn(
          `loadSuttaplexJson()`,
          { scid, lang, author_uid, includeUnpublished },
          e.message
        );
        throw e;
      }
    }
  }

  module.exports = exports.BilaraData = BilaraData;
})(typeof exports === "object" ? exports : (exports = {}));
