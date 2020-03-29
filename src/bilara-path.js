(function(exports) {
    const BilaraPathMap = require("./bilara-path-map");

    class BilaraPath {
        static createPathMap(opts) {
            return new BilaraPathMap.initialize();
        }

        static pathParts(bilaraPath) {
            var bpParts = bilaraPath.split('/');
            var fname = bpParts.pop();
            var type = bpParts[0];
            var lang = bpParts[1];
            var author_uid = bpParts[2];
            var category = bpParts[3];
            var collection = bpParts[4];
            var suid = fname.replace(/_.*$/,'');
            var suttaRef = `${suid}/${lang}/${author_uid}`;
            return {
                suid,
                type,
                category,
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

