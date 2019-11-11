(typeof describe === 'function') && describe("MLDoc", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const {
        FuzzyWordSet,
        Pali,
        SegDoc,
        MLDoc,
    } = require("../index");
    const {
        logger,
    } = require("just-simple").JustSimple;
    const BILARA_PATH = path.join(__dirname, '../local/bilara-data');
    this.timeout(5*1000);
    var logLevel = false;
    var bilaraPaths_mn118 = [
        "root/pli/ms/mn/mn118_root-pli-ms.json",
        "translation/en/sujato/"+
            "mn/mn118_translation-en-sujato.json",
    ];

    var bilaraPaths_an1_1_1 = [
        "root/pli/ms/an/an1/an1.1-10_root-pli-ms.json",
        "translation/en/sujato/"+
            "an/an1/an1.1-10_translation-en-sujato.json",
        "translation/de/sabbamitta/"+
            "an/an1/an1.1-10_translation-de-sabbamitta.json",
    ];

    var bilaraPaths_sn12_23 = [
        "root/pli/ms/sn/sn12/sn12.23_root-pli-ms.json",
        "translation/en/sujato/"+
            "sn/sn12/sn12.23_translation-en-sujato.json",
        "translation/de/sabbamitta/"+
            "sn/sn12/sn12.23_translation-de-sabbamitta.json",
    ];

    it("default ctor", () => {
        should.throws(() => {
            var mld = new MLDoc();
        });
    });
    it("custom ctor", () => {
        var mld = new MLDoc({
            bilaraPaths: bilaraPaths_an1_1_1,
        });
        should.deepEqual(mld.root_text, {
            type: 'root',
            suid: "an1.1-10",
            suttaRef: "an1.1-10/pli/ms",
            collection: 'an',
            lang: 'pli',
            author_uid: 'ms',
            bilaraPath: bilaraPaths_an1_1_1[0],
        });

        var mldCopy = new MLDoc(mld);
        should.deepEqual(mldCopy, mld);
    });
    it("load(...) loads MLDoc", done=>{
        (async function() { try {
            var mld = new MLDoc({
                bilaraPaths: bilaraPaths_an1_1_1,
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
                bilaraPaths: bilaraPaths_an1_1_1,
            });
            var res = await mld.load(BILARA_PATH);
            should.deepEqual(mld.root_text,{
                type: 'root',
                lang: 'pli',
                suttaRef: "an1.1-10/pli/ms",
                collection: 'an',
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
                bilaraPaths: bilaraPaths_an1_1_1,
            });
            var res = await mld.load(BILARA_PATH);
            should.deepEqual(mld.translations,[{
                type: 'translation',
                lang: 'en',
                author_uid: 'sujato',
                collection: 'an',
                suttaRef: "an1.1-10/en/sujato",
                bilaraPath: 'translation/en/sujato/'+
                    'an/an1/an1.1-10_translation-en-sujato.json',
                suid: 'an1.1-10',
            },{
                type: 'translation',
                lang: 'de',
                author_uid: 'sabbamitta',
                suttaRef: "an1.1-10/de/sabbamitta",
                collection: 'an',
                bilaraPath: 'translation/de/sabbamitta/'+
                    'an/an1/an1.1-10_translation-de-sabbamitta.json',
                suid: 'an1.1-10',
            }]);

            done();
        } catch(e) { done(e); } })();
    });
    it("TESTTESTmatchText(...) matches segment text", ()=>{
        var mld = new MLDoc({
            bilaraPaths: [],
        });
        var seg = {
            pli: '‘Nandī dukkhassa mūlan’ti—',
        };
        var languages = ['pli'];
        var pattern = 'nandi dukkhassa';
        //var rex = /\b(n|ṅ|ñ|ṇ)(a|ā)(n|ṅ|ñ|ṇ)(d|ḍ)ī (d|ḍ)(u|ū)kkh(a|ā)ss(a|ā)/iu;
        var rex = new RegExp(`\\b${Pali.romanizePattern(pattern)}`, "ui");
        should(mld.matchText({seg, languages, rex})).equal(true);
    });
    it("TESTTESTlangCompare_pli_en(...) => orders languages", ()=>{
        should(MLDoc.langCompare_pli_en('en', 'pli')).equal(1);
        should(MLDoc.langCompare_pli_en('en', 'pt')).equal(-1);
        should(MLDoc.langCompare_pli_en('de', 'pt')).equal(-1);
        should.deepEqual(
            ['de', 'en', 'pt', 'pli'].sort(MLDoc.langCompare_pli_en), 
            ['pli', 'en', 'de', 'pt']);
    });
    it("TESTTESTlanguages(...) => language list", ()=>{
        var mld = new MLDoc({
            bilaraPaths: bilaraPaths_an1_1_1,
        });

        // languages are sorted in source order
        should.deepEqual(mld.languages(), ['pli', 'en', 'de' ]);
    });
    it("TESTTESTlang => target language", () => {
        // default language is translation language (vs. source language)
        var mld = new MLDoc({
            bilaraPaths: bilaraPaths_an1_1_1,
        });
        should(mld.lang).equal('de');

        // custom target language
        var mld = new MLDoc({
            bilaraPaths: bilaraPaths_an1_1_1,
            lang: 'en',
        });
        should(mld.lang).equal('en');
    });
    it("TESTTESTfilterSegments(...) => pali segment", done=>{
        (async function() { try {
            var mld = new MLDoc({
                bilaraPaths: bilaraPaths_mn118,
            });
            var res = await mld.load(BILARA_PATH);
            var pattern = "ānāpānassatisutta";
            mld.filterSegments(pattern, ['pli']);
            var segments = mld.segments();
            should.deepEqual(segments.map(s => s.scid), [
                'mn118:0.2',
                'mn118:42.5',
            ]);

            done();
        } catch(e) { done(e); } })();
    });
    it("filterSegments(...) => single segment", done=>{
        (async function() { try {
            var mld = new MLDoc({
                bilaraPaths: bilaraPaths_an1_1_1,
            });
            var res = await mld.load(BILARA_PATH);
            mld.filterSegments('an1.2:1.2', ['en']);
            var segments = mld.segments();
            should.deepEqual(segments.map(s => s.scid), [
                'an1.2:1.2',
            ]);

            done();
        } catch(e) { done(e); } })();
    });
    it("TESTTESTfilterSegments(...) => major segment", done=>{
        (async function() { try {
            var mld = new MLDoc({
                bilaraPaths: bilaraPaths_sn12_23,
            });
            var res = await mld.load(BILARA_PATH);
            var showMatchesOnly = false;
            mld.filterSegments('sn12.23:8', ['en'], showMatchesOnly);
            var segments = mld.segments();
            should(segments.length).equal(93);
            var matched = segments.filter(s => s.matched);
            should.deepEqual(matched.map(s => s.scid), [
                'sn12.23:8.1',
                'sn12.23:8.2',
            ]);

            done();
        } catch(e) { done(e); } })();
    });
    it("filterSegments(...) => single sutta", done=>{
        (async function() { try {
            var mld = new MLDoc({
                bilaraPaths: bilaraPaths_an1_1_1,
            });
            var res = await mld.load(BILARA_PATH);
            mld.filterSegments('an1.2', ['en']);
            var segments = mld.segments();
            should(segments.length).equal(4);
            should.deepEqual(segments.map(s => s.scid), [
                'an1.2:0.1',
                'an1.2:1.1',
                'an1.2:1.2',
                'an1.2:1.3',
            ]);

            done();
        } catch(e) { done(e); } })();
    });
    it("filterSegments(...) => sutta id with spaces", done=>{
        (async function() { try {
            var mld = new MLDoc({
                bilaraPaths: bilaraPaths_an1_1_1,
            });
            var res = await mld.load(BILARA_PATH);
            mld.filterSegments('an 1.2', ['en']);
            var segments = mld.segments();
            should(segments.length).equal(4);
            should.deepEqual(segments.map(s => s.scid), [
                'an1.2:0.1',
                'an1.2:1.1',
                'an1.2:1.2',
                'an1.2:1.3',
            ]);

            done();
        } catch(e) { done(e); } })();
    });
    it("filterSegments(...) => language list", done=>{
        (async function() { try {
            var mld = new MLDoc({
                bilaraPaths: bilaraPaths_an1_1_1,
            });
            var res = await mld.load(BILARA_PATH);
            mld.filterSegments('\\btouch', ['en']);
            var segments = mld.segments();
            should.deepEqual(segments.map(s => s.scid), [
                'an1.5:1.1',
                'an1.5:1.2',
                'an1.10:1.1',
                'an1.10:1.2',
            ]);

            done();
        } catch(e) { done(e); } })();
    });
    it("highlightMatch(...) => colors matches", done=>{
        (async function() { try {
            var mld = new MLDoc({
                bilaraPaths: bilaraPaths_an1_1_1,
            });
            var res = await mld.load(BILARA_PATH);
            mld.filterSegments('\\btouch', ['en']);
            mld.highlightMatch('\\btouch', "<$&>");
            var segments = mld.segments();
            should(segments[0].scid).equal('an1.5:1.1');
            should(segments[0].en).equal(
                `“Mendicants, I do not see a single <touch> that `+
                `occupies a man’s mind like the <touch> of a woman. `);

            done();
        } catch(e) { done(e); } })();
    });
})
