(function(exports) {
  const fs = require('fs');
  const path = require('path');
  const { logger } = require('log-instance');
  const { Files } = require('memo-again');
  const { AuthorsV2, BilaraPath, SuttaCentralId } = require("scv-esm");
  const STUBFILESIZE = 5;

  class BilaraPathMap {
    constructor(opts = {}) {
      (opts.logger || logger).logInstance(this);
      this.root = opts.root || 
        path.join(Files.LOCAL_DIR, "ebt-data");
      let rootDir = path.dirname(this.root);
      let rootName = this.root.replace(rootDir,'').substring(1);
      this.rootLang = opts.rootLang || 'pli';
      this.rootAuthor = opts.rootAuthor || 'ms';
      if (opts.suidMapFile) {
        this.suidMapFile = opts.suidMapFile;
      } else if ( rootName === 'ebt-data') {
        this.suidMapFile = path.join(__dirname, "auto", "suidmap.json");
      } else {
        this.suidMapFile = path.join(rootDir, `suidmap-${rootName}.json`);
      }
      this.validatePath = opts.validatePath || ((key,value,suid)=>true);
      this.publication = opts.publication;
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

    static langAuthorRegExp(lang, author) {
      return lang && author
        ? new RegExp(`-${lang}-${author}.json`, "i")
        : undefined;
    }

    async initialize() { try {
        var { suidMapFile } = this;
        let suidMap;

        if (fs.existsSync(suidMapFile)) {
            try {
                suidMap = JSON.parse(
                  await fs.promises.readFile(suidMapFile))
            } catch (e) {
                this.warn(`initialize() ${e.message} => rebuilding ${suidMapFile}`);
            }
        } 
        if (!suidMap) {
            this.info(`initialize() building ${suidMapFile}`);
            suidMap = this.buildSuidMap();
        }
        this.suidMap = await suidMap;
        this.initialized = true;
        return this;
    } catch(e) {
        this.warn(`initialize()`, suidMapFile, e.message);
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
                this.info(`tipitakaPaths() exclude:`, dirPath);
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
        const msg = 'BilaraPathMap.bilaraPaths()';
        const dbg = 0;
        if (typeof opts === 'string') {
            opts = { suid: opts };
        }
        var {
            suid,
            lang,
            author,
            types,
            refAuthor,
        } = opts;
        types = types || ['root','translation'];
        var reTypes = new RegExp(`^(${types.join('|')})`, 'u');
        var paths = this.suidPaths(suid) || [];
        dbg && console.log(msg, {paths});
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


    transPath(rootPath, lang, author) {
      const msg = "BilaraPathMap.transPat()";
      const dbg = 0;
      let { root } = this;
      let bilaraPath = rootPath
        .replace(/root/g, 'translation')
        .replace(/pli/g, lang)
        .replace(/ms/g, author);
      let fullPath = path.join(root, bilaraPath);
      if (!fs.existsSync(fullPath)) {
        dbg && console.log(msg, '[1]!existsSync', {fullPath});
        return null;
      }
      let stats = fs.statSync(fullPath);
      if (stats.size < 5) {
        dbg && console.log(msg, '[2]!size', {fullPath});
        return null;
      }

      dbg && console.log(msg, '[3]ok', bilaraPath);
      return bilaraPath;
    }

    trilingualPaths(opts={}) {
      const msg = "BilaraPathMap.trilingualPaths() ";
      const dbg = 0;
      let {
        suid,
        rootLang = 'pli',
        rootAuthor = 'ms',
        refLang,
        refAuthor,
        docLang,
        docAuthor,
      } = opts;
      let { root } = this;
      if (!refAuthor && !refLang) {
        refLang = 'en';
        refAuthor = 'sujato';
      }
      
      let pathMap = this.suidPaths(suid);
      let paths = Object.keys(pathMap).reduce((a,k)=>{
        a.push(pathMap[k]);
        return a;
      }, []);

      let { langAuthorRegExp } = BilaraPathMap;
      let reRoot = langAuthorRegExp(rootLang, rootAuthor);
      let mldPaths = paths.filter(p=>reRoot && reRoot.test(p));
      let rootPath = mldPaths[0];
      if (rootPath) {
        let docPath = this.transPath(rootPath, docLang, docAuthor);
        let refPath = this.transPath(rootPath, refLang, refAuthor);
        if (docPath) {
          mldPaths.push(docPath);
        }
        if (refPath && refPath !== docPath) {
          mldPaths.push(refPath);
        }
        dbg && console.log(msg, mldPaths);
      }
      dbg && console.log(msg, {mldPaths});
      return mldPaths;
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
        let map = this.suidMap[key];
        return map && Object.keys(map).reduce((a,k) => {
            let v = map[k];
            let kParts = k.split('/');
            let vParts = v.split('/');
            let suidParts = suid.split('/');
            a[k] = `${k}/${v}/${suidParts[0]}_${kParts.join('-')}.json`;
            return a;
        }, {});
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

    async _loadPaths(key) { try {
        var {
            root,
            suidMap,
            validatePath,
            publication,
        } = this;
        var keyRoot = path.join(root, key);
        var rootPrefix = `${root}/`;
        var readOpts = {withFileTypes:true};
        var exclude = [
            'abhidhamma',   // (later)
            '\bma\b',       // Chinese
            '\bsa\b',       // Chinese
            'site',
            'sc-page',
            'blurb',
            'name',         // metadata
            'playground',   // Blake
        ].join('|');
        var reExclude = new RegExp(`(${exclude})`,"ui");
        var traverse = (dirPath)=>{
            if (reExclude.test(dirPath)) {
                this.debug(`_loadPaths(${key}) exclude:`, dirPath);
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
                    if (stat.size <= STUBFILESIZE) {
                        // ignore stub file
                    } else if (publication && !publication.isPublishedPath(ePath)) {
                        this.debug(`skipping ${ePath}`);
                    } else {
                        let suid = e.name.replace(/_.*/,'');
                        let suidPath = dirPath.replace(rootPrefix, '')  
                                    + `/${e.name}`;
                        let valueParts = suidPath
                            .replace(new RegExp(`${key}/`),'')
                            .split('/');
                        valueParts.pop();
                        let value = valueParts.join('/');
                        if (validatePath(key,value,suid)) {
                            (suidMap[suid] = suidMap[suid] || {})[key] = value;
                        }
                    }
                }
            }
        };
        let msStart = Date.now();
        fs.existsSync(keyRoot) && traverse(keyRoot);
        return suidMap;
    } catch(e) {
        this.warn(`_loadPaths(${key})`, e.message);
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
      let suidMap = this.suidMap = {};
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
              await this._loadPaths(key);
              if (loadComment) {
                  let key = `comment/${l}/${auths[ia]}`;
                  await this._loadPaths(key);
              }
          }
      }
      suidMap = Object.keys(suidMap)
          .sort(SuttaCentralId.compareLow)
          .reduce((a,k) =>{
              a[k] = suidMap[k]; 
              return a;
          }, {});
      this.suidMap = suidMap;

      await this._loadPaths("root/pli/ms");
      loadHtml && await this._loadPaths("html/pli/ms");
      loadReference &&await this._loadPaths("reference/pli/ms");
      loadVariant && await this._loadPaths("variant/pli/ms"); 
      let { suidMapFile } = this;
      await fs.promises.writeFile(suidMapFile, JSON.stringify(suidMap, null, '\t'));
      this.info(`buildSuidMap() ${suidMapFile} ${Date.now()-msStart}ms`);
      return suidMap;
    }
  }

  module.exports = exports.BilaraPathMap = BilaraPathMap;
})(typeof exports === "object" ? exports : (exports = {}));

