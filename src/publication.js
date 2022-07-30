(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const json5 = require("json5");
    const {
        readFile,
    } = fs.promises;
    const { logger } = require('log-instance');
    const { Files } = require('memo-again');
    const {
        execSync,
    } = require('child_process');
    const SegDoc = require('./seg-doc');
    const MLDoc = require('./ml-doc');
    const BilaraPathMap = require('./bilara-path-map');
    const { SuttaCentralId } = require('scv-esm');
    const FuzzyWordSet = require('./fuzzy-word-set');
    const Pali = require('./pali');
    const English = require('./english');
    const ExecGit = require('./exec-git');
    const PUB_PREFIX = /^https:.*(master|published)\//;

    class Publication {
        constructor(opts={}) {
            (opts.logger || logger).logInstance(this, opts);
            this.name = opts.name || 'bilara-data';
            this.root = opts.root || path.join(Files.LOCAL_DIR, this.name);
            this.includeUnpublished = opts.includeUnpublished == null 
                ? false : opts.includeUnpublished;
            let bpOpts = this.includeUnpublished
                ? { root: this.root, rePath: /sutta|vinaya/ }
                : { root: this.root };
            this.bilaraPathMap = opts.bilaraPathMap || new BilaraPathMap(bpOpts);
            this.lang = opts.lang || 'en';
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
                await that.bilaraPathMap.initialize();
                let pubPath = path.join(that.root, `_publication.json`);
                that._publication = fs.existsSync(pubPath)
                    ? json5.parse(await readFile(pubPath))
                    : {};
                that.pubEntries = Object.entries(that._publication)
                    .filter(e=>{
                        // EXCLUDE NON-PALI TRANSLATIONS
                        return !/blurb/.test(e[1].source_url) &&
                            !/sutta\/[dems]a/.test(e[1].source_url);
                    })
                    .map(e=>that._publication[e[0]]);
                that.pubInfoMap = that.pubEntries.reduce((a,p) => {
                    var bilPath = p.source_url.replace(/.*(master|published)\//,'');
                    a[bilPath] = p;
                    return a;
                }, {});
                that.unpublished = that.pubEntries.reduce((a,p) => {
                    if (!that.includeUnpublished && p.unpublish) {
                        let {
                            translation_lang_iso: lang,
                            author_uid: author,
                            text_uid,
                        } = p;
                        p.unpublish.forEach(u => {
                            a.push(`${lang}/${author}/.*/${u}_`);
                        });
                    }
                    return a;
                }, []);
                that.reUnpublished = new RegExp(
                    that.unpublished.join('|')||'unpublished', "ui");
                if (that._rePubPaths == null) {
                    var published = [
                        ...that.pubPaths(), 
                        'root/pli/ms/sutta',
                        'root/pli/ms/vinaya',
                    ];
                    Object.defineProperty(that, "_rePubPaths", {
                        value: new RegExp(`(${published.join("|")}).*`,'u'),
                    });
                }

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
                        published,
                        text_uid,
                        source_url,
                        publication_number,
                        parent_publication,
                    } = p;
                    var bilPath = source_url.replace(/.*(master|published)\//,'');
                    if (!includeUnpublished) { 
                        if (is_published!=="true" && p.is_published!==true) {
                            return a;
                        }
                    }
                    if (a[text_uid]) {
                        return a;
                    }
                    var rootBilPath = path.join(root, bilPath);
                    var subchapters = false;
                    var entry = that.pubEntry(p.publication_number);
                    if (!fs.existsSync(rootBilPath)) {
                        a[text_uid] = entry;
                    } else {
                        var stat = fs.statSync(rootBilPath);
                        if (stat.isFile()) {
                            a[text_uid] = entry;
                        } else {
                            var dirs = fs.readdirSync(rootBilPath);
                            subchapters = dirs.reduce(
                                (a,d) => (d.match(/.*json$/) ? false : a),
                                true);
                            a[text_uid] = entry;
                        }
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
            var pubEntries = this.pubEntries || [];
            return pubEntries.reduce((a,p) => {
                let is_published = p.is_published==="true" || p.is_published===true;
                if (includeUnpublished || is_published) {
                    let bp = p.source_url.replace(PUB_PREFIX, ''); 
                    bp && a.push(bp);
                } else if (p.publish) {
                    let bp = p.source_url.replace(PUB_PREFIX, ''); 
                    bp && p.publish.forEach(pub=>{
                        let bpException = `${bp}/${pub}`;
                        a.push(bpException);
                    });
                }
                return a;
            }, []).sort();
        }

        pubInfo(suid) {
            if (!this.initialized) {
                throw new Error('Expected preceding call to initialize()');
            }
            let {
                bilaraPathMap: bpm,
                pubInfoMap,
            } = this;
            if (suid == null) {
                throw new Error(`Publication.pubInfo() suid is required`);
            }
            var suidParts = suid.split('/');
            var suidFilter = suidParts.length > 1 
                ? suidParts.slice(1).join('/')
                : null;
            var sps = bpm.suidPaths(suid);
            var spsKeys = sps && Object.keys(sps) || [];
            var spsValues = spsKeys.map(k=>sps[k]);
            var result = [];
            for (var isps = 0; isps < spsValues.length; isps ++) {
                var sp = spsValues[isps];
                if (suidFilter && sp.indexOf(suidFilter) < 0) {
                    continue;
                }

                var spParts = sp && sp.split('/') || [];
                while (spParts.length > 0) {
                    let key = spParts.join('/');
                    let info = pubInfoMap[key];
                    if (info) {
                        var entry = this.pubEntry(info.publication_number);
                        var spPath = path.dirname(sp);
                        // subchapters are an1, vagga1, etc.
                        entry.subchapters = /[0-9]$/.test(spPath);
                        result.push(entry);
                        break;
                    }
                    spParts.pop();
                }
            }

            return result;
        }

        isPublishedPath(fpath) {
            if (!this.initialized) {
                throw new Error('Expected preceding call to initialize()');
            }
            if (!fpath) {
                return false;
            }
            let {
                bilaraPathMap: bpm,
                _rePubPaths: rePublished,
                reUnpublished,
            } = this;
            var sp = bpm.suidPath(fpath);
            let isSuid = rePublished.test(sp);
            let isPub = rePublished.test(sp) || rePublished.test(fpath);
            let isUnpub = reUnpublished.test(sp) || reUnpublished.test(fpath);
            let pub = isPub && !isUnpub;
            //this.debug(`isPublishedPath`, {sp, fpath, isPub, isUnpub, })
            return pub;
        }

    }

    module.exports = exports.Publication = Publication;
})(typeof exports === "object" ? exports : (exports = {}));
