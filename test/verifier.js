(typeof describe === 'function') && describe("verifier", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        BilaraData,
        MLDoc,
        Seeker,
        SuttaCentralId,
        Verifier,
    } = require("../index");
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require("just-simple").JustSimple;
    this.timeout(10*1000);
    var logLevel = false;

    it("default ctor", ()=>{
        var ver = new Verifier();
        should(ver).properties({
            languages: ['pli', 'de', 'en', 'jpn', 'pt'],
            fixFile: false,
            initialized: false,
        });
        should(ver.seeker).instanceOf(Seeker);
    });
    it("initialize() is required", done=>{
        (async function() { try {
            var ver = new Verifier({logLevel});
            should.throws(()=>{
                ver.verify();
            });
            should(await ver.initialize()).equal(ver);
            should(ver.initialized).equal(true);
            await ver.verify("mn1");
            done();
        } catch(e) { done(e); }})();
    });
    it("TESTTESTverify() fixes thag1.113", done=>{
        (async function() { try {
            var ver = await new Verifier({logLevel}).initialize();
            await ver.verify("thag1.113");
            done();
        } catch(e) { done(e); }})();
    });
})
