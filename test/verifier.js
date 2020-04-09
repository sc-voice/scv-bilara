(typeof describe === 'function') && describe("verifier", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        BilaraData,
        BilaraPath,
        MLDoc,
        Seeker,
        SuttaCentralId,
        Verifier,
    } = require("../index");
    const {
        htmlPath,
        translationPath,
        rootPath,
    } = BilaraPath;
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require("just-simple").JustSimple;
    const TEST_BILARA = path.join(__dirname, 'data', 'bilara-data');
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
    it("custom ctor", ()=>{
        var root = TEST_BILARA;
        var ver = new Verifier({
            root,
        });
        should(ver.seeker.root).equal(root);
        should(ver.root).equal(root);
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
        done(); return; // TODO dbg
        (async function() { try {
            var root = TEST_BILARA;
            var ver = await new Verifier({
                logLevel,
                root,
            }).initialize();
            var res = await ver.verify("thag1.113");
            should(res.mlDocs.length).equal(1);
            var mld0 = res.mlDocs[0];
            var repaired = mld0.repaired;
            var repairedScids = [
                'thag1.113:0.1',
                'thag1.113:0.2',
                'thag1.113:0.3',
                'thag1.113:0.4',
                'thag1.113:1.1',
                'thag1.113:1.2',
                'thag1.113:1.3',
                'thag1.113:1.4',
                'thag1.113:2.1',
                'thag1.113:2.2',
            ];
            var segs = mld0.segments();

            var htmlRepaired = repaired[htmlPath('kn/thag/thag1.113')];
            should.deepEqual(Object.keys(htmlRepaired), repairedScids);
            should.deepEqual(
                Object.keys(htmlRepaired).map(k=>htmlRepaired[k]),
                segs.map(s=>s.html));

            var transRepaired = repaired[
                translationPath('kn/thag/thag1.113','en','sujato')];
            should.deepEqual(Object.keys(transRepaired), 
                repairedScids.slice(0,8)); // ignore untranslated segments
            should.deepEqual(
                Object.keys(transRepaired).map(k=>transRepaired[k]),
                segs.filter(s=>s.hasOwnProperty('en')).map(s=>s.en)
            );

            var rootRepaired = repaired[rootPath('kn/thag/thag1.113')];
            should.deepEqual(Object.keys(rootRepaired), repairedScids);
            should.deepEqual(
                Object.keys(rootRepaired).map(k=>rootRepaired[k]),
                segs.map(s=>s.pli));
                
            done();
        } catch(e) { done(e); }})();
    });
    it("TESTTESTverify() fixes thag1.1", done=>{
        done(); return; // TODO dbg
        (async function() { try {
            var root = TEST_BILARA;
            var ver = await new Verifier({
                logLevel,
                root,
            }).initialize();
            var res = await ver.verify("thag1.1");
            should(res.mlDocs.length).equal(1);
            var mld0 = res.mlDocs[0];
            var repaired = mld0.repaired;
            var repairedScids = [
                'thag1.1:0.1',
                'thag1.1:0.2',
                'thag1.1:0.3',
                'thag1.1:0.4',
                'thag1.1:1.0.1',
                'thag1.1:1.0.2',
                'thag1.1:1.1',
                'thag1.1:1.2',
                'thag1.1:1.3',
                'thag1.1:1.4',
                'thag1.1:2.1',
                'thag1.1:2.2',
                'thag1.1:2.3',
                'thag1.1:2.4',
                'thag1.1:3.1',
                'thag1.1:3.2',
                'thag1.1:3.3',
                'thag1.1:3.4',
                'thag1.1:4.0',
                'thag1.1:4.1',
                'thag1.1:4.2',
                'thag1.1:4.3',
                'thag1.1:4.4',
                'thag1.1:5.1',
            ];
            var segs = mld0.segments();

            var htmlRepaired = repaired[htmlPath('kn/thag/thag1.1')];
            var keysRepaired = Object.keys(htmlRepaired);
            for (let iRep = 0; iRep < keysRepaired.length; iRep++) {
                should(keysRepaired[iRep]).equal(repairedScids[iRep]);
            }
            should.deepEqual(keysRepaired.map(k=>htmlRepaired[k]),
                segs.map(s=>s.html));

            var transRepaired = repaired[
                translationPath('kn/thag/thag1.1','en','sujato')];
            should.deepEqual(Object.keys(transRepaired), repairedScids);
            should.deepEqual(
                Object.keys(transRepaired).map(k=>transRepaired[k]),
                segs.filter(s=>s.hasOwnProperty('en')).map(s=>s.en)
            );

            var rootRepaired = repaired[rootPath('kn/thag/thag1.1')];
            should.deepEqual(Object.keys(rootRepaired), repairedScids);
            should.deepEqual(
                Object.keys(rootRepaired).map(k=>rootRepaired[k]),
                segs.map(s=>s.pli));
                
            done();
        } catch(e) { done(e); }})();
    });
    it("TESTTESTverify() fixes thag1.10", done=>{
        (async function() { try {
            var root = TEST_BILARA;
            var ver = await new Verifier({
                logLevel,
                root,
            }).initialize();
            var res = await ver.verify("thag1.10");
            should(res.mlDocs.length).equal(1);
            var mld0 = res.mlDocs[0];
            var repaired = mld0.repaired;
            var repairedScids = [
                'thag1.10:0.1',
                'thag1.10:0.2',
                'thag1.10:0.3',
                'thag1.10:0.4',
                'thag1.10:1.1',
                'thag1.10:1.2',
                'thag1.10:1.3',
                'thag1.10:1.4',
                'thag1.10:1.5',
                'thag1.10:1.6',
                'thag1.10:1.7',
                'thag1.10:2.1',
                'thag1.10:2.2',
                'thag1.10:2.3',
                'thag1.10:2.4',
                'thag1.10:2.5',
                'thag1.10:2.6',
            ];
            var segs = mld0.segments();

            var htmlRepaired = repaired[htmlPath('kn/thag/thag1.10')];
            var keysRepaired = Object.keys(htmlRepaired);
            for (let iRep = 0; iRep < keysRepaired.length; iRep++) {
                should(keysRepaired[iRep]).equal(repairedScids[iRep]);
            }
            should.deepEqual(keysRepaired.map(k=>htmlRepaired[k]),
                segs.map(s=>s.html));

            var transRepaired = repaired[
                translationPath('kn/thag/thag1.10','en','sujato')];
            should.deepEqual(Object.keys(transRepaired), 
                repairedScids.slice(0,9)); // partial translation
            should.deepEqual(
                Object.keys(transRepaired).map(k=>transRepaired[k]),
                segs.filter(s=>s.hasOwnProperty('en')).map(s=>s.en)
            );

            var rootRepaired = repaired[rootPath('kn/thag/thag1.10')];
            should.deepEqual(Object.keys(rootRepaired), repairedScids);
            should.deepEqual(
                Object.keys(rootRepaired).map(k=>rootRepaired[k]),
                segs.map(s=>s.pli));
                
            done();
        } catch(e) { done(e); }})();
    });
})
