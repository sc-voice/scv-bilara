import { describe, it, expect } from "@sc-voice/vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PKG_INDEX from "../index.js";
import { BilaraPath } from "scv-esm";
import { logger, LogInstance } from "log-instance";
import { Files } from "memo-again";

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
const TEST_UNPUBLISHED = false;
var { translationPath, rootPath } = BilaraPath;
var bd = new BilaraData();
logger.level = "warn";

const en_suj = `translation/en/sujato/sutta/`;
const en_bra = `translation/en/brahmali/vinaya/`;
const de_sab = `translation/de/sabbamitta/sutta/`;
const my_my = `translation/my/my-team/sutta/`;
const en_dav = `translation/en/davis/sutta/`;
const pli_ms = `root/pli/ms/sutta/`;

const SLEEP_SOMA = "sleep with ease";
const SLEEP_SUJATO = "sleep softly";
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

describe("Seeker - Sutta Tests", function () {

  it("find(...) finds dhp2", async () => {
    var skr = await new Seeker().initialize();
    //skr.logLevel = 'debug';

    let findArgs = skr.findArgs([{
      pattern: "dhp2",
      matchHighlight: false,
    }]);
    var res = await skr.slowFind(findArgs);
    expect(res.method).toBe("sutta_uid");
    expect(res.suttaRefs).toEqual(["dhp1-20/en"]);
    expect(
      res.mlDocs.map((mld) => mld.suid)
    ).toEqual(["dhp1-20"]);
    let [mld0] = res.mlDocs;
    let segs0 = mld0.segments();
    expect(segs0[4]).toEqual({
      scid: "dhp2:4",
      en: "you speak or act, ",
      matched: true,
      pli: "bhāsati vā karoti vā; ",
    });
  });

  it("find(...) finds cp35/de", async () => {
    var skr = await new Seeker().initialize();

    let findArgs = skr.findArgs([{
      pattern: "cp35 -ra sujato",
      matchHighlight: false,
      lang:"de",
    }]);
    var res = await skr.slowFind(findArgs);
    expect(res.method).toBe("sutta_uid");
    expect(res).properties({
      method: "sutta_uid",
      trilingual: true,
    })
    expect(res.suttaRefs).toEqual(["cp35"]);
    expect(
      res.mlDocs.map((mld) => mld.suid)
    ).toEqual(["cp35"]);
    let [mld0] = res.mlDocs;
    let segs0 = mld0.segments();
    expect(segs0[4]).toEqual({
      scid: "cp35:1.1",
      matched: true,
      pli: "“Susāne seyyaṁ kappemi, ",
      ref: "“I made my bed in a charnel ground, ",
    });
  });

  it("find(...) finds thag1.10", async () => {
    var skr = await new Seeker().initialize();

    var res = await skr.find({
      pattern: "thag1.10",
      matchHighlight: false,
    });
    expect(res.method).toBe("sutta_uid");
    expect(res.suttaRefs).toEqual(["thag1.10/en"]);
    expect(
      res.mlDocs.map((mld) => mld.suid)
    ).toEqual(["thag1.10"]);
  });

  it("find(...) orders sutta references found", async () => {
    var skr = await new Seeker().initialize();

    var res = await skr.find({
      pattern: "sn29.9-999",
      matchHighlight: false,
    });
    expect(res.method).toBe("sutta_uid");
    expect(res.suttaRefs).toEqual([
      "sn29.9/en",
      "sn29.10/en",
      "sn29.11-20/en",
      "sn29.21-50/en",
    ]);
    expect(
      res.mlDocs.map((mld) => mld.score)
    ).toEqual([0, 0, 0, 0]);
    expect(
      res.mlDocs.map((mld) => mld.suid)
    ).toEqual(["sn29.9", "sn29.10", "sn29.11-20", "sn29.21-50"]);
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
    expect(res.method).toBe("sutta_uid");
    expect(res.maxResults).toBe(maxResults);
    expect(res.suttaRefs).toEqual([
      "sn12.23/de",
      "an1.1-10/de",
      "an1.11-20/de",
    ]);
    // mlDocs are not sorted when searching by suid
    // since the user is specifying the desired order
    expect(
      res.mlDocs.map((mld) => mld.suid)
    ).toEqual(["sn12.23", "an1.1-10", "an1.11-20"]);
    expect(res.resultPattern).toBe(pattern);
    expect(res.lang).toBe("de");
    expect(res.mlDocs.length).toBe(3);
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
    expect(res.method).toBe("sutta_uid");
    expect(res.maxResults).toBe(maxResults);
    expect(res.suttaRefs).toEqual(["mn1/en/sujato"]);
    expect(res.resultPattern).toBe(pattern);
    expect(res.lang).toBe("en"); // pattern overrides default lang='de'
    expect(res.mlDocs.length).toBe(1);
    var segments = mld0.segments();
    expect(segments.length).toBe(334);
    expect(segments[22]).properties({
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
    expect(res.method).toBe("sutta_uid");
    expect(res.maxResults).toBe(maxResults);

    // Ignore maxDoc for sutta lists
    expect(res.suttaRefs).toEqual([
      "thig1.1/en/soma", "thig1.2/en/soma", "thig1.3/en/soma"]);
    expect(res.mlDocs.length).toBe(3); // maxdDoc limit
    expect(res.mlDocs.map(md=>md.suid)).toEqual(
      ["thig1.1", "thig1.2", "thig1.3"]);
    expect(res.mlDocs.map(md=>md.author_uid)).toEqual(
      ["soma", "soma", "soma"]);
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
    expect(res.method).toBe("sutta_uid");
    expect(res.maxResults).toBe(maxResults);
    expect(res.suttaRefs).toEqual(["an1.1-10/de"]);
    expect(res.resultPattern).toBe(pattern);
    expect(res.lang).toBe("de");
    expect(res.mlDocs.length).toBe(1);
    var segments = mld0.segments();
    expect(segments[0]).toEqual({
      scid: "an1.2:1.0",
      de: "2 ",
      en: "2 ",
      pli: "2 ",
      matched: true,
    });
    expect(segments.length).toBe(4);
    expect(segments[3]).properties({
      // AN1.1
      scid: "an1.2:1.3",
      pli: "Dutiyaṁ. ",
      matched: true,
    });
  });

  it("find({minLang}) => minLang 2", async () => {
    var maxResults = 3;
    var skr = await new Seeker({
      maxResults,
    }).initialize();
    expect(skr.languages).toEqual(["pli", "en"]);

    var pattern = "dn33";
    var res = await skr.find({
      pattern,
      lang: "de",
      minLang: 2,
    });
    expect(res.suttaRefs).toEqual(["dn33/de"]);
    expect(res.mlDocs.length).toBe(1);
    expect(res.minLang).toBe(2);

    var res = await skr.find({
      pattern,
      lang: "de",
      minLang: 2,
    });
    expect(res.suttaRefs).toEqual(["dn33/de"]);
    expect(res.mlDocs.length).toBe(1);
    let mld0 = res.mlDocs[0];
    expect(mld0.author_uid).toBe("sabbamitta");
  });

  it("find({minLang:3}) root of suffering", async () => {
    var maxResults = 1000;
    let minLang = 3;
    let lang = 'de';
    let pattern = "root of suffering";
    var skr = await new Seeker({ maxResults, }).initialize();
    expect(skr.languages).toEqual(["pli", "en"]);

    var res = await skr.find({ pattern, lang, minLang });
    expect(res.suttaRefs).toEqual([
      "sn42.11/en/sujato",
      "mn105/en/sujato",
      "mn1/en/sujato",
      "sn56.21/en/sujato",
      "mn66/en/sujato",
      "mn116/en/sujato",
      "dn16/en/sujato",
    ]);
    expect(res.mlDocs.length).toBeGreaterThan(4);
    expect(res.mlDocs.length).toBeLessThan(10);
    expect(res.minLang).toBe(3);
  });

  it("find({minLang:2}) root of suffering", async () => {
    let maxResults = 10;
    let lang = 'de';
    let minLang = 2;
    let pattern = "root of suffering";
    var skr = await new Seeker({ maxResults, }).initialize();
    var res = await skr.find({ pattern, lang, minLang });
    expect(res.suttaRefs).toEqual([
      "sn42.11/en/sujato",
      "mn105/en/sujato",
      "mn1/en/sujato",
      "sn56.21/en/sujato",
      "mn66/en/sujato",
      "mn116/en/sujato",
      "dn16/en/sujato",
    ]);
    expect(res.mlDocs.length).toBe(7);
    let mld0 = res.mlDocs[0];
    expect(mld0.author_uid).toBe("sabbamitta");
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
    expect(res.maxDoc).toBe(maxDoc);
    expect(res.mlDocs.length).toBe(maxDoc);
    expect(res.suttaRefs.slice(0, maxDoc)).toEqual([
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
    expect(res.segsMatched).toBe(10);
    expect(res.suttaRefs).toEqual([
      "sn42.11/en/sujato",
      "mn105/en/sujato",
      "mn1/en/sujato",
    ]);
    expect(res.mlDocs.map((mld) => mld.score)).toEqual([
      5.091, 3.016,
      2.006
    ]);
    expect(res.mlDocs.map((mld) => mld.suid)).toEqual([
      "sn42.11", "mn105",
      "mn1"
    ]);
    var [mld0, mld1, mld2] = res.mlDocs;
    expect(res.mlDocs.length).toBe(3);
    expect(res.minLang).toBe(2);
    expect(mld0.segments()[0]).toEqual({
      scid: "sn42.11:0.1",
      de: "Verbundene Lehrreden 42.11 ",
      en: "Linked Discourses 42.11 ",
      pli: "Saṁyutta Nikāya 42.11 ",
    });
    expect(mld1.segments()[0]).toEqual({
      scid: "mn105:0.1",
      pli: "Majjhima Nikāya 105 ",
      de: "Mittlere Lehrreden 105 ",
      en: "Middle Discourses 105 ",
    });
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
    expect(res.suttaRefs.slice(0, 3)).toEqual([
      "mn9/de/sabbamitta",
      "mn46/de/sabbamitta",
      "mn77/de/sabbamitta",
    ]);
    // We only care about three documents so that
    // is what we should get
    expect(
      res.mlDocs.map((mld) => mld.score)
    ).toEqual([
      50.214, 48.273, 28.072,
    ]);
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
    expect(res.suttaRefs).toEqual(["thag2.15/en/sujato", "dn14/en/sujato"]);
    expect(res.mlDocs[0].lang).toBe("de");
  });

  it("find(...) => accepts embedded options", async () => {
    var skr = await new Seeker({}).initialize();

    var pattern = "sabbamitta -ml 3 -sl en -l de -ml 2";
    var res = await skr.find({
      pattern,
    });
    expect(res.suttaRefs).toEqual(["thag2.15/en/sujato", "dn14/en/sujato"]);
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
    expect(res.suttaRefs.length).toBe(16);
  });

  it("find() keywords: wurzel leidens", async () => {
    var maxDoc = 3;
    var skr = await new Seeker({
      maxDoc,
    }).initialize();
    skr.clearMemo('find');
    skr.clearMemo('grep');

    var pattern = "wurzel leidens";
    var res = await skr.find({
      pattern,
      lang: "de",
      minLang: 2,
    });
    expect(res.suttaRefs).toEqual([
      "sn42.11/de/sabbamitta",
      "dn34/de/sabbamitta",
      "mn105/de/sabbamitta",
      "mn116/de/sabbamitta",
      "dn16/de/sabbamitta",
      "mn66/de/sabbamitta",
      "sn56.21/de/sabbamitta",
    ]);
    var [mld0] = res.mlDocs;
    expect(res.mlDocs.length).toBe(3);
    expect(res.minLang).toBe(2);
    let seg0 = mld0.segments()[0];
    expect(seg0).properties({ scid: "sn42.11:2.11", });
    expect(seg0.pli).toMatch(/Chando hi mūlaṁ dukkhassa./);
    expect(seg0.de).toMatch(/wurzel.*leiden/i);
    expect(seg0.en).toMatch(/root of suffering/);
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
    expect(res.resultPattern).toBe("\\bred|\\byellow");
    expect(res.method).toBe("keywords");
    expect(res.suttaRefs.slice(0, 3)).toEqual([
      "mn77/en/sujato",
      "dn16/en/sujato",
      "dn23/en/sujato",
    ]);
    expect(res.suttaRefs.length).toBe(16);
    var [mld0, mld1, mld2] = res.mlDocs;
    expect(res.mlDocs.length).toBe(3);
    expect(res.minLang).toBe(2);
    expect(res.suttaRefs.length).toBe(16);
    expect(res.segsMatched).toBe(26);
    expect(mld0.score).toBeGreaterThan(mld1.score);
  });

  it("RegExp knows about word boundaries", () => {
    var u = new Unicode();
    var text = [
      `"Yaṃ panāniccaṃ dukkhaṃ vā taṃ sukhaṃ vā"ti?`,
      `sotaṃ niccaṃ vā aniccaṃ vā"ti?`,
    ];
    var utext = text.map((t) => u.romanize(t));
    var pattern = "\\b(a|ā)(n|ṅ|ñ|ṇ)(i|ī)cc(a|ā)";
    var re = new RegExp(`${pattern}`, "gui");
    expect(utext[0].replace(re, "ANICCA")).toBe(utext[0]);
    expect(utext[1].replace(re, "ANICCA")).toBe(
      `sotam niccam va ANICCAm va"ti?`
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
    expect(method).toBe("phrase");
    expect(searchLang).toBe(searchLang);
    expect(bilaraPaths).toEqual([
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
    expect(method).toBe("phrase");
    expect(searchLang).toBe(searchLang);
    expect(bilaraPaths).toEqual([
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

  it("findArgs(...) => aggaḷaṃ,", async () => {
    var bilaraData = await bd.initialize();
    var skr = await new Seeker({
      bilaraData,
    }).initialize();
    let pattern = 'aggaḷaṃ';

    let res = skr.findArgs([`${pattern}`]);
    expect(res.pattern).toBe('aggaḷaṁ');
  });

  it("findArgs(...) => thig1.1..., thig1.2...", async () => {
    var bilaraData = await bd.initialize();
    var skr = await new Seeker({
      bilaraData,
    }).initialize();
    let pattern = "thig1.1/en/soma, thig1.2/en/soma";

    let res = skr.findArgs([`${pattern}`]);
    expect(res).properties({
      includeUnpublished: false,
      docLang: 'en',
      docAuthor: 'soma',
      lang: "en",
      languages: ["pli", "en", 'ref'],
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
    expect(args).toEqual({
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
      searchAuthor: 'kaz',
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

    expect(skr.findArgs(["wurzel des leidens -ml3 -l de"])).toEqual({
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
      searchAuthor: 'sabbamitta',
      showMatchesOnly: true,
      sortLines: undefined,
      tipitakaCategories: undefined,
      trilingual: false,
      types: ["root", "translation"],
    });

    let args = skr.findArgs(["wurzel des leidens -ml 3 -l de"]);
    expect(args).toEqual({
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
      searchAuthor: 'sabbamitta',
      showMatchesOnly: true,
      sortLines: undefined,
      tipitakaCategories: undefined,
      trilingual: false,
      types: ["root", "translation"],
    });
  });

  it("findArgs(...) author", async () => {
    let bilaraData = await bd.initialize();
    let pattern = "root of suffering";
    let skr = await new Seeker({
      bilaraData,
    }).initialize();

    expect(skr.findArgs([{ pattern, lang:"pt"}]))
      .properties({
        author: "laera-quaresma",
        searchLang:'pt',
        docAuthor: 'laera-quaresma',
        docLang: 'pt',
        refAuthor: 'sujato',
        refLang: 'en',
        lang: 'pt',
        langAuthor: 'laera-quaresma',
      });
    expect(skr.findArgs([{ pattern:"assim ouvi", lang:"pt"}]))
      .properties({ author: "laera-quaresma", searchLang:'pt'});
    expect(skr.findArgs([{ pattern, }]))
      .properties({ author: "sujato", });
    expect(skr.findArgs([{ pattern, author:"brahmali"}]))
      .properties({ author: "brahmali", });
    expect(skr.findArgs([{ pattern, lang:"de"}]))
      .properties({ author: "sujato", });
    expect(skr.findArgs([{ pattern:"wurzel des leidens", lang:"de"}]))
      .properties({ author: "sabbamitta", });
  });

  it("find(...) finds an1.1 all types", async () => {
    var skr = await new Seeker().initialize();
    var res = await skr.find({
      pattern: "an1.1",
      matchHighlight: false,
      lang: "de",
      types: BilaraPathMap.ALL_TYPES,
    });
    expect(res.mlDocs.length).toBe(1);
    var segs = res.mlDocs[0].segments();
    expect(segs[0]).toEqual({
      scid: "an1.1:0.1",
      pli: "Aṅguttara Nikāya 1 ",
      en: "Numbered Discourses 1.1–10 ",
      de: "Nummerierte Lehrreden 1.1–10 ",
      matched: true,
    });
  });

  it("find(...) finds mind with greed", async () => {
    var skr = await new Seeker().initialize();

    var res = await skr.find({
      pattern: "mind with greed",
      matchHighlight: false,
    });
    expect(res.method).toEqual("phrase");
    expect(
      res.mlDocs.map((mld) => mld.suid).sort()
    ).toEqual([
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
    ].sort());
    let [mld0] = res.mlDocs;
    let segs0 = mld0.segments();
    expect(segs0[0]).properties({
      scid: "sn52.14:1.2",
      pli: "sarāgaṁ vā cittaṁ ‘sarāgaṁ cittan’ti pajānāmi …pe… ",
      en: "I understand mind with greed as ‘mind with greed’ … ",
      matched: true,
    });
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
    expect(res.method).toBe("sutta_uid");
    expect(res.maxDoc).toBe(maxDoc);
    expect(res.suttaRefs).toEqual([
      "pli-tv-bi-vb-sk1/en",
      "pli-tv-bi-vb-sk75/en",
    ]);
    expect(res.resultPattern).toBe(pattern);
    expect(res.lang).toBe("en");
    expect(res.mlDocs.length).toBe(2);
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
    expect(res.method).toBe("sutta_uid");
    expect(res.maxDoc).toBe(maxDoc);
    expect(res.suttaRefs).toEqual([
      "pli-tv-bi-vb-sk1/en",
      "pli-tv-bi-vb-sk75/en",
    ]);
    expect(res.resultPattern).toBe(pattern);
    expect(res.lang).toBe("en");
    expect(res.mlDocs.length).toBe(2);
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
    expect(res.method).toBe("phrase");
    expect(res.maxDoc).toBe(maxDoc);
    expect(res.suttaRefs).toEqual([
      "pli-tv-bi-vb-pj7/en/brahmali",
      "pli-tv-pvr2.9/en/brahmali",
      "pli-tv-pvr2.1/en/brahmali",
      "pli-tv-bi-vb-ss4/en/brahmali",
      "pli-tv-pvr2.2/en/brahmali",
      "pli-tv-pvr2.10/en/brahmali",
    ]);
    expect(res.resultPattern).toBe(`\\b${pattern}`);
    expect(res.lang).toBe("en");
    expect(res.mlDocs.length).toBe(3);
  });

  it("find(...) => ignores SN46.36", async () => {
    var skr = await new Seeker({
      root: TEST_BILARA_PATH,
      repoPath: BILARA_PATH,
    }).initialize();

    var pattern = "hindrance -ml 3 -sl en -l de";
    var res = await skr.find({
      pattern,
    });
    expect(res.suttaRefs).toEqual([]);
  });

  it("find(...) finds 'alles leiden,...'", async () => {
    var bilaraData = await bd.initialize();
    var skr = await new Seeker({
      bilaraData,
    }).initialize();
    var pattern = "alles leiden, das entsteht -ml3 -l de";
    skr.clearMemo('find');
    skr.clearMemo('grep');

    var data = await skr.find({ pattern });
    expect(data.resultPattern).toBe("\\balles\\sleiden,\\sdas\\sentsteht");
    expect(data.method).toBe("phrase");
    expect(data.mlDocs.length).toBe(2);
    var mld1 = data.mlDocs[1];
    expect(mld1.bilaraPaths[1]).toMatch(/sn42.11/);
    expect(mld1.score).toBe(3.055);
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
    expect(res.resultPattern).toBe(pattern);
    expect(res.method).toBe("sutta_uid");
    expect(res.mlDocs.length).toBe(2);
    expect(res.segsMatched).toBe(2);
    var [ mld0, mld1 ] = res.mlDocs;

    // Soma
    expect(mld0.bilaraPaths[1]).toMatch(/thig1.1.*soma/);
    expect(mld0.score).toBe(0);
    let segs0 = mld0.segments();
    expect(segs0[0].en).toMatch(/Sleep with ease, Elder,/);

    // Sujato
    expect(mld1.score).toBe(0);
    expect(mld1.bilaraPaths[1]).toMatch(/thig1.1.*sujato/);
    let segs1 = mld1.segments();
    expect(segs1[0].en).toMatch(/Sleep softly, little nun,/);
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
    expect(data.resultPattern).toBe(pattern);
    expect(data.method).toBe("sutta_uid");
    expect(data.mlDocs.length).toBe(2);
    //data.mlDocs.forEach(mld=>console.log(mld.bilaraPaths));
    var [ mld0, mld1 ] = data.mlDocs;
    expect(mld0.bilaraPaths[1]).toMatch(/thig1.1.*soma/);
    expect(mld1.bilaraPaths[1]).toMatch(/thig1.2.*soma/);
    expect(mld0.score).toBe(0);
    expect(mld1.score).toBe(0);
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
    expect(skr.patternLanguage(pattern)).toBe(lang);

    var data = await skr.slowFind({ pattern, lang, matchHighlight });
    expect(data.resultPattern).toBe("\\babnehmend");
    expect(data.searchLang).toBe("de");
    expect(data.method).toBe("phrase");
    expect(data.mlDocs.length).toBeGreaterThan(7);
    expect(data.mlDocs.length).toBeLessThan(20);
    //data.mlDocs.forEach(mld=>console.log(mld.bilaraPaths));
    var mld0 = data.mlDocs[0];
    expect(mld0.bilaraPaths[1]).toMatch(/de.*sn12.27/);
    expect(mld0.score).toBe(1.026);
  });

  it("find(...) finds Deutsch 'blind'", async () => {
    //bd.logLevel = 'info'
    bd.log("initializing");
    var bilaraData = await bd.initialize();
    bd.log("initializing done");
    var skr = await new Seeker({
      bilaraData,
    }).initialize();
    var pattern = "blind -ml3 -l de";

    var data = await skr.find({ pattern });
    expect(data.resultPattern).toBe("\\bblind");
    expect(data.searchLang).toBe("de");
    expect(data.method).toBe("phrase");
    expect(data.mlDocs.length).toBeGreaterThan(31);
    expect(data.mlDocs.length).toBeLessThan(50);
    var mld0 = data.mlDocs[0];
    expect(mld0.bilaraPaths[0]).toMatch(/ud6.4/);
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
    expect(data.resultPattern).toBe("\\brat");
    expect(data.searchLang).toBe("de");
    expect(data.method).toBe("phrase");
    expect(data.mlDocs.length).toBeGreaterThan(36);
    expect(data.mlDocs.length).toBeLessThan(60);
    var mld0 = data.mlDocs[0];
    expect(mld0.bilaraPaths[0]).toMatch(/mn110_root/);
    expect(mld0.bilaraPaths[1]).toMatch(/mn110_translation/);
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
    expect(data.searchLang).toBe("de");
    expect(data.method).toBe("sutta_uid");
    expect(data.mlDocs.length).toBe(1);
    var mld0 = data.mlDocs[0];
    expect(mld0.bilaraPaths[0]).toMatch(/thig3.8/);
    expect(mld0.score).toBe(0);
    expect(mld0.segments().length).toBe(18);
    expect(data.resultPattern).toBe("thig3.8");
    expect(mld0.author_uid).toBe("sabbamitta");
  });

  it("find(...) finds 'king pacetana'", async () => {
    var bilaraData = await bd.initialize();
    var skr = await new Seeker({
      bilaraData,
    }).initialize();
    var pattern = "king pacetana";
    skr.clearMemo('find');
    skr.clearMemo('grep');

    var data = await skr.find({ pattern });
    expect(data.searchLang).toBe("en");
    expect(data.method).toBe("phrase");
    expect(data.mlDocs.length).toBe(1);
    var mld0 = data.mlDocs[0];
    expect(mld0.bilaraPaths[0]).toMatch(/an3.15/);
    expect(mld0.score).toBe(3.065);
    expect(data.resultPattern).toBe("\\bking\\spacetana");
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
    expect(res.bilaraPaths.length).toBe(2);
    let mld0 = res.mlDocs[0];
    expect(mld0.author_uid).toBe("sabbamitta");
    expect(mld0.langSegs).toEqual({ pli: 51, de: 45 });
    expect(res.lang).toBe("de");
    expect(mld0.sutta_uid).toBe("dn7");
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
    expect(res.lang).toBe("en");
    expect(res.bilaraPaths).toEqual([
      "root/pli/ms/sutta/kn/iti/vagga5/iti42_root-pli-ms.json",
      `${en_suj}kn/iti/vagga5/iti42_translation-en-sujato.json`,
      "root/pli/ms/sutta/dn/dn26_root-pli-ms.json",
      "translation/en/sujato/sutta/dn/dn26_translation-en-sujato.json",
      "root/pli/ms/sutta/an/an2/an2.1-10_root-pli-ms.json",
      "translation/en/sujato/sutta/an/an2/an2.1-10_translation-en-sujato.json",
    ]);
    let [mld0, mld1] = res.mlDocs;
    expect(mld0.author_uid).toBe("sujato");
    expect(mld0.suid).toBe("iti42");
    expect(mld1.author_uid).toBe("sujato");
    expect(mld1.suid).toBe("an2.1-10");
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
    expect(res.lang).toBe("en");
    expect(res.mlDocs.length).toBe(maxDoc);
    expect(res.bilaraPaths.slice(0, 6)).toEqual([
      "root/pli/ms/sutta/mn/mn146_root-pli-ms.json",
      "translation/en/sujato/sutta/mn/mn146_translation-en-sujato.json",
      "root/pli/ms/sutta/mn/mn68_root-pli-ms.json",
      "translation/en/sujato/sutta/mn/mn68_translation-en-sujato.json",
      "root/pli/ms/sutta/mn/mn21_root-pli-ms.json",
      "translation/en/sujato/sutta/mn/mn21_translation-en-sujato.json",
    ]);
    let [mld0] = res.mlDocs;
    expect(mld0.suid).toBe("mn146");
    expect(mld0.author_uid).toBe("sujato");
    expect(res.mlDocs.length).toBe(maxDoc);
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
    expect(res.lang).toBe("en");
    expect(res.bilaraPaths.slice(0, 6)).toEqual([
      "root/pli/ms/sutta/kn/snp/vagga1/snp1.8_root-pli-ms.json",
      "translation/en/sujato/sutta/kn/snp/vagga1/snp1.8_translation-en-sujato.json",
      //'root/pli/ms/sutta/kn/kp/kp9_root-pli-ms.json',
      //'translation/en/sujato/sutta/kn/kp/kp9_translation-en-sujato.json',
    ]);
    expect(res.mlDocs.length).toBe(1);
    let [mld0] = res.mlDocs;
    expect(mld0.suid).toBe("snp1.8");
    expect(mld0.author_uid).toBe("sujato");
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
    expect(res.lang).toBe("en");
    expect(res.mlDocs.length).toBe(maxDoc);
    expect(res.bilaraPaths.slice(0, 2)).toEqual([
      "root/pli/ms/vinaya/pli-tv-kd/pli-tv-kd20_root-pli-ms.json",
      "translation/en/brahmali/vinaya/pli-tv-kd/pli-tv-kd20_translation-en-brahmali.json",
    ]);
    let [mld0] = res.mlDocs;
    expect(mld0.suid).toBe("pli-tv-kd20");
    expect(mld0.author_uid).toBe("brahmali");
    expect(res.mlDocs.length).toBe(maxDoc);
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
    expect(eCaught.message).toMatch(/invalid category:badcategory/);
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
    expect(ex).properties({
      suidRef: pattern,
    });
  });

  it("find(...) handles an1.1-10/jpn", async () => {
    var skr = await new Seeker().initialize();
    var pattern = "an4.182/jpn";
    var ex = undefined;
    var res = await skr.find({ pattern, matchHighlight: false });
    expect(res).properties({
      pattern,
      suttaRefs: ["an4.182/jpn"],
    });
  });

  it("find(...) => thig1.1", async () => {
    let bilaraData = new BilaraData();
    let skr = await new Seeker({
      bilaraData,
      logger: bilaraData,
    }).initialize();
    let res = await skr.find({
      pattern: "thig1.1",
    });
    expect(res.method).toBe("sutta_uid");
    expect(res.bilaraPaths.length).toBe(2);
    let mld0 = res.mlDocs[0];
    expect(mld0.author_uid).toBe("sujato");
    expect(mld0.langSegs).toEqual({ pli: 9, en: 9 });
    expect(res.lang).toBe("en");
    expect(mld0.sutta_uid).toBe("thig1.1");
  });

  it("find(...) finds mind with greed", async () => {
    var skr = await new Seeker().initialize();

    var res = await skr.find({
      pattern: "mind with greed",
      matchHighlight: false,
    });
    expect(res.method).toBe("phrase");
    expect(
      res.mlDocs.map((mld) => mld.suid).sort()
    ).toEqual([
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
    ].sort());
    let [mld0] = res.mlDocs;
    let segs0 = mld0.segments();
    expect(segs0[0]).toEqual({
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
    expect(res.method).toBe("sutta_uid");
    expect(res.mlDocs.length).toBeGreaterThan(0);
    let mld0 = res.mlDocs[0];
    expect(mld0.author_uid).toBe("sujato");
    expect(res.bilaraPaths).toEqual([
      "root/pli/ms/sutta/kn/thig/thig1.1_root-pli-ms.json",
      "translation/en/sujato/sutta/kn/thig/thig1.1_translation-en-sujato.json",
      //"translation/en/soma/sutta/kn/thig/thig1.1_translation-en-soma.json",
    ]);
    let segments = mld0.segments();
    expect(segments[4].en).toMatch(/Sleep softly, little nun,/);
    expect(mld0.langSegs).toEqual({ pli: 9, en: 9 });
    expect(res.lang).toBe("en");
    expect(mld0.sutta_uid).toBe("thig1.1");
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
    expect(res.method).toBe("sutta_uid");
    expect(res.mlDocs.length).toBeGreaterThan(0);
    let mld0 = res.mlDocs[0];
    expect(mld0.author_uid).toBe("soma");
    let segments = mld0.segments();
    expect(segments[4].en).toMatch(/“Sleep with ease, Elder,/);
    expect(mld0.langSegs).toEqual({ pli: 9, en: 9 });
    expect(res.lang).toBe("en");
    expect(mld0.sutta_uid).toBe("thig1.1");
    expect(res.bilaraPaths.length).toBe(2);
  });

});
