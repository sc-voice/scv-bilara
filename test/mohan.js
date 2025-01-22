(typeof describe === 'function') && 
describe("mohan", function() {
  const should = require("should");
  const fs = require('fs');
  const path = require('path');
  const tmp = require('tmp');
  const {
      FuzzyWordSet,
      Pali,
      SegDoc,
      MLDoc,
      BilaraData,
  } = require("../index");
  const { BilaraPath } = require("scv-esm");
  this.timeout(5*1000);
  var logLevel = false;
  var bd = new BilaraData();
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

  it("trilingual-mn8-fr-ref", async()=>{
    const msg = 'Tm3n.trilingual-mn8-fr-ref';
    let dbg = 0;
    var bd = new BilaraData({name:'ebt-data'});
    await bd.initialize();
    let refLang = 'fr';
    let refAuthor = 'wijayaratna';
    let mld = await bd.trilingualDoc("mn8/en/sujato", 
      { refLang, refAuthor, });
    should(mld.title).equal('Middle Discourses 8\nSelf-Effacement');
    let testScid = 'mn8:1.1';
    let testSeg = mld.segMap[testScid];
    dbg && console.log(msg, 'testSeg', testSeg);
    should(testSeg.scid).equal(testScid);
    should(testSeg.pli).match(/Evaṁ me sutaṁ/);
    should(testSeg.en).match(/So I have heard/);
    should(mld.suid).equal('mn8');
    should(mld.lang).equal('en');
    should(mld.sutta_uid).equal('mn8');
    should(mld.type).equal('translation');
    should(mld.docAuthor).equal('sujato');
    should(mld.docFooter).match(/suttacentral.net/);
    should(mld.docAuthorName).match(/Bhikkhu Sujato/);
    should(mld.refAuthor).equal(refAuthor);
    should(mld.refFooter).match(/Môhan.*Ismet/);
    should(mld.refAuthorName).match(/Môhan Wijayaratna/);
  });
  it("trilingual-mn8-fr-doc", async()=>{
    const msg = 'Tm3n.trilingual-mn8-fr-doc';
    let dbg = 0;
    var bd = new BilaraData({name:'ebt-data'});
    await bd.initialize();
    let refLang = 'en';
    let refAuthor = 'sujato';
    let mld = await bd.trilingualDoc("mn8/fr/wijayaratna", 
      { refLang, refAuthor, });
    should(mld.title).equal('Majjhima Nikāya 8\n8. Le déracinement');
    let testScid = 'mn8:1.2';
    let testSeg = mld.segMap[testScid];
    dbg && console.log(msg, 'testSeg', testSeg);
    should(testSeg.scid).equal(testScid);
    should(testSeg.pli).match(/ekaṁ samayaṁ bhagavā/);
    should(testSeg.ref).match(/At one time the Buddha/);
    should(testSeg.fr).match(/>Ainsi ai-je entendu/);
    should(mld.suid).equal('mn8');
    should(mld.lang).equal('fr');
    should(mld.sutta_uid).equal('mn8');
    should(mld.type).equal('translation');
    should(mld.refAuthor).equal('sujato');
    should(mld.refFooter).match(/suttacentral.net/);
    should(mld.refAuthorName).match(/Bhikkhu Sujato/);
    should(mld.docAuthor).equal('wijayaratna');
    should(mld.docFooter).match(/Môhan.*Ismet/);
    should(mld.docAuthorName).match(/Môhan Wijayaratna/);
  });
})
