(typeof describe === 'function') && describe("seeker", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        BilaraData,
        BilaraPath,
        BilaraPathMap,
        MLDoc,
        Pali,
        English,
        FuzzyWordSet,
        Seeker,
        Unicode,
    } = require("../index");
    const { logger, LogInstance } = require('log-instance');
    logger.logLevel = 'warn';
    const { Files } = require('memo-again');
    const SEEKEROPTS = {
    };
    var {
        translationPath,
        rootPath,
    } = BilaraPath;
    this.timeout(20*1000);
    var bd = new BilaraData(); 
    logger.level = 'warn';
    var en_suj = `translation/en/sujato/sutta/`;
    var en_bra = `translation/en/brahmali/vinaya/`;
    var de_sab = `translation/de/sabbamitta/sutta/`;
    var my_my = `translation/my/my-team/sutta/`;
    var pli_ms = `root/pli/ms/sutta/`;

    const BILARA_PATH = path.join(Files.LOCAL_DIR, 'bilara-data');
    const TEST_BILARA_PATH = path.join(__dirname, 'data', 'bilara-data');
    const SUTTA_ROOT_SUFF = [
        `${en_suj}sn/sn42/sn42.11_translation-en-sujato.json:5`,
        `${en_suj}mn/mn105_translation-en-sujato.json:3`,
        `${en_suj}mn/mn1_translation-en-sujato.json:2`,
        `${en_suj}sn/sn56/sn56.21_translation-en-sujato.json:1`,
        `${en_suj}mn/mn66_translation-en-sujato.json:1`,
        `${en_suj}mn/mn116_translation-en-sujato.json:1`,
        `${en_suj}dn/dn16_translation-en-sujato.json:1`,
    ];
    const VINAYA_ROOT_SUFF = [
        `${en_bra}pli-tv-kd/pli-tv-kd6_translation-en-brahmali.json:1`,
    ];

    it("default ctor", ()=>{
        var skr = new Seeker();
        should(skr).properties({
            lang: 'en',
            root: BILARA_PATH,
            paliWords: undefined,
        });
        should(skr.logger).equal(logger);
    });
    it("custom ctor", ()=>{
        var logger = new LogInstance();
        var lang = 'de';
        var writeFile = false;
        var paliWords = new FuzzyWordSet();
        var skr = new Seeker({
            root: '/tmp/test',
            logger,
            lang,
            paliWords,
            writeFile,
        });
        should(skr.root).equal('/tmp/test');
        should(skr.logger).equal(logger);
        should(skr).properties({
            lang,
        });
        should(skr.paliWords).instanceOf(FuzzyWordSet);
        should(skr.memoizer.cache.writeFile).equal(writeFile);
    });
    it("grepAllow/Deny matches file names", ()=>{
        var reAllow = new RegExp("^[^/]+/sutta/(an|sn|mn|kn|dn)/","iu");
        var reDeny = new RegExp("/(dhp)/","iu");
        var fn = 'sujato/sutta/sn/sn42/'+
            'sn42.11_translation-en-sujato.json:5';
        should(reAllow.test(fn)).equal(true);
        should(reDeny.test(fn)).equal(false);
    });
    it("grep(...) finds en things", async()=>{
        var skr = new Seeker(SEEKEROPTS);
        var ms0 = Date.now();
        await skr.clearMemo('grep');
        var res = await skr.grep({
            pattern: "root of suffering",
        });
        should.deepEqual(res, [...SUTTA_ROOT_SUFF, ...VINAYA_ROOT_SUFF]); 
        var ms1 = Date.now();
        var res2 = await skr.grep({ pattern: "root of suffering", });
        var ms2 = Date.now();
        should.deepEqual(res2, res);

        //console.log(`dbg grep`, ms1-ms0, ms2-ms1);
        should(ms2-ms1).below(15);
    });
    it("grep(...) finds maxResults things", async()=>{
        var skr = new Seeker(SEEKEROPTS);
        var res = await skr.grep({
            pattern: "root of suffering",
            maxResults: 3,
        });
        should.deepEqual(res, SUTTA_ROOT_SUFF.slice(0,3));
    });
    it("grep(...) filters result files", async()=>{
        var skr = new Seeker(SEEKEROPTS);
        var res = await skr.grep({
            pattern: "a single day",
            tipitakaCategories: "su",
        });
        should.deepEqual(res, [
            `${en_suj}kn/dhp/dhp100-115_translation-en-sujato.json:6`,
            `${en_suj}dn/dn9_translation-en-sujato.json:1`,
            `${en_suj}an/an10/an10.46_translation-en-sujato.json:1`
        ]);
    });
    it("TESTTESTgrep(...) finds de things", async()=>{
        var skr = new Seeker(SEEKEROPTS);
        var maxResults = 5;

        // diacritical word boundary
        var res = await skr.grep({
            pattern: "übung",
            lang: 'de',
            maxResults,
        });
        should.deepEqual(res.slice(0,4), [
            `${de_sab}dn/dn33_translation-de-sabbamitta.json:39`,
            `${de_sab}an/an4/an4.198_translation-de-sabbamitta.json:21`,
            `${de_sab}dn/dn34_translation-de-sabbamitta.json:19`,
            `${de_sab}an/an6/an6.30_translation-de-sabbamitta.json:15`,
        ]);
        should(res.length).below(6);

        var res = await skr.grep({
            pattern: "wie der geist",
            lang: 'de',
        });
        should.deepEqual(res, [
            `${de_sab}an/an1/an1.31-40_translation-de-sabbamitta.json:10`,
            `${de_sab}an/an1/an1.21-30_translation-de-sabbamitta.json:10`,
            `${de_sab}an/an3/an3.61_translation-de-sabbamitta.json:3`,
            `${de_sab}an/an1/an1.41-50_translation-de-sabbamitta.json:2`,
        ]);
    });
    it("sanitizePattern(...) code injection guard", ()=>{
        var testPattern = (pattern,expected) => {
            should(Seeker.sanitizePattern(pattern)).equal(expected);
        }
        testPattern('"doublequote"', '.doublequote.');
        testPattern("'singlequote'", '.singlequote.');
        testPattern("a$b", 'a$b');
        testPattern("a.b", 'a.b');
        testPattern("a.*b", 'a.*b');
        testPattern("a\\'b", 'a\\.b');
        testPattern("a\u0000b", 'ab');
        testPattern("a\u0001b", 'ab');
        testPattern("a\u007Fb", 'ab');
        testPattern("sattānaṃ", "sattānaṃ");
        should.throws(() => SuttaStore.sanitizePattern("not [good"));
    });
    it("normalizePattern(...) code injection guard", ()=>{
        var testPattern = (pattern,expected) => {
            should(Seeker.normalizePattern(pattern)).equal(expected);
        }
        testPattern('root of suffering', 'root of suffering');
        testPattern(' root  of  suffering ', 'root of suffering');
        testPattern("a\nb\n\r\n\rc", 'a b c');
        testPattern("a\tb\t\t\rc", 'a b c');
        testPattern("a$b", 'a$b');
        testPattern("a.b", 'a.b');
        testPattern("a.*b", 'a.*b');
        testPattern("a.+b", 'a.+b');
        testPattern("sattānaṃ", "sattānaṃ");
    });
    it("keywordPattern(...) returns grep pattern", done=> {
        (async function() { try {
            var skr = await new Seeker(SEEKEROPTS).initialize();
            should(skr.keywordPattern('anathapindika', 'en')).equal(
                '\\b(a|ā)(n|ṅ|ñ|ṇ)(a|ā)(t|ṭ)h(a|ā)p'+
                        '(i|ī)(n|ṅ|ñ|ṇ)(d|ḍ)(i|ī)k(a|ā)');
            should(skr.keywordPattern('anathapindika', 'pli')).equal(
                '\\b(a|ā)(n|ṅ|ñ|ṇ)(a|ā)(t|ṭ)h(a|ā)p'+
                        '(i|ī)(n|ṅ|ñ|ṇ)(d|ḍ)(i|ī)k(a|ā)');
            done();
        } catch(e) { done(e); } })();
    });
    it("keywordSearch(...) limits results", async()=>{
        var lang = 'en';
        var pattern = Seeker.normalizePattern('suffering joy faith');
        var maxResults = 3;
        var skr = await new Seeker({
            maxResults,
            lang,
        }).initialize(`dbg 1`);
        var expected = {
            method: "keywords",
            lang: 'en',
        };

        var data = await skr.keywordSearch({ 
            pattern,
            // maxResults taken from Seeker.maxResults
        });
        should(data).properties(expected);

        skr.maxResults = 100; // keywordSearch will override
        should(skr.maxResults).equal(100);
        var data = await skr.keywordSearch({ 
            pattern,
            maxResults, // explicit specification
        });
        should(data).properties(expected);
        should.deepEqual(data.lines, [ 
            `${en_suj}dn/dn34_translation-en-sujato.json:5`,
            `${en_suj}dn/dn33_translation-en-sujato.json:4`,
            `${en_suj}sn/sn12/sn12.23_translation-en-sujato.json:4`,
        ]);
    });
    it("keywordSearch(...) searches English", async()=>{
        var pattern = Seeker.normalizePattern('suffering joy faith');
        var skr = await new Seeker({
            lang: 'de', // Deutsch
        }).initialize(`dbg 2`);
        var data = await skr.keywordSearch({ 
            pattern,
            lang: 'en', // overrides Seeker default lang
        });
        var enExpected = {
            lang: 'en',
            method: 'keywords',
        };
        should(data).properties(enExpected);
        should.deepEqual(data.lines.slice(0,4), [
            `${en_suj}dn/dn34_translation-en-sujato.json:5`,
            `${en_suj}dn/dn33_translation-en-sujato.json:4`,
            `${en_suj}sn/sn12/sn12.23_translation-en-sujato.json:4`,
            `${en_suj}dn/dn10_translation-en-sujato.json:2`,
        ]);

        // Using Seeker default lang still returns English
        var data = await skr.keywordSearch({ 
            pattern,
        });
        should(data).properties(enExpected);

        // Change Seeker default language to English
        skr.lang = 'en'; // Not advisable for multiple users
        should(skr.lang).equal('en');
        var data = await skr.keywordSearch({ 
            pattern,
        });
        should(data).properties(enExpected);
    });
    it("keywordSearch(...) searches Pali, not English", async()=>{
        var maxResults = 2;
        var skr = await new Seeker({
            maxResults,
        }).initialize();
        var expected = {
            method: 'keywords',
            maxResults,
            lang: 'pli', // searching bilara-data/root/pli
            lines: [ 
                `${pli_ms}an/an10/an10.93_root-pli-ms.json:9`,
                `${pli_ms}sn/sn10/sn10.8_root-pli-ms.json:9`,
            ],
        };

        // Single Pali keyword searches Pali
        var data = await skr.keywordSearch({ 
            pattern: 'Anāthapiṇḍika',
            lang: 'en', // will be ignored
        });
        should(data).properties(expected);

        // Single romanized Pali searches Pali
        var data = await skr.keywordSearch({ 
            pattern: 'anathapindika',
        });
        should(data).properties(expected);
    });
    it("keywordSearch(...) searches English, not Pali", async()=>{
        var maxResults = 2;
        var skr = await new Seeker({
            maxResults,
        }).initialize();
        var expected = {
            method: 'keywords',
            maxResults,
            lang: 'en', // searching bilara-data/translation/en
            lines: [ 
                `${en_suj}mn/mn143_translation-en-sujato.json:16`,
                `${en_suj}an/an10/an10.93_translation-en-sujato.json:11`
            ],
        };

        // Single Pali keyword searches Pali
        var data = await skr.keywordSearch({ 
            pattern: 'Anāthapiṇḍika',
            searchLang: 'en', // will not be ignored
            lang: 'en', // will be ignored
        });
        should(data).properties(expected);
    });
    it("keywordSearch(...) searches Pali, not Deutsch", async()=>{
        var maxResults = 2;
        var skr = await new Seeker({
            lang: 'de',
            maxResults,
        }).initialize();
        var expected = {
            method: 'keywords',
            maxResults,
            lang: 'pli', // searching bilara-data/root/pli
            lines: [ 
                `${pli_ms}an/an10/an10.93_root-pli-ms.json:9`,
                `${pli_ms}sn/sn10/sn10.8_root-pli-ms.json:9`,
            ],
        };

        // Single Pali keyword searches Pali
        var data = await skr.keywordSearch({ 
            pattern: 'Anāthapiṇḍika',
            lang: 'de', // will be ignored
        });
        should(data).properties(expected);

        // Single romanized Pali searches Pali
        var data = await skr.keywordSearch({ 
            pattern: 'anathapindika',
            lang: 'de', // will be ignored
        });
        should(data).properties(expected);
    });
    it("keywordSearch(...) searches Deutsch, not Pali", async()=>{
        var skr = await new Seeker({
            lang: 'en', // English default
        }).initialize();
        var expected = {
            lang: 'de',
            resultPattern: 
            "\\b(a|ā)(n|ṅ|ñ|ṇ)(a|ā)(t|ṭ)h(a|ā)p(i|ī)(n|ṅ|ñ|ṇ)"+
                "(d|ḍ)(i|ī)k(a|ā)|\\bhausbesitzer",
            maxResults: 10,
            method: 'keywords',
            lines: [
`${de_sab}sn/sn10/sn10.8_translation-de-sabbamitta.json:4`,
`${de_sab}an/an2/an2.32-41_translation-de-sabbamitta.json:2`,
`${de_sab}an/an5/an5.41_translation-de-sabbamitta.json:2`,
`${de_sab}an/an1/an1.248-257_translation-de-sabbamitta.json:1`,
`${de_sab}an/an3/an3.109_translation-de-sabbamitta.json:1`,
`${de_sab}an/an3/an3.110_translation-de-sabbamitta.json:1`,
`${de_sab}an/an4/an4.197_translation-de-sabbamitta.json:1`,
`${de_sab}an/an4/an4.58_translation-de-sabbamitta.json:1`,
`${de_sab}an/an4/an4.60_translation-de-sabbamitta.json:1`,  
`${de_sab}an/an4/an4.61_translation-de-sabbamitta.json:1`,  
            ],
        };

        // Mixed Pali/Deutsch keywords initial cap
        var data = await skr.keywordSearch({ 
            pattern: Seeker.normalizePattern(
                'Anathapindika Hausbesitzer'),
            maxResults: 10,
            lang: 'de', // Requesting Deutsch search
        });
        should.deepEqual(data, expected);

        // Mixed Pali/Deutsch keywords lowercase
        var data = await skr.keywordSearch({ 
            pattern: Seeker.normalizePattern(
                'anathapindika hausbesitzer'),
            maxResults: 10,
            lang: 'de', // Requesting Deutsch search
        });
        should.deepEqual(data, expected);
    });
    it("find(...) scores relevance", async()=>{
        var skr = await new Seeker({
            lang: 'en', // English default
        }).initialize();

        // Mixed Pali/Deutsch keywords initial cap
        var pattern = 'abhisambuddha';
        var data = await skr.find({ 
            pattern,
        });
        should(data.resultPattern).equal(
            '\\b(a|ā)bh(i|ī)s(a|ā)(m|ṁ|ṃ)b(u|ū)(d|ḍ)(d|ḍ)h(a|ā)');
        should(data.method).equal('phrase');
        var mld0 = data.mlDocs[0];
        should(mld0.bilaraPaths[0])
            .equal('root/pli/ms/sutta/dn/dn34_root-pli-ms.json');
        should(mld0.score).equal(10.011);
    });
    it("patternLanguage(...) => search language context",async()=>{
        var skr = await new Seeker().initialize();

        should(skr.patternLanguage('buddha was staying near benares', 'de'))
            .equal('en');
        should(skr.patternLanguage('buddha was staying near benares', 'en'))
            .equal('en');

        // Sutta references
        should(skr.patternLanguage('mn1','de')).equal('de');
        should(skr.patternLanguage('mn1/pli','de')).equal('pli');
        should(skr.patternLanguage('mn1/en','de')).equal('en');
        should(skr.patternLanguage('mn1/en/sujato','de')).equal('en');
        should(skr.patternLanguage('mn1/de','de')).equal('de');
        should(skr.patternLanguage('mn1/de/sabbamitta','de'))
            .equal('de');

        should(skr.patternLanguage('wurzel des leidens','de'))
            .equal('de');
        should(skr.patternLanguage('awakened buddha','de'))
            .equal('en');
        should(skr.patternLanguage('anathema')).equal('en');
        should(skr.patternLanguage('anathema', 'en')).equal('en');
        should(skr.patternLanguage('anath')).equal('en');
        should(skr.patternLanguage('anath', 'en')).equal('en');
        should(skr.patternLanguage('anatha')).equal('pli');
        should(skr.patternLanguage('anatha', 'en')).equal('pli');
        should(skr.patternLanguage('anathapindika')).equal('pli');
        should(skr.patternLanguage('anathapindika', 'en')).equal('pli');
        should(skr.patternLanguage('anathapindika monastery'))
            .equal('en');
        should(skr.patternLanguage('anathapindika monastery', 'en'))
            .equal('en');
        should(skr.patternLanguage('anathapindika kloster', 'de'))
            .equal('de');
        should(skr.patternLanguage('anathapindika kloster'))
            .equal('en');

        // "gehe" and "so" are both German and Pali
        should(skr.patternLanguage('anathapindika gehe so', 'de'))
            .equal('en');
    });
    it("find(...) ignores unpublished", async()=>{
        var lang = 'en';
        var pattern = 'root of suffering';
        var skr = await new Seeker({
            lang,
        }).initialize();
        let matchHighlight = "\u001b[38;5;201m$&\u001b[0m";
        let showMatchesOnly = true;
        var res = await skr.find({ pattern, matchHighlight, showMatchesOnly, });
        should(res.method).equal('phrase');
        should.deepEqual(res.suttaRefs, [
            'sn42.11/en/sujato',
            'mn105/en/sujato',
            'mn1/en/sujato',
            'sn56.21/en/sujato',
            'mn66/en/sujato',   // ordered by grep count
            'mn116/en/sujato',  // ordered by grep count
            'dn16/en/sujato',
        ]);
        should.deepEqual(res.mlDocs.map(mld=>`${mld.suid}, ${mld.score}`), [
            'sn42.11, 5.091',
            'mn105, 3.016',
            'mn1, 2.006',
            'sn56.21, 1.043',
            'mn116, 1.01',  // reordered by score
            'mn66, 1.005',  // reordered by score
            'dn16, 1.001',
        ]);
    });
    it("phraseSearch(...) limits English results", async()=>{
        var lang = 'en';
        var pattern = 'root of suffering';
        var maxResults = 3;
        var skr = await new Seeker({
            maxResults,
            lang,
        }).initialize();
        var expected = {
            method: 'phrase',
            lang: 'en',
            pattern: `\\broot of suffering`,
            lines: SUTTA_ROOT_SUFF.slice(0,maxResults),
        };

        var data = await skr.phraseSearch({ 
            pattern,
            // maxResults taken from Seeker.maxResults
        });
        should.deepEqual(data, expected);

        skr.maxResults = 100; // phraseSearch will override
        should(skr.maxResults).equal(100);
        var data = await skr.phraseSearch({ 
            pattern,
            maxResults, // explicit specification
        });
        should(data).properties(expected);
        should.deepEqual(data.lines.slice(0,3), expected.lines);
        should(data.lines.length).equal(maxResults);
    });
    it("phraseSearch(...) searches English", async()=>{
        var lines = [
            `${en_suj}kn/thag/thag2.15_translation-en-sujato.json:1`,
            `${en_suj}dn/dn14_translation-en-sujato.json:1`, 
        ];
        var lang = 'de';
        var pattern = `sabbamitta`;
        var maxResults = 3;
        var skr = await new Seeker({
            lang,
            maxResults,
        }).initialize();

        var data = await skr.phraseSearch({ 
            pattern,
            searchLang: 'en',
            lang,
        });
        should.deepEqual(data, {
            method: 'phrase',
            lang: 'en',
            pattern: `\\bsabbamitta`,
            lines,
        });
    });
    it("TESTTESTphraseSearch(...) finds Deutsch results", async()=>{
        var linesWurzel = [
            `${de_sab}sn/sn42/sn42.11_translation-de-sabbamitta.json:5`,
        ];
        var linesUber = [
          `${de_sab}dn/dn33_translation-de-sabbamitta.json:38`,
          `${de_sab}an/an4/an4.198_translation-de-sabbamitta.json:21`,
          `${de_sab}dn/dn34_translation-de-sabbamitta.json:19`,
        ];
        var lang = 'de';
        var maxResults = 10;
        var maxDoc = 3;
        var skr = await new Seeker({
            maxResults,
            maxDoc,
        }).initialize();
        should.deepEqual(skr.languages, ['pli','en']);

        // diacritical word boundary
        var pattern = `übung`;
        var data = await skr.phraseSearch({ 
            pattern,
            lang,
        });
        should.deepEqual(skr.languages, ['pli','en']);
        should(data).properties({
            method: 'phrase',
            lang,
            pattern: `\\b${pattern}`,
        });
        should.deepEqual(data.lines.slice(0,3), linesUber);

        var pattern = `wurzel des leidens`;
        var data = await skr.phraseSearch({ 
            pattern,
            lang,
        });
        should.deepEqual(skr.languages, ['pli','en']);
        should.deepEqual(data, {
            method: 'phrase',
            lang,
            pattern: `\\bwurzel des leidens`,
            lines: linesWurzel,
        });
    });
    it("find(...) finds thag1.10", async()=>{
        var skr = await new Seeker().initialize();

        var res = await skr.find({
            pattern: "thag1.10",
            matchHighlight: false,
        });
        should(res.method).equal('sutta_uid');
        should.deepEqual(res.suttaRefs, ['thag1.10/en']);
        should.deepEqual(res.mlDocs.map(mld=>mld.suid),  
            ['thag1.10']);
    });
    it("find(...) orders sutta references found", async()=>{
        var skr = await new Seeker().initialize();

        var res = await skr.find({
            pattern: "sn29.9-999",
            matchHighlight: false,
        });
        should(res.method).equal('sutta_uid');
        should.deepEqual(res.suttaRefs,
            ['sn29.9/en', 'sn29.10/en', 'sn29.11-20/en', 'sn29.21-50/en']);
        should.deepEqual(res.mlDocs.map(mld=>mld.score), [0,0,0,0]);
        should.deepEqual(res.mlDocs.map(mld=>mld.suid),  
            ['sn29.9', 'sn29.10', 'sn29.11-20', 'sn29.21-50']);
    });
    it("find(...) finds sutta references", async()=>{
        var maxResults = 3;
        var skr = await new Seeker({
            maxResults,
        }).initialize();

        // lists of suttas with ranges
        var lang = 'de';
        // The pattern resolves to 4 suttas, of which 3 are returned
        var pattern = "sn12.23, an1.2-25"; 
        var res = await skr.find({
            pattern,
            lang,
            matchHighlight: false,
            showMatchesOnly: false,
        });
        should(res.method).equal('sutta_uid');
        should(res.maxResults).equal(maxResults);
        should.deepEqual(res.suttaRefs,
            ['sn12.23/de', 'an1.1-10/de', 'an1.11-20/de', ]);
        // mlDocs are not sorted when searching by suid 
        // since the user is specifying the desired order
        should.deepEqual(res.mlDocs.map(mld=>mld.suid),
            ['sn12.23', 'an1.1-10', 'an1.11-20', ]);
        should(res.resultPattern).equal(pattern);
        should(res.lang).equal('de');
        should(res.mlDocs.length).equal(3);
    });
    it("find(...) finds mn1/en/sujato", async()=>{
        var maxResults = 3;
        var skr = await new Seeker({
            maxResults,
        }).initialize();

        // lists of suttas with ranges
        var lang = 'de';
        // The pattern resolves to 4 suttas, of which 3 are returned
        var pattern = "mn1/en/sujato"; 
        var res = await skr.find({
            pattern,
            lang,
            matchHighlight: false,
        });
        var [mld0] = res.mlDocs;
        should(res.method).equal('sutta_uid');
        should(res.maxResults).equal(maxResults);
        should.deepEqual(res.suttaRefs, ['mn1/en/sujato']);
        should(res.resultPattern).equal(pattern);
        should(res.lang).equal('en'); // pattern overrides default lang='de'
        should(res.mlDocs.length).equal(1);
        var segments = mld0.segments();
        should(segments.length).equal(334);
        should.deepEqual(segments[22],{
            scid: 'mn1:5.2',
            matched: true,
            pli: 'tejaṁ tejato saññatvā tejaṁ maññati, '+
                'tejasmiṁ maññati, tejato maññati, '+
                'tejaṁ meti maññati, tejaṁ abhinandati. ',
            en: 'But then they identify with fire … ',
        });
    });
    it("find(...) finds an1.2", async()=>{
        var maxResults = 3;
        var skr = await new Seeker({
            maxResults,
        }).initialize();

        // lists of suttas with ranges
        var lang = 'de';
        // The pattern resolves to 4 suttas, of which 3 are returned
        var pattern = "an1.2"; 
        var res = await skr.find({
            pattern,
            lang,
            matchHighlight: false,
        });
        var [mld0] = res.mlDocs;
        should(res.method).equal('sutta_uid');
        should(res.maxResults).equal(maxResults);
        should.deepEqual(res.suttaRefs, ['an1.1-10/de']);
        should(res.resultPattern).equal(pattern);
        should(res.lang).equal('de');
        should(res.mlDocs.length).equal(1);
        var segments = mld0.segments();
        should.deepEqual(segments[0],{
            scid: 'an1.2:1.0',
            de: '2',
            en: '2',
            pli: '2',
            matched: true,
        });
        should(segments.length).equal(4);
        should.deepEqual(segments[3],{ // AN1.1
            scid: 'an1.2:1.3',
            pli: 'Dutiyaṁ. ',
            de: ' ',
            en: ' ',
            matched: true,
        });
    });
    it("find(...) => legacy suttas", async()=>{
        var maxDoc = 3;
        var skr = await new Seeker({
            maxDoc,
        }).initialize();

        // lists of suttas with ranges
        var lang = 'de';
        // The pattern resolves to 4 suttas, of which 3 are returned
        var pattern = "mn1/en/bodhi"; 
        var res = await skr.find({
            pattern,
            lang,
        });
        should(res.method).equal('sutta_uid');
        should(res.maxDoc).equal(maxDoc);
        should.deepEqual(res.suttaRefs, [ `mn1/en/bodhi` ]);
        should(res.resultPattern).equal(pattern);
        should(res.lang).equal('en');
        should(res.mlDocs.length).equal(1);
        let mld0 = res.mlDocs[0];
        should(mld0.author_uid).equal('bodhi');
    });
    it("find({minLang}) => minimum language count", async()=>{
        var maxResults = 3;
        var skr = await new Seeker({
            maxResults,
        }).initialize();
        should.deepEqual(skr.languages, ['pli','en']);

        var pattern = "dn33"; 
        var res = await skr.find({
            pattern,
            lang: 'de',
            minLang: 2,
        });
        should.deepEqual(res.suttaRefs, ['dn33/de']);
        should(res.mlDocs.length).equal(1);
        should(res.minLang).equal(2);

        var res = await skr.find({
            pattern,
            lang: 'de',
            minLang: 3,
        });
        should.deepEqual(res.suttaRefs, ['dn33/de']);
        should(res.mlDocs.length).equal(1);
        let mld0 = res.mlDocs[0];
        should(mld0.author_uid).equal('sabbamitta');
    });
    it("find(...) => finds jhana", async()=>{
        var msStart = Date.now();
        var maxDoc = 5;
        var maxResults = 50;
        var skr = await new Seeker({
            maxDoc,
            maxResults,
        }).initialize();

        var pattern = "jhana";
        var res = await skr.find({
            pattern,
            lang: 'de',
            minLang: 2,
            showMatchesOnly: false, // return entire sutta
        });
        should(res.maxDoc).equal(maxDoc);
        should(res.mlDocs.length).equal(maxDoc);
        should.deepEqual(res.suttaRefs.slice(0,maxDoc), [
            'mn108/pli/ms',
            'an9.36/pli/ms',
            'an6.60/pli/ms',
            'dn33/pli/ms',
            'mn66/pli/ms',
        ]);
    });
    it("find(...) => finds phrase", async()=>{
        var maxResults = 3;
        var skr = await new Seeker({
            maxResults,
        }).initialize();

        var msStart = Date.now();
        var pattern = "root of suffering"; 
        var res = await skr.find({
            pattern,
            lang: 'de',
            minLang: 2,
            showMatchesOnly: false, // return entire sutta
        });
        should.deepEqual(res.suttaRefs, [
            'sn42.11/en/sujato',
            'mn105/en/sujato',
            'mn1/en/sujato',
        ]);
        should.deepEqual(res.mlDocs.map(mld=>mld.score), [
            5.091, 3.016, 2.006,
        ]);
        should.deepEqual(res.mlDocs.map(mld=>mld.suid), [
            "sn42.11", "mn105", "mn1",
        ]);
        var [
            mld0,
            mld1,
            mld2,
        ] = res.mlDocs;
        should(res.mlDocs.length).equal(3);
        should(res.minLang).equal(2);
        should.deepEqual(mld0.segments()[0], {
            scid: 'sn42.11:0.1',
            de: "Verbundene Lehrreden 42",
            en: "Linked Discourses 42 ",
            pli: "Saṁyutta Nikāya 42 ",
        });
        should.deepEqual(mld1.segments()[0], {
            scid: 'mn105:0.1',
            en: "Middle Discourses 105 ",
            pli: "Majjhima Nikāya 105 ",
        });
        should.deepEqual(mld2.segments()[0], {
            scid: 'mn1:0.1',
            en: "Middle Discourses 1 ",
            pli: "Majjhima Nikāya 1 ",
        });
    });
    it("TESTTESTfind(...) => finds ubung", async()=>{
        var maxDoc = 3;
        var skr = await new Seeker({
            maxDoc,
        }).initialize();

        var pattern = `übung`;
        var res = await skr.find({
            pattern,
            lang: 'de',
            minLang: 2,
            maxDoc,
            showMatchesOnly: false, // return entire sutta
        });
        // suttaRefs will be many since grep/ripgrep
        // search files
        should.deepEqual(res.suttaRefs.slice(0,3), [
            'dn33/de/sabbamitta',
            'an4.198/de/sabbamitta',
            'dn34/de/sabbamitta',
        ]);
        // We only care about three documents so that 
        // is what we should get
        should.deepEqual(res.mlDocs.map(mld=>mld.score), [
            38.033, 21.189, 19.021, 
        ]);
    });
    it("find(...) => finds searchLang phrase", async()=>{
        var maxResults = 3;
        var skr = await new Seeker({
            maxResults,
        }).initialize();

        var pattern = "sabbamitta"; 
        var res = await skr.find({
            pattern,
            searchLang: 'en',
            lang: 'de',
            minLang: 2,
            showMatchesOnly: false, // return entire sutta
        });
        should.deepEqual(res.suttaRefs, [
            'thag2.15/en/sujato', 'dn14/en/sujato',
        ]);
        should(res.mlDocs[0].lang).equal('de');
    });
    it("find(...) => accepts embedded options", async()=>{
        var skr = await new Seeker({
        }).initialize();

        var pattern = "sabbamitta -ml 3 -sl en -l de -ml 2"; 
        var res = await skr.find({
            pattern,
        });
        should.deepEqual(res.suttaRefs, [
            'thag2.15/en/sujato', 'dn14/en/sujato',
        ]);
    });
    it("find(...) => finds all keywords", async()=>{
        var maxDoc = 50;
        var skr = await new Seeker({
            maxDoc,
        }).initialize();

        var pattern = "darkness light"; 
        var res = await skr.find({
            pattern,
            lang: 'de',
            minLang: 2,
            showMatchesOnly: false,
        });
        should(res.suttaRefs.length).equal(17);
    });
    it("find(...) => finds keywords", async()=>{
        var maxDoc = 3;
        var skr = await new Seeker({
            maxDoc,
        }).initialize();

        var pattern = "wurzel leidens"; 
        var res = await skr.find({
            pattern,
            lang: 'de',
            minLang: 2,
        });
        should.deepEqual(res.suttaRefs, [
            'sn42.11/de/sabbamitta',
        ]);
        var [
            mld0,
        ] = res.mlDocs;
        should(res.mlDocs.length).equal(1);
        should(res.minLang).equal(2);
        should(mld0.segments()[0]).properties({
            scid: 'sn42.11:2.11',
            en: 'For desire is the root of suffering. ',
        });
    });
    it("find(...) => finds segments with all keywords", async()=>{
        var maxDoc = 3;
        var skr = await new Seeker().initialize();

        var pattern = "red yellow"; 
        var res = await skr.find({
            pattern,
            lang: 'de',
            minLang: 2,
            maxDoc,
        });
        should(res.resultPattern).equal('\\bred|\\byellow');
        should(res.method).equal('keywords');
        should.deepEqual(res.suttaRefs.slice(0,3), [
            'mn77/en/sujato',
            'dn16/en/sujato',
            'dn23/en/sujato',
        ]);
        should(res.suttaRefs.length).equal(15);
        var [
            mld0,
            mld1,
            mld2,
        ] = res.mlDocs;
        should(res.mlDocs.length).equal(3);
        should(res.minLang).equal(2);
        should(res.suttaRefs.length).equal(15);
        should(res.segsMatched).equal(25);
        should(mld0.score).above(mld1.score);
    });
    it("RegExp knows about word boundaries", () => {
        var u = new Unicode();
        var text = [
            `“Yaṃ panāniccaṃ dukkhaṃ vā taṃ sukhaṃ vā”ti?`,
            `sotaṃ niccaṃ vā aniccaṃ vā”ti?`,
        ];
        var utext = text.map(t=>u.romanize(t));
        var pattern = "\\b(a|ā)(n|ṅ|ñ|ṇ)(i|ī)cc(a|ā)";
        var re = new RegExp(`${pattern}`, "gui");
        should(utext[0].replace(re,'ANICCA')).equal(utext[0]);
        should(utext[1].replace(re,'ANICCA')).equal(
            `sotam niccam va ANICCAm va”ti?`);
    });
    it("find(...) => de, Benares", done=>{
        (async function() { try {
            var lang = 'de';
            var skr = await new Seeker().initialize();
            var res = await skr.find({
                pattern: "Buddha was staying near Benares",
                maxResults: 3,
                lang,
                minLang: 2,
            });
            let {
                bilaraPaths,
                method,
                searchLang,
            } = res;
            should(method).equal('phrase');
            should(searchLang).equal(searchLang);
            should.deepEqual(bilaraPaths, [
                `${pli_ms}sn/sn56/sn56.11_root-pli-ms.json`,
                `${de_sab}sn/sn56/sn56.11_translation-de-sabbamitta.json`,
                `${en_suj}sn/sn56/sn56.11_translation-en-sujato.json`,
                `${pli_ms}sn/sn55/sn55.53_root-pli-ms.json`,
                `${en_suj}sn/sn55/sn55.53_translation-en-sujato.json`,
                `${pli_ms}sn/sn4/sn4.5_root-pli-ms.json`,
                `${en_suj}sn/sn4/sn4.5_translation-en-sujato.json`,
            ]);

            done();
        } catch(e) { done(e); }})();
    });
    it("find(...) => no first point", done=>{
        (async function() { try {
            var lang = 'de';
            var skr = await new Seeker().initialize();
            var res = await skr.find({
                pattern: "no first point",
                maxResults: 3,
                lang,
                minLang: 2,
            });
            let {
                bilaraPaths,
                method,
                searchLang,
            } = res;
            should(method).equal('phrase');
            should(searchLang).equal(searchLang);
            should.deepEqual(bilaraPaths, [
                `${pli_ms}sn/sn15/sn15.2_root-pli-ms.json`,
                `${en_suj}sn/sn15/sn15.2_translation-en-sujato.json`,
                `${pli_ms}sn/sn15/sn15.1_root-pli-ms.json`,
                `${en_suj}sn/sn15/sn15.1_translation-en-sujato.json`,
                `${pli_ms}sn/sn15/sn15.19_root-pli-ms.json`,
                `${en_suj}sn/sn15/sn15.19_translation-en-sujato.json`,
            ]);

            done();
        } catch(e) { done(e); }})();
    });
    it("findArgs(...) parses pattern string", async()=>{
        var bilaraData = await bd.initialize();
        var skr = await new Seeker({
            bilaraData,
        }).initialize();
        
        // English
        should.deepEqual(skr.findArgs(["root of suffering"]), {
            includeUnpublished: false,
            lang: 'en',
            languages: ['pli', 'en'],
            matchHighlight: "\u001b[38;5;121m$&\u001b[0m",
            maxDoc: 50,
            maxResults: 1000,
            minLang: 2,
            pattern: "root of suffering",
            searchLang: 'en',
            showMatchesOnly: true,
            sortLines: undefined,
            tipitakaCategories: undefined,
            types: ['root', 'translation'],
        });

        // German
        should.deepEqual(skr.findArgs([
            "wurzel des leidens -ml3 -l de"
        ]), {
            includeUnpublished: false,
            lang: 'de',
            languages: ['pli', 'en', 'de'],
            matchHighlight: "\u001b[38;5;121m$&\u001b[0m",
            maxDoc: 50,
            maxResults: 1000,
            minLang: 3,
            pattern: "wurzel des leidens",
            searchLang: 'de',
            showMatchesOnly: true,
            sortLines: undefined,
            tipitakaCategories: undefined,
            types: ['root', 'translation'],
        });

        // German
        should.deepEqual(skr.findArgs([
            "wurzel des leidens -ml 3 -l de"
        ]), {
            includeUnpublished: false,
            lang: 'de',
            languages: ['pli', 'en', 'de'],
            matchHighlight: "\u001b[38;5;121m$&\u001b[0m",
            maxDoc: 50,
            maxResults: 1000,
            minLang: 3,
            pattern: "wurzel des leidens",
            searchLang: 'de',
            showMatchesOnly: true,
            sortLines: undefined,
            tipitakaCategories: undefined,
            types: ['root', 'translation'],
        });
    });
    it("find(...) finds pli-tv-bi-vb-sk1-75", async()=>{
        var maxDoc = 3;
        var bilaraData = new BilaraData({
            includeUnpublished: true,
        });
        var skr = await new Seeker({
            maxDoc,
            bilaraData,
        }).initialize();

        // lists of suttas with ranges
        var lang = 'en';
        // The pattern resolves to 4 suttas, of which 3 are returned
        var pattern = "pli-tv-bi-vb-sk1-75"; 
        var res = await skr.find({
            pattern,
            lang,
        });
        should(res.method).equal('sutta_uid');
        should(res.maxDoc).equal(maxDoc);
        should.deepEqual(res.suttaRefs, ['pli-tv-bi-vb-sk1-75/en']);
        should(res.resultPattern).equal(pattern);
        should(res.lang).equal('en');
        should(res.mlDocs.length).equal(1);
    });
    it("find(...) finds pli-tv-bi-vb-pj7", async()=>{
        var maxDoc = 3;
        var bilaraData = new BilaraData({
            includeUnpublished: true,
        });
        var skr = await new Seeker({
            maxDoc,
            bilaraData,
        }).initialize();

        // lists of suttas with ranges
        var lang = 'en';
        // The pattern resolves to 4 suttas, of which 3 are returned
        var pattern = "ejected by a unanimous"; 
        var res = await skr.find({
            pattern,
            lang,
        });
        should(res.method).equal('phrase');
        should(res.maxDoc).equal(maxDoc);
        should.deepEqual(res.suttaRefs, [
            'pli-tv-bi-vb-pj7/en/brahmali',
            'pli-tv-pvr2.9/en/brahmali',
            'pli-tv-pvr2.1/en/brahmali',
            'pli-tv-bi-vb-ss4/en/brahmali',
            'pli-tv-pvr2.2/en/brahmali',
            'pli-tv-pvr2.10/en/brahmali',
        ]);
        should(res.resultPattern).equal(`\\b${pattern}`);
        should(res.lang).equal('en');
        should(res.mlDocs.length).equal(3);
    });
    it("tipitakaRegExp(tc) => regexp for paths", ()=>{
        var skr = new Seeker();
        should(skr.tipitakaRegExp('su').toString())
            .equal("/(\\/sutta\\/)/iu");
        should(skr.tipitakaRegExp())
            .equal(undefined);
        should(skr.tipitakaRegExp('bi,pj').toString())
            .equal("/(-bi-|-pj)/iu");
    })
    it("find(...) finds an1.1 all types", async()=>{
        var skr = await new Seeker().initialize();
        var res = await skr.find({
            pattern: "an1.1",
            matchHighlight: false,
            lang: 'de',
            types: BilaraPathMap.ALL_TYPES,
        });
        should(res.mlDocs.length).equal(1);
        var segs = res.mlDocs[0].segments();
        should.deepEqual(segs[0], {
            scid: 'an1.1:0.1',
            html: "<section class='range' id='an1.1-10'><header>"+
                "<ul><li class='division'>{}</li>",
            pli: 'Aṅguttara Nikāya 1 ',
            en: 'Numbered Discourses 1 ',
            de: 'Nummerierte Lehrreden 1',
            matched: true,
        });
    })
    it("RegExp maches ubung", ()=>{
        var re = /(?<=[\s,.:;"']|^)übung/iu;
        var text = 'Wahrheit von der Übung, die zum Aufhören';
        should(re.test(text)).equal(true);
    });
    it("find(...) ignores translation stubs", async()=>{
        var skr = await new Seeker().initialize();

        var pattern = "root of suffering -ml 3 -l de"; 
        var res = await skr.find({
            pattern,
        });
        should.deepEqual(res.suttaRefs, [
            'sn42.11/en/sujato',
        ]);
        should(res.bilaraPaths.length).equal(3);
    });
    it("find(...) ignores chinese", async()=>{
        var skr = await new Seeker().initialize();

        var pattern = "wrong livelihood"; 
        var res = await skr.find({
            pattern,
        });
        should(res.bilaraPaths.length).equal(158);
    });
    it("find(...) => ignores SN46.36", async()=>{
        var skr = await new Seeker({
            root: TEST_BILARA_PATH,
        }).initialize();

        var pattern = "hindrance -ml 3 -sl en -l de"; 
        var res = await skr.find({
            pattern,
        });
        should.deepEqual(res.suttaRefs, []);
    });
    it("find(...) finds 'alles leiden,...'", async()=>{
        var bilaraData = await bd.initialize();
        var skr = await new Seeker({
            bilaraData,
        }).initialize();
        var pattern = "alles leiden, das zustande kommt -ml3 -l de";
        
        var data = await skr.find({pattern});
        should(data.resultPattern).equal(
            '\\balles leiden, das zustande kommt');
        should(data.method).equal('phrase');
        should(data.mlDocs.length).equal(1);
        var mld0 = data.mlDocs[0];
        should(mld0.bilaraPaths[0])
            .equal('root/pli/ms/sutta/sn/sn42/sn42.11_root-pli-ms.json');
        should(mld0.score).equal(3.055);
    });
    it("find(...) finds Deutsch 'blind'", async()=>{
        var bilaraData = await bd.initialize();
        var skr = await new Seeker({
            bilaraData,
        }).initialize();
        var pattern = "blind -ml3 -l de";
        
        var data = await skr.find({pattern });
        should(data.resultPattern).equal('\\bblind');
        should(data.searchLang).equal('de');
        should(data.method).equal('phrase');
        should(data.mlDocs.length).equal(6);
        var mld0 = data.mlDocs[0];
        should(mld0.bilaraPaths[0]).match(/an3.29/);
        should(mld0.score).equal(6.128);
    });
    it("find(...) finds 'thig3.8' de unpublished", async()=>{
        var bilaraData = await bd.initialize();
        var includeUnpublished = true;
        var skr = await new Seeker({ bilaraData, }).initialize();
        var pattern = "thig3.8 -l de";
        
        var data = await skr.find({
            pattern, 
            includeUnpublished,
        });
        should(data.searchLang).equal('de');
        should(data.method).equal('sutta_uid');
        should(data.mlDocs.length).equal(1);
        var mld0 = data.mlDocs[0];
        should(mld0.bilaraPaths[0]).match(/thig3.8/);
        should(mld0.score).equal(0);
        should(mld0.segments().length).equal(18);
        should(data.resultPattern).equal('thig3.8');
        should(mld0.author_uid).equal('sabbamitta');
    });
    it("find(...) finds 'king pacetana'", async()=>{
        var bilaraData = await bd.initialize();
        var skr = await new Seeker({
            bilaraData,
        }).initialize();
        var pattern = "king pacetana";
        
        var data = await skr.find({pattern});
        should(data.searchLang).equal('en');
        should(data.method).equal('phrase');
        should(data.mlDocs.length).equal(1);
        var mld0 = data.mlDocs[0];
        should(mld0.bilaraPaths[0]).match(/an3.15/);
        should(mld0.score).equal(4.087);
        should(data.resultPattern).equal('\\bking pacetana');
    });
    it("find(...) is cached", async()=>{
        var skr = await new Seeker({
            lang: 'en', // English default
        }).initialize();
        var pattern = 'stuck in the middle';
        var findOpts = { 
            pattern,
        };
        await skr.clearMemo('find');

        var ms0 = Date.now();
        var data = await skr.find(findOpts);
        var ms1 = Date.now();

        var data2 = await skr.find(findOpts);
        var ms2 = Date.now();
        should(data.method).equal('phrase');
        var mld0 = data.mlDocs[0];
        should(mld0.bilaraPaths[0])
            .equal('root/pli/ms/sutta/an/an6/an6.61_root-pli-ms.json');
        should(mld0.score).equal(2.036);
        delete data2.elapsed;
        delete data.elapsed;
        should.deepEqual(data2, data);
    });
    it("isExample", async()=>{
        var skr = await new Seeker({
            lang: 'en', // English default
        }).initialize();
        let msStart = Date.now();
        should(skr.isExample('root of suffering')).equal(true);
        should(skr.isExample('ROOT OF SUFFERING')).equal(true);
        should(skr.isExample('\\bROOT OF SUFFERING')).equal(true);
        should(skr.isExample('\\bROOT OF SUFFERING\\b')).equal(true);
        should(skr.isExample('Wurzel des Leidens')).equal(true);
        should(skr.isExample('wurzel des leidens')).equal(true);

        // Ordered keywords
        should(skr.isExample('root sufering')).equal(false);
    });
    it('find(...) => "dn7/de"', async()=>{
        let bilaraData = new BilaraData();
        let skr = await new Seeker({
            bilaraData,
            logger: bilaraData,
        }).initialize();
        let res = await skr.find({
            pattern: 'dn7/de',
        });
        should(res.bilaraPaths.length).equal(2);
        let mld0 = res.mlDocs[0];
        should(mld0.author_uid).equal('sabbamitta');
        should.deepEqual(mld0.langSegs, {pli:51, de:45});
        should(res.lang).equal('de');
        should(mld0.sutta_uid).equal('dn7');
    });
    it('find(...) => soṇasiṅgālā', async()=>{
        let bilaraData = new BilaraData();
        let skr = await new Seeker({
            bilaraData,
            logger: bilaraData,
        }).initialize();
        let res = await skr.find({
            pattern: 'soṇasiṅgālā',
        });
        should(res.lang).equal('en');
        should.deepEqual(res.bilaraPaths,[
              "root/pli/ms/sutta/kn/iti/vagga5/iti42_root-pli-ms.json",
              `${en_suj}kn/iti/vagga5/iti42_translation-en-sujato.json`, 
              "root/pli/ms/sutta/dn/dn26_root-pli-ms.json",
              "translation/en/sujato/sutta/dn/dn26_translation-en-sujato.json",
              "root/pli/ms/sutta/an/an2/an2.1-10_root-pli-ms.json",
              "translation/en/sujato/sutta/an/an2/an2.1-10_translation-en-sujato.json",
        ]);
        let [ mld0, mld1 ]  = res.mlDocs;
        should(mld0.author_uid).equal('sujato');
        should(mld0.suid).equal('iti42');
        should(mld1.author_uid).equal('sujato');
        should(mld1.suid).equal('an2.1-10');
    });
    it('find(...) => nun', async()=>{
        let bilaraData = new BilaraData();
        let maxDoc = 5;
        let skr = await new Seeker({
            bilaraData,
            logger: bilaraData,
            maxDoc,
        }).initialize();
        let res = await skr.find({
            pattern: 'nun',
        });
        should(res.lang).equal('en');
        should(res.mlDocs.length).equal(maxDoc);
        should.deepEqual(res.bilaraPaths.slice(0,6),[
            'root/pli/ms/sutta/mn/mn146_root-pli-ms.json',
            'translation/en/sujato/sutta/mn/mn146_translation-en-sujato.json',
            'root/pli/ms/sutta/mn/mn68_root-pli-ms.json',
            'translation/en/sujato/sutta/mn/mn68_translation-en-sujato.json',
            'root/pli/ms/sutta/mn/mn21_root-pli-ms.json',
            'translation/en/sujato/sutta/mn/mn21_translation-en-sujato.json',
        ]);
        let mld0 = res.mlDocs[0];
        should(mld0.author_uid).equal('sujato');
        should(mld0.suid).equal('mn146');
        should(res.mlDocs.length).equal(maxDoc);
    });
    it("find(...) handles sn46.55/cs", async()=>{
        var skr = await new Seeker().initialize();
        var pattern = 'sn46.55/cs';
        var ex = undefined;
        try {
            var res = await skr.find({ pattern, matchHighlight: false, });
        } catch(e) {
            ex = e;
        }
        should(ex).properties({
            suidRef:pattern
        }); 
    });
    it("find(...) handles an1.1-10/jpn", async()=>{
        var skr = await new Seeker().initialize();
        var pattern = 'an1.1-10/jpn';
        var ex = undefined;
        var res = await skr.find({ pattern, matchHighlight: false, });
        should(res).properties({
            pattern,
            suttaRefs: [],
        }); 
    });
})
