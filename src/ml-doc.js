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

        filterSegments(pattern, languages=this.languages()) {
            var scids = this.scids();
            var rex = pattern instanceof RegExp 
                ? rex : new RegExp(pattern, "ui");
            var unicode = this.unicode;
            var matchAll = SuttaCentralId.test(pattern)
                && pattern.indexOf(',') >= 0;
            var matchScid = SuttaCentralId.test(pattern) 
                && pattern.indexOf(',') < 0;
            var matchLow = SuttaCentralId.rangeLow(pattern);
            var matchHigh = SuttaCentralId.rangeHigh(pattern);
            scids.forEach(scid => {
                var seg = this.segMap[scid];
                if (matchAll) {
                    var match = true;
                } else if (matchScid) {
                    var commaParts = pattern.split(/, */);
                    var match = commaParts.reduce((a,p) => {
                        var slashParts = p.split('/');
                        var pat = slashParts[0];
                        let matchLow = SuttaCentralId.rangeLow(pat);
                        let matchHigh = SuttaCentralId.rangeHigh(pat);
                        let id = pat.indexOf(':') >= 0
                            ? scid : scid.split(':')[0];
                        let cmpL = SuttaCentralId
                            .compareLow(id, matchLow);
                        let cmpH = SuttaCentralId
                            .compareHigh(id, matchHigh);
                        return a || (0 <= cmpL && cmpH <= 0);
                    }, false);
                } else {
                    var match = languages.reduce((a,l) => {
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
            return this;
        }

    }

    module.exports = exports.MLDoc = MLDoc;
})(typeof exports === "object" ? exports : (exports = {}));
