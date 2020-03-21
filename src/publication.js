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
    const PUB_PREFIX = /^https:.*master\//;

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
                that._publication = fs.existsSync(pubPath)
                    ? json5.parse(await readFile(pubPath))
                    : {};
                that.pubEntries = Object.keys(that._publication)
                    .map(k=>that._publication[k]);

                that.initialized = true;
                resolve(that);
            } catch(e) {reject(e);} })()};
            return new Promise(pbody);
        }

        pubEntry(pubNum) {
            var entry = this._publication[pubNum];
            var {
                text_uid,
                parent_publication,
            } = entry;
            var parent = parent_publication
                ? this.pubEntry(parent_publication)
                : {};

            return Object.assign({}, parent, entry, {
                name: text_uid,
            });
        }

        text_uidInfo(tid) {
            var that = this;
            var {
                root,
                includeUnpublished,
            } = that;
            var loadPublished = ()=>{
                return that.pubEntries.reduce( (a,p) => {
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
                    var entry = that.pubEntry(p.publication_number);
                    if (!fs.existsSync(rootBilPath)) {
                        a[text_uid] = entry;
                    } else if (fs.statSync(rootBilPath).isFile()) {
                        a[text_uid] = entry;
                    } else {
                        var dirs = fs.readdirSync(rootBilPath);
                        subchapters = dirs.reduce(
                            (a,d) => (d.match(/.*json$/) ? false : a),
                            true);
                        a[text_uid] = entry;
                    }
                    entry.subchapters = subchapters;
                    return a;
                }, {});
            }
            if (this.text_uidMap == null && this.pubEntries) {
                Object.defineProperty(this, "text_uidMap", {
                    value: loadPublished(),
                });
            }
            return this.text_uidMap[tid];
        }

        pubPaths(opts={}) {
            var includeUnpublished = opts.includeUnpublished || 
                this.includeUnpublished;
            return this.pubEntries && this.pubEntries.reduce((a,p) => {
                if (includeUnpublished ||
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
                    ...this.pubPaths(), 
                    'root/pli/ms/sutta',
                    'root/pli/ms/vinaya',
                ];
                Object.defineProperty(this, "_rePubPaths", {
                    value: new RegExp(`(${published.join("|")}).*`),
                });
            }
            return this._rePubPaths.test(fpath);
        }

    }

    module.exports = exports.Publication = Publication;
})(typeof exports === "object" ? exports : (exports = {}));
