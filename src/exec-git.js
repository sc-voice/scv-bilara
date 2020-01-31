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
    const MAXBUFFER = 10 * 1024 * 1024;

    const BILARA_DATA_GIT = 'https://github.com/sc-voice/bilara-data.git';

    class ExecGit {
        constructor(opts={}) {
            this.cwd = opts.cwd || LOCAL_DIR;
            this.repo = opts.repo || BILARA_DATA_GIT;
            this.repoDir = path.basename(this.repo).replace(/\.git/,'');
            this.repoPath = opts.repoPath || 
                path.join(LOCAL_DIR, this.repoDir);
            logger.logInstance(this, opts);
        }

        static get DEFAULT_REPO() { return BILARA_DATA_GIT; }

        validateRepoPath(repoPath = this.repoPath) {
            if (!fs.existsSync(path.join(repoPath,'.git'))) {
                throw new Error(
                    `Expected git repository:${repoPath}`);
            }
            return repoPath;
        }

        onExec(resolve, reject, resData) {
            var that = this;
            return (error, stdout, stderr) => {
                if (error) {
                    that.log(error.stack);
                    reject(error);
                    return;
                } 
                if (resData === 'stdout') {
                    resolve(stdout);
                } else if (resData === 'std') {
                    resolve({
                        stdout,
                        stderr,
                    });
                } else {
                    stdout && that.log(`stdout\n${stdout}`);
                    stderr && that.log(`stderr\n${stderr}`);
                    resolve(that);
                }
            }
        }

        ls_remote(origin=true) {
            var that = this;
            var {
                repoDir,
            } = this;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    var repoPath = that.validateRepoPath();
                    var cmd = origin
                        ? `git ls-remote ${that.repo}` 
                        : `git ls-remote`;
                    that.log(`${repoDir}: ${cmd}`);
                    var execOpts = {
                        cwd: repoPath,
                        maxBuffer: MAXBUFFER,
                    };
                    exec(cmd, execOpts, 
                        that.onExec(resolve, reject, 'stdout'));
                } catch(e) {reject(e);} })();
            });
        }

        sync(repo=this.repo, repoPath=this.repoPath) {
            var that = this;
            var {
                cwd,
            } = this;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    if (fs.existsSync(repoPath)) {
                        var cmd = `cd ${repoPath} && git fetch --all && git merge`;
                    } else {
                        var repoDir = path.basename(repoPath);
                        var cmd = `git clone ${repo} ${repoDir}`;
                    }
                    that.log(cmd);
                    var execOpts = {
                        cwd,
                        maxBuffer: MAXBUFFER,
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
                        maxBuffer: MAXBUFFER,
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
        
        commit(comment='cosmetic changes', add=true, push=false) {
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
                    if (push) {
                        cmd += ` && git push`;
                    }
                    that.log(`${repoDir}: ${cmd}`);
                    var execOpts = {
                        cwd: repoPath,
                        maxBuffer: MAXBUFFER,
                    };
                    exec(cmd, execOpts, that.onExec(resolve, reject));
                } catch(e) {reject(e);} })();
            });
        } 

        branch(branch, opts=false) {
            var that = this;
            if (typeof opts === 'boolean') {
                opts = { add: opts };
            }
            var {
                add,
                list,
                deleteMerged,
            } = opts;
            var {
                repoDir,
            } = this;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    var repoPath = that.validateRepoPath();
                    var execOpts = {
                        cwd: repoPath,
                        maxBuffer: MAXBUFFER,
                    };
                    var resData = 'std';
                    if (list) {
                        var cmd = `git branch`;
                    } else if (add) {
                        var cmd = [
                            `git checkout -b "${branch}"`,
                            `git push -u origin ${branch}`,
                        ].join(';');
                        that.log(`${repoDir}: ${cmd}`);
                        that.log(`BRANCH CREATION IN PROGRESS (WAIT...)`);
                    } else if (deleteMerged) {
                        that.log(`DELETING MERGED BRANCH ${branch}`);
                        var cmd = [
                            `git push`,
                            `git branch -d ${branch}`,
                            `git push origin --delete ${branch}`,
                        ].join(' && ');
                    } else {
                        var cmd = `git checkout "${branch}"`;
                        that.log(`${repoDir}: ${cmd}`);
                    }
                    exec(cmd, execOpts, that.onExec(resolve, reject, resData));
                } catch(e) {reject(e);} })();
            });
        } 

        diff(branch, opts={}) {
            var that = this;
            if (typeof opts === 'string') {
                opts = {args: opts};
            }
            var {
                args,
                nameOnly,
            } = opts;
            var {
                repoDir,
            } = this;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    var repoPath = that.validateRepoPath();
                    if (args) {
                        var cmd = `git diff ${args} ${branch}` ;
                    } else if (nameOnly) {
                        var cmd = `git diff --name-only ${branch}` ;
                    } else {
                        var cmd = `git diff ${branch}` ;
                    }
                    that.log(`${repoDir}: ${cmd}`);
                    var execOpts = {
                        cwd: repoPath,
                        maxBuffer: MAXBUFFER,
                    };
                    exec(cmd, execOpts, that.onExec(resolve, reject, 'std'));
                } catch(e) {reject(e);} })();
            });
        } 

        merge(branch, opts='') {
            var that = this;
            if (typeof opts === 'string') {
                opts = { args: opts, };
            }
            var {
                args,
                push,
                message,
            } = opts;
            args = args || '';
            (message) && (args += ` -m "${message}"`);
            var {
                repoDir,
            } = this;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    var repoPath = that.validateRepoPath();
                    var cmd = `git merge ${args} ${branch}` ;
                    push && (cmd += ` && git push`);

                    that.log(`${repoDir}: ${cmd}`);
                    var execOpts = {
                        cwd: repoPath,
                        maxBuffer: MAXBUFFER,
                    };
                    exec(cmd, execOpts, that.onExec(resolve, reject));
                } catch(e) {reject(e);} })();
            });
        } 

        add(newFile) {
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
                    var cmd = newFile 
                        ? `git add ${newFile}` 
                        : `git add .`;
                    that.log(`${repoDir}: ${cmd}`);
                    var execOpts = {
                        cwd: repoPath,
                        maxBuffer: MAXBUFFER,
                    };
                    exec(cmd, execOpts, that.onExec(resolve, reject));
                } catch(e) {reject(e);} })();
            });
        } 

    }

    module.exports = exports.ExecGit = ExecGit;
})(typeof exports === "object" ? exports : (exports = {}));
