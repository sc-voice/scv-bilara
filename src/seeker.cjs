(function (exports) {
  const fs = require("fs");
  const path = require("path");
  const { logger } = require("log-instance");
  const { exec } = require("child_process");
  const util = require("util");
  const execPromise = util.promisify(exec);
  const { ScApi } = require("suttacentral-api");
  const { MerkleJson } = require("merkle-json");
  const { Memoizer, Files } = require("memo-again");
  const FuzzyWordSet = require("./fuzzy-word-set");
  const { BilaraPath, SuttaRef, AuthorsV2 } = require("scv-esm");
  const MLDoc = require("./ml-doc");
  const Pali = require("./pali");
  const Unicode = require("./unicode");
  const English = require("./english");
  const BilaraData = require("./bilara-data");
  const { SuttaCentralId } = require("scv-esm");

  const BILARA_PATH = path.join(Files.LOCAL_DIR, "bilara-data");
  const TRANSLATION_PATH = path.join(BILARA_PATH, "translation");
  const MAXBUFFER = 10 * 1024 * 1024;
  const TCMAP = require("./seeker-tcmap.json");
  const MAX_DOC = 50; // Hard limit for reasonable use of resources

  const { 
    DBG,
    DBG_GREP, 
  } = require("./defines.cjs");
  
  var wscount = 0;

  class Seeker {
    constructor(opts = {}) {
      const msg = "Seeker.ctor()";
      const dbg = DBG.SEEKER;
      (opts.logger || logger).logInstance(this, opts);
      let bilaraData =
        (this.bilaraData = opts.bilaraData || new BilaraData(opts));
      let root = 
        (this.root = opts.root || bilaraData.root || BILARA_PATH);
      dbg && console.log(msg, '[1]root', root, this.bilaraData.root);
      this.includeUnpublished =
        opts.includeUnpublished || this.bilaraData.includeUnpublished;
      this.lang = opts.lang || "en";
      this.author = opts.author;
      this.languages = opts.languages || ["pli", "en"];
      this.scApi = opts.scApi || new ScApi();
      this.unicode = opts.unicode || new Unicode();
      this.paliWords = opts.paliWords;
      this.patPrimary = opts.patPrimary || "/sutta/";
      this.mj = new MerkleJson();
      this.exampleCache = opts.exampleCache;
      this.memoizer =
        opts.memoizer ||
        new Memoizer({
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
      this.matchHighlight =
        opts.matchHighlight === undefined
          ? `\u001b[38;5;${this.matchColor}m$&\u001b[0m`
          : "";
      this.matchWordEnd = opts.matchWordEnd;
      this.maxResults = opts.maxResults == null ? 1000 : opts.maxResults;
      this.maxDoc = opts.maxDoc == null ? MAX_DOC : opts.maxDoc;
      this.minLang = opts.minLang || 2;
      this.trilingual = opts.trilingual || false;
    }

    static reWord(lang = this.lang) {
      if (lang === "jpn") {
        return "";
      }
      return "\\b";
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
      pattern = pattern.replace(/["']/g, ".");
      // eliminate tabs, newlines and carriage returns
      pattern = pattern.replace(/\s/g, " ");
      // remove control characters
      pattern = pattern.replace(/[\u0000-\u001f\u007f]+/g, "");
      // must be valid
      new RegExp(pattern);

      return pattern;
    }

    static normalizePattern(pattern) {
      // normalize white space to space
      pattern = pattern.trim().replace(/[\s]+/g, " ").toLowerCase();

      return pattern;
    }

    get initialized() {
      return (
        this.paliWords != null &&
        this.enWords != null &&
        this.bilaraData.initialized
      );
    }

    initialize(msg = "") {
      var that = this;
      var { paliWords, enWords } = this;
      if (paliWords && enWords) {
        return Promise.resolve(that);
      }
      return new Promise((resolve, reject) => {
        (async function () {
          try {
            var p_pali = !paliWords && Pali.wordSet();
            var p_en = !enWords && English.wordSet();
            p_pali && (paliWords = await p_pali);
            p_en && (enWords = await p_en);
            that.paliWords = paliWords;
            that.enWords = enWords;
            await that.bilaraData.initialize();
            //that.log(`Seeker.initialize resolve ${msg}`);
            resolve(that);
          } catch (e) {
            reject(e);
          }
        })();
      });
    }

    static buildExampleCache(examples) {
      let exampleCache = {};
      let keys = Object.keys(examples).filter(
        (k) => k !== "authors" && k !== "comment"
      );
      keys.map((lang) => {
        let eg = examples[lang];
        return eg.reduce((a, e) => {
          let eLower = e.toLowerCase();
          a[eLower] = 1;
          let eClean = Seeker.normalizePattern(Seeker.sanitizePattern(e));
          a[eClean] = 1;
          return a;
        }, exampleCache);
      });
      return exampleCache;
    }

    isExample(pattern = "") {
      var examples = this.bilaraData.examples;
      let { exampleCache } = this;
      if (!exampleCache) {
        this.exampleCache = exampleCache = 
          Seeker.buildExampleCache(examples);
      }
      return !!exampleCache[pattern.toLowerCase()];
    }

    patternLanguage(pattern, lang = this.lang) {
      const msg = "Seeker.patternLanguage() ";
      this.validate();
      if (SuttaCentralId.test(pattern)) {
        var langs = SuttaCentralId.languages(pattern);
        return langs.length === 0 || langs.indexOf(lang) >= 0 
          ? lang : langs[0];
      }
      var keywords = pattern.split(/ +/);
      let searchLang = keywords.reduce((a, k) => {
        if (this.enWords.contains(k)) {
          (!a || a === "pli") && (a = "en");
        } else if (this.paliWords.contains(k)) {
          a = a || "pli";
        } else {
          a = lang;
        }
        return a;
      }, null);
      return searchLang || lang;
    }

    validate() {
      if (!this.initialized) {
        throw new Error(`initialize() is required`);
      }
      return this;
    }

    grepComparator(a, b) {
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
        pat =
          keyword === romKeyword
            ? `\\b${Pali.romanizePattern(keyword)}`
            : keyword;
      }
      if (this.matchWordEnd === true) {
        pat += "\\b";
      }
      return pat;
    }

    tipitakaRegExp(tc = "sutta") {
      var tcParts = tc.toLowerCase().split(",");
      //console.log({tc});
      var pats = tcParts.reduce((a, p) => {
        let pat = TCMAP[p];
        if (pat == null) {
          throw new Error(`tipitakaRegExp(): invalid category:${p}`);
        }
        a.push(pat);
        return a;
      }, []);
      let re;
      if (pats.length) {
        re = new RegExp(`(${pats.join("|")})`, "iu");
      }
      re && this.debug(`tiptakaCategories`, re.toString());
      return re;
    }

    grep(opts = {}) {
      const msg = "Seeker.grep() ";
      const dbg = DBG_GREP;
      var {
        author,
        pattern,
        maxResults,
        lang,
        language, // DEPRECATED
        searchMetadata, // TODO
        tipitakaCategories,
        patPrimary,
      } = opts;
      if (!author) {
        let emsg = `${msg} author is required`;
        console.trace(emsg);
        throw new Error(emsg);
      }
      var reTipCat = this.tipitakaRegExp(tipitakaCategories);
      lang = lang || language || this.lang;
      var root = this.root.replace(`${Files.APP_DIR}/`, "");
      var slowOpts = {
        author,
        pattern,
        maxResults,
        lang,
        language, // DEPRECATED
        searchMetadata, // TODO
        tipitakaCategories,
        reTipCat,
        root,
        patPrimary,
      };
      dbg && console.log(msg, slowOpts);
      var msStart = Date.now();
      var result;
      var { memoizer, grepMemo } = this;
      if (grepMemo == null) {
        this.grepMemo = 
        grepMemo = memoizer.memoize(Seeker.slowGrep, Seeker);
      }
      result = grepMemo(slowOpts);
      var msElapsed = Date.now() - msStart; // about 20ms

      return result;
    }

    static orderPrimary(lines, patPrimary) {
      let rePrimary = new RegExp(patPrimary, "ui");
      let { primary, secondary } = lines.reduce(
        (a, line) => {
          if (rePrimary.test(line)) {
            a.primary.push(line);
          } else {
            a.secondary.push(line);
          }
          return a;
        },
        { primary: [], secondary: [] }
      );
      return primary.concat(secondary);
    }

    static async slowGrep(opts) {
      const msg = "Seeker.slowGrep ";
      const dbg = DBG_GREP;
      try {
        var {
          author,
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

        logger.info(msg, { pattern, lang, root });
        if (searchMetadata) {
          return Promise.reject(new Error(`searchMetadata not supported`));
        }
        var grex = pattern;
        var cwd =
          lang === "pli"
            ? path.join(root, "root/pli")
            : path.join(root, `translation/${lang}`);
        var rgGlob2 = [
          `-g='*-${lang}-${author}.json'`,
        ];
        var rgGlob1 = [
          `-g='!atthakatha' `, // exclude pli/vri
          `-g='!_*' `, // top-level JSON files
          `-g '!name'`, // exclude name
          `-g '!blurb'`, // exclude blurbs
          `-g '!ea'`, // exclude Chinese
          `-g '!ka'`, // exclude Chinese
          `-g '!sa'`, // exclude Chinese
          `-g '!ma'`, // exclude Chinese
        ];
        var rgGlob = rgGlob2;
        var cmd = [
          `rg -c -i -e '${grex}' `,
          ...rgGlob,
          `./`, // Must be explicit for Node 
                // (https://github.com/BurntSushi/ripgrep/issues/2227)
          `|sort -k 2rn -k 1rd -t ':'`,
        ].join(" ");
        maxResults && (cmd += `|head -${maxResults}`);
        var pathPrefix = cwd.replace(root, "").replace(/^\/?/, "");
        var cwdMsg = cwd.replace(`${root}/`, "");
        logger.info(msg, `(${cwdMsg}) ${cmd}`);
        var execOpts = {
          cwd,
          shell: "/bin/bash",
          maxBuffer: MAXBUFFER,
        };
        let { stdout, stderr } = await execPromise(cmd, execOpts);
        let lines = (stdout && stdout.trim().split("\n")) || [];
        let raw = Seeker.orderPrimary(lines, patPrimary);
        let rawTipCat = reTipCat 
          ? raw.filter((f) => reTipCat.test(f)) : raw;
        let paths = rawTipCat.map((f) => path.join(pathPrefix, f));
        dbg && console.log(msg, {cmd, execOpts, lines, paths});
        return paths;
      } catch (e) {
        logger.warn(`slowGrep()`, JSON.stringify(opts), e.message, cmd);
        throw e;
      }
    }

    async phraseSearch(args) {
      const msg = "Seeker.phraseSearch() ";
      this.validate();
      var {
        author,
        searchLang,
        searchAuthor,
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
        throw new Error(`${msg} requires pattern`);
      }
      lang =
        searchLang == null 
          ? this.patternLanguage(pattern, lang) 
          : searchLang;
      if (lang === "pli") {
        var romPat = this.unicode.romanize(pattern);
        var pat =
          romPat === pattern 
            ? `\\b${Pali.romanizePattern(pattern)}` 
            : pattern;
      } else {
        var pat = `${Seeker.reWord(lang)}${pattern}`;
      }
      author = author || AuthorsV2.langAuthor(lang, {
        category:tipitakaCategories,
      });
      this.info(msg, `(${pat},${lang},${author})`);
      var grepArgs = Object.assign({}, args, {
        author: searchAuthor || author,
        pattern: pat,
        lang,
        maxResults,
        tipitakaCategories,
        patPrimary,
      });
      var lines = await this.grep(grepArgs);
      return {
        method: "phrase",
        lang,
        pattern: pat,
        lines,
      };
    }

    async keywordSearch(args) {
      const msg  = "Seeker.keywordSearch() ";
      try {
        var {
          pattern,
          author,
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
        lang =
          searchLang == null
            ? this.patternLanguage(pattern, lang || language)
            : searchLang;
        var wordArgs = Object.assign({}, args, {
          maxResults: 0, // don't clip prematurely
          lang,
          patPrimary,
        });
        this.info(msg, `(${keywords}) lang:${lang}`);
        var mrgOut = [];
        var mrgIn = [];
        for (var i = 0; i < keywords.length; i++) {
          var keyword = keywords[i];
          wordArgs.pattern = this.keywordPattern(keyword, lang);
          //console.log(msg, wordArgs);
          var wordlines = await this.grep(wordArgs);
          wordlines.sort(); // sort for merging path
          mrgOut = [];
          for (var iw = 0; iw < wordlines.length; iw++) {
            var lineparts = wordlines[iw].split(":");
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
        var lines = mrgOut.sort(comparator)
          .map((v) => `${v.fpath}:${v.count}`);
        lines = Seeker.orderPrimary(lines, patPrimary);
        if (maxResults) {
          lines = lines.slice(0, maxResults);
        }
        return {
          method: "keywords",
          resultPattern: keywords
            .map((k) => this.keywordPattern(k, lang))
            .join("|"),
          lang,
          maxResults,
          lines,
        };
      } catch (e) {
        this.warn(msg, JSON.stringify(args), e.message);
        throw e;
      }
    }

    findArgs(args) {
      const msg = "Seeker.findArgs() ";
      const dbg = DBG.SEEKER || DBG.FINDARGS;
      const dbgv = DBG.VERBOSE;
      if (!(args instanceof Array)) {
        throw new Error("findArgs(?ARRAY-OF-ARGS?)");
      }
      if (typeof args[0] === "string") {
        var opts = {
          pattern: args[0],
          maxResults: args[1],
        };
      } else {
        var opts = args[0];
      }
      var {
        author,
        docAuthor,
        docLang = opts.lang,
        includeUnpublished = this.includeUnpublished,
        lang,
        langAuthor,
        language, // DEPRECATED
        languages,
        matchHighlight,
        maxDoc, // maximum number of returned documents
        maxResults, // maximum number of grep files
        minLang, // minimum number of languages
        pattern: rawPattern,
        refAuthor,
        refLang,
        searchLang,
        searchAuthor,
        showMatchesOnly,
        sortLines,
        tipitakaCategories,
        trilingual = this.trilingual,
        types,

      } = opts;
      if (rawPattern == null) {
        throw new Error(`pattern is required`);
      }
      // STEP 1. Transform Pali diacriticals
      rawPattern = rawPattern.replace(/ṃ/gi, "ṁ");

      // STEP 2. extract embeddable options
      var argv = rawPattern.split(" ");
      var pattern = "";
      for (var i = 0; i < argv.length; i++) {
        var arg = argv[i];
        if (arg === "-d" || arg === "--maxDoc") {
          let n = Number(argv[++i]);
          if (!isNaN(n) && 0 < n) {
            maxDoc = n;
          }
        } else if (arg === "-mr" || arg === "--maxResults") {
          let n = Number(argv[++i]);
          if (!isNaN(n) && 0 < n && n < 4000) {
            maxResults = n;
          }
        } else if (arg.startsWith("-tc:")) {
          tipitakaCategories = arg.substring("-tc:".length);
        } else if (arg === "-ml1") {
          minLang = 1;
        } else if (arg === "-ml2") {
          minLang = 2;
        } else if (arg === "-ml3") {
          minLang = 3;
        } else if (arg === "-ml" || arg === "--minLang") {
          let n = Number(argv[++i]);
          if (!isNaN(n) && 0 < n && n <= 3) {
            minLang = n;
          }
        } else if (arg === "-da" || arg === "--doc-author") {
          docAuthor = argv[++i];
          trilingual = true;
        } else if (arg === "-dl" || arg === "--doc-lang") {
          docLang = argv[++i];
          lang = docLang; // override legacy 
          trilingual = true;
        } else if (arg === "-ra" || arg === "--ref-author") {
          refAuthor = argv[++i];
          trilingual = true;
        } else if (arg === "-rl" || arg === "--ref-lang") {
          refLang = argv[++i];
          trilingual = true;
        } else if (arg === "-l" || arg === "--lang") {
          if ((arg = argv[++i])) {
            lang = arg;
            docLang = arg;
          }
        } else if (arg === "-sl" || arg === "--searchLang") {
          (arg = argv[++i]) && (searchLang = arg);
        } else {
          pattern = pattern ? `${pattern} ${arg}` : arg;
        }
      }

      // STEP 3. Assign default values
      if (trilingual) {
        author = author || docAuthor; // override legacy 
      }
      if (refLang == null) {
        let info = AuthorsV2.authorInfo(refAuthor);
        refLang = info && info.lang || 'en';
      }
      if (refAuthor == null) {
        refAuthor = AuthorsV2.langAuthor(refLang);
      }
      lang = lang || language || docLang || this.lang;
      langAuthor = langAuthor || author ||
        AuthorsV2.langAuthor(lang, {tipitakaCategories});
      if (searchLang == null) {
        switch (docLang) {
          case undefined:
          case null:
          case 'de':
          case 'en':
            searchLang = this.patternLanguage(pattern, lang) 
            dbgv && console.log(msg, '[1]searchLang', searchLang);
            break;
          default:
            searchLang = docLang;
            dbgv && console.log(msg, '[2]searchLangDoc', searchLang);
            break;
        }
      }
      minLang = minLang || 2;
      pattern = Seeker.sanitizePattern(pattern);
      pattern = Seeker.normalizePattern(pattern);
      showMatchesOnly == null && (showMatchesOnly = true);
      languages = languages || this.languages.slice() || [];
      lang && !languages.includes(lang) && languages.push(lang);
      refLang === searchLang && 
        !languages.includes('ref') && languages.push('ref');
      let isSuttaRef = SuttaCentralId.test(pattern);
      maxResults = Number(maxResults == null 
        ? this.maxResults : maxResults);
      if (isNaN(maxResults)) {
        throw new Error("maxResults must be a number");
      }
      maxDoc = isSuttaRef
        ? MAX_DOC
        : Number(maxDoc == null ? this.maxDoc : maxDoc);
      if (isNaN(maxDoc)) {
        throw new Error("maxDoc must be a number");
      }

      matchHighlight == null && (matchHighlight = this.matchHighlight);
      if (!author) {
        author = searchLang && AuthorsV2.langAuthor(searchLang, {
          category: tipitakaCategories,
        });
      }
      if (!author) {
        author = this.author;
      }
      if (trilingual) {
        if (isSuttaRef) {
          let [ patSuid, patLang, patAuthor ] = pattern.split('/');
          if (patLang) {
            author = docAuthor;
            patAuthor = patAuthor || AuthorsV2.langAuthor(patLang);
            docAuthor = patAuthor || docAuthor;
            author = docAuthor;
            docLang = patLang;
          } 
          docAuthor = docAuthor || patAuthor;
        }
        docAuthor = docAuthor || 
          AuthorsV2.langAuthor(docLang) || 
          'sujato';
        if (docLang == null) {
          let info = AuthorsV2.authorInfo(docAuthor);
          docLang = info && info.lang;
        }
      }

      types = types || ["root", "translation"];

      //console.log(msg, {docLang, docAuthor, isSuttaRef});
      if (docLang == null) {
        if (isSuttaRef) {
          let pats = pattern.split(',');
          let [ segref, patLang, patAuthor ] = pats[0].split("/");
          patLang && (docLang = patLang);
          docLang = patLang || lang;
          patAuthor && (docAuthor = patAuthor);
        } else {
          docLang = lang;
        }
      }
      docAuthor = docAuthor || AuthorsV2.langAuthor(docLang);;
      searchAuthor = searchAuthor || 
        docLang === searchLang && docAuthor ||
        refLang === searchLang && refAuthor ||
        AuthorsV2.langAuthor(searchLang) ||
        docAuthor;

      let result = {
        author,
        docLang,
        docAuthor,
        includeUnpublished,
        lang,
        langAuthor,
        languages,
        matchHighlight,
        maxDoc,
        maxResults,
        minLang,
        pattern,
        refAuthor,
        refLang,
        searchLang,
        searchAuthor,
        showMatchesOnly,
        sortLines,
        tipitakaCategories,
        trilingual,
        types,
      };
      dbg && console.log(msg, '[4]=>', result);
      return result;
    }

    clearMemo(name) {
      var cache = this.memoizer.cache;
      if (name === "find") {
        return cache.clearVolume(`Seeker.callSlowFind`);
      } else if (name === "grep") {
        return cache.clearVolume(`Seeker.slowGrep`);
      }
    }

    find(...args) {
      const msg = "Seeker.find() ";
      let dbg = DBG.FIND;
      var { findMemo, memoizer } = this;
      var findArgs = this.findArgs(args);
      var that = this;
      var callSlowFind = (args) => {
        return that.slowFind.call(that, args);
      };
      var msStart = Date.now();
      //var pattern =  typeof args === 'string'
      //? args
      //: args[0].pattern;
      let { pattern, trilingual } = findArgs;
      if (this.isExample(pattern)) {
        dbg && console.log(msg, '[1]example', {
          trilingual,
          pattern,
        });
        if (findMemo == null) {
          that.findMemo = 
          findMemo = memoizer.memoize(callSlowFind, Seeker);
        }
        var promise = findMemo(findArgs);
        this.debug(`${msg} example:${pattern}`);
      } else {
        this.info(`${msg} non-example:${pattern}`);
        dbg && console.log(msg, '[2]!example', {
          trilingual,
          pattern,
        });
        var promise = callSlowFind(findArgs);
      }
      return promise;
    }

    slowFindId(opts={}) {
      const msg = "Seeker.slowFindId() ";
      const dbg = DBG.SEEKER || DBG.SLOWFIND || DBG.SLOWFINDID;
      const dbgv = DBG.VERBOSE && dbg;
      let { 
        lang='en', 
        languages=['pli','en'], 
        maxResults, 
        pattern,
        author,
        docLang,
        docAuthor,
        refLang, 
        refAuthor,
        trilingual,
      } = opts;
      var bd = this.bilaraData;
      var examples = bd.examples;
      var resultPattern = pattern;
      let method, uids, suttaRefs;

      if (!SuttaCentralId.test(pattern)) {
        dbg && console.log(msg, '[1]!sutta-id', ({pattern}));
        this.debug(msg, 'not sutta id', {pattern});
        return undefined;
      }

      maxResults = maxResults || this.maxResults;
      if (pattern.indexOf("/") < 0) {
        pattern = pattern
          .split(",")
          .map((p) => `${p}/${lang}`)
          .join(",");
      }
      pattern = pattern.replace(/:[^/,]*/g, ''); // remove segment refs
      if (trilingual) { 
        // trilingual always uses pli, so remove language bias
        // triglingual relies on docAuthor, docLang, refLang, refAuthor
        pattern = pattern.replace(/\/[-a-z0-9.]*/ig, '');
      }
      let res = bd.sutta_uidSearch(pattern, maxResults);
      dbgv && console.log(msg, '[2]sutta_uidSearch', res);
      method = res.method;
      uids = res.uids;
      suttaRefs = res.suttaRefs;
      res.lang && (lang = res.lang);
      if (!languages.includes(lang)) {
        languages = [...languages.filter((l) => l !== "en"), lang];
      }
      let result = {
        lang,
        maxResults,
        pattern,
        method,
        uids,
        suttaRefs,
        languages,
        docLang,
        docAuthor,
        refLang, 
        refAuthor,
        trilingual,
      };
      dbg && console.log(msg, '=>', result);
      return result;
    }

    async slowFind(findArgs) {
      const msg = "Seeker.slowFind() ";
      const dbg = DBG.SLOWFIND;
      try {
        var msStart = Date.now();
        let result;
        if (findArgs.trilingual) {
          dbg && console.log(msg, "[1]slowFind", findArgs.pattern);
          result = this.slowFindTrilingual(findArgs)
        } else {
          dbg && console.log(msg, "[2]slowFindLegacy", findArgs.pattern);
          result = this.slowFindLegacy(findArgs);
        }
        var msElapsed = Date.now() - msStart;
        let secs = `${(msElapsed/1000).toFixed(3)}s`;
        logger.info(msg, findArgs.pattern, secs);
        return result;
      } catch (e) {
        this.warn(msg, JSON.stringify(findArgs), e.message);
        throw e;
      }
    }

    async slowFindLegacy(findArgs) {
      const msg = "Seeker.slowFindLegacy() ";
      const dbg = DBG.SEEKER || DBG.SLOWFIND;
      var msStart = Date.now();
      var {
        author,
        includeUnpublished,
        docLang,
        docAuthor,
        lang,
        languages,
        matchHighlight,
        maxDoc,
        maxResults,
        minLang=2,
        pattern,
        refAuthor = "sujato",
        refLang,
        searchLang,
        showMatchesOnly,
        sortLines,
        tipitakaCategories,
        trilingual,
        types,
      } = findArgs;
      var bd = this.bilaraData;
      var examples = bd.examples;
      var resultPattern = pattern;
      var scoreDoc = true;
      let method, uids, suttaRefs;
      let isSuidPattern = SuttaCentralId.test(pattern);

      if (examples[lang] && examples[lang].indexOf(pattern) >= 0) {
        searchLang = lang;
      }

      if (isSuidPattern) {
        dbg && console.log(msg, '[1]slowFindId', pattern);
        let res = this.slowFindId({ 
          author, lang, languages, maxResults, pattern,
          docLang, docAuthor, refLang, refAuthor, trilingual,
        });
        lang = res.lang;
        maxResults = res.maxResults;
        method = res.method;
        uids = res.uids;
        suttaRefs = res.suttaRefs;
        languages = res.languages;
        scoreDoc = false;
      } else {
        dbg && console.log(msg, '[2]slowFindPhrase', pattern);
        let res = await this.slowFindPhrase({
          author,
          lang,
          maxResults,
          pattern,
          searchLang,
          showMatchesOnly,
          sortLines,
          tipitakaCategories,
        });
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
        let [suid, srLang, authorId] = suttaRef.split("/");
        author = authorId || author;
        let suttaInfo = bd.suttaInfo(suttaRef);
        if (!suttaInfo) {
          this.info(`skipping ${suttaRef}`);
          continue;
        }
        let isBilDoc = bd.isBilaraDoc({
          suid,
          lang: srLang || docLang || lang,
          author: author,
          includeUnpublished,
        });
        let mld;
        if (isBilDoc) {
          let mldOpts = {
            suid,
            languages,
            lang,
            types,
          };
          if (method==="sutta_uid" && author!=null && author!=="ms") {
            mldOpts.author = author;
          }
          mld = await bd.loadMLDoc(mldOpts);
          var mldBilaraPaths = mld.bilaraPaths.sort();
          if (mldBilaraPaths.length < minLang) {
            //console.log(msg, `skipping ${mld.suid} ${mld.title}`);
            this.debug(
              `skipping ${mld.suid} minLang`,
              `${mldBilaraPaths.length}<${minLang} [${languages}]`
            );
            continue;
          }
          bilaraPaths = [...bilaraPaths, ...mldBilaraPaths];
          var resFilter = mld.filterSegments({
            pattern,
            resultPattern,
            languages: [searchLang],
            showMatchesOnly,
            method,
          });
          mld.segsMatched = resFilter.matched;
          segsMatched += mld.segsMatched;
          if (matchHighlight) {
            mld.highlightMatch(resultPattern, matchHighlight);
          }
          if (resFilter.matched === 0) {
            this.info(`Ignoring ${mld.suid} ${pattern}`);
          } else if (mld.bilaraPaths.length >= minLang) {
            let segIds = Object.keys(mld.segMap);
            if (segIds.length) {
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
            lang: refLang || lang,
            author,
            includeUnpublished: true,
          });
          if (isBilDocUnpub) {
            this.debug(
              `slowFind() -> unpublished:`,
              `${suid}/${refLang || lang}/${author}`
            );
          } else {
            this.warn(`NOT SUPPORTED: legacy ${suid}`);
          }
        }
      }
      scoreDoc && mlDocs.sort(MLDoc.compare);
      mlDocs = mlDocs.slice(0, maxDoc);
      var result = {
        author,
        lang, // embeddable option
        searchLang, // embeddable option
        minLang, // embeddable option
        maxDoc, // embeddable option
        maxResults, // embeddable option

        pattern,
        method,
        resultPattern,
        segsMatched,
        bilaraPaths,
        suttaRefs: matchingRefs,
        mlDocs,
        refLang,
        refAuthor,
        docLang,
        docAuthor,
      };
      return result;
    }

    async slowFindTrilingual(findArgs) {
      const msg = "Seeker.slowFindTrilingual()";
      const dbg = DBG.SEEKER || DBG.SLOWFIND || DBG.SLOWFINDID;
      const dbgv = DBG.VERBOSE && dbg;
      var msStart = Date.now();
      var {
        author,
        includeUnpublished,
        docLang,
        docAuthor,
        lang,
        languages,
        matchHighlight,
        maxDoc,
        maxResults,
        minLang=2,
        pattern,
        refAuthor = "sujato",
        refLang,
        searchLang,
        showMatchesOnly,
        sortLines,
        tipitakaCategories,
        trilingual,
        types,
      } = findArgs;
      var bd = this.bilaraData;
      var examples = bd.examples;
      var resultPattern = pattern;
      var scoreDoc = true;
      let method, uids, suttaRefs;
      let isSuidPattern = SuttaCentralId.test(pattern);

      if (examples[lang] && examples[lang].indexOf(pattern) >= 0) {
        searchLang = lang;
      }

      if (isSuidPattern) {
        dbg && console.log(msg, '[1]slowFindId');
        let res = this.slowFindId({ 
          author, lang, languages, maxResults, pattern,
          docLang, docAuthor, refLang, refAuthor, trilingual,
        });
        lang = res.lang;
        maxResults = res.maxResults;
        method = res.method;
        uids = res.uids;
        suttaRefs = res.suttaRefs;
        languages = res.languages;
        scoreDoc = false;
      } else {
        dbg && console.log(msg, '[2]slowFindPhrase');
        let res = await this.slowFindPhrase({
          author,
          lang,
          maxResults,
          pattern,
          searchLang,
          showMatchesOnly,
          sortLines,
          tipitakaCategories,
        });
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
      dbg && console.log(msg, '[3]suttaRefs', suttaRefs);
      for (var i = 0; i < suttaRefs.length; i++) {
        let suttaRef = suttaRefs[i];
        let [suid, srLang, authorId] = suttaRef.split("/");
        author = authorId || author;
        let suttaInfo = bd.suttaInfo(suttaRef);
        if (!suttaInfo) {
          this.info(`skipping ${suttaRef}`);
          continue;
        }
        let isBilDoc = bd.isBilaraDoc({
          suid,
          lang: 'pli',
          author: 'ms',
          includeUnpublished,
        });
        let mld;

        if (isBilDoc) {
          let mldOpts = {
            refLang,
            refAuthor,
            docLang,
            docAuthor,
            trilingual,
          }
          mld = await bd.trilingualDoc(suttaRef, mldOpts);
          dbg && console.log(msg, '[3]trilingualDoc', suttaRef, {
            score: mld?.score,
            langSegs: mld?.langSegs,
          });
          var mldBilaraPaths = mld.bilaraPaths.sort();
          if (mldBilaraPaths.length < minLang) {
            dbg && console.log(msg, '[4]!minLang', mld.suid,
              `${mldBilaraPaths.length}<${minLang} [${languages}]`
            );
            continue;
          }
          bilaraPaths = [...bilaraPaths, ...mldBilaraPaths];
          let filterLangs = [searchLang];
          if (searchLang === refLang) {
            filterLangs.push('ref');
          }
          let filterOpts = {
            pattern,
            resultPattern,
            languages: filterLangs,
            showMatchesOnly,
            method,
          }
          var resFilter = mld.filterSegments(filterOpts);
          dbg && console.log(msg, '[4]filterSegments', 
            resFilter.matched, filterOpts);

          mld.segsMatched = resFilter.matched;
          segsMatched += mld.segsMatched;
          if (matchHighlight) {
            mld.highlightMatch(resultPattern, matchHighlight);
          }
          if (resFilter.matched === 0) {
            dbg && console.log(msg, '[5]ignoring', suttaRef, resFilter);
            this.info(`Ignoring ${mld.suid} ${pattern}`);
          } else if (mld.bilaraPaths.length >= minLang) {
            let segIds = Object.keys(mld.segMap);
            if (segIds.length) {
              dbg && console.log(msg, '[6]mlDocs', suttaRef);
              mlDocs.push(mld);
              matchingRefs.push(suttaRef);
            } else {
              dbg && console.log(msg, '[7]skipping', suttaRef);
              this.info(`skipping ${mld.suid} segments:0`);
            }
          } else {
            dbg && console.log(msg, '[8]ignoring', suttaRef);
            this.info(`skipping ${mld.suid} minLang:${minLang}`);
          }
        } else {
          let isBilDocUnpub = bd.isBilaraDoc({
            suid,
            lang: refLang || lang,
            author,
            includeUnpublished: true,
          });
          dbg && console.log(msg, '[9]isBilDocUnpub', isBilDocUnpub);
          if (isBilDocUnpub) {
            dbg && console.log(msg,
              `slowFind() -> unpublished:`,
              `${suid}/${refLang || lang}/${author}`
            );
          } 
        }
      }
      scoreDoc && mlDocs.sort(MLDoc.compare);
      mlDocs = mlDocs.slice(0, maxDoc);
      var result = {
        author,
        lang, // embeddable option
        searchLang, // embeddable option
        minLang, // embeddable option
        maxDoc, // embeddable option
        maxResults, // embeddable option

        pattern,
        method,
        resultPattern,
        segsMatched,
        bilaraPaths,
        suttaRefs: matchingRefs,
        mlDocs,
        refLang,
        refAuthor,
        docLang,
        docAuthor,
        trilingual,
      };
      return result;
    }

    async slowFindPhrase(args = {}) {
      const msg = "Seeker.slowFindPhrase() ";
      const dbg = DBG.SEEKER;
      let {
        author,
        lang,
        maxResults,
        pattern,
        searchLang = args.lang,
        searchAuthor = args.author,
        showMatchesOnly,
        sortLines,
        tipitakaCategories,
      } = args;
      author = author || AuthorsV2.langAuthor(searchLang, {
        category: tipitakaCategories,
      });
      try {
        let msStart = Date.now();
        let bd = this.bilaraData;
        let examples = bd.examples;
        var resultPattern = pattern;
        let scoreDoc = true;
        let method = "phrase";
        let uids, suttaRefs;
        let searchOpts = {
          author,
          pattern,
          searchLang,
          maxResults,
          lang,
          showMatchesOnly,
          tipitakaCategories,
        };

        var { lines, pattern: resultPattern } = await this.phraseSearch(
          searchOpts
        );
        if (lines.length) {
          dbg && console.log(msg, {resultPattern, lines});
          this.debug(msg, `phrase`, { 
            resultPattern, lines: lines.length });
        } else {
          method = "keywords";
          let data = await this.keywordSearch(searchOpts);
          var { lines, resultPattern } = data;
          this.debug(msg, `keywords`, {
            resultPattern,
            lines: lines.length,
          });
        }
        sortLines && lines.sort(sortLines);
        suttaRefs = 
          lines.map((line) => BilaraPath.pathParts(line).suttaRef);
        dbg && console.log(msg, `suttaRefs`, suttaRefs);
        return {
          method,
          resultPattern,
          sortLines,
          suttaRefs,
        };
      } catch (e) {
        this.warn('logLevel', this.logLevel);
        this.warn(msg,
          JSON.stringify({
            lang,
            maxResults,
            pattern,
            searchLang,
            showMatchesOnly,
            sortLines,
            tipitakaCategories,
          }),
          e.message
        );
        throw e;
      }
    }

    static serialize(obj) {
      return JSON.stringify(obj, null, 2);
    }

    static deserialize(buf) {
      var json = JSON.parse(buf);
      var { volume, args, value } = json;
      if (volume === "Seeker.callSlowFind") {
        json.value.mlDocs = json.value.mlDocs.map((m) => new MLDoc(m));
      }
      return json;
    }
  }

  module.exports = exports.Seeker = Seeker;
})(typeof exports === "object" ? exports : (exports = {}));
