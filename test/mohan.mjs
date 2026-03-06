import { describe, it, expect, beforeAll } from '@sc-voice/vitest';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';
import {
    FuzzyWordSet,
    Pali,
    SegDoc,
    MLDoc,
    BilaraData,
} from '../index.js';
import { BilaraPath } from 'scv-esm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var logLevel = false;
const BILARA_PATH = path.join(__dirname, '../local/ebt-data');
var {
    htmlPath,
    variantPath,
    referencePath,
    commentPath,
    translationPath,
    rootPath,
} = BilaraPath;

var bilaraPaths_mn8_fr = [
    rootPath('mn/mn8'),
    translationPath('mn/mn8','fr','wijayaratna'),
];

var bilaraPaths_mn8_en = [
    rootPath('mn/mn8'),
    translationPath('mn/mn8','en','sujato'),
];

describe.sequential("mohan", { timeout: 5*1000 }, function() {
  it("trilingual-mn8-fr-ref", { timeout: 5*1000 }, async()=>{
    const msg = 'Tm3n.trilingual-mn8-fr-ref';
    let dbg = 0;
    var bd = new BilaraData({name:'ebt-data'});
    await bd.initialize();
    let refLang = 'fr';
    let refAuthor = 'wijayaratna';
    let mld = await bd.trilingualDoc("mn8/en/sujato",
      { refLang, refAuthor, });
    expect(mld.title).toBe('Middle Discourses 8\nSelf-Effacement');
    let testScid = 'mn8:1.1';
    let testSeg = mld.segMap[testScid];
    dbg && console.log(msg, 'testSeg', testSeg);
    expect(testSeg.scid).toBe(testScid);
    expect(testSeg.pli).toMatch(/Evaṁ me sutaṁ/);
    expect(testSeg.en).toMatch(/So I have heard/);
    expect(mld.suid).toBe('mn8');
    expect(mld.lang).toBe('en');
    expect(mld.sutta_uid).toBe('mn8');
    expect(mld.type).toBe('translation');
    expect(mld.docAuthor).toBe('sujato');
    expect(mld.docFooter).toMatch(/suttacentral.net/);
    expect(mld.docAuthorName).toMatch(/Bhikkhu Sujato/);
    expect(mld.refAuthor).toBe(refAuthor);
    expect(mld.refFooter).toMatch(/Môhan.*Ismet/);
    expect(mld.refAuthorName).toMatch(/Môhan Wijayaratna/);
  });
  it("trilingual-mn8-fr-doc", { timeout: 5*1000 }, async()=>{
    const msg = 'Tm3n.trilingual-mn8-fr-doc';
    let dbg = 0;
    var bd = new BilaraData({name:'ebt-data'});
    await bd.initialize();
    let refLang = 'en';
    let refAuthor = 'sujato';
    let mld = await bd.trilingualDoc("mn8/fr/wijayaratna",
      { refLang, refAuthor, });
    expect(mld.title).toBe('Majjhima Nikāya 8\n8. Le déracinement');
    let testScid = 'mn8:1.2';
    let testSeg = mld.segMap[testScid];
    dbg && console.log(msg, 'testSeg', testSeg);
    expect(testSeg.scid).toBe(testScid);
    expect(testSeg.pli).toMatch(/ekaṁ samayaṁ bhagavā/);
    expect(testSeg.ref).toMatch(/At one time the Buddha/);
    expect(testSeg.fr).toMatch(/>Ainsi ai-je entendu/);
    expect(mld.suid).toBe('mn8');
    expect(mld.lang).toBe('fr');
    expect(mld.sutta_uid).toBe('mn8');
    expect(mld.type).toBe('translation');
    expect(mld.refAuthor).toBe('sujato');
    expect(mld.refFooter).toMatch(/suttacentral.net/);
    expect(mld.refAuthorName).toMatch(/Bhikkhu Sujato/);
    expect(mld.docAuthor).toBe('wijayaratna');
    expect(mld.docFooter).toMatch(/Môhan.*Ismet/);
    expect(mld.docAuthorName).toMatch(/Môhan Wijayaratna/);
  });
});
