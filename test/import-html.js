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

    it("default ctor", ()=>{
        var ih = new ImportHtml();
        should(ih).properties({
            srcRoot: path.join(LOCAL_DIR, 'html'),
            dstRoot: BILARA_DATA,
            type: 'root',
            translator: 'ms',
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
    it("TESTTESTimport(...) imports ds1.1 file", ()=>{
        var ih = new ImportHtml({
            srcRoot: TEST_DATA,
            dstRoot: BILARA_TEST
        });
        var res = ih.import('ds1.1.html');
        var {
            segRoot,
            segRef,
            segMarkup,
            suid,
            segments,
            lang,
        } = res;
        should(suid).equal('ds1.1');
        should(lang).equal('pli');
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
            'root/pli/ms/ds1/ds1.1_root-pli-ms.json'))).equal(true);

        should(segRef['ds1.1:1.0.2']).match(/ms29Dhs_1/);
        should(segRef['ds1.1:1.1'])
            .match(/sc1, pts-vp-pli1, ms29Dhs_2, msdiv1/);
        should(segRef['ds1.1:2.1']).match(/sc2, ms29Dhs_3/);
        should(segRef['ds1.1:66.1']).match(/sc66, ms29Dhs_67/);
        should(segRef['ds1.1:66.2']).match(/ms29Dhs_68/);
        should(fs.existsSync(path.join(BILARA_TEST, 
            'reference/ds1/ds1.1_reference.json'))).equal(true);

        //Object.keys(segRoot).slice(70).forEach(k => {
            //console.log(`dbg segMarkup`, k, segMarkup[k], segRoot[k]);
        //});
        should(segMarkup['ds1.1:0.1']).match(/section.*ds1.1.*division/);
        should(segMarkup['ds1.1:0.2']).equal('<p>{}<\/p>');
        should(segMarkup['ds1.1:1.0.1']).equal('<h3>{}<\/h3>');
        should(segMarkup['ds1.1:1.0.2']).equal('<p>{}');
        should(segMarkup['ds1.1:1.1']).equal('{}');
        should(segMarkup['ds1.1:2.1']).equal('{}');
        should(segMarkup['ds1.1:3.1']).equal('{}<\/p>');
        should(segMarkup['ds1.1:4.0']).equal('<h3>{}<\/h3>');
        should(segMarkup['ds1.1:4.1']).equal('<p>{}');
        should(segMarkup['ds1.1:66.2']).equal(
            `{}</p><p class='endsection'>`);
        should(segMarkup["~"]).equal(
            "</p></article></section></body></html>");
    });
    it("import(...) imports ds1.2 file", ()=>{
        return; // TODO
        var ih = new ImportHtml({
            srcRoot: TEST_DATA,
            dstRoot: BILARA_TEST
        });
        var res = ih.import('ds1.2.html');
        var {
            segRoot,
            segRef,
            suid,
            segments,
            lang,
        } = res;
        should(suid).equal('ds1.2');
        should(lang).equal('pli');
        should(segRoot['ds1.2:0.1']).match(/Dhammasaṅgaṇī/);
        should(segRoot['ds1.2:0.2']).match(/Tikamātikā/);
        should(segRoot['ds1.2:1.0.1']).match(/1. Kusalattika/);
        should(segRoot['ds1.2:1.0.2']).match(/Namo tassa Bhagavato/);
        should(segRoot['ds1.2:1.1']).match(/Kusalā dhammā/);
        should(segRoot['ds1.2:2.1']).match(/Akusalā dhammā/);
        should(segRoot['ds1.2:3.1']).match(/Abyākatā dhammā/);
        should(segRoot['ds1.2:4.0']).match(/2. Vedanāttika/);
        should(segRoot['ds1.2:4.1']).match(/Sukhāya vedanāya/);
        should(segRoot['ds1.2:5.1']).match(/Dukkhāya vedanāya/);
        should(segRoot['ds1.2:6.1']).match(/Adukkhamasukhāya vedanāya/);
        should(fs.existsSync(path.join(BILARA_TEST, 
            'root/pli/ms/ds1/ds1.2_root-pli-ms.json'))).equal(true);

        should(segRef['ds1.2:1.0.2']).match(/ms29Dhs_1/);
        should(segRef['ds1.2:1.1'])
            .match(/sc1, pts-vp-pli1, ms29Dhs_2, msdiv1/);
        should(segRef['ds1.2:2.1']).match(/sc2, ms29Dhs_3/);
        should(segRef['ds1.2:66.1']).match(/sc66, ms29Dhs_67/);
        should(segRef['ds1.2:66.2']).match(/ms29Dhs_68/);
        should(fs.existsSync(path.join(BILARA_TEST, 
            'reference/ds1/ds1.2_reference.json'))).equal(true);
    });
})
