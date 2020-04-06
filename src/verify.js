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
    const LOCAL = path.join(__dirname, '../../local');
    const BILARA_DATA = path.join(LOCAL, '/bilara-data');

    function help() {
        console.log(`
    NAME
            verify - verify/repair bilara-data data integrity 

    SYNOPSIS
            verify [OPTIONS] PATTERN_KEYWORDS

    DESCRIPTION
            Verifies selected suttas.

    OPTIONS
            -f, --fix
            Update files with fixed segment errors
    `);
        process.exit(0);
    }

    var pattern;
    var maxResults = 2000;
    var maxDoc = 1000;
    var logLevel = false;
    var matchHighlight = '';
    var showMatchesOnly = true;
    var isTTY = process.stdout.isTTY;
    var fixFile = false;
    var languages = [
        'pli', 
    ];

    var transPath = path.join(BILARA_DATA, 'translation');
    fs.readdirSync(transPath).forEach(tdf => {
        languages.push(tdf);
    });

    var nargs = process.argv.length;
    if (nargs < 3) {
        help();
    }
    for (var i = 2; i < nargs; i++) {
        var arg = process.argv[i];
        if (i<2) { continue; }
        if (arg === '-?' || arg === '--help') {
            help();
        } else if (arg === '-f' || arg === '--fix') {
            fixFile = true;
        } else {
            pattern = pattern ? `${pattern} ${arg}` : arg;
        }
    }

    pattern = pattern || `wurzel des leidens`;

    var repairs = 0;

    function verifySeg({mld, seg, iSeg, nSegs, languages}) {
        var suid = mld.suid;
        var repairedId = null;
        var newSeg = null;
        var colonParts = seg.scid.split(':');
        var keys = Object.keys(seg);
        var nLangs = keys.length-2;
        if (!repairedId && iSeg+1<nSegs && nLangs !== languages.length) {
            languages.forEach(lang => {
                if (mld.langSegs[lang]) {
                    if (!seg.hasOwnProperty(lang)) {
                        logger.info(`Missing ${lang} translation ${seg.scid}`);
                    }
                } else if (iSeg == 0) {
                    logger.info(`Translation stub:${lang} ${mld.suid}`);
                }
            });
        }
        if (!repairedId && iSeg===0 && !/:0/.test(seg.scid)) {
            logger.info(`Expected segment ${seg.scid} to have scid:0...`);
        }
        if (!repairedId && colonParts.length === 1) {
            var suidDots = suid.split('.');
            var scidDots = seg.scid.split('.');
            repairedId = [
                scidDots.slice(0,suidDots.length).join('.'),
                ':',
                scidDots.slice(suidDots.length).join('.')].join('');
            logger.info(`Missing colon "${seg.scid}" => "${repairedId}"`);
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
            } while (colonParts.length && repairedId.length < fileSuid.length);
            repairedId += `:${colonParts.join('.')}`;
            logger.info(`Too many colons "${seg.scid}" => "${repairedId}"`);
        }
        if (!repairedId && !SuttaCentralId.match(seg.scid, suid)) {
            repairedId = colonParts.map((part,i) => i ? part : suid )
                .join(':');
            logger.info(`Segment id/file mismatch "${seg.scid}" => "${repairedId}"`);
        }
        if (repairedId) {
            newSeg = Object.assign({}, seg, {
                scid: repairedId,
            });
        }
        return newSeg;
    }

    function verifyDoc(mld) {
        var suid = mld.suid;
        var repairMap = {};
        var segs = mld.segments();
        var nSegs = segs.length;
        var languages = mld.languages();
        segs.forEach((seg,iSeg) => {
            var newSeg = verifySeg({mld, seg, iSeg, nSegs, languages});
            if (newSeg) {
                repairMap[seg.scid] = newSeg.scid;
            }
        });
        var repairs = Object.keys(repairMap).length;
        if (fixFile && repairs) {
            mld.bilaraPaths.forEach(fname => {
                console.log(`repairing ${fname}`);
                var fpath = path.join(BILARA_DATA, fname);
                var json = JSON.parse(fs.readFileSync(fpath));
                var newJson = {};
                Object.keys(json).forEach(k => {
                    var newK = repairMap[k] || k;
                    newJson[newK] = json[k];
                });
                fs.writeFileSync(fpath, JSON.stringify(newJson, null, 2));
            });
        }
    }

    function verify(res, pattern, n=0) {
        console.log(`verifying ${res.mlDocs.map(mld=>mld.suid)}`);
        res.mlDocs.forEach(mld => verifyDoc(mld));
    }

    (async function() { try {
        var includeUnpublished = true;

        var skr = await new Seeker({
            includeUnpublished,
            matchHighlight,
            maxResults,
            maxDoc,
            logLevel,
            languages,
        }).initialize();
        var res = await skr.find({
            pattern,
            showMatchesOnly,
        });
        verify(res, pattern);
    } catch(e) { logger.warn(e.stack); }})();

    module.exports = exports.Verifier = Verifier;
})(typeof exports === "object" ? exports : (exports = {}));
