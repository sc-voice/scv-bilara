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
    this.timeout(8*1000);
    var logLevel = false;

    var bd = new BilaraData({ logLevel }); 

    it("default ctor", () => {
        const LOCAL = path.join(__dirname, '..', 'local');
        var bdDefault = new BilaraData(); 
        should(bdDefault).instanceOf(BilaraData);
        should(bdDefault.root).equal(`${LOCAL}/bilara-data`);
        should.deepEqual(bdDefault.nikayas.sort(), [
            'mn', 'sn', 'dn', 'an', 'kn/thag', 'kn/thig'
        ].sort());
        should(bdDefault).properties({
            lang: 'en',
            languages: ['pli', 'en'],
            logLevel: 'info',
        });
    });
    it("initialize(...) must be called", (done) => {
        (async function() { try {
            var newbd = new BilaraData();
            should(newbd.initialized).equal(false);
            should.throws(() => {
                newbd.suttaInfo('dn33');
            });

            var sync = false; // true => git clone or git pull
            var res = await bd.initialize(sync);
            should(res).equal(bd);
            should(bd.initialized).equal(true);

            done();
        } catch(e) {done(e);} })();
    });
    it("isSuttaPath(f) filters supported suttas", ()=>{
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
    it("suttaInfo(...) returns sutta metadata", done=>{
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
                [sn12_3pli, sn12_3de, sn12_3en]);
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
                [ an2_1_10pli, an2_1_10de, an2_1_10en ]);
            should.deepEqual(bd.suttaInfo('an2.3'), 
                [ an2_1_10pli, an2_1_10de, an2_1_10en ]);
            done();
        } catch(e) {done(e);} })();
    });
    it("loadSegDoc(...) loads translation document", done=>{
        (async function() { try {
            await bd.initialize();
            var expectedProps = {
                suid: 'dn33',
                author: 'sujato',
                lang: 'en',
            };

            // string form
            var an1_1_10 = await bd.loadSegDoc("an1.1-10/en");
            should(an1_1_10).properties({
                suid: 'an1.1-10',
                author: 'sujato',
                lang: 'en',
            });
            var an1_1_10 = await bd.loadSegDoc("an1.1-10/de");
            should(an1_1_10).properties({
                suid: 'an1.1-10',
                author: 'sabbamitta',
                lang: 'de',
            });

            // full form
            var dn33 = await bd.loadSegDoc({
                suid: 'dn33',
                lang: 'en',
            });
            should(dn33).properties(expectedProps);
            should(dn33.segMap['dn33:1.10.31'])
                .equal('form, formlessness, and cessation. '); 
            done();
        } catch(e) {done(e);} })();
    });
    it("loadSegDoc(...) loads segmented document", done=>{
        (async function() { try {
            await bd.initialize();

            // Object args
            var dn33 = await bd.loadSegDoc({
                suid: 'dn33',
                lang: 'en',
            });
            should(dn33).properties({
                suid: 'dn33',
                author: 'sujato',
                lang: 'en',
            });

            // String args
            should.deepEqual(await bd.loadSegDoc('dn33/en/sujato'), dn33);

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
    it("docPaths(...) filepath for scid", function(done) {
        (async function() { try {
            await bd.initialize();

            // Object args
            var sutta_uid = 'mn1';
            var lang = 'en';
            var author = 'sujato';
            var spath = bd.docPaths({
                sutta_uid,
                lang,
                author,
            })[0];
            var mn1 = 'translation/en/sujato/mn/mn1_translation-en-sujato.json';
            should(spath).equal(path.join(bd.root, mn1));
            should(fs.existsSync(spath)).equal(true);
            
            // argument list
            var spath = bd.docPaths(sutta_uid, lang, author)[0];
            should(spath).equal(path.join(bd.root, mn1));

            // default args
            var spath = bd.docPaths(sutta_uid, lang)[0];
            should(spath).equal(path.join(bd.root, mn1));
            var spath = bd.docPaths(sutta_uid)[0];
            should(spath).equal(path.join(bd.root, mn1));

            // variants
            var spath = bd.docPaths('MN 1')[0];
            should(spath).equal(path.join(bd.root, mn1));

            // By language
            var spath = bd.docPaths('an1.2','de')[0];
            should(spath).equal(path.join(bd.root, 'translation/'+
                'de/sabbamitta/an/an1/an1.1-10_translation-de-sabbamitta.json'));
            should(fs.existsSync(spath)).equal(true);

            // By SuttaCentralId
            var an1_1 = 'translation/'+
                'de/sabbamitta/an/an1/an1.1-10_translation-de-sabbamitta.json';
            var spath = bd.docPaths('an1.2:0.3','de')[0];
            should(spath).equal(path.join(bd.root,an1_1));
            should(fs.existsSync(spath)).equal(true);

            done(); 
        } catch(e) {done(e);} })();
    });
    it("docPaths(...) bad input", function(done) {
        (async function() { try {
            // No file
            var spath = bd.docPaths('mn1','en','no-author')[0];
            should(spath).equal(undefined);

            // Errors
            should.throws(() => bd.docPaths()); 
            should.throws(() => bd.docPaths({
                // sutta_uid: 'MN 1',
                language: 'en',
                author_id: 'sujato',
            })); 
            var badId = 'abc';
            should.throws(() => bd.docPaths(badId,'en','sujato')); 
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
    it("nikayaSuttaIds(...) returns sutta_uids", done=>{
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
    it("suttaList(pattern) => [normalized-sutta-reference]", done=>{
        (async function() { try {
            await bd.initialize();

            // Expand ranges an normalize sutta references
            should.deepEqual( bd.suttaList(
                ['MN 1-3/de/sabbamitta','mn4/en']), // spaces
                ['mn1/de/sabbamitta', 'mn2/de/sabbamitta', 'mn3/de/sabbamitta', 
                    'mn4/en']);
            should.deepEqual( bd.suttaList(['an1.2-11']),
                ['an1.1-10', 'an1.11-20']);

            should.deepEqual( bd.suttaList(
                ['sn 45.161']), // spaces
                ['sn45.161']);
            should.deepEqual( bd.suttaList(
                ['MN 1-3/en/sujato']), // spaces
                ['mn1/en/sujato', 'mn2/en/sujato', 'mn3/en/sujato']);
            should.deepEqual( bd.suttaList(
                ['AN 5.179', 'sn29.1']), // spaces
                ['an5.179', 'sn29.1']);

            should.deepEqual(bd.suttaList( 
                ['an10.1-3']),
                ['an10.1', 'an10.2', 'an10.3']);

            should.deepEqual( bd.suttaList(
                ['an2.3']), // sub-chapter embedded 
                ['an2.1-10']);
            should.deepEqual( bd.suttaList(
                ['sn29']), // implied sub-chapters
                ['sn29.1', 'sn29.2', 'sn29.3', 'sn29.4', 'sn29.5',
                    'sn29.6', 'sn29.7', 'sn29.8', 'sn29.9', 'sn29.10',
                    'sn29.11-20', 'sn29.21-50', ]);
            should.deepEqual( bd.suttaList(
                ['SN28.8-10']), // sub-chapter range (exact)
                ['sn28.8', 'sn28.9', 'sn28.10']);
            should.deepEqual( bd.suttaList(
                ['sn28.8-999']), // sub-chapter range (right over)
                ['sn28.8', 'sn28.9', 'sn28.10']);
            should.deepEqual( bd.suttaList(
                ['sn29.1', 'mn33', 'SN29.2']), // order as entered
                ['sn29.1', 'mn33', 'sn29.2']);
            should.deepEqual( bd.suttaList(
                ['sn29.1', 'sn29.12', 'sn29.2']), // within range
                ['sn29.1', 'sn29.11-20', 'sn29.2']);
            should.deepEqual( bd.suttaList(
                'sn29.1, sn29.12, sn29.2'), // String
                ['sn29.1', 'sn29.11-20', 'sn29.2']);
            should.deepEqual( bd.suttaList(
                ['sn29.9-11']), // expand sub-chapter range
                ['sn29.9', 'sn29.10', 'sn29.11-20']);
            should.deepEqual( bd.suttaList(
                ['sn29.1', 'sn29.1', 'sn29.2']), // duplicates
                ['sn29.1', 'sn29.1', 'sn29.2']);
            should.deepEqual( bd.suttaList(
                ['AN5.179', 'sn29.1']), // spaces
                ['an5.179', 'sn29.1']);

            should.deepEqual(bd.suttaList(
                ['MN9-11']), // major number range
                ['mn9','mn10','mn11']); 
            should.deepEqual(bd.suttaList(
                ['mn9-11', 'mn10-12']), // major number range
                ['mn9','mn10','mn11','mn10','mn11','mn12']); 

            done(); 
        } catch(e) {done(e);} })();
    });
    it("sutta_uidSuccessor(sutta_uid) returns following sutta_uid", done=>{
        (async function() { try {
            await bd.initialize();

            // logical
            should(bd.sutta_uidSuccessor('mn33',true)).equal('mn34');
            should(bd.sutta_uidSuccessor('sn29.10-21',true)).equal('sn29.22');
            should(bd.sutta_uidSuccessor('sn29.10-21')).equal('sn30.1');

            should(bd.sutta_uidSuccessor('mn33',false)).equal('mn34');
            should(bd.sutta_uidSuccessor('sn29.10-21',false)).equal('sn30.1');
            should(bd.sutta_uidSuccessor('thag16.1')).equal('thag16.2');
            should(bd.sutta_uidSuccessor('thag16.1-10')).equal('thag17.1');
            done(); 
        } catch(e) {done(e);} })();
    });
    it("sutta_uidSearch(...) normalizes sutta references", done=>{
        (async function() { try {
            await bd.initialize();
            var maxResults = 4;

            // minor id range AN10.1-10
            var res = bd.sutta_uidSearch("an10.1-10");
            should.deepEqual(res.uids, [
                "an10.1", "an10.2", "an10.3", "an10.4", "an10.5",
            ]);
            should.deepEqual(res.suttaRefs, [
                "an10.1", 
                "an10.2", 
                "an10.3", 
                "an10.4", 
                "an10.5",
            ]);

            // major id range MN2-11
            var res = bd.sutta_uidSearch("mn2-11", maxResults);
            should.deepEqual(res.uids, [
                "mn2", "mn3", "mn4", "mn5", 
            ]);

            // minor id range of ranged suttas
            var res = bd.sutta_uidSearch("an1.2-11");
            should.deepEqual(res.uids, [
                "an1.1-10", "an1.11-20",
            ]);

            // language
            var res = bd.sutta_uidSearch("an1.2-11/de", maxResults);
            should.deepEqual(res.uids, [
                "an1.1-10/de", "an1.11-20/de",
            ]);
            should.deepEqual(res.suttaRefs, [
                "an1.1-10/de", 
                "an1.11-20/de", 
            ]);

            // author
            var res = bd.sutta_uidSearch("an1.2-11/en/bodhi", maxResults);
            should.deepEqual(res.uids, [
                "an1.1-10/en/bodhi", "an1.11-20/en/bodhi",
            ]);
            should.deepEqual(res.suttaRefs, [
                "an1.1-10/en/bodhi", 
                "an1.11-20/en/bodhi", 
            ]);

            done(); 
        } catch(e) {done(e);} })();
    });
    it("loadMLDoc(...) loads bilingual doc", done=>{
        (async function() { try {
            await bd.initialize();
            var an1_9_en = {
                scid: "an1.9:0.1",
                pli: '9 ',
                en: '9 ',
            };
            var an1_9_de = {
                scid: "an1.9:0.1",
                pli: '9 ',
                de: '9 ',
            };

            // implicit
            var mld = await bd.loadMLDoc({
                suid: 'an1.2',
            });
            should.deepEqual(mld.segMap['an1.9:0.1'], an1_9_en);
            var mld = await bd.loadMLDoc({
                suid: 'an1.2',
                lang: 'en',
            });
            should.deepEqual(mld.segMap['an1.9:0.1'], an1_9_en);

            // explicit
            var mld = await bd.loadMLDoc("an1.2/en");
            should.deepEqual(mld.segMap['an1.9:0.1'], an1_9_en);
            var mld = await bd.loadMLDoc("an1.2/en/sujato");
            should.deepEqual(mld.segMap['an1.9:0.1'], an1_9_en);
            var mld = await bd.loadMLDoc({
                suid: 'an1.2/en',
            });
            should.deepEqual(mld.segMap['an1.9:0.1'], an1_9_en);
            var mld = await bd.loadMLDoc({
                suid: 'an1.10',
                languages: ['en', 'pli'],
            });
            should.deepEqual(mld.segMap['an1.9:0.1'], an1_9_en);
            var mld = await bd.loadMLDoc({
                suid: 'an1.10',
                languages: ['de', 'pli'],
            });
            should.deepEqual(mld.segMap['an1.9:0.1'], an1_9_de);
            var mld = await bd.loadMLDoc("an1.9/de/sabbamitta");
            should.deepEqual(mld.segMap['an1.9:0.1'], an1_9_de);

            done();
        } catch(e) { done(e); }})();
    });
    it("loadMLDoc(...) loads trilingual doc", done=>{
        (async function() { try {
            await bd.initialize();
            var an1_9 = {
                scid: "an1.9:0.1",
                pli: '9 ',
                en: '9 ',
                de: '9 ',
            };

            // explicit
            var mld = await bd.loadMLDoc({
                suid: 'an1.10',
                languages: ['de', 'pli', 'en'],
            });
            should.deepEqual(mld.segMap['an1.9:0.1'], an1_9);

            // implicit
            var mld = await bd.loadMLDoc({
                suid: 'an1.10',
                lang: 'de',
            });
            should.deepEqual(mld.segMap['an1.9:0.1'], an1_9);
            var mld = await bd.loadMLDoc("an1.9/de");
            should.deepEqual(mld.segMap['an1.9:0.1'], an1_9);

            done();
        } catch(e) { done(e); }})();
    });
    it("TESTTESTauthorInfo(author) => author details",done=>{
        (async function() { try {
            await bd.initialize();
            should.deepEqual(bd.authorInfo('sabbamitta'), {
                name: 'Sabbamitta Anagarika',
                type: 'translator',
                root_edition: 'ms',
                root_lang: 'pli',
            });
            done();
        } catch(e) { done(e); }})();
    });

})
