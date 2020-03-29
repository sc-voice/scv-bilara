(typeof describe === 'function') && describe("bilara-path", function() {
    const should = require("should");
    const {
        BilaraPath,
        BilaraData,
    } = require("../index");
    this.timeout(1*1000);

    var bd = new BilaraData;
    function TRANSPATH(lang,auth,mid) {
        return [
            'translation',
            lang,
            `${auth}/sutta`,
            `${mid}_translation-${lang}-${auth}.json`
        ].join('/');
    }

    it("pathParts(f) returns parts of bilara filename",()=>{
        var f = TRANSPATH('en','sujato','sn/sn22/sn22.2');
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
        var f = TRANSPATH('en','sujato','sn/sn22/sn22.10');
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
