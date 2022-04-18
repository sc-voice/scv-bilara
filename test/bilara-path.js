(typeof describe === 'function') && describe("bilara-path", function() {
    const should = require("should");
    const {
        BilaraData,
    } = require("../index");
    const { BilaraPath } = require("scv-esm");
    var {
        translationPath,
    } = BilaraPath;
    this.timeout(1*1000);

    var bd = new BilaraData;

    it("pathParts(f) returns parts of bilara filename",()=>{
        var f = translationPath('sn/sn22/sn22.2','en','sujato');
        should.deepEqual(BilaraPath.pathParts(f), {
            suid: 'sn22.2',
            suttaRef: 'sn22.2/en/sujato',
            type: 'translation',
            lang: 'en',
            author_uid: 'sujato',
            category: 'sutta',
            collection: 'sn',
            bilaraPath: f,
        });
        var f = translationPath('sn/sn22/sn22.10','en','sujato');
        should.deepEqual(BilaraPath.pathParts(f), {
            suid: 'sn22.10',
            suttaRef: 'sn22.10/en/sujato',
            type: 'translation',
            lang: 'en',
            author_uid: 'sujato',
            category: 'sutta',
            collection: 'sn',
            bilaraPath: f,
        });
    });
})
