typeof describe === "function" &&
  describe("Seeker", function () {
    const should = require("should");
    const fs = require("fs");
    const path = require("path");
    const {
      BilaraData,
      BilaraPathMap,
      MLDoc,
      Pali,
      English,
      FuzzyWordSet,
      Seeker,
      Unicode,
    } = require("../index");
    const { BilaraPath } = require("scv-esm");
    const { logger, LogInstance } = require("log-instance");
    logger.logLevel = "warn";
    const { Files } = require("memo-again");
    const SEEKEROPTS = {};
    const TEST_UNPUBLISHED = false;
    var { translationPath, rootPath } = BilaraPath;
    this.timeout(20 * 1000);
    var bd = new BilaraData();
    logger.level = "warn";
    var en_suj = `translation/en/sujato/sutta/`;
    var en_bra = `translation/en/brahmali/vinaya/`;
    var de_sab = `translation/de/sabbamitta/sutta/`;
    var my_my = `translation/my/my-team/sutta/`;
    var en_dav = `translation/en/davis/sutta/`;
    var pli_ms = `root/pli/ms/sutta/`;

    const BILARA_PATH = path.join(Files.LOCAL_DIR, "bilara-data");
    const TEST_BILARA_PATH = path.join(__dirname, "data", "bilara-data");
    const SUTTA_ROOT_SUFF = [
      `${en_suj}sn/sn42/sn42.11_translation-en-sujato.json:5`,
      `${en_suj}mn/mn105_translation-en-sujato.json:3`,
      `${en_suj}mn/mn1_translation-en-sujato.json:2`,
      `${en_suj}sn/sn56/sn56.21_translation-en-sujato.json:1`,
      `${en_suj}mn/mn66_translation-en-sujato.json:1`,
      `${en_suj}mn/mn116_translation-en-sujato.json:1`,
      `${en_suj}dn/dn16_translation-en-sujato.json:1`,
    ];
    const VINAYA_ROOT_SUFF = [
      `${en_bra}pli-tv-kd/pli-tv-kd6_translation-en-brahmali.json:1`,
    ];

    it("default ctor", () => {
      var skr = new Seeker();
      should(skr).properties({
        languages: ["pli", "en"],
        includeUnpublished: false,
        lang: "en",
        enWords: undefined,
        lang: "en",
        matchColor: 121,
        matchHighlight: "\x1B[38;5;121m$&\x1B[0m",
        maxDoc: 50,
        maxResults: 1000,
        minLang: 2,
        paliWords: undefined,
        root: BILARA_PATH,
      });
      should(skr.logger).equal(logger);
    });
    it("custom ctor", () => {
      var logger2 = new LogInstance();
      logger2.logLevel = logger.logLevel;
      var lang = "de";
      var writeFile = false;
      var paliWords = new FuzzyWordSet();
      var skr = new Seeker({
        root: "/tmp/test",
        logger: logger2,
        lang,
        paliWords,
        writeFile,
      });
      should(skr.root).equal("/tmp/test");
      should(skr.logger).equal(logger2);
      should(skr).properties({
        lang,
      });
      should(skr.paliWords).instanceOf(FuzzyWordSet);
      should(skr.memoizer.cache.writeFile).equal(writeFile);
    });
    it("grepAllow/Deny matches file names", () => {
      var reAllow = new RegExp("^[^/]+/sutta/(an|sn|mn|kn|dn)/", "iu");
      var reDeny = new RegExp("/(dhp)/", "iu");
      var fn = "sujato/sutta/sn/sn42/" + "sn42.11_translation-en-sujato.json:5";
      should(reAllow.test(fn)).equal(true);
      should(reDeny.test(fn)).equal(false);
    });
    it("grep(...) finds sutta things", async () => {
      var skr = new Seeker({});
      var ms0 = Date.now();
      var maxResults = 1;
      let author = 'sujato';
      await skr.clearMemo("grep");
      var res = await skr.grep({
        author,
        pattern: "root of suffering",
        maxResults,
      });
      //should.deepEqual(res, [...SUTTA_ROOT_SUFF, ...VINAYA_ROOT_SUFF]);
      should.deepEqual(res, SUTTA_ROOT_SUFF.slice(0,maxResults));
      var ms1 = Date.now();
      var res2 = await skr.grep({ author, pattern: "root of suffering", maxResults });
      var ms2 = Date.now();
      should.deepEqual(res2, res);

      //console.log(`dbg grep`, ms1-ms0, ms2-ms1);
      should(ms2 - ms1).below(20);
    });
    it("grep(...) finds maxResults things", async () => {
      var skr = new Seeker(SEEKEROPTS);
      var maxResults = 1;
      var res = await skr.grep({
        author: "sujato",
        pattern: "root of suffering",
        maxResults,
      });
      should.deepEqual(res, SUTTA_ROOT_SUFF.slice(0, maxResults));
    });
    it("grep(...) filters result files", async () => {
      var skr = new Seeker(SEEKEROPTS);
      var res = await skr.grep({
        author: "sujato",
        pattern: "a single day",
        tipitakaCategories: "su",
      });
      should.deepEqual(res, [
        `${en_suj}kn/dhp/dhp100-115_translation-en-sujato.json:6`,
        `${en_suj}dn/dn9_translation-en-sujato.json:1`,
        `${en_suj}an/an10/an10.46_translation-en-sujato.json:1`,
        //`${en_dav}dn/dn9_translation-en-davis.json:1`,
      ]);
    });
    it("grep(...) finds de things", async () => {
      var skr = new Seeker(SEEKEROPTS);
      var maxResults = 5;
      let author = 'sabbamitta';
      let lang = 'de';

      // diacritical word boundary
      var res = await skr.grep({ author, lang,
        pattern: "übung",
        maxResults,
      });
      should.deepEqual(res.slice(0, 4), [
        `${de_sab}dn/dn25_translation-de-sabbamitta.json:48`,
        `${de_sab}dn/dn8_translation-de-sabbamitta.json:29`,
        `${de_sab}an/an6/an6.63_translation-de-sabbamitta.json:25`,
        `${de_sab}an/an4/an4.198_translation-de-sabbamitta.json:17`,
        //`${de_sab}dn/dn33_translation-de-sabbamitta.json:15`,
        //`${de_sab}dn/dn34_translation-de-sabbamitta.json:18`,
        //`${de_sab}an/an6/an6.30_translation-de-sabbamitta.json:15`,
      ]);
      should(res.length).below(6);

      var res = await skr.grep({author, lang,
        pattern: "wie der geist",
      });
      should.deepEqual(res, [
        `${de_sab}an/an1/an1.31-40_translation-de-sabbamitta.json:10`,
        `${de_sab}an/an1/an1.21-30_translation-de-sabbamitta.json:10`,
        //`${de_sab}an/an3/an3.61_translation-de-sabbamitta.json:3`,
        `${de_sab}an/an1/an1.41-50_translation-de-sabbamitta.json:2`,
      ]);
    });
    it("sanitizePattern(...) code injection guard", () => {
      var testPattern = (pattern, expected) => {
        should(Seeker.sanitizePattern(pattern)).equal(expected);
      };
      testPattern('"doublequote"', ".doublequote.");
      testPattern("'singlequote'", ".singlequote.");
      testPattern("a$b", "a$b");
      testPattern("a.b", "a.b");
      testPattern("a.*b", "a.*b");
      testPattern("a\\'b", "a\\.b");
      testPattern("a\u0000b", "ab");
      testPattern("a\u0001b", "ab");
      testPattern("a\u007Fb", "ab");
      testPattern("sattānaṃ", "sattānaṃ");
      should.throws(() => SuttaStore.sanitizePattern("not [good"));
    });
    it("normalizePattern(...) code injection guard", () => {
      var testPattern = (pattern, expected) => {
        should(Seeker.normalizePattern(pattern)).equal(expected);
      };
      testPattern("root of suffering", "root of suffering");
      testPattern(" root  of  suffering ", "root of suffering");
      testPattern("a\nb\n\r\n\rc", "a b c");
      testPattern("a\tb\t\t\rc", "a b c");
      testPattern("a$b", "a$b");
      testPattern("a.b", "a.b");
      testPattern("a.*b", "a.*b");
      testPattern("a.+b", "a.+b");
      testPattern("sattānaṃ", "sattānaṃ");
    });
    it("keywordPattern(...) returns grep pattern", (done) => {
      (async function () {
        try {
          var skr = await new Seeker(SEEKEROPTS).initialize();
          should(skr.keywordPattern("anathapindika", "en")).equal(
            "\\b(a|ā)(n|ṅ|ñ|ṇ)(a|ā)(t|ṭ)h(a|ā)p" +
              "(i|ī)(n|ṅ|ñ|ṇ)(d|ḍ)(i|ī)k(a|ā)"
          );
          should(skr.keywordPattern("anathapindika", "pli")).equal(
            "\\b(a|ā)(n|ṅ|ñ|ṇ)(a|ā)(t|ṭ)h(a|ā)p" +
              "(i|ī)(n|ṅ|ñ|ṇ)(d|ḍ)(i|ī)k(a|ā)"
          );
          done();
        } catch (e) {
          done(e);
        }
      })();
    });
    it("keywordSearch(...) limits results", async () => {
      var lang = "en";
      var pattern = Seeker.normalizePattern("suffering joy faith");
      var maxResults = 1;
      var skr = await new Seeker({
        maxResults,
        lang,
      }).initialize(`dbg 1`);
      var expected = {
        method: "keywords",
        lang: "en",
      };

      var data = await skr.keywordSearch(skr.findArgs([{
        pattern,
        // maxResults taken from Seeker.maxResults
      }]));
      should(data).properties(expected);

      skr.maxResults = 100; // keywordSearch will override
      should(skr.maxResults).equal(100);
      var data = await skr.keywordSearch(skr.findArgs([{
        pattern,
        maxResults, // explicit specification
      }]));
      should(data).properties(expected);
      should.deepEqual(data.lines, [
        `${en_suj}dn/dn34_translation-en-sujato.json:5`,
        //`${en_suj}dn/dn33_translation-en-sujato.json:4`,
        //`${en_suj}sn/sn12/sn12.23_translation-en-sujato.json:4`,
      ]);
    });
    it("keywordSearch(...) searches English", async () => {
      var pattern = Seeker.normalizePattern("suffering joy faith");
      var skr = await new Seeker({
        lang: "de", // Deutsch
      }).initialize(`dbg 2`);
      var maxResults = 1;
      var data = await skr.keywordSearch(skr.findArgs([{
        pattern,
        lang: "en", // overrides Seeker default lang
        maxResults,
      }]));
      var enExpected = {
        lang: "en",
        method: "keywords",
      };
      should(data).properties(enExpected);
      should.deepEqual(data.lines.slice(0, 4), [
        `${en_suj}dn/dn34_translation-en-sujato.json:5`,
        //`${en_suj}dn/dn33_translation-en-sujato.json:4`,
        //`${en_suj}sn/sn12/sn12.23_translation-en-sujato.json:4`,
        //`${en_suj}dn/dn10_translation-en-sujato.json:2`,
      ]);

      // Using Seeker default lang still returns English
      var data = await skr.keywordSearch(skr.findArgs([{
        pattern,
      }]));
      should(data).properties(enExpected);

      // Change Seeker default language to English
      skr.lang = "en"; // Not advisable for multiple users
      should(skr.lang).equal("en");
      var data = await skr.keywordSearch(skr.findArgs([{
        pattern,
      }]));
      should(data).properties(enExpected);
    });
    it("keywordSearch(...) searches Pali, not English", async () => {
      var maxResults = 2;
      var skr = await new Seeker({
        maxResults,
      }).initialize();
      var expected = {
        method: "keywords",
        maxResults,
        lang: "pli", // searching bilara-data/root/pli
        lines: [
          `${pli_ms}an/an10/an10.93_root-pli-ms.json:9`,
          `${pli_ms}sn/sn10/sn10.8_root-pli-ms.json:9`,
        ],
      };

      // Single Pali keyword searches Pali
      var data = await skr.keywordSearch(skr.findArgs([{
        pattern: "Anāthapiṇḍika",
        lang: "en", // will be ignored
      }]));
      should(data).properties(expected);

      // Single romanized Pali searches Pali
      var data = await skr.keywordSearch(skr.findArgs([{
        pattern: "anathapindika",
      }]));
      should(data).properties(expected);
    });
    it("keywordSearch(...) searches English, not Pali", async () => {
      var maxResults = 2;
      var skr = await new Seeker({
        maxResults,
      }).initialize();
      var expected = {
        method: "keywords",
        maxResults,
        lang: "en", // searching bilara-data/translation/en
        lines: [
          `${en_suj}mn/mn143_translation-en-sujato.json:16`,
          `${en_suj}an/an10/an10.93_translation-en-sujato.json:11`,
        ],
      };

      // Single Pali keyword searches Pali
      var data = await skr.keywordSearch(skr.findArgs([{
        pattern: "Anāthapiṇḍika",
        searchLang: "en", // will not be ignored
        lang: "en", // will be ignored
      }]));
      should(data).properties(expected);
    });
    it("keywordSearch(...) searches Pali, not Deutsch", async () => {
      let maxResults = 2;
      let skr = await new Seeker({
        lang: "de",
        maxResults,
      }).initialize();
      let expected = {
        method: "keywords",
        maxResults,
        lang: "pli", // searching bilara-data/root/pli
        lines: [
          `${pli_ms}an/an10/an10.93_root-pli-ms.json:9`,
          `${pli_ms}sn/sn10/sn10.8_root-pli-ms.json:9`,
        ],
      };

      // Single Pali keyword searches Pali
      let data = await skr.keywordSearch(skr.findArgs([{
        pattern: "Anāthapiṇḍika",
        lang: "de", // will be ignored
      }]));
      should(data).properties(expected);

      // Single romanized Pali searches Pali
      data = await skr.keywordSearch(skr.findArgs([{
        pattern: "anathapindika",
        lang: "de", // will be ignored
      }]));
      should(data).properties(expected);
    });
    it("keywordSearch(...) searches Deutsch, not Pali", async () => {
      var skr = await new Seeker({
        lang: "en", // English default
      }).initialize();
      var expected = {
        lang: "de",
        resultPattern:
          "\\b(a|ā)(n|ṅ|ñ|ṇ)(a|ā)(t|ṭ)h(a|ā)p(i|ī)(n|ṅ|ñ|ṇ)" +
          "(d|ḍ)(i|ī)k(a|ā)|\\bhausbesitzer",
        maxResults: 10,
        method: "keywords",
        lines: [
          `${de_sab}an/an10/an10.93_translation-de-sabbamitta.json:10`,
          `${de_sab}mn/mn143_translation-de-sabbamitta.json:10`,
          `${de_sab}sn/sn55/sn55.26_translation-de-sabbamitta.json:6`,
          `${de_sab}sn/sn55/sn55.27_translation-de-sabbamitta.json:5`,
          `${de_sab}sn/sn10/sn10.8_translation-de-sabbamitta.json:4`,
          `${de_sab}an/an7/an7.63_translation-de-sabbamitta.json:3`,
          `${de_sab}an/an2/an2.32-41_translation-de-sabbamitta.json:2`,
          `${de_sab}an/an5/an5.41_translation-de-sabbamitta.json:2`,
          `${de_sab}an/an9/an9.20_translation-de-sabbamitta.json:2`,
          `${de_sab}an/an1/an1.248-257_translation-de-sabbamitta.json:1`,
          //`${de_sab}an/an10/an10.91_translation-de-sabbamitta.json:1`,
          //`${de_sab}an/an10/an10.92_translation-de-sabbamitta.json:1`,
          //`${de_sab}an/an3/an3.109_translation-de-sabbamitta.json:1`,
          //`${de_sab}an/an3/an3.110_translation-de-sabbamitta.json:1`,
          //`${de_sab}an/an4/an4.197_translation-de-sabbamitta.json:1`,
          //`${de_sab}an/an4/an4.58_translation-de-sabbamitta.json:1`,
          //`${de_sab}an/an4/an4.60_translation-de-sabbamitta.json:1`,
        ],
      };

      // Mixed Pali/Deutsch keywords initial cap
      var data = await skr.keywordSearch(skr.findArgs([{
        pattern: Seeker.normalizePattern("Anathapindika Hausbesitzer"),
        maxResults: 10,
        lang: "de", // Requesting Deutsch search
      }]));
      should.deepEqual(data, expected);

      // Mixed Pali/Deutsch keywords lowercase
      var data = await skr.keywordSearch(skr.findArgs([{
        pattern: Seeker.normalizePattern("anathapindika hausbesitzer"),
        maxResults: 10,
        lang: "de", // Requesting Deutsch search
      }]));
      should.deepEqual(data, expected);
    });
    it("find(...) scores relevance", async () => {
      var skr = await new Seeker({
        lang: "en", // English default
      }).initialize();

      // Mixed Pali/Deutsch keywords initial cap
      var pattern = "abhisambuddha";
      var data = await skr.find({
        pattern,
      });
      should(data.resultPattern).equal(
        "\\b(a|ā)bh(i|ī)s(a|ā)(m|ṁ|ṃ)b(u|ū)(d|ḍ)(d|ḍ)h(a|ā)"
      );
      should(data.method).equal("phrase");
      var mld0 = data.mlDocs[0];
      should(mld0.bilaraPaths[0]).equal(
        "root/pli/ms/sutta/dn/dn34_root-pli-ms.json"
      );
      should(mld0.score).equal(10.011);
    });
    it("find(...) scores relevance: on fire", async () => {
      var skr = await new Seeker({
        lang: "en", // English default
      }).initialize();

      // Mixed Pali/Deutsch keywords initial cap
      var pattern = "on fire";
      var data = await skr.find({
        pattern,
      });
      should(data.resultPattern).equal("\\bon fire");
      should(data.method).equal("phrase");
      var [mld0, mld1] = data.mlDocs;
      should(mld1.bilaraPaths[0]).equal(
        "root/pli/ms/sutta/sn/sn56/sn56.34_root-pli-ms.json"
      );
      should(mld1.score).equal(2.2);
    });
    it("patternLanguage(...) => search language context", async () => {
      let enWords = await English.wordSet({ source: "file" });
      var skr = await new Seeker({ enWords }).initialize();

      // "gehe" and "so" are both German and Pali
      should(skr.patternLanguage("anathapindika gehe so", "de")).equal("pli");

      should(skr.patternLanguage("rat", "de")).equal("de");
      should(skr.patternLanguage("blind", "de")).equal("de");
      should(
        skr.patternLanguage("buddha was staying near benares", "de")
      ).equal("en");
      should(
        skr.patternLanguage("buddha was staying near benares", "en")
      ).equal("en");

      // Sutta references
      should(skr.patternLanguage("mn1", "de")).equal("de");
      should(skr.patternLanguage("mn1/pli", "de")).equal("pli");
      should(skr.patternLanguage("mn1/en", "de")).equal("en");
      should(skr.patternLanguage("mn1/en/sujato", "de")).equal("en");
      should(skr.patternLanguage("mn1/de", "de")).equal("de");
      should(skr.patternLanguage("mn1/de/sabbamitta", "de")).equal("de");

      should(skr.patternLanguage("wurzel des leidens", "de")).equal("de");
      should(skr.patternLanguage("awakened buddha", "de")).equal("en");
      should(skr.patternLanguage("anathema")).equal("en");
      should(skr.patternLanguage("anathema", "en")).equal("en");
      should(skr.patternLanguage("anath")).equal("en");
      should(skr.patternLanguage("anath", "en")).equal("en");
      should(skr.patternLanguage("anatha")).equal("pli");
      should(skr.patternLanguage("anatha", "en")).equal("pli");
      should(skr.patternLanguage("anathapindika")).equal("pli");
      should(skr.patternLanguage("anathapindika", "en")).equal("pli");
      should(skr.patternLanguage("anathapindika monastery")).equal("en");
      should(skr.patternLanguage("anathapindika monastery", "en")).equal("en");
      should(skr.patternLanguage("anathapindika kloster", "de")).equal("de");
      should(skr.patternLanguage("anathapindika kloster")).equal("en");
    });
    it("find(...) ignores unpublished", async () => {
      var lang = "en";
      var pattern = "root of suffering";
      var skr = await new Seeker({
        lang,
      }).initialize();
      let matchHighlight = "\u001b[38;5;201m$&\u001b[0m";
      let showMatchesOnly = true;
      var res = await skr.find({ pattern, matchHighlight, showMatchesOnly });
      should(res.method).equal("phrase");
      should.deepEqual(res.suttaRefs, [
        "sn42.11/en/sujato",
        "mn105/en/sujato",
        "mn1/en/sujato",
        "sn56.21/en/sujato",
        "mn66/en/sujato", // ordered by grep count
        "mn116/en/sujato", // ordered by grep count
        "dn16/en/sujato",
        //'pli-tv-kd6/en/brahmali',
      ]);
      should.deepEqual(
        res.mlDocs.map((mld) => `${mld.suid}, ${mld.score}`),
        [
          "sn42.11, 5.091",
          "mn105, 3.016",
          "mn1, 2.006",
          "sn56.21, 1.043",
          "mn116, 1.01", // reordered by score
          "mn66, 1.005", // reordered by score
          "dn16, 1.001",
          //'pli-tv-kd6, 1.001',
        ]
      );
    });
    it("phraseSearch(...) limits English results", async () => {
      var lang = "en";
      var pattern = "root of suffering";
      var maxResults = 1;
      var skr = await new Seeker({
        maxResults,
        lang,
      }).initialize();
      var expected = {
        method: "phrase",
        lang: "en",
        pattern: `\\broot of suffering`,
        lines: SUTTA_ROOT_SUFF.slice(0, maxResults),
      };

      var data = await skr.phraseSearch({
        pattern,
        // maxResults taken from Seeker.maxResults
      });
      should.deepEqual(data, expected);

      skr.maxResults = 100; // phraseSearch will override
      should(skr.maxResults).equal(100);
      var data = await skr.phraseSearch({
        pattern,
        maxResults, // explicit specification
      });
      should(data).properties(expected);
      should.deepEqual(data.lines.slice(0, 3), expected.lines);
      should(data.lines.length).equal(maxResults);
    });
    it("phraseSearch(...) searches English", async () => {
      var lines = [
        `${en_suj}kn/thag/thag2.15_translation-en-sujato.json:1`,
        `${en_suj}dn/dn14_translation-en-sujato.json:1`,
      ];
      var lang = "de";
      var pattern = `sabbamitta`;
      var maxResults = 3;
      var skr = await new Seeker({
        lang,
        maxResults,
      }).initialize();

      var data = await skr.phraseSearch({
        pattern,
        searchLang: "en",
        lang,
      });
      should.deepEqual(data, {
        method: "phrase",
        lang: "en",
        pattern: `\\bsabbamitta`,
        lines,
      });
    });
    it("phraseSearch(...) finds Deutsch results", async () => {
      var linesWurzel = [
        `${de_sab}sn/sn42/sn42.11_translation-de-sabbamitta.json:5`,
        `${de_sab}sn/sn56/sn56.21_translation-de-sabbamitta.json:1`,
        `${de_sab}mn/mn116_translation-de-sabbamitta.json:1`,
        `${de_sab}dn/dn16_translation-de-sabbamitta.json:1`,
      ];
      var linesUber = [
        //`${de_sab}dn/dn33_translation-de-sabbamitta.json:25`,
        `${de_sab}an/an6/an6.63_translation-de-sabbamitta.json:25`,
        `${de_sab}an/an4/an4.198_translation-de-sabbamitta.json:17`,
        `${de_sab}an/an4/an4.163_translation-de-sabbamitta.json:15`,
        //`${de_sab}dn/dn34_translation-de-sabbamitta.json:18`,
      ];
      var lang = "de";
      var maxResults = 10; var maxDoc = 3; var skr = await new Seeker({
        maxResults,
        maxDoc,
      }).initialize();
      should.deepEqual(skr.languages, ["pli", "en"]);

      // diacritical word boundary
      var pattern = `übung`;
      var data = await skr.phraseSearch({
        pattern,
        lang,
      });
      should.deepEqual(skr.languages, ["pli", "en"]);
      should(data).properties({
        method: "phrase",
        lang,
        pattern: `\\b${pattern}`,
      });
      should.deepEqual(data.lines.slice(0, 3), linesUber);

      var pattern = `wurzel des leidens`;
      var data = await skr.phraseSearch({
        pattern,
        lang,
      });
      should.deepEqual(skr.languages, ["pli", "en"]);
      should.deepEqual(data, {
        method: "phrase",
        lang,
        pattern: `\\bwurzel des leidens`,
        lines: linesWurzel,
      });
    });
    it("find(...) finds dhp2", async () => {
      var skr = await new Seeker().initialize();
      //skr.logLevel = 'debug';

      let findArgs = skr.findArgs([{
        pattern: "dhp2",
        matchHighlight: false,
      }]);
      var res = await skr.slowFind(findArgs);
      should(res.method).equal("sutta_uid");
      should.deepEqual(res.suttaRefs, ["dhp1-20/en"]);
      should.deepEqual(
        res.mlDocs.map((mld) => mld.suid),
        ["dhp1-20"]
      );
      let [mld0] = res.mlDocs;
      let segs0 = mld0.segments();
      should.deepEqual(segs0[4], {
        scid: "dhp2:4",
        en: "you speak or act, ",
        matched: true,
        pli: "bhāsati vā karoti vā; ",
      });
    });
    it("find(...) finds thag1.10", async () => {
      var skr = await new Seeker().initialize();

      var res = await skr.find({
        pattern: "thag1.10",
        matchHighlight: false,
      });
      should(res.method).equal("sutta_uid");
      should.deepEqual(res.suttaRefs, ["thag1.10/en"]);
      should.deepEqual(
        res.mlDocs.map((mld) => mld.suid),
        ["thag1.10"]
      );
    });
    it("find(...) orders sutta references found", async () => {
      var skr = await new Seeker().initialize();

      var res = await skr.find({
        pattern: "sn29.9-999",
        matchHighlight: false,
      });
      should(res.method).equal("sutta_uid");
      should.deepEqual(res.suttaRefs, [
        "sn29.9/en",
        "sn29.10/en",
        "sn29.11-20/en",
        "sn29.21-50/en",
      ]);
      should.deepEqual(
        res.mlDocs.map((mld) => mld.score),
        [0, 0, 0, 0]
      );
      should.deepEqual(
        res.mlDocs.map((mld) => mld.suid),
        ["sn29.9", "sn29.10", "sn29.11-20", "sn29.21-50"]
      );
    });
    it("find(...) finds sutta references", async () => {
      var maxResults = 3;
      var skr = await new Seeker({
        maxResults,
      }).initialize();

      // lists of suttas with ranges
      var lang = "de";
      // The pattern resolves to 4 suttas, of which 3 are returned
      var pattern = "sn12.23, an1.2-25";
      var res = await skr.find({
        pattern,
        lang,
        matchHighlight: false,
        showMatchesOnly: false,
      });
      should(res.method).equal("sutta_uid");
      should(res.maxResults).equal(maxResults);
      should.deepEqual(res.suttaRefs, [
        "sn12.23/de",
        "an1.1-10/de",
        "an1.11-20/de",
      ]);
      // mlDocs are not sorted when searching by suid
      // since the user is specifying the desired order
      should.deepEqual(
        res.mlDocs.map((mld) => mld.suid),
        ["sn12.23", "an1.1-10", "an1.11-20"]
      );
      should(res.resultPattern).equal(pattern);
      should(res.lang).equal("de");
      should(res.mlDocs.length).equal(3);
    });
    it("find(...) finds mn1/en/sujato", async () => {
      var maxResults = 3;
      var skr = await new Seeker({
        maxResults,
      }).initialize();

      // lists of suttas with ranges
      var lang = "de";
      // The pattern resolves to 4 suttas, of which 3 are returned
      var pattern = "mn1/en/sujato";
      var res = await skr.find({
        pattern,
        lang,
        matchHighlight: false,
      });
      var [mld0] = res.mlDocs;
      should(res.method).equal("sutta_uid");
      should(res.maxResults).equal(maxResults);
      should.deepEqual(res.suttaRefs, ["mn1/en/sujato"]);
      should(res.resultPattern).equal(pattern);
      should(res.lang).equal("en"); // pattern overrides default lang='de'
      should(res.mlDocs.length).equal(1);
      var segments = mld0.segments();
      should(segments.length).equal(334);
      should.deepEqual(segments[22], {
        scid: "mn1:5.2",
        matched: true,
        pli:
          "tejaṁ tejato saññatvā tejaṁ maññati, " +
          "tejasmiṁ maññati, tejato maññati, " +
          "tejaṁ meti maññati, tejaṁ abhinandati. ",
        en: "Having perceived fire as fire, they conceive it to be fire … ",
      });
    });
    it("find(maxdoc)", async () => {
      var maxResults = 5;
      var maxDoc = 2;
      var skr = await new Seeker({
        maxResults,
      }).initialize();

      // lists of suttas with ranges
      var lang = "en";
      // The pattern resolves to 3 suttas, of which 2 are returned
      var pattern = "thig1.1-3/en/soma"; // three suttas
      var res = await skr.find({
        pattern,
        lang,
        matchHighlight: false,
        maxDoc,
      });
      var [mld0] = res.mlDocs;
      should(res.method).equal("sutta_uid");
      should(res.maxResults).equal(maxResults);
      should.deepEqual(res.suttaRefs, [
        "thig1.1/en/soma", "thig1.2/en/soma", "thig1.3/en/soma"]);
      should(res.mlDocs.length).equal(2); // maxdDoc limit
      should.deepEqual(res.mlDocs.map(md=>md.suid), ["thig1.1", "thig1.2"]);
      should.deepEqual(res.mlDocs.map(md=>md.author_uid), ["soma", "soma"]);
    });
    it("find(...) finds an1.2", async () => {
      var maxResults = 3;
      var skr = await new Seeker({
        maxResults,
      }).initialize();

      // lists of suttas with ranges
      var lang = "de";
      // The pattern resolves to 4 suttas, of which 3 are returned
      var pattern = "an1.2";
      var res = await skr.find({
        pattern,
        lang,
        matchHighlight: false,
      });
      var [mld0] = res.mlDocs;
      should(res.method).equal("sutta_uid");
      should(res.maxResults).equal(maxResults);
      should.deepEqual(res.suttaRefs, ["an1.1-10/de"]);
      should(res.resultPattern).equal(pattern);
      should(res.lang).equal("de");
      should(res.mlDocs.length).equal(1);
      var segments = mld0.segments();
      should.deepEqual(segments[0], {
        scid: "an1.2:1.0",
        de: "2 ",
        en: "2 ",
        pli: "2 ",
        matched: true,
      });
      should(segments.length).equal(4);
      should(segments[3]).properties({
        // AN1.1
        scid: "an1.2:1.3",
        pli: "Dutiyaṁ. ",
        matched: true,
      });
    });
    it("find(...) => legacy suttas", async () => {
      var maxDoc = 3;
      var skr = await new Seeker({
        maxDoc,
      }).initialize();

      // lists of suttas with ranges
      var lang = "de";
      // The pattern resolves to 4 suttas, of which 3 are returned
      var pattern = "mn1/en/bodhi";
      var res = await skr.find({
        pattern,
        lang,
      });
      should(res.method).equal("sutta_uid");
      should(res.maxDoc).equal(maxDoc);
      should.deepEqual(res.suttaRefs, [`mn1/en/bodhi`]);
      should(res.resultPattern).equal(pattern);
      should(res.lang).equal("en");
      should(res.mlDocs.length).equal(1);
      let mld0 = res.mlDocs[0];
      should(mld0.author_uid).equal("bodhi");
    });
    it("find({minLang}) => minLang 2", async () => {
      var maxResults = 3;
      var skr = await new Seeker({
        maxResults,
      }).initialize();
      should.deepEqual(skr.languages, ["pli", "en"]);

      var pattern = "dn33";
      var res = await skr.find({
        pattern,
        lang: "de",
        minLang: 2,
      });
      should.deepEqual(res.suttaRefs, ["dn33/de"]);
      should(res.mlDocs.length).equal(1);
      should(res.minLang).equal(2);

      var res = await skr.find({
        pattern,
        lang: "de",
        minLang: 2,
      });
      should.deepEqual(res.suttaRefs, ["dn33/de"]);
      should(res.mlDocs.length).equal(1);
      let mld0 = res.mlDocs[0];
      should(mld0.author_uid).equal("sabbamitta");
    });
    it("find({minLang:3}) root of suffering", async () => {
      var maxResults = 1000;
      let minLang = 3;
      let lang = 'de';
      let pattern = "root of suffering";
      var skr = await new Seeker({ maxResults, }).initialize();
      should.deepEqual(skr.languages, ["pli", "en"]);

      var res = await skr.find({ pattern, lang, minLang });
      should.deepEqual(res.suttaRefs, [
        "sn42.11/en/sujato",
        "sn56.21/en/sujato",
        "mn116/en/sujato",
        "dn16/en/sujato",
      ]);
      should(res.mlDocs.length).equal(4);
      should(res.minLang).equal(3);
    });
    it("find({minLang:2}) root of suffering", async () => {
      let maxResults = 10;
      let lang = 'de';
      let minLang = 2;
      let pattern = "root of suffering";
      var skr = await new Seeker({ maxResults, }).initialize();
      var res = await skr.find({ pattern, lang, minLang });
      should.deepEqual(res.suttaRefs, [
        "sn42.11/en/sujato",
        "mn105/en/sujato",
        "mn1/en/sujato",
        "sn56.21/en/sujato",
        "mn66/en/sujato",
        "mn116/en/sujato",
        "dn16/en/sujato",
      ]);
      should(res.mlDocs.length).equal(7);
      let mld0 = res.mlDocs[0];
      should(mld0.author_uid).equal("sabbamitta");
    });
    it("find(...) => finds jhana", async () => {
      var msStart = Date.now();
      var maxDoc = 5;
      var maxResults = 50;
      var skr = await new Seeker({
        maxDoc,
        maxResults,
      }).initialize();

      var pattern = "jhana";
      var res = await skr.find({
        pattern,
        lang: "de",
        minLang: 2,
        showMatchesOnly: false, // return entire sutta
      });
      should(res.maxDoc).equal(maxDoc);
      should(res.mlDocs.length).equal(maxDoc);
      should.deepEqual(res.suttaRefs.slice(0, maxDoc), [
        "mn108/pli/ms",
        "an9.36/pli/ms",
        "an6.60/pli/ms",
        "dn33/pli/ms",
        "mn66/pli/ms",
      ]);
    });
    it("find(...) => finds phrase", async () => {
      var maxResults = 3;
      var skr = await new Seeker({
        maxResults,
      }).initialize();
      //skr.logLevel = 'debug';

      var msStart = Date.now();
      var pattern = "root of suffering";
      let findArgs = skr.findArgs([ {
        pattern,
        lang: "de",
        minLang: 2,
        showMatchesOnly: false, // return entire sutta
      }]);
      var res = await skr.slowFind(findArgs);
      should(res.segsMatched).equal(10);
      should.deepEqual(res.suttaRefs, [
        "sn42.11/en/sujato",
        "mn105/en/sujato",
        "mn1/en/sujato",
      ]);
      should.deepEqual( res.mlDocs.map((mld) => mld.score), [
        5.091, 3.016, 
        2.006
        ]
      );
      should.deepEqual( res.mlDocs.map((mld) => mld.suid), [
        "sn42.11", "mn105", 
        "mn1"
        ]
      );
      var [mld0, mld1, mld2] = res.mlDocs;
      should(res.mlDocs.length).equal(3);
      should(res.minLang).equal(2);
      should.deepEqual(mld0.segments()[0], {
        scid: "sn42.11:0.1",
        de: "Verbundene Lehrreden 42.11 ",
        en: "Linked Discourses 42.11 ",
        pli: "Saṁyutta Nikāya 42.11 ",
      });
      should.deepEqual(mld1.segments()[0], {
        scid: "mn105:0.1",
        en: "Middle Discourses 105 ",
        pli: "Majjhima Nikāya 105 ",
      });
      //TODO should.deepEqual(mld2.segments()[0], {
        //TODO scid: "mn1:0.1",
        //TODO en: "Middle Discourses 1 ",
        //TODO pli: "Majjhima Nikāya 1 ",
      //TODO });
    });
    it("find(...) => finds ubung", async () => {
      var maxDoc = 3;
      var skr = await new Seeker({
        maxDoc,
      }).initialize();
      //skr.logLevel = 'info';

      var pattern = `übung`;
      var res = await skr.find({
        pattern,
        lang: "de",
        minLang: 2,
        maxDoc,
        showMatchesOnly: false, // return entire sutta
      });
      // suttaRefs will be many since grep/ripgrep
      // search files
      should.deepEqual(res.suttaRefs.slice(0, 3), [
        //"dn33/de/sabbamitta",
        "an6.63/de/sabbamitta",
        "an4.198/de/sabbamitta",
        "an4.163/de/sabbamitta",
        //'dn34/de/sabbamitta',
      ]);
      // We only care about three documents so that
      // is what we should get
      should.deepEqual(
        res.mlDocs.map((mld) => mld.score),
        [25.176, 17.153, 15.349],
      );
    });
    it("find(...) => finds searchLang phrase", async () => {
      var maxResults = 3;
      var skr = await new Seeker({
        maxResults,
      }).initialize();

      var pattern = "sabbamitta";
      var res = await skr.find({
        pattern,
        searchLang: "en",
        lang: "de",
        minLang: 2,
        showMatchesOnly: false, // return entire sutta
      });
      should.deepEqual(res.suttaRefs, ["thag2.15/en/sujato", "dn14/en/sujato"]);
      should(res.mlDocs[0].lang).equal("de");
    });
    it("find(...) => accepts embedded options", async () => {
      var skr = await new Seeker({}).initialize();

      var pattern = "sabbamitta -ml 3 -sl en -l de -ml 2";
      var res = await skr.find({
        pattern,
      });
      should.deepEqual(res.suttaRefs, ["thag2.15/en/sujato", "dn14/en/sujato"]);
    });
    it("find(...) => finds all keywords", async () => {
      var maxDoc = 50;
      var skr = await new Seeker({
        maxDoc,
      }).initialize();

      var pattern = "darkness light";
      var res = await skr.find({
        pattern,
        lang: "de",
        minLang: 2,
        showMatchesOnly: false,
      });
      should(res.suttaRefs.length).equal(16);
    });
    it("find(...) => finds keywords", async () => {
      var maxDoc = 3;
      var skr = await new Seeker({
        maxDoc,
      }).initialize();

      var pattern = "wurzel leidens";
      var res = await skr.find({
        pattern,
        lang: "de",
        minLang: 2,
      });
      should.deepEqual(res.suttaRefs, [
        "sn42.11/de/sabbamitta",
        "dn34/de/sabbamitta",
        "mn116/de/sabbamitta",
        "dn16/de/sabbamitta",
        "sn56.21/de/sabbamitta",
      ]);
      var [mld0] = res.mlDocs;
      should(res.mlDocs.length).equal(3);
      should(res.minLang).equal(2);
      should(mld0.segments()[0]).properties({
        scid: "sn42.11:2.11",
        en: "For desire is the root of suffering. ",
      });
    });
    it("find(...) => finds segments with all keywords", async () => {
      var maxDoc = 3;
      var skr = await new Seeker().initialize();

      var pattern = "red yellow";
      var res = await skr.find({
        pattern,
        lang: "de",
        minLang: 2,
        maxDoc,
      });
      should(res.resultPattern).equal("\\bred|\\byellow");
      should(res.method).equal("keywords");
      should.deepEqual(res.suttaRefs.slice(0, 3), [
        "mn77/en/sujato",
        "dn16/en/sujato",
        "dn23/en/sujato",
      ]);
      should(res.suttaRefs.length).equal(16);
      var [mld0, mld1, mld2] = res.mlDocs;
      should(res.mlDocs.length).equal(3);
      should(res.minLang).equal(2);
      should(res.suttaRefs.length).equal(16);
      should(res.segsMatched).equal(26);
      should(mld0.score).above(mld1.score);
    });
    it("RegExp knows about word boundaries", () => {
      var u = new Unicode();
      var text = [
        `“Yaṃ panāniccaṃ dukkhaṃ vā taṃ sukhaṃ vā”ti?`,
        `sotaṃ niccaṃ vā aniccaṃ vā”ti?`,
      ];
      var utext = text.map((t) => u.romanize(t));
      var pattern = "\\b(a|ā)(n|ṅ|ñ|ṇ)(i|ī)cc(a|ā)";
      var re = new RegExp(`${pattern}`, "gui");
      should(utext[0].replace(re, "ANICCA")).equal(utext[0]);
      should(utext[1].replace(re, "ANICCA")).equal(
        `sotam niccam va ANICCAm va”ti?`
      );
    });
    it("find(...) => de, Benares", async() => {
      var lang = "de";
      var skr = await new Seeker().initialize();
      var res = await skr.find({
        pattern: "Buddha was staying near Varanasi",
        maxResults: 3,
        lang,
        minLang: 2,
      });
      let { bilaraPaths, method, searchLang } = res;
      should(method).equal("phrase");
      should(searchLang).equal(searchLang);
      should.deepEqual(bilaraPaths, [
        `${pli_ms}sn/sn56/sn56.11_root-pli-ms.json`,
        `${de_sab}sn/sn56/sn56.11_translation-de-sabbamitta.json`,
        `${en_suj}sn/sn56/sn56.11_translation-en-sujato.json`,
        `${pli_ms}sn/sn55/sn55.53_root-pli-ms.json`,
        `${de_sab}sn/sn55/sn55.53_translation-de-sabbamitta.json`,
        `${en_suj}sn/sn55/sn55.53_translation-en-sujato.json`,
        `${pli_ms}sn/sn4/sn4.5_root-pli-ms.json`,
        `${de_sab}sn/sn4/sn4.5_translation-de-sabbamitta.json`,
        `${en_suj}sn/sn4/sn4.5_translation-en-sujato.json`,
      ]);
    });
    it("find(...) => no first point", async () => {
      var lang = "de";
      var skr = await new Seeker().initialize();
      var res = await skr.find({
        pattern: "no first point",
        maxResults: 3,
        lang,
        minLang: 2,
      });
      let { bilaraPaths, method, searchLang } = res;
      should(method).equal("phrase");
      should(searchLang).equal(searchLang);
      should.deepEqual(bilaraPaths, [
        `${pli_ms}sn/sn15/sn15.2_root-pli-ms.json`,
        `${de_sab}sn/sn15/sn15.2_translation-de-sabbamitta.json`,
        `${en_suj}sn/sn15/sn15.2_translation-en-sujato.json`,
        `${pli_ms}sn/sn15/sn15.1_root-pli-ms.json`,
        `${de_sab}sn/sn15/sn15.1_translation-de-sabbamitta.json`,
        `${en_suj}sn/sn15/sn15.1_translation-en-sujato.json`,
        `${pli_ms}sn/sn15/sn15.19_root-pli-ms.json`,
        `${de_sab}sn/sn15/sn15.19_translation-de-sabbamitta.json`,
        `${en_suj}sn/sn15/sn15.19_translation-en-sujato.json`,
      ]);
    });
    it("findArgs(...) => thig1.1..., thig1.2...", async () => {
      var bilaraData = await bd.initialize();
      var skr = await new Seeker({
        bilaraData,
      }).initialize();
      let pattern = "thig1.1/en/soma, thig1.2/en/soma";

      let res = skr.findArgs([`${pattern}`]);
      should(res).properties({
        includeUnpublished: false,
        docLang: 'en',
        docAuthor: 'soma',
        lang: "en",
        languages: ["pli", "en"],
        matchHighlight: "\u001b[38;5;121m$&\u001b[0m",
        maxDoc: 50,
        maxResults: 1000,
        minLang: 2,
        pattern,
        refLang: 'en',
        refAuthor: 'sujato',
        searchLang: "en",
        showMatchesOnly: true,
        sortLines: undefined,
        tipitakaCategories: undefined,
        trilingual: false,
        types: ["root", "translation"],
      });
    });
    it("findArgs(...) handls jpn ", async () => {
      var bilaraData = await bd.initialize();
      var skr = await new Seeker({
        bilaraData,
      }).initialize();
      let pattern = "食べ物を贈る";

      let args = skr.findArgs([`-l jpn ${pattern}`]);
      should.deepEqual(args, {
        author: 'kaz',
        docAuthor: 'kaz',
        docLang: 'jpn',
        includeUnpublished: false,
        lang: "jpn",
        langAuthor: 'kaz',
        languages: ["pli", "en", "jpn"],
        matchHighlight: "\u001b[38;5;121m$&\u001b[0m",
        maxDoc: 50,
        maxResults: 1000,
        minLang: 2,
        pattern,
        refAuthor: "sujato",
        refLang: "en",
        searchLang: "jpn",
        showMatchesOnly: true,
        sortLines: undefined,
        tipitakaCategories: undefined,
        trilingual: false,
        types: ["root", "translation"],
      });
    });
    it("findArgs(...) handles German", async () => {
      var bilaraData = await bd.initialize();
      var skr = await new Seeker({
        bilaraData,
      }).initialize();

      should.deepEqual(skr.findArgs(["wurzel des leidens -ml3 -l de"]), {
        author: "sabbamitta",
        docAuthor: 'sabbamitta',
        docLang: 'de',
        includeUnpublished: false,
        lang: "de",
        langAuthor: 'sabbamitta',
        languages: ["pli", "en", "de"],
        matchHighlight: "\u001b[38;5;121m$&\u001b[0m",
        maxDoc: 50,
        maxResults: 1000,
        minLang: 3,
        pattern: "wurzel des leidens",
        refAuthor: "sujato",
        refLang: "en",
        searchLang: "de",
        showMatchesOnly: true,
        sortLines: undefined,
        tipitakaCategories: undefined,
        trilingual: false,
        types: ["root", "translation"],
      });

      let args = skr.findArgs(["wurzel des leidens -ml 3 -l de"]);
      should.deepEqual(args, {
        author: "sabbamitta",
        docAuthor: 'sabbamitta',
        docLang: 'de',
        includeUnpublished: false,
        lang: "de",
        langAuthor: 'sabbamitta',
        languages: ["pli", "en", "de"],
        matchHighlight: "\u001b[38;5;121m$&\u001b[0m",
        maxDoc: 50,
        maxResults: 1000,
        minLang: 3,
        pattern: "wurzel des leidens",
        searchLang: "de",
        refAuthor: "sujato",
        refLang: "en",
        showMatchesOnly: true,
        sortLines: undefined,
        tipitakaCategories: undefined,
        trilingual: false,
        types: ["root", "translation"],
      });
    });
    it("findArgs(...) -l de root of suffering", async()=>{
      let bilaraData = new BilaraData();
      let skr = await new Seeker({
        bilaraData,
        logger: bilaraData,
        trilingual: true,
      }).initialize();
      let findArgs = skr.findArgs([{
        pattern: "-l de root of suffering -ra soma",
        lang: "de",
      }]);
      should(findArgs).properties({
        docLang: 'de',
        docAuthor: 'sabbamitta',
        refLang: 'en',
        refAuthor: 'soma',
      });
    });
    it("TESTTESTfindArgs(...) -l de -ra soma schlafe sanft", async () => {
      let bilaraData = await bd.initialize();
      let pattern = "-l de -ra soma schlafe sanft";
      let skr = await new Seeker({
        bilaraData,
      }).initialize();

      should(skr.findArgs([{ pattern, lang:"pt"}]))
        .properties({ 
          searchLang:'de',
          docAuthor: 'sabbamitta',
          docLang: 'de',
          refAuthor: 'soma',
          refLang: 'en',
          lang: 'de',
          langAuthor: 'sabbamitta',
          trilingual: true,
        });
    });
    it("findArgs(...) author", async () => {
      let bilaraData = await bd.initialize();
      let pattern = "root of suffering";
      let skr = await new Seeker({
        bilaraData,
      }).initialize();

      should(skr.findArgs([{ pattern, lang:"pt"}]))
        .properties({ 
          author: "sujato", 
          searchLang:'en',
          docAuthor: 'laera-quaresma',
          docLang: 'pt',
          refAuthor: 'sujato',
          refLang: 'en',
          lang: 'pt',
          langAuthor: 'laera-quaresma',
        });
      should(skr.findArgs([{ pattern:"assim ouvi", lang:"pt"}]))
        .properties({ author: "laera-quaresma", searchLang:'pt'});
      should(skr.findArgs([{ pattern, }]))
        .properties({ author: "sujato", });
      should(skr.findArgs([{ pattern, author:"brahmali"}]))
        .properties({ author: "brahmali", });
      should(skr.findArgs([{ pattern, lang:"de"}]))
        .properties({ author: "sujato", });
      should(skr.findArgs([{ pattern:"wurzel des leidens", lang:"de"}]))
        .properties({ author: "sabbamitta", });
    });
    it("find(...) finds pli-tv-bi-vb-sk1-75", async () => {
      if (!TEST_UNPUBLISHED) { return; }
      var maxDoc = 3;
      var bilaraData = new BilaraData({
        includeUnpublished: true,
      });
      var skr = await new Seeker({
        maxDoc,
        bilaraData,
      }).initialize();

      // lists of suttas with ranges
      var lang = "en";
      // The pattern resolves to 4 suttas, of which 3 are returned
      var pattern = "pli-tv-bi-vb-sk1-75";
      var res = await skr.find({
        pattern,
        lang,
      });
      should(res.method).equal("sutta_uid");
      should(res.maxDoc).equal(maxDoc);
      should.deepEqual(res.suttaRefs, [
        "pli-tv-bi-vb-sk1/en",
        "pli-tv-bi-vb-sk75/en",
      ]);
      should(res.resultPattern).equal(pattern);
      should(res.lang).equal("en");
      should(res.mlDocs.length).equal(2);
    });
    it("find(...) finds pli-tv-bi-vb-pj7", async () => {
      if (!TEST_UNPUBLISHED) { return; }
      var maxDoc = 3;
      var bilaraData = new BilaraData({
        includeUnpublished: true,
      });
      var skr = await new Seeker({
        maxDoc,
        bilaraData,
      }).initialize();

      // lists of suttas with ranges
      var lang = "en";
      // The pattern resolves to 4 suttas, of which 3 are returned
      var pattern = "ejected by a unanimous";
      var res = await skr.find({
        pattern,
        lang,
        tipitakaCategories: "vinaya",
      });
      should(res.method).equal("phrase");
      should(res.maxDoc).equal(maxDoc);
      should.deepEqual(res.suttaRefs, [
        "pli-tv-bi-vb-pj7/en/brahmali",
        "pli-tv-pvr2.9/en/brahmali",
        "pli-tv-pvr2.1/en/brahmali",
        "pli-tv-bi-vb-ss4/en/brahmali",
        "pli-tv-pvr2.2/en/brahmali",
        "pli-tv-pvr2.10/en/brahmali",
      ]);
      should(res.resultPattern).equal(`\\b${pattern}`);
      should(res.lang).equal("en");
      should(res.mlDocs.length).equal(3);
    });
    it("tipitakaRegExp(tc) => regexp for paths", () => {
      var skr = new Seeker();

      // invalid
      {
        let eCaught;
        try {
          skr.tipitakaRegExp("an101");
        } catch(e) {
          eCaught = e;
        }
        should(eCaught.message).match(/invalid category:an101/i);
      }

      // valid
      should(skr.tipitakaRegExp("an").toString()).equal("/(\\/an\\/)/iu");
      should(skr.tipitakaRegExp("an1").toString()).equal("/(\\/an1\\/)/iu");
      should(skr.tipitakaRegExp("an11").toString()).equal("/(\\/an11\\/)/iu");
      should(skr.tipitakaRegExp("sn5").toString()).equal("/(\\/sn5\\/)/iu");
      should(skr.tipitakaRegExp("sn56").toString()).equal("/(\\/sn56\\/)/iu");
      should(skr.tipitakaRegExp("su").toString()).equal("/(\\/sutta\\/)/iu");
      should(skr.tipitakaRegExp().toString()).equal("/(\\/sutta\\/)/iu");
      should(skr.tipitakaRegExp("bi,pj").toString()).equal("/(-bi-|-pj)/iu");
    });
    it("find(...) finds an1.1 all types", async () => {
      var skr = await new Seeker().initialize();
      var res = await skr.find({
        pattern: "an1.1",
        matchHighlight: false,
        lang: "de",
        types: BilaraPathMap.ALL_TYPES,
      });
      should(res.mlDocs.length).equal(1);
      var segs = res.mlDocs[0].segments();
      should.deepEqual(segs[0], {
        scid: "an1.1:0.1",
        //html: "<section class='range' id='an1.1-10'><header>"+
        //"<ul><li class='division'>{}</li>",
        pli: "Aṅguttara Nikāya 1 ",
        en: "Numbered Discourses 1.1–10 ",
        de: "Nummerierte Lehrreden 1.1–10 ",
        matched: true,
      });
    });
    it("RegExp maches ubung", () => {
      var re = /(?<=[\s,.:;"']|^)übung/iu;
      var text = "Wahrheit von der Übung, die zum Aufhören";
      should(re.test(text)).equal(true);
    });
    it("find(...) ignores translation stubs", async () => {
      var skr = await new Seeker().initialize();

      var pattern = "root of suffering -ml 3 -l de";
      var res = await skr.find({
        pattern,
      });
      should.deepEqual(res.suttaRefs, [
        "sn42.11/en/sujato",
        "sn56.21/en/sujato",
        "mn116/en/sujato",
        "dn16/en/sujato",
      ]);
      should(res.bilaraPaths.length).equal(12);
    });
    it("find(...) ignores chinese", async () => {
      var skr = await new Seeker().initialize();

      var pattern = "wrong livelihood";
      var res = await skr.find({
        pattern,
      });
      should(res.bilaraPaths.length).equal(158);
    });
    it("find(...) => ignores SN46.36", async () => {
      var skr = await new Seeker({
        root: TEST_BILARA_PATH,
      }).initialize();

      var pattern = "hindrance -ml 3 -sl en -l de";
      var res = await skr.find({
        pattern,
      });
      should.deepEqual(res.suttaRefs, []);
    });
    it("find(...) finds 'alles leiden,...'", async () => {
      var bilaraData = await bd.initialize();
      var skr = await new Seeker({
        bilaraData,
      }).initialize();
      var pattern = "alles leiden, das entsteht -ml3 -l de";

      var data = await skr.find({ pattern });
      should(data.resultPattern).equal("\\balles leiden, das entsteht");
      should(data.method).equal("phrase");
      should(data.mlDocs.length).equal(1);
      var mld0 = data.mlDocs[0];
      should(mld0.bilaraPaths[0]).equal(
        "root/pli/ms/sutta/sn/sn42/sn42.11_root-pli-ms.json"
      );
      should(mld0.score).equal(3.055);
    });
    it("find(...) => thig1.1:1.1/en/soma", async () => {
      bd.log("initializing");
      var bilaraData = await bd.initialize();
      bd.log("initializing done");
      var lang = "en";
      var skr = await new Seeker({
        bilaraData,
        lang,
      }).initialize();
      //skr.logLevel = 'debug';
      var pattern = "thig1.1:1.1/en/soma, thig1.1:1.1/en/sujato";

      var res = await skr.slowFind({ pattern, lang});
      should(res.resultPattern).equal(pattern);
      should(res.method).equal("sutta_uid");
      should(res.mlDocs.length).equal(2);
      should(res.segsMatched).equal(2);
      var [ mld0, mld1 ] = res.mlDocs;

      // Soma
      should(mld0.bilaraPaths[1]).match(/thig1.1.*soma/);
      should(mld0.score).equal(0);
      let segs0 = mld0.segments();
      should(segs0[0].en).match(/Sleep with ease, Elder,/);

      // Sujato
      should(mld1.score).equal(0);
      should(mld1.bilaraPaths[1]).match(/thig1.1.*sujato/);
      let segs1 = mld1.segments();
      should(segs1[0].en).match(/Sleep softly, little nun,/);
    });
    it("find(...) => thig1.1/en/soma,thig12/en/soma'", async () => {
      //bd.logLevel = 'info';
      bd.log("initializing");
      var bilaraData = await bd.initialize();
      bd.log("initializing done");
      var lang = "en";
      var skr = await new Seeker({
        bilaraData,
        lang,
      }).initialize();
      //skr.logLevel = 'debug';
      var pattern = "thig1.1/en/soma, thig1.2/en/soma";

      var data = await skr.slowFind({ pattern, lang});
      should(data.resultPattern).equal(pattern);
      should(data.method).equal("sutta_uid");
      should(data.mlDocs.length).equal(2);
      //data.mlDocs.forEach(mld=>console.log(mld.bilaraPaths));
      var [ mld0, mld1 ] = data.mlDocs;
      should(mld0.bilaraPaths[1]).match(/thig1.1.*soma/);
      should(mld1.bilaraPaths[1]).match(/thig1.2.*soma/);
      should(mld0.score).equal(0);
      should(mld1.score).equal(0);
    });
    it("find(...) finds Deutsch 'abnehmend'", async () => {
      //bd.logLevel = 'info';
      bd.log("initializing");
      var bilaraData = await bd.initialize();
      bd.log("initializing done");
      var lang = "de";
      var skr = await new Seeker({
        bilaraData,
        lang,
      }).initialize();
      //skr.logLevel = 'info';
      var pattern = "abnehmend";
      let matchHighlight = '<span class="ebt-matched">$&</span>';
      should(skr.patternLanguage(pattern)).equal(lang);

      var data = await skr.slowFind({ pattern, lang, matchHighlight });
      should(data.resultPattern).equal("\\babnehmend");
      should(data.searchLang).equal("de");
      should(data.method).equal("phrase");
      should(data.mlDocs.length).equal(7);
      //data.mlDocs.forEach(mld=>console.log(mld.bilaraPaths));
      var mld0 = data.mlDocs[0];
      should(mld0.bilaraPaths[1]).match(/de.*sn12.27/);
      should(mld0.score).equal(1.026);
    });
    it("TESTTESTfind(...) finds Deutsch 'blind'", async () => {
      //bd.logLevel = 'info'
      bd.log("initializing");
      var bilaraData = await bd.initialize();
      bd.log("initializing done");
      var skr = await new Seeker({
        bilaraData,
      }).initialize();
      var pattern = "blind -ml3 -l de";

      var data = await skr.find({ pattern });
      should(data.resultPattern).equal("\\bblind");
      should(data.searchLang).equal("de");
      should(data.method).equal("phrase");
      should(data.mlDocs.length).equal(28);
      var mld0 = data.mlDocs[0];
      should(mld0.bilaraPaths[0]).match(/ud6.4/);
    });
    it("find(...) finds Deutsch 'rat'", async () => {
      let enWords = await English.wordSet({ source: "file" });
      var bilaraData = await bd.initialize();
      var skr = await new Seeker({
        bilaraData,
        enWords,
      }).initialize();
      var pattern = "rat -ml3 -l de";

      var data = await skr.find({ pattern });
      should(data.resultPattern).equal("\\brat");
      should(data.searchLang).equal("de");
      should(data.method).equal("phrase");
      should(data.mlDocs.length).equal(50);
      var mld0 = data.mlDocs[0];
      should(mld0.bilaraPaths[0]).match(/sn35/);
    });
    it("find(...) finds 'thig3.8' de unpublished", async () => {
      if (!TEST_UNPUBLISHED) { return; }
      var bilaraData = await bd.initialize();
      var includeUnpublished = true;
      var skr = await new Seeker({ bilaraData }).initialize();
      var pattern = "thig3.8 -l de";

      var data = await skr.find({
        pattern,
        includeUnpublished,
      });
      should(data.searchLang).equal("de");
      should(data.method).equal("sutta_uid");
      should(data.mlDocs.length).equal(1);
      var mld0 = data.mlDocs[0];
      should(mld0.bilaraPaths[0]).match(/thig3.8/);
      should(mld0.score).equal(0);
      should(mld0.segments().length).equal(18);
      should(data.resultPattern).equal("thig3.8");
      should(mld0.author_uid).equal("sabbamitta");
    });
    it("find(...) finds 'king pacetana'", async () => {
      var bilaraData = await bd.initialize();
      var skr = await new Seeker({
        bilaraData,
      }).initialize();
      var pattern = "king pacetana";

      var data = await skr.find({ pattern });
      should(data.searchLang).equal("en");
      should(data.method).equal("phrase");
      should(data.mlDocs.length).equal(1);
      var mld0 = data.mlDocs[0];
      should(mld0.bilaraPaths[0]).match(/an3.15/);
      should(mld0.score).equal(3.065);
      should(data.resultPattern).equal("\\bking pacetana");
    });
    it("find(...) is cached", async () => {
      var skr = await new Seeker({
        lang: "en", // English default
      }).initialize();
      var pattern = "stuck in the middle";
      var findOpts = {
        pattern,
      };
      await skr.clearMemo("find");

      var ms0 = Date.now();
      var data = await skr.find(findOpts);
      var ms1 = Date.now();

      var data2 = await skr.find(findOpts);
      var ms2 = Date.now();
      should(data.method).equal("phrase");
      var mld0 = data.mlDocs[0];
      should(mld0.bilaraPaths[0]).equal(
        "root/pli/ms/sutta/kn/snp/vagga5/snp5.3_root-pli-ms.json"
      );
      //.equal('root/pli/ms/sutta/an/an6/an6.61_root-pli-ms.json');
      should(mld0.score).equal(2.105);
      delete data2.elapsed;
      delete data.elapsed;
      should.deepEqual(data2, data);
    });
    it("isExample", async () => {
      var skr = await new Seeker({
        lang: "en", // English default
      });
      await skr.initialize();
      let msStart = Date.now();
      should(skr.isExample("but ma'am")).equal(true);
      should(skr.isExample("but ma.am")).equal(true); // sanitized
      should(skr.isExample("root of suffering")).equal(true);
      should(skr.isExample("ROOT OF SUFFERING")).equal(true);
      should(skr.isExample("Wurzel des Leidens")).equal(true);
      should(skr.isExample("wurzel des leidens")).equal(true);

      //similar but not an example
      should(skr.isExample("\\bROOT OF SUFFERING")).equal(false);
      should(skr.isExample("\\bROOT OF SUFFERING\\b")).equal(false);

      // Ordered keywords
      should(skr.isExample("root sufering")).equal(false);
      //console.log(`isExample elapsed`, (Date.now() - msStart)/1000);
      should(Date.now() - msStart).below(200);
    });
    it("isExample (cached)", async () => {
      let exampleCache = require(`../src/is-example.json`);
      var skr = await new Seeker({
        lang: "en", // English default
        exampleCache,
      });
      await skr.initialize();
      let msStart = Date.now();
      should(skr.isExample("but ma'am")).equal(true);
      should(skr.isExample("but ma.am")).equal(true); // sanitized
      should(skr.isExample("root of suffering")).equal(true);
      should(skr.isExample("ROOT OF SUFFERING")).equal(true);
      should(skr.isExample("Wurzel des Leidens")).equal(true);
      should(skr.isExample("wurzel des leidens")).equal(true);

      //similar but not an example
      should(skr.isExample("\\bROOT OF SUFFERING")).equal(false);
      should(skr.isExample("\\bROOT OF SUFFERING\\b")).equal(false);

      // Ordered keywords
      should(skr.isExample("root sufering")).equal(false);
      //console.log(`isExample elapsed`, (Date.now() - msStart)/1000);
      should(Date.now() - msStart).below(200);
    });
    it('find(...) => "dn7/de"', async () => {
      let bilaraData = new BilaraData();
      let skr = await new Seeker({
        bilaraData,
        logger: bilaraData,
      }).initialize();
      let res = await skr.find({
        pattern: "dn7/de",
      });
      should(res.bilaraPaths.length).equal(2);
      let mld0 = res.mlDocs[0];
      should(mld0.author_uid).equal("sabbamitta");
      should.deepEqual(mld0.langSegs, { pli: 51, de: 45 });
      should(res.lang).equal("de");
      should(mld0.sutta_uid).equal("dn7");
    });
    it("find(...) => soṇasiṅgālā", async () => {
      let bilaraData = new BilaraData();
      let skr = await new Seeker({
        bilaraData,
        logger: bilaraData,
      }).initialize();
      let res = await skr.find({
        pattern: "soṇasiṅgālā",
      });
      should(res.lang).equal("en");
      should.deepEqual(res.bilaraPaths, [
        "root/pli/ms/sutta/kn/iti/vagga5/iti42_root-pli-ms.json",
        `${en_suj}kn/iti/vagga5/iti42_translation-en-sujato.json`,
        "root/pli/ms/sutta/dn/dn26_root-pli-ms.json",
        "translation/en/sujato/sutta/dn/dn26_translation-en-sujato.json",
        "root/pli/ms/sutta/an/an2/an2.1-10_root-pli-ms.json",
        "translation/en/sujato/sutta/an/an2/an2.1-10_translation-en-sujato.json",
      ]);
      let [mld0, mld1] = res.mlDocs;
      should(mld0.author_uid).equal("sujato");
      should(mld0.suid).equal("iti42");
      should(mld1.author_uid).equal("sujato");
      should(mld1.suid).equal("an2.1-10");
    });
    it("find(...) => nun", async () => {
      let bilaraData = new BilaraData();
      let maxDoc = 5;
      let skr = await new Seeker({
        bilaraData,
        logger: bilaraData,
        maxDoc,
      }).initialize();
      let res = await skr.find({
        pattern: "nun",
      });
      should(res.lang).equal("en");
      should(res.mlDocs.length).equal(maxDoc);
      should.deepEqual(res.bilaraPaths.slice(0, 6), [
        "root/pli/ms/sutta/mn/mn146_root-pli-ms.json",
        "translation/en/sujato/sutta/mn/mn146_translation-en-sujato.json",
        "root/pli/ms/sutta/mn/mn68_root-pli-ms.json",
        "translation/en/sujato/sutta/mn/mn68_translation-en-sujato.json",
        "root/pli/ms/sutta/mn/mn21_root-pli-ms.json",
        "translation/en/sujato/sutta/mn/mn21_translation-en-sujato.json",
      ]);
      let [mld0] = res.mlDocs;
      should(mld0.suid).equal("mn146");
      should(mld0.author_uid).equal("sujato");
      should(res.mlDocs.length).equal(maxDoc);
    });
    it("find(...) => Discourse on Love -tc:snp", async () => {
      let MANUAL_TEST = 0;
      if (!MANUAL_TEST) return; // test this manually--it messes up the other tests
      let includeUnpublished = true;
      let branch = "unpublished";
      let bilaraData = new BilaraData({ includeUnpublished, branch });
      //bilaraData.logLevel = 'info';
      let maxDoc = 5;
      let skr = await new Seeker({
        bilaraData,
        logger: bilaraData,
        maxDoc,
      }).initialize();
      let res = await skr.find({
        pattern: "Discourse on Love -tc:snp",
      });
      should(res.lang).equal("en");
      should.deepEqual(res.bilaraPaths.slice(0, 6), [
        "root/pli/ms/sutta/kn/snp/vagga1/snp1.8_root-pli-ms.json",
        "translation/en/sujato/sutta/kn/snp/vagga1/snp1.8_translation-en-sujato.json",
        //'root/pli/ms/sutta/kn/kp/kp9_root-pli-ms.json',
        //'translation/en/sujato/sutta/kn/kp/kp9_translation-en-sujato.json',
      ]);
      should(res.mlDocs.length).equal(1);
      let [mld0] = res.mlDocs;
      should(mld0.suid).equal("snp1.8");
      should(mld0.author_uid).equal("sujato");
    });
    it("find(...) => nun -tc:vinaya", async () => {
      let bilaraData = new BilaraData();
      let maxDoc = 5;
      let skr = await new Seeker({
        bilaraData,
        logger: bilaraData,
        maxDoc,
      }).initialize();
      let res = await skr.find({
        pattern: "nun -tc:vinaya",
      });
      should(res.lang).equal("en");
      should(res.mlDocs.length).equal(maxDoc);
      should.deepEqual(res.bilaraPaths.slice(0, 6), [
        "root/pli/ms/vinaya/pli-tv-kd/pli-tv-kd20_root-pli-ms.json",
        "translation/en/brahmali/vinaya/pli-tv-kd/pli-tv-kd20_translation-en-brahmali.json",
        "root/pli/ms/vinaya/pli-tv-pvr/pli-tv-pvr2.1_root-pli-ms.json",
        "translation/en/brahmali/vinaya/pli-tv-pvr/pli-tv-pvr2.1_translation-en-brahmali.json",
        "root/pli/ms/vinaya/pli-tv-bu-vb/pli-tv-bu-vb-pc/pli-tv-bu-vb-pc21_root-pli-ms.json",
        "translation/en/brahmali/vinaya/pli-tv-bu-vb/pli-tv-bu-vb-pc/pli-tv-bu-vb-pc21_translation-en-brahmali.json",
      ]);
      let [mld0] = res.mlDocs;
      should(mld0.suid).equal("pli-tv-kd20");
      should(mld0.author_uid).equal("brahmali");
      should(res.mlDocs.length).equal(maxDoc);
    });
    it("find(...) => nun -tc:badcategory", async () => {
      let bilaraData = new BilaraData();
      let maxDoc = 5;
      let skr = await new Seeker({
        bilaraData,
        logger: bilaraData,
        maxDoc,
      }).initialize();

      let eCaught;
      try {
        skr.logLevel = "error";
        let res = await skr.find({
          pattern: "nun -tc:badcategory",
        });
      } catch(e) {
        eCaught = e;
      } finally {
        skr.logLevel = logger.logLevel;
      }
      should(eCaught.message).match(/invalid category:badcategory/);
    });
    it("find(...) handles sn46.55/cs", async () => {
      return; // TODO: 20210325 not in published branch yet
      var skr = await new Seeker().initialize();
      var pattern = "sn46.55/cs";
      var ex = undefined;
      try {
        var res = await skr.find({ pattern, matchHighlight: false });
      } catch (e) {
        ex = e;
      }
      should(ex).properties({
        suidRef: pattern,
      });
    });
    it("find(...) handles an1.1-10/jpn", async () => {
      var skr = await new Seeker().initialize();
      var pattern = "an4.182/jpn";
      var ex = undefined;
      var res = await skr.find({ pattern, matchHighlight: false });
      should(res).properties({
        pattern,
        suttaRefs: ["an4.182/jpn"],
      });
    });
    it("TESTTESfind(...) => thig1.1", async () => {
      let bilaraData = new BilaraData();
      let skr = await new Seeker({
        bilaraData,
        logger: bilaraData,
      }).initialize();
      let res = await skr.find({
        pattern: "thig1.1",
      });
      should(res.method).equal("sutta_uid");
      should(res.bilaraPaths.length).equal(2);
      let mld0 = res.mlDocs[0];
      should(mld0.author_uid).equal("sujato");
      should.deepEqual(mld0.langSegs, { pli: 9, en: 9 });
      should(res.lang).equal("en");
      should(mld0.sutta_uid).equal("thig1.1");
    });
    it("find(...) finds mind with greed", async () => {
      var skr = await new Seeker().initialize();

      var res = await skr.find({
        pattern: "mind with greed",
        matchHighlight: false,
      });
      should(res.method).equal("phrase");
      should.deepEqual(
        res.mlDocs.map((mld) => mld.suid).sort(),
        [
          "sn52.14",
          "sn51.11",
          "sn16.9",
          "sn12.70",
          "mn77",
          "mn73",
          "mn6",
          "mn12",
          "mn10",
          "mn108",
          "dn2",
          "dn22",
          "dn10",
          "an9.35",
          "an6.70",
          "an6.2",
          "an5.28",
          "an5.23",
          "an3.101",
          "an10.97",
        ].sort()
      );
      let [mld0] = res.mlDocs;
      let segs0 = mld0.segments();
      should.deepEqual(segs0[0], {
        scid: "sn52.14:1.2",
        pli: "sarāgaṁ vā cittaṁ ‘sarāgaṁ cittan’ti pajānāmi …pe… ",
        en: "I understand mind with greed as ‘mind with greed’ … ",
        matched: true,
      });
    });
    it("find(...) finds mind with greed", async () => {
      var skr = await new Seeker().initialize();

      var res = await skr.find({
        pattern: "mind with greed",
        matchHighlight: false,
      });
      should(res.method).equal("phrase");
      should.deepEqual(
        res.mlDocs.map((mld) => mld.suid).sort(),
        [
          "sn52.14",
          "sn51.11",
          "sn16.9",
          "sn12.70",
          "mn77",
          "mn73",
          "mn6",
          "mn12",
          "mn10",
          "mn108",
          "dn2",
          "dn22",
          "dn10",
          "an9.35",
          "an6.70",
          "an6.2",
          "an5.28",
          "an5.23",
          "an3.101",
          "an10.97",
        ].sort()
      );
      let [mld0] = res.mlDocs;
      let segs0 = mld0.segments();
      should.deepEqual(segs0[0], {
        scid: "sn52.14:1.2",
        pli: "sarāgaṁ vā cittaṁ ‘sarāgaṁ cittan’ti pajānāmi …pe… ",
        en: "I understand mind with greed as ‘mind with greed’ … ",
        matched: true,
      });
    });
    it("find(...) => thig1.1 (sujato)", async () => {
      let bilaraData = new BilaraData();
      let skr = await new Seeker({
        bilaraData,
        logger: bilaraData,
      }).initialize();
      let findArgs = skr.findArgs([
        {
          pattern: "thig1.1",
        },
      ]);
      let res = await skr.slowFind(findArgs);
      //console.log(res);
      should(res.method).equal("sutta_uid");
      should(res.mlDocs.length).above(0);
      let mld0 = res.mlDocs[0];
      should(mld0.author_uid).equal("sujato");
      should.deepEqual(res.bilaraPaths, [
        "root/pli/ms/sutta/kn/thig/thig1.1_root-pli-ms.json",
        "translation/en/sujato/sutta/kn/thig/thig1.1_translation-en-sujato.json",
        //"translation/en/soma/sutta/kn/thig/thig1.1_translation-en-soma.json",
      ]);
      let segments = mld0.segments();
      should(segments[4].en).match(/Sleep softly, little nun,/);
      should.deepEqual(mld0.langSegs, { pli: 9, en: 9 });
      should(res.lang).equal("en");
      should(mld0.sutta_uid).equal("thig1.1");
    });
    it("find(...) => thig1.1/en/soma", async () => {
      let bilaraData = new BilaraData();
      let skr = await new Seeker({
        bilaraData,
        logger: bilaraData,
      }).initialize();
      let findArgs = skr.findArgs([
        {
          pattern: "thig1.1/en/soma",
        },
      ]);
      let res = await skr.slowFind(findArgs);
      should(res.method).equal("sutta_uid");
      should(res.mlDocs.length).above(0);
      let mld0 = res.mlDocs[0];
      should(mld0.author_uid).equal("soma");
      let segments = mld0.segments();
      should(segments[4].en).match(/“Sleep with ease, Elder,/);
      should.deepEqual(mld0.langSegs, { pli: 9, en: 9 });
      should(res.lang).equal("en");
      should(mld0.sutta_uid).equal("thig1.1");
      should(res.bilaraPaths.length).equal(2);
    });
    it("slowFindPhrase(...) => trilingual", async () => {
      let maxResults = 1;
      let msStart = Date.now();
      let pattern = "root of suffering";
      let lang = "de";
      let searchLang = "en";
      let showMatchesOnly = false;
      let skr = await new Seeker({
        maxResults,
      }).initialize();
      let findArgs = { lang, maxResults, pattern, searchLang, showMatchesOnly };
      var res = await skr.slowFindPhrase(findArgs);
      should.deepEqual(res.suttaRefs, [
        //'sn42.11/de/sabbamitta', // the English search phrase does not appear here
        "sn42.11/en/sujato",
        //"mn105/en/sujato",
        //"mn1/en/sujato",
      ]);
    });
    it("slowFindPhrase(...) bhaggava", async () => {
      let maxResults = 5;
      let msStart = Date.now();
      let pattern = "bhaggava";
      let lang = "de";
      let searchLang = "en";
      let showMatchesOnly = false;
      let skr = await new Seeker({
        maxResults,
      }).initialize();
      let findArgs = { lang, maxResults, pattern, searchLang, showMatchesOnly };
      var res = await skr.slowFindPhrase(findArgs);
      should.deepEqual(res.suttaRefs, [
        "dn24/en/sujato",
        "mn81/en/sujato",
        "mn140/en/sujato",
        "sn2.24/en/sujato",
        "sn1.50/en/sujato",
      ]);
    });
    it("find(...) => mil3.1.1.1/de", async () => {
      let bilaraData = new BilaraData();
      let skr = await new Seeker({
        bilaraData,
        logger: bilaraData,
      }).initialize();
      let findArgs = skr.findArgs([
        {
          pattern: "mil3.1.1/de",
        },
      ]);
      let res = await skr.slowFind(findArgs);
      should(res.method).equal("sutta_uid");
      should(res.mlDocs.length).above(0);
      let mld0 = res.mlDocs[0];
      should(mld0.author_uid).equal("sabbamitta");
      should(res.bilaraPaths.length).equal(2);
      let segments = mld0.segments();
      should(segments[4].de).match(/Und der Ehrwürdige Nāgasena/);
      should.deepEqual(mld0.langSegs, { pli: 108, de: 99 });
      should(res.lang).equal("de");
      should(mld0.sutta_uid).equal("mil3.1.1");
    });
    it("phraseSearch(...) finds Autorität (de)", async () => {
      var lang = "de";
      var maxResults = 10;
      var maxDoc = 3;
      var skr = await new Seeker({ maxResults, maxDoc, }).initialize();
      var pattern = `Autorität`;

      skr.logLevel = 'info'; // TODO
      var data = await skr.phraseSearch({ pattern, lang, });
      should.deepEqual(skr.languages, ["pli", "en"]);
      should.deepEqual(data, {
        method: "phrase",
        lang,
        pattern: "\\bAutorität",
        lines: [
          `${de_sab}an/an3/an3.66_translation-de-sabbamitta.json:4`,
          `${de_sab}an/an3/an3.65_translation-de-sabbamitta.json:4`,
          `${de_sab}an/an5/an5.133_translation-de-sabbamitta.json:3`,
          `${de_sab}an/an4/an4.193_translation-de-sabbamitta.json:3`,
          `${de_sab}an/an3/an3.14_translation-de-sabbamitta.json:2`,
          `${de_sab}kn/cp/cp2_translation-de-sabbamitta.json:1`,
          `${de_sab}dn/dn26_translation-de-sabbamitta.json:1`,
        ],
      });
    });
    it("find(...) trilingual root of suffering", async()=>{
      let bilaraData = new BilaraData();
      let skr = await new Seeker({
        bilaraData,
        logger: bilaraData,
        trilingual: true,
      }).initialize();
      let findArgs = skr.findArgs([{
        pattern: "root of suffering",
      }]);
      let res = await skr.slowFind(findArgs);
      should(res.method).equal("phrase");
      should(res.mlDocs.length).above(0);
      let mld0 = res.mlDocs[0];
      should(mld0.author_uid).equal("sujato");
      let segments = mld0.segments();
      should(segments[4]).properties({
        ref: 'For desire is the \u001b[38;5;121mroot of suffering\u001b[0m.’” ',
        en: 'For desire is the \u001b[38;5;121mroot of suffering\u001b[0m.’” ',
        pli: 'Chando hi mūlaṁ dukkhassā’”ti. ',
      });
      should.deepEqual(mld0.langSegs, { pli: 55, ref: 54});
      should(mld0.sutta_uid).equal("sn42.11");
      should(res.bilaraPaths.length).equal(14);
      should(res.lang).equal("en");
    });
    it("find(...) trilingual -l de root of suffering", async()=>{
      let bilaraData = new BilaraData();
      let skr = await new Seeker({
        bilaraData,
        logger: bilaraData,
        trilingual: true,
      }).initialize();
      let findArgs = skr.findArgs([{
        pattern: "root of suffering",
        docLang: "de",
      }]);
      let res = await skr.slowFind(findArgs);
      should(res.method).equal("phrase");
      should(res.mlDocs.length).above(0);
      let mld0 = res.mlDocs[0];
      should(mld0.author_uid).equal("sabbamitta");
      let segments = mld0.segments();
      should(segments[4]).properties({
        ref: 'For desire is the \u001b[38;5;121mroot of suffering\u001b[0m.’” ',
        de: 'Denn Sehnen ist die Wurzel des Leidens.‘“ ',
        pli: 'Chando hi mūlaṁ dukkhassā’”ti. ',
      });
      should.deepEqual(mld0.langSegs, { pli: 55, de: 54, ref: 54});
      should(mld0.sutta_uid).equal("sn42.11");
      should(res.bilaraPaths.length).equal(18);
      should(res.lang).equal("en");
    });
    it("find(...) trilingual thig1.1/en/soma", async () => {
      let bilaraData = new BilaraData();
      let skr = await new Seeker({
        bilaraData,
        logger: bilaraData,
        trilingual: true,
      }).initialize();
      let findArgs = skr.findArgs([
        {
          pattern: "thig1.1/en/soma",
        },
      ]);
      let res = await skr.slowFind(findArgs);
      should(res.method).equal("sutta_uid");
      should(res.mlDocs.length).above(0);
      let mld0 = res.mlDocs[0];
      should(mld0.author_uid).equal("soma");
      let segments = mld0.segments();
      should(segments[4]).properties({
        en: '“Sleep with ease, Elder, ',
        ref: 'Sleep softly, little nun, ',
        pli: '“Sukhaṁ supāhi therike, ',
      });
      should.deepEqual(mld0.langSegs, { pli: 9, en: 9, ref: 9});
      should(res.lang).equal("en");
      should(mld0.sutta_uid).equal("thig1.1");
      should(res.bilaraPaths.length).equal(3);
    });
    it("find(...) thig1.1 -ra soma", async () => {
      let bilaraData = new BilaraData();
      let skr = await new Seeker({
        bilaraData,
        logger: bilaraData,
        trilingual: true,
      }).initialize();
      let findArgs = skr.findArgs([
        {
          pattern: "thig1.1 -ra soma",
        },
      ]);
      let res = await skr.slowFind(findArgs);
      should(res.method).equal("sutta_uid");
      should(res.mlDocs.length).above(0);
      let mld0 = res.mlDocs[0];
      should(mld0.author_uid).equal("sujato");
      let segments = mld0.segments();
      should(segments[4]).properties({
        en: 'Sleep softly, little nun, ',
        ref: '“Sleep with ease, Elder, ',
        pli: '“Sukhaṁ supāhi therike, ',
      });
      should.deepEqual(mld0.langSegs, { pli: 9, en: 9, ref: 9});
      should(res.lang).equal("en");
      should(mld0.sutta_uid).equal("thig1.1");
      should(res.bilaraPaths.length).equal(3);
    });
    it("find(...) thig1.1 -ra sabbamitta", async () => {
      let bilaraData = new BilaraData();
      let skr = await new Seeker({
        bilaraData,
        logger: bilaraData,
        trilingual: true,
      }).initialize();
      let findArgs = skr.findArgs([
        {
          pattern: "thig1.1 -ra sabbamitta",
        },
      ]);
      let res = await skr.slowFind(findArgs);
      should(res.method).equal("sutta_uid");
      should(res.mlDocs.length).above(0);
      let mld0 = res.mlDocs[0];
      should(mld0.author_uid).equal("sujato");
      let segments = mld0.segments();
      should(segments[4]).properties({
        en: 'Sleep softly, little nun, ',
        ref: 'Schlafe sanft, kleine Nonne, ',
        pli: '“Sukhaṁ supāhi therike, ',
      });
      should.deepEqual(mld0.langSegs, { pli: 9, en: 9, ref: 9});
      should(res.lang).equal("en");
      should(mld0.sutta_uid).equal("thig1.1");
      should(res.bilaraPaths.length).equal(3);
    });
  });
