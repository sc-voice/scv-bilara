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
    var SENIYA = 'translation/id/seniya/sutta';
    var SUJATO = 'translation/en/sujato/sutta';
    var SUJATO_N = 'translation/en/sujato/name';
    var BRAHMALI = 'translation/en/brahmali/vinaya';
    var KAZ = 'translation/jpn/kaz/sutta';
    var MADHU = 'translation/si/madhu/sutta';
    var MY = 'translation/my/my-team/sutta';
    var PTTEAM = 'translation/pt/laera-quaresma/sutta';
    var ENCOMM = 'translation/en/comm-team/sutta';
    var ENCOVITO = 'translation/en/kovilo/sutta';
    var ENSOMA = 'translation/en/soma/sutta';
    var RUTEAM = 'translation/ru/team/sutta';
    var PATTON = 'translation/en/patton/sutta';
    var logLevel = 'warn';

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
        //pub.logLevel = 'debug';
        let pubPaths = pub.pubPaths();
        should(pubPaths.indexOf(`${SABBAMITTA}/an`)).above(-1);
        should(pubPaths.indexOf(`${SUJATO}/an`)).above(-1);
        should(pubPaths.indexOf(`${BRAHMALI}`)).above(-1);
        should(pubPaths.indexOf(`${MADHU}`)).below(0);
    });
    it("pubPaths() => all bilara paths", async()=>{
      return; // DEPRECATED
      var pub = await pubTest.initialize();

      // Explicit
      var includeUnpublished = true;
      let unpubPaths = pub.pubPaths({includeUnpublished});
      should(unpubPaths.indexOf(`${SABBAMITTA}/an`)).above(-1);
      should(unpubPaths.indexOf(`${SUJATO}/an`)).above(-1);
      should(unpubPaths.indexOf(`${BRAHMALI}`)).above(-1);
      should(unpubPaths.indexOf(`${MADHU}/kn`)).above(-1);
    });
    it("isPublishedPath(f) filters supported suttas", async()=>{
        var pub = await pubTest.initialize(); 
        //pub.logLevel = 'debug';
    
        should(pub.isPublishedPath(
            TRANSPATH('de', 'sabbamitta', `kn/thig/thig3.8`)))
            .equal(true);
        should(pub.isPublishedPath(`${KAZ}/an/an4/an4.182_translation-jpn-kaz.json`))
            .equal(true);
        should(pub.isPublishedPath(`${SUJATO}/dn/dn16_translation-en-sujato.json:1`))
            .equal(true);
        should(pub.isPublishedPath(
            `${BRAHMALI}/pli-tv-kd/pli-tv-kd6_translation-en-brahmali.json:1`))
            .equal(true);
        should(pub.isPublishedPath('iti42/de/sabbamitta')).equal(false);
        should(pub.isPublishedPath('iti42/en/sujato')).equal(true);
        should(pub.isPublishedPath('nonsense/en/nobody'))
            .equal(false);
        should(pub.isPublishedPath('pli-tv-bu-vb-pj1/en/brahmali'))
            .equal(true);
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
    });
    it("isPublishedPath(f) allows unpublished paths", async()=>{
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
            author_name: "Sabbamitta",
            text_uid: "an",
            subchapters: true,
            is_published: true,
        });
        should(pi.length).equal(1);

        // vinaya
        var pi = pub.pubInfo("pli-tv-bu-vb-pj4");
        should(pi[0]).properties({
            publication_number: "scpub8.2",
            author_name: "Bhikkhu Brahmali",
            text_uid: "pli-tv-bu-vb",
            subchapters: false,
            is_published: true,
        });
        should(pi.length).equal(2);

        var [ pi0, pi1 ] = pub.pubInfo("pli-tv-bi-vb-sk1");
        should(pi0).properties({
            publication_number: "scpub8.1",
            author_name: "Bhikkhu Brahmali",
            text_uid: "pli-tv-bi-vb",
            subchapters: false,
            is_published: true,
        });
        should(pi.length).equal(2);

        // published generic
        var pi = pub.pubInfo("mn1");
        should(pi[0]).properties({
            publication_number: "scpub3",
            author_name: "Bhikkhu Sujato",
            text_uid: "mn",
            subchapters: false,
            is_published: true,
        });
        should(pi.length).above(2);

        // published specific
        var pi = pub.pubInfo("mn1/en/sujato");
        should(pi.length).equal(1);
        should(pi[0]).properties({
            publication_number: "scpub3",
            author_name: "Bhikkhu Sujato",
            text_uid: "mn",
            subchapters: false,
            is_published: true,
        });

        // unavailable
        var pi = pub.pubInfo("mn1/de/sabbamitta");
        should(pi.length).equal(0);
    });
});
