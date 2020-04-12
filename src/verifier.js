(function(exports) {
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require('just-simple').JustSimple;
    const fs = require('fs');
    const path = require('path');
    const MerkleJson = require('merkle-json').MerkleJson;
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
            var root = this.root = opts.root || BILARA_DATA;
            var languages = this.languages = [
                'pli', 
            ];
            this.fixFile = opts.fixFile || false;

            var transPath = path.join(BILARA_DATA, 'translation');
            fs.readdirSync(transPath).forEach(tdf => {
                languages.push(tdf);
            });

            this.forceRenumber = opts.forceRenumber || false;
            this.merkleJson = new MerkleJson();
            this.seeker = new Seeker({
                includeUnpublished: true,
                matchHighlight: '',
                maxResults: 2000,
                maxDoc: 1000,
                logLevel: this.logLevel,
                languages,
                root,
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
                logger.info(`Expected scid:0 for:${seg.scid} => renumbering...`);
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
                forceRenumber,
                root,
                merkleJson: mj,
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
            if (forceRenumber || !numberingValid) {
                this.renumber(mld, repairMap);
            }
            var repairs = Object.keys(repairMap).length;
            if (repairs) {
                mld.repaired = {};
                mld.bilaraPaths.forEach(fname => {
                    var fpath = path.join(root, fname);
                    var json = JSON.parse(fs.readFileSync(fpath));
                    var newJson = {};
                    Object.keys(json).forEach(k => {
                        var newK = repairMap[k] || k;
                        if (newJson[newK]) {
                            console.log(`dbg newJson`, newJson);
                            throw new Error(
                                `Segment number collision: ${k}=>${newK}`);
                        }
                        newJson[newK] = json[k];
                    });
                    var hashOld = mj.hash(json);
                    var hashNew = mj.hash(newJson);
                    if (hashOld !== hashNew) {
                        if (fixFile) {
                            this.log(`repair ${fname} (ok)`);
                            fs.writeFileSync(fpath, 
                                JSON.stringify(newJson, null, 2));
                        } else {
                            this.log(`repair ${fname} (ignored)`);
                            mld.repaired[fname] = newJson;
                        }
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
                if (res.mlDocs.length) {
                    that.log(`verifying ${res.mlDocs.map(mld=>mld.suid)}`);
                } else {
                    console.log(`dbg res`, res);
                    that.log(`Nothing to verify for ${pattern}`);
                }
                res.mlDocs.forEach(mld => that.verifyDoc(mld));
                resolve({
                    pattern,
                    mlDocs: res.mlDocs,
                });
            } catch(e) {reject(e);}})();
            return new Promise(pbody);
        }

        renumber(mld, repairMap){
            var startOfText = 0;
            var major = 0;
            var minor = 1;
            var zeroSegments = [];
            var reZero = /(<h[2-9]>|class='namo'|p class='uddana)/u;
            var reId = /id='[0-9]+'/u;
            var reMajor=/<p>/u;
            var segments = mld.segments();
            segments.forEach((seg,i) => {
                var newScid = seg.scid;
                var prefix = seg.scid.split(':')[0];
                var isZeroSegment = reZero.test(seg.html);
                var isMajor = reMajor.test(seg.html) && !isZeroSegment;

                if (/<header>/.test(seg.html)) {
                    startOfText = true;
                    minor = 1;
                } 
                if (isZeroSegment) {
                    zeroSegments.push(seg.scid);
                    minor = 1;
                } else if (reId.test(seg.html)) {
                    var id = seg.html
                        .split("id='")[1]
                        .split("'")[0];
                    major++;
                    if (Number(id) !== major) {
                        throw new Error([
                            `Sequencing error`,
                            `seg[${i}] ${seg.scid}`,
                            `id:${id}`,
                            `major:${major}`,
                            `${seg.html}`,
                        ].join(' '));
                    }
                    minor = 1;
                } else if (isMajor) {
                    major++;
                    minor = 1;
                }
                if (startOfText) {
                    newScid = `${prefix}:${0}.${minor++}`;
                    repairMap[seg.scid] = newScid;
                } else if (isZeroSegment) {
                    // do nothing
                } else { // normal segment
                    if (zeroSegments.length === 1) {
                        var oldScid = zeroSegments[0];
                        newScid = `${prefix}:${major}.0`;
                        repairMap[oldScid] = newScid;
                    } else {
                        for (let i=0; i<zeroSegments.length; i++) {
                            var oldScid = zeroSegments[i];
                            newScid = `${prefix}:${major}.0.${i+1}`;
                            repairMap[oldScid] = newScid;
                        }
                    }

                    newScid = `${prefix}:${major}.${minor}`;
                    repairMap[seg.scid] = newScid;
                    minor++;
                    zeroSegments = [];
                }
                if (/<\/header>/.test(seg.html)) {
                    startOfText = false;
                }
            });
        }

    }

    module.exports = exports.Verifier = Verifier;
})(typeof exports === "object" ? exports : (exports = {}));
