(function(exports) {
    // Adapted from Ayya Vimala hyphenate.py original:
    // found on https://github.com/suttacentral/legacy-suttacentral
    //
    // https://bit.ly/331wTo8
    const atomic = [
        'Ānanda',
        'aṅguttara',
        'bahu',
        'bala',
        'bāla',
        'bara',
        'bhacca',
        'bhadde',
        'bodhi',
        'caṇḍala',
        'cūḷa',
        'deva',
        'dhamma',
        'diṭṭhi',
        'dukkha',
        'dūpama',
        //'eka',
        'gamā',
        'gatā',
        'giri',
        'gotta',
        'hatthi',
        'iccha',
        'indriya',
        'janīya',
        'kacca',
        'kaḷā',
        'kana',
        'kattha',
        'kamma',  // replaces "khamma"
        'khema',
        'koccha',
        'komāra',
        'kopama',
        'kumāra',
        'loma',
        'mahā',
        'mogga',
        'mutta',
        'nibbāna',
        'nimmā',
        'pada',
        'pari',
        'patti',
        'piṇḍi',
        'pokkha',
        'puṇḍa',
        'putta',
        'rāhu',
        'rāja',
        'ratha',
        'rīsa',
        'sacca',
        'saka',
        'sakula',
        'samaṇa',
        'sammā',
        'saṅk',
        'sati',
        'sevi',
        'suñña',
        'thaddha',
        'thulla',
        'tiṭṭhi',
        'vibhaṅga',
        'vinī',
        'vitakka',
        'yata',

    // sort by length first for longest match (e.g., suka vs. sukala)
    // sort alphabetically second for human maintenance
    ].sort((a,b)=> b.length - a.length || a.localeCompare(b));
    const VOWELS = "aāeiīouū";

    var FWS_PALI;

    class PaliHyphenator {
        constructor(opts={}) {
            // options
            this.hyphen = opts.hyphen || "\u00ad";
            this.maxWord = opts.maxWord || 25;
            this.minWord = opts.minWord || 5;
            this.chunkLen = this.minWord * 2 + 1;
            this.atomic = opts.atomic || atomic;
            this.verbose = opts.verbose;

            // instance
            var patVowels = `(${VOWELS.split('').join("|")})`;
            var reEndVowel = new RegExp(`${patVowels}$`, "ui");
            var patAtomic = [
                this.atomic.map(a=>reEndVowel.test(a)
                    ? a.replace(reEndVowel, patVowels)
                    : a).join('|'),
            ].join('');
            this.reAtomic = new RegExp(`(${patAtomic})`, "uig");
            this.reIsAtomic = new RegExp(`^(${patAtomic})$`, "ui");
        }

        static get VOWELS() {return VOWELS;}

        static isVowel(c) {
            return /a|ā|e|i|ī|o|u|ū/.test(c);
        }

        hyphenate(word, opts) {
            var {
                hyphen,
                chunkLen,
                maxWord,
                reAtomic,
                reIsAtomic,
                verbose,
            } = Object.assign({}, this, opts);
            if (word.length <= maxWord) {
                return word;
            }
            var v = typeof verbose === 'string'
                ? verbose === word
                : !!verbose;
            var atomicWords = word.replace(reAtomic, "-$1-")
                .replace('--', '-')
                .replace(/^(.?)-/, '$1')
                .replace(/-$/, '')
                .replace(/-kk/,'k-k');
            var that = this;
            v && console.log(`hyphenate(${word}) ${atomicWords}`);
            return atomicWords.split('-')
                .map(chunk => reIsAtomic.test(chunk)
                    ? chunk
                    : that._hyphenate(chunk, hyphen, chunkLen, v)
            ).join(hyphen);
        }

        _hyphenate(chunk, hyphen, chunkLen, verbose) {
            var len = chunk.length;
            var half = Math.trunc(len/2);
            var log = p => {
                var left = chunk.substring(0,half);
                var right = chunk.substring(half);
                console.log(
                    `hyphenate${p} (${len}/${chunkLen}) ${left}-${right}`);
            };
            if (len <= chunkLen) {
                verbose && log('0');
                return chunk;
            }
            var cLeft = chunk.charAt(half-1);
            var cRight = chunk.charAt(half);

            if (PaliHyphenator.isVowel(cLeft)) {
                if (PaliHyphenator.isVowel(cRight)) {
                    // half is fine
                    verbose && log('1.1');
                } else if (PaliHyphenator.isVowel(chunk.charAt(half+1))) {
                    // half is fine
                    verbose && log('1.2');
                } else { // two consonants
                    half++;
                    verbose && log('1.3');
                }
            } else {
                if (PaliHyphenator.isVowel(cRight)) {
                    if (cLeft === 'h') {
                        half++;
                        verbose && log('2.1.1');
                    } else {
                        half--;
                        verbose && log('2.1.2');
                    }
                } else if ( cLeft === cRight ) {
                    // doubled consonant
                    verbose && log('2.2');
                } else {
                    //half--;
                    verbose && log('2.3');
                }
            }
            var left = chunk.substring(0, half);
            var right = chunk.substring(half);
            var left = this._hyphenate(left, hyphen, chunkLen, verbose);
            var right = this._hyphenate(right, hyphen, chunkLen, verbose);
            return `${left}${hyphen}${right}`;
        }

    }

    module.exports = exports.PaliHyphenator = PaliHyphenator;
})(typeof exports === "object" ? exports : (exports = {}));

/***** PYTHON source renamed
import regex

atomics = {
    "dhamma",
    "putta",
    "deva",
    "khema",
    "vibhaṅga",
    "suñña",
    "mutta",
    "gotta",
    "yata",
    "mogga",
    "sevi",
    "saṅk",
    "rīsa",
    "mahā",
    "pari",
    "bodhi",
    "vitakka",
    "bahu",
    "khemā",
    "ratha",
    'rāja',
    'nibbāna',
    'sati',
    'dukkha',
    'vinī',
    'gatā',
    'cūḷa',
    'sacca',
    'rāhu',
    'piṇḍi',
    'Ānanda',
    'bhadde',
    'kaḷā',
    'bara',
    'indriya',
    'sakula',
    'samaṇa',
    'giri',
    'kumāra',
    'bala',
    'thulla',
    'caṇḍala',
    'pokkha',
    'loma',
    'kana',
    'iccha',
    'aṅguttara',
    'kattha',
    'koccha',
    'nimmā',
    'eka',
    'hatthi',
    'pada',
    'saka',
    'bāla',
    'komāra',
    'sammā',
    'diṭṭhi',
    'tiṭṭhi',
    'patti',
    'janīya',
    'thaddha',
    'kopama',
    'gamā',
    'dūpama',
    'bhacca',
    'khamma',
    'kacca',
    'puṇḍa'
    
}


cons = "(?:br|[kgcjtṭdḍbp]h|[kgcjtṭdḍp](?!h)|[mnyrlvshṅṇṃṃñḷ]|b(?![rh]))";
vowel_chars = 'aioueāīū'
vowel_pattern = '[' + vowel_chars.lower() + ']'
vowel_antipattern = '[^' + vowel_chars.lower() + '-]'

atomics_revoweled = [regex.sub(vowel_pattern + '$', vowel_pattern, atomic, flags=regex.I) for atomic in sorted(atomics, key=len, reverse=True)]

atomic_rex = regex.compile('({})'.format("|".join(atomics_revoweled)), flags=regex.I)

alpha_rex = regex.compile(r'\p{alpha}+')

def add_hyphens(match):
        atomic = match[0]
        if atomic[0] not in vowels:
            atomic = '-' + atomic
        if atomic[-1] not in vowels:
            atomic = atomic + '-'
        return atomic


def fix_hyphens(word):
    for i in range(0, 2):
        word = regex.sub(
            r'-({})({})'.format(cons, cons),
            r'\1-\2', 
            word, 
            flags=regex.I)
        word = regex.sub(
            r'([kgcjḍṭdtpb])-(h{})'.format(vowel_pattern),
            r'\1\2-',
            word,
            flags=regex.I)
    word = regex.sub(
        r'^(\p{alpha}{0,3})-',
        r'\1',
        word)
    word = regex.sub(
        r'-(\p{alpha}{0,3})$',
        r'\1',
        word)
    return word
    
def hyphenate(word, max_length):
    if len(word) <= max_length:
        return word

    word = atomic_rex.sub(r'-\1-', word)
    word = word.replace('--', '-')
    word = word.strip('-')
    word = fix_hyphens(word)
    
    for atomic in alpha_rex.findall(word):
        if len(atomic) > max_length:
            print('atomic too long: {}'.format(atomic))
    return word.replace('-', '\xad')

****/

