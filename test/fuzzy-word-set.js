(typeof describe === 'function') && describe("word-fuzzy-set", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        FuzzyWordSet,
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
        var json = JSON.stringify(fws);
        var fws = new FuzzyWordSet(JSON.parse(json));
        should(fws.contains('hello')).equal(true);
        should(fws.contains('hell')).equal(false);
        should(fws.contains('howdy')).equal(false);
    });

})
