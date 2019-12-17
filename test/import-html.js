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
    it("TESTTESTimport(...) imports thag21.1 file", ()=>{
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
    it("TESTTESTimport(...) imports ds2.1.1 file", ()=>{
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
        should.deepEqual(segRoot['ds2.1.1:1.1'].split('\n'),[
            'Katame dhammā kusalā?',
            'Yasmiṃ samaye kāmāvacaraṃ kusalaṃ cittaṃ uppannaṃ hoti somanassasahagataṃ ñāṇasampayuttaṃ rūpārammaṇaṃ vā saddārammaṇaṃ vā gandhārammaṇaṃ vā rasārammaṇaṃ vā phoṭṭhabbārammaṇaṃ vā dhammārammaṇaṃ vā yaṃ yaṃ vā panārabbha, tasmiṃ samaye—'
        ]);
        should(segRoot['ds2.1.1:2.1']).match(/Phasso hoti, vedanā hoti,/);
        should(segRoot['ds2.1.1:3.1']).match(/Vitakko hoti, vicāro hoti/);
    });
})
