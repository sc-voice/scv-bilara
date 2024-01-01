import PKG_INDEX from '../index.js';
const {
  ExampleV2,
  BilaraData,
} = PKG_INDEX;
import should from 'should';

(typeof describe==='function') && describe("example-v2", function () {
  it("default ctor", ()=>{
    let es = new ExampleV2();
    should(es).properties({
      lang: 'en',
      author: 'sujato',
      category: 'sutta',
      branch: 'published',
      repository: 'ebt-data',
      gitAccount: 'ebt-site',
    });
  });
  it("custom ctor", ()=>{
    let bilaraData = new BilaraData();
    let lang = 'test-lang';
    let author = 'test-author';
    let category = 'test-category';
    let gitAccount = 'suttacentral';
    let repository = 'bilara-data';
    let es = new ExampleV2({
      lang, author, category, gitAccount, repository, bilaraData,
    });
    should(es).properties({
      lang, author, category, gitAccount, repository, bilaraData,
    });
  });
  it("custom ctor de", async()=>{
    let lang = 'de';
    let es = new ExampleV2({lang});
    should(es).properties({
      lang,
      author: 'sabbamitta',
      category: 'sutta',
      gitAccount: 'ebt-site',
      repository: 'ebt-data', }); let { bilaraData } = es;
    should(es.initialized).equal(false);
    should(bilaraData.repo).equal(
      'https://github.com/ebt-site/ebt-data.git');

    should(await es.initialize()).equal(es);
    should(es.initialized).equal(true);
    let { seeker } = es;
    should(seeker).properties({
      maxDoc: 100,
      minLang: 2,
      bilaraData: es.bilaraData,
      trilingual: true,
    });
  });
  it("exampleSuttas()", async()=>{
    let lang = 'de';
    let es = await new ExampleV2({lang}).initialize();
    let res = await es.exampleSuttas('wurzel des leidens');
    should.deepEqual(res.map(s=>s.sutta_uid), 
      ['sn42.11', 'sn56.21', 'mn116', 'dn16']);
  });
  it("TESTTESTexampleSuttaMap()", async()=>{
    let lang = 'de';
    let es = await new ExampleV2({lang}).initialize();
    let examples = [
      'wurzel des leidens',
      'ein schlectes Beispeil',
    ];
    let res = await es.exampleSuttaMap(examples);
    should.deepEqual(res, {
      'ein schlectes Beispeil': [],
      'wurzel des leidens': ['sn42.11', 'sn56.21', 'mn116', 'dn16'],
    });
  });
});
