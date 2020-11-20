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
                verse: [
                    '<div class="verse" id="$SCID">\n$LINK',
                ],
                rootVerse: [
                    '<p class="pali_verse_paragraph" lang="pi" translate="no">',
                ],
                transVerse: [
                    '<p class="translation_verse_paragraph" lang="en">',
                ],
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

        elementName(elt) {
            return elt.replace(/< *([^ ]*)(\n|.)*/mi,'$1'); 
        }

        printVerse(verse, author_uid, lang, showPli, showEn) {
            let {
                html,
            } = this;
            let lines = [];
            if (!verse.length) {
                return lines;
            }
            let scid = verse[0].scid;
            let suid = scid.split('#')[0];
            var linkText = new SuttaCentralId(scid).standardForm();
            let link = this.suttacentralLink(scid, lang, author_uid);
            let elements = (html.verse || []).map(elt=>{
                elt = elt.replace(/\$SCID/,scid);
                elt = elt.replace(/\$LINK/,link);
                return elt;
            });
            if (showPli) {
                lines = lines.concat(this.printVerseLang(verse, 'pli', undefined));
            }
            if (showEn) {
                liens = lines.concat(this.printVerseLang(verse, 'en', 'sujato'));
            }
            lines = lines.concat(this.printVerseLang(verse, lang, author_uid));

            if (lines.length) {
                let htmlStart = elements.reduce((a,elt)=>`${a}${elt}`, '');
                let htmlEnd = elements.reduce((a,elt)=>
                    `</${this.elementName(elt)}>${a}`, '');
                lines = [htmlStart, ...lines, htmlEnd];
            }
            return lines;
        }

        printVerseLang(verse, lang, author_uid) {
            var {
                scLinks,
                linebreak,
                html,
            } = this;
            let lines = [];
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
            let elements = isRoot ? html.rootVerse : html.transVerse;
            let htmlStart = elements.reduce((a,elt)=>`${a}${elt}`, '');
            let htmlEnd = elements.reduce((a,elt)=>
                `</${this.elementName(elt)}>${a}`, '');
            text && (lines = [ htmlStart, text, htmlEnd, ]);
            return lines;
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
            let lines = [];
            res.mlDocs.forEach(mld => {
                let {
                    suid,
                    author_uid,
                } = mld;
                let segments = mld.segments();
                let allMatched = segments.reduce((s,a)=>s.matched ? a : false, true);
                let matched = !allMatched;
                let verse = [];
                segments.forEach((seg,i) => {
                    var scid = seg.scid;
                    if (/\.1$/.test(scid)) {
                        if (matched) {
                            lines = lines.concat(
                                this.printVerse(verse, author_uid, lang, 
                                    showPli, showEn));
                        }
                        verse = [];
                        matched = !allMatched;
                    }
                    matched = matched || seg.matched;
                    verse.push(seg);
                    if (i === segments.length && matched) {
                        lines = lines.concat(
                            this.printVerse(verse, author_uid, lang, showPli, showEn));
                    }

                });
            });
            return lines;
        }

        async export(suid, nLang) { try {
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
            return this.exportVerse(res, suid, nLang);
        } catch(e) { 
            this.warn(`export()`, e.message);
            throw e;
        }}
    }

    module.exports = exports.ExportHtml = ExportHtml;
})(typeof exports === "object" ? exports : (exports = {}));
