(typeof describe === 'function') && 
describe("TESTTESTmohan", function() {
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

  var bilaraPaths_mn8 = [
      rootPath('mn/mn8'),
      translationPath('mn/mn8','fr','wijayaratna'),
  ];

  it("load-mn8-fr-wijayaratna", async()=>{
    const msg = 'Tm3n.load-mn8';
    let trilingual = true;
    let bilaraPaths = bilaraPaths_mn8;
    let mld = new MLDoc({ bilaraPaths, trilingual});
    let res = await mld.load(BILARA_PATH);
    should(res).equal(mld);
    should(mld.trilingual).equal(true);
    should(mld.title).equal('Majjhima Nikāya 8\n8. Le déracinement');
    let segMap = mld.segMap;
    let scid1_2 = 'mn8:1.2';
    should(segMap[scid1_2].pli).match(/ekaṁ samayaṁ bhagavā/);
    should(segMap[scid1_2].fr).match(/Ainsi ai-je entendu/);
    should(segMap[scid1_2].scid).equal(scid1_2);
    should(mld.suid).equal('mn8');
    should(mld.lang).equal('fr');
    should(mld.sutta_uid).equal('mn8');
    should(mld.type).equal('translation');
    should(mld.author_uid).equal('wijayaratna');
    should(mld.footer).match(/Môhan.*Ismet/);
    should(mld.author).match(/Môhan Wijayaratna/);
  });
  it("copy-mn8-fr-wijayaratna", async()=>{
    const msg = 'Tm3n.copy-mn8';
    let mldSrc = new MLDoc({ bilaraPaths: bilaraPaths_mn8 });
    await mldSrc.load(BILARA_PATH);
    let mld = new MLDoc(mldSrc);
    should(mld.title).equal('Majjhima Nikāya 8\n8. Le déracinement');
    let segMap = mld.segMap;
    let scid1_2 = 'mn8:1.2';
    should(segMap[scid1_2].pli).match(/ekaṁ samayaṁ bhagavā/);
    should(segMap[scid1_2].fr).match(/Ainsi ai-je entendu/);
    should(segMap[scid1_2].scid).equal(scid1_2);
    should(mld.suid).equal('mn8');
    should(mld.lang).equal('fr');
    should(mld.sutta_uid).equal('mn8');
    should(mld.type).equal('translation');
    should(mld.author_uid).equal('wijayaratna');
    should(mld.footer).match(/Môhan.*Ismet/);
    should(mld.author).match(/Môhan Wijayaratna/);
  });
  it("bd-trilingualDoc-mn8", async() =>{
    const msg = 'TM3n.loadMLDoc';
    let name = 'ebt-data';
    var bd = new BilaraData({name});
    await bd.initialize();
    let author = 'wijayaratna';
    let suid = 'mn8';
    let lang = 'fr';
    let suttaRef = [suid,lang,author].join('/');
    let refLang = 'fr';
    let refAuthor = 'noeismet';
    let mldOpts = { refLang, refAuthor,};
    let mld = await bd.trilingualDoc(suttaRef);
    should(mld.trilingual).equal(true);
    should(mld.author).equal('Môhan Wijayaratna');
    should(mld.docAuthorName).equal('Môhan Wijayaratna');
    should(mld.author_uid).equal('wijayaratna');
    should(mld.footer).match(/Wijaya.*Ismet/);
    should(mld.bilaraPaths[0]).match(/mn8_root-pli-ms/);
    should(mld.bilaraPaths[1]).match(/mn8_translation-fr-wijayaratna/);
  });
})
