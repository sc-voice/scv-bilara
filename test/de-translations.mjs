import { describe, it, expect } from '@sc-voice/vitest';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';
import { logger } from 'log-instance';
import PKG_INDEX from '../index.js';
const { DETranslation, SegDoc } = PKG_INDEX;

const logLevel = false;

describe.sequential("de-translation", function() {

    it("default ctor", () => {
        var trans = new DETranslation();
        expect(trans).properties({
            author: 'sabbamitta',
            lang: 'de',
            segMap: {},
            suid: undefined,
            source: undefined,
        });
        expect(trans.logger).equal(logger);
    });
    it("custom ctor", () => {
        var suid = 'an1.1-10';
        var lang = 'de-sl';
        var author = 'geiger';
        var source = 'data/de_an1.1-10';
        var trans = new DETranslation({
            author,
            lang,
            logLevel,
            suid,
            source,
        });
        expect(trans).properties({
            author,
            lang,
            logLevel,
            suid,
            source,
        });
    });
    it("loadSync(...) loads an1.1-10",()=>{
        var det = new DETranslation({
            source: 'data/de_an1.1-10',
            logLevel,
        });
        expect(det.loadSync(__dirname)).equal(det);
        expect(det.suid).equal('an1.1-10');
        expect(det.text.length).equal(35);
        expect(det.nikaya).equal('Nummerierte Lehrreden 1');
        expect(det.vagga).equal('1. Bilder usw.');
        expect(det.bemerkung).toMatch(/Bemerkung/);
        expect(det.blurb).equal(undefined);
        expect(det.ready).equal(true);
    });
    it("loadSync(...) loads sn1.1",()=>{
        var det = new DETranslation({
            source: 'data/sn1.1',
            logLevel,
        });
        expect(det.loadSync(__dirname)).equal(det);
        expect(det.suid).equal('sn1.1');
        expect(det.text.length).equal(16);
        expect(det.nikaya).equal('Verbundene Lehrreden 1');
        expect(det.vagga).equal('1. Ein Schilfrohr');
        expect(det.bemerkung).toMatch(/Bemerkung/);
        expect(det.blurb).toMatch(
            /Der Buddha überquerte die Flut des Leidens/);
        expect(det.ready).equal(true);
    });
    it("loadSync(...) loads notreadyyet",()=>{
        var det = new DETranslation({
            source: 'data/notreadyyet',
            logLevel,
        });
        expect(det.loadSync(__dirname)).equal(det);
        expect(det.suid).equal('an1.140-149');
        expect(det.text.length).equal(9);
        expect(det.nikaya).equal('Nummerierte Lehrreden 1');
        expect(det.ready).equal(false);
    });
    it("applySegments(...) applies SN1.1 segmentation", ()=>{
        var en_sn1_1 = new SegDoc({
            suid: 'sn1.1',
            lang: 'en',
            author: 'sujato',
            bilaraPath: 'data/en/sujato/sn/sn1/'+
                'sn1.1_translation-en-sujato.json',
            logLevel,
        }).loadSync(__dirname);
        var det = new DETranslation({
            source: 'data/sn1.1',
            logLevel,
        }).loadSync(__dirname);
        var segments = det.applySegments(en_sn1_1).segments();
        expect(det.bilaraPath).equal('data/de/sabbamitta/sn/sn1/'+
            'sn1.1_translation-de-sabbamitta.json');
        var i = 0;
        expect(segments[i++]).toEqual({
            scid: 'sn1.1:0.1',
            de: 'Verbundene Lehrreden 1',
        });
        expect(segments[i++]).toEqual({
            scid: 'sn1.1:0.2',
            de: '1. Ein Schilfrohr',
        });
        expect(segments[i++]).toEqual({
            scid: 'sn1.1:0.3',
            de: '1. Die Flut überqueren ',
        });
    });
    it("applySegments(...) applies AN1.1-10 segmentation", ()=>{
        var ent = new SegDoc({
            suid: 'an1.1-10',
            lang: 'en',
            author: 'sujato',
            bilaraPath: 'data/en/sujato/an/an1/'+
                'an1.1-10_translation-en-sujato.json',
            logLevel,
        }).loadSync(__dirname);
        var det = new DETranslation({
            source: 'data/de_an1.1-10',
            logLevel,
        }).loadSync(__dirname);
        var segments = det.applySegments(ent).segments();
        expect(det.bilaraPath).equal('data/de/sabbamitta/an/an1/'+
            'an1.1-10_translation-de-sabbamitta.json');
        var i = 0;
        expect(segments[i++]).toEqual({
            scid: 'an1.1:0.1',
            de: 'Nummerierte Lehrreden 1',
        });
        expect(segments[i++]).toEqual({
            scid: 'an1.1:0.2',
            de: '1. Bilder usw.',
        });
        expect(segments[i++]).toEqual({
            scid: 'an1.1:0.3',
            de: '1 ',
        });
    });
    it("applySegments(...) applies AN1.150-169 segmentation", ()=>{
        var ent = new SegDoc({
            suid: 'an1.150-169',
            lang: 'en',
            author: 'sujato',
            bilaraPath: 'data/an1.150-169-en.json',
            logLevel,
        }).loadSync(__dirname);
        var det = new DETranslation({
            source: 'data/an1.150-169-de.txt',
            logLevel,
        }).loadSync(__dirname);
        var segments = det.applySegments(ent).segments();
        var i = 0;
        expect(segments[i++]).toEqual({
            scid: 'an1.150:0.1',
            de: 'Nummerierte Lehrreden 1',
        });
        expect(segments[i++]).toEqual({
            scid: 'an1.150:0.2',
            de: '12. Kein Vergehen',
        });
        expect(segments[i++]).toEqual({
            scid: 'an1.150:0.3',
            de: '150 ',
        });
        expect(segments[i++]).properties({ scid: 'an1.150:1.1', });
        expect(segments[i++]).properties({ scid: 'an1.150:1.2', });
        expect(segments[i++]).properties({ scid: 'an1.150:1.3', de: ' '});
        expect(segments[i++]).properties({ scid: 'an1.151:0.1', de: '151 '});
    });
    it("applySegments(...) applies an2.32-41 segmentation", ()=>{
        var ent = new SegDoc({
            suid: 'an2.32-41',
            lang: 'en',
            author: 'sujato',
            bilaraPath: 'data/an2.32-41-en.json',
            logLevel,
        }).loadSync(__dirname);
        var det = new DETranslation({
            source: 'data/an2.32-41-de.txt',
            logLevel,
        }).loadSync(__dirname);
        var segs = det.applySegments(ent).segments();
        var i = 0;
        expect(segs[i++]).properties({ scid: 'an2.32:0.1',
            de: 'Nummerierte Lehrreden 2'});
        expect(segs[i++]).properties({ scid: 'an2.32:0.2' });
        expect(segs[i++]).properties({ scid: 'an2.32:0.3',de:'32 ' });
        expect(segs[i++]).properties({ scid: 'an2.32:1.1' });
        expect(segs[i++]).properties({ scid: 'an2.32:1.2' });
        expect(segs[i++]).properties({ scid: 'an2.32:1.3' });
        expect(segs[i++]).properties({ scid: 'an2.32:1.4' });
        expect(segs[i++]).properties({ scid: 'an2.32:2.1' });
        expect(segs[i++]).properties({ scid: 'an2.32:2.2' });
        expect(segs[i++]).properties({ scid: 'an2.32:2.3' });
        expect(segs[i++]).properties({ scid: 'an2.32:2.4' });
        expect(segs[i++]).properties({ scid: 'an2.32:2.5',
            de:'Der gute Mensch ist dankbar und erkenntlich, ' });
        expect(segs[i++]).properties({ scid: 'an2.32:2.6',
            de:'denn rechtschaffene Menschen wissen nur, '+
                'wie man dankbar und erkenntlich ist. ' });
        expect(segs[i++]).properties({ scid: 'an2.32:2.7' });
        expect(segs[i++]).properties({ scid: 'an2.33:0.1',de:'33 ' });
        expect(segs[i++]).properties({ scid: 'an2.33:1.1' });
        expect(segs[i++]).properties({ scid: 'an2.33:1.2' });
    });
});
