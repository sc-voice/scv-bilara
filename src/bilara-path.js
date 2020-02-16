(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        logger,
        LOCAL_DIR,
    } = require('just-simple').JustSimple;
    const SUTTA_FOLDER = path.join(LOCAL_DIR, "bilara-data", 
        "root", "pli", "ms", "sutta");

    var SVA = fs.existsSync(SUTTA_FOLDER);

    class BilaraPath {
        static pathParts(bilaraPath) {
            var bpParts = bilaraPath.split('/');
            var fname = bpParts.pop();
            var type = bpParts[0];
            var lang = bpParts[1];
            var author_uid = bpParts[2];
            var category = SVA ? bpParts[3] : 'sutta';
            var collection = SVA ? bpParts[4] : bpParts[3];
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

