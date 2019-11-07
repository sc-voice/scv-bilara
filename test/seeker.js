(typeof describe === 'function') && describe("seeker", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        BilaraData,
        Pali,
        English,
        FuzzyWordSet,
        Seeker,
        Unicode,
    } = require("../index");
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require("just-simple").JustSimple;
    const logLevel = false;
    const SEEKEROPTS = {
        logLevel,
    };
    this.timeout(20*1000);
    const en_suj = "translation/en/sujato/";
    const de_sab = "translation/de/sabbamitta/";

    const BILARA_PATH = path.join(LOCAL_DIR, 'bilara-data');

    it("default ctor", ()=>{
        var skr = new Seeker();
        should(skr).properties({
            logLevel: 'info',
            lang: 'en',
            root: BILARA_PATH,
            paliWords: undefined,
        });
    });
    it("custom ctor", ()=>{
        var logLevel = 'warn';
        var lang = 'de';
        var paliWords = new FuzzyWordSet();
        var skr = new Seeker({
            root: '/tmp/test',
            logLevel,
            lang,
            paliWords,
        });
        should(skr.root).equal('/tmp/test');
        should(skr).properties({
            logLevel,
            lang,
        });
        should(skr.paliWords).instanceOf(FuzzyWordSet);
    });
    it("grep(...) finds en things", done=>{
        (async function() { try {
            var skr = new Seeker(SEEKEROPTS);
            var res = await skr.grep({
                pattern: "root of suffering",
            });
            should.deepEqual(res, [
                `${en_suj}sn/sn42/sn42.11_translation-en-sujato.json:5`,
                `${en_suj}mn/mn105_translation-en-sujato.json:3`,
                `${en_suj}mn/mn1_translation-en-sujato.json:2`,
                `${en_suj}sn/sn56/sn56.21_translation-en-sujato.json:1`,
                `${en_suj}mn/mn66_translation-en-sujato.json:1`,
                `${en_suj}mn/mn116_translation-en-sujato.json:1`,
                `${en_suj}dn/dn16_translation-en-sujato.json:1`,
            ]);

            done();
        } catch(e) { done(e); }})();
    });
    it("grep(...) finds maxResults things", done=>{
        (async function() { try {
            var skr = new Seeker(SEEKEROPTS);
            var res = await skr.grep({
                pattern: "root of suffering",
                maxResults: 3,
            });
            should.deepEqual(res, [
                `${en_suj}sn/sn42/sn42.11_translation-en-sujato.json:5`,
                `${en_suj}mn/mn105_translation-en-sujato.json:3`,
                `${en_suj}mn/mn1_translation-en-sujato.json:2`,
            ]);

            done();
        } catch(e) { done(e); }})();
    });
    it("grep(...) skips grepDeny things", done=>{
        (async function() { try {
            var skr = new Seeker(SEEKEROPTS);
            var res = await skr.grep({
                pattern: "a single day",
                grepDeny: new RegExp("/(dhp)/","iu"),
            });
            should.deepEqual(res, [
                `${en_suj}dn/dn9_translation-en-sujato.json:1`,
                `${en_suj}an/an10/an10.46_translation-en-sujato.json:1`
            ]);

            done();
        } catch(e) { done(e); }})();
    });
    it("grep(...) finds de things", done=>{
        (async function() { try {
            var skr = new Seeker(SEEKEROPTS);
            var res = await skr.grep({
                pattern: "wie der geist",
                lang: 'de',
            });
            should.deepEqual(res, [
              `${de_sab}an/an1/an1.31-40_translation-de-sabbamitta.json:10`,
              `${de_sab}an/an1/an1.21-30_translation-de-sabbamitta.json:10`,
              `${de_sab}an/an1/an1.41-50_translation-de-sabbamitta.json:2`,
            ]);

            done();
        } catch(e) { done(e); }})();
    });
    it("sanitizePattern(pattern) prevents code injection attacks", ()=>{
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
    it("normalizePattern(pattern) prevents code injection attacks", ()=>{
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
                        '(i|ī)(n|ṅ|ñ|ṇ)(d|ḍ)(i|ī)k(a|ā)\\b');
            should(skr.keywordPattern('anathapindika', 'pli')).equal(
                '\\b(a|ā)(n|ṅ|ñ|ṇ)(a|ā)(t|ṭ)h(a|ā)p'+
                        '(i|ī)(n|ṅ|ñ|ṇ)(d|ḍ)(i|ī)k(a|ā)');
            done();
        } catch(e) { done(e); } })();
    });
    it("keywordSearch(...) limits results", done=>{
        (async function() { try {
            var lang = 'en';
            var pattern = Seeker.normalizePattern('suffering joy faith');
            var maxResults = 3;
            var skr = await new Seeker({
                logLevel,
                maxResults,
                lang,
            }).initialize(`dbg 1`);
            var expected = {
                method: "keywords",
                lang: 'en',
                keywordsFound: {
                    faith: 310,
                    joy: 80,
                    suffering: 736,
                },
                lines: [ 
                    `${en_suj}sn/sn12/sn12.23_translation-en-sujato.json:4`,
                    `${en_suj}dn/dn33_translation-en-sujato.json:3`,
                    `${en_suj}dn/dn34_translation-en-sujato.json:3`,
                ],
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

            done(); 
        } catch(e) {done(e);} })();
    });
    it("keywordSearch(...) searches English", done=>{
        (async function() { try {
            var maxResults = 15;
            var pattern = Seeker.normalizePattern('suffering joy faith');
            var skr = await new Seeker({
                logLevel,
                lang: 'de', // Deutsch
            }).initialize(`dbg 2`);
            var expected = [ 
                `${en_suj}sn/sn12/sn12.23_translation-en-sujato.json:4`,
                `${en_suj}dn/dn33_translation-en-sujato.json:3`,
                `${en_suj}dn/dn34_translation-en-sujato.json:3`,
                `${en_suj}dn/dn10_translation-en-sujato.json:2`,
                `${en_suj}mn/mn68_translation-en-sujato.json:2`,
                `${en_suj}an/an10/an10.50_translation-en-sujato.json:1`,
                `${en_suj}an/an3/an3.70_translation-en-sujato.json:1`,
                `${en_suj}dn/dn19_translation-en-sujato.json:1`,
                `${en_suj}dn/dn30_translation-en-sujato.json:1`,
                `${en_suj}mn/mn34_translation-en-sujato.json:1`,
                `${en_suj}mn/mn90_translation-en-sujato.json:1`,
            ];

            var data = await skr.keywordSearch({ 
                pattern,
                lang: 'en', // overrides Seeker default lang
                maxResults,
            });
            var enExpected = {
                lang: 'en',
                method: 'keywords',
                keywordsFound: {
                    suffering: 736,
                    joy: 80,
                    faith: 310,
                },
                maxResults,
                lines: expected,
            };
            should(data).properties(enExpected);

            // Using Seeker default lang still returns English
            var data = await skr.keywordSearch({ 
                pattern,
                maxResults,
            });
            should(data).properties(enExpected);

            // Change Seeker default language to English
            skr.lang = 'en'; // Not advisable for multiple users
            should(skr.lang).equal('en');
            var data = await skr.keywordSearch({ 
                pattern,
                maxResults,
            });
            should(data).properties(enExpected);

            done(); 
        } catch(e) {done(e);} })();
    });
    it("TESTTESTkeywordSearch(...) searches Pali, not English", done=>{
        (async function() { try {
            var maxResults = 2;
            var skr = await new Seeker({
                maxResults,
                logLevel,
            }).initialize();
            var expected = {
                method: 'keywords',
                maxResults,
                lang: 'pli', // searching bilara-data/root/pli
                lines: [ 
                    'root/pli/ms/an/an10/an10.93_root-pli-ms.json:9',
                    'root/pli/ms/sn/sn10/sn10.8_root-pli-ms.json:9',
                ],
            };

            // Single Pali keyword searches Pali
            var data = await skr.keywordSearch({ 
                pattern: 'Anāthapiṇḍika',
                lang: 'en', // will be ignored
            });
            should(data).properties(expected);
            should.deepEqual(data.keywordsFound, {
                'Anāthapiṇḍika': 220,
            });

            // Single romanized Pali searches Pali
            var data = await skr.keywordSearch({ 
                pattern: 'anathapindika',
            });
            should(data).properties(expected);
            should.deepEqual(data.keywordsFound, {
                    'anathapindika': 221,
            });

            done(); 
        } catch(e) {done(e);} })();
    });
    it("keywordSearch(...) searches Pali, not Deutsch", done=>{
        (async function() { try {
            var maxResults = 2;
            var skr = await new Seeker({
                lang: 'de',
                maxResults,
                logLevel,
            }).initialize();
            var expected = {
                method: 'keywords',
                maxResults,
                lang: 'pli', // searching bilara-data/root/pli
                lines: [ 
                    'root/pli/ms/an/an10/an10.93_root-pli-ms.json:9',
                    'root/pli/ms/sn/sn10/sn10.8_root-pli-ms.json:9',
                ],
            };

            // Single Pali keyword searches Pali
            var data = await skr.keywordSearch({ 
                pattern: 'Anāthapiṇḍika',
                lang: 'de', // will be ignored
            });
            should(data).properties(expected);

            // Single romanized Pali searches Pali
            expected.keywordsFound = {
                'anathapindika': 221,
            };
            var data = await skr.keywordSearch({ 
                pattern: 'anathapindika',
                lang: 'de', // will be ignored
            });
            should(data).properties(expected);

            done(); 
        } catch(e) {done(e);} })();
    });
    it("keywordSearch(...) searches Deutsch, not Pali", done=>{
        (async function() { try {
            var skr = await new Seeker({
                logLevel,
                lang: 'en', // English default
            }).initialize();
            var expected = {
                lang: 'de',
                resultPattern: "anathapindika|hausherr",
                maxResults: 10,
                method: 'keywords',
                keywordsFound: {
                    hausherr: 5,
                    anathapindika: 11,
                },
                lines: [
`${de_sab}sn/sn10/sn10.8_translation-de-sabbamitta.json:4`,
`${de_sab}an/an2/an2.32-41_translation-de-sabbamitta.json:2`,
`${de_sab}an/an1/an1.248-257_translation-de-sabbamitta.json:1`,
                ],
            };

            // Mixed Pali/Deutsch keywords initial cap
            var data = await skr.keywordSearch({ 
                pattern: Seeker.normalizePattern(
                    'Anathapindika Hausherr'),
                maxResults: 10,
                lang: 'de', // Requesting Deutsch search
            });
            should.deepEqual(data, expected);

            // Mixed Pali/Deutsch keywords lowercase
            var data = await skr.keywordSearch({ 
                pattern: Seeker.normalizePattern(
                    'anathapindika hausherr'),
                maxResults: 10,
                lang: 'de', // Requesting Deutsch search
            });
            should.deepEqual(data, expected);

            done(); 
        } catch(e) {done(e);} })();
    });
    it("patternLanguage(...) => search language context",done=>{
        (async function() { try {
            var skr = await new Seeker({
                logLevel,
            }).initialize();

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
            done(); 
        } catch(e) {done(e);} })();
    });
    it("phraseSearch(...) limits English results", done=>{
        (async function() { try {
            var lang = 'en';
            var pattern = 'root of suffering';
            var maxResults = 3;
            var skr = await new Seeker({
                logLevel,
                maxResults,
                lang,
            }).initialize();
            var expected = {
                method: 'phrase',
                lang: 'en',
                pattern: `\\broot of suffering`,
                lines: [ 
                    `${en_suj}sn/sn42/sn42.11_translation-en-sujato.json:5`,
                    `${en_suj}mn/mn105_translation-en-sujato.json:3`,
                    `${en_suj}mn/mn1_translation-en-sujato.json:2`,
                ],
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

            done(); 
        } catch(e) {done(e);} })();
    });
    it("phraseSearch(...) finds Deutsch results", done=>{
        var lines = [
            `${de_sab}sn/sn42/sn42.11_translation-de-sabbamitta.json:5`,
        ];
        (async function() { try {
            var lang = 'de';
            var pattern = `wurzel des leidens`;
            var maxResults = 3;
            var skr = await new Seeker({
                lang,
                maxResults,
                logLevel,
            }).initialize();

            var data = await skr.phraseSearch({ 
                pattern,
                lang,
            });
            should.deepEqual(data, {
                method: 'phrase',
                lang,
                pattern: `\\bwurzel des leidens`,
                lines,
            });

            done(); 
        } catch(e) {done(e);} })();
    });
    it("find(...) finds sutta references", done=>{
        (async function() { try {
            var maxResults = 3;
            var skr = await new Seeker({
                maxResults,
                logLevel,
            }).initialize();

            // lists of suttas with ranges
            var lang = 'de';
            // The pattern resolves to 4 suttas, of which 3 are returned
            var pattern = "sn12.23, an1.2-25"; 
            var res = await skr.find({
                pattern,
                lang,
                matchHighlight: false,
            });
            should(res.method).equal('sutta_uid');
            should(res.maxResults).equal(maxResults);
            should.deepEqual(res.suttaRefs,
                ['sn12.23', 'an1.1-10', 'an1.11-20', ]);
            should(res.resultPattern).equal(pattern);
            should(res.lang).equal('de');
            should(res.mlDocs.length).equal(3);
            var [mld0, mld1] = res.mlDocs;
            should(mld0).properties({
                suid: 'sn12.23',
                logLevel,
            });
            should(mld1).properties({
                suid: 'an1.1-10',
                logLevel,
            });
            should.deepEqual(mld1.bilaraPaths.sort(), [
                'root/pli/ms/'+
                    'an/an1/an1.1-10_root-pli-ms.json',
                `${en_suj}an/an1/an1.1-10_translation-en-sujato.json`,
                'translation/de/sabbamitta/'+
                    'an/an1/an1.1-10_translation-de-sabbamitta.json',
            ].sort());
            should.deepEqual(mld1.segMap['an1.10:0.1'], {
                scid: 'an1.10:0.1',
                en: '10 ',
                de: '10 ',
                pli: '10 ',
            });
            done(); 
        } catch(e) {done(e);} })();
    });
    it("find(...) finds mn1/en/sujato", done=>{
        (async function() { try {
            var maxResults = 3;
            var skr = await new Seeker({
                maxResults,
                logLevel,
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
            should(res.lang).equal('de');
            should(res.mlDocs.length).equal(1);
            var segments = mld0.segments();
            should(segments.length).equal(334);
            should.deepEqual(segments[22],{
                scid: 'mn1:5.2',
                pli: 'tejaṃ tejato saññatvā tejaṃ maññati, '+
                    'tejasmiṃ maññati, tejato maññati, '+
                    'tejaṃ meti maññati, tejaṃ abhinandati. ',
                en: 'But then they identify with fire … ',
            });
            done(); 
        } catch(e) {done(e);} })();
    });
    it("find(...) finds an1.2 part of an1.1-10", done=>{
        (async function() { try {
            var maxResults = 3;
            var skr = await new Seeker({
                maxResults,
                logLevel,
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
            should.deepEqual(res.suttaRefs, ['an1.1-10']);
            should(res.resultPattern).equal(pattern);
            should(res.lang).equal('de');
            should(res.mlDocs.length).equal(1);
            var segments = mld0.segments();
            should(segments.length).equal(4);
            should.deepEqual(segments.reduce((a,s) => {
                var scid = s.scid;
                a[scid] = a.hasOwnProperty(scid) ? a[scid] + 1 : 1;
                return a;
            }, {}), {
                "an1.2:0.1" : 1,
                "an1.2:1.1" : 1,
                "an1.2:1.2" : 1,
                "an1.2:1.3" : 1,
            });
            done(); 
        } catch(e) {done(e);} })();
    });
    it("find(...) does not find legacy suttas", done=>{
        (async function() { try {
            var maxResults = 3;
            var skr = await new Seeker({
                maxResults,
                logLevel,
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
            should(res.maxResults).equal(maxResults);
            should.deepEqual(res.suttaRefs, ['mn1/en/bodhi']);
            should(res.resultPattern).equal(pattern);
            should(res.lang).equal('de');
            should(res.mlDocs.length).equal(0);
            done(); 
        } catch(e) {done(e);} })();
    });
    it("find({minLang}) => minimum language count", done=>{
        (async function() { try {
            var maxResults = 3;
            var skr = await new Seeker({
                maxResults,
                logLevel,
            }).initialize();

            var pattern = "dn33"; 
            var res = await skr.find({
                pattern,
                lang: 'de',
                minLang: 2,
            });
            should.deepEqual(res.suttaRefs, ['dn33']);
            should(res.mlDocs.length).equal(1);
            should(res.minLang).equal(2);

            // DN33 currently has no Deutsch translation
            var res = await skr.find({
                pattern,
                lang: 'de',
                minLang: 3,
            });
            should.deepEqual(res.suttaRefs, ['dn33']);
            should(res.mlDocs.length).equal(0);

            done(); 
        } catch(e) {done(e);} })();
    });
    it("find(...) => finds phrase", done=>{
        (async function() { try {
            var maxResults = 3;
            var skr = await new Seeker({
                maxResults,
                logLevel,
            }).initialize();

            var pattern = "root of suffering"; 
            var res = await skr.find({
                pattern,
                lang: 'de',
                minLang: 2,
                filterSegments: false, // return entire sutta
            });
            should.deepEqual(res.suttaRefs, [
                'sn42.11/en/sujato',
                'mn105/en/sujato',
                'mn1/en/sujato',
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
                pli: "Saṃyutta Nikāya 42 ",
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
            done(); 
        } catch(e) {done(e);} })();
    });
    it("find(...) => finds keywords", done=>{
        (async function() { try {
            var maxResults = 3;
            var skr = await new Seeker({
                maxResults,
                logLevel,
            }).initialize();

            var pattern = "sn leidens"; 
            var res = await skr.find({
                pattern,
                lang: 'de',
                minLang: 2,
            });
            should.deepEqual(res.suttaRefs, [
                'sn42.11/de/sabbamitta',
                'sn12.19/de/sabbamitta',
                'sn45.8/de/sabbamitta',
            ]);
            var [
                mld0,
                mld1,
                mld2,
            ] = res.mlDocs;
            should(res.mlDocs.length).equal(3);
            should(res.minLang).equal(2);
            should(mld0.segments()[0]).properties({
                scid: 'sn42.11:1.4',
                de: "„Vorsteher, wenn ich dir das Entstehen und Aufhören "+
                    "des \u001b[38;5;121mLeidens\u001b[0m in der "+
                    "Vergangenheit erklären würde: ",
                en: "“Chief, if I were to teach you about the origin "+
                    "and ending of suffering in the past, saying ",
            });
            done(); 
        } catch(e) {done(e);} })();
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
})
