
(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        logger,
        js,
        LOCAL_DIR,
    } = require('just-simple').JustSimple;

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

        /*
        static initialize(){
            if (suttaIds) {
                return;
            }
            if (fs.existsSync(SUTTAIDS_PATH)) {
                logger.info(`SuttaCentralId.initialize() loading:${SUTTAIDS_PATH}`);
                suttaIds = JSON.parse(fs.readFileSync(SUTTAIDS_PATH));
            }
            if (fs.existsSync(UID_EXPANSION_PATH)) {
                logger.info(`SuttaCentralId.initialize() loading:${UID_EXPANSION_PATH}`);
                uid_expansion = JSON.parse(fs.readFileSync(UID_EXPANSION_PATH));
            }
        }
        */

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

        static fromPath(f) {
            var fname = f.split('/').pop();
            return fname.replace(/_.*$/,'');
        }

        static compareLow(a,b) {
            var aprefix = a.substring(0,a.search(/[0-9]/));
            var bprefix = b.substring(0,b.search(/[0-9]/));
            var cmp = aprefix.localeCompare(bprefix);
            if (cmp === 0) {
                var adig = a.replace(/[^0-9]*([0-9]*.?[0-9]*).*/,"$1").split('.');
                var adig = SuttaCentralId.fromPath(a)
                    .replace(/[^0-9]*([0-9]*.?[0-9]*).*/,"$1").split('.');
                var bdig = b.replace(/[^0-9]*([0-9]*.?[0-9]*).*/,"$1").split('.');
                var bdig = SuttaCentralId.fromPath(b)
                    .replace(/[^0-9]*([0-9]*.?[0-9]*).*/,"$1").split('.');
                var cmp = Number(adig[0]) - Number(bdig[0]);
                if (cmp === 0 && adig.length>1 && bdig.length>1) {
                    cmp = Number(adig[1]) - Number(bdig[1]);
                }
            }
            return cmp;
        }

        static compareHigh(a,b) {
            var aprefix = a.substring(0,a.search(/[0-9]/));
            var bprefix = b.substring(0,b.search(/[0-9]/));
            var cmp = aprefix.localeCompare(bprefix);
            if (cmp === 0) {
                var adig = SuttaCentralId.fromPath(a).replace(/[0-9]+-/ug,'')
                    .replace(/[^0-9]*([0-9]+)/,"$1")
                    .split('.');
                var bdig = SuttaCentralId.fromPath(b).replace(/[0-9]+-/ug,'')
                    .replace(/[^0-9]*([0-9]+)/,"$1")
                    .split('.');
                var cmp = Number(adig[0]) - Number(bdig[0]);
                if (cmp === 0) {
                    var alast = Number(adig[adig.length-1]);
                    var blast = Number(bdig[bdig.length-1]);
                    cmp = alast - blast;
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
