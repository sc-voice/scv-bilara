(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const {
        js,
        logger,
    } = require('just-simple').JustSimple;

    class Translation {
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
            var cmp = acolon_parts[0].localeCompare(bcolon_parts[0]);
            if (cmp) {
                return cmp;
            }

            var adot_parts = acolon_parts[1].split('.');
            var bdot_parts = bcolon_parts[1].split('.');
            for (var i = 0; i < adot_parts.length; i++) {
                let api = adot_parts[i];
                let bpi = bdot_parts[i];
                if (api === bpi) {
                    continue;
                }
                if (api == null) {
                    return -1;
                }
                if (bpi == null) {
                    return 1;
                }
                cmp = Number(adot_parts[i]) - Number(bdot_parts[i]);
                if (cmp) {
                    return cmp;
                }
            }
            if (i < bdot_parts.length) {
                return -1;
            }
            return cmp;
        }

        constructor(opts={}) {
            this.suid = opts.suid;
            this.lang = opts.lang;
            this.author = opts.author;
            this.translation = opts.translation;
            this.segMap = opts.segMap || {};
            logger.logInstance(this, opts);
        }

        scids() {
            return Object.keys(this.segMap).sort(Translation.compareScid);
        }

        load(root) {
            var {
                suid,
                lang,
                author,
                translation,
            } = this;
            var spath = path.join(root, translation);
            this.log(`${this.constructor.name}.load(${spath})`);
            this.segMap = JSON.parse(fs.readFileSync(spath));
            return this;
        }

        save(root) {
            var {
                translation,
            } = this;
            var spath = path.join(root, translation);
            this.log(`Translation.save(${spath})`);
            var json = JSON.stringify(this.segMap, null, 2);
            fs.writeFileSync(spath, json);
            return this;
        }

    }

    module.exports = exports.Translation = Translation;
})(typeof exports === "object" ? exports : (exports = {}));
