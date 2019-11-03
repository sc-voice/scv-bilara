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

} = require('../../index');
const LOCAL = path.join(__dirname, '../../local');
const BILARA_DATA = path.join(LOCAL, '/bilara-data');

function help() {
    console.log(`
NAME
    branch - create new git branch for editing a sutta

SYNOPSIS
    branch [OPTIONS] SUID LANG TRANSLATOR
        Create bilara-data git branch SUID_LANG_TRANSLATOR and
        copy the en/sujato version of SUID into the appropriate
        LANG/TRANSLATOR subdirectory.
`);
    process.exit(0);
}

var logLevel = false;

var suid = process.argv[2];
var nargs = process.argv.length;
if (nargs < 5 && suid !== 'master') {
    help();
}
var lang = process.argv[3];
var translator = process.argv[4];
var branch = `${suid}_${lang}_${translator}`;
logLevel = false;

class Branch {
    constructor(opts={}) {
        logger.logInstance(this, opts);
    }

    branch() {
        var that = this;
        (async function() { try {
            var bd = await new BilaraData({
                logLevel,
            }).initialize();
            var git = new ExecGit({
                logLevel:'info',
            });
            if (fs.existsSync(git.repoPath)) {
                await git.branch('master', false);
            }
            await bd.sync();
            if (suid === 'master') {
                await git.branch('master');
                that.log(`You are now on master`);
                process.exit(0);
            }
            var suttaInfo =  bd.suttaInfo(suid);
            var srcInfo = suttaInfo.filter(i => i.lang === 'en')[0];
            var dstInfo = suttaInfo.filter(i => i.lang === lang)[0];
            var remotes = await git.ls_remote();
            var remoteBranch = remotes.split('\n')
                .filter(r => r.indexOf(branch) >= 0)[0];
            console.log(`Remote branch ${branch}`, 
                remoteBranch ? "found" : "not found");
            if (remoteBranch) {
                await git.branch(branch, false);
            } else if (srcInfo) { // translation does not exist. 
                var srcPath = srcInfo.bilaraPath;
                that.log(`source: ${srcPath}`);
                var dstPath = [
                    'translation',
                    lang,
                    translator,
                    ...srcPath.split('/').slice(3),
                ].join('/')
                .replace('en-sujato', `${lang}-${translator}`);
                that.log(`destination: ${dstPath}`);
                that.log(`creating branch ${branch}`);
                await git.branch('master');
                await git.branch(branch, true);
                var data = fs.readFileSync(path.join(BILARA_DATA, srcPath));
                var dstDir = path.dirname(dstPath);
                fs.mkdirSync(dstDir, {
                    recursive: true,
                });
                var dstFullPath = path.join(BILARA_DATA, dstPath);
                that.log(`creating ${dstFullPath}`);
                fs.writeFileSync(dstFullPath, data);
                that.log(`adding ${dstFullPath}`);
                await git.add(dstPath);
                that.log(`committing ${dstFullPath}`);
                await git.commit(`added ${branch}`,false, true);
            } else {
                throw new Error('Could not locate ${suid}');
            }
            that.log(`You are now on ${branch}`);
        } catch(e) { logger.warn(e.stack); }})();

    }
}
new Branch().branch();

