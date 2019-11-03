#!/usr/bin/node
const fs = require('fs');
const path = require('path');
const {
    SegDoc,
    DETranslation,
    BilaraData,
    ExecGit,
} = require('../../index');
const {
    js,
    logger,
    LOCAL_DIR,
} = require('just-simple').JustSimple;

logger.info('de-suttas');

var patAllow = ".*/(AN|DN|MN|KN|SN)/.*";

(async function() { try {
    var bd = await new BilaraData().initialize(true);
    logger.info(`OK: Retrieved latest from ${bd.execGit.repo}`);
    var gitDE = 'https://github.com/sabbamitta/sutta-translation';
    var dePath = path.join(LOCAL_DIR, 'de-suttas');
    var deGit = new ExecGit({
        repo: gitDE,
        repoPath: dePath,
    });
    await deGit.sync();
    logger.info(`OK: Updating latest from ${gitDE}`);
    var deFiles = await bd.dirFiles(dePath);
    var reAllow = new RegExp(patAllow,"u");
    console.log(deFiles.slice(0,10));
    var deAllowedFiles = deFiles.filter(f => reAllow.test(f));
    console.log(deAllowedFiles);
    for (var i = 0; i < deAllowedFiles.length; i++) {
        var def = deAllowedFiles[i];
        var det = new DETranslation({
            source: def.replace(dePath,''),
        });
        det.loadSync(dePath);
        var suid = det.suid;
        if (det.ready) {
            var srcTrans = await bd.loadSegDoc({
                suid,
                lang: 'en',
            });
            det.applySegments(srcTrans);
            logger.info(`Saving ${suid} to ${det.bilaraPath}`);
            det.import(bd.root);
        } else {
            logger.info(`Skipping ${det.source} (NOT READY YET)`);
        }
    }
    var bilGit = new ExecGit();
    await bilGit.commit("de-suttas auto-conversion");
    
} catch(e) {
    logger.warn(e.stack);
}})();
