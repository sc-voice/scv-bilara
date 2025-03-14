(function (exports) {
const fs = require("fs");
const path = require("path");
const { logger } = require('log-instance');
const { Files } = require('memo-again');
const { AuthorsV2, BilaraPath } = require("scv-esm");
const Unicode = require('./unicode');
const Pali = require('./pali');
const { SuttaCentralId } = require('scv-esm');
const BILARA_PATH = path.join(Files.LOCAL_DIR, 'bilara-data');
const { DBG, DBG_MLD, } = require("./defines.cjs");

class MLDoc {
  constructor(opts = {}) {
    const msg = 'M3c.ctor:';
    const dbg = DBG.MLD_CTOR;
    dbg>1 && console.log(msg, '[1]opts', opts);
    (opts.logger || logger).logInstance(this, opts);
    var {
      author,
      author_uid,
      bilaraPaths,
      category = 'sutta',
      footer = MLDoc.SC_FOOTER,
      hyphen = "\u00ad",
      lang,
      langSegs,
      maxWord = 30,
      minWord = 5,
      score = 0, // search relevance
      segMap = {},
      segsMatched,
      sutta_uid,
      title,
      trilingual,
      type = 'translation',
    } = opts;
    if (bilaraPaths == null) {
      throw new Error(`bilaraPaths is required`);
    }
    lang = lang || MLDoc.bilaraPathLanguages(bilaraPaths, lang).pop();
    if (author == null) {
      let aInfo = AuthorsV2.authorInfo(author_uid);
      author = aInfo?.name?.join(', ');
    }
    if (author) {
      this.author = author;
    }

    Object.assign(this, {
      segMap, // For console debugging, this is first

      author,
      author_uid,
      bilaraPaths,
      category,
      footer,
      hyphen,
      lang,
      langSegs,
      maxWord,
      minWord,
      score,
      segsMatched,
      sutta_uid,
      title,
      type,
    });
    if (trilingual) {
      this.trilingual = trilingual;
      this.docLang = opts.docLang;
      this.docAuthor = opts.docAuthor;
      this.docAuthorName = opts.docAuthorName;
      let docInfo = AuthorsV2.authorInfo(this.docAuthor);
      if (docInfo) {
        this.docAuthorName = docInfo.name?.join(', ');
        this.docFooter = MLDoc.SC_FOOTER;
      }
      this.refLang = opts.refLang || 'en';
      this.refAuthor = opts.refAuthor || 'sujato';
      this.refAuthorName = opts.refAuthorName;
      let refInfo = AuthorsV2.authorInfo(this.refAuthor);
      if (refInfo) {
        this.refAuthorName = refInfo.name?.join(', ');
        this.refFooter = MLDoc.SC_FOOTER;
      }
    }
    Object.defineProperty(this, "unicode", {
      value: opts.unicode || new Unicode(),
    });
  }

  static get SC_FOOTER() {
    return [
      '<a href="https://suttacentral.net/licensing" target="_blank">',
      'SuttaCentral',
      '</a>',
    ].join('');
  }

  static compare(m1, m2) {
    var cmp = m2.score - m1.score;
    return cmp ? cmp : SuttaCentralId.compareLow(m1.suid, m2.suid);
  }

  static langCompare_pli_en(a, b) {
    if (a === b) {
      return 0;
    }

    if (a === 'pli') { // Pali is primary source
      return -1;
    } else if (b === 'pli') {
      return 1;
    }

    if (a === 'en') { // English is secondary source
      return -1;
    } else if (b === 'en') {
      return 1;
    }

    return a.localeCompare(b); // arbitrary but consistent
  }

  get suid() {
    var {
      bilaraPaths,
      sutta_uid,
    } = this;
    return sutta_uid || bilaraPaths.reduce((a, bp) => {
      var suid = BilaraPath.pathParts(bp).suid;
      if (a && suid !== a) {
        throw new Error(`uid mismatch ` +
          `expected:${a} ` +
          `actual:${suid} `);
      }
      return a || suid;
    }, null);
  }

  get root_text() {
    return this.bilaraPaths.reduce((a, bp) => {
      var parts = BilaraPath.pathParts(bp);
      return parts.type === 'root' ? parts : a;
    }, undefined);
  }

  get translations() {
    let {
      bilaraPaths,
      author_uid,
      lang,
      type,
      sutta_uid,
      category,
    } = this;
    if (bilaraPaths.length) {
      return bilaraPaths
        .map(bp => BilaraPath.pathParts(bp))
        .filter(t => t.type === 'translation');
    } else {
      return [{ // legacy translation
        type,
        lang,
        author_uid,
        category,
        collection: sutta_uid.replace(/[-0-9.]+/, ''),
        suttaRef: `${sutta_uid}/${lang}/${author_uid}`,
        //bilaraPath: translationPath('an/an1/an1.1-10','en','sujato'),
        sutta_uid,
      }];
    }
  }

  titles(lang = this.lang) {
    const msg = 'M3c.titles:';
    const dbg = DBG.MLD_TITLES;
    let headSegs = this.segments().slice(0,4);
    dbg && console.log(msg, {lang, headSegs});
    var titles = headSegs.slice(0, 4).reduce((a, s, i) => {
      if (s) {
        let text = (s[lang] || s.en || s.pli || '');
        let segNum = s.scid.split(':')[1];
        if (segNum.match(/^0/)) {
          text.length && a.push(text.trim());
        } else {
          this.debug(`titles() ignoring segments[${i}] with segNum:${segNum}`, s);
        }
      }
      return a;
    }, []);
    if (titles.length === 0) {
      titles = [`(no-title-${this.suid})`];
    }
    return titles;
  }

  scids() {
    var result = Object.keys(this.segMap);
    result.sort(SuttaCentralId.compareLow);
    return result;
  }

  static bilaraPathLanguages(bilaraPaths, lang='en') {
    return bilaraPaths.length
      ? Object.keys(bilaraPaths.reduce((a, bp) => {
        a[bp.split('/')[1]] = true;
        return a;
      }, {})).sort(MLDoc.langCompare_pli_en)
      : [lang];
  }

  async load(root = BILARA_PATH) {
    const msg = "M3c.load() ";
    const dbg = DBG.MLD_LOAD;
    try {
      var {
        segMap,
        bilaraPaths,
        docLang,
        docAuthor,
        docAuthorName,
        refLang,
        refAuthor,
        refAuthorName,
        trilingual,
      } = this;
      this.langSegs = {};
      let langMap = {};
      var p_bp = [];
      dbg && console.log(msg, '[1]', 
        {bilaraPaths, docLang, docAuthor, refLang, refAuthor});

      for (var ip = 0; ip < bilaraPaths.length; ip++) {
        var parts = BilaraPath.pathParts(bilaraPaths[ip]);
        var bp = path.join(root, parts.bilaraPath);
        var fh = fs.existsSync(bp) && await fs.promises.open(bp);
        var isTrans = parts.type === 'translation';
        var isRoot = parts.type === 'root';
        var lang = isTrans || isRoot
          ? parts.lang
          : parts.type;
        if (trilingual && parts.author_uid === refAuthor) {
          lang = 'ref';
        }
        if (langMap[lang]) {
          dbg && console.log(msg, `[2]skipping: ${bilaraPaths[ip]}`);
          fh && fh.close();
          continue;
        }
        langMap[lang] = true;
        if (fh) {
          try {
            var bpe = {
              fh,
              bp,
              p_read: fh.readFile(),
              lang,
            };
            p_bp.push(bpe);
          } catch(e) {
            this.warn(`${msg} Could not read Bilara file:`, bp);
            throw e;
          }
        } else {
          this.log(`${msg} path not found:${bp}`);
        }
      }

      // assemble content
      let sameAuthor = trilingual &&
        refLang === docLang && 
        refAuthor === docAuthor;
      for (var ip = 0; ip < p_bp.length; ip++) {
        var { fh, bp, p_read, lang, } = p_bp[ip];
        let copyRefDoc = lang === 'ref' && sameAuthor;
        var json = await p_read;
        let header;
        try {
          let strings = JSON.parse(json);
          header = strings.__header__;
          if (header) {
            delete strings.__header__;
            let { refAuthor, docAuthor } = this;
            this.sutta_uid = header.suid;
            this.lang = this.lang || header.lang;
            if (refAuthor === header.author_uid) {
              dbg && console.log(msg, 'ref');
              this.refAuthorName = header.author;
              this.refFooter = header.footer;
            }
            if (docAuthor === header.author_uid) {
              this.docAuthorName = header.author;
              this.docFooter = header.footer;
            }

            if (dbg) {
              let show = {
                lang: this.lang,
                docAuthor,
                docAuthorName: this.docAuthorName,
                docFooter: this.docFooter,
                refAuthor,
                refAuthorName: this.refAuthorName,
                refFooter: this.refFooter,
              }
              if (dbg > 1) {
                show.header = header;
              }
              console.log(msg, '[3]__header__', show);
            }
          }
          fh.close();
          let keys = Object.keys(strings);
          this.langSegs[lang] = keys.length;
          keys.forEach(k => {
            var m = (segMap[k] = segMap[k] || {
              scid: k,
            });
            m[lang] = strings[k];
            if (copyRefDoc) {
              m[docLang] = strings[k];
            }
          });
        } catch(e) {
          this.warn(`${msg} Could not read Bilara file:`, bp);
          throw e;
        }
      }
      this.title = this.titles().join('\n');

      return this;
    } catch (e) {
      this.warn(msg, e.message);
      throw e;
    }
  }

  segments() {
    return this.scids().map(scid => Object.assign({
      scid,
    }, this.segMap[scid]));
  }

  matchScid({ seg, scidPat }) {
    var match = SuttaCentralId.match(seg.scid, scidPat);
    return match;
  }

  matchText({ seg, languages, rexList }) {
    var unicode = this.unicode;
    return languages.reduce((a, l) => {
      var text = seg[l];
      if (!a && text) {
        if (rexList.reduce((a, re) => a && re.test(text), true)) {
          return true;
        } else if (l === 'pli') {
          var romText = unicode.romanize(text);
          return rexList.reduce(
            (a, re) => a && re.test(romText), true);
        }

      }
      return a;
    }, false);
  }

  jsPattern(pat, opts = 'ui') {
    var p = pat.toString();
    const quotes = `"'\u0060\u2018\u201e\u201c\u201a`;
    var result = p.startsWith('\\b')
      ? new RegExp(`(?<=[\\s,.:;${quotes}]|^)${p.substring(2)}`, opts)
      : new RegExp(p, opts);
    return result;
  }

  hyphenate(hyphenator = new Pali()) {
    var { maxWord, } = hyphenator;
    var lang = "pli";
    var scids = this.scids();
    scids.forEach((scid, i) => {
      var seg = this.segMap[scid];
      var text = seg[lang];
      var words = text.split(" ");
      var changed = false;
      var hyphenated = words.reduce((a, w) => {
        if (w.length > maxWord) {
          changed = true;
          a.push(hyphenator.hyphenate(w));
        } else {
          a.push(w);
        }
        return a;
      }, []);
      changed && (seg[lang] = hyphenated.join(" "));
    });
  }

  filterSegments(...args) {
    const msg = "M3c.filterSegments()";
    const dbg = DBG_MLD;
    if (typeof args[0] === 'string') {
      var opts = {
        resultPattern: args[0],
        languages: args[1],
        showMatchesOnly: args[2],
      }
    } else {
      opts = args[0];
    }
    var {
      pattern,
      resultPattern,
      languages,
      showMatchesOnly,
      method,
    } = opts;
    var matchScid = SuttaCentralId.test(resultPattern);
    showMatchesOnly = showMatchesOnly === undefined
      ? true : showMatchesOnly;
    languages = languages === undefined
      ? this.languages() : languages;
    pattern = pattern || resultPattern;
    var scids = this.scids();
    var suid = this.suid;
    if (resultPattern instanceof RegExp) {
      var rexList = [this.jsPattern(resultPattern)];
    } else if (1 && method === 'phrase') {
      var rexList = [this.jsPattern(resultPattern, 'imu')];
    } else if (matchScid) {
      // SuttaCentral.match
    } else {
      let resultPatterns = resultPattern.split('|');
      let patterns = pattern.split(' ').map(p => {
        return p.charAt(0) === '_'
          ? p.substring(1)  // unconstrained match
          : `\\b${p}`;    // word start match
      });
      let srcPats = resultPatterns.length === patterns.length
        ? resultPatterns
        : patterns;
      var rexList = srcPats.map(p => this.jsPattern(p));
    }
    var unicode = this.unicode;
    var matchLow = SuttaCentralId.rangeLow(resultPattern);
    var matchHigh = SuttaCentralId.rangeHigh(resultPattern);
    var matched = 0;
    scids.forEach((scid, i) => {
      var seg = this.segMap[scid];
      var match;
      if (matchScid) {
        match = SuttaCentralId.match(seg.scid, pattern);
        dbg>1 && console.log(msg, '[1]matchScid', {
          pattern, seg, match});
      } else {
        match = this.matchText({ seg, languages, rexList });
        dbg>1 && console.log(msg, '[2]matchScid', {
          pattern, seg, match, languages});
      }
      if (match) {
        matched++;
        seg.matched = true;
      } else {
        showMatchesOnly && delete this.segMap[scid];
      }
    });
    dbg && console.log(msg, '[3]', {
      matched, pattern, suid, languages,});
    var score = matchScid
      ? 0
      : Number((matched + matched / scids.length).toFixed(3));
    this.score = score;
    return {
      matched,
      matchLow,
      matchHigh,
      matchScid,
      rexList,
      suid,
      score,
    }
  }

  highlightMatch(pattern, matchHighlight) {
    var scids = this.scids();
    if (SuttaCentralId.test(pattern)) {
      // scids are semantic and should never be highlighted
      //scids.forEach(scid => {
        //var seg = this.segMap[scid];
        //seg.scid = seg.scid.replace(/^.*$/, matchHighlight);
      //});
    } else {
      var rex = pattern instanceof RegExp
        ? rex : new RegExp(pattern, "gui");
      var rex = this.jsPattern(pattern, "gui");
      scids.forEach(scid => {
        var seg = this.segMap[scid];
        Object.keys(seg).forEach(k => {
          if (k !== 'scid' && k !== 'matched') {
            seg[k] = seg[k].replace(rex, matchHighlight);
          }
        });
      });
    }
    return this;
  }

} // class MLDoc

module.exports = exports.MLDoc = MLDoc;
})(typeof exports === "object" ? exports : (exports = {}));
