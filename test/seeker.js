(typeof describe === 'function') && describe("seeker", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        BilaraData,
        Seeker,
    } = require("../index");
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require("just-simple").JustSimple;

    const BILARA_PATH = path.join(LOCAL_DIR, 'bilara-data');

    it(" default ctor", ()=>{
        var skr = new Seeker();
        should(skr.root).equal(path.join(BILARA_PATH, 'translation'));
        should(skr).properties({
            logLevel: 'info',
            lang: 'en',
        });
    });
    it(" custom ctor", ()=>{
        var logLevel = 'warn';
        var lang = 'de';
        var skr = new Seeker({
            root: '/tmp/test',
            logLevel,
            lang,
        });
        should(skr.root).equal('/tmp/test');
        should(skr).properties({
            logLevel,
            lang,
        });
    });
    it("grep(...) finds en things", done=>{
        (async function() { try {
            var skr = new Seeker();
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
            var skr = new Seeker();
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
            var skr = new Seeker();
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
            var skr = new Seeker();
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
        testPattern('root of suffering', 'root +of +suffering');
        testPattern("a\nb\n\r\n\rc", 'a +b +c');
        testPattern("a\tb\t\t\rc", 'a +b +c');
        testPattern("a$b", 'a$b');
        testPattern("a.b", 'a.b');
        testPattern("a.*b", 'a.*b');
        testPattern("a.+b", 'a.+b');
        testPattern("sattānaṃ", "sattānaṃ");
    });
    it("paliPattern(pattern) should return the Pali pattern", function(){
        should(Seeker.paliPattern("jhana")).equal('jh(a|ā)(n|ṅ|ñ|ṇ)(a|ā)');
        should(Seeker.paliPattern("abcdefghijklmn"))
        .equal('(a|ā)bc(d|ḍ)efgh(i|ī)jk(l|ḷ)(m|ṁ|ṃ)(n|ṅ|ñ|ṇ)')
        should(Seeker.paliPattern("nopqrstuvwxyz"))
        .equal('(n|ṅ|ñ|ṇ)opqrs(t|ṭ)(u|ū)vwxyz');
        should(Seeker.paliPattern("[abcdefghijklmnopqrstuvwxyz]"))
        .equal('[abcdefghijklmnopqrstuvwxyz]');
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
})
