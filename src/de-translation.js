(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const {
        js,
        logger,
    } = require('just-simple').JustSimple;
    const Translation = require('./translation');
    const RE_TAG = /^:[^:]+:/i;

    class DETranslation extends Translation {
        constructor(opts={}) {
            super(opts);
            this.suid = opts.suid;
            this.lang = opts.lang || 'de';
            this.author = opts.author || 'sabbamitta';
            this.translation = opts.translation;
            this.segMap = opts.segMap || {};
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
            var lines = fs.readFileSync(spath).toString().split('\n');
            var segStart = true;
            this.text = lines.reduce((acc,l,i) => {
                if (i === 0) {
                    this.suid = l.toLowerCase()
                        .replace(/ ([0-9])/,'$1')
                        .replace(/ .*/,'');
                } else if (/^:?bemerkung:/ui.test(l)) {
                    this.bemerkung = l.replace(RE_TAG,'');
                } else if (/^:blurb:/ui.test(l)) {
                    this.blurb = l.replace(RE_TAG,'');
                } else if (/^:vagga:/ui.test(l)) {
                    this.vagga = l.replace(RE_TAG,'');
                } else if (/^:copyright:/ui.test(l)) {
                    this.copyright = l.replace(RE_TAG,'');
                } else if (/^:nikaya:/ui.test(l)) {
                    this.nikaya = l.replace(RE_TAG,'');
                } else if (/^:title:/ui.test(l)) {
                    var title = l.replace(RE_TAG,'');
                    if (this.title) {
                        acc.push(title);
                    } else {
                        this.title = title;
                    }
                } else if (/^$/.test(l)) {
                    segStart = true;
                } else if (/^:/.test(l)) {
                    throw new Error(`unknown tag:${l}`);
                } else {
                    if (segStart) {
                        acc.push(l);
                    } else {
                        acc[acc.length-1] += l;
                    }
                    segStart = false;
                }
                return acc;
            }, []);
            return this;
        }

        applySegments(srcTrans) {
            var {
                suid,
            } = this;
            if (srcTrans.suid !== suid) {
                throw new Error(
                    `Sutta mismatch src:${srcTrans.suid} dst:${suid}`);
            }
            var srcSegs = srcTrans.segments();
            var deOffset = 0;
            srcSegs.forEach((seg,i) => {
                if (/:0/.test(seg.scid)) {
                    deOffset++;
                    this.log(`dbg seg0`, js.simpleString(seg), deOffset);
                } else if (/^ ?$/.test(seg[srcTrans.lang])) {
                    deOffset++;
                } else {
                    seg[this.lang] = this.text[i-deOffset];
                    this.log(js.simpleString(seg));
                }
            });

        }

    }

    module.exports = exports.DETranslation = DETranslation;
})(typeof exports === "object" ? exports : (exports = {}));
