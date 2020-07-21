(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const FuzzyWordSet = require('./fuzzy-word-set');
    const {
        logger,
    } = require('just-simple').JustSimple;

    var FWS_PALI;

    class Pali {
        constructor(opts={}) {
            this.hyphen = opts.hyphen || "\u00ad";
            this.maxWord = opts.maxWord || 30;
            this.minWord = opts.minWord || 5;
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

        hyphenate(word) {
            // TODO: https://github.com/suttacentral/legacy-suttacentral/blob/master/utility/pali-tools/hyphenate.py
            var {
                hyphen,
                minWord,
                maxWord,
            } = this;
            var len = word.length;
            if (len < 2*minWord) {
                return [word];
            }
            var half = Math.round(len/2);
            var cLeft = word.charAt(half-1);
            var cRight = word.charAt(half);
            if (Pali.isVowel(cLeft)) {
                if (Pali.isVowel(cRight)) {
                } else {
                }
            } else {
                if (Pali.isVowel(cRight)) {
                    if (cLeft === 'h') {
                        half++;
                    } else {
                        half--;
                    }
                } else {
                    half--;
                }
            }
            var left = word.substring(0, half);
            var right = word.substring(half);
            var left = left.length > maxWord 
                ? this.hyphenate(left)
                : left;
            var right = right.length > maxWord
                ? this.hyphenate(right)
                : right;
            return `${left}${hyphen}${right}`;
        }
    }

    module.exports = exports.Pali = Pali;
})(typeof exports === "object" ? exports : (exports = {}));

