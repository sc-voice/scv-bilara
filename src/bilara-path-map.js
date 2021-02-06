(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const { logger } = require('log-instance');
    const { Files } = require('memo-again');
    const BilaraPath = require('./bilara-path');
    const STUBFILESIZE = 5;
    const ROOTMS_FOLDER = path.join(Files.LOCAL_DIR, "bilara-data", 
        "root", "pli", "ms");

    var suidMap;

    class BilaraPathMap {
        constructor(opts = {}) {
            (opts.logger || logger).logInstance(this);
            this.root = opts.root || 
                path.join(Files.LOCAL_DIR, "bilara-data");
            let rootDir = path.dirname(this.root);
            let rootName = this.root.replace(rootDir,'').substring(1);
            this.rootLang = opts.rootLang || 'pli';
            this.rootAuthor = opts.rootAuthor || 'ms';
            this.suidMapFile = path.join(rootDir, `suid-map-${rootName}.json`);
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

        async initialize() { try {
            if (!suidMap) {
                suidMap = fs.existsSync(this.suidMapFile)
                    ? JSON.parse(await fs.readFileSync(this.suidMapFile))
                    : {};
                if (Object.keys(suidMap).length === 0) {
                    suidMap = await this.buildSuidMap();
                }
            }
            if (suidMap instanceof Promise) {
                suidMap = await suidMap;
            }
            this.suidMap = suidMap;
            this.initialized = true;
            return this;
        } catch(e) {
            this.warn(`initialize()`, e.message);
            throw e;
        }}

        async tipitakaPaths(opts={}) { try {
            var {
                root,
                rootLang,
                rootAuthor,
            } = this;
            let { 
                lang=rootLang,
                author=rootAuthor,
            } = opts;
            var takaPath = path.join(root, 
                lang===rootLang ? 'root' : 'translation',
                lang,
                author,
                '/',
            );
            var readOpts = {withFileTypes:true};
            var exclude = [
                '[0-9]',
                'playground',   // Blake
            ].join('|');
            var reExclude = new RegExp(`(${exclude})`,"ui");
            let pathStack = [];
            let pathList = [];
            if (fs.existsSync(takaPath)) {
                pathStack.push(takaPath);
            }
            while (pathStack.length) {
                let dirPath = pathStack.pop();
                if (reExclude.test(dirPath)) {
                    this.info(`_loadPaths() exclude:`, dirPath);
                    continue;
                }
                var dirKids = fs.readdirSync(dirPath, readOpts);
                let relativePath = dirPath.replace(takaPath, '');
                relativePath && pathList.push(relativePath);
                for (var i = 0; i < dirKids.length; i++) {
                    var e = dirKids[i];
                    if (e.isDirectory()) {
                        let kidPath = path.join(dirPath, e.name);
                        pathStack.push(kidPath);
                    }
                }
            }
            return pathList.sort();
        } catch(e) {
            this.warn(`tipitakaPaths()`, e.message);
            throw e;
        }}


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
                throw new Error('BilaraPathMap.suidPaths() suid is required');
            }
            var suidParts = suid.split('/');
            var key = suidParts[0];
            return this.suidMap[key];
        }

        suidLanguages(suid) {
            let suidPaths = this.suidPaths(suid);
            return !suidPaths 
                ? undefined
                : Object.keys(suidPaths)
                    .sort()
                    .reduce((a,k)=>{
                        let bilaraPath = suidPaths[k];
                        if (/^(translation|root)/.test(bilaraPath)) {
                            let [type,lang,author,category,nikaya] = 
                                bilaraPath.split('/');
                            a.push({
                                suid: suid.split('/')[0],
                                lang,
                                author,
                                category,
                                nikaya,
                                bilaraPath,
                            });
                        }
                        return a;
                    },[]);
        }

        suidPath(suid) {
            if (!suid) {
                throw new Error('BilaraPathMap.suidPath() suid is required');
            }
            var pathInfo = this.suidPaths(suid);
            var suidParts = suid.split('/');
            var key = suidParts.length === 1
                ? `root/pli/ms`
                : `translation/${suidParts[1]}/${suidParts[2]}`;
            return pathInfo && pathInfo[key];
        }

        async _loadPaths(suidMap, key) { try {
            var {
                root,
            } = this;
            var keyRoot = path.join(root, key);
            var rootPrefix = `${root}/`;
            var readOpts = {withFileTypes:true};
            var exclude = [
                'abhidhamma',   // (later)
                '\bma\b',       // Chinese
                '\bsa\b',       // Chinese
                'blurb',
                'name',         // metadata
                'playground',   // Blake
            ].join('|');
            var reExclude = new RegExp(`(${exclude})`,"ui");
            var traverse = (dirPath)=>{
                if (reExclude.test(dirPath)) {
                    this.info(`_loadPaths() exclude:`, dirPath);
                    return;
                }
                var dirKids = fs.readdirSync(dirPath, readOpts);
                for (var i = 0; i < dirKids.length; i++) {
                    var e = dirKids[i];
                    if (e.isDirectory()) {
                        let kidPath = path.join(dirPath, e.name);
                        traverse(kidPath);
                    } else if (/.*json$/u.test(e.name)) {
                        var ePath = path.join(dirPath, e.name);
                        var stat = fs.statSync(ePath);
                        if (stat.size > STUBFILESIZE) {
                            var suid = e.name.replace(/_.*/,'');
                            var suidPath = dirPath.replace(rootPrefix, '')  
                                        + `/${e.name}`;
                            suidMap[suid] = Object.assign(
                                suidMap[suid]||{}, {
                                    [key]: suidPath,
                            });
                        }
                    }
                }
            };
            let msStart = Date.now();
            fs.existsSync(keyRoot) && traverse(keyRoot);
            return suidMap;
        } catch(e) {
            this.warn(`_loadPaths()`, e.message);
            throw e;
        }}

        async buildSuidMap(opts={}) {
            let msStart = Date.now();
            let {
                loadHtml = false,
                loadVariant = false,
                loadReference = false,
                loadComment = false,
            } = opts;
            var readdir = fs.promises.readdir;
            let suidMap = {};
            this.suidMap = suidMap;
            var transPath = path.join(this.root, "translation");
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
                    if (/en\/(patton|comm-team)/.test(key)) {
                        continue; // ignore lzh->en translations
                    }
                    await this._loadPaths(suidMap, key);
                    if (loadComment) {
                        let key = `comment/${l}/${auths[ia]}`;
                        await this._loadPaths(suidMap, key);
                    }
                }
            }

            await this._loadPaths(suidMap, "root/pli/ms");
            //await this._loadPaths(suidMap, "root/pli/vri");
            loadHtml && await this._loadPaths(suidMap, "html/pli/ms");
            loadReference &&await this._loadPaths(suidMap, "reference/pli/ms");
            loadVariant && await this._loadPaths(suidMap, "variant/pli/ms"); 
            fs.writeFileSync(this.suidMapFile, JSON.stringify(suidMap, null, 2));
            this.suidMap = suidMap;
            this.info(`buildSuidMap() ${Date.now()-msStart}ms`);
            return suidMap;
        }
    }

    module.exports = exports.BilaraPathMap = BilaraPathMap;
})(typeof exports === "object" ? exports : (exports = {}));

