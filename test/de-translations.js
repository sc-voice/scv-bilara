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
            author: undefined,
            lang: undefined,
            logLevel: 'debug',
            segMap: {},
            suid: undefined,
            translation: undefined,

        });
    });
    it("TESTTESTcustom ctor", () => {
        var suid = 'an1.1-10';
        var lang = 'de';
        var author = 'sabbamitta';
        var translation = 'data/AN 1.1-10';
        var logLevel = false;
        var trans = new DETranslation({
            author,
            lang,
            logLevel,
            suid,
            translation,

        });
        should(trans).properties({
            author,
            lang,
            logLevel,
            suid,
            translation,

        });
    });
    it("TESTTESTload(...) loads an1.1-10",()=>{
        var det = new DETranslation({
            translation: 'data/AN 1.1-10',
        });
        should(det.load(__dirname)).equal(det);
        should(det.suid).equal('an1.1-10');
        should(det.text.length).equal(36);
        should(det.nikaya).equal('Nummerierte Lehrreden 1');
        should(det.vagga).equal('1. Bilder usw.');
        should(det.bemerkung).match(/Bemerkung/);
        should(det.blurb).equal(undefined);
    });
    it("TESTTESTload(...) loads sn1.1",()=>{
        var det = new DETranslation({
            translation: 'data/sn1.1',
        });
        should(det.load(__dirname)).equal(det);
        should(det.text.length).equal(17);
        should(det.nikaya).equal('Verbundene Lehrreden 1');
        should(det.vagga).equal('1. Ein Schilfrohr');
        should(det.bemerkung).match(/Bemerkung/);
        should(det.blurb).match(/Der Buddha überquerte die Flut des Leidens/);
    });
})
