(function(exports) {
    const { SuttaCentralId } = require('scv-esm');

    class Verse { 
        constructor(opts={}) {
            this.lang =  opts.lang || 'en';
            this.searchLang = opts.searchLang;
            this.showPli = opts.showPli;
            this.showEn = opts.showEn;
            this.linkBase = opts.linkBase || `https://suttacentral.net`;
            this.linebreak = opts.linebreak || '<br/>';
        }

        suttacentralLink(scid, lang=this.lang, author_uid) {
            let {
                linkBase,
            } = this;
            var suid = scid.split(':')[0];
            var linkText = new SuttaCentralId(scid).standardForm();
            var link = `${linkBase}/${suid}`;
            let linkLang = lang === 'pli' ? undefined : lang;
            if (linkLang && author_uid) {
                var author = author_uid.split(', ')[0] || author_uid;
                link =  `${linkBase}/${suid}/${linkLang}/${author}#${scid}`;
            }
            return `[${linkText}](${link})`;
        }

        versifyLang(verse, lang=this.lang, author_uid) {
            let {
                linebreak,
            } = this;
            let scid = verse[0].scid;
            let author = lang == 'pli' 
                ? undefined 
                : author_uid;
            let scLink = this.suttacentralLink(scid, lang, author);
            let prefix = `>${scLink}:`;
            let text = verse.reduce((a,seg)=>{
                if (seg[lang]) {
                    a += linebreak;
                    a += seg[lang].trim();
                }
                return a;
            }, prefix);

            return text;
        }

        versify(segments, lang=this.lang, author_uid) {
            let {
                searchLang,
                showPli,
                showEn,
            } = this;

            let suid = segments[0].scid.split(":")[0];
            let allMatched = !segments.some(s=>s.matched);
            let matched = allMatched;
            let verse = [];
            let lines = [];
            let printVerse = (verse, author_uid) => {
                if (!verse.length) {
                    return;
                }
                showPli && lines.push(this.versifyLang(verse, 'pli', undefined));
                showEn && lines.push(this.versifyLang(verse, 'en', 'sujato'));
                lines.push(this.versifyLang(verse, lang, author_uid));
            };
            let iLast = segments.length - 1;
            segments.forEach((seg,i) => {
                var scid = seg.scid;
                if (/\.1$|\.1[^.0-9:]/.test(scid)) {
                    matched && printVerse(verse, author_uid);
                    verse = [];
                    matched = allMatched;
                }
                matched = matched || !!seg.matched;
                verse.push(seg);
                if (i === iLast && matched) {
                    printVerse(verse, author_uid);
                }
            });
            return lines;
        }

    }

    module.exports = exports.Verse = Verse;
})(typeof exports === "object" ? exports : (exports = {}));
