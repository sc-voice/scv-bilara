(function(exports) {
    const Unicode = require('./unicode');

    const OTHER = '~';
    const TRUE = 1;
    const FALSE = 0;

    class FuzzyWordSet {
        constructor(opts={}) {
            this.states = opts.states || {};
            this.maxTrain = opts.maxTrain || 10;
            this.ignoreCase = opts.ignoreCase !== false;
            this.unicode = new Unicode(opts.unicode);
        }

        contains(word) {
            this.ignoreCase && (word = word.toLowerCase());
            return this.trace(word).member;
        }

        trace(word) {
            var {
                unicode,
                states,
            } = this;
            var result = {
                trace: "",
                member: false,
            }
            word = unicode.stripSymbols(word);
            for (var i = 0; i <= word.length; i++) {
                var c = word.charAt(i);
                result.trace += c;
                var s = states[c];
                if (s === undefined) {
                    s = states[OTHER];
                    result.trace += OTHER;
                }
                if (s == undefined) {
                    result.member = false;
                    return result;
                }
                if ( s === TRUE || s === FALSE) {
                    result.member = s === TRUE;
                    return result;
                }
                states = s;
            }

            return result;
        }

        include(word, isMember=true) {
            var {
                unicode,
            } = this;
            word = unicode.stripSymbols(word);
            var m = isMember ? TRUE : FALSE;
            if (this.contains(word) === isMember) {
                return false; // no change
            }

            var states = this.states;
            for (var i = 0; i <= word.length; i++) {
                var c = word.charAt(i);
                var s = states[c];
                if (s === undefined) {
                    s = states[OTHER];
                    if (s === undefined) {
                        states[c] = m;
                        return true;
                    }
                    if (s === m) {
                        return false; // no change
                    }
                }
                if (s === TRUE || s === FALSE) {
                    if (s === m) {
                        return false;
                    }
                    var c1 = word.charAt(i+1);
                    if (c) {
                        states[c] = {
                            [word.charAt(i+1)]: m,
                            [OTHER]: FALSE, // be exclusive
                        };
                    } else {
                        states[c] = m;
                    }
                    return true;
                }
                states = s;
            }
            return false;
        }

        train(wordMap) {
            var words = Object.keys(wordMap);
            for (var i = 0; i < this.maxTrain; i++) {
                var trained = true;
                var notify = true;
                words.forEach(w => {
                    var isMember = wordMap[w];
                    if (this.include(w, isMember)) {
                        trained = false;
                    }
                });
                if (trained) {
                    break;
                }
            } 
            return i;
        }

    }

    module.exports = exports.FuzzyWordSet = FuzzyWordSet;
})(typeof exports === "object" ? exports : (exports = {}));

