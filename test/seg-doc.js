(typeof describe === 'function') && describe("SegDoc", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const {
        FuzzyWordSet,
        SegDoc,
    } = require("../index");
    const {
        logger,
    } = require("just-simple").JustSimple;
    this.timeout(5*1000);
    var logLevel = false;

    it("default ctor", () => {
        var trans = new SegDoc();
        should(trans).properties({
            author: undefined,
            lang: undefined,
            logLevel: 'info',
            segMap: {},
            suid: undefined,
            bilaraPath: undefined,

        });
    });
    it("custom ctor", () => {
        var suid = 'dn33';
        var lang = 'en';
        var author = 'sujato';
        var segMap = {
            'dn33:0.1': "test dn33",
        };
        var bilaraPath = 'test-path';
        var trans = new SegDoc({
            author,
            lang,
            logLevel,
            segMap,
            suid,
            bilaraPath,

        });
        should(trans).properties({
            author: 'sujato',
            lang: 'en',
            logLevel,
            segMap,
            suid: 'dn33',
            bilaraPath,

        });
    });
    it("load(...) loads SegDoc file", done=>{
        (async function() { try {
            var dn33 = new SegDoc({
                bilaraPath: 'data/dn33.json',
                logLevel,
            });
            var res = await dn33.load(__dirname);
            should(dn33.segMap['dn33:1.10.31'])
                .equal('form, formlessness, and cessation. '); 
            done();
        } catch(e) { done(e); } })();
    });
    it("loadSync(...) loads SegDoc file", ()=>{
        var dn33 = new SegDoc({
            bilaraPath: 'data/dn33.json',
            logLevel,
        });
        should(dn33.loadSync(__dirname)).equal(dn33);
        should(dn33.segMap['dn33:1.10.31'])
            .equal('form, formlessness, and cessation. '); 
        should.deepEqual(dn33.scids().slice(0,10), [
            'dn33:0.1',
            'dn33:0.2',
            'dn33:1.1.1',
            'dn33:1.1.2',
            'dn33:1.1.3',
            'dn33:1.2.1',
            'dn33:1.2.2',
            'dn33:1.2.3',
            'dn33:1.2.4',
            'dn33:1.2.5',
        ]);
    });
    it("import(...) imports SegDoc file", ()=>{
        var tmpObj = tmp.dirSync();
        var dn33 = new SegDoc({
            bilaraPath: 'data/dn33.json',
            logLevel,
        });
        dn33.loadSync(__dirname);
        dn33.bilaraPath = 'dn33.json';

        // add a new segment and save the SegDoc
        dn33.segMap['dn33:0.0'] = 'import-test';
        dn33.import(tmpObj.name);
        var dn33path = path.join(tmpObj.name, dn33.bilaraPath);
        should(fs.existsSync(dn33path)).equal(true);
        var json = JSON.parse(fs.readFileSync(dn33path));
        should(json['dn33:0.0']).equal('import-test');
        should(json['dn33:1.10.31'])
            .equal('form, formlessness, and cessation. '); 
        fs.unlinkSync(dn33path);
        tmpObj.removeCallback();
    });
    it("segments() returns sn1.1 segment array", ()=>{
        var sutta = new SegDoc({
            suid: 'sn1.1',
            lang: 'en',
            bilaraPath: 'data/en_sn1.1.json',
            logLevel,
        }).loadSync(__dirname);
        var segments = sutta.segments();
        should.deepEqual(segments[0],{
            scid: 'sn1.1:0.1',
            en: 'Linked Discourses 1 ',
        });
        should.deepEqual(segments[1],{
            scid: 'sn1.1:0.2',
            en: '1. A Reed ',
        });
        should.deepEqual(segments[11],{
            scid: 'sn1.1:1.9',
            en: 'That’s how I crossed the flood neither standing nor swimming.” ',
        });
        should.deepEqual(segments[12],{
            scid: 'sn1.1:2.1',
            en: '“After a long time I see ',
        });
    });
    it("segments() returns an1.1-10 segment array", ()=>{
        var sutta = new SegDoc({
            suid: 'an1.1-10',
            lang: 'en',
            bilaraPath: 'data/en_an1.1-10.json',
            logLevel,
        }).loadSync(__dirname);
        var scids = sutta.scids();
        should.deepEqual(scids.slice(0,15), [
            "an1.1:0.1",
            "an1.1:0.2",
            "an1.1:0.3",
            "an1.1:1.1",
            "an1.1:1.2",
            "an1.1:1.3",
            "an1.1:1.4",
            "an1.1:1.5",
            "an1.1:1.6",
            "an1.1:2.1",
            "an1.1:2.2",
            "an1.1:2.3",
            "an1.2:0.1",
            "an1.2:1.1",
            "an1.2:1.2",
        ]);
        var segments = sutta.segments();
        should.deepEqual(segments[0],{
            scid: 'an1.1:0.1',
            en: 'Numbered Discourses 1 ',
        });
        should.deepEqual(segments[1],{
            scid: 'an1.1:0.2',
            en: '1. Sights, Etc. ',
        });
        should.deepEqual(segments[11],{
            scid: 'an1.1:2.3',
            en: ' ',
        });
        should.deepEqual(segments[12],{
            scid: 'an1.2:0.1',
            en: '2 ',
        });
    });
    it("fillWordMap(...) can train a FuzzyWordSet", ()=>{
        var fws = new FuzzyWordSet();
        var dn33 = new SegDoc({
            bilaraPath: 'data/dn33.json',
            logLevel,
        });
        dn33.loadSync(__dirname);
        var dn33pli = new SegDoc({
            bilaraPath: 'data/dn33_pli.json',
            logLevel,
        });
        dn33pli.loadSync(__dirname);

        // Build wordmap 
        var wordMap = {};
        var wm = dn33.fillWordMap(wordMap, false); // English includes Pali
        // Pali has no English, so that must come last
        var wm = dn33pli.fillWordMap(wordMap, true, true); 
        should(wm).equal(wordMap);
        should(wm).properties({
            'ekam': true,
            'ekaṃ': true,
        });

        // train fws 
        var iterations = fws.train(wordMap, true);
        should(fws.contains('bhante')).equal(true);
        should(fws.contains('sariputta')).equal(true);
        should(fws.contains('ekaṃ')).equal(true);
        should(fws.contains('ekam')).equal(true);
        should(fws.contains('an')).equal(false);
        should(fws.contains('anicca')).equal(true);
        should(fws.contains('radiance')).equal(false);
        should(fws.contains('ratti')).equal(true);
        should(JSON.stringify(wordMap).length).equal(109070); // fat
        should(JSON.stringify(fws).length).equal(27629); // skinny
        should(iterations).equal(6);
    });

})
