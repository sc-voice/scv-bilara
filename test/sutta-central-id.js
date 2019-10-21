(typeof describe === 'function') && describe("sutta-central-id", function() {
    const should = require("should");
    const {
        SuttaCentralId,
    } = require("../index");

    const assertLess = (cmp,a,b) => {
        should(cmp(a,b)).below(0);
        should(cmp(b,a)).above(0);
    };
    const assertEqual = (cmp,a,b) => {
        should(cmp(a,b)).equal(0);
        should(cmp(b,a)).equal(0);
    };

    it("default ctor", function() {
        should.throws(() => {
            var scid = new SuttaCentralId();
        });
    });
    it(" custom ctor", function() {
        // sutta id
        var scid = new SuttaCentralId('mn1');
        should(scid).instanceOf(SuttaCentralId);
        should(scid.toString()).equal('mn1');

        // segment id
        var scid = new SuttaCentralId('mn1:2.3.4');
        should(scid).instanceOf(SuttaCentralId);
        should(scid.toString()).equal('mn1:2.3.4');
    });
    it("scifOfFile(f) returns scid from bilara filename",()=>{
        var f = 'translation/en/sujato/sn/sn22/sn22.2_translation-en-sujato.json';
        should(SuttaCentralId.fromPath(f)).equal('sn22.2');
        var f = 'translation/en/sujato/sn/sn22/sn22.10_translation-en-sujato.json';
        should(SuttaCentralId.fromPath(f)).equal('sn22.10');
    });
    it("TESTTESTcompareLow(a,b) compares sutta file names", function(){
        this.timeout(3*1000);
        var cmp = SuttaCentralId.compareLow;

        // bilara-data order
        // TODO
        //assertEqual(SuttaCentralId.compareLow,
            //'sn22.11',
            //'translation/en/sujato/sn/sn22/sn22.11-20_translation-en-sujato.json');
        assertLess(SuttaCentralId.compareLow,
            "an1.150:0.2", "an1.152-159:0.1");
        assertLess(SuttaCentralId.compareLow,
            "an1.152-159:0.1", "an1.162-169:0.1"); 
        assertLess(SuttaCentralId.compareLow,
            "an1.150:0.1", "an1.162-169:0.1");

        assertEqual(SuttaCentralId.compareLow,
            'translation/en/sujato/sn/sn22/sn22.11_translation-en-sujato.json',
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
    it("TESTTESTcompareLow(a,b) compares segment ids", ()=>{
        var testCompare = (a,b,expected) => {
            should(SuttaCentralId.compareLow(a,b)).equal(expected);
            if (expected === 0) {
                should(SuttaCentralId.compareLow(b,a)).equal(expected);
            } else {
                should(SuttaCentralId.compareLow(b,a)).equal(-expected);
            }
        };
        testCompare('dn33:1.2.31', 'dn33:1.10.1', -8);

        testCompare("an1.150:0.2", "an1.152-159:0.1", -2);
        testCompare("an1.152-159:0.1", "an1.162-169:0.1", -10); 
        testCompare("an1.150:0.1", "an1.162-169:0.1", -12);

        testCompare('an1.2:2.3', 'an1.10:0.1', -8);
        testCompare('an1.2:0.1', 'an1.10:0.1', -8);
        testCompare('dn33', 'dn33', 0);
        testCompare('sn2.1', 'dn33', 1);
        testCompare('dn33:1.2.31', 'dn33:1.10.1', -8);
        testCompare('dn33:1.10.31', 'dn33:1.10.31', 0);
        testCompare('dn33:1.10.31', 'dn33:2.10.31', -1);
        testCompare('dn33:1.1.31', 'dn33:1.10.31', -9);
        testCompare('dn33:1.1', 'dn33:1.1', 0);
        testCompare('dn33:1.1', 'dn33:1.11', -10);
        testCompare('dn33:1.1', 'dn33:1.1.0', -1);
        testCompare('dn33:1.10.1', 'dn33:1.2.0', 8);
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

})
