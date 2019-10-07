(typeof describe === 'function') && describe("translation", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const {
        Translation,
    } = require("../index");
    const {
        logger,
    } = require("just-simple").JustSimple;

    it("TESTTESTdefault ctor", () => {
        var trans = new Translation();
        should(trans).properties({
            author: undefined,
            lang: undefined,
            logLevel: 'info',
            segMap: {},
            suid: undefined,
            translation: undefined,

        });
    });
    it("TESTTESTcustom ctor", () => {
        var suid = 'dn33';
        var lang = 'en';
        var author = 'sujato';
        var segMap = {
            'dn33:0.1': "test dn33",
        };
        var translation = 'test-path';
        var trans = new Translation({
            author,
            lang,
            logLevel: false,
            segMap,
            suid,
            translation,

        });
        should(trans).properties({
            author: 'sujato',
            lang: 'en',
            logLevel: false,
            segMap,
            suid: 'dn33',
            translation,

        });
    });
    it("TESTTESTload(...) loads translation file", ()=>{
        var dn33 = new Translation({
            translation: 'data/dn33.json',
        });
        should(dn33.load(__dirname)).equal(dn33);
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
    it("TESTTESTsave(...) saves translation file", ()=>{
        var tmpObj = tmp.dirSync();
        var dn33 = new Translation({
            translation: 'data/dn33.json',
        });
        dn33.load(__dirname);
        dn33.translation = 'dn33.json';

        // add a new segment and save the translation
        dn33.segMap['dn33:0.0'] = 'save-test';
        dn33.save(tmpObj.name);
        var dn33path = path.join(tmpObj.name, dn33.translation);
        should(fs.existsSync(dn33path)).equal(true);
        var json = JSON.parse(fs.readFileSync(dn33path));
        should(json['dn33:0.0']).equal('save-test');
        should(json['dn33:1.10.31'])
            .equal('form, formlessness, and cessation. '); 
        fs.unlinkSync(dn33path);
        tmpObj.removeCallback();
    });
    it("TESTTESTcompareScid(a,b) compares segment ids", ()=>{
        var testCompare = (a,b,expected) => {
            should(Translation.compareScid(a,b)).equal(expected);
            if (expected === 0) {
                should(Translation.compareScid(b,a)).equal(expected);
            } else {
                should(Translation.compareScid(b,a)).equal(-expected);
            }
        };
        testCompare('dn33', 'dn33', 0);
        testCompare('sn2.1', 'dn33', 1);
        testCompare('dn33:1.10.31', 'dn33:1.10.31', 0);
        testCompare('dn33:1.10.31', 'dn33:2.10.31', -1);
        testCompare('dn33:1.1.31', 'dn33:1.10.31', -9);
        testCompare('dn33:1.1', 'dn33:1.1', 0);
        testCompare('dn33:1.1', 'dn33:1.11', -10);
        testCompare('dn33:1.1', 'dn33:1.1.0', -1);
        testCompare('dn33:1.10.1', 'dn33:1.2.0', 8);
    });

})
