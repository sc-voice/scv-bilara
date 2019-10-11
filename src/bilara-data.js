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
                    await that.execGit.sync();

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

                    that.initialized = true;
                    resolve(that);
                } catch(e) {reject(e);} })();
            });
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

    }

    module.exports = exports.BilaraData = BilaraData;
})(typeof exports === "object" ? exports : (exports = {}));
