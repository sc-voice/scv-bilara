(typeof describe === 'function') && describe("sutta-central-id", function() {
    const should = require("should");
    const {
        SuttaCentralId,
    } = require("../index");
    const logLevel = false;

    const assertLess = (cmp,a,b) => {
        should(cmp(a,b)).below(0);
        should(cmp(b,a)).above(0);
    };
    const assertEqual = (cmp,a,b) => {
        should(cmp(a,b)).equal(0);
        should(cmp(b,a)).equal(0);
    };
    function testCompareLow(a,b,expected) {
        should(SuttaCentralId.compareLow(a,b)).equal(expected);
        if (expected === 0) {
            should(SuttaCentralId.compareLow(b,a)).equal(expected);
        } else {
            should(SuttaCentralId.compareLow(b,a)).equal(-expected);
        }
    }

    var en_suj = `translation/en/sujato/sutta/`;
    this.timeout(5*1000);

    it("default ctor", function() {
        should.throws(() => {
            var scid = new SuttaCentralId();
        });
    });
    it("custom ctor", function() {
        // sutta id
        var scid = new SuttaCentralId('mn1');
        should(scid).instanceOf(SuttaCentralId);
        should(scid.toString()).equal('mn1');

        // segment id
        var scid = new SuttaCentralId('mn1:2.3.4');
        should(scid).instanceOf(SuttaCentralId);
        should(scid.toString()).equal('mn1:2.3.4');
    });
    it("compareLow(a,b) compares sutta file names", function(){
        var cmp = SuttaCentralId.compareLow;

        // vinaya
        testCompareLow('pli-tv-bi-vb-sk1', 'pli-tv-bi-vb-sk75', -74);

        assertLess(SuttaCentralId.compareLow,
            "an1.150:0.2", "an1.152-159:0.1");
        assertLess(SuttaCentralId.compareLow,
            "an1.152-159:0.1", "an1.162-169:0.1"); 
        assertLess(SuttaCentralId.compareLow,
            "an1.150:0.1", "an1.162-169:0.1");

        assertEqual(SuttaCentralId.compareLow,
            `${en_suj}sn/sn22/sn22.11_translation-en-sujato.json`,
            'translation/en/sujato/sn/sn22/sn22.11-20_translation-en-sujato.json');
        assertLess(SuttaCentralId.compareLow,
            'translation/en/sujato/sn/sn22/sn22.2_translation-en-sujato.json',
            'translation/en/sujato/sn/sn22/sn22.11-20_translation-en-sujato.json');
        assertLess(SuttaCentralId.compareLow,
            'translation/en/sujato/sn/sn22/sn22.1_translation-en-sujato.json',
            'translation/en/sujato/sn/sn22/sn22.2_translation-en-sujato.json');
        assertLess(SuttaCentralId.compareLow,
            'translation/en/sujato/sn/sn22/sn22.2_translation-en-sujato.json',
            'translation/en/sujato/sn/sn22/sn22.10_translation-en-sujato.json');

        // misc
        should(cmp('an1.1', 'an2.11-20')).equal(-1);
        should(cmp('an1.1', 'an2.011-20')).equal(-1);
        should(cmp('an1.100', 'an2.11-20')).equal(-1);
        should(cmp('an1.100', 'an2.011-020')).equal(-1);
        should(cmp('an2.1', 'an2.11-20')).equal(-10);
        should(cmp('an2.1', 'an2.011-020')).equal(-10); 
        should(cmp('an2.5', 'an2.11-20')).equal(-6);
        should(cmp('an2.10', 'an2.11-20')).equal(-1);
        should(cmp('an2.11', 'an2.11-20')).equal(0);
        should(cmp('an2.21', 'an2.11-20')).equal(10);
        should(cmp('an2.100', 'an2.11-20')).equal(89);
        should(cmp('an3.1', 'an2.11-20')).equal(1);
        should(cmp('an3.1', 'an2.011-020')).equal(1);
        should(cmp('an1', 'dn2')).equal(-1);
        should(cmp('an9.1', 'dn2')).equal(-1);
        should(cmp('dn2', 'mn1')).equal(-1);
        should(cmp('an2.1-10', 'an2.11-20')).equal(-10);

        // Standalone 
        should(cmp('mn33', 'mn33')).equal(0);
        should(cmp('mn33', 'mn34')).equal(-1);
        should(cmp('mn34', 'mn33')).equal(1);

        // collection suttacentral order
        should(cmp( 'sn/en/sujato/sn22.1', 'an/en/sujato/an22.1')).equal(1);
        should(cmp( 'an/en/sujato/an22.1', 'sn/en/sujato/sn22.1')).equal(-1);
        should(cmp( 'xx/en/sujato/sn22.1', 'xx/en/sujato/an22.1')).equal(1);
        should(cmp( 'xx/en/sujato/an22.1', 'xx/en/sujato/sn22.1')).equal(-1);

        // major number
        should(cmp( 'sn/en/sujato/sn29.1', 'sn/en/sujato/sn22.1')).equal(7);
        should(cmp( 'sn/en/sujato/sn22.1', 'sn/en/sujato/sn29.1')).equal(-7);

        // subchapter numbering
        should(cmp( 'sn/en/sujato/sn30.1', 'sn/en/sujato/sn30.2')).equal(-1);
        should(cmp( 'sn/en/sujato/sn29.1', 'sn/en/sujato/sn29.10')).equal(-9);
        should(cmp( 'sn/en/sujato/sn29.10', 'sn/en/sujato/sn29.1')).equal(9);
        should(cmp( 'sn/en/sujato/sn29.1', 'sn/en/sujato/sn29.11-20')).equal(-10);
        should(cmp( 'sn/en/sujato/sn29.11-20', 'sn/en/sujato/sn29.1')).equal(10);
        should(cmp( 'sn/en/sujato/sn29.10', 'sn/en/sujato/sn29.11-20')).equal(-1);
        should(cmp( 'sn/en/sujato/sn29.11-20', 'sn/en/sujato/sn29.10')).equal(1);

        // ranges
        should(cmp('sn29.11-20', 'sn29.11-20')).equal(0);
        should(cmp('sn29.11-20', 'sn29.10')).equal(1);
        should(cmp('sn29.11-20', 'sn29.11')).equal(0);
        should(cmp('sn29.11-20', 'sn29.12')).equal(-1);
        should(cmp('sn29.21', 'sn29.20')).equal(1);
        should(cmp('sn29.21', 'sn29.21')).equal(0);
        should(cmp('sn29.21', 'sn29.22')).equal(-1);

        should(cmp("an1.1-10", "an1.1-10")).equal(0);
        should(cmp("an1.1", "an1.1-10")).equal(0);
        should(cmp("an1.10", "an1.1-10")).equal(9);

    });
    it("compareLow(a,b) compares segment ids", ()=>{
        // Zeroes
        testCompareLow('dn2:75.3.0', 'dn2:75.3',1);

        // vinaya
        testCompareLow('pli-tv-kd15:17.3.2^a', 'pli-tv-kd15:17.3.2', -26);
        testCompareLow('pli-tv-kd15:17.3', 'pli-tv-kd15:17.3.2', -2);
        testCompareLow('pli-tv-kd15:17.3.2^a', 'pli-tv-kd15:17.3.2^c', -2);
        testCompareLow('pli-tv-kd15:17.3.2a', 'pli-tv-kd15:17.3.2', 1);
        testCompareLow('pli-tv-kd15:17.3.2a', 'pli-tv-kd15:17.3.2c', -2);
        testCompareLow('pli-tv-kd15:17.3.2^a', 'pli-tv-kd15:17.3.2a', -27);

        testCompareLow('dn33:1.2.31', 'dn33:1.10.1', -8);

        testCompareLow("an1.150:0.2", "an1.152-159:0.1", -2);
        testCompareLow("an1.152-159:0.1", "an1.162-169:0.1", -10); 
        testCompareLow("an1.150:0.1", "an1.162-169:0.1", -12);

        testCompareLow('an1.2:2.3', 'an1.10:0.1', -8);
        testCompareLow('an1.2:0.1', 'an1.10:0.1', -8);
        testCompareLow('dn33', 'dn33', 0);
        testCompareLow('sn2.1', 'dn33', 1);
        testCompareLow('dn33:1.2.31', 'dn33:1.10.1', -8);
        testCompareLow('dn33:1.10.31', 'dn33:1.10.31', 0);
        testCompareLow('dn33:1.10.31', 'dn33:2.10.31', -1);
        testCompareLow('dn33:1.1.31', 'dn33:1.10.31', -9);
        testCompareLow('dn33:1.1', 'dn33:1.1', 0);
        testCompareLow('dn33:1.1', 'dn33:1.11', -10);
        testCompareLow('dn33:1.1', 'dn33:1.1.0', -1);
        testCompareLow('dn33:1.10.1', 'dn33:1.2.0', 8);
    });
    it("compareHigh(a,b) compares sutta file names", function(){
        var cmp = SuttaCentralId.compareHigh;

        assertEqual(SuttaCentralId.compareHigh,
            'translation/en/sujato/sn/sn22/sn22.20_translation-en-sujato.json',
            'translation/en/sujato/sn/sn22/sn22.11-20_translation-en-sujato.json');
        assertLess(SuttaCentralId.compareHigh,
            'translation/en/sujato/sn/sn22/sn22.2_translation-en-sujato.json',
            'translation/en/sujato/sn/sn22/sn22.11-20_translation-en-sujato.json');
        assertLess(SuttaCentralId.compareHigh,
            'translation/en/sujato/sn/sn22/sn22.1_translation-en-sujato.json',
            'translation/en/sujato/sn/sn22/sn22.2_translation-en-sujato.json');
        assertLess(SuttaCentralId.compareHigh,
            'translation/en/sujato/sn/sn22/sn22.2_translation-en-sujato.json',
            'translation/en/sujato/sn/sn22/sn22.10_translation-en-sujato.json');

        // misc
        should(cmp('an1.1', 'an2.11-20')).equal(-1);
        should(cmp('an1.1', 'an2.011-20')).equal(-1);
        should(cmp('an1.100', 'an2.11-20')).equal(-1);
        should(cmp('an1.100', 'an2.011-020')).equal(-1);
        should(cmp('an2.1', 'an2.11-20')).equal(-19);
        should(cmp('an2.1', 'an2.011-020')).equal(-19); 
        should(cmp('an2.5', 'an2.11-20')).equal(-15);
        should(cmp('an2.10', 'an2.11-20')).equal(-10);
        should(cmp('an2.11', 'an2.11-20')).equal(-9);
        should(cmp('an2.21', 'an2.11-20')).equal(1);
        should(cmp('an2.100', 'an2.11-20')).equal(80);
        should(cmp('an3.1', 'an2.11-20')).equal(1);
        should(cmp('an3.1', 'an2.011-020')).equal(1);
        should(cmp('an1', 'dn2')).equal(-1);
        should(cmp('an9.1', 'dn2')).equal(-1);
        should(cmp('dn2', 'mn1')).equal(-1);
        should(cmp('an2.1-10', 'an2.11-20')).equal(-10);

        // Standalone 
        should(cmp('mn33', 'mn33')).equal(0);
        should(cmp('mn33', 'mn34')).equal(-1);
        should(cmp('mn34', 'mn33')).equal(1);

        // collection
        should(cmp( 'sn/en/sujato/sn22.1', 'an/en/sujato/an22.1')).equal(1);
        should(cmp( 'an/en/sujato/an22.1', 'sn/en/sujato/sn22.1')).equal(-1);
        should(cmp( 'xx/en/sujato/sn22.1', 'xx/en/sujato/an22.1')).equal(1);
        should(cmp( 'xx/en/sujato/an22.1', 'xx/en/sujato/sn22.1')).equal(-1);

        // major number
        should(cmp( 'sn/en/sujato/sn29.1', 'sn/en/sujato/sn22.1')).equal(7);
        should(cmp( 'sn/en/sujato/sn22.1', 'sn/en/sujato/sn29.1')).equal(-7);

        // subchapter numbering
        should(cmp( 'sn/en/sujato/sn30.1', 'sn/en/sujato/sn30.2')).equal(-1);
        should(cmp( 'sn/en/sujato/sn29.1', 'sn/en/sujato/sn29.10')).equal(-9);
        should(cmp( 'sn/en/sujato/sn29.10', 'sn/en/sujato/sn29.1')).equal(9);
        should(cmp( 'sn/en/sujato/sn29.1', 'sn/en/sujato/sn29.11-20')).equal(-19);
        should(cmp( 'sn/en/sujato/sn29.11-20', 'sn/en/sujato/sn29.1')).equal(19);
        should(cmp( 'sn/en/sujato/sn29.10', 'sn/en/sujato/sn29.11-20')).equal(-10);
        should(cmp( 'sn/en/sujato/sn29.11-20', 'sn/en/sujato/sn29.10')).equal(10);

        // ranges
        should(cmp('sn29.11-20', 'sn29.11-20')).equal(0);
        should(cmp('sn29.11-20', 'sn29.10')).equal(10);
        should(cmp('sn29.11-20', 'sn29.11')).equal(9);
        should(cmp('sn29.11-20', 'sn29.12')).equal(8);
        should(cmp('sn29.21', 'sn29.20')).equal(1);
        should(cmp('sn29.21', 'sn29.21')).equal(0);
        should(cmp('sn29.21', 'sn29.22')).equal(-1);

        should(cmp("an1.1-10", "an1.1-10")).equal(0);
        should(cmp("an1.1", "an1.1-10")).equal(-9);
        should(cmp("an1.10", "an1.1-10")).equal(0);

    });
    it("sutta return sutta id", function() {
        var scid = new SuttaCentralId('mn1');
        should(scid.sutta).equal('mn1');

        var scid = new SuttaCentralId('mn1:2.3.4');
        should(scid.sutta).equal('mn1');

        var scid = new SuttaCentralId('sn1.11-20:2.3.4');
        should(scid.sutta).equal('sn1.11-20');
    });
    it("nikaya return nikaya id", function() {
        var scid = new SuttaCentralId('mn1');
        should(scid.nikaya).equal('mn');

        var scid = new SuttaCentralId('mn1:2.3.4');
        should(scid.nikaya).equal('mn');

        var scid = new SuttaCentralId('sn1.11-20:2.3.4');
        should(scid.nikaya).equal('sn');
    });
    it("nikayaFolder => nikaya folder", function() {
        var scid = new SuttaCentralId('thag21.7');
        should(scid.nikayaFolder).equal('kn/thag');

        var scid = new SuttaCentralId('mn1');
        should(scid.nikayaFolder).equal('mn');

        var scid = new SuttaCentralId('mn1:2.3.4');
        should(scid.nikayaFolder).equal('mn');

        var scid = new SuttaCentralId('sn1.11-20:2.3.4');
        should(scid.nikayaFolder).equal('sn/sn1');

    });
    it("parent returns parent SuttaCentralId", function() {
        var scid = new SuttaCentralId('mn1');
        should(scid.parent).equal(null);

        var scid = new SuttaCentralId('mn1:2.');
        should(scid.parent).instanceOf(SuttaCentralId);
        should(scid.parent.scid).equal('mn1:');

        var scid = new SuttaCentralId('mn1:2.3.4');
        should(scid.parent).instanceOf(SuttaCentralId);
        should(scid.parent.scid).equal('mn1:2.3.');
    });
    it("scidRegExp(pat) creates a scid wildcard pattern", function() {
        // should be same as Linux file wildcards
        should.deepEqual(SuttaCentralId.scidRegExp('mn1:2.3'), /mn1:2\.3/);
        should.deepEqual(SuttaCentralId.scidRegExp('mn1:2.*'), /mn1:2\..*/);
        should.deepEqual(SuttaCentralId.scidRegExp('mn1:2.?'), /mn1:2\../);
        should.deepEqual(SuttaCentralId.scidRegExp('mn1:[2-3].*'), /mn1:[2-3]\..*/);
        should.deepEqual(SuttaCentralId.scidRegExp('^mn1:2.3'), /\^mn1:2\.3/);
        should.deepEqual(SuttaCentralId.scidRegExp('mn1:2.3$'), /mn1:2\.3\$/);
    });
    it("groups returns array of groups", function() {
        var scid = new SuttaCentralId('mn1:2.3.4');
        should.deepEqual(scid.groups, ['2','3','4']);
        var scid = new SuttaCentralId('mn1');
        should.deepEqual(scid.groups, null);
    });
    it("test(text) => text is suid ", function() {
        // vinaya
        should(SuttaCentralId.test('pli-tv-bi-vb-sk1-75')).equal(true);

        // space
        should(SuttaCentralId.test('an3. 90')).equal(true);
        should(SuttaCentralId.test('an3.  90')).equal(true);
        should(SuttaCentralId.test('mn 1-10')).equal(true);
        should(SuttaCentralId.test('mn 1')).equal(true);

        // unsupported sutta
        should(SuttaCentralId.test('t1670b2.8')).equal(true);

        // fully specified sutta
        should(SuttaCentralId.test('mn1/en/sujato')).equal(true);
        should(SuttaCentralId.test(
            'mn1/en/sujato,mn1/en/bodhi')).equal(true);
        should(SuttaCentralId.test(
            'dn7/de/kusalagnana-maitrimurti-traetow')).equal(true);

        // valid collection with a number
        should(SuttaCentralId.test('mn2000')).equal(true);
        should(SuttaCentralId.test('an1')).equal(true);
        should(SuttaCentralId.test('sn22.1')).equal(true);
        should(SuttaCentralId.test('sn22.1-20')).equal(true);
        should(SuttaCentralId.test('mn8-11')).equal(true);
        should(SuttaCentralId.test('mn8-11,mn9-12')).equal(true);

        // unknown but valid sutta 
        should(SuttaCentralId.test('a1')).equal(true);
        should(SuttaCentralId.test('mn01')).equal(true);

        // not a sutta_uid pattern
        should(SuttaCentralId.test('red')).equal(false);
        should(SuttaCentralId.test('thig')).equal(false);
        should(SuttaCentralId.test('mn')).equal(false);

        // lists
        should(SuttaCentralId.test('mn1, mn2')).equal(true);
        should(SuttaCentralId.test('sn22-25')).equal(true);
        should(SuttaCentralId.test('sn22.1-20,mn1')).equal(true);
        should(SuttaCentralId.test('sn22.1-20   ,   mn1')).equal(true);
        should(SuttaCentralId.test('sn22.1-20,red')).equal(false);
        should(SuttaCentralId.test('red,sn22.1-20,mn1')).equal(false);
        should(SuttaCentralId.test('sn22.1-20    ,   red')).equal(false);
        should(SuttaCentralId.test('red,sn22.1-20')).equal(false);
    });
    it("rangeHigh => upper bound", ()=>{
        should(SuttaCentralId.rangeHigh("an1.10--an1.11"))
            .equal("an1.11");
        should(SuttaCentralId.rangeHigh("an1.2:3.4--5.6"))
            .equal("an1.2:5.6.9999");
        should(SuttaCentralId.rangeHigh(
            "an1.2:2.1.3--an1.11:5.1.19/en/sujato"))
            .equal("an1.11:5.1.19.9999/en/sujato");
        should(SuttaCentralId.rangeHigh("an1.2-11:2-5.1.3-19/en/sujato"))
            .equal("an1.11:5.1.19.9999/en/sujato");
        should(SuttaCentralId.rangeHigh("an1.2-11:2-5.1.3-19"))
            .equal("an1.11:5.1.19.9999");
        should(SuttaCentralId.rangeHigh("an1.2-11")).equal("an1.11");
        should(SuttaCentralId.rangeHigh("an1.2")).equal("an1.2");
        should(SuttaCentralId.rangeHigh("mn1")).equal("mn1");
    });
    it("rangeLow => lower bound", ()=>{
        should(SuttaCentralId.rangeLow(
            "an1.2:2.1.3--an1.11:5.1.19/en/sujato"))
            .equal("an1.2:2.1.3/en/sujato");
        should(SuttaCentralId.rangeLow("an1.2:3.4--5.6"))
            .equal("an1.2:3.4");
        should(SuttaCentralId.rangeLow("an1.2-11:2-5.1.3-19/en/sujato"))
            .equal("an1.2:2.1.3/en/sujato");
        should(SuttaCentralId.rangeLow("an1.2-11:2-5.1.3-19"))
            .equal("an1.2:2.1.3");
        should(SuttaCentralId.rangeLow("an1.2-11")).equal("an1.2");
        should(SuttaCentralId.rangeLow("an1.2")).equal("an1.2");
        should(SuttaCentralId.rangeLow("mn1")).equal("mn1");
    });
    it("add(...) increments number", ()=>{
        var segid = new SuttaCentralId('an1.1:0.1');
        should(segid.add(1).scid).equal('an1.1:1.0');
        should(segid.add(0,1).scid).equal('an1.1:0.2');

        var suid = new SuttaCentralId('an1.1');
        should(suid.add(1).scid).equal('an2.1');
        should(suid.add(0,1).scid).equal('an1.2');
    });
    it("standardForm() => human standard",()=>{
        var segid = new SuttaCentralId('an1.1:0.1');
        should(segid.standardForm()).equal('AN1.1:0.1');
        var segid = new SuttaCentralId('thag1.1:2.3');
        should(segid.standardForm()).equal('Thag1.1:2.3');
    });

})
