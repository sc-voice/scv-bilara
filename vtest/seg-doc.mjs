import { describe, it, expect } from '@sc-voice/vitest';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';
import { logger, LogInstance } from 'log-instance';
import PKG from '../index.js';
const { FuzzyWordSet, SegDoc } = PKG;
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("SegDoc", { timeout: 5*1000 }, function() {
    it("default ctor", () => {
        var sd = new SegDoc();
        expect(sd).toMatchObject({
            author: undefined,
            lang: undefined,
            segMap: {},
            suid: undefined,
            bilaraPath: undefined,
        });
        expect(sd.logger).toBe(logger);
    });
    it("custom ctor", () => {
        var logger2 = new LogInstance();
        var suid = 'dn33';
        var lang = 'en';
        var author = 'sujato';
        var segMap = {
            'dn33:0.1': "test dn33",
        };
        var bilaraPath = 'test-path';
        var sd = new SegDoc({
            author,
            lang,
            logger: logger2,
            segMap,
            suid,
            bilaraPath,
        });
        expect(sd).toMatchObject({
            author: 'sujato',
            lang: 'en',
            segMap,
            suid: 'dn33',
            bilaraPath,
        });
        expect(sd.logger).toBe(logger2);
    });
    it("load(...) loads SegDoc file", async ()=>{
        var dn33 = new SegDoc({
            bilaraPath: 'data/dn33.json',
        });
        var res = await dn33.load(__dirname);
        expect(dn33.segMap['dn33:1.10.31'])
            .toBe('form, formlessness, and cessation. ');
    });
    it("loadSync(...) loads SegDoc file", ()=>{
        var dn33 = new SegDoc({
            bilaraPath: 'data/dn33.json',
        });
        expect(dn33.loadSync(__dirname)).toBe(dn33);
        expect(dn33.segMap['dn33:1.10.31'])
            .toBe('form, formlessness, and cessation. ');
        expect(dn33.scids().slice(0,10)).toEqual([
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
        });
        dn33.loadSync(__dirname);
        dn33.bilaraPath = 'dn33.json';

        // add a new segment and save the SegDoc
        dn33.segMap['dn33:0.0'] = 'import-test';
        dn33.import(tmpObj.name);
        var dn33path = path.join(tmpObj.name, dn33.bilaraPath);
        expect(fs.existsSync(dn33path)).toBe(true);
        var json = JSON.parse(fs.readFileSync(dn33path));
        expect(json['dn33:0.0']).toBe('import-test');
        expect(json['dn33:1.10.31'])
            .toBe('form, formlessness, and cessation. ');
        fs.unlinkSync(dn33path);
        tmpObj.removeCallback();
    });
    it("segments() returns sn1.1 segment array", ()=>{
        var sutta = new SegDoc({
            suid: 'sn1.1',
            lang: 'en',
            bilaraPath: 'data/en_sn1.1.json',
        }).loadSync(__dirname);
        var segments = sutta.segments();
        expect(segments[0]).toEqual({
            scid: 'sn1.1:0.1',
            en: 'Linked Discourses 1 ',
        });
        expect(segments[1]).toEqual({
            scid: 'sn1.1:0.2',
            en: '1. A Reed ',
        });
        expect(segments[11]).toEqual({
            scid: 'sn1.1:1.9',
            en: "That’s how I crossed the flood neither standing nor swimming.” ",
        });
        expect(segments[12]).toEqual({
            scid: 'sn1.1:2.1',
            en: "“After a long time I see ",
        });
    });
    it("segments() returns an1.1-10 segment array", ()=>{
        var sutta = new SegDoc({
            suid: 'an1.1-10',
            lang: 'en',
            bilaraPath: 'data/en_an1.1-10.json',
        }).loadSync(__dirname);
        var scids = sutta.scids();
        expect(scids.slice(0,15)).toEqual([
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
        expect(segments[0]).toEqual({
            scid: 'an1.1:0.1',
            en: 'Numbered Discourses 1 ',
        });
        expect(segments[1]).toEqual({
            scid: 'an1.1:0.2',
            en: '1. Sights, Etc. ',
        });
        expect(segments[11]).toEqual({
            scid: 'an1.1:2.3',
            en: ' ',
        });
        expect(segments[12]).toEqual({
            scid: 'an1.2:0.1',
            en: '2 ',
        });
    });
    it("fillWordMap(...) can train a FuzzyWordSet", ()=>{
        var fws = new FuzzyWordSet();
        var dn33 = new SegDoc({
            bilaraPath: 'data/dn33.json',
        });
        dn33.loadSync(__dirname);
        var dn33pli = new SegDoc({
            bilaraPath: 'data/dn33_pli.json',
        });
        dn33pli.loadSync(__dirname);

        // Build wordmap
        var wordMap = {};
        var wm = dn33.fillWordMap(wordMap, false); // English includes Pali
        // Pali has no English, so that must come last
        var wm2 = dn33pli.fillWordMap(wordMap, true, true);
        expect(wm2).toBe(wordMap);
        expect(wm2).toMatchObject({
            'ekam': true,
            'ekaṃ': true,
        });

        // train fws
        var iterations = fws.train(wordMap, true);
        expect(fws.contains('bhante')).toBe(true);
        expect(fws.contains('sariputta')).toBe(true);
        expect(fws.contains('ekaṃ')).toBe(true);
        expect(fws.contains('ekam')).toBe(true);
        expect(fws.contains('an')).toBe(false);
        expect(fws.contains('anicca')).toBe(true);
        expect(fws.contains('radiance')).toBe(false);
        expect(fws.contains('ratti')).toBe(true);
        let sWordMap = JSON.stringify(wordMap);
        expect(sWordMap.length).toBe(109085); // fat
        expect(JSON.stringify(fws).length).toBe(27629); // skinny
        expect(iterations).toBe(6);
    });

});
