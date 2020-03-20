(typeof describe === 'function') && describe("publication", function() {
    const path = require("path");
    const fs = require("fs");
    const should = require("should");
    const {
        Publication,
    } = require("../index");
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
    var SABBAMITTA = 'sabbamitta/sutta';
    var SUJATO = 'sujato/sutta';
    var BRAHMALI = 'brahmali/vinaya';
    var logLevel = false;

    var pubTest = new Publication({
        logLevel,
    });


    it("TESTTESTdefault ctor", ()=>{
        var pub = new Publication();
        should(pub).instanceOf(Publication);
        should(pub).properties({
            includeUnpublished: false,
            initialized: false,
        });
    });
    it("TESTTESTpublishedPaths() => published bilara paths", done=> {
        (async function() { try {
            var pub = await pubTest.initialize(); 
            should.deepEqual(pub.publishedPaths(),[
                "de/sabbamitta/sutta/an",
                "de/sabbamitta/sutta/dn",
                "de/sabbamitta/sutta/mn",
                "de/sabbamitta/sutta/sn",
                "en/sujato/sutta/an",
                "en/sujato/sutta/dn",
                "en/sujato/sutta/kn/thag",
                "en/sujato/sutta/kn/thig",
                "en/sujato/sutta/mn",
                "en/sujato/sutta/sn",
            ]);
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTpublishedPaths() => all bilara paths", done=> {
        (async function() { try {
            var pub = await new Publication({
                includeUnpublished: true,
            }).initialize(); 
            should(pub.includeUnpublished).equal(true);
            should.deepEqual(pub.publishedPaths(),[
                "de/sabbamitta/sutta/an",
                "de/sabbamitta/sutta/dn",
                "de/sabbamitta/sutta/mn",
                "de/sabbamitta/sutta/sn",
                "en/brahmali/vinaya",
                "en/brahmali/vinaya/pli-tv-bi-vb/pli-tv-bi-vb-sk",
                "en/sujato/sutta/an",
                "en/sujato/sutta/dn",
                "en/sujato/sutta/kn/dhp",
                "en/sujato/sutta/kn/thag",
                "en/sujato/sutta/kn/thig",
                "en/sujato/sutta/mn",
                "en/sujato/sutta/sn",
            ]);
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTisPublishedPath(f) filters supported suttas", done=>{
        (async function() { try {
            var pub = await pubTest.initialize(); 
        
            should(pub.isPublishedPath(ROOTPATH('mn/mn1')))
                .equal(true);
            should(pub.isPublishedPath(TRANSPATH('en', 'sujato','mn/mn1')))
                .equal(true);
            should(pub.isPublishedPath(
                TRANSPATH('en', 'sujato', `kn/thig/thig2.4`)))
                .equal(true);
            should(pub.isPublishedPath(
                TRANSPATH('en', 'sujato', `kn/dhp/dhp21-32`)))
                .equal(false);
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTisPublishedPath(f) handles pieces of a nikaya", done=>{
        (async function() { try {
            var root = path.join(__dirname, 'data', 'bilara-data' );
            var pub = new Publication({ 
                root,
                logLevel,
            });
            await pub.initialize();
        
            const bv1_root_path = ROOTPATH(`bv/bv1`);
            should(pub.isPublishedPath(bv1_root_path)).equal(true);
            const an1_71_81_path = 
                TRANSPATH('de', 'sabbamitta', `an/an1/an1.71-81`);
            should(pub.isPublishedPath(an1_71_81_path)).equal(true);
            const an2_1_10_path = 
                TRANSPATH('de', 'sabbamitta', `an/an2/an2.1-10`);
            should(pub.isPublishedPath(an1_71_81_path)).equal(true);
            const bv1_trans_path = TRANSPATH('en', 'sujato', `bv/bv1`);
            should(pub.isPublishedPath(bv1_trans_path)).equal(false);

            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTpublished(...) => published divisions", done=>{
        (async function() { try {
            var pub = await pubTest.initialize();
            var published = pub.published();
            should.deepEqual(published.mn, {
                "name": "mn",
                "publication_number": "scpub3",
                "subchapters": false
            });
            should.deepEqual(published.dn, {
                "name": "dn",
                "publication_number": "scpub2",
                "subchapters": false
            });
            should.deepEqual(published.sn, {
                name: 'sn',
                "publication_number": "scpub4",
                "subchapters": true
            });
            should.deepEqual(published.thig, {
                name: 'thig',
                "publication_number": "scpub6",
                "subchapters": false,
            });
            should.deepEqual(published.thag, {
                name: 'thag',
                "publication_number": "scpub1",
                "subchapters": false,
            });

            done();
        } catch(e) { done(e); }})();
    });
    it("TESTTESTpublishedPaths(...) => published bilara paths", done=>{
        (async function() { try {
            var pub = await pubTest.initialize();
            should.deepEqual(pub.publishedPaths(), [
`de/${SABBAMITTA}/an`,
`de/${SABBAMITTA}/dn`,
`de/${SABBAMITTA}/mn`,
`de/${SABBAMITTA}/sn`,
`en/${SUJATO}/an`,
`en/${SUJATO}/dn`,
`en/${SUJATO}/kn/thag`,
`en/${SUJATO}/kn/thig`,
`en/${SUJATO}/mn`,
`en/${SUJATO}/sn`,
            ]);

            // includeUnpublished
            var pub = await new Publication({
                includeUnpublished: true,
            }).initialize();
            should.deepEqual(pub.publishedPaths(), [
`de/${SABBAMITTA}/an`,
`de/${SABBAMITTA}/dn`,
`de/${SABBAMITTA}/mn`,
`de/${SABBAMITTA}/sn`,
`en/${BRAHMALI}`,
`en/${BRAHMALI}/pli-tv-bi-vb/pli-tv-bi-vb-sk`,
`en/${SUJATO}/an`,
`en/${SUJATO}/dn`,
`en/${SUJATO}/kn/dhp`,
`en/${SUJATO}/kn/thag`,
`en/${SUJATO}/kn/thig`,
`en/${SUJATO}/mn`,
`en/${SUJATO}/sn`,
            ]);

            done();
        } catch(e) { done(e); }})();
    });
});
