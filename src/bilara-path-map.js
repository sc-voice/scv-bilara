(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        logger,
        LOCAL_DIR,
    } = require('just-simple').JustSimple;
    const BilaraPath = require('./bilara-path');
    const ROOTMS_FOLDER = path.join(LOCAL_DIR, "bilara-data", 
        "root", "pli", "ms");

    class BilaraPathMap {
        constructor(opts = {}) {
            this.root = opts.root || 
                path.join(LOCAL_DIR, "bilara-data");
            this.initialized = false;
        }

        static get ALL_TYPES() { return [
            'root', 
            'translation', 
            'html', 
            'variant', 
            'reference', 
            'comment',
        ]};

        initialize() {
            var that = this;
            var readdir = fs.promises.readdir;
            var pbody = (resolve,reject)=>{(async function() { try {
                that.suidMap = {};
                var transPath = path.join(that.root, "translation");
                var rdOpts = {withFileTypes:true};
                var langs = (await readdir(transPath, rdOpts))
                    .reduce((a,e)=> (e.isDirectory() 
                        ? [...a,e.name] : a),[]);
                for (var il=0; il < langs.length; il++) {
                    var l = langs[il];
                    var authPath = path.join(transPath,l);
                    var auths = (await readdir(authPath, rdOpts))
                        .reduce((a,e)=>(e.isDirectory() 
                            ? [...a,e.name] : a), []);
                    for (var ia=0; ia < auths.length; ia++) {
                        var key = `translation/${l}/${auths[ia]}`;
                        await that.loadPaths({ key });
                        var key = `comment/${l}/${auths[ia]}`;
                        await that.loadPaths({ key });
                    }
                }

                await that.loadPaths({ key: "root/pli/ms", });
                await that.loadPaths({ 
                    key: "html/pli/ms", 
                    rePathSuffix:/_html.json/,
                });
                await that.loadPaths({ 
                    key: "reference/pli/ms",
                    rePathSuffix:/_reference.json/,
                }); 
                await that.loadPaths({ key: "variant/pli/ms"}); 
                that.initialized = true;
                resolve(that);
            } catch(e) {reject(e);} })()}
            return new Promise(pbody);
        }

        bilaraPaths(opts={}) {
            if (typeof opts === 'string') {
                opts = { suid: opts };
            }
            var {
                suid,
                lang,
                author,
                types,
            } = opts;
            types = types || ['root','translation'];
            var reTypes = new RegExp(`^(${types.join('|')})`, 'u');
            var paths = this.suidPaths(suid) || [];
            var bps = Object.keys(paths).reduce((a,k) => {
                var bp = paths[k];
                reTypes.test(bp) && a.push(bp);
                return a;
            },[]);
            if (typeof lang === 'string') {
                let re = new RegExp(`/${lang}/`,'u');
                bps = bps.filter(bp => re.test(bp));
            } else if (lang instanceof Array) {
                let re = new RegExp(`/(${lang.join('|')})/`,'u');
                bps = bps.filter(bp => re.test(bp));
            }
            if (author) {
                let re = new RegExp(`.*-${author}.json`,'u');
                bps = bps.filter(bp => re.test(bp));
            }

            return bps.map(bp => new BilaraPath(bp));;
        }

        suidPaths(suid) {
            if (!this.initialized) {
                throw new Error(`initialize() has not been called`);
            }
            if (!suid) {
                throw new Error('suid is required');
            }
            var suidParts = suid.split('/');
            var key = suidParts[0];
            return this.suidMap[key];
        }

        suidPath(suid) {
            if (!suid) {
                throw new Error('suid is required');
            }
            var pathInfo = this.suidPaths(suid);
            var suidParts = suid.split('/');
            var key = suidParts.length === 1
                ? `root/pli/ms`
                : `translation/${suidParts[1]}/${suidParts[2]}`;
            return pathInfo && pathInfo[key];
        }

        loadPaths(opts={}) {
            var {
                rePathSuffix,
                key,
            } = opts;
            var {
                root,
                suidMap,
            } = this;
            var keyRoot = path.join(root, key);
            rePathSuffix = rePathSuffix || 
                `_${key.split('/').join('-')}.json`;
            var nFiles = 0;
            var rootPrefix = `${root}/`;
            var readOpts = {withFileTypes:true};
            var traverse = (dirPath)=>{
                var dirKids = fs.readdirSync(dirPath, readOpts);
                for (var i = 0; i < dirKids.length; i++) {
                    var e = dirKids[i];
                    if (e.isDirectory()) {
                        let kidPath = path.join(dirPath, e.name);
                        traverse(kidPath);
                    } else if (/.*json$/u.test(e.name)) {
                        var suid = e.name.replace(rePathSuffix,'');
                        suidMap[suid] = Object.assign(suidMap[suid]||{}, {
                            [key]: dirPath.replace(rootPrefix, '')  
                                + `/${e.name}`,
                        });
                        nFiles++;
                    }
                }
            };
            var pbody = (resolve, reject) => {(async function() { try {
                fs.existsSync(keyRoot) && traverse(keyRoot);
                resolve({ nFiles, suidMap, });
            } catch(e) {reject(e);} })()};
            return new Promise(pbody);
        }
    }

    module.exports = exports.BilaraPathMap = BilaraPathMap;
})(typeof exports === "object" ? exports : (exports = {}));

