(typeof describe === 'function') && describe("ml-doc", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const {
        FuzzyWordSet,
        Pali,
        SegDoc,
        MLDoc,
        BilaraData,
    } = require("../index");
    const { BilaraPath } = require("scv-esm");
    const MS_AUTHOR = 'The M.L. Maniratana Bunnag Dhamma Society Fund';
    this.timeout(5*1000);
    var logLevel = false;
    var bd = new BilaraData();
    const BILARA_PATH = path.join(__dirname, '../test/data/bilara-data');
    var {
        htmlPath,
        variantPath,
        referencePath,
        commentPath,
        translationPath,
        rootPath,
    } = BilaraPath;

    var bilaraPaths_thig1_1_soma = [
      rootPath('kn/thig/thig1.1'),
      translationPath('kn/thig/thig1.1', 'en', 'soma'),
    ];

    var bilaraPaths_thig1_2_soma = [
      rootPath('kn/thig/thig1.2'),
      translationPath('kn/thig/thig1.2', 'en', 'soma'),
    ];

    var bilaraPaths_sn1_1 = [
        variantPath('sn/sn1/sn1.1'),
        htmlPath('sn/sn1/sn1.1'),
        rootPath('sn/sn1/sn1.1'),
        referencePath('sn/sn1/sn1.1'),
        commentPath('sn/sn1/sn1.1','en','sujato'),
        translationPath('sn/sn1/sn1.1','en','sujato'),
        translationPath('sn/sn1/sn1.1','de','sabbamitta'),
    ];

    var bilaraPaths_sn10_8 = [
        rootPath('sn/sn10/sn10.8'),
        translationPath('sn/sn10/sn10.8','en','sujato'),
    ];

    var bilaraPaths_mn118 = [
        rootPath('mn/mn118'),
        translationPath('mn/mn118','en','sujato'),
    ];

    var bilaraPaths_an1_1_1 = [
        rootPath('an/an1/an1.1-10'),
        translationPath('an/an1/an1.1-10','en','sujato'),
        translationPath('an/an1/an1.1-10','de','sabbamitta'),
    ];

    var bilaraPaths_sn12_23 = [
        rootPath('sn/sn12/sn12.23'),
        translationPath('sn/sn12/sn12.23','en','sujato'),
        translationPath('sn/sn12/sn12.23', 'de', 'sabbamitta'),
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
            category: 'sutta',
            collection: 'an',
            lang: 'pli',
            author_uid: 'ms',
            bilaraPath: bilaraPaths_an1_1_1[0],
        });

        var mldCopy = new MLDoc(mld);
        should.deepEqual(mldCopy, mld);
    });
    it("load(...) loads MLDoc", async()=>{
        var mld = new MLDoc({
            bilaraPaths: bilaraPaths_an1_1_1,
        });
        var res = await mld.load(BILARA_PATH);
        should(res).equal(mld);
        should(mld.title).equal('Nummerierte Lehrreden 1\n1. Bilder usw.\n1');
        var segMap = mld.segMap;
        should(segMap['an1.9:1.2']).properties({
pli: 'Purisaraso, bhikkhave, itthiyā cittaṃ pariyādāya tiṭṭhatī”ti. ',
en: 'The taste of a man occupies a woman’s mind.” ', 
de: 'Der Geschmack eines Mannes hält den Geist einer Frau gefangen.“ ',
        });
        should(mld.suid).equal('an1.1-10');
    });
    it("load(...) loads markup", async()=>{
        var mld = new MLDoc({
            bilaraPaths: bilaraPaths_sn1_1,
        });
        var res = await mld.load();
        should(res).equal(mld);
        var segMap = mld.segMap;
        let seg01 = segMap['sn1.1:0.1'];
        should(seg01.scid).match('sn1\.1:0\.1');
        should(seg01.pli).match(/Saṁyutta Nikāya 1.1/);
        should(seg01.en).match(/Linked Discourses 1.1/);
        should(seg01.html)
          .match(/article id='sn1.1'><header><ul><li class='division'>{}<\/li>/);

        should(segMap["sn1.1:1.1"].reference).equal([
            "bj13.2, cck15.1, csp1ed12.1, csp2ed12.1, dr15.1",
            "ms12S1_2, msdiv1, ndp12.3, pts-vp-pli1ed1.1",
            "pts-vp-pli2ed1.1, pts-vp-pli2ed1.2",
            "sya15.1, sya15.2, vri23.1",
            "vri23.2",
        ].join(", "));
        should(segMap["sn1.1:1.8"].variant)
            .match(/nibbuyhāmi → nivuyhāmi \(sya-all, km, mr\)/);
        should(mld.suid).equal('sn1.1');
        should(mld.title).equal([
          'Verbundene Lehrreden 1.1',
          '1. Das Kapitel über ein Schilfrohr',
          'Die Flut überqueren'].join('\n'));
    });
    it("titles(...) => segment 0 text", done=>{
        (async function() { try {
            var mld = new MLDoc({
                bilaraPaths: bilaraPaths_an1_1_1,
            });
            var res = await mld.load(BILARA_PATH);
            should.deepEqual(mld.titles(),[
                `Nummerierte Lehrreden 1`,
                `1. Bilder usw.`,
                `1`,
            ]);
            should.deepEqual(mld.titles('en'),[
                `Numbered Discourses 1`,
                `1. Sights, Etc.`,
                `1`,
            ]);
            should.deepEqual(mld.titles('pli'),[
                `Aṅguttara Nikāya 1`,
                `1. Rūpādivagga`,
                `1`,
            ]);

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
                category: 'sutta',
                collection: 'an',
                author_uid: 'ms',
                bilaraPath: rootPath('an/an1/an1.1-10'),
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
                category: 'sutta',
                collection: 'an',
                suttaRef: "an1.1-10/en/sujato",
                bilaraPath: translationPath('an/an1/an1.1-10','en','sujato'),
                suid: 'an1.1-10',
            },{
                type: 'translation',
                lang: 'de',
                author_uid: 'sabbamitta',
                suttaRef: "an1.1-10/de/sabbamitta",
                category: 'sutta',
                collection: 'an',
                bilaraPath: translationPath('an/an1/an1.1-10', 
                    'de', 'sabbamitta'),
                suid: 'an1.1-10',
            }]);

            done();
        } catch(e) { done(e); } })();
    });
    it("matchText(...) matches segment text", ()=>{
        var mld = new MLDoc({
            bilaraPaths: [],
        });
        var seg = {
            pli: '‘Nandī dukkhassa mūlan’ti—',
        };
        var languages = ['pli'];
        var pattern = 'nandi dukkhassa';
        var rexList = [
            new RegExp(`\\b${Pali.romanizePattern(pattern)}`, "ui"),
        ];
        should(mld.matchText({seg, languages, rexList})).equal(true);
    });
    it("langCompare_pli_en(...) => orders languages", ()=>{
        should(MLDoc.langCompare_pli_en('en', 'pli')).equal(1);
        should(MLDoc.langCompare_pli_en('en', 'pt')).equal(-1);
        should(MLDoc.langCompare_pli_en('de', 'pt')).equal(-1);
        should.deepEqual(
            ['de', 'en', 'pt', 'pli'].sort(MLDoc.langCompare_pli_en), 
            ['pli', 'en', 'de', 'pt']);
    });
    it("bilaraPathLanguages(...) => language list", ()=>{
        let bilaraPaths = bilaraPaths_an1_1_1;

        // languages are sorted in source order
        should.deepEqual(MLDoc.bilaraPathLanguages(bilaraPaths), 
          ['pli', 'en', 'de' ]);
    });
    it("lang => target language", () => {
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
    it("filterSegments(...) => the dark light", async()=>{
      var mld = new MLDoc({ bilaraPaths: bilaraPaths_sn10_8, });
      var resLoad = await mld.load(BILARA_PATH);
      var pattern = "the dark light";
      var resultPattern = "\b(t|ṭ)he|\bdark|\blight";
      let resFilter = mld.filterSegments({
        pattern, 
        resultPattern,
        languages: ['pli','en'],
      });
      should(resFilter).properties({
        matched: 4,
        matchLow: '\b(t|ṭ)he|\bdark|\blight',
        matchHigh: '\b(t|ṭ)he|\bdark|\blight',
        matchScid: false,
        suid: 'sn10.8',
        score: 4.065,
      });
      var segments = mld.segments();
      should.deepEqual(segments.map(s => s.scid), [
        'sn10.8:1.11',
        'sn10.8:4.1',
        'sn10.8:7.1',
        'sn10.8:10.1',
      ]);
    });
    it("filterSegments(...) => thig1.1, thig1.2 soma", async()=>{
      var pattern = "thig1.1/en/soma, thig1.2/en/soma";

      var mld1 = new MLDoc({ bilaraPaths: bilaraPaths_thig1_1_soma });
      await mld1.load(BILARA_PATH);
      mld1.filterSegments(pattern, ['pli', 'en']);
      var segments1 = mld1.segments();
      should(segments1.length).equal(9);
      segments1.forEach(seg=>should(seg.scid).match(/^thig1.1:/));

      var mld2 = new MLDoc({ bilaraPaths: bilaraPaths_thig1_2_soma });
      await mld2.load(BILARA_PATH);
      mld2.filterSegments(pattern, ['pli', 'en']);
      var segments2 = mld2.segments();
      should(segments2.length).equal(8);
      segments2.forEach(seg=>should(seg.scid).match(/^thig1.2:/));
    });
    it("filterSegments(...) => pali segment", async()=>{
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
    it("filterSegments(...) => major segment", done=>{
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
    it("filterSegments(...) => sutta id with spaces", async()=>{
      var mld = new MLDoc({ bilaraPaths: bilaraPaths_an1_1_1, });
      var resLoad = await mld.load(BILARA_PATH)
      let resFilter = mld.filterSegments('an 1.2', ['en']);
      var segments = mld.segments();
      should(segments.length).equal(4);
      should.deepEqual(segments.map(s => s.scid), [
          'an1.2:0.1',
          'an1.2:1.1',
          'an1.2:1.2',
          'an1.2:1.3',
      ]);
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
    it("filterSegments(...) => scores abhisambuddha", async()=>{
        var bilaraPaths = [
            rootPath('an/an5/an5.196'),
        ]
        var mld = new MLDoc({
            bilaraPaths,
        });
        var res = await mld.load(BILARA_PATH);
        var pattern = "abhisambuddha";
        var resultPattern = 
            '\\b(a|ā)bh(i|ī)s(a|ā)(m|ṁ|ṃ)b(u|ū)(d|ḍ)(d|ḍ)h(a|ā)';
        var res = await mld.filterSegments({
            pattern, 
            resultPattern,
            languages: ['pli'],
        });
        var re = '\\b(a|ā)bh(i|ī)s(a|ā)(m|ṁ|ṃ)b(u|ū)(d|ḍ)(d|ḍ)h(a|ā)';
        should(res).properties({
            matchLow: re,
            matchHigh: re,
            rexList: [
                /(?<=[\s,.:;"'`‘„“‚]|^)abhisambuddha/iu,
            ],
            score: 1.031,
        });
    });
    it("hyphenate(lang) => handles MN142", done=>{
        (async function() { try {
            var bilaraPaths = [
                rootPath('mn/mn142'),
            ]
            var mld = new MLDoc({
                bilaraPaths,
            });
            var res = await mld.load(BILARA_PATH);
            var seg4_2 = mld.segMap["mn142:4.3"];
            should(seg4_2).properties({
                pli: "abhivādanapaccuṭṭhānaañjalikammasāmīci"+
                    "kammacīvarapiṇḍapātasenāsanagilānappa"+
                    "ccayabhesajjaparikkhārānuppadānena. ",
            });
            mld.hyphenate();
            should.deepEqual(seg4_2.pli.split('\u00ad'), [
                `abhivā`,
                `danapac`,
                `cuṭṭhā`,
                `naañjali`,
                `kamma`,
                `sāmīci`,
                `kamma`,
                `cīvara`,
                `piṇḍa`,
                `pātasenā`,
                `sanagilā`,
                `nappacca`,
                `yabhesajja`,
                `parik`,
                `khārānup`,
                `padā`,
                `nena. `,
            ]);

            done();
        } catch(e) { done(e); } })();
    });
    it("load(...) loads tri-lingual", async()=>{
      let mldOpts = {            
        lang: 'de',
        author_uid: 'ms',
        sutta_uid: 'sn42.11',
        bilaraPaths: [                                  
          'root/pli/ms/sutta/sn/sn42/sn42.11_root-pli-ms.json',
          'translation/de/sabbamitta/sutta/sn/sn42/sn42.11_translation-de-sabbamitta.json',
          'translation/en/sujato/sutta/sn/sn42/sn42.11_translation-en-sujato.json',
        ]                        
      }
      var mld = new MLDoc(mldOpts);
      var res = await mld.load(BILARA_PATH);
      should(res).equal(mld);
      let keys = Object.keys(mld).filter(k=>k !== 'segments' && k !== 'segMap').sort();
      let mldMeta = Object.assign({}, mld);
      delete mldMeta.segMap;
      should.deepEqual(mldMeta, Object.assign({
        author: 'The M.L. Maniratana Bunnag Dhamma Society Fund',
        category: 'sutta',
        hyphen: '\u00ad',
        footer: MLDoc.SC_FOOTER,
        langSegs: { de:54, en:54, pli:55 },
        maxWord: 30,
        minWord: 5,
        score: 0,
        segsMatched: undefined,
        title: 'Verbundene Lehrreden 42\n1. Ortsvorsteher\n11. Mit Bhadraka',
        type: 'translation',
      }, mldOpts));
      var segMap = mld.segMap;
      let seg1_2 = segMap['sn42.11:1.2'];
      should(seg1_2.pli).match(/Atha kho bhadrako gāmaṇi yena bhagavā/);
      should(seg1_2.de).match(/Da ging der Ortsvorsteher Bhadraka zum Buddha/);
      should(seg1_2.en).match(/Then Bhadraka the village chief went up to the Buddha/);
    });
    it("load(...) loads thig1.1 sujato/soma", async()=>{
      let mldOpts = {            
        lang: 'en',
        author_uid: 'ms',
        sutta_uid: 'thig1.1',
        bilaraPaths: [                                  
          'root/pli/ms/sutta/kn/thig/thig1.1_root-pli-ms.json',
          'translation/en/sujato/sutta/kn/thig/thig1.1_translation-en-sujato.json',
          'translation/en/soma/sutta/kn/thig/thig1.1_translation-en-soma.json',
        ]                        
      }
      var mld = new MLDoc(mldOpts);
      0 && (mld.logLevel = 'debug');
      var res = await mld.load(BILARA_PATH);
      should(res).equal(mld);
      let keys = Object.keys(mld).filter(k=>k !== 'segments' && k !== 'segMap').sort();
      let mldMeta = Object.assign({}, mld);
      delete mldMeta.segMap;
      should.deepEqual(mldMeta, Object.assign({
        author: MS_AUTHOR,
        category: 'sutta',
        footer: MLDoc.SC_FOOTER,
        hyphen: '\u00ad',
        langSegs: { en:9, pli:9 },
        maxWord: 30,
        minWord: 5,
        score: 0,
        segsMatched: undefined,
        title: 'Verses of the Senior Nuns\nThe Book of the Ones\nAn Unnamed Nun (1st)',
        type: 'translation',
      }, mldOpts));
      var segMap = mld.segMap;
      let seg1_1 = segMap['thig1.1:1.1'];
      should(seg1_1.pli).match(/Sukhaṁ supāhi therike/);
      should(seg1_1.en).match(/Sleep softly, little nun/);
    });
})
