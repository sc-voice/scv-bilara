(typeof describe === 'function') && describe("word-fuzzy-set", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        FuzzyWordSet,
        Unicode,
    } = require("../index");
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require("just-simple").JustSimple;

    const HELLO_STATES = {
        h: {
            'e': true,
            other: false,
        },
    };

    it("default ctor", () => {
        var fws = new FuzzyWordSet();
        should(fws).properties({
            maxTrain: 10,
        });
    });
    it("TESTTESTcontains(word) => set membership", ()=>{
        var fws = new FuzzyWordSet();
        should(fws.contains('hello')).equal(false);
        should(fws.contains('goodbye')).equal(false);
        should(fws.contains('howdy')).equal(false);

        should(fws.include('hello')).equal(true);
        should(fws.contains('hello')).equal(true);
        should(fws.contains('goodbye')).equal(false);

        // it's a fuzzy set!
        should(fws.contains('howdy')).equal(true); 
    });
    it("TESTTESTinclude(...) clarifies set membership", ()=>{
        var fws = new FuzzyWordSet();
        should(fws.contains('hello')).equal(false);
        should(fws.contains('howdy')).equal(false);

        should(fws.include('hello')).equal(true);
        should(fws.contains('hello')).equal(true);
        should(fws.contains('howdy')).equal(true); 

        should(fws.include('howdy', false)).equal(true);
        should(fws.contains('hello')).equal(true);
        should(fws.contains('howdy')).equal(false); 
    });
    it("TESTTESTtrain(...) handles prefixes", ()=>{
        var fws = new FuzzyWordSet();
        var iterations = fws.train({
            hello: true,
            howdy: false,
            hell: false,
        });
        should(fws.contains('hello')).equal(true);
        should(fws.contains('hell')).equal(false);
        should(fws.contains('howdy')).equal(false);
        should(iterations).equal(2);
    });
    it("TESTTESTcan be serialized", ()=>{
        var fws = new FuzzyWordSet();
        var iterations = fws.train({
            hello: true,
            howdy: false,
            hell: false,
        });
        should(fws.reSymbols.test('?')).equal(true);
        should(fws.reSymbols.test('a')).equal(false);

        // serialize and test deserialized copy
        var json = JSON.stringify(fws);
        var fws = new FuzzyWordSet(JSON.parse(json));
        should(fws.contains('hello')).equal(true);
        should(fws.contains('hell')).equal(false);
        should(fws.contains('howdy')).equal(false);
        should(fws.reSymbols.test('?')).equal(true);
        should(fws.reSymbols.test('a')).equal(false);
    });
    it("TESTTESTignores symbols", ()=>{
        var fws = new FuzzyWordSet();
        fws.include('"red"');
        should(fws.contains('red')).equal(true);
        should(fws.contains('"red?"')).equal(true);
        should(fws.contains('red, ')).equal(true);
        should(fws.contains('blue!')).equal(false);
        should(fws.contains('blue?')).equal(false);
    });
    it("TESTTESTromanize(text) returns romanized text", function() {
        var fws = new FuzzyWordSet();
        should(fws.romanize("abc")).equal('abc');
        should(fws.romanize("Abc")).equal('abc');
        should(fws.romanize("Tath\u0101gata")).equal('tathagata');
        should(fws.romanize("Ukkaṭṭhā")).equal('ukkattha');
        should(fws.romanize("Bhikkhū")).equal('bhikkhu');
        should(fws.romanize("tassā’ti")).equal(`tassa${Unicode.RSQUOTE}ti`);
        should(fws.romanize("saññatvā")).equal(`sannatva`);
        should(fws.romanize("pathaviṃ")).equal(`pathavim`);
        should(fws.romanize("viññāṇañcāyatanato")).equal(`vinnanancayatanato`);
        should(fws.romanize("diṭṭhato")).equal(`ditthato`);
        should(fws.romanize("khīṇāsavo")).equal(`khinasavo`);
        should(fws.romanize("pavaḍḍhanti")).equal(`pavaddhanti`);
        should(fws.romanize("ĀḌḤĪḶḸṂṆÑṄṚṜṢŚṬŪṁ")).equal(`adhillmnnnrrsstum`);
        should(fws.romanize("‘Nandī dukkhassa mūlan’ti—"))
            .equal(`${Unicode.LSQUOTE}`+
                `nandi dukkhassa mulan`+
                `${Unicode.RSQUOTE}ti${Unicode.EMDASH}`);

    });

})
