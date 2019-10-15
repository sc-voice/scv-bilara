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
            'mn', 'sn', 'dn', 'an', 'kn/thag', 'kn/thig'
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
    it("TESTTESTisSuttaPath(f) filters supported suttas", ()=>{
        should(bd.isSuttaPath(
            'translation/en/sujato/mn/mn1_translation-en-sujato.json'))
            .equal(true);
        should(bd.isSuttaPath(
            'translation/en/sujato/kn/thig/thig2.4_translation-en-sujato.json'))
            .equal(true);
        should(bd.isSuttaPath(
            'translation/en/sujato/kn/dhp/dhp21-32_translation-en-sujato.json'))
            .equal(false);
    });
    it("TESTTESTsuttaInfo(...) returns sutta metadata", done=>{
        this.timeout(5*1000);
        (async function() { try {
            await bd.initialize();
            var dn33Pli = {
                author: 'ms',
                lang: 'pli',
                nikaya: 'dn',
                suid: 'dn33',
                bilaraPath: 'root/pli/ms/dn/dn33_root-pli-ms.json',
            };
            var dn33En = {
                author: 'sujato',
                lang: 'en',
                nikaya: 'dn',
                suid: 'dn33',
                bilaraPath: 'translation/'+
                    'en/sujato/dn/dn33_translation-en-sujato.json',
            }
            should.deepEqual(bd.suttaInfo('dn33'), [dn33Pli, dn33En]);
            var sn12_3pli = {
                author: 'ms',
                lang: 'pli',
                nikaya: 'sn',
                suid: 'sn12.3',
                bilaraPath: 'root/pli/ms/sn/sn12/sn12.3_root-pli-ms.json',
            }
            var sn12_3en = {
                author: 'sujato',
                lang: 'en',
                nikaya: 'sn',
                suid: 'sn12.3',
                bilaraPath: 'translation/'+
                    'en/sujato/sn/sn12/sn12.3_translation-en-sujato.json',
            };
            var sn12_3de = {
                author: 'sabbamitta',
                lang: 'de',
                nikaya: 'sn',
                suid: 'sn12.3',
                bilaraPath: 'translation/'+
                    'de/sabbamitta/sn/sn12/sn12.3_translation-de-sabbamitta.json',
            };
            should.deepEqual(bd.suttaInfo('sn12.3'), 
                [sn12_3pli, sn12_3en, sn12_3de]);
            var an2_1_10pli = {
                author: 'ms',
                lang: 'pli',
                nikaya: 'an',
                suid: 'an2.1-10',
                bilaraPath: 'root/pli/ms/an/an2/an2.1-10_root-pli-ms.json',
            };
            var an2_1_10en = {
                author: 'sujato',
                lang: 'en',
                nikaya: 'an',
                suid: 'an2.1-10',
                bilaraPath: 'translation/'+
                    'en/sujato/an/an2/an2.1-10_translation-en-sujato.json',
            };
            var an2_1_10de = {
                author: 'sabbamitta',
                lang: 'de',
                nikaya: 'an',
                suid: 'an2.1-10',
                bilaraPath: 'translation/'+
                    'de/sabbamitta/an/an2/an2.1-10_translation-de-sabbamitta.json',
            };
            should.deepEqual(bd.suttaInfo('an2.1-10'), 
                [ an2_1_10pli, an2_1_10en, an2_1_10de ]);
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTloadTranslation(...) loads translation document", done=>{
        this.timeout(5*1000);
        (async function() { try {
            await bd.initialize();
            var expectedProps = {
                suid: 'dn33',
                author: 'sujato',
                lang: 'en',
            };

            // string form
            var an1_1_10 = bd.loadTranslation("an1.1-10");
            should(an1_1_10).properties({
                suid: 'an1.1-10',
                author: 'sujato',
                lang: 'en',
            });
            var an1_1_10 = bd.loadTranslation("an1.1-10","de");
            should(an1_1_10).properties({
                suid: 'an1.1-10',
                author: 'sabbamitta',
                lang: 'de',
            });

            // full form
            var dn33 = bd.loadTranslation({
                suid: 'dn33',
            });
            should(dn33).properties(expectedProps);
            should(dn33.segMap['dn33:1.10.31'])
                .equal('form, formlessness, and cessation. '); 
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTloadSegDoc(...) loads segmented document", done=>{
        this.timeout(5*1000);
        (async function() { try {
            await bd.initialize();
            var dn33 = bd.loadSegDoc({
                suid: 'dn33',
                lang: 'en',
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
    it("normalizeSuttaId(id) returns normalized sutta_uid", function(done) {
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
    it("translationPaths(...) filepath for scid", function(done) {
        (async function() { try {
            await bd.initialize();

            // Object args
            var sutta_uid = 'mn1';
            var lang = 'en';
            var author = 'sujato';
            var spath = bd.translationPaths({
                sutta_uid,
                lang,
                author,
            })[0];
            var mn1 = 'translation/en/sujato/mn/mn1_translation-en-sujato.json';
            should(spath).equal(path.join(bd.root, mn1));
            should(fs.existsSync(spath)).equal(true);
            
            // argument list
            var spath = bd.translationPaths(sutta_uid, lang, author)[0];
            should(spath).equal(path.join(bd.root, mn1));

            // default args
            var spath = bd.translationPaths(sutta_uid, lang)[0];
            should(spath).equal(path.join(bd.root, mn1));
            var spath = bd.translationPaths(sutta_uid)[0];
            should(spath).equal(path.join(bd.root, mn1));

            // variants
            var spath = bd.translationPaths('MN 1')[0];
            should(spath).equal(path.join(bd.root, mn1));

            // By language
            var spath = bd.translationPaths('an1.2','de')[0];
            should(spath).equal(path.join(bd.root, 'translation/'+
                'de/sabbamitta/an/an1/an1.1-10_translation-de-sabbamitta.json'));
            should(fs.existsSync(spath)).equal(true);

            // By SuttaCentralId
            var an1_1 = 'translation/'+
                'de/sabbamitta/an/an1/an1.1-10_translation-de-sabbamitta.json';
            var spath = bd.translationPaths('an1.2:0.3','de')[0];
            should(spath).equal(path.join(bd.root,an1_1));
            should(fs.existsSync(spath)).equal(true);

            done(); 
        } catch(e) {done(e);} })();
    });
    it("translationPaths(...) bad input", function(done) {
        (async function() { try {
            // No file
            var spath = bd.translationPaths('mn1','en','no-author')[0];
            should(spath).equal(undefined);

            // Errors
            should.throws(() => bd.translationPaths()); 
            should.throws(() => bd.translationPaths({
                // sutta_uid: 'MN 1',
                language: 'en',
                author_id: 'sujato',
            })); 
            var badId = 'abc';
            should.throws(() => bd.translationPaths(badId,'en','sujato')); 
            done(); 
        } catch(e) {done(e);} })();
    });
    it("suttaPath(...) deprecated", function(done) {
        (async function() { try {
            await bd.initialize();

            // Object args
            var sutta_uid = 'mn1';
            var lang = 'en';
            var author = 'sujato';
            var spath = bd.suttaPath({
                sutta_uid,
                lang,
                author,
            });
            var mn1 = 'translation/en/sujato/mn/mn1_translation-en-sujato.json';
            should(spath).equal(path.join(bd.root, mn1));
            done(); 
        } catch(e) {done(e);} })();
    });
    it("TESTTESTnikayaSuttaIds(...) returns sutta_uids", done=>{
        this.timeout(5*1000);
        (async function() { try {
            var language = 'en';
            const KNSTART = [
                'thag1.1', 'thag1.2', 'thag1.3',
            ];
            const KNEND = [
                'thig14.1', 'thig15.1', 'thig16.1',
            ];

            // Root nikaya kn
            var ids = await bd.nikayaSuttaIds('kn');
            should(ids).instanceOf(Array);
            should.deepEqual(ids.slice(0,3), KNSTART);
            should.deepEqual(ids.slice(ids.length-3,ids.length), KNEND);
            should(ids.length).equal(335);

            // Root nikaya an
            var ids = await bd.nikayaSuttaIds('an');
            should(ids.length).equal(1407);

            // Root nikaya sn
            var ids = await bd.nikayaSuttaIds('sn');
            should(ids.length).equal(1819);

            // Root nikaya dn
            var ids = await bd.nikayaSuttaIds('dn');
            should(ids.length).equal(34);

            // nikaya mn
            var ids = await bd.nikayaSuttaIds('mn');
            should(ids.length).equal(152);

            // nikaya, language
            var ids = await bd.nikayaSuttaIds('sn', 'de');
            should(ids.length).below(1819);

            // Bad input
            var ids = await bd.nikayaSuttaIds('nonikaya', 'yiddish', 'nobody');
            should.deepEqual(ids, []);

            done(); 
        } catch(e) {done(e);} })();
    });

})
