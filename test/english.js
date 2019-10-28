(typeof describe === 'function') && describe("english", function() {
    const should = require("should");
    const {
        English,
    } = require("../index");

    it("romanizePattern(pattern) should return the English pattern", ()=>{
        should(English.romanizePattern("jhana")).equal('jhana');
        should(English.romanizePattern("abcdefghijklmnnopqrstuvwxyz"))
        .equal('abcdefghijklmnnopqrstuvwxyz');
    });
    it("recognizes English words", done=>{
        this.timeout(5*1000);
        (async function() { try {
            enWords = await English.wordSet();
            should.deepEqual(enWords.trace('wurzel'), {
                trace: 'wu~',
                member: false,
            });
            should.deepEqual(enWords.trace('ananda'), {
                trace: 'anand~',
                member: false,
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
            should.deepEqual(enWords.trace('analayo'), {
                trace: 'anala~',
                member: false,
            });
            should.deepEqual(enWords.trace('bhante'), {
                trace: 'bh~',
                member: false,
            });
            should.deepEqual(enWords.trace('anataph'), {
                trace: 'anata~',
                member: false,
            });
            done(); 
        } catch(e) {done(e);} })();
    });
});
