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
        should(ih.srcRoot).equal(path.join(LOCAL_DIR, 'html'));
        should(ih.dstRoot).equal(BILARA_DATA);
    });
    it("TESTTESTcustom ctor", ()=>{
        var ih = new ImportHtml({
            srcRoot: TEST_DATA,
            dstRoot: BILARA_TEST
        });
        should(ih.srcRoot).equal(TEST_DATA);
        should(ih.dstRoot).equal(BILARA_TEST);
    });
    it("TESTTESTimport(...) imports HTML file", ()=>{
        var ih = new ImportHtml({
            srcRoot: TEST_DATA,
            dstRoot: BILARA_TEST
        });
        var res = ih.import('ds1.1.html');
        should(res.suid).equal('ds1.1');
        should(res.lang).equal('pli');
//        console.log(res.segMap);
    });
})
