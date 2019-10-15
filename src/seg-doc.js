(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const {
        js,
        logger,
    } = require('just-simple').JustSimple;

    class SegDoc {
        constructor(opts={}) {
            this.suid = opts.suid;
            this.lang = opts.lang;
            this.author = opts.author;
            this.bilaraPath = opts.bilaraPath;
            this.segMap = opts.segMap || {};
            logger.logInstance(this, {
                logLevel: opts.logLevel === undefined ? 'info' : opts.logLevel,
            });
        }

        static compareParts(aparts,bparts) {
            var cmp = 0;
            for (var i = 0; i < aparts.length; i++) {
                let api = aparts[i];
                let bpi = bparts[i];
                if (api === bpi) {
                    continue;
                }
                if (api == null) {
                    return -1;
                }
                if (bpi == null) {
                    return 1;
                }
                cmp = Number(aparts[i]) - Number(bparts[i]);
                if (cmp) {
                    return cmp;
                }
            }
            if (i < bparts.length) {
                return -1;
            }
            return cmp;
        }

        static compareScid(a,b) {
            if (a === b) {
                return 0;
            }
            if (a == null) {
                return -1;
            }
            if (b == null) {
                return 1;
            }
            var acolon_parts = a.split(':');
            var bcolon_parts = b.split(':');
            var anikaya = acolon_parts[0].replace(/[-0-9.]+/,'');
            var bnikaya = bcolon_parts[0].replace(/[-0-9.]+/,'');
            var cmp = anikaya.localeCompare(bnikaya);
            if (cmp) {
                return cmp;
            }
            var adotcolon_parts = acolon_parts[0].replace(/[a-z]+/iu,'')
                .split('.');
            var bdotcolon_parts = bcolon_parts[0].replace(/[a-z]+/iu,'')
                .split('.');
            var cmp = SegDoc.compareParts(adotcolon_parts, bdotcolon_parts);
            //console.log(`dbg dotcolon`, adotcolon_parts, bdotcolon_parts, cmp);
            if (cmp) {
                return cmp;
            }

            var adot_parts = acolon_parts[1].split('.');
            var bdot_parts = bcolon_parts[1].split('.');
            return SegDoc.compareParts(adot_parts, bdot_parts);
        }

        scids() {
            var result = Object.keys(this.segMap);
            result.sort(SegDoc.compareScid);
            return result;
        }

        load(root) {
            var {
                suid,
                lang,
                author,
                bilaraPath,
            } = this;
            var spath = path.join(root, bilaraPath);
            this.log(`load(${spath})`);
            this.segMap = JSON.parse(fs.readFileSync(spath));
            return this;
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

    }

    module.exports = exports.SegDoc = SegDoc;
})(typeof exports === "object" ? exports : (exports = {}));
