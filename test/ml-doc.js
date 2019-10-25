(typeof describe === 'function') && describe("MLDoc", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const {
        FuzzyWordSet,
        SegDoc,
        MLDoc,
    } = require("../index");
    const {
        logger,
    } = require("just-simple").JustSimple;
    const BILARA_PATH = path.join(__dirname, '../local/bilara-data');
    this.timeout(5*1000);
    var logLevel = false;
    var bilaraPaths = [
        "root/pli/ms/an/an1/an1.1-10_root-pli-ms.json",
        "translation/en/sujato/"+
            "an/an1/an1.1-10_translation-en-sujato.json",
        "translation/de/sabbamitta/"+
            "an/an1/an1.1-10_translation-de-sabbamitta.json",
    ];

    it("default ctor", () => {
        should.throws(() => {
            var mld = new MLDoc();
        });
    });
    it("custom ctor", () => {
        var mld = new MLDoc({
            bilaraPaths,
        });
        should.deepEqual(mld.root_text, {
            type: 'root',
            suid: "an1.1-10",
            lang: 'pli',
            author_uid: 'ms',
            bilaraPath: bilaraPaths[0],
        });
    });
    it("load(...) loads MLDoc", done=>{
        (async function() { try {
            var mld = new MLDoc({
                bilaraPaths,
            });
            var res = await mld.load(BILARA_PATH);
            should(res).equal(mld);
            var segMap = mld.segMap;
            should(segMap['an1.9:1.2']).properties({
pli: 'Purisaraso, bhikkhave, itthiyā cittaṃ pariyādāya tiṭṭhatī”ti. ',
en: 'The taste of a man occupies a woman’s mind.” ', 
de: 'Der Geschmack eines Mannes hält den Geist einer Frau besetzt.“ ',
            });
            should(mld.suid).equal('an1.1-10');
            done();
        } catch(e) { done(e); } })();
    });
})
