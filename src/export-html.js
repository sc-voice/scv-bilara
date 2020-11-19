(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const { logger } = require('log-instance');
    const BilaraData = require('./bilara-data');
    const Seeker = require('./seeker');
    const SuttaCentralId = require('./sutta-central-id');

    class ExportHtml {
        constructor(opts={}) {
            (opts.logger || logger).logInstance(this);
            this.groupBy= opts.groupBy || 'line';
            this.sync = opts.sync;
            this.linebreak = opts.linebreak || '<br/>\n';
            this.scLinks = opts.scLinks;
            this.html = Object.assign({
                root: {
                    verse: ['blockquote','p','strong'],
                },
                translation: {
                    verse: ['blockquote','p'],
                },
            }, opts.html);

            let maxResults = this.maxResults = opts.maxResults || 1000;
            let includeUnpublished = opts.includeUnpublished || false;
            let readFile = opts.readFile || false;
            let execGit = opts.execGit;
            let bilaraData = this.bilaraData = opts.bilaraData || new BilaraData({
                includeUnpublished,
                execGit,
                logger: this,
            });
            this.seeker = new Seeker({
                maxResults,
                bilaraData,
                readFile,
                logger: this,
            });
        }

        get initialized() {
            return this.bilaraData.initialized &&
                this.seeker.initialized;
        }

        async initialize() { try {
            await this.bilaraData.initialize(this.sync);
            await this.seeker.initialize();
            return this;
        } catch(e) {
            this.warn(`initialize()`, e.message);
            throw e;
        }}

        suttacentralLink(scid, lang, author_uid) {
            var suid = scid.split(':')[0];
            var linkText = new SuttaCentralId(scid).standardForm();
            var link =  `https://suttacentral.net/${suid}`;
            if (lang) {
                var author = author_uid.split(', ')[0] || author_uid;
                link =  `https://suttacentral.net/${suid}/${lang}/${author}#${scid}`;
            }
            return `<a href="${link}">${linkText}</a>`;
        }

        printVerse(verse, author_uid, lang, showPli, showEn) {
            if (!verse.length) {
                return;
            }
            showPli && this.printVerseLang(verse, 'pli', undefined);
            showEn && this.printVerseLang(verse, 'en', 'sujato');
            this.printVerseLang(verse, lang, author_uid);
        }

        printVerseLang(verse, lang, author_uid) {
            var {
                scLinks,
                linebreak,
                html,
            } = this;
            let scid = verse[0].scid;
            let linkLang = lang === 'pli' ? undefined : lang;
            let isRoot = lang === 'pli'
            let author = isRoot ? undefined : author_uid;
            let scLink = scLinks
                ? `${this.suttacentralLink(scid, linkLang, author)} `
                : '';
            let prefix = `${scLink}`;
            let text = verse.reduce((a,seg)=>{
                if (seg[lang]) {
                    a +=  a ? linebreak : prefix;
                    a += seg[lang].trim();
                }
                return a;
            }, '');
            let elements = isRoot ? html.root.verse : html.translation.verse;
            let htmlStart = elements.reduce((a,elt)=>`${a}<${elt}>`, '');
            let htmlEnd = elements.reduce((a,elt)=>`</${elt}>${a}`, '');
            text && console.log(`${htmlStart}${text}${htmlEnd}`);
        }

        exportVerse(res, pattern, n=0) {
            var {
                lang,
                searchLang,
            } = res;
            n = Number(n);
            let showPli = n===2 && searchLang===lang || 
                n>2 && searchLang!=='pli' && lang!=='pli';
            let showEn = n>2 && searchLang!=='en' && lang!=='en';
            res.mlDocs.forEach(mld => {
                var suid = mld.suid;
                let segments = mld.segments();
                let anyMatched = segments.reduce((s,a)=>s.matched || a, false);
                let matched = !anyMatched;
                let verse = [];
                segments.forEach((seg,i) => {
                    var scid = seg.scid;
                    if (/\.1$/.test(scid)) {
                        matched && this.printVerse(verse, mld.author_uid, 
                            lang, showPli, showEn);
                        verse = [];
                        matched = anyMatched;
                    }
                    matched = matched || seg.matched;
                    verse.push(seg);
                    if (i === segments.length && matched) {
                        this.printVerse(verse, mld.author_uid, lang, showPli, showEn);
                    }

                });
            });
        }

        async export(suid) { try {
            let {
                bilaraData,
                seeker: skr,
            } = this;

            var findOpts = {
                pattern: suid,
                matchHighlight: '',
            };
            logger.info(`findOpts`, findOpts);
            var msStart = Date.now();
            var res = await skr.find(findOpts);
            var secElapsed = (Date.now() - msStart)/1000;
            logger.info(`find() ${secElapsed.toFixed(1)}s`);
            this.exportVerse(res, suid, 1);
        } catch(e) { 
            this.warn(`export()`, e.message);
            throw e;
        }}
    }

    module.exports = exports.ExportHtml = ExportHtml;
})(typeof exports === "object" ? exports : (exports = {}));
