(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const { logger } = require('log-instance');
    const FuzzyWordSet = require('./fuzzy-word-set');
    const { SuttaCentralId } = require('scv-esm');
    const Unicode = require('./unicode');

    class SegDoc {
        constructor(opts={}) {
            (opts.logger || logger).logInstance(this, opts);
            this.suid = opts.suid;
            this.lang = opts.lang;
            this.author = opts.author;
            this.bilaraPath = opts.bilaraPath;
            this.segMap = opts.segMap || {};
        }

        scids() {
            var result = Object.keys(this.segMap);
            result.sort(SuttaCentralId.compareLow);
            return result;
        }

        loadSync(root) {
            var {
                suid,
                lang,
                author,
                bilaraPath,
            } = this;
            var spath = path.join(root, bilaraPath);
            this.log(`loadSync(${spath})`);
            this.segMap = JSON.parse(fs.readFileSync(spath));
            return this;
        }

        load(root) {
            var {
                suid,
                lang,
                author,
                bilaraPath,
            } = this;
            var spath = path.join(root, bilaraPath);
            var that = this;
            return new Promise((resolve, reject) => {
                fs.readFile(spath, (err, data) => {
                    this.debug(`load(${spath})`);
                    if (err) {
                        reject(err);
                        return;
                    }
                    try {
                        that.segMap = JSON.parse(data);
                        resolve(this);
                    } catch(e) { reject(e); }
                });
            });
        }

        import(root) {
            var {
                bilaraPath,
            } = this;
            var spath = path.join(root, bilaraPath);
            var parts = bilaraPath.split('/');
            parts.reduce((acc,p,i) => {
                if (i < parts.length-1) {
                    acc = path.join(acc, p);
                    if (!fs.existsSync(acc)) {
                        fs.mkdirSync(acc);
                    }
                }
                return acc;
            }, root);
            this.log(`import(${spath})`);
            var json = JSON.stringify(this.segMap, null, 2);
            fs.writeFileSync(spath, json);
            return this;
        }

        segments() {
            return this.scids().map(scid => ({
                scid,
                [this.lang]: this.segMap[scid] || '',
            }));
        }

        fillWordMap(wordMap={}, isMember=true, romanize=true) {
            var unicode = new Unicode();
            var segMap = this.segMap;
            var scids = this.scids();
            scids.forEach(scid => {
                var text = segMap[scid];
                text.split(' ').forEach(t => {
                    var w = unicode.stripSymbols(t.toLowerCase());
                    wordMap[w] = isMember;
                    romanize && (wordMap[unicode.romanize(w)] = isMember);
                });
            });
            return wordMap;
        }

    }

    module.exports = exports.SegDoc = SegDoc;
})(typeof exports === "object" ? exports : (exports = {}));
