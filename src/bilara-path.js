(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        logger,
    } = require('just-simple').JustSimple;

    class BilaraPath {
        static pathParts(bilaraPath) {
            var bpParts = bilaraPath.split('/');
            var fname = bpParts.pop();
            var type = bpParts[0];
            var lang = bpParts[1];
            var author_uid = bpParts[2];
            var collection = bpParts[3];
            var suid = fname.replace(/_.*$/,'');
            var suttaRef = `${suid}/${lang}/${author_uid}`;
            return {
                suid,
                type,
                collection,
                lang,
                author_uid,
                suttaRef,
                bilaraPath,
            };
        }
    }

    module.exports = exports.BilaraPath = BilaraPath;
})(typeof exports === "object" ? exports : (exports = {}));

