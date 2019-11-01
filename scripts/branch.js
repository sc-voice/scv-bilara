#!/usr/bin/env node
const {
    js,
    logger,
    LOCAL_DIR,
} = require('just-simple').JustSimple;
const fs = require('fs');
const path = require('path');
const {
    BilaraData,
    ExecGit,

} = require('../index');
const LOCAL = path.join(__dirname, '../local');
const BILARA_DATA = path.join(LOCAL, '/bilara-data');

function help() {
    console.log(`
NAME
    branch.js - create new git branch for editing a sutta

SYNOPSIS
    branch.js [OPTIONS] LANG TRANSLATOR SUID
        Create bilara-data git branch LANG_TRANSLATOR_SUID and
        copy the en/sujato version of SUID into the appropriate
        LANG/TRANSLATOR subdirectory.
`);
    process.exit(0);
}

var logLevel = false;

var nargs = process.argv.length;
if (nargs < 5) {
    help();
}
var lang = process.argv[2];
var translator = process.argv[3];
var suid = process.argv[4];
var branch = `${lang}_${translator}_${suid}`;

(async function() { try {
    var bd = await new BilaraData({
        logLevel,
    }).initialize();
    await bd.sync();
    var git = new ExecGit();
    var suttaInfo =  bd.suttaInfo(suid);
    console.log(`dbg`,{suttaInfo});
    var srcInfo = suttaInfo.filter(i => i.lang === 'en')[0];
    var dstInfo = suttaInfo.filter(i => i.lang === lang)[0];
    if (dstInfo) {
        logger.info(`found:${suttaInfo.bilaraPath}`);
        await git.branch(branch, false);
    } else if (srcInfo) {
        var srcPath = srcInfo.bilaraPath;
        logger.info(`source: ${srcPath}`);
        var dstPath = [
            'translation',
            lang,
            translator,
            ...srcPath.split('/').slice(3),
        ].join('/')
        .replace('en-sujato', `${lang}-${translator}`);
        logger.info(`destination: ${dstPath}`);
        logger.info(`creating branch ${branch}`);
        await git.branch(branch, true);
        var data = fs.readFileSync(path.join(BILARA_DATA, srcPath));
        var dstDir = path.dirname(dstPath);
        fs.mkdirSync(dstDir, {
            recursive: true,
        });
        var dstFullPath = path.join(BILARA_DATA, dstPath);
        logger.info(`creating ${dstFullPath}`);
        fs.writeFileSync(dstFullPath, data);
        logger.info(`adding ${dstFullPath}`);
        await git.add(dstPath);
        logger.info(`committing ${dstFullPath}`);
        await git.commit(`added ${branch}`,false);
    } else {
        throw new Error('Could not locate ${suid}');
    }
} catch(e) { logger.warn(e.stack); }})();
