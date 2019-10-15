(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require('just-simple').JustSimple;
    const {
        exec,
        execSync,
    } = require('child_process');

    const BILARA_DATA_GIT = 'https://github.com/sc-voice/bilara-data.git';

    class ExecGit {
        constructor(opts={}) {
            this.cwd = opts.cwd || LOCAL_DIR;
            this.repo = opts.repo || BILARA_DATA_GIT;
            this.repoDir = path.basename(this.repo).replace(/\.git/,'');
            this.repoPath = opts.repoPath || path.join(LOCAL_DIR, this.repoDir);
            logger.logInstance(this, opts);
        }

        validateRepoPath(repoPath = this.repoPath) {
            if (!fs.existsSync(path.join(repoPath,'.git'))) {
                throw new Error(
                    `Expected git repository:${repoPath}`);
            }
            return repoPath;
        }

        onExec(resolve, reject) {
            var that = this;
            return (error, stdout, stderr) => {
                if (error) {
                    that.log(error.stack);
                    reject(error);
                    return;
                } 
                stdout && that.log(`stdout\n${stdout}`);
                stderr && that.log(`stderr\n${stderr}`);
                resolve(that);
            }
        }

        sync(repo=this.repo, repoPath=this.repoPath) {
            var that = this;
            var {
                cwd,
            } = this;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    if (fs.existsSync(repoPath)) {
                        var cmd = `cd ${repoPath}; git pull`;
                    } else {
                        var repoDir = path.basename(repoPath);
                        var cmd = `git clone ${repo} ${repoDir}`;
                    }
                    that.log(cmd);
                    var execOpts = {
                        cwd,
                    };
                    var res = execSync(cmd, execOpts).toString();
                    that.log(res);
                    resolve(that);
                } catch(e) {reject(e);} })();
            });
        } 

        hasChanges() {
            var that = this;
            var {
                repoDir,
            } = this;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    var repoPath = that.validateRepoPath();
                    var cmd = `git status`;
                    var execOpts = {
                        cwd: repoPath,
                    };
                    exec(cmd, execOpts, (error, stdout, stderr) => {
                        if (error) {
                            reject(error);
                            return;
                        } 
                        that.log(`${repoDir} hasChanges: ${cmd}\n${stdout.trim()}`);
                        stderr && that.log(stderr);
                        var nothing = /nothing to commit/mu.test(stdout);
                        resolve(!nothing);
                    });
                } catch(e) {reject(e);} })();
            });
        } 
        
        commit(comment='cosmetic changes', add=true) {
            var that = this;
            var {
                repoDir,
            } = this;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    var changed = await that.hasChanges();
                    if (!changed) {
                        resolve(that);
                        return;
                    }
                    add && await that.add();
                    var repoPath = that.validateRepoPath();
                    var cmd = `git commit -am "${comment}"`;
                    that.log(`${repoDir}: ${cmd}`);
                    var execOpts = {
                        cwd: repoPath,
                    };
                    exec(cmd, execOpts, that.onExec(resolve, reject));
                } catch(e) {reject(e);} })();
            });
        } 

        add() {
            var that = this;
            var {
                repoDir,
            } = this;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    var changed = await that.hasChanges();
                    if (!changed) {
                        resolve(that);
                        return;
                    }
                    var repoPath = that.validateRepoPath();
                    var cmd = `git add .`;
                    that.log(`${repoDir}: ${cmd}`);
                    var execOpts = {
                        cwd: repoPath,
                    };
                    exec(cmd, execOpts, that.onExec(resolve, reject));
                } catch(e) {reject(e);} })();
            });
        } 

    }

    module.exports = exports.ExecGit = ExecGit;
})(typeof exports === "object" ? exports : (exports = {}));
