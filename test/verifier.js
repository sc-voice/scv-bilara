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
            forceRenumber: false,
        });
        should(ver.seeker).instanceOf(Seeker);
    });
    it("custom ctor", ()=>{
        var root = TEST_BILARA;
        var forceRenumber = true;
        var fixFile = true;
        var ver = new Verifier({
            root,
            forceRenumber,
            fixFile
        });
        should(ver.seeker.root).equal(root);
        should(ver.root).equal(root);
        should(ver).properties({
            languages: ['pli', 'de', 'en', 'jpn', 'pt'],
            fixFile,
            initialized: false,
            forceRenumber,
        });
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
    it("verify() fixes thag1.113", done=>{
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
    it("verify() fixes thag1.1", done=>{
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
    it("verify() fixes thag1.10", done=>{
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
                'thag1.10:2.0',
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
    it("verify() fixes thag2.49", done=>{
        (async function() { try {
            var root = TEST_BILARA;
            var forceRenumber = true;
            var ver = await new Verifier({
                logLevel,
                root,
                forceRenumber,
            }).initialize();
            var res = await ver.verify("thag2.49");
            should(res.mlDocs.length).equal(1);
            var mld0 = res.mlDocs[0];
            var repaired = mld0.repaired;
            console.log(`dbg res`, res);
            var repairedScids = [
                'thag2.49:0.1',
                'thag2.49:0.2',
                'thag2.49:0.3',
                'thag2.49:0.4',
                'thag2.49:1.1',
                'thag2.49:1.2',
                'thag2.49:1.3',
                'thag2.49:1.4',
                'thag2.49:2.1',
                'thag2.49:2.2',
                'thag2.49:2.3',
                'thag2.49:2.4',
                'thag2.49:2.5',
                'thag2.49:2.6',
                'thag2.49:2.7',
                'thag2.49:3.0',
                'thag2.49:3.1',
                'thag2.49:3.2',
                'thag2.49:3.3',
                'thag2.49:3.4',
                'thag2.49:3.5',
                'thag2.49:3.6',
                'thag2.49:3.7',
                'thag2.49:4.0',
                'thag2.49:4.1',
                'thag2.49:4.2',
                'thag2.49:4.3',
                'thag2.49:4.4',
            ];
            var segs = mld0.segments();

            var htmlRepaired = repaired[htmlPath('kn/thag/thag2.49')];
            var keysRepaired = Object.keys(htmlRepaired);
            for (let iRep = 0; iRep < keysRepaired.length; iRep++) {
                should(keysRepaired[iRep]).equal(repairedScids[iRep]);
            }
            should.deepEqual(keysRepaired.map(k=>htmlRepaired[k]),
                segs.map(s=>s.html));

            // no fixes
            var transRepaired = repaired[
                translationPath('kn/thag/thag2.49','en','sujato')];
            should(transRepaired).equal(undefined);

            var rootRepaired = repaired[rootPath('kn/thag/thag2.49')];
            should.deepEqual(Object.keys(rootRepaired), repairedScids);
            should.deepEqual(
                Object.keys(rootRepaired).map(k=>rootRepaired[k]),
                segs.map(s=>s.pli));
                
            done();
        } catch(e) { done(e); }})();
    });
    it("verify() fixes thag21.1", done=>{
        (async function() { try {
            var root = TEST_BILARA;
            var forceRenumber = true;
            var ver = await new Verifier({
                logLevel,
                root,
                forceRenumber,
            }).initialize();
            var res = await ver.verify("thag21.1");
            should(res.mlDocs.length).equal(1);
            var mld0 = res.mlDocs[0];
            var repaired = mld0.repaired;
            var repairedScidHead = [
                'thag21.1:0.1',
                'thag21.1:0.2',
                'thag21.1:0.3',
                'thag21.1:0.4',
                'thag21.1:1.1',
                'thag21.1:1.2',
                'thag21.1:1.3',
                'thag21.1:1.4',
                'thag21.1:2.1',
                'thag21.1:2.2',
                'thag21.1:2.3',
                'thag21.1:2.4',
                'thag21.1:3.1',
            ];
            var repairedScidTail = [
                'thag21.1:71.4',
                'thag21.1:71.5',
                'thag21.1:71.6',
                'thag21.1:72.0',
                'thag21.1:72.1',
                'thag21.1:72.2',
                'thag21.1:72.3',
                'thag21.1:72.4',
                'thag21.1:72.5',
                'thag21.1:73.0',
                'thag21.1:73.1',
                'thag21.1:73.2',
                'thag21.1:73.3',
                'thag21.1:73.4',
                'thag21.1:74.1',
                'thag21.1:74.2',
                'thag21.1:74.3',
                'thag21.1:74.4',
                'thag21.1:74.5',
            ];
            var nHead = repairedScidHead.length;
            var nTail = repairedScidTail.length;
            var segs = mld0.segments();

            var htmlRepaired = repaired[htmlPath('kn/thag/thag21.1')];
            var keysRepaired = Object.keys(htmlRepaired);
            var headRepaired = keysRepaired.slice(0,nHead);
            for (let iRep = 0; iRep < headRepaired.length; iRep++) {
                should(headRepaired[iRep]).equal(repairedScidHead[iRep]);
            }
            var tailRepaired = keysRepaired
                .slice(keysRepaired.length-nTail);
            for (let iRep = 0; iRep < tailRepaired.length; iRep++) {
                should(tailRepaired[iRep]).equal(repairedScidTail[iRep]);
            }
            should.deepEqual(keysRepaired.map(k=>htmlRepaired[k]),
                segs.map(s=>s.html));

            var transRepaired = repaired[
                translationPath('kn/thag/thag21.1','en','sujato')];
            var headTrans = Object.keys(transRepaired).slice(0,nHead);
            should.deepEqual(headTrans, repairedScidHead);
            should.deepEqual(
                Object.keys(transRepaired).map(k=>transRepaired[k]),
                segs.filter(s=>s.hasOwnProperty('en')).map(s=>s.en)
            );

            var rootRepaired = repaired[rootPath('kn/thag/thag21.1')];
            var headRoot = Object.keys(rootRepaired).slice(0,nHead);
            should.deepEqual(headRoot, repairedScidHead);
            should.deepEqual(
                Object.keys(rootRepaired).map(k=>rootRepaired[k]),
                segs.map(s=>s.pli));
                
            done();
        } catch(e) { done(e); }})();
    });
    it("verify() fixes thig16.1", done=>{
        (async function() { try {
            var root = TEST_BILARA;
            var forceRenumber = true;
            var ver = await new Verifier({
                logLevel,
                root,
                forceRenumber,
            }).initialize();
            var res = await ver.verify("thig16.1");
            should(res.mlDocs.length).equal(1);
            var mld0 = res.mlDocs[0];
            var repaired = mld0.repaired;
            var repairedScidHead = [
                'thig16.1:0.1',
                'thig16.1:0.2',
                'thig16.1:0.3',
                'thig16.1:1.1',
                'thig16.1:1.2',
                'thig16.1:1.3',
                'thig16.1:1.4',
                'thig16.1:2.1',
            ];
            var repairedScidTail = [
                'thig16.1:75.4',
                'thig16.1:76.1',
                'thig16.1:76.2',
                'thig16.1:77.0',
                'thig16.1:77.1',
                'thig16.1:77.2',
                'thig16.1:77.3',
                'thig16.1:77.4',
                'thig16.1:77.5',
            ];
            var nHead = repairedScidHead.length;
            var nTail = repairedScidTail.length;
            var segs = mld0.segments();

            var htmlRepaired = repaired[htmlPath('kn/thig/thig16.1')];
            var keysRepaired = Object.keys(htmlRepaired);
            var headRepaired = keysRepaired.slice(0,nHead);
            for (let iRep = 0; iRep < headRepaired.length; iRep++) {
                should(headRepaired[iRep]).equal(repairedScidHead[iRep]);
            }
            var tailRepaired = keysRepaired
                .slice(keysRepaired.length-nTail);
            for (let iRep = 0; iRep < tailRepaired.length; iRep++) {
                should(tailRepaired[iRep]).equal(repairedScidTail[iRep]);
            }
            should.deepEqual(keysRepaired.map(k=>htmlRepaired[k]),
                segs.map(s=>s.html));

            var transRepaired = repaired[
                translationPath('kn/thig/thig16.1','en','sujato')];
            var headTrans = Object.keys(transRepaired).slice(0,nHead);
            should.deepEqual(headTrans, repairedScidHead);
            should.deepEqual(
                Object.keys(transRepaired).map(k=>transRepaired[k]),
                segs.filter(s=>s.hasOwnProperty('en')).map(s=>s.en)
            );

            var rootRepaired = repaired[rootPath('kn/thig/thig16.1')];
            var headRoot = Object.keys(rootRepaired).slice(0,nHead);
            should.deepEqual(headRoot, repairedScidHead);
            should.deepEqual(
                Object.keys(rootRepaired).map(k=>rootRepaired[k]),
                segs.map(s=>s.pli));
                
            done();
        } catch(e) { done(e); }})();
    });
    it("verify() fixes thig1.1", done=>{
        (async function() { try {
            var root = TEST_BILARA;
            var forceRenumber = true;
            var ver = await new Verifier({
                logLevel,
                root,
                forceRenumber,
            }).initialize();
            var res = await ver.verify("thig1.1");
            should(res.mlDocs.length).equal(1);
            var mld0 = res.mlDocs[0];
            var repaired = mld0.repaired;
            var repairedScidHead = [
                'thig1.1:0.1',
                'thig1.1:0.2',
                'thig1.1:0.3',
                'thig1.1:1.0',
                'thig1.1:1.1',
                'thig1.1:1.2',
                'thig1.1:1.3',
                'thig1.1:1.4',
                'thig1.1:2.1',
            ];
            var repairedScidTail = [
                'thig1.1:1.4',
                'thig1.1:2.1',
            ];
            var nHead = repairedScidHead.length;
            var nTail = repairedScidTail.length;
            var segs = mld0.segments();

            var htmlRepaired = repaired[htmlPath('kn/thig/thig1.1')];
            var keysRepaired = Object.keys(htmlRepaired);
            var headRepaired = keysRepaired.slice(0,nHead);
            for (let iRep = 0; iRep < headRepaired.length; iRep++) {
                should(headRepaired[iRep]).equal(repairedScidHead[iRep]);
            }
            var tailRepaired = keysRepaired
                .slice(keysRepaired.length-nTail);
            for (let iRep = 0; iRep < tailRepaired.length; iRep++) {
                should(tailRepaired[iRep]).equal(repairedScidTail[iRep]);
            }
            should.deepEqual(keysRepaired.map(k=>htmlRepaired[k]),
                segs.map(s=>s.html));

            var transRepaired = repaired[
                translationPath('kn/thig/thig1.1','en','sujato')];
            var headTrans = Object.keys(transRepaired).slice(0,nHead);
            should.deepEqual(headTrans, repairedScidHead);
            should.deepEqual(
                Object.keys(transRepaired).map(k=>transRepaired[k]),
                segs.filter(s=>s.hasOwnProperty('en')).map(s=>s.en)
            );

            var rootRepaired = repaired[rootPath('kn/thig/thig1.1')];
            var headRoot = Object.keys(rootRepaired).slice(0,nHead);
            should.deepEqual(headRoot, repairedScidHead);
            should.deepEqual(
                Object.keys(rootRepaired).map(k=>rootRepaired[k]),
                segs.map(s=>s.pli));
                
            done();
        } catch(e) { done(e); }})();
    });
    it("TESTTESTverify() fixes an3.47", done=>{
        (async function() { try {
            var root = TEST_BILARA;
            var forceRenumber = true;
            var ver = await new Verifier({
                logLevel,
                root,
            }).initialize();
            var res = await ver.verify("an3.47");
            should(res.mlDocs.length).equal(1);
            var mld0 = res.mlDocs[0];
            var repaired = mld0.repaired;
            var repairedScidHead = [
                'an3.47:0.1',
                'an3.47:0.2',
                'an3.47:0.3',
                'an3.47:1.1',
                'an3.47:1.2',
                'an3.47:1.3',
                'an3.47:1.4',
                'an3.47:1.5',
                'an3.47:2.0',
                'an3.47:2.1',
            ];
            var repairedScidTail = [
                'an3.47:2.1',
                'an3.47:2.2',
                'an3.47:2.3',
                'an3.47:2.4',
                'an3.47:2.5',
            ];
            var nHead = repairedScidHead.length;
            var nTail = repairedScidTail.length;
            var segs = mld0.segments();

            var htmlRepaired = repaired[htmlPath('an/an3/an3.47')];
            var keysRepaired = Object.keys(htmlRepaired);
            var headRepaired = keysRepaired.slice(0,nHead);
            for (let iRep = 0; iRep < headRepaired.length; iRep++) {
                should(headRepaired[iRep]).equal(repairedScidHead[iRep]);
            }
            var tailRepaired = keysRepaired
                .slice(keysRepaired.length-nTail);
            for (let iRep = 0; iRep < tailRepaired.length; iRep++) {
                should(tailRepaired[iRep]).equal(repairedScidTail[iRep]);
            }
            should.deepEqual(keysRepaired.map(k=>htmlRepaired[k]),
                segs.map(s=>s.html));

            var transRepaired = repaired[
                translationPath('an/an3/an3.47','en','sujato')];
            var headTrans = Object.keys(transRepaired).slice(0,nHead);
            should.deepEqual(headTrans, repairedScidHead);
            should.deepEqual(
                Object.keys(transRepaired).map(k=>transRepaired[k]),
                segs.filter(s=>s.hasOwnProperty('en')).map(s=>s.en)
            );

            var rootRepaired = repaired[rootPath('an/an3/an3.47')];
            var headRoot = Object.keys(rootRepaired).slice(0,nHead);
            should.deepEqual(headRoot, repairedScidHead);
            should.deepEqual(
                Object.keys(rootRepaired).map(k=>rootRepaired[k]),
                segs.map(s=>s.pli));
                
            done();
        } catch(e) { done(e); }})();
    });
})
