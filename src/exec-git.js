(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const util = require('util');
    const { logger } = require('log-instance');
    const { Files } = require('memo-again');
    const {
        exec,
        execSync,
    } = require('child_process');
    const {
      DBG_EXEC,
    } = require('./defines.cjs');
    const execPromise = util.promisify(exec);
    const MAXBUFFER = 10 * 1024 * 1024;

    const BILARA_DATA_GIT = 'https://github.com/suttacentral/bilara-data.git';
    //const BILARA_DATA_GIT = 'https://github.com/sc-voice/ebt-data.git';
    var gitPromise = undefined;
    var gitContext = '';

    class ExecGit {
        constructor(opts={}) {
            const msg = 'ExecGit.ctor()';
            const dbg = DBG_EXEC;
            (opts.logger || logger).logInstance(this, opts);
            this.cwd = opts.cwd || Files.LOCAL_DIR;
            this.repo = opts.repo || BILARA_DATA_GIT;
            this.lockRetries = opts.lockRetries || 30; // seconds
            this.repoDir = path.basename(this.repo).replace(/\.git/,'');
            this.repoPath = opts.repoPath || 
                path.join(Files.LOCAL_DIR, this.repoDir);
            dbg && console.log(msg, this);
        }

        static get DEFAULT_REPO() { return BILARA_DATA_GIT; }

        validateRepoPath(repoPath = this.repoPath) {
            if (!fs.existsSync(path.join(repoPath,'.git'))) {
              let emsg = [
                `Expected git repository:${repoPath}`,
                `repo:${this.repo}`,
              ].join(' ');
              throw new Error(emsg);
            }
            return repoPath;
        }

        onExec(resolve, reject, resData) {
            var that = this;
            return (error, stdout, stderr) => {
                if (error) {
                    that.info(error.stack);
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
                    stdout && that.info(`stdout\n${stdout}`);
                    stderr && that.info(`stderr\n${stderr}`);
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
            return (await execPromise(cmd, execOpts)).stdout;
        } catch(e) {
            this.warn(`ls_remote(${origin})`, e.message);
            throw e;
        }}

        async sync(repo=this.repo, repoPath=this.repoPath, branches=['master']) { try {
            await this.gitPromiseLock('sync()');
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
            this.info(cmd);
            var execOpts = {
                cwd,
                maxBuffer: MAXBUFFER,
            };
            let res = await execPromise(cmd, execOpts);
            this.info(`sync() ${cmd} => ${JSON.stringify(res.stderr.substring(0,100))}`);
            return this;
        } catch(e) {
            this.warn(`sync()`,{repo,repoPath,branches},e.message);
            throw e;
        } finally {
            this.gitPromiseUnlock();
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
                        that.info(`${repoDir} hasChanges: ${cmd}\n${stdout.trim()}`);
                        stderr && that.info(stderr);
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
                    that.info(`${repoDir}: ${cmd}`);
                    var execOpts = {
                        cwd: repoPath,
                        maxBuffer: MAXBUFFER,
                    };
                    exec(cmd, execOpts, that.onExec(resolve, reject));
                } catch(e) {reject(e);} })();
            });
        } 

        async gitPromiseLock(msg) {
            const SECONDS = 60;
            const PERSECOND = 2;
            for (let tries=SECONDS*PERSECOND; gitPromise && 0<tries--;) {
                this.info(`${msg} waiting on ${gitContext}...${tries/PERSECOND}`);
                await gitPromise;
                await new Promise(r=>setTimeout(()=>r(),1000/PERSECOND));
            }
            gitContext = msg;
            gitPromise = this.indexLock();
            await gitPromise;
        }

        gitPromiseUnlock() {
            gitPromise = undefined;
        }

        async branch(branch, opts=false) { try {
            await this.gitPromiseLock('branch()');
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
                this.info(`${repoDir}: ${cmd}`);
                this.info(`BRANCH CREATION IN PROGRESS (WAIT...)`);
            } else if (deleteMerged) {
                this.info(`DELETING MERGED BRANCH ${branch}`);
                var cmd = [
                    `git push`,
                    `git branch -d ${branch}`,
                    `git push origin --delete ${branch}`,
                ].join(' && ');
            } else {
                var cmd = `git checkout "${branch}"`;
                this.info(`${repoDir}: ${cmd}`);
            }
            let res = await execPromise(cmd, execOpts);
            if (res.error) {
                throw res.error;
            }
            return res;
        } catch(e) {
            this.warn(`branch(${branch},${JSON.stringify(opts)})`,e.message);
            throw e;
        } finally {
            this.gitPromiseUnlock();
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
                    that.info(`${repoDir}: ${cmd}`);
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

                    that.info(`${repoDir}: ${cmd}`);
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
                    that.info(`${repoDir}: ${cmd}`);
                    var execOpts = {
                        cwd: repoPath,
                        maxBuffer: MAXBUFFER,
                    };
                    exec(cmd, execOpts, that.onExec(resolve, reject));
                } catch(e) {reject(e);} })();
            });
        } 

        async gitLog(opts={}) { try {
            var {
                repoPath,
            } = this;
            if (!fs.existsSync(repoPath)) {
                throw new Error(`not found:${repoPath}`);
            }
            var {
                maxCount=1,
            } = opts;
            var cmd = `git log -${maxCount}`;
            var execOpts = {
                cwd: repoPath,
            };
            return await execPromise(cmd, execOpts);
        } catch(e) {
            this.warn(`gitLog() ${JSON.stringify({cmd,execOpts})}`, e.message);
            throw e;
        }}

    }

    module.exports = exports.ExecGit = ExecGit;
})(typeof exports === "object" ? exports : (exports = {}));
