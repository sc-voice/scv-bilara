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

    const BILARA_DATA_GIT = 'https://github.com/sc-voice/bilara-data.git';

    class BilaraData {
        constructor(opts={}) {
            this.name = opts.name || 'bilara-data';
            this.root = opts.root || path.join(LOCAL_DIR, 'bilara-data');
            logger.logInstance(this, opts);
            this.nikayas = opts.nikayas || ['an','mn','dn','sn', 'kn'];
            this.reNikayas = new RegExp(
                `/(${this.nikayas.join('|')})/`, 'ui');
            Object.defineProperty(this, "_suttaMap", {
                writable: true,
                value: null,
            });
            this.initialized = false;
        }

        syncGit(repoPath=this.root, repo=BILARA_DATA_GIT) {
            var that = this;
            return new Promise((resolve, reject) => {
                (async function() { try {
                    if (fs.existsSync(repoPath)) {
                        var cmd = `cd ${repoPath}; git pull`;
                    } else {
                        var repoDir = path.basename(repoPath);
                        var cmd = `git clone ${repo} ${repoDir}`;
                    }
                    that.log(cmd);
                    var execOpts = {
                        cwd: LOCAL_DIR,
                    };
                    var res = execSync(cmd, execOpts).toString();
                    that.log(res);
                    resolve(that);
                } catch(e) {reject(e);} })();
            });
        }

        initialize() {
            if (this.initialized) {
                return Promise.resolve(this);
            }
            return new Promise((resolve, reject) => {
                var that = this;
                (async function() { try {
                    var map = that.suttaMap = {};
                    var transRoot = path.join(that.root, 'translation');
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

                    await that.syncGit();

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
                var cmp = a.lang.compare(b.lang);
                if (cmp === 0) {
                    cmp = a.author.compare(b.author);
                }
            });
            lang = lang || info[0].lang;
            author = author || info[0].author;
            var si = info.filter(i => i.lang === lang && i.author === author)[0];
            return new Translation(si).load(this.root);
        }

    }

    module.exports = exports.BilaraData = BilaraData;
})(typeof exports === "object" ? exports : (exports = {}));
