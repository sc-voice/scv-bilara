(typeof describe === 'function') && describe("pali", function() {
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
    it("recognizes Pali words", done=>{
        this.timeout(5*1000);
        (async function() { try {
            paliWords = await Pali.wordSet();
            should.deepEqual(paliWords.trace('kloster'), {
                trace: 'klo~',
                member: false,
            });
            should.deepEqual(paliWords.trace('buddha'), {
                trace: 'buddha',
                member: true,
            });
            should.deepEqual(paliWords.trace('ananda'), {
                trace: 'ananda',
                member: true,
            });
            should.deepEqual(paliWords.trace('an'), {
                trace: 'an~', // Anguttara Nikaya English abbreviation
                member: false,
            });
            should.deepEqual(paliWords.trace('mn'), {
                trace: 'mn~', // Majjhima Nikaya English abbreviation
                member: false,
            });
            should.deepEqual(paliWords.trace('anal'), {
                trace: 'anal~',
                member: false,
            });
            should.deepEqual(paliWords.trace('analyse'), {
                trace: 'analy~',
                member: false,
            });
            should.deepEqual(paliWords.trace('analyze'), {
                trace: 'analy~',
                member: false,
            });
            should.deepEqual(paliWords.trace('analayo'), {
                trace: 'anala',
                member: true,
            });
            should.deepEqual(paliWords.trace('bhante'), {
                trace: 'bha',
                member: true,
            });
            should.deepEqual(paliWords.trace('anataph'), {
                trace: 'anatap',
                member: true,
            });
            done(); 
        } catch(e) {done(e);} })();
    });
    it("TESTTESThyphenate(word) => handles MN142", ()=>{
        var word = [
            "abhivādanapaccuṭṭhānaañjalikammasāmīci",
            "kammacīvarapiṇḍapātasenāsanagilānappa",
            "ccayabhesajjaparikkhārānuppadānena",
        ].join('');
        var pali = new Pali();
        var hyphenated = pali.hyphenate(word);
        should.deepEqual(hyphenated.split('\u00ad'), [
            `abhivā`,
            `danapac`,
            `cuṭṭhā`,
            `naañjali`,
            `kamma`,
            `sāmīci`,
            `kamma`,
            `cīvara`,
            `piṇḍa`,
            `pātasenā`,
            `sanagilā`,
            `nappacca`,
            `yabhesajja`,
            `parik`,
            `khārānup`,
            `padā`,
            `nena`,
        ]);
    });
});
