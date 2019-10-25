(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const {
        js,
        logger,
    } = require('just-simple').JustSimple;
    const FuzzyWordSet = require('./fuzzy-word-set');
    const SuttaCentralId = require('./sutta-central-id');
    const Unicode = require('./unicode');

    class MLDoc {
        constructor(opts={}) {
            // SuttaCentral fields
            var {
                root_text,
                translations,
            } = opts;
            this.root_text = Object.assign({}, root_text);
            this.translations = translations || [];
            this.segMap = {};

            logger.logInstance(this);
        }

        get suid() { 
            var {
                translations,
                root_text,
            } = this;
            return translations.reduce((a,t) => {
                var suid = SuttaCentralId.fromPath(t.bilaraPath);
                if (a && suid !== a) {
                    throw new Error(`uid mismatch `+
                        `expected:${a} `+
                        `actual:${suid} `);
                }
                return a || t.uid;
            }, SuttaCentralId.fromPath(this.root_text.bilaraPath));
        }

        scids() {
            var result = Object.keys(this.segMap);
            result.sort(SuttaCentralId.compareLow);
            return result;
        }

        load(root) {
            var {
                segMap,
                root_text,
                translations,
            } = this;
            var that = this;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    // initiate file reads
                    var bpr = root_text && root_text.bilaraPath &&
                        path.join(root, root_text.bilaraPath);
                    var fhroot = bpr && await fs.promises.open(bpr);
                    var p_root = fhroot && fhroot.readFile();
                    var p_trans = [];
                    for (var iT = 0; iT < translations.length; iT++) {
                        var t = translations[iT];
                        var bpt = t.bilaraPath && 
                            path.join(root, t.bilaraPath);
                        var fh = bpt && await fs.promises.open(bpt);
                        fh && p_trans.push({
                            fh,
                            p_read: fh.readFile(),
                            lang: t.lang,
                        });
                    }

                    // assemble content
                    var rootBuf = p_root && await p_root;
                    if (rootBuf) {
                        var strings = JSON.parse(rootBuf);
                        Object.keys(strings).forEach(k => {
                            var m = (segMap[k] = segMap[k] || {});
                            m.pli = strings[k];
                        });
                        fhroot.close();
                    }
                    for (var ip = 0; ip < p_trans.length; ip++) {
                        var { fh, p_read, lang, } = p_trans[ip];
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
