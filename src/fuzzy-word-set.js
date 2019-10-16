(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require('just-simple').JustSimple;

    const OTHER = '--';
    const TRUE = 1;
    const FALSE = 0;

    var SYMBOLS;

    class FuzzyWordSet {
        constructor(opts={}) {
            this.states = opts.states || {};
            this.maxTrain = opts.maxTrain || 10;
            if (opts.symbols == null) {
                Object.defineProperty(this, 'symbols', {
                    value: FuzzyWordSet.SYMBOLS,
                });
            } else {
                this.symbols = opts.symbols; // enumerable
            }
            var syms = Object.keys(this.symbols)
                .sort((a,b) => {
                    if (a === b) { return 0; }
                    if (a === '-') { return -1; }
                    if (b === '-') { return 1; }
                    return a.localeCompare(b);
                })
                .join('')
                .replace(']','\\]');
            Object.defineProperty(this, 'reSymbols', {
                value: new RegExp(`[${syms}]`, "ugm"),
            });
        }

        static get SYMBOLS() {
            if (SYMBOLS == null) {
                var spath = path.join(__dirname, 'assets/symbols.json');
                SYMBOLS = JSON.parse(fs.readFileSync(spath));
            }
            return SYMBOLS;
        }

        contains(word) {
            word = word.replace(this.reSymbols, '');
            var states = this.states;
            for (var i = 0; i < word.length; i++) {
                var c = word.charAt(i);
                var s = states[c];
                if (s === undefined) {
                    s = states[OTHER];
                }
                if (s == undefined) {
                    return false;
                }
                if ( s === TRUE || s === FALSE) {
                    return s === TRUE;
                }
                states = s;
            }

            return false;
        }

        include(word, isMember=true) {
            word = word.replace(this.reSymbols, '');
            var m = isMember ? TRUE : FALSE;
            if (this.contains(word) === isMember) {
                return false; // no change
            }

            var states = this.states;
            for (var i = 0; i < word.length; i++) {
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
                    states[c] = {
                        [word.charAt(i+1)]: m,
                        [OTHER]: s,
                    };
                    return true;
                }
                states = s;
            }
        }

        train(wordMap) {
            var words = Object.keys(wordMap);

            for (var i = 0; i < this.maxTrain; i++) {
                var trained = true;
                words.forEach(w => {
                    var isMember = wordMap[w];
                    if (this.include(w, wordMap[w])) {
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

