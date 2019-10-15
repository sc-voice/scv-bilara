(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const {
        js,
        logger,
        LOCAL_DIR,
    } = require('just-simple').JustSimple;
    const {
        execSync,
    } = require('child_process');
    const Translation = require('./translation');
    const SuttaCentralId = require('./sutta-central-id');
    const ExecGit = require('./exec-git');

    const BILARA_DATA_GIT = 'https://github.com/sc-voice/bilara-data.git';

    class BilaraData {
        constructor(opts={}) {
            this.name = opts.name || 'bilara-data';
            this.root = opts.root || path.join(LOCAL_DIR, 'bilara-data');
            logger.logInstance(this, opts);
            this.nikayas = opts.nikayas || ['an','mn','dn','sn', 'kn'];
            this.execGit = opts.execGit || new ExecGit(BILARA_DATA_GIT);
            this.reNikayas = new RegExp(
                `/(${this.nikayas.join('|')})/`, 'ui');
            Object.defineProperty(this, "_suttaMap", {
                writable: true,
                value: null,
            });
            this.initialized = false;
        }

        initialize() {
            if (this.initialized) {
                return Promise.resolve(this);
            }
            return new Promise((resolve, reject) => {
                var that = this;
                (async function() { try {
                    await that.sync();

                    var map = that.suttaMap = {};
                    var transRoot = path.join(that.root, 'translation');
                    if (!fs.existsSync(transRoot)) {
                        throw new Error(
                            `Directory "transRoot" not found:${transRoot}`); 
                    }
                    that.translations = that.dirFiles(transRoot)
                        .filter(f => that.isSuttaPath(f));
                    that.translations.forEach((f,i) => {
                        var file = f.replace(/.*\/translation\//,'translation/');
                        var parts = file.split('/');
                        var lang = parts[1];
                        var author = parts[2];
                        var nikaya = parts[3];
                        var suid = parts[parts.length-1].split('_')[0].toLowerCase();
                        map[suid] = map[suid] || [];
                        map[suid].push({
                            suid,
                            lang,
                            nikaya,
                            author,
                            translation: file,
                        });
                    });
                    var uidExpPath = path.join(that.root, 
                        '.voice', 'uid_expansion.json');
                    that.uid_expansion = JSON.parse(fs.readFileSync(uidExpPath));

                    that.initialized = true;
                    resolve(that);
                } catch(e) {reject(e);} })();
            });
        }

        sync() {
            return this.execGit.sync();
        }

        isSuttaPath(fpath) {
            return this.reNikayas.test(fpath);
        }

        suttaInfo(suid) {
            if (!this.initialized) {
                throw new Error('Expected preceding call to initialize()');
            }
            return this.suttaMap[suid];
        }

        dirFiles(root) {
            var files = [];
            var cmd = `find ${root} -path '*.git*' -prune -o -type f -print`;
            var execOpts = {
                cwd: LOCAL_DIR,
            };
            var res = execSync(cmd, execOpts).toString();
            return res.split('\n');
        }

        loadTranslation(opts={}) {
            if (!this.initialized) {
                throw new Error('Expected preceding call to initialize()');
            }
            var {
                suid,
                lang,
                author,
            } = opts;
            var info = this.suttaInfo(suid);
            if (info == null) {
                return new Error(`no suttaInfo({suid:${suid})`);
            }
            info.sort((a,b) => {
                try {
                    var cmp = a.lang.localeCompare(b.lang);
                    if (cmp === 0) {
                        cmp = a.author.localeCompare(b.author);
                    }
                } catch(e) {
                    logger.error(`a:${js.simpleString(a)} `);
                    logger.error(`b:${js.simpleString(b)} `);
                    throw e;
                }
            });
            if (lang == null && author == null) {
                lang = info[0].lang;
                author = info[0].author;
            }
            var suttaInfo = info.filter( i => 
                (!lang || i.lang === lang) && 
                (!author || i.author === author)
            )[0];
            if (suttaInfo == null || suttaInfo.translation == null) {
                this.log(`loadTranslation(${suid}) info:${js.simpleString(info)}`);
                throw new Error(
                    `No information for ${suid}/${lang}/${author}`);
            }
            return new Translation(suttaInfo).load(this.root);
        }

        normalizeSuttaId(id) {
            if (!this.initialized) {
                throw new Error(`${this.constructor.name}.initialize() required`);
            }
            var {
                suttaMap,
                uid_expansion,
            } = this;
            var suttaIds = Object.keys(suttaMap);
            if (typeof id !== 'string') {
                if (id.scid) {
                    id = id.scid;
                } else {
                    throw new Error(`expected string:${JSON.stringify(id)}`);
                }
            }
            id = id.trim();
            var sutta_uid = null;
            if (/[^0-9][1-9]/.test(id)) {
                var tokens = id.toLowerCase().split(' ');
                if (tokens.length > 1) {
                    var matches = uid_expansion.filter(ue => 
                        0 === ue.acro.toLowerCase().localeCompare(tokens[0]));
                    if (matches.length > 0) {
                        sutta_uid = `${matches[0].uid}${tokens.slice(1).join('')}`;
                    }
                }
                sutta_uid = sutta_uid || id;
            }
            sutta_uid = sutta_uid && suttaIds.filter(sid => {
                return SuttaCentralId.compareLow(sid, sutta_uid) <= 0 &&
                    0 <= SuttaCentralId.compareHigh(sid, sutta_uid);
            })[0] || sutta_uid;
            return sutta_uid;
        }

        suttaPath(...args) { // DEPRECATED: use translationPaths
            this.log(`DEPRECATED: suttaPath => translationPaths`);
            return this.translationPaths.apply(this, args)[0];
        }

        translationPaths(...args) {
            if (!this.initialized) {
                throw new Error(`${this.constructor.name}.initialize() is required`);
            }
            var opts = args[0];
            if (typeof opts === 'string') {
                var opts = {
                    scid: args[0],
                    lang: args[1],
                    //language: args[1], // DEPRECATED
                    author_uid: args[2],
                }
            }
            // TODO mn1/en/sujato sutta_uid
            var scid = new SuttaCentralId(opts.scid || opts.sutta_uid);
            var sutta_uid = this.normalizeSuttaId(scid.sutta);
            if (!sutta_uid) {
                throw new Error('sutta_uid is required');
            }
            var lang = opts.lang || 'en';
            var author = opts.author_uid;
            var translations = this.suttaMap[sutta_uid] || [];
            return translations
                .filter(t => t.lang === lang && !author || author === t.author)
                .map(t => path.join(this.root, t.translation));
        }

    }

    module.exports = exports.BilaraData = BilaraData;
})(typeof exports === "object" ? exports : (exports = {}));
