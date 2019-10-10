(typeof describe === 'function') && describe("exec-git", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        ExecGit,
    } = require("../index");
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require("just-simple").JustSimple;

    it("default ctor", () => {
        var egit = new ExecGit();
        should(egit.repo).equal('https://github.com/sc-voice/bilara-data.git');
        should(egit.repoPath).equal(path.join(LOCAL_DIR, 'bilara-data'));
    });
    it("sync(...) syncs sabbamitta/sutta-translation", (done)=>{
        (async function() { try {
            var gitDE = 'https://github.com/sabbamitta/sutta-translation';
            var dePath = path.join(LOCAL_DIR, 'de-suttas');
            var execGit = new ExecGit(gitDE, dePath);
            var res = await execGit.sync();
            should(fs.existsSync(dePath)).equal(true);
            should(res).equal(execGit);
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTadd(...) git add", (done)=>{
        (async function() { try {
            var execGit = new ExecGit();
            var res = await execGit.add();
            should(res).equal(execGit);
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESThasChanges() true if git has changes", (done)=>{
        (async function() { try {
            var execGit = new ExecGit();
            var res = await execGit.hasChanges();
            should(res).equal(false);
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTcommit(...) git commit", (done)=>{
        (async function() { try {
            var execGit = new ExecGit();
            var res = await execGit.commit("new translations");
            should(res).equal(execGit);
            done();
        } catch(e) {done(e);} })();
    });
})
