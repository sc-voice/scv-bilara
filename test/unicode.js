(typeof describe === 'function') && describe("unicode", function() {
    const should = require("should");
    const {
        Unicode,
    } = require("../index");
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require("just-simple").JustSimple;

    it("TESTTESTdefault ctor", () => {
        var u = new Unicode();
        should.deepEqual(Object.keys(u), []);
    });
    it("TESTTESTromanize(text) returns romanized text", function() {
        var u = new Unicode();
        should(u.LSQUOTE).equal(Unicode.LSQUOTE);
        should(u.LSQUOTE).equal( '\u2018' );
        should(u.RSQUOTE).equal( '\u2019' );
        should(u.LDQUOTE).equal( '\u201C' );
        should(u.RDQUOTE).equal( '\u201D' );
        should(u.HYPHEN).equal( '\u2010' );
        should(u.APOSTROPHE).equal( '\u02BC' );
        should(u.ENDASH).equal( '\u2013' );
        should(u.EMDASH).equal( '\u2014' );
        should(u.ELLIPSIS).equal( '\u2026' );
        should(u.A_MACRON).equal( '\u0100' );
        should(u.a_MACRON).equal( '\u0101' );
        should(u.u_MACRON).equal( '\u016d' ); 
    });
    it("TESTTESTromanize(text) returns romanized text", function() {
        var u = new Unicode();
        should(u.romanize("abc")).equal('abc');
        should(u.romanize("Abc")).equal('abc');
        should(u.romanize("Tath\u0101gata")).equal('tathagata');
        should(u.romanize("Ukkaṭṭhā")).equal('ukkattha');
        should(u.romanize("Bhikkhū")).equal('bhikkhu');
        should(u.romanize("tassā’ti")).equal(`tassa${Unicode.RSQUOTE}ti`);
        should(u.romanize("saññatvā")).equal(`sannatva`);
        should(u.romanize("pathaviṃ")).equal(`pathavim`);
        should(u.romanize("viññāṇañcāyatanato")).equal(`vinnanancayatanato`);
        should(u.romanize("diṭṭhato")).equal(`ditthato`);
        should(u.romanize("khīṇāsavo")).equal(`khinasavo`);
        should(u.romanize("pavaḍḍhanti")).equal(`pavaddhanti`);
        should(u.romanize("ĀḌḤĪḶḸṂṆÑṄṚṜṢŚṬŪṁ")).equal(`adhillmnnnrrsstum`);
        should(u.romanize("‘Nandī dukkhassa mūlan’ti—"))
            .equal(`${Unicode.LSQUOTE}`+
                `nandi dukkhassa mulan`+
                `${Unicode.RSQUOTE}ti${Unicode.EMDASH}`);

    });
    it("TESTTESTstripSymbols(text) strips non word chars", ()=>{
        var u = new Unicode();
        should(u.stripSymbols(`happy`)).equal(`happy`);
        should(u.stripSymbols(`"happy!"`)).equal(`happy`);
    });

})
