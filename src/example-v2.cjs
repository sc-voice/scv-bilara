(function (exports) {
  const path = require('path');
  const fs = require('fs');
  const { BilaraPath, AuthorsV2 } = require('scv-esm');
  const BilaraData = require('./bilara-data.js');
  const Seeker = require('./seeker.cjs');
  const {
    DBG_EXAMPLES,
  } = require('./defines.cjs');

  class ExampleV2 {
    constructor(opts={}) {
      const msg = 'ExampleV2.ctor()';
      const dbg = DBG_EXAMPLES;
      let {
        lang='en',
        author,
        category='sutta',
        branch='published',
        repository='ebt-data',
        gitAccount='ebt-site',
        bilaraData,
      } = opts;
      author = author || AuthorsV2.langAuthor(lang, {
        category,
      });
      let bdOpts = {
        name: repository,
        gitAccount,
      }
      if (bilaraData == null) {
        dbg && console.log(msg, '[1]new BilaraData', bdOpts);
        bilaraData = new BilaraData(bdOpts);
      }
      Object.assign(this, {
        lang,
        author,
        category,
        branch,
        gitAccount,
        bilaraData,
        repository,
      });
    }

    get initialized() {
      return this.bilaraData.initialized;
    }

    langAuthorPath() {
      let { lang, author, category, bilaraData } = this;
      let { root } = bilaraData;
      author = author || AuthorsV2.langAuthor(lang);
      let authorInfo = AuthorsV2.authorInfo(author);
      let { exampleVersion:egVer } = authorInfo;
      let pathDir = `${root}/examples`;
      let fname = [
        'examples',
        lang,
        category,
        egVer,
        `${author}.txt`,
      ].join('-');
      return path.join(root, 'examples', fname);
    }

    async examples() {
      let egPath = this.langAuthorPath();
      let text = (await fs.promises.readFile(egPath)).toString();
      return text.split('\n');
    }

    async initialize() {
      const msg = 'ExampleV2.initialize()';
      const dbg = DBG_EXAMPLES;
      let { author, lang, bilaraData } = this;
      let seekerOpts = {
        lang,
        author,
        maxDoc: 100,
        minLang: 2,
        trilingual: true,
      }
      dbg && console.log(msg, '[1]new Seeker', seekerOpts);
      seekerOpts.bilaraData = bilaraData;
      let seeker = new Seeker(seekerOpts);
      this.seeker = seeker;
      await bilaraData.initialize();
      await seeker.initialize();

      return this;
    }

    async exampleSuttas(pattern) {
      const msg = 'ExampleV2.findExample()';
      const dbg = DBG_EXAMPLES;
      let { 
        lang, minLang, author, initialized, bilaraData, seeker 
      } = this;
      if (!initialized) {
        throw new Error(emsg);
      }
      let findArgs = seeker.findArgs([{ 
        lang,
        pattern, 
        docLang: lang,
        docAuthor: author,
        refLang: 'en',
        refAuthor: 'sujato',
        minLang,
        trilingual: true,
      }]);
      dbg && console.log(msg, '[1]findArgs', findArgs);
      let res = await seeker.find(findArgs);
      dbg && console.log(msg, '[2]', results);
      let results = res.mlDocs.map(mld=>{
        let { sutta_uid, segsMatched, langSegs } = mld;
        return { sutta_uid, segsMatched, segsTotal: langSegs.pli };
      });
      return results;
    }

    async suttasOfExamples(examples) {
      let map = {}
      examples = [...examples].sort().filter(e=>!!e);
      for (let i=0; i < examples.length; i++) {
        let example = examples[i];
        let suttas = await this.exampleSuttas(example);
        map[example] = suttas.map(s=>s.sutta_uid);
      }
      return map;
    }
  }

  module.exports = exports.ExampleV2 = ExampleV2;
})(typeof exports === "object" ? exports : (exports = {}));

