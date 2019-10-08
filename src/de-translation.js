(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const {
        js,
        logger,
    } = require('just-simple').JustSimple;
    const RE_TAG = /^:[^:]+:/i;

    class DETranslation {
        constructor(opts={}) {
            this.suid = opts.suid;
            this.lang = opts.lang;
            this.author = opts.author;
            this.translation = opts.translation;
            this.segMap = opts.segMap || {};
            logger.logInstance(this, {
                logLevel: opts.logLevel === undefined ? 'debug' : opts.logLevel,
            });
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
                    this.suid = l.toLowerCase().replace(/ ([0-9])/,'$1');
                    this.log('dbg suid', this.suid);
                } else if (/^:?bemerkung:/ui.test(l)) {
                    this.bemerkung = l.replace(RE_TAG,'');
                    this.log('dbg bemerkung', this.bemerkung);
                } else if (/^:blurb:/ui.test(l)) {
                    this.blurb = l.replace(RE_TAG,'');
                    this.log('dbg blurb', this.blurb);
                } else if (/^:vagga:/ui.test(l)) {
                    this.vagga = l.replace(RE_TAG,'');
                    this.log('dbg vagga', this.vagga);
                } else if (/^:copyright:/ui.test(l)) {
                    this.copyright = l.replace(RE_TAG,'');
                    this.log('dbg copyright', this.copyright);
                } else if (/^:nikaya:/ui.test(l)) {
                    this.nikaya = l.replace(RE_TAG,'');
                    this.log('dbg nikaya', this.nikaya);
                } else if (/^:title:/ui.test(l)) {
                    var title = l.replace(RE_TAG,'');
                    acc.push(title);
                    this.log('dbg title', title);
                } else if (/^$/.test(l)) {
                    segStart = true;
                    this.log('dbg ---EOL---');
                } else if (/^:/.test(l)) {
                    throw new Error(`unknown tag:${l}`);
                } else {
                    this.log(`dbg line`, l);
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

    }

    module.exports = exports.DETranslation = DETranslation;
})(typeof exports === "object" ? exports : (exports = {}));
