(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const FuzzyWordSet = require('./fuzzy-word-set');
    const {
        logger,
    } = require('just-simple').JustSimple;

    var FWS_ENGLISH;

    class English {
        static romanizePattern(pattern) {
            return pattern;
        }

        static wordSet() {
            if (FWS_ENGLISH == null) {
                // Do this now, not async
                var fwsPath = path.join(__dirname, 'assets/fws-en.json');
                logger.info(`Loading English FuzzyWordSet`);
                var json = JSON.parse(fs.readFileSync(fwsPath));
                FWS_ENGLISH = new FuzzyWordSet(json);
            }
            return Promise.resolve(FWS_ENGLISH); 
        }
    }

    module.exports = exports.English = English;
})(typeof exports === "object" ? exports : (exports = {}));

