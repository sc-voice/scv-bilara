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

    it("TESTTESTdefault ctor", () => {
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
    it("TESTTESTcustom ctor", () => {
        var suid = 'an1.1-10';
        var lang = 'de-sl';
        var author = 'geiger';
        var source = 'data/AN 1.1-10';
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
    it("TESTTESTload(...) loads an1.1-10",()=>{
        var det = new DETranslation({
            source: 'data/AN 1.1-10',
        });
        should(det.load(__dirname)).equal(det);
        should(det.suid).equal('an1.1-10');
        should(det.text.length).equal(35);
        should(det.nikaya).equal('Nummerierte Lehrreden 1');
        should(det.vagga).equal('1. Bilder usw.');
        should(det.bemerkung).match(/Bemerkung/);
        should(det.blurb).equal(undefined);
    });
    it("TESTTESTload(...) loads sn1.1",()=>{
        var det = new DETranslation({
            source: 'data/sn1.1',
        });
        should(det.load(__dirname)).equal(det);
        should(det.suid).equal('sn1.1');
        should(det.text.length).equal(16);
        should(det.nikaya).equal('Verbundene Lehrreden 1');
        should(det.vagga).equal('1. Ein Schilfrohr');
        should(det.bemerkung).match(/Bemerkung/);
        should(det.blurb).match(/Der Buddha überquerte die Flut des Leidens/);
    });
    it("TESTTESTapplySegments(...) applies source segmentation", ()=>{
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
        should.deepEqual(segments[i++], {
            scid: 'sn1.1:0.4',
            de: 'Bemerkung: Diese Übersetzung ist vorläufig '+
                'und unterliegt weiterer Bearbeitung.',
        });
        should.deepEqual(segments[i++], {
            scid: 'sn1.1:0.5',
            de: 'Der Buddha überquerte die Flut des Leidens, '+
                'indem er weder stand noch schwamm.',
        });
    });
})
