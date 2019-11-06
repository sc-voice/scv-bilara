
(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        logger,
        js,
        LOCAL_DIR,
    } = require('just-simple').JustSimple;
    const BilaraPath = require("./bilara-path");

    const SRC_PATH = path.join(__dirname, '..', '..', 'src', 'node');
    const SUTTAIDS_PATH = path.join(SRC_PATH, 'sutta-ids.json');

    var suttaIds;
    var uid_expansion;

    class SuttaCentralId { 
        constructor(scid=null) {
            if (scid == null) {
                throw new Error(`Expected SCID`);
            }
            this.scid = scid;
        }

        static match(scid, pat) {
            let id = pat.indexOf(':') >= 0 ? scid : scid.split(':')[0];
            let scidLow = SuttaCentralId.rangeLow(id);
            let scidHigh = SuttaCentralId.rangeHigh(id);
            let matchLow = SuttaCentralId.rangeLow(pat);
            let matchHigh = SuttaCentralId.rangeHigh(pat);
            let cmpL = SuttaCentralId.compareLow(scidHigh, matchLow);
            let cmpH = SuttaCentralId.compareHigh(scidLow, matchHigh);
            var match = 0 <= cmpL && cmpH <= 0;
            return match;
        }

        static rangeHigh(scid) {
            var scidParts = scid.split('/');
            scidParts[0] = scidParts[0].replace(/[0-9]+-/g,'')+'.9999';
            return scidParts.join('/');
        }

        static rangeLow(scid) {
            return scid.replace(/-[0-9]+/g,'');
        }

        static test(text) {
            var commaParts = text.toLowerCase().split(',').map(p=>p.trim());
            return commaParts.reduce((acc,part) => {
                return acc && /^[a-z]+ ?[0-9]+[-0-9a-z.:\/]*$/i.test(part);
            }, true);
        }

        static languages(text) {
            if (!SuttaCentralId.test(text)) {
                return [];
            }
            var commaParts = text.toLowerCase().split(',').map(p=>p.trim());
            return commaParts.reduce((a,c)=>{
                var cparts = c.split('/');
                var lang = cparts[1];
                a = lang && a.indexOf(lang)<0 ? [...a, lang] : a;
                return a;
            },[]);
        }

        static scidRegExp(pat) {
            if (!pat) {
                return /.*/;
            }

            var pat = pat.replace(/\./g, "\\.");
            var pat = pat.replace(/\*/g, ".*");
            var pat = pat.replace(/\?/g, ".");
            var pat = pat.replace(/[$^]/g, "\\$&");
            return new RegExp(pat);
        }

        static scidNumbersLow(id_or_path) {
            var scid = BilaraPath.pathParts(id_or_path).suid;
            var colonParts = scid.replace(/^[a-z]*/,'').split(':');
            var dotParts = colonParts.reduce((a,c) => 
                a.concat(c.split('.')), []);
            var nums = dotParts.map(n => Number(n.split('-')[0]));
            //console.log(`dbg scidNumberLow ${scid}`, nums);
            return nums;
        }

        static scidNumbersHigh(id_or_path) {
            var scid = BilaraPath.pathParts(id_or_path).suid;
            var colonParts = scid.replace(/^[a-z]*/,'').split(':');
            var dotParts = colonParts.reduce((a,c) => 
                a.concat(c.split('.')), []);
            var nums = dotParts.map(n => Number(n.split('-').pop()));
            //console.log(`dbg scidNumberLow ${scid}`, nums);
            return nums;
        }

        static compareHigh(a,b) {
            var abase = path.basename(a);
            var bbase = path.basename(b);
            var aprefix = abase.substring(0,abase.search(/[0-9]/));
            var bprefix = bbase.substring(0,bbase.search(/[0-9]/));
            var cmp = aprefix.localeCompare(bprefix);
            if (cmp === 0) {
                var adig = SuttaCentralId.scidNumbersHigh(a);
                var bdig = SuttaCentralId.scidNumbersHigh(b);
                var n = Math.max(adig.length, bdig.length);
                for (var i = 0; i < n; i++) {
                    var ai = adig[i];
                    var bi = bdig[i];
                    if (ai === bi) { continue; }
                    if (ai === undefined ) { return -1; }
                    if (bi === undefined ) { return 1; }
                    return ai - bi;
                }
            }
            return cmp;
        }

        static compareLow(a,b) {
            var abase = path.basename(a);
            var bbase = path.basename(b);
            var aprefix = abase.substring(0,abase.search(/[0-9]/));
            var bprefix = bbase.substring(0,bbase.search(/[0-9]/));
            var cmp = aprefix.localeCompare(bprefix);
            if (cmp === 0) {
                var adig = SuttaCentralId.scidNumbersLow(abase);
                var bdig = SuttaCentralId.scidNumbersLow(bbase);
                var n = Math.max(adig.length, bdig.length);
                for (var i = 0; i < n; i++) {
                    var ai = adig[i];
                    var bi = bdig[i];
                    if (ai === bi) { continue; }
                    if (ai === undefined ) { return -1; }
                    if (bi === undefined ) { return 1; }
                    return ai - bi;
                }
            }
            return cmp;
        }

        get groups() {
            var tokens = this.scid && this.scid.split(':');
            return tokens && tokens[1] ? tokens[1].split('.') : null;
        }

        get nikaya() {
            return this.sutta.replace(/[-0-9.]*$/,'');
        }

        get sutta() {
            return this.scid && this.scid.split(':')[0] ;
        }

        get parent() {
            var groups = this.groups;
            if (groups == null) {
                return null;
            }
            !groups.pop() && groups.pop();
            if (groups.length === 0) {
                return new SuttaCentralId(`${this.sutta}:`);
            }
            return new SuttaCentralId(`${this.sutta}:${groups.join('.')}.`);
        }

        toString() {
            return this.scid;
        }

    }

    module.exports = exports.SuttaCentralId = SuttaCentralId;
})(typeof exports === "object" ? exports : (exports = {}));
