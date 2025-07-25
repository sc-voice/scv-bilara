(typeof describe === 'function') && 
  describe("bilara-path-map", function() {
    const should = require("should");
    const path = require('path');
    const fs = require('fs');
    const {
        BilaraData,
        BilaraPathMap,
    } = require("../index");
    const { BilaraPath } = require("scv-esm");
    const tmp = require('tmp');
    var {
        commentPath,
        referencePath,
        translationPath,
        rootPath,
        htmlPath,
    } = BilaraPath;
    this.timeout(5*1000);
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
    const LOCALDIR = path.join(__dirname, '..', 'local');

    function TRANSPATH(lang,auth,mid, category='sutta') {
        return [
            'translation',
            lang,
            `${auth}/${category}`,
            `${mid}_translation-${lang}-${auth}.json`
        ].join('/');
    }


    var bd = new BilaraData;

    it("default ctor",async()=>{
        var bpm = new BilaraPathMap();
        should(bpm.initialized).equal(false);
    });
    it("suidPath(suid) => local bilara paths", async()=>{
        var bpm = new BilaraPathMap()
        should.throws(()=>{bpm.suidPaths('dn33');});
        await bpm.initialize();

        // must be initialized
        should(bpm.initialized).equal(true);
        should.deepEqual(bpm.suidPaths('dn33'), {
//"html/pli/ms": htmlPath("dn/dn33"),
//"reference/pli/ms": "reference/pli/ms/sutta/dn/dn33_reference.json",
"root/pli/ms": "root/pli/ms/sutta/dn/dn33_root-pli-ms.json",
//"variant/pli/ms": "variant/pli/ms/sutta/dn/dn33_variant-pli-ms.json",
//"comment/de/sabbamitta": commentPath('dn/dn33', 'de','sabbamitta'),
//"comment/en/sujato": commentPath('dn/dn33', 'en','sujato'),
"translation/en/sujato": translationPath('dn/dn33','en','sujato'),
//"translation/my/my-team": translationPath('dn/dn33','my','my-team'),
//"translation/ru/team": translationPath('dn/dn33','ru','team'),
"translation/de/sabbamitta": translationPath('dn/dn33','de','sabbamitta'),
"translation/sr/brankokovacevic": "translation/sr/brankokovacevic/sutta/dn/dn33_translation-sr-brankokovacevic.json",
        });
    });
    it("bilaraPaths(suid) returns local bilara paths",async()=>{
      const msg = 'TB11p.bilaraPaths:';
      var bpm = await new BilaraPathMap().initialize();

      var bps = bpm.bilaraPaths({
          suid: "mn8",
          types: BilaraPathMap.ALL_TYPES,
      });
      let wijayaratna = bps.filter(bp=>bp.author_uid === 'wijayaratna');
      should(wijayaratna[0]).properties({
        author_uid: 'wijayaratna',
        lang: 'fr',
      });

      var bps = bpm.bilaraPaths({
          suid: "thag1.113",
          types: BilaraPathMap.ALL_TYPES,
      });
      should.deepEqual(bps.map(bp=>bp.bilaraPath).sort().slice(0,3), [
          rootPath('kn/thag/thag1.113'),
          translationPath('kn/thag/thag1.113','de','sabbamitta'),
          translationPath('kn/thag/thag1.113','en','sujato'),
      ]);

      var bps = bpm.bilaraPaths({
          suid: "an1.1-10",
          lang: ['en','de'],
          types: BilaraPathMap.ALL_TYPES,
      });
      let bilPaths = bps
        .map(bp=>bp.bilaraPath)
        .filter(bp=>/sabbamitta|sujato/.test(bp))
        .sort();
      should.deepEqual(bilPaths, [
          translationPath('an/an1/an1.1-10','de','sabbamitta'),
          translationPath('an/an1/an1.1-10','en','sujato'),
      ]);

      var bps = bpm.bilaraPaths({
          suid: "an1.1-10",
          lang: 'de',
          types: BilaraPathMap.ALL_TYPES,
      });
      should.deepEqual(bps.map(bp=>bp.bilaraPath).sort(), [
          //commentPath('an/an1/an1.1-10','de','sabbamitta'),
          translationPath('an/an1/an1.1-10','de','sabbamitta'),
      ]);

      var bps = bpm.bilaraPaths({
          suid: "an1.1-10",
          lang: 'en',
          types: BilaraPathMap.ALL_TYPES,
      });
      should.deepEqual(bps.map(bp=>bp.bilaraPath).filter(bp=>/sujato/.test(bp)), [
          translationPath('an/an1/an1.1-10','en','sujato'),
      ]);

      var bps = bpm.bilaraPaths({
          suid: "an1.1-10",
          lang: 'de',
          types: BilaraPathMap.ALL_TYPES,
      });
      should.deepEqual(bps.map(bp=>bp.bilaraPath), [
          translationPath('an/an1/an1.1-10','de','sabbamitta'),
          //commentPath('an/an1/an1.1-10','de','sabbamitta'),
      ]);

      var bps = bpm.bilaraPaths({
          suid: "an1.1-10",
          author: 'sujato',
          types: BilaraPathMap.ALL_TYPES,
      });
      should.deepEqual(bps.map(bp=>bp.bilaraPath), [
          translationPath('an/an1/an1.1-10','en','sujato'),
          //commentPath('an/an1/an1.1-10','en','sujato'),
      ]);
    });
    it("trilingualPaths(suid) sujato/soma",async()=>{
      var bpm = await new BilaraPathMap().initialize();
      let suid = "thig1.1";
      let pathRoot = rootPath('kn/thig/thig1.1');
      let sujatoPath = translationPath('kn/thig/thig1.1','en','sujato');
      let somaPath = translationPath('kn/thig/thig1.1','en','soma');

      should.deepEqual(bpm.trilingualPaths({ suid, 
        refLang: "en",
        refAuthor: "sujato", 
        docLang: 'en',
        docAuthor: "soma",
      }), [pathRoot, somaPath, sujatoPath]);

      should.deepEqual(bpm.trilingualPaths({ suid, 
        refLang: 'en',
        refAuthor: 'soma',
        docLang: 'en',
        docAuthor: 'sujato',
      }), [pathRoot, sujatoPath, somaPath ]);

      should.deepEqual(bpm.trilingualPaths({ suid, 
        docLang: 'en',
        docAuthor: "soma",
      }), [pathRoot, somaPath, sujatoPath, ]);

      // eliminate duplicates
      should.deepEqual(bpm.trilingualPaths({ suid, 
        refLang: 'en',
        refAuthor: 'soma',
        docLang: 'pli',
        docAuthor: 'ms',
      }), [pathRoot, somaPath]);
      should.deepEqual(bpm.trilingualPaths({ suid, 
        refLang: 'en',
        refAuthor: 'soma',
        docLang: 'en',
        docAuthor: 'soma',
      }), [pathRoot, somaPath]);
      should.deepEqual(bpm.trilingualPaths({ suid, 
        refLang: 'pli',
        refAuthor: 'ms',
      }), [pathRoot, ]);

    });
    it("bilaraPaths(k) uses scv-esm suidmap",async()=>{
        let rootName = 'ebt-data';
        let root = path.join(LOCALDIR, rootName);
        var bpm = await new BilaraPathMap({root}).initialize();
        should(bpm.root).equal(root);
        should(bpm.suidMapFile).equal(path.join(__dirname, '../src/auto/suidmap.json'));
        should.deepEqual(bpm.suidPaths('sn22.56/de'), {
          'translation/en/sujato': 'translation/en/sujato/sutta/sn/sn22/sn22.56_translation-en-sujato.json',
          'translation/de/sabbamitta': 'translation/de/sabbamitta/sutta/sn/sn22/sn22.56_translation-de-sabbamitta.json',
          //'translation/en/davis': 'translation/en/davis/sutta/sn/sn22/sn22.56_translation-en-davis.json',
          'root/pli/ms': 'root/pli/ms/sutta/sn/sn22/sn22.56_root-pli-ms.json'
        });
    });
    it("bilaraPaths(suid) ignores stub translations",async()=>{
        var bpm = await new BilaraPathMap().initialize();

        var bps = bpm.bilaraPaths({
            lang: ['pli', 'en', 'de'],
            suid: "mn1",
            types: ['root', 'translation'],
        });
        should.deepEqual(bps.map(bp=>bp.bilaraPath).sort(), [
            rootPath('mn/mn1'),
            translationPath('mn/mn1','de','sabbamitta'),
            translationPath('mn/mn1','en','sujato'),
        ]);
    });
    it("suidLanguages(suid) => language info",async()=>{
        var bpm = await new BilaraPathMap().initialize();
        let suidLanguages = bpm.suidLanguages('thig3.8');
        should.deepEqual(suidLanguages.filter(l=>l.author==='ms')[0], {
            author: 'ms',
            bilaraPath: 'root/pli/ms/sutta/kn/thig/thig3.8_root-pli-ms.json',
            category: 'sutta',
            lang: 'pli',
            nikaya: 'kn',
            suid: 'thig3.8',
        });
        should.deepEqual(suidLanguages.filter(l=>l.author==='sabbamitta')[0], {
            author: 'sabbamitta',
            bilaraPath: TRANSPATH('de','sabbamitta','thig3.8','sutta/kn/thig'),
            category: 'sutta',
            lang: 'de',
            nikaya: 'kn',
            suid: 'thig3.8',
        });
        should.deepEqual(suidLanguages.filter(l=>l.author==='sujato')[0], {
            author: 'sujato',
            bilaraPath: TRANSPATH('en','sujato','thig3.8','sutta/kn/thig'),
            category: 'sutta',
            lang: 'en',
            nikaya: 'kn',
            suid: 'thig3.8',
        });
    });
    it("TESTTESTbuildSuidMap() => [ suid ]", async()=>{
        let bpm = await new BilaraPathMap().initialize();
        let suidMap = await bpm.buildSuidMap();
        let suids = Object.keys(suidMap);

        should(suids.length).above(5500);
        should.deepEqual(Object.keys(suidMap["dhp1-20"]),[
            'translation/de/sabbamitta',
            'translation/en/suddhaso',
            'translation/en/sujato',
            'translation/et/thitanana',
            'translation/vi/phantuananh',
            'root/pli/ms',
            //'html/pli/ms',
            //'reference/pli/ms',
            //'variant/pli/ms',
        ]);
        should.deepEqual(Object.keys(suidMap.iti42),[
            //'translation/en/suddhaso',
            'translation/de/sabbamitta',
            'translation/en/sujato',
            'translation/lt/piyadassi',
            'root/pli/ms',
            //'html/pli/ms',
            //'reference/pli/ms',
            //'variant/pli/ms',
        ]);
    });
    it("tipitakaFolders() => root folder paths",async()=>{
        let bpm = await new BilaraPathMap().initialize();
        let takaPaths = await bpm.tipitakaPaths();
        should(takaPaths.filter(p=>/abhidhamma/.test(p)).length).equal(8);
        should(takaPaths.filter(p=>/sutta/.test(p)).length).equal(26);
        should(takaPaths.filter(p=>/vinaya/.test(p)).length).equal(18);
        should.deepEqual(takaPaths.filter(p=>/sutta/.test(p)), [
            'sutta',
            'sutta/an',
            'sutta/dn',
            'sutta/kn',
            'sutta/kn/bv',
            'sutta/kn/cnd',
            'sutta/kn/cp',
            'sutta/kn/dhp',
            'sutta/kn/iti',
            'sutta/kn/ja',
            'sutta/kn/kp',
            'sutta/kn/mil',
            'sutta/kn/mnd',
            'sutta/kn/ne',
            'sutta/kn/pe',
            'sutta/kn/ps',
            'sutta/kn/pv',
            'sutta/kn/snp',
            'sutta/kn/tha-ap',
            'sutta/kn/thag',
            'sutta/kn/thi-ap',
            'sutta/kn/thig',
            'sutta/kn/ud',
            'sutta/kn/vv',
            'sutta/mn',
            'sutta/sn',
        ]);
    });
    it("custom suid map", async()=>{
        let suidMapFile = tmp.tmpNameSync();
        let validatePath = (key,value,suid) => {
            return suid === 'sn12.23';
        };
        let bpm = await new BilaraPathMap({
            suidMapFile,
            validatePath,
        }).initialize();
        console.log('reading suidMapFile', suidMapFile);
        let json = JSON.parse(await fs.promises.readFile(suidMapFile));
        should.deepEqual(json, {
            'sn12.23': {
                'translation/de/sabbamitta': 'sutta/sn/sn12',
                'translation/en/sujato': 'sutta/sn/sn12',
                'translation/lt/piyadassi': 'sutta/sn/sn12',
        //        'translation/en/davis': 'sutta/sn/sn13',
                'root/pli/ms': 'sutta/sn/sn12'
            }
        });
    });
    it("langAuthorRegExp()", () => {
      let reSoma = BilaraPathMap.langAuthorRegExp("en", "soma");
      should(reSoma.test("a/b/c/d/eeeeee-en-soma.json")).equal(true);
      should(reSoma.test("a/b/c/d/eeeeee-it-soma.json")).equal(false);
      should(reSoma.test("a/b/c/d/eeeeee-en-somax.json")).equal(false);
      should(reSoma.test("a/b/c/d/eeeeee-en-xsomax.json")).equal(false);
      should(reSoma.test("a/b/c/d/eeeeee-enx-soma.json")).equal(false);
      should(reSoma.test("a/b/c/d/eeeeee-xen-soma.json")).equal(false);
      should(reSoma.test("a/b/c/d/eeeeee-en-sujato.json")).equal(false);
      should(reSoma.test("a/b/c/d/eeeeee-en-soma.xml")).equal(false);

      should(BilaraPathMap.langAuthorRegExp("en"))
        .equal(undefined);
      should(BilaraPathMap.langAuthorRegExp(null, "sujato"))
        .equal(undefined);
      should(BilaraPathMap.langAuthorRegExp(undefined, "sujato"))
        .equal(undefined);
    });
})
