(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const json5 = require("json5");
    const {
        readFile,
    } = fs.promises;
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require('just-simple').JustSimple;
    const {
        execSync,
    } = require('child_process');
    const SegDoc = require('./seg-doc');
    const MLDoc = require('./ml-doc');
    const SuttaCentralId = require('./sutta-central-id');
    const FuzzyWordSet = require('./fuzzy-word-set');
    const Pali = require('./pali');
    const English = require('./english');
    const ExecGit = require('./exec-git');
    const PUB_PREFIX = /^https:.*translation\//;

    class Publication {
        constructor(opts={}) {
            this.name = opts.name || 'bilara-data';
            this.root = opts.root || path.join(LOCAL_DIR, this.name);
            this.lang = opts.lang || 'en';
            this.includeUnpublished = opts.includeUnpublished == null 
                ? false : opts.includeUnpublished;
            logger.logInstance(this, opts);
            this.authors = {};
            Object.defineProperty(this, "_sources", {
                writable: true,
                value: null,
            });
            Object.defineProperty(this, "_suttaIds", {
                writable: true,
                value: null,
            });
            this.initialized = false;
        }

        initialize(sync=false) {
            if (this.initialized) {
                return Promise.resolve(this);
            }
            var that = this;
            var pbody = (resolve, reject) => {(async function() { try {
                let pubPath = path.join(that.root, `_publication.json`);
                let pubJson = fs.existsSync(pubPath)
                    ? json5.parse(await readFile(pubPath))
                    : {};
                that.publication = Object.keys(pubJson)
                    .map(k=>pubJson[k]);

                that.initialized = true;
                resolve(that);
            } catch(e) {reject(e);} })()};
            return new Promise(pbody);
        }

        published() {
            var that = this;
            var {
                root,
                includeUnpublished,
            } = that;
            var loadPublished = ()=>{
                return that.publication.reduce( (a,p) => {
                    let {
                        is_published,
                        text_uid,
                        source_url,
                        publication_number,
                        parent_publication,
                    } = p;
                    var bilPath = source_url.replace(/.*master\//,'');
                    if (!includeUnpublished &&
                        is_published!=="true" && p.is_published!==true){
                        return a;
                    }
                    if (a[text_uid]) {
                        return a;
                    }
                    var rootBilPath = path.join(root, bilPath);
                    var subchapters = false;
                    var entry = {
                        name: text_uid,
                    }
                    if (publication_number) {
                        entry.publication_number = publication_number;
                    }
                    if (!fs.existsSync(rootBilPath)) {
                        a[text_uid] = entry;
                    } else if (fs.statSync(rootBilPath).isFile()) {
                        a[text_uid] = entry;
                    } else {
                        var dirs = fs.readdirSync(rootBilPath);
                        entry.subchapters = dirs.reduce(
                            (a,d) => (d.match(/.*json$/) ? false : a),
                            true);
                        a[text_uid] = entry;
                    }
                    return a;
                }, {});
            }
            if (this._published == null && this.publication) {
                Object.defineProperty(this, "_published", {
                    value: loadPublished(),
                });
            }
            return this._published;
        }

        publishedPaths() {
            return this.publication && this.publication.reduce((a,p) => {
                if (this.includeUnpublished ||
                    p.is_published==="true" || p.is_published===true) {
                    a.push(p.source_url.replace(PUB_PREFIX, ''));
                }
                return a;
            }, []).sort();
        }

        isPublishedPath(fpath) {
            if (!this.initialized) {
                throw new Error('Expected preceding call to initialize()');
            }
            if (this.includeUnpublished) {
                return true;
            }
            if (this._rePubPaths == null) {
                var published = [
                    ...this.publishedPaths(), 
                    'root/pli/ms/sutta',
                    'root/pli/ms/vinaya',
                ];
                this.log(`published paths:\n${published.join('\n')}`);
                Object.defineProperty(this, "_rePubPaths", {
                    value: new RegExp(`(${published.join("|")}).*`),
                });
            }
            return this._rePubPaths.test(fpath);
        }

    }

    module.exports = exports.Publication = Publication;
})(typeof exports === "object" ? exports : (exports = {}));
