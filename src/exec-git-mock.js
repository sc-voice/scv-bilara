(function(exports) {
    const { logger } = require('log-instance');

    class ExecGitMock {
        constructor(opts={}) {
            (opts.logger || logger).logInstance(this);
        }

        async sync(repo=this.repo, repoPath=this.repoPath, branches=['master']) { 
            this.info("sync()");
            return {stderr:'exec-git-mock:sync', stdout:''};
        }

        async hasChanges() {
            this.info("hasChanges()");
            return false;
        }

        async commit(comment='cosmetic changes', add=true, push=false) {
            throw new Error('exec-git-mock: commit() is not supported');
        } 

        async branch(branch, opts=false) { 
            this.info("branch()");
            return {stderr:'exec-git-mock:branch', stdout:''};
        } 

        async diff(branch, opts={}) {
            throw new Error('exec-git-mock: diff() is not supported');
        } 

        async merge(branch, opts='') {
            throw new Error('exec-git-mock: merge() is not supported');
        } 

        async add(newFile) {
            throw new Error('exec-git-mock: add() is not supported');
        } 

        async gitLog(opts={}) { 
            this.info("gitLog()");
            return {stderr:'exec-git-mock:gitLog', stdout:''};
        }

    }

    module.exports = exports.ExecGitMock = ExecGitMock;
})(typeof exports === "object" ? exports : (exports = {}));
