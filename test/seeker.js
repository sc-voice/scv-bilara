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

    it("TESTTEST default ctor", ()=>{
        var skr = new Seeker();
        should(skr.root).equal(path.join(BILARA_PATH, 'translation'));
        should(skr).properties({
            logLevel: 'info',
            lang: 'en',
        });
    });
    it("TESTTEST custom ctor", ()=>{
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
    it("TESTTESTgrep(...) finds en things", done=>{
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
    it("TESTTESTgrep(...) finds maxResults things", done=>{
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
    it("TESTTESTgrep(...) skips grepDeny things", done=>{
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
    it("TESTTESTgrep(...) finds de things", done=>{
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
})
