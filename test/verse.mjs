import { describe, it, expect } from '@sc-voice/vitest';
import PKG_INDEX from '../index.js';
const { Verse } = PKG_INDEX;

const thag1_2 = [{ // 0
  scid: "thag1.2:0.1",
  en: "Verses of the Senior Monks",
  pli: "Theragāthā",
  de: "de 1",
},{ // 1
  scid: "thag1.2:0.2",
  en: "The Book of the Ones",
  pli: "Ekakanipāta",
  de: "de 2",
},{ // 2
  scid: "thag1.2:0.3",
  en: "Chapter One",
  pli: "Paṭhamavagga",
  de: "de 3",
},{ // 3
  scid: "thag1.2:0.4",
  en: "1.2. Mahākoṭṭhita",
  pli: "1.2. Mahākoṭṭhikattheragāthā",
  de: "de 4",
},{ // 4
  scid: "thag1.2:1.1",
  en: "Calm and quiet,",
  pli: "“Upasanto uparato,",
  de: "de 5",
},{ // 5
  scid: "thag1.2:1.2",
  en: "thoughtful in counsel, and stable—",
  pli: "mantabhāṇī anuddhato;",
  de: "de 6",
},{ // 6
  scid: "thag1.2:1.3",
  en: "he shakes off bad qualities",
  pli: "Dhunāti pāpake dhamme,",
  de: "de 7",
},{ // 7
  scid: "thag1.2:1.4",
  en: "as the wind shakes leaves off a tree.",
  pli: "dumapattaṁva māluto”ti.",
  de: "de 8",
},{ // 8
  scid: "thag1.2:1.5",
  en: "It was thus that this verse was recited "+
    "by the senior venerable Mahākoṭṭhita.",
  pli: "Itthaṁ sudaṁ āyasmā mahākoṭṭhiko thero gāthaṁ abhāsitthāti.",
  de: "de 9",
}];

describe("verse", function() {
  it("default ctor", () => {
    var verse = new Verse();
    expect(verse).toMatchObject({
      lang: 'en',
      linkBase: 'https://suttacentral.net',
      linebreak: '<br/>',
    });
  });

  it("custom ctor", () => {
    let linkBase = 'https://staging.suttacentral.net';
    let linebreak = '  \n';
    let lang = 'de';
    let searchLang = 'en';
    let showEn = true;
    let showPli = true;
    let opts = {
      lang,
      linkBase,
      linebreak,
      searchLang,
      showEn,
      showPli,
    };
    var verse = new Verse(opts);
    expect(verse).toMatchObject(opts);
  });

  it("suttacentralLink(...)", () => {
    let linkBase = 'https://test';
    let verse = new Verse({
      linkBase,
    });
    let suid = "thig1.2";
    let scid = suid;
    let linkText = "Thig1.2";
    expect(verse.suttacentralLink(scid))
      .toBe(`[${linkText}](${linkBase}/${scid})`);
    expect(verse.suttacentralLink(scid,'en','sujato'))
      .toBe(`[${linkText}](${linkBase}/${suid}/en/sujato#${scid})`);

    scid = `${suid}:1.5`;
    linkText = "Thig1.2:1.5";
    expect(verse.suttacentralLink(scid))
      .toBe(`[${linkText}](${linkBase}/${suid})`);
    expect(verse.suttacentralLink(scid,'en','sujato'))
      .toBe(`[${linkText}](${linkBase}/${suid}/en/sujato#${scid})`);
  });

  it("versify(...) => English, allMatched", () => {
    let verse = new Verse();
    let linkText = '>[Thag1.2:';
    let linebreak = '<br/>';
    let linkBase = 'https://suttacentral.net/thag1.2';
    let res = verse.versify(thag1_2);
    let text = thag1_2.slice(0,4).map(s=>s.en).join(linebreak);
    expect(res[0]).toBe(`${linkText}0.1](${linkBase}):${linebreak}${text}`);
    text = thag1_2.slice(4).map(s=>s.en).join(linebreak);
    expect(res[1]).toBe(`${linkText}1.1](${linkBase}):${linebreak}${text}`);
    expect(res.length).toBe(2);
  });

  it("versify(...) => English, allMatched (with matched flag)", () => {
    let verse = new Verse();
    let thag = JSON.parse(JSON.stringify(thag1_2));
    thag[7].matched = true;
    let linkText = '>[Thag1.2:';
    let linebreak = '<br/>';
    let linkBase = 'https://suttacentral.net/thag1.2';
    let res = verse.versify(thag);
    let text = thag.slice(4).map(s=>s.en).join(linebreak);
    expect(res[0]).toBe(`${linkText}1.1](${linkBase}):${linebreak}${text}`);
    expect(res.length).toBe(1);
  });

  it("versify(...) => Deutsch, allMatched", () => {
    let lang = 'de';
    let verse = new Verse({lang});
    let linkText = '>[Thag1.2:';
    let linebreak = '<br/>';
    let linkBase = 'https://suttacentral.net/thag1.2';
    let res = verse.versify(thag1_2);
    let text = thag1_2.slice(0,4).map(s=>s[lang]).join(linebreak);
    expect(res[0]).toBe(`${linkText}0.1](${linkBase}):${linebreak}${text}`);
    text = thag1_2.slice(4).map(s=>s[lang]).join(linebreak);
    expect(res[1]).toBe(`${linkText}1.1](${linkBase}):${linebreak}${text}`);
    expect(res.length).toBe(2);
  });

  it("versify(...) => Deutsch, allMatched (with showPli and showEn)", () => {
    let lang = 'de';
    let showPli = true;
    let showEn = true;
    let verse = new Verse({lang, showPli, showEn});
    let thag = JSON.parse(JSON.stringify(thag1_2));
    thag[7].matched = true;
    let linkText = '>[Thag1.2:';
    let linebreak = '<br/>';
    let linkBase = 'https://suttacentral.net/thag1.2';
    let res = verse.versify(thag);

    let text = thag.slice(4).map(s=>s.pli).join(linebreak);
    expect(res[0]).toBe(`${linkText}1.1](${linkBase}):${linebreak}${text}`);

    text = thag.slice(4).map(s=>s.en).join(linebreak);
    expect(res[1]).toBe(
      `${linkText}1.1](${linkBase}/en/sujato#thag1.2:1.1):${linebreak}${text}`);

    text = thag.slice(4).map(s=>s[lang]).join(linebreak);
    expect(res[2]).toBe(`${linkText}1.1](${linkBase}):${linebreak}${text}`);

    expect(res.length).toBe(3);
  });
});
