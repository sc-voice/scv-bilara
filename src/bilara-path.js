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
            return {
                suid: fname.replace(/_.*$/,''),
                type: bpParts[0],
                lang: bpParts[1],
                author_uid: bpParts[2],
            };
        }
    }

    module.exports = exports.BilaraPath = BilaraPath;
})(typeof exports === "object" ? exports : (exports = {}));

