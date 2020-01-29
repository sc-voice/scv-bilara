(typeof describe === 'function') && describe("import-html", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        ImportHtml,
        SuttaCentralId,
    } = require("../index");
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require("just-simple").JustSimple;
    const logLevel = false;
    const TEST_DATA = path.join(__dirname, 'data');
    const BILARA_DATA = path.join(LOCAL_DIR, 'bilara-data');
    const BILARA_TEST = path.join(LOCAL_DIR, 'test-bilara');
    this.timeout(5*1000);

    function dumpSegs(n, ...segMaps) {
        var scids = Object.keys(segMaps[0]);
        scids.slice(0,n).forEach(k => console.log(
            `dbg dump ${k} ${segMaps[0][k]}  | ${segMaps[1][k]}`));
        console.log('...');
        scids.slice(scids.length-n).forEach(k => console.log(
            `dbg dump ${k} ${segMaps[0][k]}  | ${segMaps[1][k]}`));
    }

    it("default ctor", ()=>{
        var ih = new ImportHtml();
        should(ih).properties({
            srcRoot: path.join(LOCAL_DIR, 'html'),
            dstRoot: BILARA_DATA,
            type: 'root',
            author: 'ms',
            rootLang: 'pli',
            translator: 'sujato',
            transLang: 'en',
        });
    });
    it("custom ctor", ()=>{
        var srcRoot = TEST_DATA;
        var dstRoot = BILARA_TEST;
        var translator = 'sujato';
        var type = 'translation';
        var ih = new ImportHtml({
            srcRoot,
            dstRoot,
            translator,
            type,
        });
        should(ih).properties({
            srcRoot,
            dstRoot,
            translator,
            type,
        });
    });
    it("import(...) imports ds1.1 file", ()=>{
        var ih = new ImportHtml({
            srcRoot: TEST_DATA,
            dstRoot: BILARA_TEST
        });
        var res = ih.import('ds1.1.html');
        var {
            segRoot,
            segRef,
            segHtml,
            suid,
            segments,
            author,
            rootLang,
            translator,
            transLang,
        } = res;
        should(suid).equal('ds1.1');
        should(rootLang).equal('pli');
        should(author).equal('ms');
        should(translator).equal('sujato');
        should(transLang).equal('en');
        //dumpSegs(6, segRoot, segHtml);
        should(segRoot['ds1.1:0.1']).match(/Dhammasaṅgaṇī/);
        should(segRoot['ds1.1:0.2']).match(/Tikamātikā/);
        should(segRoot['ds1.1:1.0.1']).match(/1. Kusalattika/);
        should(segRoot['ds1.1:1.0.2']).match(/Namo tassa Bhagavato/);
        should(segRoot['ds1.1:1.1']).match(/Kusalā dhammā/);
        should(segRoot['ds1.1:2.1']).match(/Akusalā dhammā/);
        should(segRoot['ds1.1:3.1']).match(/Abyākatā dhammā/);
        should(segRoot['ds1.1:4.0']).match(/2. Vedanāttika/);
        should(segRoot['ds1.1:4.1']).match(/Sukhāya vedanāya/);
        should(segRoot['ds1.1:5.1']).match(/Dukkhāya vedanāya/);
        should(segRoot['ds1.1:6.1']).match(/Adukkhamasukhāya vedanāya/);
        should(fs.existsSync(path.join(BILARA_TEST, 
            'root/pli/ms/ds/ds1/ds1.1_root-pli-ms.json'))).equal(true);

        should(segRef['ds1.1:1.0.2']).match(/ms29Dhs_1/);
        should(segRef['ds1.1:1.1'])
            .match(/sc1, pts-vp-pli1, ms29Dhs_2, msdiv1/);
        should(segRef['ds1.1:2.1']).match(/sc2, ms29Dhs_3/);
        should(segRef['ds1.1:66.1']).match(/sc66, ms29Dhs_67/);
        should(segRef['ds1.1:66.2']).match(/ms29Dhs_68/);
        should(fs.existsSync(path.join(BILARA_TEST, 
            'reference/ds/ds1/ds1.1_reference.json'))).equal(true);

        should(segHtml['ds1.1:0.1'])
            .equal(`<header><p class='division'>{}</p>`);
        should(segHtml['ds1.1:0.2']).equal(`<h1>{}</h1></header>`);
        should(segHtml['ds1.1:1.0.1']).equal('<h3>{}</h3>');
        should(segHtml['ds1.1:1.0.2']).equal(`<p class='namo'>{}</p>`);
        should(segHtml['ds1.1:1.1']).equal('<p>{}</p>');
        should(segHtml['ds1.1:2.1']).equal('<p>{}</p>');
        should(segHtml['ds1.1:3.1']).equal('<p>{}</p>');
        should(segHtml['ds1.1:4.0']).equal('<h3>{}</h3>');
        should(segHtml['ds1.1:4.1']).equal('<p>{}</p>');
        should(segHtml['ds1.1:66.1']).equal('<p>{}</p>');
        should(segHtml['ds1.1:66.2'])
            .equal(`<p class='endsutta'>{}</p>`);
        should(fs.existsSync(path.join(BILARA_TEST, 
            'html/ds/ds1/ds1.1_html.json'))).equal(true);
    });
    it("import(...) imports ds1.2 file", ()=>{
        var ih = new ImportHtml({
            srcRoot: TEST_DATA,
            dstRoot: BILARA_TEST
        });
        var res = ih.import('ds1.2.html');
        var {
            segRoot,
            segRef,
            segHtml,
            suid,
            segments,
            rootLang,
        } = res;
        should(suid).equal('ds1.2');
        should(rootLang).equal('pli');
        should(segRoot['ds1.2:0.1']).equal('Dhammasaṅgaṇī');
        should(segRoot['ds1.2:0.2']).equal('Dukamātikā');
        should(segRoot['ds1.2:1.0.1']).equal('Hetugocchaka');
        should(segRoot['ds1.2:1.0.2']).equal('1. Hetuduka');
        should(segRoot['ds1.2:1.1'])
            .equal('Hetū dhammā. (**1059, 1077, 1441**)');
        should(segRoot['ds1.2:2.1'])
            .equal('Na hetū dhammā. (**1078, 1442**)');
        should(segRoot['ds1.2:3.0']).equal('2. Sahetukaduka');
        should(segRoot['ds1.2:3.1'])
            .equal('Sahetukā dhammā. (**1079, 1443**)');
        should(segRoot['ds1.2:4.1'])
            .equal('Ahetukā dhammā. (**1080, 1444**)');
        should(segRoot['ds1.2:200.1'])
            .equal('Araṇā dhammā. (**1302, 1616**)');
        should(segRoot['ds1.2:200.2'])
            .equal('Piṭṭhidukaṃ.');
        should(segRoot['ds1.2:200.3'])
            .equal('Abhidhammadukamātikā.');
        should(fs.existsSync(path.join(BILARA_TEST, 
            'root/pli/ms/ds/ds1/ds1.2_root-pli-ms.json'))).equal(true);

        should(segRef['ds1.2:1.1']).equal('sc1, ms29Dhs_69, msdiv23');
        should(segRef['ds1.2:2.1']).equal('sc2, ms29Dhs_70');
        should(segRef['ds1.2:200.1']).equal('sc200, ms29Dhs_280');
        should(segRef['ds1.2:200.2']).equal('ms29Dhs_281');
        should(fs.existsSync(path.join(BILARA_TEST, 
            'reference/ds/ds1/ds1.2_reference.json'))).equal(true);

        should(segHtml['ds1.2:0.1'])
            .equal(`<header><p class='division'>{}</p>`);
        should(segHtml['ds1.2:0.2']).equal(`<h1>{}</h1></header>`);
        should(segHtml['ds1.2:1.0.1']).equal(`<h2>{}</h2>`);
        should(segHtml['ds1.2:1.0.2']).equal(`<h3>{}</h3>`);
        should(segHtml['ds1.2:1.1']).equal(`<p>{}</p>`);
        should(segHtml['ds1.2:199.0']).equal(`<h3>{}</h3>`);
        should(segHtml['ds1.2:199.1']).equal(`<p>{}</p>`);
        should(segHtml['ds1.2:200.1']).equal(`<p>{}</p>`);
        should(segHtml['ds1.2:200.2'])
            .equal(`<p class='endsection'>{}</p>`);
        should(segHtml['ds1.2:200.3'])
            .equal(`<p class='endsutta'>{}</p>`);
        should(fs.existsSync(path.join(BILARA_TEST, 
            'html/ds/ds1/ds1.2_html.json'))).equal(true);
    });
    it("import(...) imports thag21.1 file", ()=>{
        var ih = new ImportHtml({
            srcRoot: TEST_DATA,
            dstRoot: BILARA_TEST
        });
        var res = ih.import('thag21.1.html');
        var {
            segRoot,
            segTrans,
            segVar,
            segRef,
            segHtml,
            suid,
            segments,
            rootLang,
        } = res;
        should(suid).equal('thag21.1');
        should(rootLang).equal('pli');
        should(segRoot['thag21.1:0.1']).equal('Theragāthā');
        should(segTrans['thag21.1:0.1'])
            .equal('Verses of the Senior Monks');
        should(segHtml['thag21.1:0.1'])
            .equal(`<header><p class='division'>{}`);
        should(segRef.hasOwnProperty('thag21.1:0.1')).equal(false);

        should(segRoot['thag21.1:0.2']).equal('Mahānipāta');
        should(segTrans['thag21.1:0.2']).equal('The Great Book');
        should(segHtml['thag21.1:0.2']).equal(`{}`);
        should(segRef.hasOwnProperty('thag21.1:0.2')).equal(false);

        should(segRoot['thag21.1:0.3']).equal('Paṭhamavagga');
        should(segTrans['thag21.1:0.3']).equal('Chapter One');
        should(segHtml['thag21.1:0.3']).equal(`{}</p>`);
        should(segRef.hasOwnProperty('thag21.1:0.3')).equal(false);

        should(segRoot['thag21.1:0.4']).equal('21.1. Vaṅgīsattheragāthā');
        should(segTrans['thag21.1:0.4']).equal('21.1. Vaṅgīsa');
        should(segHtml['thag21.1:0.4']).equal(`<h1>{}</h1></header>`);
        should(segRef.hasOwnProperty('thag21.1:0.4')).equal(false);
        should(segVar.hasOwnProperty('thag21.1:0.4')).equal(false);

        should(segRoot['thag21.1:1.1']).equal('“Nikkhantaṃ vata maṃ santaṃ,');
        should(segTrans['thag21.1:1.1']).equal('“Now that I’ve gone forth');
        should(segHtml['thag21.1:1.1']).equal(`<p>{}`);
        should(segRef['thag21.1:1.1'])
            .equal(`sc1, vns1219, vnp1209, pts-vp-pli109`);

        should(segRoot['thag21.1:1.2']).equal('agārasmānagāriyaṃ;');
        should(segTrans['thag21.1:1.2'])
            .equal('from the lay life to homelessness,');
        should(segHtml['thag21.1:1.2']).equal(`{}`);
        should(segRef.hasOwnProperty('thag21.1:1.2')).equal(false);
        should(segVar.hasOwnProperty('thag21.1:1.2')).equal(false);

        should(segRoot['thag21.1:2.1']).equal('Uggaputtā mahissāsā,');
        should(segRef['thag21.1:2.1']).equal('sc2, vns1220, vnp1210');

        should(segRoot['thag21.1:2.2']).equal('sikkhitā daḷhadhammino;');
        should(segTrans['thag21.1:2.2'])
            .equal('well trained, with strong bows,');
        should(segVar['thag21.1:2.2'])
            .equal(`daḷhadhammino → daḷhadhanvino (bj-a)`);

        should(fs.existsSync(path.join(BILARA_TEST, 
            'root/pli/ms/kn/thag/thag21.1_root-pli-ms.json'))).equal(true);
        should(fs.existsSync(path.join(BILARA_TEST, 
            'reference/kn/thag/thag21.1_reference.json'))).equal(true);
        should(fs.existsSync(path.join(BILARA_TEST, 
            'variant/kn/thag/thag21.1_variant-pli-ms.json'))).equal(true);
        should(fs.existsSync(path.join(BILARA_TEST, 
            'html/kn/thag/thag21.1_html.json'))).equal(true);

        dumpSegs(6, segRoot, segHtml);

        should(segRoot['thag21.1:74.1']).equal('Sīhanādaṃ naditvāna,');
        should(segTrans['thag21.1:74.1']).equal('');
        should(segVar.hasOwnProperty('thag21.1:74.1')).equal(false);
        should(segRef['thag21.1:74.1']).equal('sc74');

        should(segRoot['thag21.1:74.2']).equal('buddhaputtā anāsavā;');
        should(segTrans['thag21.1:74.2']).equal('');
        should(segHtml['thag21.1:74.2']).equal('{}');
        should(segVar.hasOwnProperty('thag21.1:74.2')).equal(false);
        should(segRef.hasOwnProperty('thag21.1:74.2')).equal(false);

        should(segRoot['thag21.1:74.3']).equal('Khemantaṃ pāpuṇitvāna,');
        should(segTrans['thag21.1:74.3']).equal('');
        should(segHtml['thag21.1:74.3']).equal('{}');
        should(segVar.hasOwnProperty('thag21.1:74.3')).equal(false);
        should(segRef.hasOwnProperty('thag21.1:74.3')).equal(false);

        should(segRoot['thag21.1:74.4']).equal('aggikhandhāva nibbutāti.');
        should(segTrans['thag21.1:74.4']).equal('');
        should(segHtml['thag21.1:74.4']).equal('{}</p>');
        should(segVar.hasOwnProperty('thag21.1:74.4')).equal(false);
        should(segRef.hasOwnProperty('thag21.1:74.4')).equal(false);

        should(segRoot['thag21.1:74.5']).equal('Theragāthāpāḷi niṭṭhitā.');
        should(segTrans['thag21.1:74.5'])
            .equal('The Verses of the Senior Monks are finished.');
        should(segHtml['thag21.1:74.5']).equal(`<p class='endbook'>{}</p>`);
        should(segVar.hasOwnProperty('thag21.1:74.5')).equal(false);
        should(segRef.hasOwnProperty('thag21.1:74.5')).equal(false);
    });
    it("import(...) imports ds2.1.1 file", ()=>{
        var ih = new ImportHtml({
            srcRoot: TEST_DATA,
            dstRoot: BILARA_TEST
        });
        var res = ih.import('ds2.1.1.html');
        var {
            segRoot,
            segRef,
            segHtml,
            suid,
            segments,
            rootLang,
        } = res;
        should(suid).equal('ds2.1.1');
        should(rootLang).equal('pli');
        //dumpSegs(5, segRoot, segHtml);
        should(segRoot['ds2.1.1:0.1']).equal('Dhammasaṅgaṇī');
        should(segRoot['ds2.1.1:0.2']).equal('2 Niddesa');
        should(segRoot['ds2.1.1:0.3']).equal('2.1 Cittuppādakaṇḍa');
        should(segRoot['ds2.1.1:1.0']).equal('2.1.1.1. Padabhājanī');
        should(segRoot['ds2.1.1:1.1']).equal('Katame dhammā kusalā?');
        should(segRoot['ds2.1.1:1.2'])
            .equal('Yasmiṃ samaye kāmāvacaraṃ kusalaṃ cittaṃ uppannaṃ hoti somanassasahagataṃ ñāṇasampayuttaṃ rūpārammaṇaṃ vā saddārammaṇaṃ vā gandhārammaṇaṃ vā rasārammaṇaṃ vā phoṭṭhabbārammaṇaṃ vā dhammārammaṇaṃ vā yaṃ yaṃ vā panārabbha, tasmiṃ samaye—');
        should(segRoot['ds2.1.1:2.1']).match(/Phasso hoti, vedanā hoti,/);
        should(segRoot['ds2.1.1:3.1']).match(/Vitakko hoti, vicāro hoti/);
    });
    it("import(...) imports vb3 file", ()=>{
        var ih = new ImportHtml({
            srcRoot: TEST_DATA,
            dstRoot: BILARA_TEST
        });
        var res = ih.import('vb3.html');
        var {
            segRoot,
            segRef,
            segHtml,
            segVar,
            suid,
            segments,
            rootLang,
        } = res;
        should(suid).equal('vb3');
        should(rootLang).equal('pli');
        should(segRoot['vb3:1.2'])
            .match(/pathavīdhātu, āpodhātu, tejodhātu, vāyodhātu,/);
        should(segVar['vb3:1.2'])
            .equal('pathavīdhātu → paṭhavīdhātu (bj, sya-all, pts-vp-pli1)');
        should.deepEqual(segVar['vb3:2.6'], [
            'nhāru → nahāru (bj, pts-vp-pli1)',  
            'aṭṭhimiñjaṃ → aṭṭhimiñjā (bj)',
        ].join(' | '));
        should(segRoot['vb3:2.6']).match(/nhāru/);
        should(segRoot['vb3:2.6']).match(/aṭṭhimiñjaṃ/);
        should.deepEqual(segVar['vb3:3.3'], [
            'sajjhaṃ → sajjhu (bj, sya-all, pts-vp-pli1)',
            'lohitaṅko → lohitaṅgo (sya-all, mr); lohitako (?)',
            'kaṭhalaṃ → kathalā (sya-all, pts-vp-pli1); kathalaṃ (mr)',
        ].join(' | '));
        should(segRoot['vb3:3.3']).match(/sajjhaṃ/);
        should(segRoot['vb3:3.3']).match(/lohitaṅko/);
        should(segRoot['vb3:3.3']).match(/kaṭhalaṃ bhūmi pāsāṇo pabbato/);
        should(segRoot['vb3:4.5']).match(/sineho sinehagataṃ/);
        should(segVar['vb3:4.5']).match(/sineho sinehagataṃ/);
        should(segRoot['vb3:7.3']).match(/palālaggi/);
        should(segVar['vb3:7.3']).match(/palālaggi/);
        should(segRoot['vb3:8.6']).match(/koṭṭhāsayā/);
        should(segVar['vb3:8.6']).match(/koṭṭhāsayā/);
        should(segRoot['vb3:9.3']).match(/verambhavātā/);
        should(segVar['vb3:9.3']).match(/verambhavātā/);
        should(segRoot['vb3:23.4']).match(/rūpā/);
        should(segVar['vb3:23.4']).match(/rūpā/);
    });
    it("import(...) imports vv22 file", ()=>{
        var ih = new ImportHtml({
            srcRoot: TEST_DATA,
            dstRoot: BILARA_TEST
        });
        var res = ih.import('vv22.html');
        var {
            segRoot,
            segRef,
            segHtml,
            segVar,
            suid,
            segments,
            rootLang,
        } = res;
        should(suid).equal('vv22');
        should(rootLang).equal('pli');
        should(segRoot['vv22:1.2']).match(/mañjiṭṭhā/);
        should(segVar['vv22:1.2']).match(/mañjiṭṭhā/);
        should(segRoot['vv22:4.1']).match(/Bhadditthikāti/);
        should(segVar['vv22:4.1']).match(/Bhadditthikāti/);
        should(segRoot['vv22:9.4']).match(/Appamādavihārinī/);
        should(segVar['vv22:9.4']).match(/Appamādavihārinī/);
        should(segRoot['vv22:9.5']).match(/Katāvāsā katakusalā/);
        should(segVar['vv22:9.5'])
            .match(/Katāvāsā … nandanaṃ: etthantare pāṭho sī pot/);
        should(segRoot['vv22:10.1']).match(/cāhaṃ/);
        should(segVar['vv22:10.1']).match("cāhaṃ → cahaṃ (bj, pts-vp-pli1-2)");
        should(segVar['vv22:10.3']).match(
            /Katāvāsā katakusalā → katāvakāsā katakusalā /);
        should(segVar['vv22:11.3']).match(
            /Katāvāsā katakusalā → katāvakāsā katakusalā .*sya2ed, pts/);
        should(segRoot['vv22:12.1']).match(/Bhadditthivimānaṃ/);
        should(segVar['vv22:12.1']).match(/Bhadditthivimānaṃ/);
    });
    it("TESTTESTimport(...) imports mil3.1.10 file", ()=>{
        var ih = new ImportHtml({
            srcRoot: TEST_DATA,
            dstRoot: BILARA_TEST
        });
        var res = ih.import('mil3.1.10.html');
        var {
            segRoot,
            segRef,
            segHtml,
            segVar,
            suid,
            segments,
            rootLang,
        } = res;
        should(suid).equal('mil3.1.10');
        should(rootLang).equal('pli');
        should(segRoot['mil3.1.10:4.1'])
            .equal('“Kallosi, bhante nāgasenā”ti.');
        should(segVar['mil3.1.10:4.1'])
            .equal("ayaṃ pāṭho maku potthake");
    });
    it("import(...) imports mil3.1.2 file", ()=>{
        var ih = new ImportHtml({
            srcRoot: TEST_DATA,
            dstRoot: BILARA_TEST
        });
        var res = ih.import('mil3.1.2.html');
        var {
            segRoot,
            segRef,
            segHtml,
            segVar,
            suid,
            segments,
            rootLang,
        } = res;
        should(suid).equal('mil3.1.2');
        should(rootLang).equal('pli');
        should(segRoot['mil3.1.2:13.1']).match(/Vassagaṇanapañho/);
        should(segVar['mil3.1.2:13.1'])
            .equal("Vassagaṇanapañho → vassapañho (maku)");
    });
})
