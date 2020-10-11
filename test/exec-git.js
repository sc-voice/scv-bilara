(typeof describe === 'function') && describe("exec-git", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        execSync,
    } = require("child_process");
    const {
        ExecGit,
    } = require("../index");
    const { logger } = require('log-instance');
    const { js, LOCAL_DIR, } = require("just-simple").JustSimple;
    const TEST_REPO = "git@github.com:sc-voice/test-repo.git";
    const TEST_REPOPATH = path.join(LOCAL_DIR, 'test-repo');
    this.timeout(10*1000);
    var logLevel = false;

    it("default ctor", () => {
        var egit = new ExecGit();
        should(egit.repo)
            .equal('https://github.com/sc-voice/bilara-data.git');
        should(egit.repoPath).equal(path.join(LOCAL_DIR, 'bilara-data'));
    });
    it("custom ctor", () => {
        var repo = TEST_REPO;
        var repoPath = TEST_REPOPATH;
        var egit = new ExecGit({ repo, repoPath });
        should(egit.repo).equal(TEST_REPO);
        should(egit.repoPath).equal(TEST_REPOPATH);
    });
    it("sync(...) syncs clones repo", (done)=>{
        (async function() { try {
            var repo = TEST_REPO;
            var repoPath = TEST_REPOPATH;
            if (fs.existsSync(repoPath)) {
                var cmd = "rm -rf test-repo";
                var cwd = LOCAL_DIR;
                execSync(cmd, {cwd});
            }
            should(fs.existsSync(repoPath)).equal(false);
            var execGit = new ExecGit({
                repo,
                repoPath,
                logLevel,
            });
            var res = await execGit.sync();
            should(fs.existsSync(repoPath)).equal(true);
            should(res).equal(execGit);
            done();
        } catch(e) {done(e);} })();
    });
    it("add(...) git add", (done)=>{
        (async function() { try {
            var repo = TEST_REPO;
            var repoPath = TEST_REPOPATH;
            var execGit = new ExecGit({
                repo, 
                repoPath,
                logLevel,
            });
            var res = await execGit.add();
            should(res).equal(execGit);
            done();
        } catch(e) {done(e);} })();
    });
    it("hasChanges() true if git has changes", (done)=>{
        (async function() { try {
            var repo = TEST_REPO;
            var repoPath = TEST_REPOPATH;
            var execGit = new ExecGit({
                repo, 
                repoPath,
                logLevel,
            });
            var res = await execGit.hasChanges();
            should(res).equal(false);
            done();
        } catch(e) {done(e);} })();
    });
    it("commit(...) git commit", (done)=>{
        (async function() { try {
            var repo = TEST_REPO;
            var repoPath = TEST_REPOPATH;
            var execGit = new ExecGit({
                repo, 
                repoPath,
                logLevel,
            });
            var res = await execGit.commit("new translations");
            should(res).equal(execGit);
            done();
        } catch(e) {done(e);} })();
    });
    it("branch() waits for indexLock", async()=>{ try {
        let root = path.join(LOCAL_DIR, 'bilara-data');
        let execGit = new ExecGit({
            repo: `https://github.com/sc-voice/bilara-data.git`,
        });
        let logLevel = logger.logLevel;
        logger.logLevel = 'info';

        // create index.lock
        var indexLock = path.join(root, '.git', 'index.lock');
        should(fs.existsSync(indexLock)).equal(false);
        fs.writeFileSync(indexLock, 'test');
        let resolved = false;

        // bd.sync will block
        let branchPromise = execGit.branch('unpublished');
        branchPromise.then(()=>{ resolved = true; });
        await new Promise(r=>setTimeout(()=>r(), 200));
        should(resolved).equal(false);

        // bd.sync will continue
        await fs.promises.unlink(indexLock);
        await branchPromise;
        should(resolved).equal(true);
        logger.logLevel = logLevel;
    } finally {
        fs.existsSync(indexLock) &&  fs.unlinkSync(indexLock);
    }});
})
