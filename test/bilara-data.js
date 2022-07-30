(typeof describe === 'function') && describe("bilara-data", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const { logger, LogInstance } = require('log-instance');
    const {
        BilaraData,
        BilaraPathMap,
        ExecGitMock,
        MLDoc,
        Seeker,
        SuttaCentralId,
    } = require("../index");
    const { MemoCache, } = require('memo-again');
    const LOCAL_DIR = path.join(__dirname, '..', 'local');
    logger.logLevel = 'warn';
    this.timeout(120*1000);
    var bd = new BilaraData(); 
    function ROOTPATH(mid,category='sutta') {
        var lang = 'pli';
        var auth = 'ms';
        return [
            'root',
            lang,
            `${auth}/${category}`,
            `${mid}_root-${lang}-${auth}.json`
        ].join('/');
    }

    function TRANSPATH(lang,auth,mid, category='sutta') {
        return [
            'translation',
            lang,
            `${auth}/${category}`,
            `${mid}_translation-${lang}-${auth}.json`
        ].join('/');
    }

    var SABBAMITTA = 'sabbamitta/sutta';
    var SUJATO = 'sujato/sutta';
    var BRAHMALI = 'brahmali/vinaya';

    it("default ctor", () => {
        const LOCAL = path.join(__dirname, '..', 'local');
        var bdDefault = new BilaraData(); 
        should(bdDefault).instanceOf(BilaraData);
        should(bdDefault.root).equal(`${LOCAL}/bilara-data`);
        should(bdDefault).properties({
            branch: 'published',
            lang: 'en',
            languages: ['pli', 'en'],
            includeUnpublished: false,
        });
        should(bdDefault.logger).equal(logger);
    });
    it("initialize(...) must be called", async()=>{
        var newbd = new BilaraData();
        newbd.logLevel = 'info';
        should(newbd.initialized).equal(false);
        should.throws(() => {
            newbd.suttaInfo('dn33');
        });

        var sync = false; // true => git clone or git pull
        var res = await bd.initialize(sync);
        should(res).equal(bd);
        should(bd.initialized).equal(true);
        let authors = Object.keys(bd.authors);
        should(authors.indexOf('ms')).above(-1);
        should(authors.indexOf('sujato')).above(-1);
        should(authors.indexOf('sabbamitta')).above(-1);

        let eg_en = 'like a cow';
        should.deepEqual(bd.examples.en.filter(x=>x === eg_en), [eg_en]);
        should.deepEqual(bd.examples.de.slice(0,2), [
            `aber meine Dame`,
            `aber nicht zum eigenen`,
            //'Abfälle',
        ]);
    });
    it("initialize(...) must be called", async()=>{
        var newbd = new BilaraData();
        should(newbd.initialized).equal(false);
        should.throws(() => {
            newbd.suttaInfo('dn33');
        });

        var sync = false; // true => git clone or git pull
        var res = await bd.initialize(sync);
        should(res).equal(bd);
        should(bd.initialized).equal(true);
        let authors = Object.keys(bd.authors);
        should(bd.authors.ms.type).equal('root');
        should(bd.authors.sujato.type).equal('translator');
        should(bd.authors.sabbamitta.type).equal('translator');
    });
    it("syncEbtData() loads EBT-data", async() =>{
        var bd = new BilaraData();
        //bd.logLevel = 'info';
        let res = await bd.syncEbtData();
        should(res).properties({
            repo: 'https://github.com/ebt-site/ebt-data.git',
            repoPath: path.join(`${LOCAL_DIR}/ebt-data`),
        });
    });
    it("sync() purges and refreshes repo", async()=>{
        var name = "test-repo";
        var gitAccount = "sc-voice";
        var mc = new MemoCache();
        var bd = new BilaraData({name, gitAccount});
        //bd.logLevel = 'info';
        var dummyPath = path.join(bd.root, "root", "dummy.txt");

        // put something in the memo cache
        var volume = "test-volume";
        mc.put({volume, guid:"test-guid",value:"test-value"});
        should(await mc.fileSize()).above(0);
        should(mc.volumes().find(v=>v===volume)).equal(volume);

        // make a local change
        fs.existsSync(dummyPath) && fs.unlinkSync(dummyPath);
        should(fs.existsSync(dummyPath)).equal(false);

        // purge reclones repo
        await bd.sync({purge:true});
        should(fs.existsSync(dummyPath)).equal(true);
        should(await mc.fileSize()).equal(0);
    });
    it("sync() refreshes repo", async()=>{
        var name = "test-repo";
        var gitAccount = "sc-voice";
        var verbose = true;
        var bd = new BilaraData({name, gitAccount, verbose});
        var dummyPath = path.join(bd.root, "root", "dummy.txt");
        var unpublishedPath = path.join(bd.root, "unpublished.txt");
        var masterPath = path.join(bd.root, "master.txt");

        // sync to restore, and make master current
        await bd.sync();
        should(fs.existsSync(dummyPath)).equal(true);
        should(fs.existsSync(masterPath)).equal(false);
        should(fs.existsSync(unpublishedPath)).equal(true);

        // make a local change
        fs.existsSync(dummyPath) && fs.unlinkSync(dummyPath);
        should(fs.existsSync(dummyPath)).equal(false);

        // sync to restore, and make master current
        await bd.sync({branches:['unpublished', 'master']});
        should(fs.existsSync(dummyPath)).equal(true);
        should(fs.existsSync(unpublishedPath)).equal(false);

        // sync to restore, and make unpublished current
        await bd.sync({branches:['master', 'unpublished']});
        should(fs.existsSync(dummyPath)).equal(true);
        should(fs.existsSync(unpublishedPath)).equal(true);
    });
    it("authorInfo() => supported author info", async()=>{
        await bd.initialize();
        var ms = {
            lang: 'pli',
            author: 'ms',
            category: ['sutta', 'vinaya'],
            type: "root",
            name: "Mahāsaṅgīti Tipiṭaka Buddhavasse 2500",
            exampleVersion: 999999,
        };
        var sujato = {
            lang: 'en',
            type: "translator",
            author: "sujato",
            category: ["sutta"],
            name: "Bhikkhu Sujato",
            exampleVersion: 1,
        };
        var brahmali = {
            type: "translator",
            author: "brahmali",
            name: "Bhikkhu Brahmali",
            exampleVersion: 0,
        };
        var sabbamitta = {
            lang: 'de',
            type: "translator",
            category: ["sutta"],
            author: "sabbamitta",
            name: "Sabbamitta",
            exampleVersion: 1,
        };

        should.deepEqual(bd.authorInfo('sabbamitta'), sabbamitta);
        should.deepEqual(bd.authorInfo('sujato'), sujato);

        should.deepEqual(bd.authors.ms, ms);
        should.deepEqual(bd.authors.sujato, sujato);
        should.deepEqual(bd.authors.sabbamitta, sabbamitta);

    });
    it("supportedLanguages() => segmented translations", async()=>{
        return; // TODO20210307: Carmi
        await bd.initialize();
        should.deepEqual(bd.supportedLanguages(), [
            'cs', 
            'de', 'en', 'jpn', 'pli', 
        ]);
    });
    it("suttaInfo(...) returns sutta metadata", async()=>{
        await bd.initialize();
        var dn33Pli = {
            author: 'ms',
            lang: 'pli',
            category: 'sutta',
            nikaya: 'dn',
            suid: 'dn33',
            bilaraPath: ROOTPATH('dn/dn33'),
            exampleVersion: 999999,
        };
        var dn33De = {
            author: 'sabbamitta',
            lang: 'de',
            category: 'sutta',
            nikaya: 'dn',
            suid: 'dn33',
            bilaraPath: TRANSPATH('de','sabbamitta', `dn/dn33`),
            exampleVersion: 1,
        }
        var dn33En = {
            author: 'sujato',
            lang: 'en',
            category: 'sutta',
            nikaya: 'dn',
            suid: 'dn33',
            bilaraPath: TRANSPATH('en','sujato', `dn/dn33`),
            exampleVersion: 1,
        }
        let dn33 = bd.suttaInfo('dn33');
        should.deepEqual(dn33.find(info=>info.author==='ms'), dn33Pli);
        should.deepEqual(dn33.find(info=>info.author==='sujato'), dn33En);
        should.deepEqual(dn33.find(info=>info.author==='sabbamitta'), dn33De);

        var sn12_3pli = {
            author: 'ms',
            lang: 'pli',
            category: 'sutta',
            nikaya: 'sn',
            suid: 'sn12.3',
            bilaraPath: ROOTPATH('sn/sn12/sn12.3'),
            exampleVersion: 999999,
        }
        var sn12_3en = {
            author: 'sujato',
            lang: 'en',
            category: 'sutta',
            nikaya: 'sn',
            suid: 'sn12.3',
            bilaraPath: TRANSPATH('en','sujato', `sn/sn12/sn12.3`),
            exampleVersion: 1,
        };
        var sn12_3de = {
            author: 'sabbamitta',
            lang: 'de',
            category: 'sutta',
            nikaya: 'sn',
            suid: 'sn12.3',
            bilaraPath: TRANSPATH('de', 'sabbamitta', `sn/sn12/sn12.3`),
            exampleVersion: 1,
        };
        should.deepEqual(bd.suttaInfo('sn12.3'), 
            [sn12_3pli, sn12_3de, sn12_3en]);
        var AN4_58 = 'an/an4/an4.58';
        var an4_58pli = {
            author: 'ms',
            lang: 'pli',
            category: 'sutta',
            nikaya: 'an',
            suid: 'an4.58',
            bilaraPath: ROOTPATH(AN4_58),
            exampleVersion: 999999,
        };
        var an4_58en = {
            author: 'sujato',
            lang: 'en',
            category: 'sutta',
            nikaya: 'an',
            suid: 'an4.58',
            bilaraPath: TRANSPATH('en', 'sujato', AN4_58),
            exampleVersion: 1,
        };
        var an4_58de = {
            author: 'sabbamitta',
            lang: 'de',
            category: 'sutta',
            nikaya: 'an',
            suid: 'an4.58',
            bilaraPath: TRANSPATH('de','sabbamitta', AN4_58),
            exampleVersion: 1,
        };
        let suttaInfo = bd.suttaInfo('an4.58');
        should.deepEqual(suttaInfo[0], an4_58pli);
        should.deepEqual(suttaInfo[1], an4_58de);
        should.deepEqual(suttaInfo[2], an4_58en);
    });
    it("suttaInfo(...) => thig3.8 sutta metadata", async()=>{
        await bd.initialize();
        let thigInfo = {
            suid: 'thig3.8',         
            category: 'sutta',
            nikaya: 'kn',   
        };
        let pliInfo = Object.assign({
            lang: 'pli',
            author: 'ms',                
            bilaraPath: ROOTPATH('thig3.8', 'sutta/kn/thig'),
            exampleVersion: 999999,
        }, thigInfo);
        let sujatoInfo = Object.assign({
            lang: 'en',
            author: 'sujato',                
            bilaraPath: TRANSPATH('en', 'sujato', 'thig3.8', 'sutta/kn/thig'),
            exampleVersion: 1,
        }, thigInfo);
        let deInfo = Object.assign({
            lang: 'de',
            author: 'sabbamitta',                
            bilaraPath: TRANSPATH('de', 'sabbamitta', 'thig3.8', 'sutta/kn/thig'),
            exampleVersion: 1,
        }, thigInfo);
        let suttaInfo = bd.suttaInfo('thig3.8');
        should.deepEqual(suttaInfo[0], pliInfo);
        should.deepEqual(suttaInfo[1], deInfo);
        should.deepEqual(suttaInfo[2], sujatoInfo);
    });
    it("loadSegDoc(...) loads translation document", async()=>{
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
    });
    it("loadSegDoc(...) loads segmented document", async()=>{
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
    });
    it("normalizeSuttaId(id) => normalized sutta_uid", done=>{
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
            var mn1 = TRANSPATH('en','sujato', 'mn/mn1');
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
            should(spath).equal(path.join(bd.root, 
                TRANSPATH('de','sabbamitta', 'an/an1/an1.1-10')));
            should(fs.existsSync(spath)).equal(true);

            // By SuttaCentralId
            var an1_1 = TRANSPATH('de','sabbamitta','an/an1/an1.1-10');
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
            var mn1 = TRANSPATH('en','sujato','mn/mn1');
            should(spath).equal(path.join(bd.root, mn1));
            done(); 
        } catch(e) {done(e);} })();
    });
    it("nikayaSuttaIds(...) returns sutta_uids", async()=>{
        var language = 'en';
        var KNSTART = [
            'bv1', 'bv2', 'bv3', 'bv4', 'bv5', 
        ];
        var KNEND = [
            'vv83', 'vv84', 'vv85',
        ];

        // Root nikaya kn
        var ids = await bd.nikayaSuttaIds('kn');
        should(ids).instanceOf(Array);
        should.deepEqual(ids.slice(0,KNSTART.length), KNSTART);
        should.deepEqual(ids.slice(ids.length-3,ids.length), KNEND);
        should(ids.length).equal(2351 );

        // Root nikaya an
        var ids = await bd.nikayaSuttaIds('an');
        should(ids.length).equal(1408);

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
        should(ids.length).below(1820);

        // Bad input
        var ids = await bd.nikayaSuttaIds('nonikaya', 'yiddish', 
            'nobody');
        should.deepEqual(ids, []);
    });
    it("suttaList(pattern) => [normalized-sutta-reference]", async()=>{
        await bd.initialize();

        // Expand ranges an normalize sutta references
        should.deepEqual( bd.suttaList(
            ['MN 1-3/de/sabbamitta','mn4/en']), // spaces
            [   'mn1/de/sabbamitta', 
                'mn2/de/sabbamitta', 
                'mn3/de/sabbamitta', 
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
        //should.deepEqual( bd.suttaList(
            //['sn29']), // implied sub-chapters
            //[   'sn29.1', 'sn29.2', 'sn29.3', 'sn29.4', 'sn29.5',
                //'sn29.6', 'sn29.7', 'sn29.8', 'sn29.9', 'sn29.10',
                //'sn29.11-20', 'sn29.21-50', ]);
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
    });
    it("sutta_uidSuccessor(sutta_uid) => next sutta_uid", async()=>{
      await bd.initialize();

      // vinaya
      should(bd.sutta_uidSuccessor('pli-tv-bi-vb-sk1',true))
          .equal('pli-tv-bi-vb-sk2');
      should(bd.sutta_uidSuccessor('pli-tv-bi-vb-sk1-75',true))
          .equal('pli-tv-bi-vb-sk76');
      should(bd.sutta_uidSuccessor('pli-tv-bi-vb-sk1',false))
          .equal('pli-tv-bi-vb-sk75');
      should(bd.sutta_uidSuccessor('pli-tv-bi-vb-sk75',false))
          .equal('pli-tv-bi-vb-ss1');

      // logical
      should(bd.sutta_uidSuccessor('mn33',true)).equal('mn34');
      should(bd.sutta_uidSuccessor('sn29.10-21',true))
          .equal('sn29.22');
      should(bd.sutta_uidSuccessor('sn29.10-21')).equal('sn30.1');

      should(bd.sutta_uidSuccessor('mn33',false)).equal('mn34');
      should(bd.sutta_uidSuccessor('sn29.10-21',false))
          .equal('sn30.1');
      should(bd.sutta_uidSuccessor('thag16.1')).equal('thag16.2');
      should(bd.sutta_uidSuccessor('thag16.1-10')).equal('thag17.1');
    });
    it("sutta_uidSearch(...) normalizes sutta references", async()=>{
        await bd.initialize();
        var maxResults = 4;

        var res = bd.sutta_uidSearch("thig1.1/en/soma, thig1.2/en/soma");
        should.deepEqual(res.uids, [ "thig1.1/en/soma", "thig1.2/en/soma", ]);
        should.deepEqual(res.suttaRefs, [ "thig1.1/en/soma", "thig1.2/en/soma", ]);

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
        should(res.lang).equal(undefined);

        // language
        var res = bd.sutta_uidSearch("an1.2-11/de", maxResults);
        should.deepEqual(res.uids, [
            "an1.1-10/de", "an1.11-20/de",
        ]);
        should.deepEqual(res.suttaRefs, [
            "an1.1-10/de", 
            "an1.11-20/de", 
        ]);
        should(res.lang).equal('de');

        // author
        var res = bd.sutta_uidSearch("an1.2-11/en/bodhi", maxResults);
        should.deepEqual(res.uids, [
            "an1.1-10/en/bodhi", "an1.11-20/en/bodhi",
        ]);
        should.deepEqual(res.suttaRefs, [
            "an1.1-10/en/bodhi", 
            "an1.11-20/en/bodhi", 
        ]);
        should(res.lang).equal('en');
    });
    it("loadMLDoc(...) loads bilingual doc", async()=>{
        await bd.initialize();
        var an1_9_en = {
            scid: "an1.9:1.0",
            pli: '9 ',
            en: '9 ',
        };
        var an1_9_de = {
            scid: "an1.9:1.0",
            pli: '9 ',
            de: '9 ',
        };

        // implicit
        var mld = await bd.loadMLDoc({
            suid: 'an1.2',
        });
        should.deepEqual(mld.segMap['an1.9:1.0'], an1_9_en);
        var mld = await bd.loadMLDoc({
            suid: 'an1.2',
            lang: 'en',
        });
        should.deepEqual(mld.segMap['an1.9:1.0'], an1_9_en);

        // explicit
        var mld = await bd.loadMLDoc("an1.2/en");
        should.deepEqual(mld.segMap['an1.9:1.0'], an1_9_en);
        var mld = await bd.loadMLDoc("an1.2/en/sujato");
        should.deepEqual(mld.segMap['an1.9:1.0'], an1_9_en);
        var mld = await bd.loadMLDoc({
            suid: 'an1.2/en',
        });
        should.deepEqual(mld.segMap['an1.9:1.0'], an1_9_en);
        var mld = await bd.loadMLDoc({
            suid: 'an1.10',
            languages: ['en', 'pli'],
        });
        should.deepEqual(mld.segMap['an1.9:1.0'], an1_9_en);
        var mld = await bd.loadMLDoc({
            suid: 'an1.10',
            languages: ['de', 'pli'],
        });
        should.deepEqual(mld.segMap['an1.9:1.0'], an1_9_de);
    });
    it("loadMLDocLegacy(...) loads legacy doc", async()=>{
        await bd.initialize();
        var mld = await bd.loadMLDocLegacy('dn1/de');

        should(mld.lang).equal('de');
        should(mld.score).equal(0);
        should(mld.suid).equal('dn1');
        should(mld.hyphen).equal('\u00ad');
        should(mld.maxWord).equal(30);
        should(mld.minWord).equal(5);
        should(mld.segsMatched).equal(undefined);
        should.deepEqual(mld.langSegs, {
            de: 194,
        });
        let segs = mld.segments();
        should(segs[2].de).match(/So habe ich berichten hören/);
        should(Object.keys(mld.segMap).length).equal(194);
        should(mld.author_uid).equal('franke');
        should.deepEqual(mld.translations, [{
            type: 'translation',
            lang: 'de',
            author_uid: 'franke',
            category: 'sutta',
            collection: 'dn',
            suttaRef: 'dn1/de/franke',
            sutta_uid: 'dn1',
        }]);
        should.deepEqual(mld.titles(),[
            'Dīgha Nikāya 1', 'Das Netz des umfassenden Wissens'
        ]);
        should.deepEqual(mld.languages(), [ 'de' ]);
    });
    it("loadMLDoc(...) loads trilingual doc", done=>{
        (async function() { try {
            await bd.initialize();
            var an1_9 = {
                scid: "an1.9:1.0",
                pli: '9 ',
                de: '9 ',
                en: '9 ',
            };

            // explicit
            var mld = await bd.loadMLDoc({
                suid: 'an1.10',
                languages: ['de', 'pli', 'en'],
            });
            should.deepEqual(mld.segMap['an1.9:1.0'], an1_9);

            // implicit
            var mld = await bd.loadMLDoc({
                suid: 'an1.10',
                lang: 'de',
            });
            should.deepEqual(mld.segMap['an1.9:1.0'], an1_9);
            var mld = await bd.loadMLDoc("an1.9/de");
            should.deepEqual(mld.segMap['an1.9:1.0'], an1_9);
            var mld = await bd.loadMLDoc("an1.9/de/sabbamitta");
            should.deepEqual(mld.segMap['an1.9:1.0'], an1_9);

            done();
        } catch(e) { done(e); }})();
    });
    it("loadMLDoc(...) loads trilingual doc", async()=>{
        await bd.initialize();
        var an1_9 = {
            scid: "an1.9:1.0",
            pli: '9 ',
            en: '9 ',
            de: '9 ',
        };

        // explicit
        var mld = await bd.loadMLDoc({
            suid: 'an1.10',
            languages: ['de', 'pli', 'en'],
        });
        should.deepEqual(mld.segMap['an1.9:1.0'], an1_9);

        // implicit
        var mld = await bd.loadMLDoc({
            suid: 'an1.10',
            lang: 'de',
        });
        should.deepEqual(mld.segMap['an1.9:1.0'], an1_9);
        var mld = await bd.loadMLDoc("an1.9/de");
        should.deepEqual(mld.segMap['an1.9:1.0'], an1_9);
        var mld = await bd.loadMLDoc("an1.9/de/sabbamitta");
        should.deepEqual(mld.segMap['an1.9:1.0'], an1_9);
    });
    it("readBlurb(...) => blurb for language", done=>{
        (async function() { try {
            var bd = new BilaraData();
            await bd.initialize();
            var reAN3_1 = /Fools are dangerous, but the wise are safe/;
            var reAN5_108 = /Five factors of a worthy mendicant./;

            // full arguments
            var blurb = await bd.readBlurb({suid:'an5.108', lang:'en'});
            should(blurb).match(reAN5_108);
            var blurb = await bd.readBlurb({suid:'an3.1', lang:'en'});
            should(blurb).match(reAN3_1);

            // default language
            var blurb = await bd.readBlurb({suid:'an3.1'});
            should(blurb).match(reAN3_1);

            // case independent
            var blurb = await bd.readBlurb({suid:'AN3.1'});
            should(blurb).match(reAN3_1);

            // Unsupported language
            var blurb = await bd.readBlurb({suid:'AN3.1', lang:'xx'});
            should(blurb).match(reAN3_1);

            // German
            var blurb = await bd.readBlurb({suid:'an3.1', lang:'de'});
            should(blurb).match(
                /Toren sind gefährlich, aber kluge Menschen/);

            var blurb = await bd.readBlurb({suid:'dn33', lang:'de'});
            should(blurb).match(/Der Buddha ermuntert/);

            // no blurb
            var blurb = await bd.readBlurb({suid:'MN999'});
            should(blurb).equal(null);

            done();
        } catch(e) { done(e); }})();
    });
    it("version() => bilara-data package version", done=>{
        (async function() { try {
            await bd.initialize();
            should(bd.version()).properties({
                major: 1,
                minor: 0,
                patch: 0,
            });
            done();
        } catch(e) { done(e); }})();
    });
    it("loadMLDoc(...) loads all types", async()=>{ 
        return; // ALL_TYPES is deprecated
        await bd.initialize();
        var mld = await bd.loadMLDoc({
            suid: 'thag1.113',
            types: BilaraPathMap.ALL_TYPES,
        });
        var segs = mld.segments();
        should.deepEqual(segs[0],{
            scid: 'thag1.113:0.1',
            html: "<article id='thag1.113'><header>"+
                "<ul><li class='division'>{}</li>",
            en: 'Verses of the Senior Monks',
            pli: 'Theragāthā',
        });
    });
    it("initialize() waits for indexLock", async()=>{ try {
        let bd = new BilaraData({branch:'unpublished'});

        // create index.lock
        var indexLock = path.join(bd.root, '.git', 'index.lock');
        should(fs.existsSync(indexLock)).equal(false);
        fs.writeFileSync(indexLock, 'test');
        let resolved = false;

        // bd.sync will block
        let syncPromise = bd.initialize(true);
        syncPromise.then(()=>{ resolved = true; });
        await new Promise(r=>setTimeout(()=>r(), 200));
        should(resolved).equal(false);

        // bd.sync will continue
        await fs.promises.unlink(indexLock);
        await syncPromise;
        should(resolved).equal(true);
    } finally{
        fs.existsSync(indexLock) && fs.unlinkSync(indexLock);
    }});
    it("loadSuttaplexJson(...)=>an3.47", async()=>{
        await bd.initialize();
        var suid = 'an3.47';
        var lang = 'de';
        var lang_name = "Deutsch";
        var author = "Sabbamitta";
        var author_short = "sabbamitta";
        var author_uid = 'sabbamitta';
        var title = 'Kennzeichen des Bedingten ';

        var json = await bd.loadSuttaplexJson(suid, lang, author_uid);
        should(json.acronym).equal(`AN 3.47`);
        should(json.original_title).equal('Saṅkhatalakkhaṇasutta');
        should.deepEqual(json.translations, [{
            author,
            author_short,
            author_uid,
            is_root: false,
            lang,
            lang_name,
            segmented: true,
            publication_date: null,
            id: `${suid}_translation-${lang}-${author_uid}`,
            title,
            volpage: null,
        }]);
    });
    it("loadSuttaplexJson(...)=>thig3.8 de", async()=>{
        await bd.initialize();
        var suid = 'thig3.8';

        var lang = 'de';
        var lang_name = "Deutsch";
        var author = "Sabbamitta";
        var author_short = "sabbamitta";
        var author_uid = 'sabbamitta';

        let includeUnpublished = true;
        var json = await bd.loadSuttaplexJson(suid, lang, undefined, includeUnpublished);
        should(json.acronym).equal(`Thig 3.8`);
        should(json.original_title).equal('Somātherīgāthā');
        should(json.translations[0].author_uid).equal('sabbamitta');
        should.deepEqual(json.translations[0], {
            author,
            author_short,
            author_uid,
            is_root: false,
            lang,
            lang_name,
            segmented: true,
            publication_date: null,
            title: "Somā ",
            id: `${suid}_translation-${lang}-${author_uid}`,
            volpage: null,
        });
    });
    it("isBilaraDoc(...) => true if bilara file", async()=>{
        await bd.initialize();
        should(bd.isBilaraDoc({ suid:"dn30", lang:"de", author:"sabbamitta" }))
            .equal(true); 
        should(bd.isBilaraDoc({ suid:"thig3.8", lang:"de", author:"sabbamitta" }))
            .equal(true); 
    });
    it("suttaIds() => [ suid ]", async()=>{
        await bd.initialize();
        let suids = bd.suttaIds;

        for (let suid of suids) {
            should(SuttaCentralId.test(suid)).equal(true, `Expected suid: "${suid}"`);
        }
        should(suids.length).above(6180);
        should(suids.filter(suid=>/iti/ui.test(suid)).length).equal(112);
        should.deepEqual(suids.slice(0,5), [
            "an1.1-10",
            "an1.11-20",
            "an1.21-30",
            "an1.31-40",
            "an1.41-50",
        ]);
        should.deepEqual(suids.slice(-5),[
            "vv81",
            "vv82",
            "vv83",
            "vv84",
            "vv85",
        ]);
    });
    it("ExecGitMock initializes", async()=>{
        var execGit = new ExecGitMock();
        //execGit.logLevel = 'debug';
        var bd = new BilaraData({execGit});
        //bd.logLevel = 'debug';
        should(bd.execGit).equal(execGit);
        should(await bd.initialize()).equal(bd);
    });
    it("isFresh() => true if repo is latest", async()=>{
        var name = "test-repo";
        var gitAccount = "sc-voice";
        var bd = new BilaraData({name,gitAccount});
        let gitlogPath = path.join(bd.root, 'gitlog.txt');
        fs.existsSync(gitlogPath) && fs.unlinkSync(gitlogPath);
        should(fs.existsSync(gitlogPath)).equal(false);
        should(await bd.isFresh()).equal(false);
        should(fs.existsSync(gitlogPath)).equal(true);
        should(await bd.isFresh()).equal(true);

        var root = '/tmp/not-there';
        var bd = new BilaraData({name, root});
        should(await bd.isFresh()).equal(false);
    });
})
