import { describe, it, expect } from '@sc-voice/vitest';
import fs from 'fs';
import path from 'path';
import { logger, LogInstance } from 'log-instance';
import { AuthorsV2 } from 'scv-esm';
import PKG_INDEX from '../index.js';
const {
    BilaraData,
    BilaraPathMap,
    ExecGitMock,
    MLDoc,
    Seeker,
    SuttaCentralId,
} = PKG_INDEX;
import { MemoCache } from 'memo-again';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_DIR = path.join(__dirname, '..', 'local');
const TEST_UNPUBLISHED = false;
logger.logLevel = 'warn';

describe.sequential("bilara-data", { timeout: 120*1000 }, function() {
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
        expect(bdDefault).toBeInstanceOf(BilaraData);
        expect(bdDefault.root).toBe(`${LOCAL}/bilara-data`);
        expect(bdDefault).properties({
            branch: 'published',
            lang: 'en',
            languages: ['pli', 'en'],
            includeUnpublished: false,
        });
        expect(bdDefault.logger).toBe(logger);
    });
    it("initialize(...) must be called", async()=>{
        var newbd = new BilaraData();
        newbd.logLevel = 'info';
        expect(newbd.initialized).toBe(false);
        expect(() => {
            newbd.suttaInfo('dn33');
        }).toThrow();

        var sync = false; // true => git clone or git pull
        var res = await bd.initialize(sync);
        expect(res).toBe(bd);
        expect(bd.initialized).toBe(true);
        let authors = Object.keys(bd.authors);
        expect(authors.indexOf('ms')).toBeGreaterThan(-1);
        expect(authors.indexOf('sujato')).toBeGreaterThan(-1);
        expect(authors.indexOf('sabbamitta')).toBeGreaterThan(-1);

        let eg_en = 'like a cow';
        expect(bd.examples.en.filter(x=>x === eg_en)).toEqual([eg_en]);
        expect(bd.examples.de.slice(0,2)).toEqual([
            `aber meine Dame`,
            `aber zum Erwachen entschlossen`,
            //'Abfälle',
        ]);
    });
    it("initialize(...) must be called", async()=>{
        var newbd = new BilaraData();
        expect(newbd.initialized).toBe(false);
        expect(() => {
            newbd.suttaInfo('dn33');
        }).toThrow();

        var sync = false; // true => git clone or git pull
        var res = await bd.initialize(sync);
        expect(res).toBe(bd);
        expect(bd.initialized).toBe(true);
        let authors = Object.keys(bd.authors);
        expect(bd.authors.ms.type).toBe('root');
        expect(bd.authors.sujato.type).toBe('translator');
        expect(bd.authors.sabbamitta.type).toBe('translator');
    });
    it("syncEbtData() loads EBT-data", async() =>{
        var bd = new BilaraData();
        //bd.logLevel = 'info';
        let res = await bd.syncEbtData();
        expect(res).properties({
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
        expect(await mc.fileSize()).toBeGreaterThan(0);
        expect(mc.volumes().find(v=>v===volume)).toBe(volume);

        // make a local change
        fs.existsSync(dummyPath) && fs.unlinkSync(dummyPath);
        expect(fs.existsSync(dummyPath)).toBe(false);

        // purge reclones repo
        await bd.sync({purge:true});
        expect(fs.existsSync(dummyPath)).toBe(true);
        expect(await mc.fileSize()).toBe(0);
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
        expect(fs.existsSync(dummyPath)).toBe(true);
        expect(fs.existsSync(masterPath)).toBe(false);
        expect(fs.existsSync(unpublishedPath)).toBe(true);

        // make a local change
        fs.existsSync(dummyPath) && fs.unlinkSync(dummyPath);
        expect(fs.existsSync(dummyPath)).toBe(false);

        // sync to restore, and make master current
        await bd.sync({branches:['unpublished', 'master']});
        expect(fs.existsSync(dummyPath)).toBe(true);
        expect(fs.existsSync(unpublishedPath)).toBe(false);

        // sync to restore, and make unpublished current
        await bd.sync({branches:['master', 'unpublished']});
        expect(fs.existsSync(dummyPath)).toBe(true);
        expect(fs.existsSync(unpublishedPath)).toBe(true);
    });
    it("authorInfo() => supported author info (DEPRECATED)", async()=>{
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

        expect(bd.authorInfo('laera-quaresma')).toEqual(undefined);
        expect(bd.authorInfo('sabbamitta')).toEqual(sabbamitta);
        expect(bd.authorInfo('sujato')).toEqual(sujato);

        expect(bd.authors.ms).toEqual(ms);
        expect(bd.authors.sujato).toEqual(sujato);
        expect(bd.authors.sabbamitta).toEqual(sabbamitta);

    });
    it("authorV2Info() => supported author info", async()=>{
        await bd.initialize();
        var sujato = {
            lang: 'en',
            type: "translation",
            author: "sujato",
            name: ["Bhikkhu Sujato"],
            examples: ["sutta"],
            exampleVersion: 1,
            sutta: true,
            vinaya: false,
        };
        var gnlaera = {
            type: "translation",
            author: "laera-quaresma",
            examples: ["sutta"],
            name: [
              "Gabriel Laera", "Marco Quaresma", 'Vitor Guimarães'
            ],
            lang: 'pt',
            exampleVersion: 2,
            sutta: true,
            vinaya: false,
        };

        expect(bd.authorV2Info(gnlaera.author)).properties(gnlaera);
        expect(bd.authorV2Info(sujato.author)).properties(sujato);
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
        expect(dn33.find(info=>info.author==='ms')).toEqual(dn33Pli);
        expect(dn33.find(info=>info.author==='sujato')).toEqual(dn33En);
        expect(dn33.find(info=>info.author==='sabbamitta')).toEqual(dn33De);

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
        expect(bd.suttaInfo('sn12.3').slice(0,3)).toEqual(
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
        expect(suttaInfo[0]).toEqual(an4_58pli);
        expect(suttaInfo[1]).toEqual(an4_58de);
        expect(suttaInfo[2]).toEqual(an4_58en);
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
        expect(suttaInfo[0]).toEqual(pliInfo);
        expect(suttaInfo[1]).toEqual(deInfo);
        expect(suttaInfo[2]).toEqual(sujatoInfo);
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
        expect(an1_1_10).properties({
            suid: 'an1.1-10',
            author: 'sujato',
            lang: 'en',
        });
        var an1_1_10 = await bd.loadSegDoc("an1.1-10/de");
        expect(an1_1_10).properties({
            suid: 'an1.1-10',
            author: 'sabbamitta',
            lang: 'de',
        });

        // full form
        var dn33 = await bd.loadSegDoc({
            suid: 'dn33',
            lang: 'en',
        });
        expect(dn33).properties(expectedProps);
        expect(dn33.segMap['dn33:1.10.31']).toBe('form, formlessness, and cessation. ');
    });
    it("loadSegDoc(...) loads segmented document", async()=>{
        await bd.initialize();

        // Object args
        var dn33 = await bd.loadSegDoc({
            suid: 'dn33',
            lang: 'en',
        });
        expect(dn33).properties({
            suid: 'dn33',
            author: 'sujato',
            lang: 'en',
        });

        // String args
        expect(await bd.loadSegDoc('dn33/en/sujato')).toEqual(dn33);

        expect(dn33.segMap['dn33:1.10.31']).toBe('form, formlessness, and cessation. ');
        expect(dn33.scids().slice(0,10)).toEqual([
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
    it("canonicalSuttaId(id)", async()=>{
      await bd.initialize();
      expect(bd.canonicalSuttaId('an2.12')).toBe('AN2.11-20');
      expect(bd.canonicalSuttaId('AN2.12')).toBe('AN2.11-20');
      expect(bd.canonicalSuttaId('An2.12')).toBe('AN2.11-20');
      expect(bd.canonicalSuttaId('An 2.12')).toBe('AN2.11-20');

      // name
      expect(bd.canonicalSuttaId('an2.12', 'name')).toBe('Aṅguttara Nikāya 2.11-20');
      expect(bd.canonicalSuttaId('AN2.12', 'name')).toBe('Aṅguttara Nikāya 2.11-20');
      expect(bd.canonicalSuttaId('An2.12', 'name')).toBe('Aṅguttara Nikāya 2.11-20');
      expect(bd.canonicalSuttaId('An 2.12', 'name')).toBe('Aṅguttara Nikāya 2.11-20');

      // MN44
      expect(bd.canonicalSuttaId('mn44')).toBe('MN44');
      expect(bd.canonicalSuttaId('mn44', 'acro')).toBe('MN44');
      expect(bd.canonicalSuttaId('mn44', 'name')).toBe('Majjhima Nikāya 44');

      // other
      expect(bd.canonicalSuttaId('thig1.1')).toBe('Thig1.1');
      expect(bd.canonicalSuttaId('thig1.1', 'name')).toBe('Therīgāthā 1.1');
      expect(bd.canonicalSuttaId('snp1.1')).toBe('Snp1.1');
      expect(bd.canonicalSuttaId('snp1.1', 'name')).toBe('Sutta Nipāta 1.1');
    });
    it("normalizeSuttaId(id) => normalized sutta_uid", async()=>{
        await bd.initialize();
        expect(bd.normalizeSuttaId('an2.12')).toBe('an2.11-20');
        expect(bd.normalizeSuttaId('an1.21-30')).toBe('an1.21-30');
        expect(bd.normalizeSuttaId('AN 1.21-30')).toBe('an1.21-30');
        expect(bd.normalizeSuttaId(' AN  1.21-30 ')).toBe('an1.21-30');
        expect(bd.normalizeSuttaId('An 1.21-30')).toBe('an1.21-30');
        expect(bd.normalizeSuttaId('Ds 1.1')).toBe('ds1.1');
        expect(bd.normalizeSuttaId('fear')).toBe(null);
        expect(bd.normalizeSuttaId('root of suffering')).toBe(null);
        expect(bd.normalizeSuttaId('1986')).toBe(null);
        expect(bd.normalizeSuttaId(' 1986')).toBe(null);
    });
    it("docPaths(...) filepath for scid", async()=>{
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
      expect(spath).toBe(path.join(bd.root, mn1));
      expect(fs.existsSync(spath)).toBe(true);

      expect(AuthorsV2.compare('davis', 'sujato')).toBe(-1);
      //DEBUG
      var spath = bd.docPaths(sutta_uid, lang, author)[0];
      expect(spath).toBe(path.join(bd.root, mn1));

      // argument list
      var spath = bd.docPaths(sutta_uid, lang, author)[0];
      expect(spath).toBe(path.join(bd.root, mn1));

      // default args
      var spath = bd.docPaths(sutta_uid, lang, author)[0];
      expect(spath).toBe(path.join(bd.root, mn1));

      // author unspecified
      var spath = bd.docPaths(sutta_uid, lang, )[0];
      expect(spath).toBe(path.join(bd.root, mn1));

      // lang, author unspecified
      var spath = bd.docPaths(sutta_uid)[0];
      expect(spath).toBe(path.join(bd.root, mn1));

      // variants
      var spath = bd.docPaths('MN 1')[0];
      expect(spath).toBe(path.join(bd.root, mn1));

      // By language
      var spath = bd.docPaths('an1.2','de')[0];
      expect(spath).toBe(path.join(bd.root,
          TRANSPATH('de','sabbamitta', 'an/an1/an1.1-10')));
      expect(fs.existsSync(spath)).toBe(true);

      // By SuttaCentralId
      var an1_1 = TRANSPATH('de','sabbamitta','an/an1/an1.1-10');
      var spath = bd.docPaths('an1.2:0.3','de')[0];
      expect(spath).toBe(path.join(bd.root,an1_1));
      expect(fs.existsSync(spath)).toBe(true);
    });
    it("docPaths(...) bad input", async()=>{
        // No file
        var spath = bd.docPaths('mn1','en','no-author')[0];
        expect(spath).toBe(undefined);

        // Errors
        expect(() => bd.docPaths()).toThrow();
        expect(() => bd.docPaths({
            // sutta_uid: 'MN 1',
            language: 'en',
            author_id: 'sujato',
        })).toThrow();
        var badId = 'abc';
        expect(() => bd.docPaths(badId,'en','sujato')).toThrow();
    });
    it("suttaPath(...) deprecated", async()=>{
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
        expect(spath).toBe(path.join(bd.root, mn1));
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
        expect(ids).toBeInstanceOf(Array);
        expect(ids.slice(0,KNSTART.length)).toEqual(KNSTART);
        expect(ids.slice(ids.length-3,ids.length)).toEqual(KNEND);
        expect(ids.length).toBe(2351);

        // Root nikaya an
        var ids = await bd.nikayaSuttaIds('an');
        expect(ids.length).toBe(1408);

        // Root nikaya sn
        var ids = await bd.nikayaSuttaIds('sn');
        expect(ids.length).toBe(1819);

        // Root nikaya dn
        var ids = await bd.nikayaSuttaIds('dn');
        expect(ids.length).toBe(34);

        // nikaya mn
        var ids = await bd.nikayaSuttaIds('mn');
        expect(ids.length).toBe(152);

        // nikaya, language
        var ids = await bd.nikayaSuttaIds('sn', 'de');
        expect(ids.length).toBeLessThan(1820);

        // Bad input
        var ids = await bd.nikayaSuttaIds('nonikaya', 'yiddish',
            'nobody');
        expect(ids).toEqual([]);
    });
    it("suttaList(pattern) => [normalized-sutta-reference]", async()=>{
        await bd.initialize();

        // Expand ranges an normalize sutta references
        expect(bd.suttaList(
            ['MN 1-3/de/sabbamitta','mn4/en'])).toEqual(
            ['mn1/de/sabbamitta',
                'mn2/de/sabbamitta',
                'mn3/de/sabbamitta',
                'mn4/en']);
        expect(bd.suttaList(['an1.2-11'])).toEqual(
            ['an1.1-10', 'an1.11-20']);

        expect(bd.suttaList(
            ['sn 45.161'])).toEqual(
            ['sn45.161']);
        expect(bd.suttaList(
            ['MN 1-3/en/sujato'])).toEqual(
            ['mn1/en/sujato', 'mn2/en/sujato', 'mn3/en/sujato']);
        expect(bd.suttaList(
            ['AN 5.179', 'sn29.1'])).toEqual(
            ['an5.179', 'sn29.1']);

        expect(bd.suttaList(
            ['an10.1-3'])).toEqual(
            ['an10.1', 'an10.2', 'an10.3']);

        expect(bd.suttaList(
            ['an2.3'])).toEqual(
            ['an2.1-10']);
        //expect(bd.suttaList(
            //['sn29'])).toEqual(
            //['sn29.1', 'sn29.2', 'sn29.3', 'sn29.4', 'sn29.5',
                //'sn29.6', 'sn29.7', 'sn29.8', 'sn29.9', 'sn29.10',
                //'sn29.11-20', 'sn29.21-50', ]);
        expect(bd.suttaList(
            ['SN28.8-10'])).toEqual(
            ['sn28.8', 'sn28.9', 'sn28.10']);
        expect(bd.suttaList(
            ['sn28.8-999'])).toEqual(
            ['sn28.8', 'sn28.9', 'sn28.10']);
        expect(bd.suttaList(
            ['sn29.1', 'mn33', 'SN29.2'])).toEqual(
            ['sn29.1', 'mn33', 'sn29.2']);
        expect(bd.suttaList(
            ['sn29.1', 'sn29.12', 'sn29.2'])).toEqual(
            ['sn29.1', 'sn29.11-20', 'sn29.2']);
        expect(bd.suttaList(
            'sn29.1, sn29.12, sn29.2')).toEqual(
            ['sn29.1', 'sn29.11-20', 'sn29.2']);
        expect(bd.suttaList(
            ['sn29.9-11'])).toEqual(
            ['sn29.9', 'sn29.10', 'sn29.11-20']);
        expect(bd.suttaList(
            ['sn29.1', 'sn29.1', 'sn29.2'])).toEqual(
            ['sn29.1', 'sn29.1', 'sn29.2']);
        expect(bd.suttaList(
            ['AN5.179', 'sn29.1'])).toEqual(
            ['an5.179', 'sn29.1']);

        expect(bd.suttaList(
            ['MN9-11'])).toEqual(
            ['mn9','mn10','mn11']);
        expect(bd.suttaList(
            ['mn9-11', 'mn10-12'])).toEqual(
            ['mn9','mn10','mn11','mn10','mn11','mn12']);
    });
    it("sutta_uidSuccessor(sutta_uid) => next sutta_uid", async()=>{
      await bd.initialize();

      // vinaya
      expect(bd.sutta_uidSuccessor('pli-tv-bi-vb-sk1',true)).toBe('pli-tv-bi-vb-sk2');
      expect(bd.sutta_uidSuccessor('pli-tv-bi-vb-sk1-75',true)).toBe('pli-tv-bi-vb-sk76');
      expect(bd.sutta_uidSuccessor('pli-tv-bi-vb-sk1',false)).toBe('pli-tv-bi-vb-sk75');
      expect(bd.sutta_uidSuccessor('pli-tv-bi-vb-sk75',false)).toBe('pli-tv-bi-vb-ss1');

      // logical
      expect(bd.sutta_uidSuccessor('mn33',true)).toBe('mn34');
      expect(bd.sutta_uidSuccessor('sn29.10-21',true)).toBe('sn29.22');
      expect(bd.sutta_uidSuccessor('sn29.10-21')).toBe('sn30.1');

      expect(bd.sutta_uidSuccessor('mn33',false)).toBe('mn34');
      expect(bd.sutta_uidSuccessor('sn29.10-21',false)).toBe('sn30.1');
      expect(bd.sutta_uidSuccessor('thag16.1')).toBe('thag16.2');
      expect(bd.sutta_uidSuccessor('thag16.1-10')).toBe('thag17.1');
    });
    it("sutta_uidSearch(...) normalizes sutta references", async()=>{
        await bd.initialize();
        var maxResults = 4;

        var res = bd.sutta_uidSearch("thig1.1/en/soma, thig1.2/en/soma");
        expect(res.uids).toEqual([ "thig1.1/en/soma", "thig1.2/en/soma", ]);
        expect(res.suttaRefs).toEqual([ "thig1.1/en/soma", "thig1.2/en/soma", ]);

        // minor id range AN10.1-10
        var res = bd.sutta_uidSearch("an10.1-10");
        expect(res.uids).toEqual([
            "an10.1", "an10.2", "an10.3", "an10.4", "an10.5",
        ]);
        expect(res.suttaRefs).toEqual([
            "an10.1",
            "an10.2",
            "an10.3",
            "an10.4",
            "an10.5",
        ]);

        // major id range MN2-11
        var res = bd.sutta_uidSearch("mn2-11", maxResults);
        expect(res.uids).toEqual([
            "mn2", "mn3", "mn4", "mn5",
        ]);

        // minor id range of ranged suttas
        var res = bd.sutta_uidSearch("an1.2-11");
        expect(res.uids).toEqual([
            "an1.1-10", "an1.11-20",
        ]);
        expect(res.lang).toBe(undefined);

        // language
        var res = bd.sutta_uidSearch("an1.2-11/de", maxResults);
        expect(res.uids).toEqual([
            "an1.1-10/de", "an1.11-20/de",
        ]);
        expect(res.suttaRefs).toEqual([
            "an1.1-10/de",
            "an1.11-20/de",
        ]);
        expect(res.lang).toBe('de');

        // author
        var res = bd.sutta_uidSearch("an1.2-11/en/bodhi", maxResults);
        expect(res.uids).toEqual([
            "an1.1-10/en/bodhi", "an1.11-20/en/bodhi",
        ]);
        expect(res.suttaRefs).toEqual([
            "an1.1-10/en/bodhi",
            "an1.11-20/en/bodhi",
        ]);
        expect(res.lang).toBe('en');
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
        expect(mld.segMap['an1.9:1.0']).toEqual(an1_9_en);
        var mld = await bd.loadMLDoc({
            suid: 'an1.2',
            lang: 'en',
        });
        expect(mld.segMap['an1.9:1.0']).toEqual(an1_9_en);

        // explicit
        var mld = await bd.loadMLDoc("an1.2/en");
        expect(mld.segMap['an1.9:1.0']).toEqual(an1_9_en);
        var mld = await bd.loadMLDoc("an1.2/en/sujato");
        expect(mld.segMap['an1.9:1.0']).toEqual(an1_9_en);
        var mld = await bd.loadMLDoc({
            suid: 'an1.2/en',
        });
        expect(mld.segMap['an1.9:1.0']).toEqual(an1_9_en);
        var mld = await bd.loadMLDoc({
            suid: 'an1.10',
            languages: ['en', 'pli'],
        });
        expect(mld.segMap['an1.9:1.0']).toEqual(an1_9_en);
        var mld = await bd.loadMLDoc({
            suid: 'an1.10',
            languages: ['de', 'pli'],
        });
        expect(mld.segMap['an1.9:1.0']).toEqual(an1_9_de);
    });
    it("loadMLDoc(...) loads trilingual doc", async()=>{
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
        expect(mld.segMap['an1.9:1.0']).toEqual(an1_9);

        // implicit
        var mld = await bd.loadMLDoc({
            suid: 'an1.10',
            lang: 'de',
        });
        expect(mld.segMap['an1.9:1.0']).toEqual(an1_9);
        var mld = await bd.loadMLDoc("an1.9/de");
        expect(mld.segMap['an1.9:1.0']).toEqual(an1_9);
        var mld = await bd.loadMLDoc("an1.9/de/sabbamitta");
        expect(mld.segMap['an1.9:1.0']).toEqual(an1_9);
    });
    it("trilingualDoc(...) ", async()=>{
        await bd.initialize();
        let rootLang = "pli";
        let rootAuthor = "ms";
        let refLang = "en";
        let refAuthor = "soma";
        let docLang = "de";
        let docAuthor = "sabbamitta";

        let mld = await bd.trilingualDoc("thig1.1", {
          docLang, 
          docAuthor,
          refLang,
          refAuthor,
        });
        let seg2_1 = mld.segMap['thig1.1:1.1'];
        expect(seg2_1, {
          scid: 'thig1.1:1.1',
          pli: "“Sukhaṁ supāhi therike, ",
          ref: '“Sleep with ease, Elder, ',
          de: 'Schlafe sanft, kleine Nonne, ',
        });
    });
    it("readBlurb(...) => blurb for language", async()=>{
    // TODO
        var bd = new BilaraData();
        await bd.initialize();
        var reAN3_1 = /Fools are dangerous, but the wise are safe/;
        var reAN5_108 = /Five factors of a worthy mendicant./;

        // full arguments
        var blurb = await bd.readBlurb({suid:'an5.108', lang:'en'});
        expect(blurb).toMatch(reAN5_108);
        var blurb = await bd.readBlurb({suid:'an3.1', lang:'en'});
        expect(blurb).toMatch(reAN3_1);

        // default language
        var blurb = await bd.readBlurb({suid:'an3.1'});
        expect(blurb).toMatch(reAN3_1);

        // case independent
        var blurb = await bd.readBlurb({suid:'AN3.1'});
        expect(blurb).toMatch(reAN3_1);

        // Unsupported language
        var blurb = await bd.readBlurb({suid:'AN3.1', lang:'xx'});
        expect(blurb).toMatch(reAN3_1);

        // German
        var blurb = await bd.readBlurb({suid:'an3.1', lang:'de'});
        expect(blurb).toMatch(
            /Toren sind gefährlich, aber kluge Menschen/);

        var blurb = await bd.readBlurb({suid:'dn33', lang:'de'});
        expect(blurb).toMatch(/Der Buddha ermuntert/);

        // no blurb
        var blurb = await bd.readBlurb({suid:'MN999'});
        expect(blurb).toBe(null);
    });
    it("version() => bilara-data package version", async()=>{
        // TODO
        await bd.initialize();
        expect(bd.version()).properties({
            major: 1,
            minor: 0,
            patch: 0,
        });
    });
    it("TESTTESloadMLDoc(...) loads all types", async()=>{ 
        return; // ALL_TYPES is deprecated
        await bd.initialize();
        var mld = await bd.loadMLDoc({
            suid: 'thag1.113',
            types: BilaraPathMap.ALL_TYPES,
        });
        var segs = mld.segments();
        expect(segs[0],{
            scid: 'thag1.113:0.1',
            html: "<article id='thag1.113'><header>"+
                "<ul><li class='division'>{}</li>",
            en: 'Verses of the Senior Monks',
            pli: 'Theragāthā',
        });
    });
    it("TESTTESinitialize() waits for indexLock", async()=>{ try {
      if (!TEST_UNPUBLISHED) { return; }
      let bd = new BilaraData({branch:'unpublished'});

      // create index.lock
      var indexLock = path.join(bd.root, '.git', 'index.lock');
      expect(fs.existsSync(indexLock)).toBe(false);
      fs.writeFileSync(indexLock, 'test');
      let resolved = false;

      // bd.sync will block
      let syncPromise = bd.initialize(true);
      syncPromise.then(()=>{ resolved = true; });
      await new Promise(r=>setTimeout(()=>r(), 200));
      expect(resolved).toBe(false);

      // bd.sync will continue
      await fs.promises.unlink(indexLock);
      await syncPromise;
      expect(resolved).toBe(true);
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
      expect(json.acronym).toBe(`AN 3.47`);
      expect(json.original_title).toBe('Saṅkhatalakkhaṇasutta');
      expect(json.translations, [{
          author,
          author_short,
          author_uid,
          has_comment: false,
          is_root: false,
          lang,
          lang_name,
          segmented: true,
          publication_date: "2019",
          id: `${suid}_translation-${lang}-${author_uid}`,
          title,
          volpage: null,
      }]);
    });
    it("loadSuttaplexJson(...)=>thig3.8 de", async()=>{
      if (!TEST_UNPUBLISHED) { return; }
      await bd.initialize();
      var suid = 'thig3.8';

      var lang = 'de';
      var lang_name = "Deutsch";
      var author = "Sabbamitta";
      var author_short = "sabbamitta";
      var author_uid = 'sabbamitta';

      let includeUnpublished = true;
      var json = await bd.loadSuttaplexJson(suid, lang, undefined, includeUnpublished);
      expect(json.acronym).toBe(`Thig 3.8`);
      expect(json.original_title).toBe('Somātherīgāthā');
      expect(json.translations[0].author_uid).toBe('sabbamitta');
      expect(json.translations[0], {
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
    it("TESTTESisBilaraDoc(...) => true if bilara file", async()=>{
        await bd.initialize();
        expect(bd.isBilaraDoc({ suid:"dn30", lang:"de", author:"sabbamitta" })).toBe(true);
        expect(bd.isBilaraDoc({ suid:"thig3.8", lang:"de", author:"sabbamitta" })).toBe(true);
    });
    it("suttaIds() => [ suid ]", async()=>{
        await bd.initialize();
        let suids = bd.suttaIds;

        for (let suid of suids) {
            expect(SuttaCentralId.test(suid)).toBe(true, `Expected suid: "${suid}"`);
        }
        expect(suids.length).toBeGreaterThan(6180);
        expect(suids.filter(suid=>/iti/ui.test(suid)).length).toBe(112);
        expect(suids.slice(0,5)).toEqual([
            "an1.1-10",
            "an1.11-20",
            "an1.21-30",
            "an1.31-40",
            "an1.41-50",
        ]);
        expect(suids.slice(-5)).toEqual([
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
        expect(bd.execGit).toBe(execGit);
        expect(await bd.initialize()).toBe(bd);
    });
    it("isFresh() => true if repo is latest", async()=>{
        var name = "test-repo";
        var gitAccount = "sc-voice";
        var bd = new BilaraData({name,gitAccount});
        let gitlogPath = path.join(bd.root, BilaraData.GITLOG_FNAME);
        fs.existsSync(gitlogPath) && fs.unlinkSync(gitlogPath);
        expect(fs.existsSync(gitlogPath)).toBe(false);
        expect(await bd.isFresh()).toBe(false);
        expect(fs.existsSync(gitlogPath)).toBe(true);
        expect(await bd.isFresh()).toBe(true);

        var root = '/tmp/not-there';
        var bd = new BilaraData({name, root});
        expect(await bd.isFresh()).toBe(false);
    });
    it("expandRange()", async()=>{
      const msg = "test/BilaraData.expandRange() ";
      let bd = new BilaraData();
      let res = await bd.initialize();

      // MIL
      expect(bd.expandRange("mil3.1.2"), [ 'mil3.1.2', ]);

      // MN, DN
      expect(bd.expandRange("mn2"), [ 'mn2', ]);
      expect(bd.expandRange("dn2-4"), [ 'dn2', 'dn3', 'dn4' ]);

      // SN, AN
      expect(bd.expandRange("sn1.2"), [ 'sn1.2', ]);
      expect(bd.expandRange("sn1.2-4"), [
        'sn1.2', 'sn1.3', 'sn1.4',
      ]);
      expect(bd.expandRange("an1.2-4"), [ 'an1.1-10', ]);

    });
})
