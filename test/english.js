(typeof describe === 'function') && describe("english", function() {
    const should = require("should");
    const Axios = require('axios');
    const {
        English,
    } = require("../index");
    this.timeout(5*1000);

    it("romanizePattern(pattern) should return the English pattern", ()=>{
        should(English.romanizePattern("jhana")).equal('jhana');
        should(English.romanizePattern("abcdefghijklmnnopqrstuvwxyz"))
        .equal('abcdefghijklmnnopqrstuvwxyz');
    });
    it("TESTTESTrecognizes English words", async()=>{
        enWords = await English.wordSet({source:'file'});
        should.deepEqual(enWords.trace('unbusied'), {
            trace: 'unbusi',
            member: true,
        });
        should.deepEqual(enWords.trace('unburdensome'), {
            trace: 'unburd',
            member: true,
        });
        should.deepEqual(enWords.trace('auger'), {
            trace: 'auger',
            member: true,
        });
        should.deepEqual(enWords.trace('an'), {
            trace: 'an', // Anguttara Nikaya English abbreviation
            member: true,
        });
        should.deepEqual(enWords.trace('mn'), {
            trace: 'mn', // Majjhima Nikaya English abbreviation
            member: true,
        });
        should.deepEqual(enWords.trace('anal'), {
            trace: 'anal',
            member: true,
        });
        should.deepEqual(enWords.trace('analyse'), {
            trace: 'analys',
            member: true,
        });
        should.deepEqual(enWords.trace('analyze'), {
            trace: 'analyze',
            member: true,
        });
    });
    it("TESTTESTrecognizes non-English words", async()=>{
        enWords = await English.wordSet({source:'file'});
        should.deepEqual(enWords.trace('ye'), {
            trace: 'ye~',
            member: false,
        });
        should.deepEqual(enWords.trace('fingerschnippen'), {
            trace: 'fingersc~',
            member: false,
        });
        should.deepEqual(enWords.trace('makel'), {
            trace: 'makel',
            member: false,
        });
        should.deepEqual(enWords.trace('auge'), {
            trace: 'auge',
            member: false,
        });
        should.deepEqual(enWords.trace('auger'), {
            trace: 'auger',
            member: true,
        });
        should.deepEqual(enWords.trace('wurzel'), {
            trace: 'wu~',
            member: false,
        });
        should.deepEqual(enWords.trace('ananda'), {
            trace: 'anand~',
            member: false,
        });
        should.deepEqual(enWords.trace('analayo'), {
            trace: 'anala~',
            member: false,
        });
        should.deepEqual(enWords.trace('bhante'), {
            trace: 'bhan~',
            member: false,
        });
        should.deepEqual(enWords.trace('anataph'), {
            trace: 'anata~',
            member: false,
        });
    });
    it("TESTTESTwordSet(...)=>latest word set", async()=>{
        let longWait = 1000;
        let msStart = Date.now();
        enWords = await English.wordSet();
        let msElapsed = Date.now() - msStart;
        should(msElapsed).above(100).below(longWait);

        // cached
        msStart = Date.now();
        enWords = await English.wordSet();
        msElapsed = Date.now() - msStart;
        should(msElapsed).above(-1).below(2);

        // maxAge
        let maxAge = 0.05;
        let fetch = url=>Axios.get(url);
        await new Promise(r=>setTimeout(()=>r(),100));
        msStart = Date.now();
        enWords = await English.wordSet({fetch, maxAge});
        msElapsed = Date.now() - msStart;
        should(msElapsed).above(100).below(longWait);

        should.deepEqual(enWords.trace('unbusied'), {
            trace: 'unbusi',
            member: true,
        });
    });
});
