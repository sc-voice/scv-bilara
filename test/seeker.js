(typeof describe === 'function') && describe("seeker", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        BilaraData,
        Seeker,
    } = require("../index");
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require("just-simple").JustSimple;

    const BILARA_PATH = path.join(LOCAL_DIR, 'bilara-data');

    it("TESTTEST default ctor", ()=>{
        var skr = new Seeker();
        should(skr.root).equal(path.join(BILARA_PATH, 'translation'));
        should(skr).properties({
            logLevel: 'info',
            lang: 'en',
        });
    });
    it("TESTTEST custom ctor", ()=>{
        var logLevel = 'warn';
        var lang = 'de';
        var skr = new Seeker({
            root: '/tmp/test',
            logLevel,
            lang,
        });
        should(skr.root).equal('/tmp/test');
        should(skr).properties({
            logLevel,
            lang,
        });
    });
    it("TESTTESTgrep(...) finds things", done=>{
        (async function() { try {
            done();
        } catch(e) { done(e); }})();
    });
})
