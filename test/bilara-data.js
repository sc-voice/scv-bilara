(typeof describe === 'function') && describe("bilara-data", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        BilaraData,
        SuttaCentralId,
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
            },{
                author: 'sabbamitta',
                lang: 'de',
                nikaya: 'sn',
                suid: 'sn12.3',
                translation: 'translation/de/sabbamitta/sn/sn12/sn12.3_translation-de-sabbamitta.json',
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
    it("TESTTESTnormalizeSuttaId(id) returns normalized sutta_uid", function(done) {
        this.timeout(5*1000);
        (async function() { try {
            await bd.initialize();
            should(bd.normalizeSuttaId('an2.12')).equal('an2.11-20');
            should(bd.normalizeSuttaId('an1.21-30')).equal('an1.21-30');
            should(bd.normalizeSuttaId('AN 1.21-30')).equal('an1.21-30');
            should(bd.normalizeSuttaId(' AN  1.21-30 ')).equal('an1.21-30');
            should(bd.normalizeSuttaId('An 1.21-30')).equal('an1.21-30');
            should(bd.normalizeSuttaId('Ds 1.1')).equal('ds1.1');
            should(bd.normalizeSuttaId('fear')).equal(null);
            should(bd.normalizeSuttaId('root of suffering')).equal(null);
            should(bd.normalizeSuttaId('1986')).equal(null);
            should(bd.normalizeSuttaId(' 1986')).equal(null);
            done();
        } catch(e) { done(e); } })();
    });
    it("TESTTESTtranslationPath(opts) filepath for scid", function(done) {
        (async function() { try {
            await bd.initialize();

            // Object args
            var lang = 'en';
            var sutta_uid = 'mn1';
            var spath = bd.translationPath({
                sutta_uid,
                lang,
            });
            should(spath).equal(path.join(bd.root,
                'translation/en/sujato/mn/mn1_translation-en-sujato.json'));
            should(fs.existsSync(spath)).equal(true);
            
            // argument list
            var root = 'test';
            var author = 'sujato';
            var spath = bd.translationPath(sutta_uid, lang, author);
            should(spath).equal(path.join(bd.root, 'translation/'+
                'en/sujato/mn/mn1_translation-en-sujato.json'));

            // By language
            var spath = bd.translationPath('an1.2','de');
            should(spath).equal(path.join(bd.root, 'translation/'+
                'de/sabbamitta/an/an1/an1.1-10_translation-de-sabbamitta.json'));
            should(fs.existsSync(spath)).equal(true);

            // By SuttaCentralId
            var spath = bd.translationPath('an1.2:0.3','de');
            should(spath).equal(path.join(bd.root, 'translation/'+
                'de/sabbamitta/an/an1/an1.1-10_translation-de-sabbamitta.json'));
            should(fs.existsSync(spath)).equal(true);

            // No file
            var spath = bd.translationPath('mn1','en','no-author');
            should(spath).equal(null);

            done(); 
        } catch(e) {done(e);} })();
    });

})
