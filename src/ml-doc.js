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
                suttaplex,
                segmented,
                translation,
                translations,
            } = opts;
            this.root_text = Object.assign({}, root_text);
            this.segmented = segmented !== false;
            this.suttaplex = Object.assign({}, suttaplex);
            this.translations = (translations || []).reduce((a,t) => 
                (!translation || translation.author_uid !== t.author_uid)
                    ? a = [...a, t] : a
            , translation ? [ translation ] : []);
            this.segMap = {};

            logger.logInstance(this);
        }

        get suid() { return this.suttaplex.uid; }

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
                    var bproot = root_text && root_text.bilaraPath &&
                        path.join(root, root_text.bilaraPath);
                    var p_root;
                    console.log({bproot});
                    if (bproot) {
                        var fhroot = await fs.promises.open(bproot);
                        p_root = fhroot.readFile();
                    }
                    var p_trans = [];
                    for (var iT = 0; iT < translations.length; iT++) {
                        var t = translations[iT];
                        if (t.bilaraPath) {
                            var bpt = path.join(root, t.bilaraPath);
                            var fh = await fs.promises.open(bpt);
                            p_trans.push({
                                fh,
                                p: fh.readFile(),
                                lang: t.lang,
                            });
                        }
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
                        var {
                            fh,
                            p,
                            lang,
                        } = p_trans[ip];
                        var strings = JSON.parse(await p);
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
