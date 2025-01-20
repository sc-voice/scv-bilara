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
    const msg = 'Tm3n.mn8';
    var mld = new MLDoc({ bilaraPaths: bilaraPaths_mn8 });
    var res = await mld.load(BILARA_PATH);
    should(res).equal(mld);
    should(mld.title).equal('Majjhima Nikāya 8\n8. Le déracinement');
    var segMap = mld.segMap;
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
  });
})
