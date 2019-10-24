(typeof describe === 'function') && describe("seeker", function() {
    const should = require("should");
    const {
        Pali,
    } = require("../index");

    it("romanizePattern(pattern) should return the Pali pattern", ()=>{
        should(Pali.romanizePattern("jhana")).equal('jh(a|ā)(n|ṅ|ñ|ṇ)(a|ā)');
        should(Pali.romanizePattern("abcdefghijklmn"))
        .equal('(a|ā)bc(d|ḍ)efgh(i|ī)jk(l|ḷ)(m|ṁ|ṃ)(n|ṅ|ñ|ṇ)')
        should(Pali.romanizePattern("nopqrstuvwxyz"))
        .equal('(n|ṅ|ñ|ṇ)opqrs(t|ṭ)(u|ū)vwxyz');
    });
    it("TESTTESTrecognizes Pali words", done=>{
        this.timeout(5*1000);
        (async function() { try {
            paliWords = await Pali.wordSet();
            should.deepEqual(paliWords.trace('kloster'), {
                trace: 'klost',
                member: false,
            });
            should.deepEqual(paliWords.trace('buddha'), {
                trace: 'buddha~',
                member: true,
            });
            should.deepEqual(paliWords.trace('ananda'), {
                trace: 'anand~',
                member: true,
            });
            should.deepEqual(paliWords.trace('an'), {
                trace: 'an', // Anguttara Nikaya English abbreviation
                member: false,
            });
            should.deepEqual(paliWords.trace('mn'), {
                trace: 'mn', // Majjhima Nikaya English abbreviation
                member: false,
            });
            should.deepEqual(paliWords.trace('anal'), {
                trace: 'anal',
                member: false,
            });
            should.deepEqual(paliWords.trace('analyse'), {
                trace: 'analys',
                member: false,
            });
            should.deepEqual(paliWords.trace('analyze'), {
                trace: 'analyze',
                member: false,
            });
            should.deepEqual(paliWords.trace('analayo'), {
                trace: 'anala~',
                member: true,
            });
            should.deepEqual(paliWords.trace('bhante'), {
                trace: 'bh~',
                member: true,
            });
            should.deepEqual(paliWords.trace('anataph'), {
                trace: 'anata~',
                member: true,
            });
            done(); 
        } catch(e) {done(e);} })();
    });
});
