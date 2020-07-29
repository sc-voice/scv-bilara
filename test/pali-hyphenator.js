
(typeof describe === 'function') && describe("pali-hyphenator", function() {
    const should = require("should");
    const {
        PaliHyphenator,
    } = require("../index");

    it("TESTTESTdefault ctor", ()=>{
        var ph = new PaliHyphenator();
        should(ph).properties({
            minWord: 5,
            maxWord: 30,
            hyphen: "\u00AD",
        });
        should(PaliHyphenator.VOWELS).equal("aāeiīouū");
        should("xdhammaz".replace(ph.reAtomic,"y")).equal('xyz');
        should("xdhammoz".replace(ph.reAtomic,"y")).equal('xyz');
        should("xdhammpz".replace(ph.reAtomic,"y")).equal('xdhammpz');
        should("xsakuz".replace(ph.reAtomic,"y")).equal('xyz');

        // common prefix
        should("xsakulaz".replace(ph.reAtomic,"y")).equal('xyz');
        should("xsakusakulaz".replace(ph.reAtomic,"y")).equal('xyyz');
        should("xsakulasakulaz".replace(ph.reAtomic,"y")).equal('xyyz');

        should.deepEqual(ph.atomic.slice(0, 10), [
            "aṅguttara",
            "vibhaṅga",
            "caṇḍala",
            "indriya",
            "nibbāna",
            "thaddha",
            "vitakka",
            "Ānanda",
            "bhacca",
            "bhadde",
        ]);

        // Ending vowel should match any vowel
        var patAtomic = ph.reAtomic.toString();
        var iSank = patAtomic.indexOf('saṅk');
        should(patAtomic.substring(iSank,iSank+25))
            .equal('saṅk|sat(a|ā|e|i|ī|o|u|ū)');
    });
    it("custom ctor", ()=>{
        var atomic = [];
        var minWord = 2;
        var maxWord = 20;
        var hyphen = '-';
        var ph = new PaliHyphenator({
            atomic,
            minWord,
            maxWord,
            hyphen,
        });
        should(ph.atomic).equal(atomic);
        should(ph).properties({
            atomic,
            minWord,
            maxWord,
            hyphen,
        });
    });
    it("hyphenate(word) => handles dhamma", ()=>{
        var hyphen = "-";
        var ph = new PaliHyphenator({
            minWord:1,
            maxWord:3,
            hyphen,
        });
        should.deepEqual(ph.hyphenate("dhamma").split(hyphen), [
            `dhamma`,
        ]);

        should.deepEqual(ph.hyphenate("dhammadhamma").split(hyphen), [
            `dhamma`,
            `dhamma`,
        ]);
    });
    it("TESTTESThyphenate(word) => handles MN142", ()=>{
        var word = [
            "abhivādanapaccuṭṭhānaañjalikammasāmīci",
            "kammacīvarapiṇḍapātasenāsanagilānappa",
            "ccayabhesajjaparikkhārānuppadānena",
        ].join('');
        var maxWord = 20;
        var hyphen = "-";
        var ph = new PaliHyphenator({
            maxWord,
            hyphen,
        });
        var hyphenated = ph.hyphenate(word).split(hyphen);
        var i = 0;
        should(hyphenated[i++].length).below(maxWord+1);
        should(hyphenated[i++].length).below(maxWord+1);
        should(hyphenated[i++].length).below(maxWord+1);
        should(hyphenated[i++].length).below(maxWord+1);
        should(hyphenated[i++].length).below(maxWord+1);
        should(hyphenated[i++].length).below(maxWord+1);
        should(hyphenated[i++].length).below(maxWord+1);
        should(hyphenated[i++].length).below(maxWord+1);
        should.deepEqual(hyphenated, [
            `abhivādanapac`, // doubled consonant
            `cuṭṭhānaañjali`,
            `kamma`, // atomic
            `sāmīci`,
            `kamma`,
            `cīvara`, 
            `piṇḍa`, // atomic 
            `pātasenāsanagilā`,
            `nappaccayabhesajja`,
            `pari`,
            `kkhārānup`,
            `padā`,
            `nena`,
        ]);
    });
    it("TESTTESThyphenate(word) => handles kamma", ()=>{
        var ph = new PaliHyphenator({
            maxWord: 10,
        });
        var word = "kammakammakameleon";
        var hyphen = "\u00ad";
        should.deepEqual(ph.hyphenate(word).split(hyphen), [
            "kamma",
            "kamma",
            "kameleon",
        ]);
    });
});
