(typeof describe === 'function') && describe("de-translation", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const {
        DETranslation,
        SegDoc,
    } = require("../index");
    const {
        logger,
    } = require("just-simple").JustSimple;

    it("default ctor", () => {
        var trans = new DETranslation();
        should(trans).properties({
            author: 'sabbamitta',
            lang: 'de',
            logLevel: 'info',
            segMap: {},
            suid: undefined,
            source: undefined,

        });
    });
    it("custom ctor", () => {
        var suid = 'an1.1-10';
        var lang = 'de-sl';
        var author = 'geiger';
        var source = 'data/de_an1.1-10';
        var logLevel = false;
        var trans = new DETranslation({
            author,
            lang,
            logLevel,
            suid,
            source,

        });
        should(trans).properties({
            author,
            lang,
            logLevel,
            suid,
            source,

        });
    });
    it("load(...) loads an1.1-10",()=>{
        var det = new DETranslation({
            source: 'data/de_an1.1-10',
        });
        should(det.load(__dirname)).equal(det);
        should(det.suid).equal('an1.1-10');
        should(det.text.length).equal(35);
        should(det.nikaya).equal('Nummerierte Lehrreden 1');
        should(det.vagga).equal('1. Bilder usw.');
        should(det.bemerkung).match(/Bemerkung/);
        should(det.blurb).equal(undefined);
        should(det.ready).equal(true);
    });
    it("load(...) loads sn1.1",()=>{
        var det = new DETranslation({
            source: 'data/sn1.1',
        });
        should(det.load(__dirname)).equal(det);
        should(det.suid).equal('sn1.1');
        should(det.text.length).equal(16);
        should(det.nikaya).equal('Verbundene Lehrreden 1');
        should(det.vagga).equal('1. Ein Schilfrohr');
        should(det.bemerkung).match(/Bemerkung/);
        should(det.blurb).match(
            /Der Buddha überquerte die Flut des Leidens/);
        should(det.ready).equal(true);
    });
    it("load(...) loads notreadyyet",()=>{
        var det = new DETranslation({
            source: 'data/notreadyyet',
        });
        should(det.load(__dirname)).equal(det);
        should(det.suid).equal('an1.140-149');
        should(det.text.length).equal(9);
        should(det.nikaya).equal('Nummerierte Lehrreden 1');
        should(det.ready).equal(false);
    });
    it("applySegments(...) applies SN1.1 segmentation", ()=>{
        var en_sn1_1 = new SegDoc({
            suid: 'sn1.1',
            lang: 'en',
            author: 'sujato',
            bilaraPath: 'data/en/sujato/sn/sn1/'+
                'sn1.1_translation-en-sujato.json',
        }).load(__dirname);
        var det = new DETranslation({
            source: 'data/sn1.1',
        }).load(__dirname);
        var segments = det.applySegments(en_sn1_1).segments();
        should(det.bilaraPath).equal('data/de/sabbamitta/sn/sn1/'+
            'sn1.1_translation-de-sabbamitta.json');
        var i = 0;
        should.deepEqual(segments[i++], {
            scid: 'sn1.1:0.1',
            de: 'Verbundene Lehrreden 1',
        });
        should.deepEqual(segments[i++], {
            scid: 'sn1.1:0.2',
            de: '1. Ein Schilfrohr',
        });
        should.deepEqual(segments[i++], {
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
        }).load(__dirname);
        var det = new DETranslation({
            source: 'data/de_an1.1-10',
        }).load(__dirname);
        var segments = det.applySegments(ent).segments();
        should(det.bilaraPath).equal('data/de/sabbamitta/an/an1/'+
            'an1.1-10_translation-de-sabbamitta.json');
        var i = 0;
        should.deepEqual(segments[i++], {
            scid: 'an1.1:0.1',
            de: 'Nummerierte Lehrreden 1',
        });
        should.deepEqual(segments[i++], {
            scid: 'an1.1:0.2',
            de: '1. Bilder usw.',
        });
        should.deepEqual(segments[i++], {
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
        }).load(__dirname);
        var det = new DETranslation({
            source: 'data/an1.150-169-de.txt',
            logLevel: 'info',
        }).load(__dirname);
        var segments = det.applySegments(ent).segments();
        var i = 0;
        should.deepEqual(segments[i++], {
            scid: 'an1.150:0.1',
            de: 'Nummerierte Lehrreden 1',
        });
        should.deepEqual(segments[i++], {
            scid: 'an1.150:0.2',
            de: '12. Kein Vergehen',
        });
        should.deepEqual(segments[i++], {
            scid: 'an1.150:0.3',
            de: '150 ',
        });
        should(segments[i++]).properties({ scid: 'an1.150:1.1', });
        should(segments[i++]).properties({ scid: 'an1.150:1.2', });
        should(segments[i++]).properties({ scid: 'an1.150:1.3', de: ' '});
        should(segments[i++]).properties({ scid: 'an1.151:0.1', de: '151 '});
    });
    it("TESTTESTapplySegments(...) applies an2.32-41 segmentation", ()=>{
        var ent = new SegDoc({
            suid: 'an2.32-41',
            lang: 'en',
            author: 'sujato',
            bilaraPath: 'data/an2.32-41-en.json',
        }).load(__dirname);
        var det = new DETranslation({
            source: 'data/an2.32-41-de.txt',
            logLevel: 'info',
        }).load(__dirname);
        var segs = det.applySegments(ent).segments();
        var i = 0;
        should(segs[i++]).properties({ scid: 'an2.32:0.1',
            de: 'Nummerierte Lehrreden 2'});
        should(segs[i++]).properties({ scid: 'an2.32:0.2' });
        should(segs[i++]).properties({ scid: 'an2.32:0.3',de:'32 ' });
        should(segs[i++]).properties({ scid: 'an2.32:1.1' });
        should(segs[i++]).properties({ scid: 'an2.32:1.2' });
        should(segs[i++]).properties({ scid: 'an2.32:1.3' });
        should(segs[i++]).properties({ scid: 'an2.32:1.4' });
        should(segs[i++]).properties({ scid: 'an2.32:2.1' });
        should(segs[i++]).properties({ scid: 'an2.32:2.2' });
        should(segs[i++]).properties({ scid: 'an2.32:2.3' });
        should(segs[i++]).properties({ scid: 'an2.32:2.4' });
        should(segs[i++]).properties({ scid: 'an2.32:2.5',
            de:'Der gute Mensch ist dankbar und erkenntlich, ' });
        should(segs[i++]).properties({ scid: 'an2.32:2.6',
            de:'denn rechtschaffene Menschen wissen nur, '+
                'wie man dankbar und erkenntlich ist. ' });
        should(segs[i++]).properties({ scid: 'an2.32:2.7' });
        should(segs[i++]).properties({ scid: 'an2.33:0.1',de:'33 ' });
        should(segs[i++]).properties({ scid: 'an2.33:1.1' });
        should(segs[i++]).properties({ scid: 'an2.33:1.2' });
    });
})
