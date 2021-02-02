(typeof describe === 'function') && describe("fuzzy-word-set", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        FuzzyWordSet,
        Unicode,
    } = require("../index");
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
            ignoreCase: true,
        });
    });
    it("contains(word) => set membership", ()=>{
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
    it("include(...) clarifies set membership", ()=>{
        var fws = new FuzzyWordSet();
        should(fws.contains('hello')).equal(false);
        should(fws.contains('howdy')).equal(false);

        should(fws.include('hello')).equal(true);
        should(fws.contains('hello')).equal(true);
        should(fws.contains('howdy')).equal(true); 

        should(fws.include('howdy', false)).equal(true);
        should(fws.contains('hello')).equal(false); // we broke hello
        should(fws.contains('howdy')).equal(false); 

        should(fws.include('hello')).equal(true); // we fixed hello
        should(fws.contains('hello')).equal(true);
        should(fws.contains('howdy')).equal(false); 
    });
    it("TESTTESTtrain(...) handles prefixes", ()=>{
        var fws = new FuzzyWordSet();
        var iterations = fws.train({
            abc: true,
            a: false,
            'übung': false,
        });
        should(fws.contains('abc')).equal(true);
        should(fws.contains('a')).equal(false);
        should(fws.contains('b')).equal(false);
        should(fws.contains('übung')).equal(false);
        should(fws.contains('ü')).equal(false);
        should(JSON.stringify(fws.states)).equal(
            '{"a":{"":0,"★":0,"b":{"c":1,"★":0}}}'
        );
        should(iterations).equal(2);
    });
    it("TESTTESTtrace(...) shows detail", ()=>{
        var fws = new FuzzyWordSet();
        for (var i = 0; i < 3; i++) {
            fws.train({
                "ānanda": true,
                ananda: true,
                andhakavinde: true,
                andhakar: true,
                andhakāre: true,
                andhakavinda: false,
                and: false,
                an: false,
            });
        }
        should.deepEqual(fws.trace('ananda'), {
            trace: 'ana',
            member: true,
        });
        should.deepEqual(fws.trace('ānanda'), {
            trace: 'ā',
            member: true,
        });
        should.deepEqual(fws.trace('an'), {
            trace: 'an★',
            member: false,
        });
        should.deepEqual(fws.trace('and'), {
            trace: 'and★',
            member: false,
        });
    });
    it("TESTTESTcan be serialized", ()=>{
        var fws = new FuzzyWordSet();
        var iterations = fws.train({
            hello: true,
            howdy: false,
            hell: false,
        });

        // serialize and test deserialized copy
        var json = JSON.stringify(fws);
        var fws = new FuzzyWordSet(JSON.parse(json));
        should(fws.contains('hello')).equal(true);
        should(fws.contains('hell')).equal(false);
        should(fws.contains('howdy')).equal(false);
        should(fws.unicode.reSymbols.test('a')).equal(false);
    });
    it("ignores symbols", ()=>{
        var fws = new FuzzyWordSet();
        fws.include('"red"');
        should(fws.contains('red')).equal(true);
        should(fws.contains('"red?"')).equal(true);
        should(fws.contains('red, ')).equal(true);
        should(fws.contains('blue!')).equal(false);
        should(fws.contains('blue?')).equal(false);
    });

})
