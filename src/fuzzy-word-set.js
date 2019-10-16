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

    var SYMBOLS = null;
    var ROMANIZE_MAP = null;

    class FuzzyWordSet {
        constructor(opts={}) {
            this.states = opts.states || {};
            this.maxTrain = opts.maxTrain || 10;
            if (opts.romanizeMap == null) {
                Object.defineProperty(this, 'romanizeMap', {
                    value: FuzzyWordSet.ROMANIZE_MAP,
                });
            } else {
                this.romanizeMap = opts.romanizeMap;
            }
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

        static get ROMANIZE_MAP() {
            if (ROMANIZE_MAP == null) {
                var spath = path.join(__dirname, 'assets/romanize-map.json');
                ROMANIZE_MAP = JSON.parse(fs.readFileSync(spath));
            }
            return ROMANIZE_MAP;
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

        train(wordMap, romanize=false) {
            var words = Object.keys(wordMap);

            for (var i = 0; i < this.maxTrain; i++) {
                var trained = true;
                words.forEach(w => {
                    var isMember = wordMap[w];
                    this.include(w, wordMap[w]) && (trained = false);
                    if (isMember && romanize) {
                        var rw = this.romanize(w);
                        this.include(rw, wordMap[rw]) && (trained = false);
                    }
                });
                if (trained) {
                    break;
                }
            } 
            return i;
        }

        romanize(text) {
            if (this.romanizePats == null) {
                var srcChars = Object.keys(this.romanizeMap);
                Object.defineProperty(this, 'romanizePats', {
                    value: srcChars.map(c => {
                        return {
                            rep: this.romanizeMap[c],
                            pat: new RegExp(c, "gui"),
                        };
                    }),
                });
            }
            var result = text.toLowerCase();
            this.romanizePats.forEach((pat,i) => {
                result = result.replace(pat.pat, pat.rep);
            });
            return result;
        }

    }

    module.exports = exports.FuzzyWordSet = FuzzyWordSet;
})(typeof exports === "object" ? exports : (exports = {}));

