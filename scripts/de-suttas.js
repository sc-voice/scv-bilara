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

(async function() { try {
    var bd = await new BilaraData().initialize();
    var gitDE = 'https://github.com/sabbamitta/sutta-translation';
    var dePath = path.join(LOCAL_DIR, 'de-suttas');
    var deGit = new ExecGit({
        repo: gitDE,
        repoPath: dePath,
    });
    var res = await deGit.sync();
    var deFiles = await bd.dirFiles(dePath);
    deFiles.filter(f => /AN\/[12]\//.test(f)).forEach(def => {
        var det = new DETranslation({
            source: def.replace(dePath,''),
        });
        det.load(dePath);
        var suid = det.suid;
        var srcTrans = bd.loadTranslation({
            suid,
            lang: 'en',
        });
        det.applySegments(srcTrans);
        logger.info(`Saving ${suid} to ${det.translation}`);
        det.save(bd.root);
    });
    var bilGit = new ExecGit();
    await bilGit.commit("de-suttas.js auto-conversion");
    
} catch(e) {
    logger.warn(e.stack);
}})();
