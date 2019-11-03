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
    publish - merge bilara-data sutta branch into master

SYNOPSIS
    publish [OPTIONS] LANG TRANSLATOR SUID
        Merge bilara-data git branch SUID_LANG_TRANSLATOR into
        master and delete it if merge is successful

OPTIONS
    -ll, --logLevel LOGLEVEL
        Logging is normally turned off, but you can specificy a LOGLEVEL:
        debug, warn, info, error. The most useful will be "info".
`);
    process.exit(0);
}

var nargs = process.argv.length;
if (nargs < 3) {
    help();
}
var logLevel;
var suid;
var lang;
var translator;
for (var i = 2; i < nargs; i++) {
    var arg = process.argv[i];
    if (arg === '-?' || arg === '--help') {
        help();
    } else if (arg === '-ll' || arg === '--logLevel') {
        logLevel = process.argv[++i];
    } else if (suid == null) {
        suid = arg;
    } else if (lang == null) {
        lang = arg;
    } else if (translator == null) {
        translator = arg;
    } else {
        logger.error(`Unexpected argv[${i}]:${arg}`);
    }
}

class Publish {
    constructor(opts={}) {
        logger.logInstance(this, opts);
    }

    publish() {
        var that = this;
        (async function() { try {
            var nargs = process.argv.length;
            if (nargs < 3) {
                help();
            }
            var branchPrefix = suid;
            lang && (branchPrefix += ` ${lang}`);
            translator && (branchPrefix += ` ${translator}`);
            that.log(`publish() ${branchPrefix}...`);
            var git = new ExecGit({
                logLevel: 'info',
            });
            await git.branch('master');
            await git.sync();
            var bd = await new BilaraData({ logLevel, }).initialize(true);
            var suttaInfo =  bd.suttaInfo(suid);
            var srcInfo = suttaInfo.filter(i => i.lang === 'en')[0];
            var dstInfo = suttaInfo.filter(i => i.lang === lang)[0];
            var remotes = (await git.ls_remote()).split('\n');
            var remoteBranch = remotes
                .filter(r => r.indexOf(branchPrefix) >= 0)[0];
            var branch = remoteBranch && remoteBranch.split('/').pop();
            if (branch) {
                that.log(`Remote branch ${branch} found`);
                await git.branch(branch);
                await git.sync();
            } else {
                logger.error(`Remote branch for ${branchPrefix} not found`);
                process.exit(1);
            }
            that.log(`Merging in master`);
            await git.merge('master', {
                push: true,
            });
            await git.branch('master');
            var diff = await git.diff(branch, {
                nameOnly: true,
            });
            if (diff.stdout.length === 0) {
                that.log(`No changes found in branch ${branch} (DELETING...)`);
                var res = await git.branch(branch, {
                    deleteMerged: true,
                });
                process.exit(0);
            }
            diffFiles = diff.stdout.trim().split('\n');
            if (diffFiles.length > 1) {
                logger.error(`Manual merge required for:\n${diff.stdout}`);
                process.exit(1);
            }
            that.log(`merging into master:`,diffFiles);
            await git.merge(branch, { message: `publish ${branch}`, });
            await git.branch(branch, { deleteMerged: true, });
        } catch(e) { logger.warn(e.stack); }})();
    }
}

new Publish().publish();

