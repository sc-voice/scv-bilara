(typeof describe === 'function') && describe("bilara-path", function() {
    const should = require("should");
    const {
        BilaraPath,
    } = require("../index");

    it("pathParts(f) returns parts of bilara filename",()=>{
        var f = 'translation/en/sujato/'+
            'sn/sn22/sn22.2_translation-en-sujato.json';
        should.deepEqual(BilaraPath.pathParts(f), {
            suid: 'sn22.2',
            suttaRef: 'sn22.2/en/sujato',
            type: 'translation',
            lang: 'en',
            author_uid: 'sujato',
            collection: 'sn',
            bilaraPath: f,
        });
        var f = 'translation/en/sujato/'+
            'sn/sn22/sn22.10_translation-en-sujato.json';
        should.deepEqual(BilaraPath.pathParts(f), {
            suid: 'sn22.10',
            suttaRef: 'sn22.10/en/sujato',
            type: 'translation',
            lang: 'en',
            author_uid: 'sujato',
            collection: 'sn',
            bilaraPath: f,
        });
    });
})
