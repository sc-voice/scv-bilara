(typeof describe === 'function') && describe("bilara-data", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        BilaraData,
    } = require("../index");
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require("just-simple").JustSimple;

    var bd = new BilaraData(); 

    it("default ctor", () => {
        const LOCAL = path.join(__dirname, '..', 'local');
        should(bd).instanceOf(BilaraData);
        should(bd.root).equal(`${LOCAL}/bilara-data`);
        should.deepEqual(bd.nikayas.sort(), [
            'mn', 'sn', 'dn', 'an', 'kn',
        ].sort());
        should(bd).properties({
            logLevel: 'info',
        });
    });
    it("initialize() must be called", (done) => {
        this.timeout(5*1000);
        (async function() { try {
            var newbd = new BilaraData();
            should(newbd.initialized).equal(false);
            should.throws(() => {
                newbd.suttaInfo('dn33');
            });
            var res = await bd.initialize();
            should(res).equal(bd);
            should(bd.initialized).equal(true);

            done();
        } catch(e) {done(e);} })();
    });
    it("suttaInfo(...) returns sutta metadata", done=>{
        (async function() { try {
            await bd.initialize();
            should.deepEqual(bd.suttaInfo('dn33'), [{
                author: 'sujato',
                lang: 'en',
                nikaya: 'dn',
                suid: 'dn33',
                translation: 'translation/en/sujato/dn/dn33_translation-en-sujato.json',
            }]);
            should.deepEqual(bd.suttaInfo('sn12.3'), [{
                author: 'sujato',
                lang: 'en',
                nikaya: 'sn',
                suid: 'sn12.3',
                translation: 'translation/en/sujato/sn/sn12/sn12.3_translation-en-sujato.json',
            }]);
            should.deepEqual(bd.suttaInfo('an2.1-10'), [{
                author: 'sujato',
                lang: 'en',
                nikaya: 'an',
                suid: 'an2.1-10',
                translation: 'translation/en/sujato/an/an2/an2.1-10_translation-en-sujato.json',
            },{
                author: 'sabbamitta',
                lang: 'de',
                nikaya: 'an',
                suid: 'an2.1-10',
                translation: 'translation/de/sabbamitta/an/an2/an2.1-10_translation-de-sabbamitta.json',
            }]);
            done();
        } catch(e) {done(e);} })();
    });
    it("loadTranslation(...) loads translation JSON", done=>{
        (async function() { try {
            await bd.initialize();
            var dn33 = bd.loadTranslation({
                suid: 'dn33',
            });
            should(dn33).properties({
                suid: 'dn33',
                author: 'sujato',
                lang: 'en',
            });
            should(dn33.segMap['dn33:1.10.31'])
                .equal('form, formlessness, and cessation. '); 
            should.deepEqual(dn33.scids().slice(0,10), [
                'dn33:0.1',
                'dn33:0.2',
                'dn33:1.1.1',
                'dn33:1.1.2',
                'dn33:1.1.3',
                'dn33:1.2.1',
                'dn33:1.2.2',
                'dn33:1.2.3',
                'dn33:1.2.4',
                'dn33:1.2.5',
            ]);
            done();
        } catch(e) {done(e);} })();
    });

})
