(typeof describe === 'function') && describe("seeker", function() {
    const should = require("should");
    const {
        English,
    } = require("../index");

    it("romanizePattern(pattern) should return the English pattern", ()=>{
        should(English.romanizePattern("jhana")).equal('jhana');
        should(English.romanizePattern("abcdefghijklmnnopqrstuvwxyz"))
        .equal('abcdefghijklmnnopqrstuvwxyz');
    });
    it("TESTTESTrecognizes English words", done=>{
        this.timeout(5*1000);
        (async function() { try {
            enWords = await English.wordSet();
            should.deepEqual(enWords.trace('wurzel'), {
                trace: 'wur',
                member: false,
            });
            should.deepEqual(enWords.trace('ananda'), {
                trace: 'ananda',
                member: false,
            });
            should.deepEqual(enWords.trace('an'), {
                trace: 'an~', // Anguttara Nikaya English abbreviation
                member: true,
            });
            should.deepEqual(enWords.trace('mn'), {
                trace: 'mn~', // Majjhima Nikaya English abbreviation
                member: true,
            });
            should.deepEqual(enWords.trace('anal'), {
                trace: 'anal~',
                member: true,
            });
            should.deepEqual(enWords.trace('analyse'), {
                trace: 'analy~',
                member: true,
            });
            should.deepEqual(enWords.trace('analyze'), {
                trace: 'analy~',
                member: true,
            });
            should.deepEqual(enWords.trace('analayo'), {
                trace: 'anala',
                member: false,
            });
            should.deepEqual(enWords.trace('bhante'), {
                trace: 'bha',
                member: false,
            });
            should.deepEqual(enWords.trace('anataph'), {
                trace: 'anatap',
                member: false,
            });
            done(); 
        } catch(e) {done(e);} })();
    });
});
