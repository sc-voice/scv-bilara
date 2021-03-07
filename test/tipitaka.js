(typeof describe === 'function') && describe("tipitaka", function() {  
    const should = require("should");
    const { logger, LogInstance } = require('log-instance');
    const {
        Tipitaka,
    } = require("../index");

    it("default constructor", ()=>{
        let taka = new Tipitaka();

        should.deepEqual(taka.suids.slice(0,3),[
            'an1.1-10', 
            'an1.11-20', 
            'an1.21-30',
        ]);
    });
    it("nextSuid(id), previousSuid(id) traverses nikaya", ()=>{
        let taka = new Tipitaka();

        // within nikaya
        should(taka.nextSuid('an4.99')).equal('an4.100');
        should(taka.previousSuid('an4.100')).equal('an4.99');
        should(taka.nextSuid('an1.1')).equal('an1.1-10');
        should(taka.nextSuid('an1.10')).equal('an1.11-20');
        should(taka.previousSuid('an1.2')).equal('an1.1-10');
        should(taka.previousSuid('an1.12')).equal('an1.11-20');

        // boundaries
        should(taka.nextSuid('mn152')).equal(null);
        should(taka.previousSuid('an1.1')).equal(null);
        should(taka.previousSuid('mn1')).equal(null);
        should(taka.previousSuid('mnd1')).equal(null);
    });
})
