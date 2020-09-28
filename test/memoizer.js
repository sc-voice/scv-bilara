(typeof describe === 'function') && describe("memoizer", function() {
    const fs = require("fs");
    const path = require("path");
    const should = require("should");
    const {
        Files,
        Memoizer,
    } = require("serial-memo");
    const LOCAL = Files.LOCAL_DIR;
    this.timeout(5*1000);

    it("TESTTESTdefault ctor", ()=>{
        var mzr = new Memoizer();
        should(mzr.root).equal(path.join(LOCAL, "memo"));
    });
    it("TESTTESTmemoizer stores non-promise results", async()=>{
        var mzr = new Memoizer();

        // memoize function
        var f1 = function(arg){return `${arg}-41`};
        var m1 = mzr.memoize(undefined, f1);
        should(m1('test')).equal('test-41');
        should(m1('test')).equal('test-41');

        // memoize arrow function
        var f2 = arg=>`${arg}-42`;
        var m2 = mzr.memoize(undefined, f2);
        should(m2('test')).equal('test-42');
        should(m2('test')).equal('test-42');

        // memoize class method
        class TestClass {
            f(arg) { return `${arg}-43`; }
        }
        var tst = new TestClass();
        var m3 = mzr.memoize(tst, tst.f);
        should(m3('test')).equal('test-43');
        should(m3('test')).equal('test-43');
    });
    it("TESTTESTmemoizer stores -promise results", async()=>{
        var mzr = new Memoizer();
        var fp = async arg=>new Promise((resolve, reject)=>{
            setTimeout(()=>{resolve(`${arg}-42`)}, 1000);
        });
        var m = mzr.memoize(undefined, fp);

        var ms0 = Date.now();
        var p = m('test');
        should(p).instanceOf(Promise);
        should(await p).equal('test-42');
        var ms1 = Date.now();
        should(await m('test')).equal('test-42');
        var ms2 = Date.now();
        should(ms1-ms0).above(1000);
        should(ms2-ms1).above(-1).below(1000);
    });

});
