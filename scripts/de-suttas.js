#!/usr/bin/node
const fs = require('fs');
const path = require('path');
const {
    Translation,
    DETranslation,
    BilaraData,
    ExecGit,
} = require('../index');
const {
    js,
    logger,
    LOCAL_DIR,
} = require('just-simple').JustSimple;

logger.info('de-suttas.js');

var patAllow = "/./";

(async function() { try {
    var bd = await new BilaraData().initialize();
    logger.info(`OK: Retrieved latest from ${bd.execGit.repo}`);
    var gitDE = 'https://github.com/sabbamitta/sutta-translation';
    var dePath = path.join(LOCAL_DIR, 'de-suttas');
    var deGit = new ExecGit({
        repo: gitDE,
        repoPath: dePath,
    });
    var res = await deGit.sync();
    logger.info(`OK: Updating latest from ${gitDE}`);
    var deFiles = await bd.dirFiles(dePath);
    var reAllow = new RegExp(patAllow,"u");
    deFiles.filter(f => reAllow.test(f)).forEach(def => {
        var det = new DETranslation({
            source: def.replace(dePath,''),
        });
        det.load(dePath);
        var suid = det.suid;
        if (det.ready) {
            var srcTrans = bd.loadTranslation({
                suid,
                lang: 'en',
            });
            det.applySegments(srcTrans);
            logger.info(`Saving ${suid} to ${det.translation}`);
            det.import(bd.root);
        } else {
            logger.info(`Skipping ${det.source} (NOT READY YET)`);
        }
    });
    var bilGit = new ExecGit();
    await bilGit.commit("de-suttas.js auto-conversion");
    
} catch(e) {
    logger.warn(e.stack);
}})();
