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
    var SARANA = `translation/cs/ashinsarana/sutta`;
    var SABBAMITTA = 'translation/de/sabbamitta/sutta';
    var SUJATO = 'translation/en/sujato/sutta';
    var SUJATO_N = 'translation/en/sujato/name';
    var BRAHMALI = 'translation/en/brahmali/vinaya';
    var KAZ = 'translation/jpn/kaz/sutta';
    var MY = 'translation/my/my-team/sutta';
    var PTTEAM = 'translation/pt/team/sutta';
    var ENCOMM = 'translation/en/comm-team/sutta';
    var RUTEAM = 'translation/ru/team/sutta';
    var PATTON = 'translation/en/patton/sutta';
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
    it("pubPaths() => published bilara paths", async()=>{
        var pub = await pubTest.initialize(); 
        should.deepEqual(pub.pubPaths().sort(),[
            `${SARANA}/an`,
            `${SABBAMITTA}/an`,
            `${SABBAMITTA}/dn`,
            `${SABBAMITTA}/mn`,
            `${SABBAMITTA}/sn`,
            `${SABBAMITTA}/kn/dhp`,
            `${SABBAMITTA}/kn/iti`,
            `${SABBAMITTA}/kn/kp`,
            `${SABBAMITTA}/kn/snp`,
            `${SABBAMITTA}/kn/thag`,
            `${SABBAMITTA}/kn/thig`,
            `${SABBAMITTA}/kn/ud`,
            `${SUJATO}/an`,
            `${SUJATO}/dn`,
            `${SUJATO}/kn/dhp`,
            `${SUJATO}/kn/iti`,
            `${SUJATO}/kn/kp`,
            `${SUJATO}/kn/thag`,
            `${SUJATO}/kn/thig`,
            `${SUJATO}/kn/ud`,
            `${SUJATO}/mn`,
            `${SUJATO}/sn`,
            `${KAZ}/an/an4/an4.182`,
            `${KAZ}/an/an4/an4.58`,
            `${KAZ}/an/an11/an11.15`,
        ].sort());
    });
    it("pubPaths() => all bilara paths", async()=>{
        var pub = await pubTest.initialize();

        // Explicit
        var includeUnpublished = true;
        should.deepEqual(pub.pubPaths({includeUnpublished}).sort(),[
            `root/pli/bj/pli-tv-kd`,
            `root/pli/dpcv/pli-tv-kd`,
            `${SARANA}/an`,
            `${SABBAMITTA}/an`,
            `${SABBAMITTA}/dn`,
            `${SABBAMITTA}/mn`,
            `${SABBAMITTA}/sn`,
            `${SABBAMITTA}/kn/dhp`,
            `${SABBAMITTA}/kn/iti`,
            `${SABBAMITTA}/kn/kp`,
            `${SABBAMITTA}/kn/snp`,
            `${SABBAMITTA}/kn/thag`,
            `${SABBAMITTA}/kn/thig`,
            `${SABBAMITTA}/kn/ud`,
            `${BRAHMALI}`,
            `${BRAHMALI}/pli-tv-bi-vb`,
            `${BRAHMALI}/pli-tv-bu-vb`,
            `${BRAHMALI}/pli-tv-kd`,
            `${BRAHMALI}/pli-tv-pvr`,
            `${ENCOMM}/atthakatha/dn-a`,
            `${PATTON}/sa`,
            `${SUJATO_N}`,
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
            `${MY}/dn`,
            `${PTTEAM}/mn`,
            `${RUTEAM}/dn`,
        ].sort());

        // Implied
        var pub = await new Publication({
            includeUnpublished,
        }).initialize(); 
        should(pub.includeUnpublished).equal(true);
        should.deepEqual(pub.pubPaths().sort(),[
            `root/pli/bj/pli-tv-kd`,
            `root/pli/dpcv/pli-tv-kd`,
            `${SARANA}/an`,
            `${SABBAMITTA}/an`,
            `${SABBAMITTA}/dn`,
            `${SABBAMITTA}/mn`,
            `${SABBAMITTA}/sn`,
            `${SABBAMITTA}/kn/dhp`,
            `${SABBAMITTA}/kn/iti`,
            `${SABBAMITTA}/kn/kp`,
            `${SABBAMITTA}/kn/snp`,
            `${SABBAMITTA}/kn/thag`,
            `${SABBAMITTA}/kn/thig`,
            `${SABBAMITTA}/kn/ud`,
            `${BRAHMALI}`,
            `${BRAHMALI}/pli-tv-bi-vb`,
            `${BRAHMALI}/pli-tv-bu-vb`,
            `${BRAHMALI}/pli-tv-kd`,
            `${BRAHMALI}/pli-tv-pvr`,
            `${ENCOMM}/atthakatha/dn-a`,
            `${PATTON}/sa`,
            `${SUJATO_N}`,
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
            `${MY}/dn`,
            `${PTTEAM}/mn`,
            `${RUTEAM}/dn`,
        ].sort());
    });
    it("isPublishedPath(f) handles unpublished", async()=>{
        var pub = await pubTest.initialize();
        should.deepEqual(pub.unpublished, [
            'de/sabbamitta/.*/dn30_',
        ]);
        should(pub.isPublishedPath(
            `${SABBAMITTA}/dn/dn30_translation-de-sabbamitta.json`))
            .equal(false);
        should(pub.isPublishedPath(
            `${KAZ}/an/an1/an1.1-10_translation-jpn-kaz.json`))
            .equal(false);
    });
    it("isPublishedPath(f) filters supported suttas", async()=>{
        var pub = await pubTest.initialize(); 
    
        should(pub.isPublishedPath(`${KAZ}/an/an4/an4.182_translation-jpn-kaz.json`))
            .equal(true);
        should(pub.isPublishedPath(`${SUJATO}/dn/dn16_translation-en-sujato.json:1`))
            .equal(true);
        should(pub.isPublishedPath(
            `${BRAHMALI}/pli-tv-kd/pli-tv-kd6_translation-en-brahmali.json:1`))
            .equal(false);
        should(pub.isPublishedPath('iti42/de/sabbamitta')).equal(false);
        should(pub.isPublishedPath('iti42/en/sujato')).equal(true);
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
            .equal(true);
        should(pub.isPublishedPath(
            TRANSPATH('de', 'sabbamitta', `kn/thig/thig3.8`)))
            .equal(true);
    });
    it("TESTTESTisPublishedPath(f) allows unpublished paths", async()=>{
        var pub = await new Publication({
            includeUnpublished: true,
        }).initialize(); 
    
        should(pub.isPublishedPath('nonsense/en/nobody'))
            .equal(false);
        should(pub.isPublishedPath(ROOTPATH('mn/mn1')))
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
    });
    it("isPublishedPath(f) handles pieces of a nikaya", async()=>{
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
    });
    it("pubInfo(suid) => publication information", async()=>{
        var pub = await new Publication({
            includeUnpublished: true,
        }).initialize();

        // multiply published
        var pi = pub.pubInfo("an1.1-10/de/sabbamitta");
        should(pi[0].subchapters).equal(true);
        should(pi[0]).properties({
            publication_number: "scpub11",
            author_name: "Anagarika Sabbamitta",
            text_uid: "an",
            subchapters: true,
            is_published: "true",
        });
        should(pi.length).equal(1);

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
    });
});
