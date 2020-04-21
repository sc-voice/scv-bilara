(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require('just-simple').JustSimple;
    const BilaraPath = require('./bilara-path');
    const Unicode = require('./unicode');
    const Pali = require('./pali');
    const SuttaCentralId = require('./sutta-central-id');
    const BILARA_PATH = path.join(LOCAL_DIR, 'bilara-data');

    class MLDoc {
        constructor(opts={}) {
            var {
                bilaraPaths,
            } = opts;
            if (bilaraPaths == null) {
                throw new Error(`bilaraPaths is required`);
            }
            this.bilaraPaths = bilaraPaths;
            this.lang = opts.lang || this.languages().pop();
            this.segMap = opts.segMap || {};
            this.score = 0; // search relevance
            Object.defineProperty(this, "unicode", {
                value: opts.unicode || new Unicode(),
            });
            logger.logInstance(this, opts);
        }

        static compare(m1,m2) {
            var cmp = m2.score - m1.score;
            return cmp ? cmp : SuttaCentralId.compareLow(m1.suid, m2.suid);
        }

        static langCompare_pli_en(a,b) {
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
            } = this;
            return bilaraPaths.reduce((a,bp) => {
                var suid = BilaraPath.pathParts(bp).suid;
                if (a && suid !== a) {
                    throw new Error(`uid mismatch `+
                        `expected:${a} `+
                        `actual:${suid} `);
                }
                return a || suid;
            }, null);
        }

        get root_text() {
            return this.bilaraPaths.reduce((a,bp) => {
                var parts = BilaraPath.pathParts(bp);
                return parts.type === 'root' ? parts : a;
            }, undefined);
        }

        get translations() {
            return this.bilaraPaths
                .map(bp => BilaraPath.pathParts(bp))
                .filter(t => t.type === 'translation');
        }

        titles(lang=this.lang) {
            var titles = this.segments().slice(0,4).reduce((a,s)=>{
                if (s.scid.split(':')[1].match(/^0/)) {
                    var text = (s[lang] || s.en || s.pli || '');
                    text.length && a.push(text.trim());
                }
                return a;
            },[]);
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

        languages() {
            return Object.keys(
                this.bilaraPaths.reduce((a,bp) => {
                    a[bp.split('/')[1]] = true;
                    return a;
                }, {})
            ).sort(MLDoc.langCompare_pli_en);
        }

        load(root=BILARA_PATH) {
            var {
                segMap,
                bilaraPaths,
            } = this;
            var that = this;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    // initiate file reads
                    that.langContent = {};
                    that.langSegs = {};
                    var p_bp = [];
                    for (var ip = 0; ip < bilaraPaths.length; ip++) {
                        var parts = BilaraPath.pathParts(bilaraPaths[ip]);
                        var bp = path.join(root, parts.bilaraPath);
                        var fh = await fs.promises.open(bp);
                        var isTrans = parts.type === 'translation';
                        var isRoot = parts.type === 'root';
                        var lang = isTrans || isRoot
                            ? parts.lang
                            : parts.type;
                        if (fh) {
                            var bpe = {
                                fh,
                                p_read: fh.readFile(),
                                lang,
                            };
                            p_bp.push(bpe);
                        } else {
                            this.log(`MLDoc.load() path not found:${bp}`);
                        }
                    }

                    // assemble content
                    for (var ip = 0; ip < p_bp.length; ip++) {
                        var { fh, p_read, lang, } = p_bp[ip];
                        var strings = JSON.parse(await p_read);
                        var keys = Object.keys(strings);
                        that.langSegs[lang] = keys.length;
                        keys.forEach(k => {
                            var m = (segMap[k] = segMap[k] || {
                                scid: k,
                            });
                            m[lang] = strings[k];
                        });
                        fh.close();
                    }

                    resolve(that);
                } catch(e) {reject(e);} })();
            });
        }

        segments() {
            return this.scids().map(scid => Object.assign({
                scid,
            }, this.segMap[scid]));
        }

        matchScid({seg, matchSeg, scidPat}) {
            var scid = seg.scid;
            var id = matchSeg ? scid : scid.split(':')[0];
            var match = SuttaCentralId.match(id, scidPat);
            return match;
        }

        matchText({seg, languages, rexList}) {
            var unicode = this.unicode;
            return languages.reduce((a,l) => {
                var text = seg[l];
                if (!a && text) {
                    if (rexList.reduce((a,re)=>a && re.test(text),true)) {
                        return true;
                    } else if (l === 'pli') {
                        var romText = unicode.romanize(text);
                        return rexList.reduce(
                            (a,re)=>a && re.test(romText),true); 
                    }

                }
                return a;
            }, false);
        }

        jsPattern(pat, opts='ui') {
            var p = pat.toString();
            return p.startsWith('\\b') 
                ? new RegExp(`(?<=[\\s,.:;"']|^)${p.substring(2)}`, opts)
                : new RegExp(p, opts);
        }

        filterSegments(...args) {
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
            } = opts;
            showMatchesOnly = showMatchesOnly===undefined 
                ? true : showMatchesOnly;
            languages = languages===undefined
                ? this.languages() : languages;
            pattern = pattern || resultPattern;
            var scids = this.scids();
            var suid = this.suid;
            if (resultPattern instanceof RegExp) {
                var rexList = [ this.jsPattern(resultPattern) ];
            } else {
                var resultPatterns = resultPattern.split('|');
                var patterns = pattern.split(' ');
                var srcPats = resultPatterns.length === patterns.length
                    ? resultPatterns
                    : patterns;
                var rexList = srcPats.map(p => this.jsPattern(p));
            }
            var unicode = this.unicode;
            var matchScid = SuttaCentralId.test(resultPattern);
            if (matchScid) {
                var scidPat = resultPattern.split(/, */).reduce((a,p) => {
                    return SuttaCentralId.match(suid, p) ? p : a
                }, resultPattern);
                scidPat = scidPat.split('/')[0].replace(/ */uig, '');
                var matchSeg = scidPat.indexOf(':') >= 0;
            }
            var matchLow = SuttaCentralId.rangeLow(resultPattern);
            var matchHigh = SuttaCentralId.rangeHigh(resultPattern);
            var matched = 0;
            scids.forEach((scid,i) => {
                var seg = this.segMap[scid];
                var match = matchScid
                    ? this.matchScid({seg, matchSeg, scidPat})
                    : this.matchText({seg, languages, rexList});
                if (match) {
                    matched++;
                    seg.matched = true;
                } else {
                    showMatchesOnly && delete this.segMap[scid];
                }
            });
            var score = matchScid
                ? 0
                : Number((matched + matched/scids.length).toFixed(3));
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
                scids.forEach(scid => {
                    var seg = this.segMap[scid];
                    seg.scid = seg.scid.replace(/^.*$/, matchHighlight);
                });
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

    }

    module.exports = exports.MLDoc = MLDoc;
})(typeof exports === "object" ? exports : (exports = {}));
