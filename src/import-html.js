(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require('just-simple').JustSimple;
    const SuttaCentralId = require('./sutta-central-id');
    const BILARA_PATH = path.join(LOCAL_DIR, 'bilara-data');

    class Importer {
        constructor(suid, opts={}) {
            logger.logInstance(this, opts);
            this.suid = suid;
            this.segid = new SuttaCentralId(`${suid}:0.1`);
            this.nikayaFolder = this.segid.nikayaFolder;
            this.section = 0;
            this.segVar = {};
            this.segRoot = {};
            this.segTrans = {};
            this.segRef = {};
            this.segHtml = { };
            this.header = 0;
            this.div = 0;
            this.sc = '';
            this.rootLang = opts.rootLang || 'pli';
        }

        importLine(line,nextLine) {
            var {
                segid_1,
                segHtml,
            } = this;
            var { segid, sc } = this.identifyLine(line);
            this.segid = segid;
            this.sc = sc;
            if (line.match('<section')) {
                this.importId(line);
            } else if (line.match('class="division"')) {
                this.importDivision(line);
            } else if (line.match(/^<h[1-9]/)) {
                this.importH(line, nextLine);
            } else if (line.match(/^<\/?div/)) {
                this.importDiv(line);
            } else if (line.match(/^<p/)) {
                this.importText(line);
            } else if (line.match(/^<a\b/)) {
                this.importText(line);
            }
        }

        scOfLine(line) {
            return /\bsc[0-9 ]*,/.test(line)
                ? line.replace(/.*\bsc([0-9]+).*/,'$1')
                : this.sc;
        }

        importId(line) {
            var {
                suid,
                segid,
            } = this;
            var parts = line.split('"');
            parts.pop();
            var id = parts.pop();
            if (id !== suid) {
                throw new Error(`File/Id mismatch: ${suid} ${id}`);
            }
            return id;
        }

        importDivision(line) {
            var {
                suid,
                segid,
                section,
                segRoot,
                segTrans,
                segHtml,
            } = this;
            this.segid_1 = segid;
            segRoot[segid.scid] = this.rootText(line);
            segTrans[segid.scid] = this.transText(line);
            segHtml[segid.scid] = this.htmlText(line, 'division');
            this.segid = segid.add(0,1);
        }

        identifyLine(line) {
            var parts = line.split('data-uid="');
            var {
                segid,
                sc:scCur,
            } = this;
            var sc = /\bdata-ref.*sc[0-9 ]+/.test(line)
                ? line.replace(/.*\bsc([0-9]+).*/,'$1')
                : scCur;
            return { segid, sc };
        }

        importH(line, nextLine, h) {
            var {
                suid,
                segid,
                sc,
                section,
                segid_1,
                segRoot,
                segTrans,
                segHtml,
            } = this;
            var h = line.substring(1,3);
            if (h === 'h1') {
                var text = this.rootText(line);
                this.segid_1 = segid;
                segRoot[segid.scid] = text;
                segTrans[segid.scid] = this.transText(line);
                segHtml[segid.scid] = this.htmlText(line, 'h1');
                this.segid = segid.add(0,1);
            } else {
                if (sc === '') {
                    var nextSc = this.scOfLine(nextLine);
                    var segParts = segid.segmentParts();
                    if (nextSc === sc) {
                        this.segid = 
                        segid = new SuttaCentralId(`${suid}:1.0.1`);
                    } else if (segParts.length === 2) {
                        this.segid = 
                        segid = new SuttaCentralId(`${suid}:1.0`);
                    } else {
                        // e.g., ds1.2.html first h3
                    }
                    this.segid = segid.add(0,0,1);
                } else {
                    segid = new SuttaCentralId(`${suid}:${Number(sc)+1}.0`);
                    this.segid = segid.add(0,1);
                }
                this.segid_1 = segid;
                segRoot[segid.scid] = this.rootText(line);
                segTrans[segid.scid] = this.transText(line);
                segHtml[segid.scid] = this.htmlText(line, h);
            }
        }

        importDiv(line) {
            var {
                div,
            } = this;
            var quoteParts = line.split('"');
            if (line.match(/<div/)) {
                this.div++;
                quoteParts.pop(); // >
                if (quoteParts[1] === 'text') {
                    this.rootLang = quoteParts.pop();
                }
            } else {
                this.div--;
            }
        }

        importText(line) {
            var {
                segid_1,
                section,
                suid,
                segRoot,
                segTrans,
                segVar,
                segRef,
                segHtml,
                segid,
                sc,
            } = this;
            var refText = this.refText(line);
            var varText = this.varText(line);
            var text = this.rootText(line);
            var lastSegParts = segid_1.segmentParts();
            var curSegParts = segid.segmentParts();
            var cls = '';
            if (/p class=/.test(line)) {
                cls = line.split('class="')[1].split('"')[0];
            }
            if (this.sc === '' || this.sc < 6) {
                let s = this.segRoot['ds2.1.1:1.0'];
            }
            if (sc === '') {
                var segParts = segid.segmentParts();
                this.segid = segParts.length === 2
                    ? segid.add(0,1)
                    : segid.add(0,0,1);
            } else if (sc === '1' && (
                curSegParts[curSegParts.length-1]==='0' ||
                curSegParts[1]==='0' ||
                curSegParts[0] !== '1')) {
                segid = new SuttaCentralId(`${suid}:${sc}.1`);
                this.segid = segid.add(0,1);
            } else {
                if (curSegParts[0] !== sc) {
                    segid = new SuttaCentralId(`${suid}:${sc}.1`);
                }
                this.segid = segid.add(0,1);
            }
            segRoot[segid.scid] = text;
            segTrans[segid.scid] = this.transText(line);
            refText && (segRef[segid.scid] = refText);
            varText && (segVar[segid.scid] = varText);

            // HTML
            var p = cls ? `<p class='${cls}'>` : `<p>`;
            if (segHtml[segid_1.scid].match(/{}<\/p>$/)) {
                if (segid.scid.match(/\.1$/) || cls) {
                    segHtml[segid.scid] = `${p}{}</p>`;
                } else {
                    segHtml[segid_1.scid] = segHtml[segid_1.scid]
                        .replace(/<\/p>/,'');
                    segHtml[segid.scid] = `{}</p>`;
                }
            } else {
                segHtml[segid.scid] = `${p}{}</p>`;
            }

            this.segid_1 = segid;
        }

        htmlText(line, element) {
            var {
                suid,
                segid,
                section,
                segid,
                sc,
            } = this;
            var sectid = segid.sectionParts();
            if (element === 'header') {
                return this.header++ === 0
                    ? `<header><p class='collection'>{}</p>`
                    : `<p class='collection'>{}</p>`;
            } else if (element === 'division') {
                return this.header++ === 0
                    ? `<header><p class='division'>{}</p>`
                    : `<p class='division'>{}</p>`;
            } else if (element === 'kanda') {
                return this.header++ === 0
                    ? `<header><p class='kanda'>{}</p>`
                    : `<p class='kanda'>{}</p>`;
            } else if (element === 'vagga') {
                return this.header++ === 0
                    ? `<header><p class='vagga'>{}</p>`
                    : `<p class='vagga'>{}</p>`;
            } else if (element === 'section') {
                this.section = ++section;
                return [
                    `<section class='sutta' data-uid='${sectid}' `+
                        `id='${section}'>`,
                    `<article>`,
                    `<div class='hgroup'>`,
                    `<h1>{}</h1>`,
                    `</div>`,
                ].join('');
            }
            if (element === 'h1') {
                return `<h1>{}</h1></header>`;
            }
            if (element === 'h2') {
                return `<h2>{}</h2>`
            }
            if (element === 'h3') {
                return `<h3>{}</h3>`
            }

            return '{}';
        }

        rootText(line) {
            var parts = line.split('<i>');
            parts.shift(); // discard stuff preceding <i>
            return parts.map(p=>p.replace(/<\/i>.*/,'')).join('\n');
        }

        refText(line) {
            return line.match(/data-ref/) 
                ? line.replace(/.*data-ref="/,'').split('"')[0]
                : null;
        }

        varText(line) {
            return line.match(/data-var/) 
                ? line.replace(/.*data-var="/,'').split('"')[0]
                : null;
        }

        transText(line) {
            var parts = line.split('<b>');
            parts.shift(); // discard stuff preceding <b>
            return parts.map(p=>p.replace(/<\/b>.*/,'')).join('\n');
        }

    }

    class ImportHtml {
        constructor(opts={}) {
            logger.logInstance(this, opts);
            this.srcRoot = opts.srcRoot || path.join(LOCAL_DIR, 'html');
            this.dstRoot = opts.dstRoot || BILARA_PATH;
            this.type = opts.type || 'root';
            this.author = opts.author || 'ms';
            this.rootLang = opts.rootLang || 'pli';
            this.translator = opts.translator || 'sujato';
            this.transLang = opts.transLang || 'en';
        }

        import(src) {
            var {
                srcRoot,
                dstRoot,
                nikayaFolder,
                type,
                author,
                rootLang,
                translator,
                transLang,
            } = this;
            var srcPath = path.join(srcRoot, src);
            if (!fs.existsSync(srcPath)) {
                throw new Error(`import file not found:${srcPath}`);
            }
            var lines = fs.readFileSync(srcPath).toString().split('\n');
            var suid = src.replace('.html','');

            var importer = new Importer(suid, this);
            for (let i=0; i < lines.length; i++) {
                importer.importLine(lines[i], lines[i+1]);
            }
            var {
                segid_1,
                nikayaFolder,
                segRoot,
                segTrans,
                segRef,
                segVar,
                segHtml,
            } = importer;
            //console.log(`dbg nikayaFolder`,nikayaFolder);
            var segids = Object.keys(segRoot)
                .sort(SuttaCentralId.compareLow);
            var nsegids = segids.length;

            // write root segments
            var dstDir = path.join(dstRoot, 'root', rootLang, author,
                nikayaFolder);
            fs.mkdirSync(dstDir, {recursive: true});
            var dstPath = path.join(dstDir,
                `${suid}_root-${rootLang}-${author}.json`);
            fs.writeFileSync(dstPath, JSON.stringify(segRoot, null, 2));
            var localPath = dstPath.replace(LOCAL_DIR,'').substring(1);
            this.log(`root => ${localPath}`);

            // write translation segments
            var dstDir = path.join(dstRoot, 
                'translation', transLang, translator,
                nikayaFolder);
            fs.mkdirSync(dstDir, {recursive: true});
            var dstPath = path.join(dstDir,
                `${suid}_translation-${transLang}-${translator}.json`);
            fs.writeFileSync(dstPath, JSON.stringify(segTrans, null, 2));
            var localPath = dstPath.replace(LOCAL_DIR,'').substring(1);
            this.log(`translation => ${localPath}`);

            // write reference segments
            var dstDir = path.join(dstRoot, 'reference', nikayaFolder);
            fs.mkdirSync(dstDir, {recursive: true});
            var dstPath = path.join(dstDir, `${suid}_reference.json`);
            fs.writeFileSync(dstPath, JSON.stringify(segRef, null, 2));
            var localPath = dstPath.replace(LOCAL_DIR,'').substring(1);
            this.log(`wrote reference ${localPath}`);

            // write variant segments
            var dstDir = path.join(dstRoot, 'variant', nikayaFolder);
            fs.mkdirSync(dstDir, {recursive: true});
            var dstPath = path.join(dstDir, 
                `${suid}_variant-${rootLang}-${author}.json`);
            fs.writeFileSync(dstPath, JSON.stringify(segVar, null, 2));
            var localPath = dstPath.replace(LOCAL_DIR,'').substring(1);
            this.log(`wrote variant ${localPath}`);

            // write Html segments
            var dstDir = path.join(dstRoot, 'html', nikayaFolder);
            fs.mkdirSync(dstDir, {recursive: true});
            var dstPath = path.join(dstDir, `${suid}_html.json`);
            fs.writeFileSync(dstPath, JSON.stringify(segHtml, null, 2));
            var localPath = dstPath.replace(LOCAL_DIR,'').substring(1);
            this.log(`wrote ${localPath}`);

            return {
                suid,
                segTrans,
                segVar,
                segRoot,
                segRef,
                segHtml,
                rootLang,
                author,
                translator,
                transLang,
                segments: Object.keys(segRoot).map(k => ({[k]:segRoot[k]})),
            }
        }
    }

    module.exports = exports.ImportHtml = ImportHtml;
})(typeof exports === "object" ? exports : (exports = {}));

