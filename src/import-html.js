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
            this.segRoot = {};
            this.segRef = {};
            this.div = 0;
            this.sc = '';
            this.lang = opts.lang || 'pli';
        }

        importLine(line,nextLine) {
            var {
                dstRoot,
                type,
                translator,
                segRoot,
            } = this;

            this.sc = this.scOfLine(line);
            if (line.match('<section')) {
                this.importId(line);
            } else if (line.match('class="division"')) {
                this.importDivision(line);
            } else if (line.match(/^<h1/)) {
                this.importH1(line);
            } else if (line.match(/^<h3/)) {
                this.importH3(line, nextLine);
            } else if (line.match(/^<\/?div/)) {
                this.importDiv(line);
            } else if (line.match(/^<p/)) {
                this.importText(line);
            }
        }

        scOfLine(line) {
            return /\bsc[0-9 ]*,/.test(line)
                ? line.replace(/.*\bsc([0-9]+).*/,'$1')
                : this.sc;
        }

        importDivision(line) {
            var {
                suid,
                segid,
                segRoot,
                sc,
            } = this;
            var text = this.rootText(line);
            segRoot[segid.scid] = text;
            this.segid = segid.add(0,1);
        }

        importH1(line) {
            var {
                suid,
                segid,
                segRoot,
                sc,
            } = this;
            var text = this.rootText(line);
            segRoot[segid.scid] = text;
            this.segid = segid.add(0,1);
        }

        importH3(line, nextLine) {
            var {
                suid,
                segid,
                segRoot,
                sc,
            } = this;
            var text = this.rootText(line);
            if (sc === '') {
                var nextSc = this.scOfLine(nextLine);
                if (nextSc === sc) {
                    this.segid = 
                    segid = new SuttaCentralId(`${suid}:1.0.1`);
                } else {
                    this.segid = 
                    segid = new SuttaCentralId(`${suid}:1.0`);
                }
                segRoot[segid.scid] = text;
                this.segid = segid.add(0,0,1);
            } else {
                segid = new SuttaCentralId(`${suid}:${Number(sc)+1}.0`);
                segRoot[segid.scid] = text;
                this.segid = segid.add(0,1);
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
                    this.lang = quoteParts.pop();
                }
            } else {
                this.div--;
            }
        }

        importText(line) {
            var {
                segid,
                suid,
                segRoot,
                segRef,
                sc,
            } = this;
            var ref = this.refText(line);
            var text = this.rootText(line);
            if (sc === '') {
                this.segid = segid.add(0,0,1);
            } else if (sc === '1') {
                segid = new SuttaCentralId(`${suid}:${sc}.1`);
                this.segid = segid.add(0,1);
            } else {
                var segParts = segid.segmentParts();
                if (segParts[0] !== sc) {
                    segid = new SuttaCentralId(`${suid}:${sc}.1`);
                }
                this.segid = segid.add(0,1);
            }
            segRoot[segid.scid] = text;
            ref && (segRef[segid.scid] = ref);
        }

        importId(line) {
            var {
                suid,
            } = this;
            var parts = line.split('"');
            parts.pop();
            var id = parts.pop();
            if (id !== suid) {
                throw new Error(`File/Id mismatch: ${suid} ${id}`);
            }
            return id;
        }

        rootText(line) {
            return line.replace(/.*<i>/,'').replace(/<\/i>.*/,'');
        }

        refText(line) {
            return line.match(/data-ref/) 
                ? line.replace(/.*data-ref="/,'').split('"')[0]
                : null;
        }

        transText(line) {
            return line.replace(/.*<b>/,'').replace(/<\/b>.*/,'');
        }
    }

    class ImportHtml {
        constructor(opts={}) {
            logger.logInstance(this, opts);
            this.srcRoot = opts.srcRoot || path.join(LOCAL_DIR, 'html');
            this.dstRoot = opts.dstRoot || BILARA_PATH;
            this.type = opts.type || 'root';
            this.translator = opts.translator || 'ms';
        }

        import(src) {
            var {
                srcRoot,
                dstRoot,
                type,
                translator,
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
                lang,
                nikayaFolder,
                segRoot,
                segRef,
            } = importer;

            // write root segments
            var dstDir = path.join(dstRoot, 'root', lang, translator,
                nikayaFolder);
            fs.mkdirSync(dstDir, {recursive: true});
            var dstPath = path.join(dstDir,
                `${suid}_root-${lang}-${translator}.json`);
            fs.writeFileSync(dstPath, JSON.stringify(segRoot, null, 2));
            var localPath = dstPath.replace(LOCAL_DIR,'').substring(1);
            this.log(`wrote ${localPath}`);

            // write reference segments
            var dstDir = path.join(dstRoot, 'reference', nikayaFolder);
            fs.mkdirSync(dstDir, {recursive: true});
            var dstPath = path.join(dstDir, `${suid}_reference.json`);
            fs.writeFileSync(dstPath, JSON.stringify(segRef, null, 2));
            var localPath = dstPath.replace(LOCAL_DIR,'').substring(1);
            this.log(`wrote ${localPath}`);

            return {
                suid,
                segRoot,
                segRef,
                lang,
                segments: Object.keys(segRoot).map(k => ({[k]:segRoot[k]})),
            }
        }
    }

    module.exports = exports.ImportHtml = ImportHtml;
})(typeof exports === "object" ? exports : (exports = {}));

