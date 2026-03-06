import { describe, it, expect, beforeAll } from '@sc-voice/vitest';
import PKG_INDEX from '../index.js';
const {
  ExampleV2,
  BilaraData,
} = PKG_INDEX;
import fs from 'fs';
import path from 'path';

describe.sequential("example-v2", function () {
  let deExamples;
  let bilaraData;

  beforeAll(async () => {
    deExamples = await new ExampleV2({lang:'de'}).initialize();
    bilaraData = deExamples.bilaraData;
  });
  it("default ctor", ()=>{
    let es = new ExampleV2();
    expect(es).toHaveProperty('lang', 'en');
    expect(es).toHaveProperty('author', 'sujato');
    expect(es).toHaveProperty('category', 'sutta');
    expect(es).toHaveProperty('branch', 'published');
    expect(es).toHaveProperty('repository', 'ebt-data');
    expect(es).toHaveProperty('gitAccount', 'ebt-site');
    expect(es).toHaveProperty('memoize', true);
  });
  it("custom ctor", ()=>{
    let bilaraData = new BilaraData();
    let lang = 'test-lang';
    let author = 'test-author';
    let category = 'test-category';
    let gitAccount = 'suttacentral';
    let repository = 'bilara-data';
    let memoize = false;
    let es = new ExampleV2({
      lang, author, category, gitAccount, repository, bilaraData,
      memoize,
    });
    expect(es).toHaveProperty('lang', lang);
    expect(es).toHaveProperty('author', author);
    expect(es).toHaveProperty('category', category);
    expect(es).toHaveProperty('gitAccount', gitAccount);
    expect(es).toHaveProperty('repository', repository);
    expect(es).toHaveProperty('bilaraData', bilaraData);
    expect(es).toHaveProperty('memoize', memoize);
  });
  it("custom ctor de", async()=>{
    let lang = 'de';
    let es = new ExampleV2({lang});
    expect(es).toHaveProperty('lang', lang);
    expect(es).toHaveProperty('author', 'sabbamitta');
    expect(es).toHaveProperty('category', 'sutta');
    expect(es).toHaveProperty('gitAccount', 'ebt-site');
    expect(es).toHaveProperty('repository', 'ebt-data');
    let { bilaraData } = es;
    expect(es.initialized).toBe(false);
    expect(bilaraData.repo).toBe(
      'https://github.com/ebt-site/ebt-data.git');

    expect(await es.initialize()).toBe(es);
    expect(es.initialized).toBe(true);
    let { seeker } = es;
    expect(seeker).toHaveProperty('maxDoc', 100);
    expect(seeker).toHaveProperty('minLang', 2);
    expect(seeker).toHaveProperty('bilaraData', es.bilaraData);
    expect(seeker).toHaveProperty('trilingual', true);
  });
  it("exampleSuttas()", async()=>{
    let lang = 'de';
    let es = await new ExampleV2({lang}).initialize();
    let res = await es.exampleSuttas('wurzel des leidens');
    expect(res.map(s=>s.sutta_uid)).toEqual([
      'sn42.11', 'mn105', 'mn1', 'sn56.21', 'mn116', 'mn66', 'dn16',
    ]);
  });
  it("suttasOfExamples()", async()=>{
    let lang = 'de';
    let examples = [
      'wurzel des leidens',
      'ein schlectes Beispeil',
    ];
    let res = await deExamples.suttasOfExamples(examples);
    expect(res).toEqual({
      'ein schlectes Beispeil': [],
      'wurzel des leidens': [
        'sn42.11', 'mn105', 'mn1', 'sn56.21', 'mn116', 'mn66', 'dn16'
      ],
    });
  });
  it("langAuthorPath()", async ()=>{
    let egPath = deExamples.langAuthorPath();
    let text = (await fs.promises.readFile(egPath)).toString();
    let lines = text.split('\n');
    expect(lines[0]).toBe('aber meine Dame');
    expect(lines[lines.length-2]).toBe('zwei Toren');
  });
  it("examples()", async ()=>{
    let lines = await deExamples.examples();
    expect(lines[0]).toBe('aber meine Dame');
    expect(lines[lines.length-2]).toBe('zwei Toren');
  });
});
