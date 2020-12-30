(typeof describe === 'function') && describe("english", function() {
    const should = require("should");
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
        enWords = await English.wordSet();
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
        enWords = await English.wordSet();
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
});
