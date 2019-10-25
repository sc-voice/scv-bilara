(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const {
        js,
        logger,
    } = require('just-simple').JustSimple;
    const BilaraPath = require('./bilara-path');
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
                            var m = (segMap[k] = segMap[k] || {});
                            m[lang] = strings[k];
                        });
                        fh.close();
                    }

                    resolve(that);
                } catch(e) {reject(e);} })();
            });
        }

        segments() {
            return this.scids().map(scid => ({
                scid,
                [this.lang]: this.segMap[scid] || '',
            }));
        }

    }

    module.exports = exports.MLDoc = MLDoc;
})(typeof exports === "object" ? exports : (exports = {}));
