(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const FuzzyWordSet = require('./fuzzy-word-set');
    const {
        logger,
    } = require('just-simple').JustSimple;

    var FWS_PALI;

    class Pali {
        static romanizePattern(pattern) {
            return pattern
                .replace(/a/iug, '(a|ā)')
                .replace(/i/iug, '(i|ī)')
                .replace(/u/iug, '(u|ū)')
                .replace(/m/iug, '(m|ṁ|ṃ)')
                .replace(/d/iug, '(d|ḍ)')
                .replace(/n/iug, '(n|ṅ|ñ|ṇ)')
                .replace(/l/iug, '(l|ḷ)')
                .replace(/t/iug, '(t|ṭ)')
                ;
        }

        static wordSet() {
            if (FWS_PALI == null) {
                // Do this now, not async
                var fwsPath = path.join(__dirname, 'assets/fws-pali.json');
                logger.info(`Loading Pali FuzzyWordSet`);
                var json = JSON.parse(fs.readFileSync(fwsPath));
                FWS_PALI = new FuzzyWordSet(json);
            }
            return Promise.resolve(FWS_PALI); 
        }
    }

    module.exports = exports.Pali = Pali;
})(typeof exports === "object" ? exports : (exports = {}));

