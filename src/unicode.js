(function(exports) {
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
    }

    module.exports = exports.Unicode = Unicode;
})(typeof exports === "object" ? exports : (exports = {}));

