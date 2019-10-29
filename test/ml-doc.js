(typeof describe === 'function') && describe("MLDoc", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const {
        FuzzyWordSet,
        SegDoc,
        MLDoc,
    } = require("../index");
    const {
        logger,
    } = require("just-simple").JustSimple;
    const BILARA_PATH = path.join(__dirname, '../local/bilara-data');
    this.timeout(5*1000);
    var logLevel = false;
    var bilaraPaths = [
        "root/pli/ms/an/an1/an1.1-10_root-pli-ms.json",
        "translation/en/sujato/"+
            "an/an1/an1.1-10_translation-en-sujato.json",
        "translation/de/sabbamitta/"+
            "an/an1/an1.1-10_translation-de-sabbamitta.json",
    ];

    it("default ctor", () => {
        should.throws(() => {
            var mld = new MLDoc();
        });
    });
    it("custom ctor", () => {
        var mld = new MLDoc({
            bilaraPaths,
        });
        should.deepEqual(mld.root_text, {
            type: 'root',
            suid: "an1.1-10",
            suttaRef: "an1.1-10/pli/ms",
            lang: 'pli',
            author_uid: 'ms',
            bilaraPath: bilaraPaths[0],
        });
    });
    it("load(...) loads MLDoc", done=>{
        (async function() { try {
            var mld = new MLDoc({
                bilaraPaths,
            });
            var res = await mld.load(BILARA_PATH);
            should(res).equal(mld);
            var segMap = mld.segMap;
            should(segMap['an1.9:1.2']).properties({
pli: 'Purisaraso, bhikkhave, itthiyā cittaṃ pariyādāya tiṭṭhatī”ti. ',
en: 'The taste of a man occupies a woman’s mind.” ', 
de: 'Der Geschmack eines Mannes hält den Geist einer Frau besetzt.“ ',
            });
            should(mld.suid).equal('an1.1-10');
            done();
        } catch(e) { done(e); } })();
    });
    it("root_text(...) => root info", done=>{
        (async function() { try {
            var mld = new MLDoc({
                bilaraPaths,
            });
            var res = await mld.load(BILARA_PATH);
            should.deepEqual(mld.root_text,{
                type: 'root',
                lang: 'pli',
                suttaRef: "an1.1-10/pli/ms",
                author_uid: 'ms',
                bilaraPath: 'root/pli/ms/an/an1/an1.1-10_root-pli-ms.json',
                suid: 'an1.1-10',
            });

            done();
        } catch(e) { done(e); } })();
    });
    it("translations(...) => translations info", done=>{
        (async function() { try {
            var mld = new MLDoc({
                bilaraPaths,
            });
            var res = await mld.load(BILARA_PATH);
            should.deepEqual(mld.translations,[{
                type: 'translation',
                lang: 'en',
                author_uid: 'sujato',
                suttaRef: "an1.1-10/en/sujato",
                bilaraPath: 'translation/en/sujato/'+
                    'an/an1/an1.1-10_translation-en-sujato.json',
                suid: 'an1.1-10',
            },{
                type: 'translation',
                lang: 'de',
                author_uid: 'sabbamitta',
                suttaRef: "an1.1-10/de/sabbamitta",
                bilaraPath: 'translation/de/sabbamitta/'+
                    'an/an1/an1.1-10_translation-de-sabbamitta.json',
                suid: 'an1.1-10',
            }]);

            done();
        } catch(e) { done(e); } })();
    });
    it("languages(...) => language list", done=>{
        (async function() { try {
            var mld = new MLDoc({
                bilaraPaths,
            });
            var res = await mld.load(BILARA_PATH);
            should.deepEqual(mld.languages(),[ 
                'pli', 'en', 'de' ]);

            done();
        } catch(e) { done(e); } })();
    });
    it("filterSegments(...) => language list", done=>{
        (async function() { try {
            var mld = new MLDoc({
                bilaraPaths,
            });
            var res = await mld.load(BILARA_PATH);
            var segments = mld.filterSegments('\\btouch', ['en'])
                .segments();
            should.deepEqual(segments.map(s => s.scid), [
                'an1.5:1.1',
                'an1.5:1.2',
                'an1.10:1.1',
                'an1.10:1.2',
            ]);

            done();
        } catch(e) { done(e); } })();
    });
    it("TESTTESThighlightMatch(...) => colors matches", done=>{
        (async function() { try {
            var mld = new MLDoc({
                bilaraPaths,
            });
            var res = await mld.load(BILARA_PATH);
            mld.filterSegments('\\btouch', ['en']);
            var segments = mld.highlightMatch('\\btouch', "<$&>")
                .segments();
            should(segments[0].scid).equal('an1.5:1.1');
            should(segments[0].en).equal(
                `“Mendicants, I do not see a single <touch> that `+
                `occupies a man’s mind like the <touch> of a woman. `);

            done();
        } catch(e) { done(e); } })();
    });
})
