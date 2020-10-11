(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const util = require('util');
    const { logger } = require('log-instance');
    const { js, LOCAL_DIR, } = require('just-simple').JustSimple;
    const {
        exec,
        execSync,
    } = require('child_process');
    const execPromise = util.promisify(exec);
    const MAXBUFFER = 10 * 1024 * 1024;

    const BILARA_DATA_GIT = 'https://github.com/sc-voice/bilara-data.git';

    class ExecGit {
        constructor(opts={}) {
            (opts.logger || logger).logInstance(this, opts);
            this.cwd = opts.cwd || LOCAL_DIR;
            this.repo = opts.repo || BILARA_DATA_GIT;
            this.lockRetries = opts.lockRetries || 30; // seconds
            this.repoDir = path.basename(this.repo).replace(/\.git/,'');
            this.repoPath = opts.repoPath || 
                path.join(LOCAL_DIR, this.repoDir);
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

        async ls_remote(origin=true) { try {
            var {
                repoDir,
            } = this;
            var repoPath = this.validateRepoPath();
            var cmd = origin
                ? `git ls-remote ${this.repo}` 
                : `git ls-remote`;
            this.info(`${repoDir}: ${cmd}`);
            var execOpts = {
                cwd: repoPath,
                maxBuffer: MAXBUFFER,
            };
            return await execPromise(cmd, execOpts).stdout;
        } catch(e) {
            this.warn(`ls_remote(${origin})`, e.message);
            throw e;
        }}

        async sync(repo=this.repo, repoPath=this.repoPath, branches=['master']) { try {
            var {
                cwd,
            } = this;
            var cmds = [];
            if (fs.existsSync(repoPath)) {
                cmds.push(`cd ${repoPath} && git fetch --all`);
                if (branches instanceof Array) { 
                    branches.forEach(branch => {
                        cmds.push([
                            `if git checkout ${branch};`,
                            `then echo git checkout ${branch};`,
                            `else git branch --track`,
                            '"${remote#origin/}" "$remote";',
                            'fi',
                        ].join(' '));
                        // checkout and discard branch changes
                        cmds.push(`git checkout ${branch}`);
                        cmds.push(`git checkout .`); 
                    });
                }
                cmds.push(`git merge`);
            } else {
                var repoDir = path.basename(repoPath);
                cmds.push(`git clone ${repo} ${repoDir}`);
            }
            var cmd = cmds.join(' && ');
            this.log(cmd);
            var execOpts = {
                cwd,
                maxBuffer: MAXBUFFER,
            };
            await this.indexLock();
            var res = execSync(cmd, execOpts);
            this.log(`sync() ${cmd} => ${res}`);
            return this;
        } catch(e) {
            this.warn(`sync(}`,{repo,repoPath,branches},e.message);
            throw e;
        }}

        async indexLock() { try {
            let indexLock = path.join(this.repoPath, '.git', 'index.lock');
            for (var iLock=this.lockRetries; 0<iLock--;) {
                if (!fs.existsSync(indexLock)) {
                    break;
                }
                this.info(`waiting on indexLock (${iLock} seconds)...`);
                await new Promise(r=>setTimeout(()=>r(),1000));
            }
            if (iLock < 0 && fs.existsSync(indexLock)) {
                throw new Error(`index.lock timeout with retries:`, this.lockRetries);
            }
            return this;
        } catch(e) {
            this.warn(`indexLock()`, e.message);
            throw e;
        }}

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
                    await that.indexLock();
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

        async branch(branch, opts=false) { try {
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
            var repoPath = this.validateRepoPath();
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
                this.log(`${repoDir}: ${cmd}`);
                this.log(`BRANCH CREATION IN PROGRESS (WAIT...)`);
            } else if (deleteMerged) {
                this.log(`DELETING MERGED BRANCH ${branch}`);
                var cmd = [
                    `git push`,
                    `git branch -d ${branch}`,
                    `git push origin --delete ${branch}`,
                ].join(' && ');
            } else {
                var cmd = `git checkout "${branch}"`;
                this.log(`${repoDir}: ${cmd}`);
            }
            await this.indexLock();
            var res = await execPromise(cmd, execOpts);
            if (res.error) {
                throw res.error;
            }
            return res;
        } catch(e) {
            this.warn(`branch(${branch},${JSON.stringify(opts)})`,e.message);
            throw e;
        }} 

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
