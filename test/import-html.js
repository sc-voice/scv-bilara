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
    const BILARA_TEST = path.join(LOCAL_DIR, 'bilara-test');

    it("TESTTESTdefault ctor", ()=>{
        var ih = new ImportHtml();
        should(ih).properties({
            srcRoot: path.join(LOCAL_DIR, 'html'),
            dstRoot: BILARA_DATA,
            type: 'root',
            translator: 'ms',
        });
    });
    it("TESTTESTcustom ctor", ()=>{
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
    it("TESTTESTimport(...) imports HTML file", ()=>{
        var ih = new ImportHtml({
            srcRoot: TEST_DATA,
            dstRoot: BILARA_TEST
        });
        var res = ih.import('ds1.1.html');
        var {
            segMap,
            suid,
            segments,
            lang,
        } = res;
        should(suid).equal('ds1.1');
        should(lang).equal('pli');
        should(segMap['ds1.1:0.1']).match(/Dhammasaṅgaṇī/);
        should(segMap['ds1.1:0.2']).match(/Tikamātikā/);
        should(segMap['ds1.1:1.0.1']).match(/1. Kusalattika/);
        should(segMap['ds1.1:1.1']).match(/Kusalā dhammā/);
        should(segMap['ds1.1:2.1']).match(/Akusalā dhammā/);
        should(segMap['ds1.1:3.1']).match(/Abyākatā dhammā/);
        should(segMap['ds1.1:4.0']).match(/2. Vedanāttika/);
        should(segMap['ds1.1:4.1']).match(/Sukhāya vedanāya/);
        should(segMap['ds1.1:5.1']).match(/Dukkhāya vedanāya/);
        should(segMap['ds1.1:6.1']).match(/Adukkhamasukhāya vedanāya/);
    });
})
