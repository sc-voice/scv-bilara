#!/usr/bin/node
const fs = require('fs');
const path = require('path');
const {
    Translation,
    DETranslation,
    BilaraData,
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
    var res = await bd.syncGit(dePath, gitDE);
    var deFiles = await bd.dirFiles(dePath);
    var deFiles = deFiles.map(f => 
        f.replace(new RegExp(`${dePath}/`),''));
    var suids = [ 'sn45.8', 'an1.1-10' ];
    suids.forEach( suid => {
        var def = deFiles.filter(f => {
            f = f.toLowerCase().replace(/ /g,'');
            return f.indexOf(suid) >= 0;
        });
        var det = new DETranslation({
            source: def[0],
        });
        det.load(dePath);
        var suid = det.suid;
        var srcTrans = bd.loadTranslation({
            suid,
            lang: 'en',
        });
        det.applySegments(srcTrans);
        console.log(`Converting ${suid}`, det.segments());
        logger.info(`Saving ${suid} to ${det.translation}`);
        det.save(bd.root);
    });
    
} catch(e) {
    logger.warn(e.stack);
}})();
