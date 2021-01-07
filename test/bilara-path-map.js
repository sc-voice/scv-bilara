(typeof describe === 'function') && describe("bilara-path-map", function() {
    const should = require("should");
    const {
        BilaraData,
        BilaraPath,
        BilaraPathMap,
    } = require("../index");
    var {
        commentPath,
        referencePath,
        translationPath,
        rootPath,
        htmlPath,
    } = BilaraPath;
    this.timeout(5*1000);
    function ROOTPATH(mid,category='sutta') {
        var lang = 'pli';
        var auth = 'ms';
        return [
            'root',
            lang,
            `${auth}/${category}`,
            `${mid}_root-${lang}-${auth}.json`
        ].join('/');
    }

    function TRANSPATH(lang,auth,mid, category='sutta') {
        return [
            'translation',
            lang,
            `${auth}/${category}`,
            `${mid}_translation-${lang}-${auth}.json`
        ].join('/');
    }


    var bd = new BilaraData;

    it("default ctor",async()=>{
        var bpm = new BilaraPathMap();
        should(bpm.initialized).equal(false);
    });
    it("suidPath(suid) => local bilara paths", async()=>{
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
"comment/de/sabbamitta": commentPath('dn/dn33', 'de','sabbamitta'),
"comment/en/sujato": commentPath('dn/dn33', 'en','sujato'),
"translation/en/sujato": translationPath('dn/dn33','en','sujato'),
"translation/my/my-team": translationPath('dn/dn33','my','my-team'),
//"translation/ru/team": translationPath('dn/dn33','ru','team'),
"translation/de/sabbamitta": translationPath('dn/dn33','de','sabbamitta'),
        });
    });
    it("bilaraPaths(suid) returns local bilara paths",async()=>{
        var bpm = await new BilaraPathMap().initialize();

        var bps = bpm.bilaraPaths({
            suid: "thag1.113",
            types: BilaraPathMap.ALL_TYPES,
        });
        should.deepEqual(bps.map(bp=>bp.bilaraPath).sort(), [
            htmlPath('kn/thag/thag1.113'),
            referencePath('kn/thag/thag1.113'),
            rootPath('kn/thag/thag1.113'),
            translationPath('kn/thag/thag1.113','en','sujato'),
        ]);

        var bps = bpm.bilaraPaths({
            suid: "an1.1-10",
            lang: ['en','de'],
            types: BilaraPathMap.ALL_TYPES,
        });
        should.deepEqual(bps.map(bp=>bp.bilaraPath).sort(), [
            commentPath('an/an1/an1.1-10','de','sabbamitta'),
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
            commentPath('an/an1/an1.1-10','de','sabbamitta'),
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
            commentPath('an/an1/an1.1-10','de','sabbamitta'),
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
    });
    it("bilaraPaths(suid) ignores stub translations",async()=>{
        var bpm = await new BilaraPathMap().initialize();

        var bps = bpm.bilaraPaths({
            lang: ['pli', 'en', 'de'],
            suid: "mn1",
            types: ['root', 'translation'],
        });
        should.deepEqual(bps.map(bp=>bp.bilaraPath).sort(), [
            rootPath('mn/mn1'),
            translationPath('mn/mn1','en','sujato'),
        ]);
    });
    it("suidLanguages(suid) => language info",async()=>{
        var bpm = await new BilaraPathMap().initialize();
        should.deepEqual(bpm.suidLanguages('thig3.8'),[{
            author: 'ms',
            bilaraPath: 'root/pli/ms/sutta/kn/thig/thig3.8_root-pli-ms.json',
            category: 'sutta',
            lang: 'pli',
            nikaya: 'kn',
            suid: 'thig3.8',
        },{
            author: 'sabbamitta',
            bilaraPath: TRANSPATH('de','sabbamitta','thig3.8','sutta/kn/thig'),
            category: 'sutta',
            lang: 'de',
            nikaya: 'kn',
            suid: 'thig3.8',
        },{
            author: 'sujato',
            bilaraPath: TRANSPATH('en','sujato','thig3.8','sutta/kn/thig'),
            category: 'sutta',
            lang: 'en',
            nikaya: 'kn',
            suid: 'thig3.8',
        }]);
    });
    it("buildSuidMap() => [ suid ]", async()=>{
        let bpm = await new BilaraPathMap().initialize();
        let suidMap = await bpm.buildSuidMap();
        let suids = Object.keys(suidMap);

        should(suids.length).above(6180);
        should.deepEqual(Object.keys(suidMap.iti42),[
            'translation/en/sujato',
            'root/pli/ms',
            'html/pli/ms',
            'reference/pli/ms',
            'variant/pli/ms',
        ]);
    });
})
