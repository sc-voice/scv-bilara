(typeof describe === 'function') && describe("bilara-path-map", function() {
    const should = require("should");
    const {
        BilaraData,
        BilaraPath,
        BilaraPathMap,
    } = require("../index");
    var {
        commentPath,
        translationPath,
        rootPath,
        htmlPath,
    } = BilaraPath;
    this.timeout(5*1000);

    var bd = new BilaraData;

    it("default ctor",done=>{
        (async function() { try {
            var bpm = new BilaraPathMap();
            should(bpm.initialized).equal(false);
            done();
        } catch(e) {done(e);} })();
    });
    it("suidPath(suid) returns local bilara paths",done=>{
        (async function() { try {
            var bpm = new BilaraPathMap()
            should.throws(()=>{bpm.suidPaths('dn33');});
            await bpm.initialize();

            // must be initialized
            should(bpm.initialized).equal(true);
            should.deepEqual(bpm.suidPaths('dn33'), {
"html/pli/ms": htmlPath("dn/dn33"),
"reference/pli/ms": "reference/pli/ms/sutta/dn/dn33_reference.json",
"root/pli/ms": "root/pli/ms/sutta/dn/dn33_root-pli-ms.json",
"variant/pli/ms": "variant/pli/ms/sutta/dn/dn33_variant-pli-ms.json",
"comment/en/sujato": commentPath('dn/dn33', 'en','sujato'),
"translation/en/sujato": translationPath('dn/dn33','en','sujato'),
"translation/de/sabbamitta": translationPath('dn/dn33','de','sabbamitta'),
            });
            done();
        } catch(e) {done(e);} })();
    });
    it("bilaraPaths(suid) returns local bilara paths",done=>{
        (async function() { try {
            var bpm = await new BilaraPathMap().initialize();

            var bps = bpm.bilaraPaths({
                suid: "thag1.113",
                types: BilaraPathMap.ALL_TYPES,
            });
            should.deepEqual(bps.map(bp=>bp.bilaraPath).sort(), [
                htmlPath('kn/thag/thag1.113'),
                rootPath('kn/thag/thag1.113'),
                translationPath('kn/thag/thag1.113','en','sujato'),
            ]);

            var bps = bpm.bilaraPaths({
                suid: "an1.1-10",
                lang: ['en','de'],
                types: BilaraPathMap.ALL_TYPES,
            });
            should.deepEqual(bps.map(bp=>bp.bilaraPath).sort(), [
                commentPath('an/an1/an1.1-10','en','sujato'),
                translationPath('an/an1/an1.1-10','de','sabbamitta'),
                translationPath('an/an1/an1.1-10','en','sujato'),
            ]);

            var bps = bpm.bilaraPaths({
                suid: "an1.1-10",
                lang: 'de',
                types: BilaraPathMap.ALL_TYPES,
            });
            should.deepEqual(bps.map(bp=>bp.bilaraPath).sort(), [
                translationPath('an/an1/an1.1-10','de','sabbamitta'),
            ]);

            var bps = bpm.bilaraPaths({
                suid: "an1.1-10",
                lang: 'en',
                types: BilaraPathMap.ALL_TYPES,
            });
            should.deepEqual(bps.map(bp=>bp.bilaraPath), [
                translationPath('an/an1/an1.1-10','en','sujato'),
                commentPath('an/an1/an1.1-10','en','sujato'),
            ]);

            var bps = bpm.bilaraPaths({
                suid: "an1.1-10",
                lang: 'de',
                types: BilaraPathMap.ALL_TYPES,
            });
            should.deepEqual(bps.map(bp=>bp.bilaraPath), [
                translationPath('an/an1/an1.1-10','de','sabbamitta'),
            ]);

            var bps = bpm.bilaraPaths({
                suid: "an1.1-10",
                author: 'sujato',
                types: BilaraPathMap.ALL_TYPES,
            });
            should.deepEqual(bps.map(bp=>bp.bilaraPath), [
                translationPath('an/an1/an1.1-10','en','sujato'),
                commentPath('an/an1/an1.1-10','en','sujato'),
            ]);
            done();
        } catch(e) {done(e);} })();
    });
})
