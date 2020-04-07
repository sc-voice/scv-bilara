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
    const BilaraPathMap = require('./bilara-path-map');
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

        verifySeg({mld, seg, iSeg, nSegs, languages}) {
            var suid = mld.suid;
            var segInfo = null;
            var colonParts = seg.scid.split(':');
            var keys = Object.keys(seg);
            var nLangs = keys.length-2;
            var extraLangs = nLangs !== languages.length;
            if (!segInfo && iSeg===0 && !/:0/.test(seg.scid)) {
                logger.info(`Expected scid:0 for:${seg.scid}`);
                segInfo = { renumber: true };
            }
            if (!segInfo && iSeg+1<nSegs && extraLangs) {
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
            if (!segInfo && colonParts.length === 1) {
                var suidDots = suid.split('.');
                var scidDots = seg.scid.split('.');
                segInfo = { repairedId: [
                    scidDots.slice(0,suidDots.length).join('.'),
                    ':',
                    scidDots.slice(suidDots.length).join('.')].join('')
                };
                logger.info(
                    `Missing colon "${seg.scid}" => "${repairedId}"`);
            }
            if (!segInfo && colonParts.length > 2) {
                var {
                    suid:fileSuid,
                } = BilaraPath.pathParts(suid);
                var repairedId = "";
                do {
                    repairedId += repairedId.length===0
                        ? colonParts.shift()
                        : `-${colonParts.shift()}`;
                } while (colonParts.length && 
                    repairedId.length < fileSuid.length);
                repairedId += `:${colonParts.join('.')}`;
                segInfo = {repairedId};
                logger.info(`Too many colons "${seg.scid}" => `+
                    `"${repairedId}"`);
            }
            if (!segInfo && !SuttaCentralId.match(seg.scid, suid)) {
                seginfo = {
                    repairedId: colonParts
                        .map((part,i) => i ? part : suid )
                        .join(':'),
                };
                logger.info(`Segment id/file mismatch "${seg.scid}" => `+
                    `"${repairedId}"`);
            }
            if (segInfo) {
                segInfo.seg = seg;
            }
            return segInfo;
        }

        verifyDoc(mld) {
            var {
                fixFile,
            } = this;
            var suid = mld.suid;
            var repairMap = {};
            var segs = mld.segments();
            var nSegs = segs.length;
            var languages = mld.languages();
            var numberingValid = true;
            segs.forEach((seg,iSeg) => {
                var segInfo = this.verifySeg({
                    mld, 
                    seg, 
                    iSeg, 
                    nSegs, 
                    languages,
                });
                numberingValid = numberingValid && 
                    (!segInfo || !segInfo.renumber);
                if (segInfo) {
                    repairMap[seg.scid] = segInfo.scid;
                }
            });
            if (!numberingValid) {
                this.renumber(mld, repairMap);
            }
            var repairs = Object.keys(repairMap).length;
            if (repairs) {
                mld.repaired = {};
                mld.bilaraPaths.forEach(fname => {
                    console.log(`repairing ${fname}`);
                    var fpath = path.join(BILARA_DATA, fname);
                    var json = JSON.parse(fs.readFileSync(fpath));
                    var newJson = {};
                    Object.keys(json).forEach(k => {
                        var newK = repairMap[k] || k;
                        newJson[newK] = json[k];
                    });
                    if (fixFile) {
                        fs.writeFileSync(fpath, 
                            JSON.stringify(newJson, null, 2));
                    } else {
                        mld.repaired[fname] = newJson;
                    }
                });
            }
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
                    types: BilaraPathMap.ALL_TYPES,
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

        renumber(mld, repairMap){
            var header = 0;
            var major = 0;
            var minor = 1;
            mld.segments().forEach((seg,i) => {
                var newScid = seg.scid;
                var prefix = seg.scid.split(':')[0];
                if (/<header>/.test(seg.html)) {
                    header++;
                }
                if (/<blockquote/.test(seg.html)) {
                    major++;
                    minor = 1;
                }
                if (/class='endsutta'/.test(seg.html)) {
                    major++;
                    minor = 1;
                }
                if (header) {
                    newScid = `${prefix}:0.${i+1}`;
                } else {
                    newScid = `${prefix}:${major}.${minor++}`;
                }
                if (seg.scid !== newScid) {
                    repairMap[seg.scid] = newScid;
                }
                if (/<\/header>/.test(seg.html)) {
                    header--;
                }
            });
        }

    }

    module.exports = exports.Verifier = Verifier;
})(typeof exports === "object" ? exports : (exports = {}));
