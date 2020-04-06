(function(exports) {
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require('just-simple').JustSimple;
    const fs = require('fs');
    const path = require('path');
    const BilaraData = require('./bilara-data');
    const BilaraPath = require('./bilara-path');
    const Seeker = require('./seeker');
    const SuttaCentralId = require('./sutta-central-id');
    const LOCAL = path.join(__dirname, '../local');
    const BILARA_DATA = path.join(LOCAL, '/bilara-data');

    class Verifier {
        constructor(opts={}) {
            logger.logInstance(this, opts);
            var languages = this.languages = [
                'pli', 
            ];
            this.fixFile = opts.fixFile || false;

            var transPath = path.join(BILARA_DATA, 'translation');
            fs.readdirSync(transPath).forEach(tdf => {
                languages.push(tdf);
            });

            this.seeker = new Seeker({
                includeUnpublished: true,
                matchHighlight: '',
                maxResults: 2000,
                maxDoc: 1000,
                logLevel: this.logLevel,
                languages,
            });
            this.initialized = false;
        }
        
        initialize() {
            var that = this;
            var pbody = (resolve, reject) => (async function() { try {
                await that.seeker.initialize();
                that.initialized = true;
                resolve(that);
            } catch(e) { reject(e); }})();
            return new Promise(pbody);
        }

        verify(pattern) {
            var that = this;
            if (!that.initialized) {
                throw new Error("initialize() is required");
            }
            var {
                seeker,
            } = that;
            var pbody = (resolve,reject)=>(async function() {try{
                var res = await seeker.find({
                    pattern,
                    showMatchesOnly: true,
                });
                that.log(`verifying ${res.mlDocs.map(mld=>mld.suid)}`);
                res.mlDocs.forEach(mld => that.verifyDoc(mld));
                resolve({
                    pattern,
                    mlDocs: res.mlDocs,
                });
            } catch(e) {reject(e);}})();
            return new Promise(pbody);
        }

        verifyDoc(mld) {
            var suid = mld.suid;
            var repairMap = {};
            var segs = mld.segments();
            var nSegs = segs.length;
            var languages = mld.languages();
            segs.forEach((seg,iSeg) => {
                var newSeg = this.verifySeg({
                    mld, 
                    seg, 
                    iSeg, 
                    nSegs, 
                    languages,
                });
                if (newSeg) {
                    repairMap[seg.scid] = newSeg.scid;
                }
            });
            var repairs = Object.keys(repairMap).length;
            if (this.fixFile && repairs) {
                mld.bilaraPaths.forEach(fname => {
                    console.log(`repairing ${fname}`);
                    var fpath = path.join(BILARA_DATA, fname);
                    var json = JSON.parse(fs.readFileSync(fpath));
                    var newJson = {};
                    Object.keys(json).forEach(k => {
                        var newK = repairMap[k] || k;
                        newJson[newK] = json[k];
                    });
                    fs.writeFileSync(fpath, 
                        JSON.stringify(newJson, null, 2));
                });
            }
        }

        verifySeg({mld, seg, iSeg, nSegs, languages}) {
            var suid = mld.suid;
            var repairedId = null;
            var newSeg = null;
            var colonParts = seg.scid.split(':');
            var keys = Object.keys(seg);
            var nLangs = keys.length-2;
            var extraLangs = nLangs !== languages.length;
            if (!repairedId && iSeg+1<nSegs && extraLangs) {
                languages.forEach(lang => {
                    if (mld.langSegs[lang]) {
                        if (!seg.hasOwnProperty(lang)) {
                            logger.info(
                                `Missing ${lang} translation ${seg.scid}`);
                        }
                    } else if (iSeg == 0) {
                        logger.info(`Translation stub:${lang} ${mld.suid}`);
                    }
                });
            }
            if (!repairedId && iSeg===0 && !/:0/.test(seg.scid)) {
                logger.info(`Expected scid:0 for:${seg.scid}`);
            }
            if (!repairedId && colonParts.length === 1) {
                var suidDots = suid.split('.');
                var scidDots = seg.scid.split('.');
                repairedId = [
                    scidDots.slice(0,suidDots.length).join('.'),
                    ':',
                    scidDots.slice(suidDots.length).join('.')].join('');
                logger.info(
                    `Missing colon "${seg.scid}" => "${repairedId}"`);
            }
            if (!repairedId && colonParts.length > 2) {
                var {
                    suid:fileSuid,
                } = BilaraPath.pathParts(suid);
                repairedId = "";
                do {
                    repairedId += repairedId.length===0
                        ? colonParts.shift()
                        : `-${colonParts.shift()}`;
                } while (colonParts.length && 
                    repairedId.length < fileSuid.length);
                repairedId += `:${colonParts.join('.')}`;
                logger.info(`Too many colons "${seg.scid}" => `+
                    `"${repairedId}"`);
            }
            if (!repairedId && !SuttaCentralId.match(seg.scid, suid)) {
                repairedId = colonParts.map((part,i) => i ? part : suid )
                    .join(':');
                logger.info(`Segment id/file mismatch "${seg.scid}" => `+
                    `"${repairedId}"`);
            }
            if (repairedId) {
                newSeg = Object.assign({}, seg, {
                    scid: repairedId,
                });
            }
            return newSeg;
        }

    }

    module.exports = exports.Verifier = Verifier;
})(typeof exports === "object" ? exports : (exports = {}));
