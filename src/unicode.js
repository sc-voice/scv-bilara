(function(exports) {
    const fs = require('fs');
    const path = require('path');
    var SYMBOLS = null;
    var ROMANIZE_MAP = null;

    class Unicode {
        static get LSQUOTE() { return '\u2018'; }
        static get RSQUOTE() { return '\u2019'; }
        static get LDQUOTE() { return '\u201C'; }
        static get RDQUOTE() { return '\u201D'; }
        static get HYPHEN() { return '\u2010'; }
        static get APOSTROPHE() { return '\u02BC'; }
        static get ENDASH() { return '\u2013'; }
        static get EMDASH() { return '\u2014'; }
        static get ELLIPSIS() { return '\u2026'; }
        static get A_MACRON() { return '\u0100'; }
        static get a_MACRON() { return '\u0101'; }
        static get u_MACRON() { return '\u016d'; /* UTF-8 c5ab */ }

        constructor(opts={}) {
            if (opts.romanizeMap == null) {
                Object.defineProperty(this, 'romanizeMap', {
                    value: Unicode.ROMANIZE_MAP,
                });
            } else {
                this.romanizeMap = opts.romanizeMap;
            }
            if (opts.symbols == null) {
                Object.defineProperty(this, 'symbols', {
                    value: Unicode.SYMBOLS,
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

        get LSQUOTE() { return Unicode.LSQUOTE; }
        get RSQUOTE() { return Unicode.RSQUOTE; }
        get LDQUOTE() { return Unicode.LDQUOTE; }
        get RDQUOTE() { return Unicode.RDQUOTE; }
        get HYPHEN() { return Unicode.HYPHEN; }
        get APOSTROPHE() { return Unicode.APOSTROPHE; }
        get ENDASH() { return Unicode.ENDASH; }
        get EMDASH() { return Unicode.EMDASH; }
        get ELLIPSIS() { return Unicode.ELLIPSIS; }
        get A_MACRON() { return Unicode.A_MACRON; }
        get a_MACRON() { return Unicode.a_MACRON; }
        get u_MACRON() { return Unicode.u_MACRON; }

        stripSymbols(text) {
           return text.replace(this.reSymbols, '');
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

    module.exports = exports.Unicode = Unicode;
})(typeof exports === "object" ? exports : (exports = {}));

