(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const FuzzyWordSet = require('./fuzzy-word-set');
    const {
        logger,
    } = require('just-simple').JustSimple;
    const nonhyphenated = [
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
        'eka',
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
        'khamma',
        'khema',
        'khemā',
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

    ].sort((a,b)=> b.length - a.length || a.localeCompare(b));

    const reConsonant = /(?:br|[kgcjtṭdḍbp]h|[kgcjtṭdḍp](?!h)|[mnyrlvshṅṇṃṃñḷ]|b(?![rh]))/;
    const reVowel = /[aioueāīū]/;
    /*
    const nonhyphenated_revoweled = [
        regex.sub(reVowel + '$', reVowel, segment, flags=regex.I) 
            for segment in sorted(nonhyphenated, key=len, reverse=True)
    ]
    }*/

/*



nonhyphenated_revoweled = [regex.sub(reVowel + '$', reVowel, segment, flags=regex.I) for segment in sorted(nonhyphenated, key=len, reverse=True)]

segment_rex = regex.compile('({})'.format("|".join(nonhyphenated_revoweled)), flags=regex.I)

alpha_rex = regex.compile(r'\p{alpha}+')

def addHyphens(match):
        segment = match[0]
        if segment[0] not in vowels:
            segment = '-' + segment
        if segment[-1] not in vowels:
            segment = segment + '-'
        return segment


def fix_hyphens(word):
    for i in range(0, 2):
        word = regex.sub(r'-({})({})'.format(reConsonant, reConsonant), r'\1-\2', word, flags=regex.I)
        word = regex.sub(r'([kgcjḍṭdtpb])-(h{})'.format(reVowel), r'\1\2-', word, flags=regex.I)
    word = regex.sub(r'^(\p{alpha}{0,3})-', r'\1', word)
    word = regex.sub(r'-(\p{alpha}{0,3})$', r'\1', word)
    return word
    

def hyphenate(word, max_length):
    if len(word) <= max_length:
        return word

    word = segment_rex.sub(r'-\1-', word)
    word = word.replace('--', '-')
    word = word.strip('-')
    word = fix_hyphens(word)
    
    for segment in alpha_rex.findall(word):
        if len(segment) > max_length:
            print('Segment too long: {}'.format(segment))
    return word.replace('-', '\xad')
    
*/


    var FWS_PALI;

    class Pali {
        constructor(opts={}) {
            this.hyphen = opts.hyphen || "\u00ad";
            this.maxWord = opts.maxWord || 30;
            this.minWord = opts.minWord || 5;
            this.nonhyphenated = opts.nonhyphenated || nonhyphenated;
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

