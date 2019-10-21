(typeof describe === 'function') && describe("seeker", function() {
    const should = require("should");
    const {
        Pali,
    } = require("../index");

    it("TESTTESTromanizePattern(pattern) should return the Pali pattern", ()=>{
        should(Pali.romanizePattern("jhana")).equal('jh(a|ā)(n|ṅ|ñ|ṇ)(a|ā)');
        should(Pali.romanizePattern("abcdefghijklmn"))
        .equal('(a|ā)bc(d|ḍ)efgh(i|ī)jk(l|ḷ)(m|ṁ|ṃ)(n|ṅ|ñ|ṇ)')
        should(Pali.romanizePattern("nopqrstuvwxyz"))
        .equal('(n|ṅ|ñ|ṇ)opqrs(t|ṭ)(u|ū)vwxyz');
    });
});
