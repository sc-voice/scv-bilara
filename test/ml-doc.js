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
    var t1 = {
        author_uid: "sujato",
        uid: 'an1.1-10',
        lang: 'en',
        bilaraPath: "translation/en/sujato/"+
            "an/an1/an1.1-10_translation-en-sujato.json",
    };
    var t2 = {
        lang: 'de',
        bilaraPath: "translation/de/sabbamitta/"+
            "an/an1/an1.1-10_translation-de-sabbamitta.json",
    };
    var t3 = {
        lang: 'pt',
        bilaraPath: "translation/pt/gabriel_l/"+
            "an/an1/an1.1-10_translation-pt-gabriel_l.json",
    };
    var root_text = {
        bilaraPath: "root/pli/ms/an/an1/an1.1-10_root-pli-ms.json",
    };

    it("TESTTESTdefault ctor", () => {
        var mld = new MLDoc();
        should(mld).properties({
            logLevel: 'info',
            root_text: {},
            translations: [],
        });
    });
    it("TESTTESTcustom ctor", () => {
        // primary customization properties
        var mld = new MLDoc({
            root_text,
            translations: [t1, t2],
        });
        should(mld).properties({
            root_text,
            translations: [t1, t2],
        });
    });
    it("TESTTESTload(...) loads MLDoc", done=>{
        (async function() { try {
            var mld = new MLDoc({
                root_text,
                translations: [t1, t2],
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
