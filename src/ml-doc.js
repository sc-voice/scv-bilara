(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const {
        js,
        logger,
    } = require('just-simple').JustSimple;
    const BilaraPath = require('./bilara-path');
    const Unicode = require('./unicode');
    const SuttaCentralId = require('./sutta-central-id');

    class MLDoc {
        constructor(opts={}) {
            var {
                bilaraPaths,
            } = opts;
            if (bilaraPaths == null) {
                throw new Error(`bilaraPaths is required`);
            }
            this.bilaraPaths = bilaraPaths;
            this.segMap = {};
            Object.defineProperty(this, "unicode", {
                value: opts.unicode || new Unicode(),
            });
            logger.logInstance(this, opts);
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
            );
        }

        load(root) {
            var {
                segMap,
                bilaraPaths,
            } = this;
            var that = this;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    // initiate file reads
                    var p_bp = [];
                    for (var ip = 0; ip < bilaraPaths.length; ip++) {
                        var parts = BilaraPath.pathParts(bilaraPaths[ip]);
                        var bp = path.join(root, parts.bilaraPath);
                        var fh = await fs.promises.open(bp);
                        fh && p_bp.push({
                            fh,
                            p_read: fh.readFile(),
                            lang: parts.lang,
                        });
                    }

                    // assemble content
                    for (var ip = 0; ip < p_bp.length; ip++) {
                        var { fh, p_read, lang, } = p_bp[ip];
                        var strings = JSON.parse(await p_read);
                        Object.keys(strings).forEach(k => {
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
            return SuttaCentralId.match(id, scidPat);
        }

        matchText({seg, languages, rex}) {
            var unicode = this.unicode;
            return languages.reduce((a,l) => {
                if (!a && seg[l]) {
                    if (rex.test(seg[l])) {
                        return true;
                    } else {
                        return rex.test(unicode.romanize(seg[l]));
                    }

                }
                return a;
            }, false);
        }

        filterSegments(pattern, languages=this.languages()) {
            var scids = this.scids();
            var suid = this.suid;
            var rex = pattern instanceof RegExp 
                ? rex : new RegExp(pattern, "ui");
            var unicode = this.unicode;
            var matchScid = SuttaCentralId.test(pattern);
            if (matchScid) {
                var scidPat = pattern.split(/, */).reduce((a,p) => {
                    return SuttaCentralId.match(suid, p) ? p : a
                }, pattern);
                scidPat = scidPat.split('/')[0];
                var matchSeg = scidPat.indexOf(':') >= 0;
            }
            var matchLow = SuttaCentralId.rangeLow(pattern);
            var matchHigh = SuttaCentralId.rangeHigh(pattern);
            scids.forEach((scid,i) => {
                var seg = this.segMap[scid];
                var match = matchScid
                    ? this.matchScid({seg, matchSeg, scidPat})
                    : this.matchText({seg, languages, rex});
                if (match) {
                    //console.log(`dbg keep`, seg);
                } else {
                    delete this.segMap[scid];
                }
            });
            return this;
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
                scids.forEach(scid => {
                    var seg = this.segMap[scid];
                    Object.keys(seg).forEach(k => {
                        if (k !== 'scid') {
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
