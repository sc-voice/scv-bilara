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
            this.forceRenumber = opts.forceRenumber || false;
            this.mapFile = opts.mapFile;
            if (this.mapFile) {
                this.log(`mapFile:${this.mapFile}`);
            }
            this.fixStart = opts.fixStart || opts.forceRenumber;
            this.fixInternal = opts.fixInternal || opts.forceRenumber;
            this.fixBody = opts.fixBody || opts.forceRenumber;

            var transPath = path.join(BILARA_DATA, 'translation');
            fs.readdirSync(transPath).forEach(tdf => {
                languages.push(tdf);
            });

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

        verifySeg({mld, seg, iSeg, segs, languages, repairMap}) {
            var suid = mld.suid;
            var nSegs = segs.length;
            var iSegNext = iSeg+1;
            var verifyInfo = null;
            var colonParts = seg.scid.split(':');
            var keys = Object.keys(seg);
            var nLangs = keys.length-2;
            var extraLangs = nLangs !== languages.length;
            var reIntHdg = /<h[2-9]/u;
            var invalidIntHdg = reIntHdg.test(seg.html) &&
                !/[:.]0/u.test(seg.scid);
            if (!verifyInfo && iSeg===0 && !/:0/.test(seg.scid)) {
                this.log(`Renumbering seg[0]:${seg.scid}`);
                verifyInfo = { 
                    fixStart: true,
                    fixBody: true,
                    fixInternal: true,
                };
            }
            if (!verifyInfo && invalidIntHdg) {
                while (iSegNext+1 < segs.length) {
                    var segNext = segs[iSegNext];
                    if (!reIntHdg.test(segNext.html)) {
                        break;
                    }
                    iSegNext++;
                }
                let dotParts = segNext.scid.split('.');
                dotParts[dotParts.length-1] = '0';
                let prefix = dotParts.join('.');
                let addSuffix = iSegNext > iSeg+1;
                for (let iHdg=1; iHdg+iSeg<=iSegNext; iHdg++) {
                    let hdgScid = segs[iSeg+iHdg-1].scid;
                    if (addSuffix) {
                        var repairedId = `${prefix}.${iHdg}`;
                    } else {
                        var repairedId = prefix;
                    }
                    repairMap[hdgScid] = repairedId;
                    this.log([
                        `heading:${hdgScid}=>${repairedId}`,
                        `${seg.html}`,
                    ].join(' '));
                }
                verifyInfo = {};
            }
            if (!verifyInfo && iSeg+1<nSegs && extraLangs) {
                languages.forEach(lang => {
                    if (mld.langSegs[lang]) {
                        if (!seg.hasOwnProperty(lang)) {
                            this.log(
                                `Missing ${lang} translation ${seg.scid}`);
                        }
                    } else if (iSeg == 0) {
                        this.log(`Translation stub:${lang} ${mld.suid}`);
                    }
                });
            }
            if (!verifyInfo && colonParts.length === 1) {
                var suidDots = suid.split('.');
                var scidDots = seg.scid.split('.');
                let repairedId = [
                    scidDots.slice(0,suidDots.length).join('.'),
                    ':',
                    scidDots.slice(suidDots.length).join('.')
                ].join('');
                verifyInfo = { repairedId };
                this.log(
                    `Missing colon "${seg.scid}" => "${repairedId}"`);
            }
            if (!verifyInfo && colonParts.length > 2) {
                var {
                    suid:fileSuid,
                } = BilaraPath.pathParts(suid);
                let repairedId = "";
                do {
                    repairedId += repairedId.length===0
                        ? colonParts.shift()
                        : `-${colonParts.shift()}`;
                } while (colonParts.length && 
                    repairedId.length < fileSuid.length);
                repairedId += `:${colonParts.join('.')}`;
                verifyInfo = {repairedId};
                this.log(`Too many colons "${seg.scid}" => `+
                    `"${repairedId}"`);
            }
            if (!verifyInfo && !SuttaCentralId.match(seg.scid, suid)) {
                verifyInfo = {
                    repairedId: colonParts
                        .map((part,i) => i ? part : suid )
                        .join(':'),
                };
                this.log(`Segment id/file mismatch "${seg.scid}" => `+
                    `"${repairedId}"`);
            }
            if (verifyInfo) {
                verifyInfo.seg = seg;
                verifyInfo.iSegNext = iSegNext;
                verifyInfo.repairedId && (
                    repairMap[seg.scid] = verifyInfo.repairedId);
            }
            return verifyInfo;
        }

        verifyDoc(mld) {
            var {
                fixFile,
                forceRenumber,
                root,
                merkleJson: mj,
                fixStart,
                fixInternal,
                fixBody,
                mapFile,
            } = this;
            var suid = mld.suid;
            var repairMap = mapFile
                ? JSON.parse(fs.readFileSync(mapFile))
                : {};
            var segs = mld.segments();
            var nSegs = segs.length;
            var languages = mld.languages();
            var numberingValid = true;
            for (let iSeg=0; iSeg<segs.length; ) {
                let seg = segs[iSeg];
                if (repairMap[seg.scid]) {
                    iSeg++;
                    continue;
                }
                let verifyInfo = this.verifySeg({
                    mld, 
                    seg, 
                    iSeg, 
                    segs,
                    languages,
                    repairMap,
                });
                if (verifyInfo) {
                    fixStart = fixStart || verifyInfo.fixStart;
                    fixBody = fixBody || verifyInfo.fixBody;
                    fixInternal = fixInternal || verifyInfo.fixInternal;
                    numberingValid = numberingValid && 
                        !(fixStart || fixBody);
                    iSeg = verifyInfo.iSegNext;
                } else {
                    iSeg++;
                }
            }
            if (forceRenumber || !numberingValid) {
                this.renumber({
                    mld, 
                    repairMap,
                    fixStart,
                    fixInternal,
                    fixBody,
                });
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
                mapFile,
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
                    that.log(`Nothing to verify for ${pattern}`);
                }
                if (mapFile) {
                    if (res.mlDocs.length > 1) {
                        throw new Error([
                            `A mapFile can only be used with`,
                            `a single document:${mapFile}`,
                        ].join(' '));
                    } else if (!fs.existsSync(mapFile)) {
                        throw new Error(`Map file not found:${mapFile}`);
                    }
                }
                res.mlDocs.forEach(mld => that.verifyDoc(mld));
                resolve({
                    pattern,
                    mlDocs: res.mlDocs,
                });
            } catch(e) {reject(e);}})();
            return new Promise(pbody);
        }

        renumber(opts={}) {
            let {
                mld, 
                repairMap, 
                fixStart,
                fixInternal,
                fixBody,
            } = opts;
            this.log(`Renumbering ${mld.suid}`);
            fixStart == null && (fixStart = this.fixStart);
            fixInternal == null && (fixInternal = this.fixInternal);
            fixBody == null && (fixBody = this.fixBody);
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
                    fixStart && (repairMap[seg.scid] = newScid);
                } else if (isZeroSegment) {
                    // do nothing
                } else { // normal segment
                    if (fixInternal) {
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
                    }

                    newScid = `${prefix}:${major}.${minor}`;
                    fixBody && (repairMap[seg.scid] = newScid);
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
