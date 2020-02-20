(typeof describe === 'function') && describe("bilara-path", function() {
    const should = require("should");
    const {
        BilaraPath,
        BilaraData,
    } = require("../index");

    var bd = new BilaraData;
    var SVA = bd.sva;
    function ROOTPATH(mid) {
        var lang = 'pli';
        var auth = 'ms';
        return [
            'root',
            lang,
            SVA ? `${auth}/sutta`: auth,
            `${mid}_root-${lang}-${auth}.json`
        ].join('/');
    }
    function TRANSPATH(lang,auth,mid) {
        return [
            'translation',
            lang,
            SVA ? `${auth}/sutta`: auth,
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
