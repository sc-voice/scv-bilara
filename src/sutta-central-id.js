(function(exports) {
    const BilaraPath = require("./bilara-path");

    class SuttaCentralId { 
        constructor(scid=null) {
            if (scid == null) {
                throw new Error(`required scid:${scid}`);
            }
            this.scid = scid;
        }

        static basename(fp) {
            return fp.split('/').pop();
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
            var slashParts = scid.split('/');
            var scidMain = slashParts.shift();
            var suffix = slashParts.join('/');
            var extRanges = scidMain.split('--');
            if (extRanges.length > 2) {
                throw new Error(`Invalid SuttaCentral reference:${scid}`);
            }
            var [c0,c1] = extRanges.map(er => er.split(':'));
            var result = extRanges.pop();
            if (c1 && c0.length>1 && c1.length<2) {
                result = `${c0[0]}:${result}`;
            }
            result = c0.length > 1
                ? result.replace(/[0-9]+-/g,'')+'.9999'
                : result.replace(/[0-9]+-/g,'');
            return suffix ? `${result}/${suffix}` : result;

        }

        static rangeLow(scid) {
            var slashParts = scid.split('/');
            var scidMain = slashParts.shift();
            var suffix = slashParts.join('/');
            var result = scidMain.split('--')[0];
            result = result.replace(/-[0-9]+/g,'');
            return suffix ? `${result}/${suffix}` : result;
        }

        static test(text) {
            if (typeof text !== 'string') {
                throw new Error(`Expected string:${text}`);
            }
            var commaParts = text.toLowerCase().split(',').map(p=>p.trim());
            return commaParts.reduce((acc,part) => {
                part = part.replace(/\. */ug,'.');
                return acc && /^[-a-z]+ ?[0-9]+[-0-9a-z.:\/]*$/i.test(part);
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

        static partNumber(part, id) {
            var n = Number(part);
            if (isNaN(n)) {
                var caretParts = part.split('^');
                var [c0,c1] = caretParts;
                if (c1 == null) {
                    var c0dig = c0.replace(/[a-z]*/ug,'');
                    var c0let = c0.replace(/[0-9]*/ug,'');
                    var n0 = Number(c0dig);
                    var n1 = c0let.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
                    if (isNaN(n0) || isNaN(n1)) {
                        throw new Error(
                            `partNumber() cannot parse ${part} in ${id}`);
                    }
                } else {
                    var n0 = Number(c0);
                    var n1 = c1.charCodeAt(0) - 'z'.charCodeAt(0) - 1;
                }

                return [n0, n1];
            } else {
                return [n];
            } 
        }

        static scidNumbersLow(id_or_path) {
            var scid = BilaraPath.pathParts(id_or_path).suid;
            var colonParts = scid.replace(/^[-a-z]*/,'').split(':');
            var dotParts = colonParts.reduce((a,c) => 
                a.concat(c.split('.')), []);
            var nums = dotParts.reduce((a,n) => {
                var lowPart = n.split('-')[0];
                return a.concat(SuttaCentralId
                    .partNumber(lowPart, id_or_path));
            }, []);
            return nums;
        }

        static scidNumbersHigh(id_or_path) {
            var scid = BilaraPath.pathParts(id_or_path).suid;
            var colonParts = scid.replace(/^[-a-z]*/,'').split(':');
            var dotParts = colonParts.reduce((a,c) => 
                a.concat(c.split('.')), []);
            var nums = dotParts.reduce((a,n) => {
                var highPart = n.split('-').pop();
                return a.concat(SuttaCentralId
                    .partNumber(highPart, id_or_path));
            }, []);
            return nums;
        }

        static compareHigh(a,b) {
            var abase = SuttaCentralId.basename(a);
            var bbase = SuttaCentralId.basename(b);
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
                    if (ai === undefined ) { return -bi || -1; }
                    if (bi === undefined ) { return ai || 1; }
                    return ai - bi;
                }
            }
            return cmp;
        }

        static compareLow(a,b) {
            var abase = SuttaCentralId.basename(a);
            var bbase = SuttaCentralId.basename(b);
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
                    if (ai === undefined ) { return -bi || -1; }
                    if (bi === undefined ) { return ai || 1; }
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

        get nikayaFolder() {
            var majorid = this.sutta.split('.')[0];
            var prefix = majorid.replace(/[0-9-.:]*$/,'');
            var folder = {
                bv: `kn/bv`,
                bv: `kn/bv`,
                cnd: `kn/cnd`,
                cp: `kn/cp`,
                iti: `kn/iti`,
                ja: `kn/ja`,
                kp: `kn/kp`,
                mil: `kn/mil`,
                mnd: `kn/mnd`,
                ne: `kn/ne`,
                pe: `kn/pe`,
                ps: `kn/ps`,
                pv: `kn/pv`,
                snp: `kn/snp`,
                "tha-ap": `kn/tha-ap`,
                thag: `kn/thag`,
                "thi-ap": `kn/thi-ap`,
                thig: `kn/thig`,
                ud: `kn/ud`,
                vv: `kn/vv`,
                'pli-tv-bi-vb-sk': `pli-tv-bi-vb/pli-tv-bi-vb-sk`,
            }[prefix] || (majorid === this.sutta 
                ? prefix
                : `${prefix}/${majorid}`);
            return folder;
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

        standardForm() {
            var std = {
                "sn": "SN",
                "mn": "MN",
                "dn": "DN",
                "an": "AN",
                "thig": "Thig",
                "thag": "Thag",
            };
            var result = this.scid;
            var keys = Object.keys(std);
            for (var i=0; i < keys.length; i++) {
                var k = keys[i];
                result = result.replace(k,std[k]);
            }
            return result;
        }

        sectionParts() {
            return this.scid.split(':')[0].split('.');
        }

        segmentParts() {
            var segid = this.scid.split(':')[1];
            return segid.split('.');
        }

        add(...args) {
            var prefix = this.nikaya;
            var id = this.scid.substring(prefix.length);
            var colonParts = id.split(':');
            if (colonParts.length > 1) { // segment id
                var dotParts = colonParts[1].split('.');
                for (var i = 0; i < dotParts.length; i++) {
                    var a = Number(args[i]);
                    dotParts[i] = i < args.length
                        ? Number(dotParts[i]) + a
                        : 0;
                }
                var id2 = `${colonParts[0]}:${dotParts.join('.')}`;
            } else { // document id
                var dotParts = colonParts[0].split('.');
                var n = Math.min(args.length, dotParts.length);
                for (var i = 0; i < n; i++) {
                    var a = Number(args[i]);
                    dotParts[i] = Number(dotParts[i]) + a;
                }
                var id2 = `${dotParts.join('.')}`;
            }
            return new SuttaCentralId(`${prefix}${id2}`);
        }

        toString() {
            return this.scid;
        }

    }

    module.exports = exports.SuttaCentralId = SuttaCentralId;
})(typeof exports === "object" ? exports : (exports = {}));
