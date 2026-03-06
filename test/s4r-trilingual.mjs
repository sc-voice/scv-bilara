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
const my_my = `translation/my/my-team/sutta/`;
const en_dav = `translation/en/davis/sutta/`;
const pli_ms = `root/pli/ms/sutta/`;

const SLEEP_SOMA = "sleep with ease";

describe("Seeker - Trilingual", function () {
  let bd = new BilaraData();

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
    expect(res.suttaRefs).toEqual([
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
    expect(res.suttaRefs).toEqual([
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
    expect(res.method).toEqual("sutta_uid");
    expect(res.mlDocs.length).toBeGreaterThan(0);
    let mld0 = res.mlDocs[0];
    expect(mld0.author_uid).toEqual("sabbamitta");
    expect(res.bilaraPaths.length).toEqual(2);
    let segments = mld0.segments();
    expect(segments[4].de).toMatch(/Und der Ehrwürdige Nāgasena/);
    expect(mld0.langSegs).toEqual({ pli: 108, de: 99 });
    expect(res.lang).toEqual("de");
    expect(mld0.sutta_uid).toEqual("mil3.1.1");
  });

  it("phraseSearch(...) finds Autorität (de)", async () => {
    var lang = "de";
    var maxResults = 10;
    var maxDoc = 3;
    var skr = await new Seeker({ maxResults, maxDoc, }).initialize();
    var pattern = `Autorität`;

    skr.logLevel = 'info'; // TODO
    var data = await skr.phraseSearch({ pattern, lang, });
    expect(skr.languages).toEqual(["pli", "en"]);
    let lines = data.lines;
    expect(data).properties({
      method: "phrase",
      lang,
      pattern: "\\bAutorität",
    });
    expect(lines.slice(0,5)).toEqual([
      `${de_sab}an/an4/an4.193_translation-de-sabbamitta.json:4`,
      `${de_sab}an/an3/an3.66_translation-de-sabbamitta.json:4`,
      `${de_sab}an/an3/an3.65_translation-de-sabbamitta.json:4`,
      `${de_sab}an/an5/an5.133_translation-de-sabbamitta.json:3`,
      `${de_sab}mn/mn76_translation-de-sabbamitta.json:2`,
    ]);
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
    expect(res.method).toEqual("phrase");
    expect(res.mlDocs.length).toBeGreaterThan(0);
    let mld0 = res.mlDocs[0];
    expect(mld0.author_uid).toEqual("sujato");
    let segments = mld0.segments();
    expect(segments[4]).properties({
      ref: "For desire is the \u001b[38;5;121mroot of suffering\u001b[0m.’” ",
      en: "For desire is the \u001b[38;5;121mroot of suffering\u001b[0m.’” ",
      pli: "Chando hi mūlaṁ dukkhassā’”ti. ",
    });
    expect(mld0.langSegs).toEqual({ pli: 55, ref: 54});
    expect(mld0.sutta_uid).toEqual("sn42.11");
    expect(res.bilaraPaths.length).toBeGreaterThan(13);
    expect(res.bilaraPaths.length).toBeLessThan(30);
    expect(res.lang).toEqual("en");
  });

  it("find(...) trilingual -dl de", async()=>{
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
    expect(res.method).toEqual("phrase");
    expect(res.mlDocs.length).toBeGreaterThan(0);
    let mld0 = res.mlDocs[0];
    expect(mld0.author_uid).toEqual("sabbamitta");
    let segments = mld0.segments();
    let seg4 = segments[4];
    expect(seg4.pli).toMatch(/Chando hi mūlaṁ dukkhassā/i);
    expect(seg4.ref).toMatch(/root of suffering/i);
    expect(seg4.de).toMatch(/wurzel des leidens/i);
    expect(mld0.langSegs).toEqual({ pli: 55, de: 54, ref: 54});
    expect(mld0.sutta_uid).toEqual("sn42.11");
    expect(res.bilaraPaths.length).toBeGreaterThan(18);
    expect(res.bilaraPaths.length).toBeLessThan(30);
    expect(res.lang).toEqual("de");
    expect(res.searchLang).toEqual("en");
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
    expect(res.method).toEqual("sutta_uid");
    expect(res.mlDocs.length).toBeGreaterThan(0);
    let mld0 = res.mlDocs[0];
    expect(mld0.author_uid).toEqual("soma");
    let segments = mld0.segments();
    expect(segments[4]).properties({
      en: "“Sleep with ease, Elder, ",
      ref: "Sleep softly, little nun, ",
      pli: "“Sukhaṁ supāhi therike, ",
    });
    expect(mld0.langSegs).toEqual({ pli: 9, en: 9, ref: 9});
    expect(res.lang).toEqual("en");
    expect(mld0.sutta_uid).toEqual("thig1.1");
    expect(res.bilaraPaths.length).toEqual(3);
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
    expect(res.method).toEqual("sutta_uid");
    expect(res.mlDocs.length).toBeGreaterThan(0);
    let mld0 = res.mlDocs[0];
    expect(mld0.author_uid).toEqual("sujato");
    let segments = mld0.segments();
    expect(segments[4]).properties({
      en: "Sleep softly, little nun, ",
      ref: "“Sleep with ease, Elder, ",
      pli: "“Sukhaṁ supāhi therike, ",
    });
    expect(mld0.langSegs).toEqual({ pli: 9, en: 9, ref: 9});
    expect(res.lang).toEqual("en");
    expect(mld0.sutta_uid).toEqual("thig1.1");
    expect(res.bilaraPaths.length).toEqual(3);
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
    expect(res.method).toEqual("sutta_uid");
    expect(res.mlDocs.length).toBeGreaterThan(0);
    let mld0 = res.mlDocs[0];
    expect(mld0.author_uid).toEqual("sujato");
    let segments = mld0.segments();
    expect(segments[4]).properties({
      en: "Sleep softly, little nun, ",
      ref: "Schlafe sanft, kleine Nonne, ",
      pli: "“Sukhaṁ supāhi therike, ",
    });
    expect(mld0.langSegs).toEqual({ pli: 9, en: 9, ref: 9});
    expect(res.lang).toEqual("en");
    expect(mld0.sutta_uid).toEqual("thig1.1");
    expect(res.bilaraPaths.length).toEqual(3);
  });

  it("find(...) sn1.2 docRefArgs en/pt", async () => {
    let bilaraData = new BilaraData();
    let skr = await new Seeker({
      bilaraData,
      logger: bilaraData,
    }).initialize();
    let docRefArgs = [
      '-dl en',
      '-da sujato',
      '-rl pt',
      '-ra laera-quaresma',
    ].join(' ');
    let findArgs = skr.findArgs([{
        pattern: `sn1.2 ${docRefArgs}`,
    }]);
    expect(findArgs).properties({
      lang: 'en',
      author: 'sujato',
      docLang: 'en',
      docAuthor: 'sujato',
      refLang: 'pt',
      refAuthor: 'laera-quaresma',
      trilingual: true,
    });
    let res = await skr.slowFind(findArgs);
    expect(res.method).toEqual("sutta_uid");
    expect(res.mlDocs.length).toBeGreaterThan(0);
    let mld0 = res.mlDocs[0];
    expect(mld0.author_uid).toEqual("sujato");
    let segments = mld0.segments();
    expect(segments[3]).properties({
      pli: 'Sāvatthinidānaṁ. ',
      en: 'At Sāvatthī. ',
      ref: 'Em Savatthi. ',
    });
    expect(mld0.langSegs).toEqual({ pli: 13, en: 13, ref: 13});
    expect(mld0.sutta_uid).toEqual("sn1.2");
    expect(res.bilaraPaths.length).toEqual(3);
  });

  it("find(...) sn1.2 docRefArgs pt/en", async () => {
    let bilaraData = new BilaraData();
    let skr = await new Seeker({
      bilaraData,
      logger: bilaraData,
    }).initialize();
    let docRefArgs = [
      '-dl pt',
      '-da laera-quaresma',
      '-rl en',
      '-ra sujato',
    ].join(' ');
    let findArgs = skr.findArgs([{
        pattern: `sn1.2 ${docRefArgs}`,
    }]);
    expect(findArgs).properties({
      lang: 'pt',
      author: 'laera-quaresma',
      docLang: 'pt',
      docAuthor: 'laera-quaresma',
      refLang: 'en',
      refAuthor: 'sujato',
      trilingual: true,
    });
    let res = await skr.slowFind(findArgs);
    expect(res.method).toEqual("sutta_uid");
    expect(res.mlDocs.length).toBeGreaterThan(0);
    let mld0 = res.mlDocs[0];
    expect(mld0.author_uid).toEqual("laera-quaresma");
    let segments = mld0.segments();
    expect(segments[3]).properties({
      pli: 'Sāvatthinidānaṁ. ',
      ref: 'At Sāvatthī. ',
      pt: 'Em Savatthi. ',
    });
    expect(mld0.langSegs).toEqual({ pli: 13, pt: 13, ref: 13});
    expect(mld0.sutta_uid).toEqual("sn1.2");
    expect(res.bilaraPaths.length).toEqual(3);
  });

  it("find(...) sn1.2 docRefArgs en/de", async () => {
    let bilaraData = new BilaraData();
    let skr = await new Seeker({
      bilaraData,
      logger: bilaraData,
    }).initialize();
    let docRefArgs = [
      //'-dl pt',
      //'-da laera-quaresma',
      '-rl de',
      //'-ra sujato',
    ].join(' ');
    let findArgs = skr.findArgs([{
        pattern: `sn1.2 ${docRefArgs}`,
    }]);
    expect(findArgs).properties({
      lang: 'en',
      author: 'sujato',
      docLang: 'en',
      docAuthor: 'sujato',
      refLang: 'de',
      refAuthor: 'sabbamitta',
      trilingual: true,
    });
    let res = await skr.slowFind(findArgs);
    expect(res.method).toEqual("sutta_uid");
    expect(res.mlDocs.length).toBeGreaterThan(0);
    let mld0 = res.mlDocs[0];
    expect(mld0.author_uid).toEqual("sujato");
    let segments = mld0.segments();
    expect(segments[3]).properties({
      pli: 'Sāvatthinidānaṁ. ',
      ref: 'In Sāvatthī. ',
      en: 'At Sāvatthī. ',
    });
    expect(mld0.langSegs).toEqual({ pli: 13, en: 13, ref: 13});
    expect(mld0.sutta_uid).toEqual("sn1.2");
    expect(res.bilaraPaths.length).toEqual(3);
  });

  it("find() SLEEP_SOMA", async () => {
    let bilaraData = new BilaraData();
    let skr = await new Seeker({ bilaraData, logger: bilaraData, })
      .initialize();
    let lang = 'en';
    let docLang = 'en';
    let refLang = 'en';
    let docAuthor = 'soma';
    let refAuthor = 'sujato';
    let pattern = "sleep with ease";
    let findArgs = skr.findArgs([{
      lang: 'en',
      pattern,
      docLang,
      docAuthor,
      refLang,
      refAuthor,
      minLang:1,
      trilingual: true,
    }]);
    expect(findArgs.author).toEqual('soma');
    expect(findArgs.minLang).toEqual(1);
    expect(findArgs.trilingual).toEqual(true);
    let res = await skr.slowFind(findArgs);
    expect(res.trilingual).toEqual(true);

    let mld0 = res.mlDocs[0];
    expect(res.mlDocs.length).toEqual(1);
    expect(res.method).toEqual('phrase');
    expect(res.bilaraPaths.length).toEqual(3);
  });

  it("find() mil2 Pali only", async () => {
    const msg = 'test.seeker.find()';
    const dbg = 0;
    let bilaraData = new BilaraData();
    let skr = await new Seeker({ bilaraData, logger: bilaraData, })
      .initialize();
    let pattern = 'mil2';
    let findArgs = skr.findArgs([{
      pattern,
      minLang:1,
      trilingual: true,
    }]);
    let res = await skr.slowFind(findArgs);

    let mld0 = res.mlDocs[0];
    expect(res.mlDocs.length).toEqual(1);
    expect(res.method).toEqual('sutta_uid');
    expect(res.bilaraPaths.length).toEqual(1);
    let scid1_1 = `${pattern}:1.1`;
    let seg1_1 = mld0.segMap[scid1_1];

    // Must not have en
    expect(seg1_1).toEqual({
      scid: scid1_1,
      pli: '<b>Pubbayogo</b>ti tesaṁ pubbakammaṁ. ',
      matched: true,
    });
  });

  it("findArgs(...) -dl en sn3.3/pt", async() => {
    let bilaraData = new BilaraData();
    let lang = 'de';
    let pattern = `-dl ${lang} sn3.3/pt`;
    let skr = await new Seeker({
      bilaraData,
      logger: bilaraData,
      trilingual: true,
    }).initialize();
    let findArgs = skr.findArgs([{ pattern, lang, }]);
    expect(findArgs).properties({
      docLang: 'pt',
      docAuthor: 'laera-quaresma',
      refLang: 'en',
      refAuthor: 'sujato',
      trilingual: true,
    });
  });

  it("findArgs(...) -dl pt thig1.1/en/soma", async() => {
    let bilaraData = new BilaraData();
    let lang = 'pt';
    let pattern = `-dl ${lang} thig1.1/en/soma`;
    let skr = await new Seeker({
      bilaraData,
      logger: bilaraData,
      trilingual: true,
    }).initialize();
    let findArgs = skr.findArgs([{ pattern, lang, }]);
    expect(findArgs).properties({
      docLang: 'en',
      docAuthor: 'soma',
      refLang: 'en',
      refAuthor: 'sujato',
      trilingual: true,
    });
  });

  it("findArgs(...) -l de root of suffering", async() => {
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
    expect(findArgs).properties({
      docLang: 'de',
      docAuthor: 'sabbamitta',
      refLang: 'en',
      refAuthor: 'soma',
    });
  });

  it("findArgs(...) -l de -ra soma schlafe sanft", async () => {
    let bilaraData = new BilaraData();
    let pattern = "-l de -ra soma schlafe sanft";
    let skr = await new Seeker({
      bilaraData,
    }).initialize();

    expect(skr.findArgs([{ pattern, lang:"pt"}]))
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

  it("findArgs(...) docRefArgs en/pt", async () => {
    let bilaraData = new BilaraData();
    let docRefArgs = [
      '-dl en',
      '-da sujato',
      '-rl pt',
      '-ra laera-quaresma',
    ].join(' ');
    let pattern = `sn1.2 ${docRefArgs}`;
    let skr = await new Seeker({
      bilaraData,
    }).initialize();

    expect(skr.findArgs([{ pattern, }]))
      .properties({
        author: "sujato",
        searchLang:'en',
        refAuthor: 'laera-quaresma',
        refLang: 'pt',
        docAuthor: 'sujato',
        docLang: 'en',
        lang: 'en',
        langAuthor: 'sujato',
      });
  });

  it("findArgs(...) docRefArgs en/pt/de", async () => {
    let bilaraData = new BilaraData();
    let docRefArgs = [
      '-dl en',
      '-da sujato',
      '-rl pt',
      '-ra laera-quaresma',
    ].join(' ');
    let pattern = `sn1.2 ${docRefArgs}`;
    let skr = await new Seeker({
      bilaraData,
    }).initialize();

    expect(skr.findArgs([{ pattern, lang:'de' }]))
      .properties({
        author: "sujato",
        searchLang:'en',
        refAuthor: 'laera-quaresma',
        refLang: 'pt',
        docAuthor: 'sujato',
        docLang: 'en',
        lang: 'en',
        langAuthor: 'sujato',
      });
  });

  it("findArgs(...) docRefArgs thig1.1/en/soma", async () => {
    let bilaraData = new BilaraData();
    let suid = 'thig1.1';
    let docRefArgs = [
      '-dl en',
      '-da sujato',
      '-rl pt',
      '-ra laera-quaresma',
    ].join(' ');
    let pattern = `${suid}/en/soma ${docRefArgs}`;
    let skr = await new Seeker({
      bilaraData,
    }).initialize();
    let res = skr.findArgs([{ pattern, lang:'de' }]);

    expect(res).properties({
      author: "soma",
      searchLang:'en',
      searchAuthor:'soma',
      refAuthor: 'laera-quaresma',
      refLang: 'pt',
      docAuthor: 'soma',
      docLang: 'en',
      lang: 'en',
      langAuthor: 'sujato',
    });
  });

  it("find() untranslated sutta", async () => {
    let bilaraData = new BilaraData();
    let skr = await new Seeker({ bilaraData, logger: bilaraData, })
      .initialize();
    let findArgs = skr.findArgs([{
        pattern: `cnd1/pt -ra sujato -ml1`, // trilingual
    }]);
    expect(findArgs.minLang).equal(1);
    expect(findArgs.docLang).equal('pt');
    expect(findArgs.docAuthor).equal('laera-quaresma');
    expect(findArgs.trilingual).equal(true);
    let res = await skr.slowFind(findArgs);
    expect(res.trilingual).equal(true);

    // There is no PT translation of thig1.1
    let mld0 = res.mlDocs[0];
    expect(mld0?.langSegs).toEqual( { pli:235 });
    let [ seg0 ] = mld0.segments();
    expect(seg0).toEqual( {
      scid: 'cnd1:0.1',
      pli: 'Cūḷaniddesa ',
      // no ref
      // no pt
      matched: true,
    });
  });

  it("find() cnd1/pli/ms", async () => {
    let bilaraData = new BilaraData();
    let skr = await new Seeker({ bilaraData, logger: bilaraData, })
      .initialize();
    let findArgs = skr.findArgs([{
        pattern: `cnd1/pli/ms -dl de -ra sujato -ml1`, // trilingual
    }]);
    expect(findArgs).properties({
      minLang: 1,
      docLang: "pli",
      docAuthor: "ms",
      trilingual: true,
    });
    let res = await skr.slowFind(findArgs);
    expect(res.trilingual).equal(true);

    let mld0 = res.mlDocs[0];
    expect(mld0?.langSegs).toEqual({ pli:235 });
    let [ seg0 ] = mld0.segments();
    expect(seg0).toEqual({
      scid: 'cnd1:0.1',
      pli: 'Cūḷaniddesa ',
      // no ref
      // no pt
      matched: true,
    });
  });
  it("findArgs() SLEEP/en/soma/en/sujato", async () => {
    let bilaraData = await bd.initialize();
    let pat = SLEEP_SOMA;
    let lang = 'en';
    let docLang = lang;
    let docAuthor = "soma";
    let refLang = lang;
    let refAuthor = "sujato";
    let author = docAuthor;
    let searchLang = lang;
    let searchAuthor = docAuthor;
    let langAuthor = docAuthor;
    let pattern = [
      pat,
      `-dl ${docLang}`,
      `-da ${docAuthor}`,
      `-rl ${refLang}`,
      `-ra ${refAuthor}`,
      '-ml1',
    ].join(' ');
    let skr = await new Seeker({ bilaraData, }).initialize();
    let res = skr.findArgs([{ pattern, lang:docLang }]);

    expect(res).properties({
      author,
      searchLang,
      searchAuthor,
      refAuthor,
      refLang,
      docAuthor,
      docLang,
      lang,
      langAuthor,
      trilingual: true,
    });
  });
  it("findArgs() SLEEP/en/sujato/en/soma", async () => {
    let bilaraData = await bd.initialize();
    let pat = SLEEP_SOMA;
    let lang = 'en'
    let docLang = lang;
    let docAuthor = "sujato";
    let refLang = lang;
    let refAuthor = "soma";
    let author = docAuthor;
    let searchLang = lang;
    let searchAuthor = docAuthor;
    let langAuthor = docAuthor;
    let pattern = [
      pat,
      `-dl ${docLang}`,
      `-da ${docAuthor}`,
      `-rl ${refLang}`,
      `-ra ${refAuthor}`,
    ].join(' ');
    let skr = await new Seeker({ bilaraData, }).initialize();
    let res = skr.findArgs([{ pattern, lang:docLang }]);

    expect(res).properties({
      author,
      searchLang,
      searchAuthor,
      refAuthor,
      refLang,
      docAuthor,
      docLang,
      lang,
      langAuthor,
      trilingual: true
    });
  });
  it("find(...) sutta list", async () => {
    let msg = 'test.seeker@706';
    var maxDoc = 2;
    let skr = await new Seeker({maxDoc}).initialize();
    let dbg = 0;
    let suids = ['thig1.1', 'thig1.2', 'thig1.3'];
    let patAuthor = 'soma';
    let patLang = 'en';
    let suttas = suids.map(suid=>`${suid}/${patLang}/${patAuthor}`);
    let pattern = `-dl en -da soma ` + suids.join(', ');

    var res = await skr.find({
      pattern,
      matchHighlight: false,
    });
    expect(res.method).equal("sutta_uid");
    let { mlDocs, suttaRefs } = res;
    dbg && console.log(msg, '[1]mlDocs[0]', mlDocs[0]);
    dbg && console.log(msg, '[2]suttaRefs', suttaRefs);
    dbg && console.log(msg, '[3]pattern', pattern);

    expect(suttaRefs).toEqual(suids);
    expect( mlDocs.map((mld) => mld.score)).toEqual( [0, 0, 0]);
    expect(
      mlDocs.map(mld=>{
        let { sutta_uid, lang, author_uid } = mld;
        return [sutta_uid,lang,author_uid].join('/');
      })).toEqual(suttas);
    expect(mlDocs[0].segMap['thig1.1:0.3'].en)
    .equal('Verses of a Certain Unknown Elder ');
    expect(mlDocs[1].segMap['thig1.2:0.3'].en)
    .equal('Verses of the Elder Muttā ');
    expect(mlDocs[2].segMap['thig1.3:0.3'].en)
    .equal('Verses of the Elder Puṇṇā ');
  });
  it("find(...) tha-ap34", async () => {
    let msg = 'test.seeker@2799';
    var maxDoc = 2;
    let skr = await new Seeker({maxDoc}).initialize();
    let dbg = 0;
    let suid = 'tha-ap34';
    let docLang = "en";
    let docAuthor = "sujato";
    let minLang = 1;
    let pattern = [ 
      suid, 
      '-dl', docLang, 
      '-da', docAuthor, 
      '-ml', minLang, 
    ].join(' ');

    var res = await skr.find({
      pattern,
      matchHighlight: false,
    });
    expect(res).properties({
      method: "sutta_uid",
      trilingual: true,
    });
    let { mlDocs, suttaRefs } = res;
    let segs = mlDocs[0].segments();

    console.log(msg, segs[segs.length-1]);
  });

  it("slowFind() awakened after", async () => {
    let msg = 'test.seeker@2825';
    var maxDoc = 2;
    let skr = await new Seeker({maxDoc}).initialize();
    skr.clearMemo('grep');
    skr.clearMemo('grep');
    let dbg = 0;
    let userPat = 'awakened after';
    let docLang = "en";
    let docAuthor = "sujato";
    let minLang = 1;
    let pattern = [ 
      userPat, 
      '-dl', docLang, 
      '-da', docAuthor, 
      '-ml', minLang, 
    ].join(' ');
    let findArgs = skr.findArgs([{
      pattern,
      matchHighlight: false,
    }]);
    var res = await skr.slowFind(findArgs);

    expect(res).properties({
      method: "phrase",
      trilingual: true,
    });
    let { mlDocs, suttaRefs } = res;
    expect(suttaRefs.sort()).toEqual([
      'sn16.5/en/sujato',
      'sn8.9/en/sujato',
      'thag15.1/en/sujato',
      'thag21.1/en/sujato',
    ]);
  });

  it("find(...) => thig1.1 -ra soma -da sujato", async () => {
    let bilaraData = new BilaraData();
    let skr = await new Seeker({
      bilaraData,
      logger: bilaraData,
    }).initialize();
    let res = await skr.find({
      pattern: "thig1.1 -ra soma -da sujato",
    });
    expect(res).properties({
      method: "sutta_uid",
      trilingual: true,
    });
    expect(res.bilaraPaths.length).toEqual(3);
    let mld0 = res.mlDocs[0];
    expect(mld0).properties({
      suid: 'thig1.1',
      sutta_uid: 'thig1.1',
      refAuthor: 'soma',
      docAuthor: 'sujato',
      refLang: 'en',
      docLang: 'en',
    });
    expect(mld0.author_uid).toEqual("sujato");
    expect(mld0.langSegs).toEqual({ pli: 9, en: 9, ref: 9 });
    expect(res.lang).toEqual("en");
    expect(mld0.sutta_uid).toEqual("thig1.1");
    let segments = mld0.segments();
    expect(segments[4]).properties({
      ref: "“Sleep with ease, Elder, ",
      en: "Sleep softly, little nun, ",
      pli: "“Sukhaṁ supāhi therike, ",
    });
  });
});
