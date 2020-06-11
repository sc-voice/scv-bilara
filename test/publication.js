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
    var KAZ = 'translation/jpn/kaz/sutta';
    var PTTEAM = 'translation/pt/team/sutta';
    var RUTEAM = 'translation/ru/team/sutta';
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
                `${BRAHMALI}/pli-tv-bu-vb`,
                `${BRAHMALI}/pli-tv-kd`,
                `${BRAHMALI}/pli-tv-pvr`,
                `${SUJATO}/an`,
                `${SUJATO}/dn`,
                `${SUJATO}/kn/dhp`,
                `${SUJATO}/kn/iti`,
                `${SUJATO}/kn/kp`,
                `${SUJATO}/kn/snp`,
                `${SUJATO}/kn/thag`,
                `${SUJATO}/kn/thig`,
                `${SUJATO}/kn/ud`,
                `${SUJATO}/mn`,
                `${SUJATO}/sn`,
                `${KAZ}/an`,
                `${PTTEAM}/mn`,
                `${RUTEAM}/dn`,
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
                `${BRAHMALI}/pli-tv-bu-vb`,
                `${BRAHMALI}/pli-tv-kd`,
                `${BRAHMALI}/pli-tv-pvr`,
                `${SUJATO}/an`,
                `${SUJATO}/dn`,
                `${SUJATO}/kn/dhp`,
                `${SUJATO}/kn/iti`,
                `${SUJATO}/kn/kp`,
                `${SUJATO}/kn/snp`,
                `${SUJATO}/kn/thag`,
                `${SUJATO}/kn/thig`,
                `${SUJATO}/kn/ud`,
                `${SUJATO}/mn`,
                `${SUJATO}/sn`,
                `${KAZ}/an`,
                `${PTTEAM}/mn`,
                `${RUTEAM}/dn`,
            ]);
            done();
        } catch(e) {done(e);} })();
    });
    it("isPublishedPath(f) filters supported suttas", done=>{
        (async function() { try {
            var pub = await pubTest.initialize(); 
        
            should(pub.isPublishedPath('nonsense/en/nobody'))
                .equal(false);
            should(pub.isPublishedPath('pli-tv-bu-vb-pj1/en/brahmali'))
                .equal(false);
            should(pub.isPublishedPath('mn1')).equal(true);
            should(pub.isPublishedPath('mn1/en/sujato')).equal(true);
            should(pub.isPublishedPath('mn1/en/nobody')).equal(false);
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
    it("isPublishedPath(f) allows unpublished paths", done=>{
        (async function() { try {
            var pub = await new Publication({
                includeUnpublished: true,
            }).initialize(); 
        
            should(pub.isPublishedPath('nonsense/en/nobody'))
                .equal(false);
            should(pub.isPublishedPath(ROOTPATH('mn/mn1')))
                .equal(true);
            should(pub.isPublishedPath(ROOTPATH('mn1')))
                .equal(true);
            should(pub.isPublishedPath('pli-tv-bu-vb-pj1/en/brahmali'))
                .equal(true);
            should(pub.isPublishedPath(TRANSPATH('en', 'sujato','mn/mn1')))
                .equal(true);
            should(pub.isPublishedPath(
                TRANSPATH('en', 'sujato', `kn/thig/thig2.4`)))
                .equal(true);
            should(pub.isPublishedPath(
                TRANSPATH('en', 'sujato', `kn/dhp/dhp21-32`)))
                .equal(true);
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
    it("TESTTESTpubInfo(suid) => publication information", done=>{
        (async function() { try {
            var pub = await new Publication({
                includeUnpublished: true,
            }).initialize();

            // vinaya
            var pi = pub.pubInfo("pli-tv-bu-vb-pj4");
            should(pi[0]).properties({
                publication_number: "scpub8.2",
                author_name: "Bhikkhu Brahmali",
                text_uid: "pli-tv-bu-vb",
                subchapters: false,
                is_published: "false",
            });
            should(pi.length).equal(1);


            // multiply published
            var pi = pub.pubInfo("an1.1-10/de/sabbamitta");
            should(pi[0]).properties({
                publication_number: "scpub11",
                author_name: "Anagarika Sabbamitta",
                text_uid: "an",
                subchapters: true,
                is_published: "true",
            });
            should(pi.length).equal(1);

            // unpublished
            var pi = pub.pubInfo("pli-tv-bi-vb-sk1-75");
            should(pi.length).equal(1);
            should(pi[0]).properties({
                publication_number: "scpub8.1",
                author_name: "Bhikkhu Brahmali",
                text_uid: "pli-tv-bi-vb",
                subchapters: false,
                is_published: "false",
            });

            // published generic
            var pi = pub.pubInfo("mn1");
            should(pi.length).equal(1);
            should(pi[0]).properties({
                publication_number: "scpub3",
                author_name: "Bhikkhu Sujato",
                text_uid: "mn",
                subchapters: false,
                is_published: "true",
            });

            // published specific
            var pi = pub.pubInfo("mn1/en/sujato");
            should(pi.length).equal(1);
            should(pi[0]).properties({
                publication_number: "scpub3",
                author_name: "Bhikkhu Sujato",
                text_uid: "mn",
                subchapters: false,
                is_published: "true",
            });

            // unavailable
            var pi = pub.pubInfo("mn1/de/sabbamitta");
            should(pi.length).equal(0);

            done();
        } catch(e) { done(e); }})();
    });
});
