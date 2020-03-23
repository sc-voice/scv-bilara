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
    var SABBAMITTA = 'translation/de/sabbamitta/sutta';
    var SUJATO = 'translation/en/sujato/sutta';
    var BRAHMALI = 'translation/en/brahmali/vinaya';
    var logLevel = false;

    var pubTest = new Publication({
        logLevel,
    });


    it("default ctor", ()=>{
        var pub = new Publication();
        should(pub).instanceOf(Publication);
        should(pub).properties({
            includeUnpublished: false,
            initialized: false,
        });
    });
    it("pubPaths() => published bilara paths", done=> {
        (async function() { try {
            var pub = await pubTest.initialize(); 
            should.deepEqual(pub.pubPaths().sort(),[
                `${SABBAMITTA}/an`,
                `${SABBAMITTA}/dn`,
                `${SABBAMITTA}/mn`,
                `${SABBAMITTA}/sn`,
                `${SUJATO}/an`,
                `${SUJATO}/dn`,
                `${SUJATO}/kn/thag`,
                `${SUJATO}/kn/thig`,
                `${SUJATO}/mn`,
                `${SUJATO}/sn`,
            ]);
            done();
        } catch(e) {done(e);} })();
    });
    it("pubPaths() => all bilara paths", done=> {
        (async function() { try {
            var pub = await pubTest.initialize();

            // Explicit
            var includeUnpublished = true;
            should.deepEqual(pub.pubPaths({includeUnpublished}).sort(),[
                `${SABBAMITTA}/an`,
                `${SABBAMITTA}/dn`,
                `${SABBAMITTA}/mn`,
                `${SABBAMITTA}/sn`,
                `${BRAHMALI}`,
                `${BRAHMALI}/pli-tv-bi-vb`,
                `${BRAHMALI}/pli-tv-bi-vb/pli-tv-bi-vb-sk`,
                `${SUJATO}/an`,
                `${SUJATO}/dn`,
                `${SUJATO}/kn/dhp`,
                `${SUJATO}/kn/thag`,
                `${SUJATO}/kn/thig`,
                `${SUJATO}/mn`,
                `${SUJATO}/sn`,
            ]);

            // Implied
            var pub = await new Publication({
                includeUnpublished,
            }).initialize(); 
            should(pub.includeUnpublished).equal(true);
            should.deepEqual(pub.pubPaths().sort(),[
                `${SABBAMITTA}/an`,
                `${SABBAMITTA}/dn`,
                `${SABBAMITTA}/mn`,
                `${SABBAMITTA}/sn`,
                `${BRAHMALI}`,
                `${BRAHMALI}/pli-tv-bi-vb`,
                `${BRAHMALI}/pli-tv-bi-vb/pli-tv-bi-vb-sk`,
                `${SUJATO}/an`,
                `${SUJATO}/dn`,
                `${SUJATO}/kn/dhp`,
                `${SUJATO}/kn/thag`,
                `${SUJATO}/kn/thig`,
                `${SUJATO}/mn`,
                `${SUJATO}/sn`,
            ]);
            done();
        } catch(e) {done(e);} })();
    });
    it("isPublishedPath(f) filters supported suttas", done=>{
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
    it("isPublishedPath(f) handles pieces of a nikaya", done=>{
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
    it("text_uidPub(...) => published divisions", done=>{
        (async function() { try {
            var pub = await new Publication({
                includeUnpublished: true,
            }).initialize();
            should(pub.text_uidInfo('pli-tv-vi')).properties({
                name: 'pli-tv-vi',
                "publication_number": "scpub8",
                "subchapters": true,
                author_name: "Bhikkhu Brahmali",
            });
            should(pub.text_uidInfo('pli-tv-bi-vb-sk')).properties({
                name: 'pli-tv-bi-vb-sk',            // generated
                subchapters: false,                 // generated
                publication_number: "scpub8.1.1",   // override
                division: "bi-vi",                  // inherited
                author_name: "Bhikkhu Brahmali",    // inherited
                is_published: 'false',              // inherited
            });
            should(pub.text_uidInfo('mn')).properties({
                "name": "mn",
                "publication_number": "scpub3",
                "subchapters": false
            });
            should(pub.text_uidInfo('dn')).properties({
                "name": "dn",
                "publication_number": "scpub2",
                "subchapters": false
            });
            should(pub.text_uidInfo('sn')).properties({
                name: 'sn',
                "publication_number": "scpub4",
                "subchapters": true
            });
            should(pub.text_uidInfo('thig')).properties({
                name: 'thig',
                "publication_number": "scpub6",
                "subchapters": false,
            });
            should(pub.text_uidInfo('thag')).properties({
                name: 'thag',
                "publication_number": "scpub1",
                "subchapters": false,
            });

            done();
        } catch(e) { done(e); }})();
    });
});
