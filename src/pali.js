(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const FuzzyWordSet = require('./fuzzy-word-set');
    const { PaliHyphenator } = require('js-ebt');
    const {
        logger,
    } = require('just-simple').JustSimple;

    var FWS_PALI;

    class Pali {
        constructor(opts={}) {
            this.hyphen = opts.hyphen || "\u00ad";
            this.maxWord = opts.maxWord || 30;
            this.minWord = opts.minWord || 5;
            this.paliHyphenator = opts.paliHyphenator 
                || new PaliHyphenator();
        }

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

        static isVowel(c) {
            return /a|ā|e|i|ī|o|u|ū/.test(c);
        }

        static wordSet() {
            if (FWS_PALI == null) {
                // Do this now, not async
                var fwsPath = path.join(__dirname, 'assets/fws-pali.json');
                var json = JSON.parse(fs.readFileSync(fwsPath));
                FWS_PALI = new FuzzyWordSet(json);
            }
            return Promise.resolve(FWS_PALI); 
        }

        hyphenate(word, opts) {
            return this.paliHyphenator.hyphenate(word, opts);
        }

    }

    module.exports = exports.Pali = Pali;
})(typeof exports === "object" ? exports : (exports = {}));
