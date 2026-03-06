import { describe, it, expect } from "@sc-voice/vitest";
import { logger, LogInstance } from "log-instance";
import { Files } from "memo-again";
import path from "path";
import { fileURLToPath } from "url";
import PKG_INDEX from "../index.js";

const {
  BilaraData,
  BilaraPathMap,
  MLDoc,
  Pali,
  English,
  FuzzyWordSet,
  Seeker,
  Unicode,
} = PKG_INDEX;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

logger.logLevel = "warn";

const SEEKEROPTS = {};
const en_suj = `translation/en/sujato/sutta/`;
const en_bra = `translation/en/brahmali/vinaya/`;
const de_sab = `translation/de/sabbamitta/sutta/`;
const BILARA_PATH = path.join(Files.LOCAL_DIR, "bilara-data");

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

const my_my = `translation/my/my-team/sutta/`;
const en_dav = `translation/en/davis/sutta/`;
const pli_ms = `root/pli/ms/sutta/`;

describe("Seeker - Core", function () {

  it("default ctor", () => {
    var skr = new Seeker();
    expect(skr).properties({
      languages: ["pli", "en"],
      includeUnpublished: false,
      lang: "en",
      enWords: undefined,
      matchColor: 121,
      matchHighlight: "\x1B[38;5;121m$&\x1B[0m",
      maxDoc: 50,
      maxResults: 1000,
      minLang: 2,
      paliWords: undefined,
      root: BILARA_PATH,
    });
    expect(skr.logger).toEqual(logger);
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
    expect(skr.root).toEqual("/tmp/test");
    expect(skr.logger).toEqual(logger2);
    expect(skr).properties({
      lang,
    });
    expect(skr.paliWords).toBeInstanceOf(FuzzyWordSet);
    expect(skr.memoizer.cache.writeFile).toEqual(writeFile);
  });

  it("grepAllow/Deny matches file names", () => {
    var reAllow = new RegExp("^[^/]+/sutta/(an|sn|mn|kn|dn)/", "iu");
    var reDeny = new RegExp("/(dhp)/", "iu");
    var fn = "sujato/sutta/sn/sn42/" + "sn42.11_translation-en-sujato.json:5";
    expect(reAllow.test(fn)).toEqual(true);
    expect(reDeny.test(fn)).toEqual(false);
  });

  it("grep(...) finds sutta things", async () => {
    var skr = new Seeker({});
    var ms0 = Date.now();
    var maxResults = 1;
    let author = "sujato";
    await skr.clearMemo("grep");
    var res = await skr.grep({
      author,
      pattern: "root of suffering",
      maxResults,
    });
    expect(res).toEqual(SUTTA_ROOT_SUFF.slice(0, maxResults));
    var ms1 = Date.now();
    var res2 = await skr.grep({ author, pattern: "root of suffering", maxResults });
    var ms2 = Date.now();
    expect(res2).toEqual(res);
    expect(ms2 - ms1).toBeLessThan(20);
  });

  it("grep(...) finds maxResults things", async () => {
    var skr = new Seeker(SEEKEROPTS);
    var maxResults = 1;
    var res = await skr.grep({
      author: "sujato",
      pattern: "root of suffering",
      maxResults,
    });
    expect(res).toEqual(SUTTA_ROOT_SUFF.slice(0, maxResults));
  });

  it("grep(...) filters result files", async () => {
    var skr = new Seeker(SEEKEROPTS);
    var res = await skr.grep({
      author: "sujato",
      pattern: "a single day",
      tipitakaCategories: "su",
    });
    expect(res).toEqual([
      `${en_suj}kn/dhp/dhp100-115_translation-en-sujato.json:6`,
      `${en_suj}dn/dn9_translation-en-sujato.json:1`,
      `${en_suj}an/an10/an10.46_translation-en-sujato.json:1`,
    ]);
  });

  it("grep(...) finds de things", async () => {
    var skr = new Seeker(SEEKEROPTS);
    var maxResults = 5;
    let author = "sabbamitta";
    let lang = "de";

    // diacritical word boundary
    var res = await skr.grep({
      author,
      lang,
      pattern: "übung",
      maxResults,
    });
    expect(res.slice(0, 4)).toEqual([
      `${de_sab}mn/mn9_translation-de-sabbamitta.json:50`,
      `${de_sab}mn/mn46_translation-de-sabbamitta.json:48`,
      `${de_sab}dn/dn25_translation-de-sabbamitta.json:48`,
      `${de_sab}dn/dn8_translation-de-sabbamitta.json:29`,
    ]);
    expect(res.length).toBeLessThan(6);

    var res = await skr.grep({
      author,
      lang,
      pattern: "wie der geist",
    });
    expect(res).toEqual([
      `${de_sab}an/an1/an1.31-40_translation-de-sabbamitta.json:10`,
      `${de_sab}an/an1/an1.21-30_translation-de-sabbamitta.json:10`,
      `${de_sab}an/an1/an1.41-50_translation-de-sabbamitta.json:2`,
    ]);
  });

  it("sanitizePattern(...) code injection guard", () => {
    var testPattern = (pattern, expected) => {
      expect(Seeker.sanitizePattern(pattern)).toEqual(expected);
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
    expect(() => Seeker.sanitizePattern("not [good")).toThrow();
  });

  it("normalizePattern(...) code injection guard", () => {
    var testPattern = (pattern, expected) => {
      expect(Seeker.normalizePattern(pattern)).toEqual(expected);
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

  it("keywordPattern(...) returns grep pattern", async () => {
    var skr = await new Seeker(SEEKEROPTS).initialize();
    expect(skr.keywordPattern("anathapindika", "en")).toEqual(
      "\\b(a|ā)(n|ṅ|ñ|ṇ)(a|ā)(t|ṭ)h(a|ā)p" +
        "(i|ī)(n|ṅ|ñ|ṇ)(d|ḍ)(i|ī)k(a|ā)"
    );
    expect(skr.keywordPattern("anathapindika", "pli")).toEqual(
      "\\b(a|ā)(n|ṅ|ñ|ṇ)(a|ā)(t|ṭ)h(a|ā)p" +
        "(i|ī)(n|ṅ|ñ|ṇ)(d|ḍ)(i|ī)k(a|ā)"
    );
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
    expect(data.method).toEqual("phrase");
    var mld0 = data.mlDocs[0];
    expect(mld0.bilaraPaths[0]).toEqual(
      "root/pli/ms/sutta/kn/snp/vagga5/snp5.3_root-pli-ms.json"
    );
    expect(mld0.score).toEqual(2.105);
    delete data2.elapsed;
    delete data.elapsed;
    expect(data2).toEqual(data);
  });

  it("RegExp matches ubung", () => {
    var re = /(?<=[\s,.:;"']|^)übung/iu;
    var text = "Wahrheit von der Übung, die zum Aufhören";
    expect(re.test(text)).toEqual(true);
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
      expect(eCaught.message).toMatch(/invalid category:an101/i);
    }

    // valid
    expect(skr.tipitakaRegExp("tha-ap").toString())
      .toEqual("/(\\/tha-ap\\/)/iu");
    expect(skr.tipitakaRegExp("an").toString())
      .toEqual("/(\\/an\\/)/iu");
    expect(skr.tipitakaRegExp("an1").toString())
      .toEqual("/(\\/an1\\/)/iu");
    expect(skr.tipitakaRegExp("an11").toString())
      .toEqual("/(\\/an11\\/)/iu");
    expect(skr.tipitakaRegExp("sn5").toString())
      .toEqual("/(\\/sn5\\/)/iu");
    expect(skr.tipitakaRegExp("sn56").toString())
      .toEqual("/(\\/sn56\\/)/iu");
    expect(skr.tipitakaRegExp("su").toString())
      .toEqual("/(\\/sutta\\/)/iu");
    expect(skr.tipitakaRegExp().toString())
      .toEqual("/(\\/sutta\\/)/iu");
    expect(skr.tipitakaRegExp("bi,pj").toString())
      .toEqual("/(-bi-|-pj)/iu");
  });

  it("patternLanguage(...) => search language context", async () => {
    let enWords = await English.wordSet({ source: "file" });
    var skr = await new Seeker({ enWords }).initialize();

    // "gehe" and "so" are both German and Pali
    expect(skr.patternLanguage("anathapindika gehe so", "de")).toEqual("pli");

    expect(skr.patternLanguage("rat", "de")).toEqual("de");
    expect(skr.patternLanguage("blind", "de")).toEqual("de");
    expect(
      skr.patternLanguage("buddha was staying near benares", "de")
    ).toEqual("en");
    expect(
      skr.patternLanguage("buddha was staying near benares", "en")
    ).toEqual("en");

    // Sutta references
    expect(skr.patternLanguage("mn1", "de")).toEqual("de");
    expect(skr.patternLanguage("mn1/pli", "de")).toEqual("pli");
    expect(skr.patternLanguage("mn1/en", "de")).toEqual("en");
    expect(skr.patternLanguage("mn1/en/sujato", "de")).toEqual("en");
    expect(skr.patternLanguage("mn1/de", "de")).toEqual("de");
    expect(skr.patternLanguage("mn1/de/sabbamitta", "de")).toEqual("de");

    expect(skr.patternLanguage("wurzel des leidens", "de")).toEqual("de");
    expect(skr.patternLanguage("awakened buddha", "de")).toEqual("en");
    expect(skr.patternLanguage("anathema")).toEqual("en");
    expect(skr.patternLanguage("anathema", "en")).toEqual("en");
    expect(skr.patternLanguage("anath")).toEqual("en");
    expect(skr.patternLanguage("anath", "en")).toEqual("en");
    expect(skr.patternLanguage("anatha")).toEqual("pli");
    expect(skr.patternLanguage("anatha", "en")).toEqual("pli");
    expect(skr.patternLanguage("anathapindika")).toEqual("pli");
    expect(skr.patternLanguage("anathapindika", "en")).toEqual("pli");
    expect(skr.patternLanguage("anathapindika monastery")).toEqual("en");
    expect(skr.patternLanguage("anathapindika monastery", "en")).toEqual("en");
    expect(skr.patternLanguage("anathapindika kloster", "de")).toEqual("de");
    expect(skr.patternLanguage("anathapindika kloster")).toEqual("en");
  });

  it("find(...) scores relevance", async () => {
    var skr = await new Seeker({
      lang: "en", // English default
    }).initialize();

    var pattern = "abhisambuddha";
    var data = await skr.find({
      pattern,
    });
    expect(data.resultPattern).toEqual(
      "\\b(a|ā)bh(i|ī)s(a|ā)(m|ṁ|ṃ)b(u|ū)(d|ḍ)(d|ḍ)h(a|ā)"
    );
    expect(data.method).toEqual("phrase");
    var mld0 = data.mlDocs[0];
    expect(mld0.bilaraPaths[0]).toEqual(
      "root/pli/ms/sutta/dn/dn34_root-pli-ms.json"
    );
    expect(mld0.score).toEqual(10.011);
  });

  it("find(...) scores relevance: on fire", async () => {
    var skr = await new Seeker({
      lang: "en", // English default
    }).initialize();

    var pattern = "on fire";
    skr.clearMemo('find');
    skr.clearMemo('grep');
    var data = await skr.find({
      pattern,
    });
    expect(data.resultPattern).toEqual("\\bon\\sfire");
    expect(data.method).toEqual("phrase");
    var [mld0, mld1] = data.mlDocs;
    expect(mld1.bilaraPaths[0]).toEqual(
      "root/pli/ms/sutta/sn/sn56/sn56.34_root-pli-ms.json"
    );
    expect(mld1.score).toEqual(2.2);
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
    expect(res.method).toEqual("phrase");
    expect(res.suttaRefs).toEqual([
      "sn42.11/en/sujato",
      "mn105/en/sujato",
      "mn1/en/sujato",
      "sn56.21/en/sujato",
      "mn66/en/sujato",
      "mn116/en/sujato",
      "dn16/en/sujato",
    ]);
    expect(
      res.mlDocs.map((mld) => `${mld.suid}, ${mld.score}`)
    ).toEqual([
      "sn42.11, 5.091",
      "mn105, 3.016",
      "mn1, 2.006",
      "sn56.21, 1.043",
      "mn116, 1.01",
      "mn66, 1.005",
      "dn16, 1.001",
    ]);
  });

  it("find(...) ignores translation stubs", async () => {
    var skr = await new Seeker().initialize();

    var pattern = "root of suffering -ml 3 -l de";
    var res = await skr.find({
      pattern,
    });
    expect(res.suttaRefs).toEqual([
      "sn42.11/en/sujato",
      "mn105/en/sujato",
      "mn1/en/sujato",
      "sn56.21/en/sujato",
      "mn66/en/sujato",
      "mn116/en/sujato",
      "dn16/en/sujato",
    ]);
    expect(res.bilaraPaths.length).toBeGreaterThan(12);
    expect(res.bilaraPaths.length).toBeLessThan(30);
  });

  it("find(...) ignores chinese", async () => {
    var skr = await new Seeker().initialize();

    var pattern = "wrong livelihood";
    var res = await skr.find({
      pattern,
    });
    expect(res.bilaraPaths.length).toEqual(158);
  });

  it("isExample", async () => {
    var skr = await new Seeker({
      lang: "en", // English default
    });
    await skr.initialize();
    let msStart = Date.now();
    expect(skr.isExample("but ma'am")).toEqual(true);
    expect(skr.isExample("but ma.am")).toEqual(true); // sanitized
    expect(skr.isExample("root of suffering")).toEqual(true);
    expect(skr.isExample("ROOT OF SUFFERING")).toEqual(true);
    expect(skr.isExample("Wurzel des Leidens")).toEqual(true);
    expect(skr.isExample("wurzel des leidens")).toEqual(true);

    //similar but not an example
    expect(skr.isExample("\\bROOT OF SUFFERING")).toEqual(false);
    expect(skr.isExample("\\bROOT OF SUFFERING\\b")).toEqual(false);

    // Ordered keywords
    expect(skr.isExample("root sufering")).toEqual(false);
    expect(Date.now() - msStart).toBeLessThan(200);
  });

  it("isExample (cached)", async () => {
    let exampleCache = require(`../src/is-example.json`);
    var skr = await new Seeker({
      lang: "en", // English default
      exampleCache,
    });
    await skr.initialize();
    let msStart = Date.now();
    expect(skr.isExample("but ma'am")).toEqual(true);
    expect(skr.isExample("but ma.am")).toEqual(true); // sanitized
    expect(skr.isExample("root of suffering")).toEqual(true);
    expect(skr.isExample("ROOT OF SUFFERING")).toEqual(true);
    expect(skr.isExample("Wurzel des Leidens")).toEqual(true);
    expect(skr.isExample("wurzel des leidens")).toEqual(true);

    //similar but not an example
    expect(skr.isExample("\\bROOT OF SUFFERING")).toEqual(false);
    expect(skr.isExample("\\bROOT OF SUFFERING\\b")).toEqual(false);

    // Ordered keywords
    expect(skr.isExample("root sufering")).toEqual(false);
    expect(Date.now() - msStart).toBeLessThan(200);
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
    expect(data).properties(expected);

    skr.maxResults = 100; // keywordSearch will override
    expect(skr.maxResults).toEqual(100);
    var data = await skr.keywordSearch(skr.findArgs([{
      pattern,
      maxResults, // explicit specification
    }]));
    expect(data).properties(expected);
    expect(data.lines).toEqual([
      `${en_suj}dn/dn34_translation-en-sujato.json:5`,
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
    expect(data).properties(enExpected);
    expect(data.lines.slice(0, 4)).toEqual([
      `${en_suj}dn/dn34_translation-en-sujato.json:5`,
    ]);

    // Using Seeker default lang still returns English
    var data = await skr.keywordSearch(skr.findArgs([{
      pattern,
    }]));
    expect(data).properties(enExpected);

    // Change Seeker default language to English
    skr.lang = "en"; // Not advisable for multiple users
    expect(skr.lang).toBe("en");
    var data = await skr.keywordSearch(skr.findArgs([{
      pattern,
    }]));
    expect(data).properties(enExpected);
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
    expect(data).properties(expected);

    // Single romanized Pali searches Pali
    var data = await skr.keywordSearch(skr.findArgs([{
      pattern: "anathapindika",
    }]));
    expect(data).properties(expected);
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
    expect(data).properties(expected);
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
    expect(data).properties(expected);

    // Single romanized Pali searches Pali
    data = await skr.keywordSearch(skr.findArgs([{
      pattern: "anathapindika",
      lang: "de", // will be ignored
    }]));
    expect(data).properties(expected);
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
        `${de_sab}mn/mn42_translation-de-sabbamitta.json:2`,
      ],
    };

    // Mixed Pali/Deutsch keywords initial cap
    var data = await skr.keywordSearch(skr.findArgs([{
      pattern: Seeker.normalizePattern("Anathapindika Hausbesitzer"),
      maxResults: 10,
      lang: "de", // Requesting Deutsch search
    }]));
    expect(data).toEqual(expected);

    // Mixed Pali/Deutsch keywords lowercase
    var data = await skr.keywordSearch(skr.findArgs([{
      pattern: Seeker.normalizePattern("anathapindika hausbesitzer"),
      maxResults: 10,
      lang: "de", // Requesting Deutsch search
    }]));
    expect(data).toEqual(expected);
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
    expect(data).toEqual(expected);

    skr.maxResults = 100; // phraseSearch will override
    expect(skr.maxResults).toBe(100);
    var data = await skr.phraseSearch({
      pattern,
      maxResults, // explicit specification
    });
    expect(data).properties(expected);
    expect(data.lines.slice(0, 3)).toEqual(expected.lines);
    expect(data.lines.length).toBe(maxResults);
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
    expect(data).toEqual({
      method: "phrase",
      lang: "en",
      pattern: `\\bsabbamitta`,
      lines,
    });
  });

  it("phraseSearch(...) finds Deutsch results", async () => {
    var linesWurzel = [
      `${de_sab}sn/sn42/sn42.11_translation-de-sabbamitta.json:5`,
      `${de_sab}mn/mn105_translation-de-sabbamitta.json:3`,
      `${de_sab}mn/mn1_translation-de-sabbamitta.json:2`,
      `${de_sab}sn/sn56/sn56.21_translation-de-sabbamitta.json:1`,
      `${de_sab}mn/mn66_translation-de-sabbamitta.json:1`,
      `${de_sab}mn/mn116_translation-de-sabbamitta.json:1`,
      `${de_sab}dn/dn16_translation-de-sabbamitta.json:1`,
    ];
    var lang = "de";
    var maxResults = 10; var maxDoc = 3; var skr = await new Seeker({
      maxResults,
      maxDoc,
    }).initialize();
    expect(skr.languages).toEqual(["pli", "en"]);

    // diacritical word boundary
    var pattern = `übung`;
    var data = await skr.phraseSearch({
      pattern,
      lang,
    });
    expect(skr.languages).toEqual(["pli", "en"]);
    expect(data).properties({
      method: "phrase",
      lang,
      pattern: `\\b${pattern}`,
    });
    expect(data.lines.slice(0, 2)).toEqual([
      `${de_sab}mn/mn9_translation-de-sabbamitta.json:50`,
      `${de_sab}mn/mn46_translation-de-sabbamitta.json:48`,
    ]);

    var pattern = `wurzel des leidens`;
    var data = await skr.phraseSearch({
      pattern,
      lang,
    });
    expect(skr.languages).toEqual(["pli", "en"]);
    expect(data).toEqual({
      method: "phrase",
      lang,
      pattern: `\\bwurzel des leidens`,
      lines: linesWurzel,
    });
  });
});
