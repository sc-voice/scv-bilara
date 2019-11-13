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

    class ImportHtml {
        constructor(opts={}) {
            this.srcRoot = opts.srcRoot || path.join(LOCAL_DIR, 'html');
            this.dstRoot = opts.dstRoot || BILARA_PATH;
            this.type = opts.type || 'root';
            this.translator = opts.translator || 'ms';
            this.lang = opts.lang || 'pli';
        }

        import(src) {
            var {
                srcRoot,
                dstRoot,
                type,
                lang,
                translator,
            } = this;
            var srcPath = path.join(srcRoot, src);
            if (!fs.existsSync(srcPath)) {
                throw new Error(`import file not found:${srcPath}`);
            }
            var lines = fs.readFileSync(srcPath).toString().split('\n');
            var suid = src.replace('.html','');
            var segid = new SuttaCentralId(`${suid}:0.1`);
            var segMap = {};
            var div = 0;
            var context = {
                div,
                segid,
                suid,
                lines,
                segMap,
            }

            for (let i=0; i < lines.length; i++) {
                context.line = lines[i];
                if (context.line.match('<section')) {
                    this.importId(context);
                } else if (context.line.match(/^<h1/)) {
                    this.importH1(context);
                } else if (context.line.match(/^<h3/)) {
                    this.importH3(context);
                } else if (context.line.match(/^<\/?div/)) {
                    this.importDiv(context);
                } else if (context.line.match(/^<p/)) {
                    this.importText(context);
                }
            }

            var dstDir = path.join(dstRoot, 
                type,
                lang,
                translator,
                segid.nikayaFolder,
            );
            fs.mkdirSync(dstDir, {recursive: true});
            var dstPath = path.join(dstDir,
                `${suid}_${type}-${lang}-${translator}.json`);
            fs.writeFileSync(dstPath, JSON.stringify(segMap, null, 2));
            console.log(dstPath);

            return {
                segid,
                suid,
                segMap,
                lang: context.lang,
            }
        }

        importH1(context) {
            var {
                suid,
                line,
                segid,
                segMap,
            } = context;
            var text = this.rootText(line);
            segMap[segid.scid] = text;
            context.segid = segid.add(0,1);
        }

        importH3(context) {
            var {
                suid,
                line,
                segid,
                segMap,
            } = context;
            var text = this.rootText(line);
            segid = segid.add(1);
            segMap[segid.scid] = text;
            segid = segid.add(0,1);
            context.segid = segid;
        }

        importDiv(context) {
            var {
                div,
                line,
            } = context;
            var quoteParts = line.split('"');
            if (line.match(/<div/)) {
                context.div++;
                quoteParts.pop(); // >
                if (quoteParts[1] === 'text') {
                    context.lang = quoteParts.pop();
                }
            } else {
                context.div--;
            }
        }

        importText(context) {
            var {
                segid,
                line,
                suid,
                segMap,
            } = context;
            var text = this.rootText(line);
            segMap[segid.scid] = text;
            context.segid = segid.add(0,1);
        }

        importId(context) {
            var {
                line,
                suid,
            } = context;
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

        transText(line) {
            return line.replace(/.*<b>/,'').replace(/<\/b>.*/,'');
        }
    }

    module.exports = exports.ImportHtml = ImportHtml;
})(typeof exports === "object" ? exports : (exports = {}));

