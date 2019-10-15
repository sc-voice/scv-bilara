(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const {
        js,
        logger,
    } = require('just-simple').JustSimple;
    const SegDoc = require('./seg-doc');
    const RE_TAG = /^:[^:]+:/i;

    class DETranslation extends SegDoc {
        constructor(opts={}) {
            super(opts);
            this.suid = opts.suid;
            this.lang = opts.lang || 'de';
            this.author = opts.author || 'sabbamitta';
            this.source = opts.source;
            this.segMap = Object.assign({}, opts.segMap);
            this.excerptSize = opts.excerptSize || 0;
        }

        load(root) {
            var {
                suid,
                lang,
                author,
                source,
            } = this;
            var spath = path.join(root, source);
            this.log(`load(${root}) source:"${source}"`);
            this.lines = fs.readFileSync(spath).toString().split('\n');
            var segStart = true;
            this.ready = true;
            this.text = this.lines.reduce((acc,l,i) => {
                if (i === 0) {
                    this.suid = l.toLowerCase()
                        .replace(/^:not ready yet: */,'')
                        .replace(/ ([0-9])/,'$1')
                        .replace(/ .*/,'');
                    if (/^:not ready yet:/ui.test(l)) {
                        this.ready = false;
                    }
                } else if (/^:?bemerkung:/ui.test(l)) {
                    this.bemerkung = l.replace(RE_TAG,'');
                } else if (/^:blurb:/ui.test(l)) {
                    this.blurb = l.replace(RE_TAG,'');
                } else if (/^:vagga:/ui.test(l)) {
                    this.vagga = l.replace(RE_TAG,'');
                } else if (/^:co[^:]*ight:/ui.test(l)) {
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

        excerpt(s, n=this.excerptSize) {
            s = s.trim().length === 0 ? `"${s}"` : s;
            return s.length <= n ? s : `${s.substring(0,n)}...`;
        }

        applySegments(srcTrans) {
            var {
                suid,
                lang,
                author,
            } = this;
            var segMap = this.segMap = {};
            if (srcTrans.suid !== suid) {
                throw new Error(
                    `Sutta mismatch src:${srcTrans.suid} dst:${suid}`);
            }
            var srcSegs = srcTrans.segments();
            var deOffset = 0;
            this.bilaraPath = srcTrans.bilaraPath.split('/').map(p => {
                if (p === srcTrans.lang) {
                    return lang;
                }
                if (p === srcTrans.author) {
                    return author;
                }
                if (/\.json$/.test(p)) {
                    var reAuthor = new RegExp(`-${srcTrans.author}.json`); 
                    var reLang = new RegExp(`-${srcTrans.lang}-`);
                    return p.replace(reAuthor, `-${author}.json`)
                        .replace(reLang, `-${lang}-`);
                }
                return p;
            }).join('/');

            // TODO bemerkung, blurb and copyright
            //if (this.bemerkung) {
                //segMap.notice = this.bemerkung;
            //}
            //if (this.blurb) {
                //segMap.blurb = this.blurb;
            //}

            srcSegs.forEach((seg,i) => {
                var scid = seg.scid;
                var srcText = seg[srcTrans.lang];
                var dstText = this.text[i+deOffset];
                dstText = dstText == null ? ' ' : dstText;
                dstText = dstText.trim() + ' ';
                if (i < 3 && /:0/.test(scid)) {
                    deOffset--;
                    if (i === 0) {
                        segMap[scid] = this.nikaya || ' ';
                    } else if (i === 1) {
                        segMap[scid] = this.vagga || ' ';
                    } else if (i === 2) {
                        segMap[scid] = this.title || ' ';
                    }
                } else if (/^ ?$/.test(srcText)) {
                    segMap[scid] = ' ';
                    if (dstText.trim() !== '') {
                        deOffset--;
                    }
                } else {
                    segMap[scid] = dstText;
                }
                this.excertpSize && this.log(`${scid} `+
                    `${this.excerpt(srcText)}`+ 
                    ` => ${this.excerpt(segMap[scid])}`);
            });
            return this;
        }

    }

    module.exports = exports.DETranslation = DETranslation;
})(typeof exports === "object" ? exports : (exports = {}));
