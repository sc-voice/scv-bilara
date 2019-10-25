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
                'sujato/sn/sn42/sn42.11_translation-en-sujato.json:5',
                'sujato/mn/mn105_translation-en-sujato.json:3',
                'sujato/mn/mn1_translation-en-sujato.json:2',
                'sujato/sn/sn56/sn56.21_translation-en-sujato.json:1',
                'sujato/mn/mn66_translation-en-sujato.json:1',
                'sujato/mn/mn116_translation-en-sujato.json:1',
                'sujato/dn/dn16_translation-en-sujato.json:1',
                // 'brahmali/pli-tv/pli-tv-kd/pli-tv-kd6_translation-en-brahmali.json:1', // TODO: Enable Vinaya later
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
                'sujato/sn/sn42/sn42.11_translation-en-sujato.json:5',
                'sujato/mn/mn105_translation-en-sujato.json:3',
                'sujato/mn/mn1_translation-en-sujato.json:2',
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
                // 'sujato/kn/dhp/dhp100-115_translation-en-sujato.json:6', // Disallow
                'sujato/dn/dn9_translation-en-sujato.json:1',
                'sujato/an/an10/an10.46_translation-en-sujato.json:1'
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
              'sabbamitta/an/an1/an1.31-40_translation-de-sabbamitta.json:10',
              'sabbamitta/an/an1/an1.21-30_translation-de-sabbamitta.json:10',
              'sabbamitta/an/an1/an1.41-50_translation-de-sabbamitta.json:2',
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
    it("isUidPattern(pattern) is true for sutta_uid patterns", function() {
        // unsupported sutta
        should(Seeker.isUidPattern('t1670b2.8')).equal(true);

        // fully specified sutta
        should(Seeker.isUidPattern('mn1/en/sujato')).equal(true);
        should(Seeker.isUidPattern(
            'mn1/en/sujato,mn1/en/bodhi')).equal(true);
        should(Seeker.isUidPattern(
            'dn7/de/kusalagnana-maitrimurti-traetow')).equal(true);

        // valid collection with a number
        should(Seeker.isUidPattern('mn2000')).equal(true);
        should(Seeker.isUidPattern('an1')).equal(true);
        should(Seeker.isUidPattern('sn22.1')).equal(true);
        should(Seeker.isUidPattern('sn22.1-20')).equal(true);
        should(Seeker.isUidPattern('mn8-11')).equal(true);
        should(Seeker.isUidPattern('mn8-11,mn9-12')).equal(true);

        // unknown but valid sutta 
        should(Seeker.isUidPattern('a1')).equal(true);
        should(Seeker.isUidPattern('mn01')).equal(true);

        // not a sutta_uid pattern
        should(Seeker.isUidPattern('red')).equal(false);
        should(Seeker.isUidPattern('thig')).equal(false);
        should(Seeker.isUidPattern('mn')).equal(false);

        // lists
        should(Seeker.isUidPattern('mn1, mn2')).equal(true);
        should(Seeker.isUidPattern('sn22-25')).equal(true);
        should(Seeker.isUidPattern('sn22.1-20,mn1')).equal(true);
        should(Seeker.isUidPattern('sn22.1-20   ,   mn1')).equal(true);
        should(Seeker.isUidPattern('sn22.1-20,red')).equal(false);
        should(Seeker.isUidPattern('red,sn22.1-20,mn1')).equal(false);
        should(Seeker.isUidPattern('sn22.1-20    ,   red')).equal(false);
        should(Seeker.isUidPattern('red,sn22.1-20')).equal(false);
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
                    'sujato/sn/sn12/sn12.23_translation-en-sujato.json:4',
                    'sujato/dn/dn33_translation-en-sujato.json:3',
                    'sujato/dn/dn34_translation-en-sujato.json:3',
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
                'sujato/sn/sn12/sn12.23_translation-en-sujato.json:4',
                'sujato/dn/dn33_translation-en-sujato.json:3',
                'sujato/dn/dn34_translation-en-sujato.json:3',
                'sujato/dn/dn10_translation-en-sujato.json:2',
                'sujato/mn/mn68_translation-en-sujato.json:2',
                'sujato/an/an10/an10.50_translation-en-sujato.json:1',
                'sujato/an/an3/an3.70_translation-en-sujato.json:1',
                'sujato/dn/dn19_translation-en-sujato.json:1',
                'sujato/dn/dn30_translation-en-sujato.json:1',
                'sujato/mn/mn34_translation-en-sujato.json:1',
                "sujato/mn/mn90_translation-en-sujato.json:1",
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
    it("keywordSearch(...) searches Pali, not English", done=>{
        (async function() { try {
            var skr = await new Seeker({
                logLevel,
            }).initialize();
            var expected = {
                method: 'keywords',
                maxResults: 5,
                lang: 'pli', // searching bilara-data/root/pli
                lines: [ 
                    'ms/an/an10/an10.93_root-pli-ms.json:9',
                    'ms/sn/sn10/sn10.8_root-pli-ms.json:9',
                    'ms/mn/mn143_root-pli-ms.json:7',
                    'ms/sn/sn55/sn55.26_root-pli-ms.json:7',
                    'ms/sn/sn55/sn55.27_root-pli-ms.json:4'
                ],
            };

            // Single Pali keyword searches Pali
            var data = await skr.keywordSearch({ 
                pattern: 'Anāthapiṇḍika',
                lang: 'en', // will be ignored
            });
            should(data).properties(expected);
            should.deepEqual(data.keywordsFound, {
                    'Anāthapiṇḍika': 221,
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
            var skr = await new Seeker({
                lang: 'de',
                logLevel,
            }).initialize();
            var expected = {
                method: 'keywords',
                maxResults: 5,
                lang: 'pli', // searching bilara-data/root/pli
                lines: [ 
                    'ms/an/an10/an10.93_root-pli-ms.json:9',
                    'ms/sn/sn10/sn10.8_root-pli-ms.json:9',
                    'ms/mn/mn143_root-pli-ms.json:7',
                    'ms/sn/sn55/sn55.26_root-pli-ms.json:7',
                    'ms/sn/sn55/sn55.27_root-pli-ms.json:4'
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
                maxResults: 10,
                method: 'keywords',
                keywordsFound: {
                    hausherr: 4,
                    anathapindika: 10,
                },
                lines: [
                    'sabbamitta/sn/sn10/sn10.8_translation-de-sabbamitta.json:4',
                    'sabbamitta/an/an2/an2.32-41_translation-de-sabbamitta.json:2',
                    'sabbamitta/an/an1/an1.248-257_translation-de-sabbamitta.json:1',
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
    it("TESTTESTpatternLanguage(...) => search language context",done=>{
        (async function() { try {
            var skr = await new Seeker({
                logLevel,
            }).initialize();
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
                    'sujato/sn/sn42/sn42.11_translation-en-sujato.json:5',
                    'sujato/mn/mn105_translation-en-sujato.json:3',
                    'sujato/mn/mn1_translation-en-sujato.json:2',
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
            'sabbamitta/sn/sn42/sn42.11_translation-de-sabbamitta.json:5',
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
            var lang = 'de';
            var pattern = "an1.1-15, sn12.23";
            var res = await skr.find({
                pattern,
                lang,
            });
            should(res).properties({
                method: 'sutta_uid',
                suttaRefs: ['an1.1-10/de', 'an1.11-20/de', 'sn12.23/de'],
                resultPattern: pattern,
                lang: 'de',
            });
            should(res.segDocs.length).equal(3);
            var sd0 = res.segDocs[0];
            should(sd0).properties({
                suid: 'an1.1-10',
                lang: 'de',
                author: 'sabbamitta',
                logLevel,
                bilaraPath: 'translation/de/sabbamitta/'+
                    'an/an1/an1.1-10_translation-de-sabbamitta.json',
            });
            should(sd0.segMap['an1.10:0.1']).equal('10 ');
            done(); 
        } catch(e) {done(e);} })();
    });
})
