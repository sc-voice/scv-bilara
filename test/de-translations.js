(typeof describe === 'function') && describe("de-translation", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const {
        DETranslation,
        Translation,
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
        var en_sn1_1 = new Translation({
            suid: 'sn1.1',
            lang: 'en',
            author: 'sujato',
            translation: 'data/en/sujato/sn/sn1/'+
                'sn1.1_translation-en-sujato.json',
        }).load(__dirname);
        var det = new DETranslation({
            source: 'data/sn1.1',
        }).load(__dirname);
        var segments = det.applySegments(en_sn1_1).segments();
        should(det.translation).equal('data/de/sabbamitta/sn/sn1/'+
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
            de: '1. Die Flut überqueren',
        });
    });
    it("TESTTESTapplySegments(...) applies AN1.1-10 segmentation", ()=>{
        var ent = new Translation({
            suid: 'an1.1-10',
            lang: 'en',
            author: 'sujato',
            translation: 'data/en/sujato/an/an1/'+
                'an1.1-10_translation-en-sujato.json',
        }).load(__dirname);
        var det = new DETranslation({
            source: 'data/de_an1.1-10',
        }).load(__dirname);
        var segments = det.applySegments(ent).segments();
        should(det.translation).equal('data/de/sabbamitta/an/an1/'+
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
            de: '1',
        });
        return; //TODO
        should.deepEqual(segments[i++], {
            scid: 'an1.1:1.1',
            de: 'So habe ich gehört.',
        });
        should.deepEqual(segments[15], {
            scid: 'an1.2:1.3',
            de: ' ',
        });
        should.deepEqual(segments[16], {
            scid: 'an1.3:0.1',
            de: '3',
        });
    });
})
