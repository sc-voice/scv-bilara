(typeof describe === 'function') && describe("bilara-path", function() {
    const should = require("should");
    const {
        BilaraPathMap,
        BilaraData,
    } = require("../index");
    this.timeout(5*1000);

    var bd = new BilaraData;
    function ROOTPATH(mid) {
        var lang = 'pli';
        var auth = 'ms';
        return [
            'root',
            lang,
            `${auth}/sutta`,
            `${mid}_root-${lang}-${auth}.json`
        ].join('/');
    }
    function CMTPATH(lang,auth,mid) {
        return [
            'comment',
            lang,
            `${auth}/sutta`,
            `${mid}_comment-${lang}-${auth}.json`
        ].join('/');
    }
    function TRANSPATH(lang,auth,mid) {
        return [
            'translation',
            lang,
            `${auth}/sutta`,
            `${mid}_translation-${lang}-${auth}.json`
        ].join('/');
    }

    it("TESTTESTdefault ctor",done=>{
        (async function() { try {
            var bpm = new BilaraPathMap();
            should(bpm.initialized).equal(false);
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTsuidPath(suid) returns local bilara paths",done=>{
        (async function() { try {
            var bpm = new BilaraPathMap()
            should.throws(()=>{bpm.suidPaths('dn33');});
            await bpm.initialize();

            // must be initialized
            should(bpm.initialized).equal(true);
            should.deepEqual(bpm.suidPaths('dn33'), {
"html/pli/ms": "html/pli/ms/sutta/dn/dn33_markup.json",
"reference/pli/ms": "reference/pli/ms/sutta/dn/dn33_reference.json",
"root/pli/ms": "root/pli/ms/sutta/dn/dn33_root-pli-ms.json",
"variant/pli/ms": "variant/pli/ms/sutta/dn/dn33_variant-pli-ms.json",
"comment/en/sujato": CMTPATH('en','sujato','dn/dn33'),
"translation/en/sujato": TRANSPATH('en', 'sujato', 'dn/dn33'),
"translation/de/sabbamitta": TRANSPATH('de','sabbamitta','dn/dn33'),
            });
            done();
        } catch(e) {done(e);} })();
    });
})
