(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const { logger } = require('log-instance');
    const STRUCTURE = [
        'tipitaka',
        'tipitaka/abhidhamma',
        'tipitaka/sutta',
        'tipitaka/sutta/an',
        'tipitaka/sutta/dn',
        'tipitaka/sutta/kn',
        'tipitaka/sutta/kn/bv',
        'tipitaka/sutta/kn/cnd',
        'tipitaka/sutta/kn/cp',
        'tipitaka/sutta/kn/dhp',
        'tipitaka/sutta/kn/iti',
        'tipitaka/sutta/kn/ja',
        'tipitaka/sutta/kn/kp',
        'tipitaka/sutta/kn/mil',
        'tipitaka/sutta/kn/mnd',
        'tipitaka/sutta/kn/ne',
        'tipitaka/sutta/kn/pe',
        'tipitaka/sutta/kn/ps',
        'tipitaka/sutta/kn/pv',
        'tipitaka/sutta/kn/snp',
        'tipitaka/sutta/kn/tha-ap',
        'tipitaka/sutta/kn/thag',
        'tipitaka/sutta/kn/thi-ap',
        'tipitaka/sutta/kn/thig',
        'tipitaka/sutta/kn/ud',
        'tipitaka/sutta/kn/vv',
        'tipitaka/sutta/mn',
        'tipitaka/sutta/sn',
        'tipitaka/vinaya',
    ];

    const RE_GROUPS_1 = [ // e.g., DN
        /vagga$/, // group
        /.*/, // leaf
    ];
    const RE_GROUPS_2MN = [ // e.g., MN
        /pannasa$/, // group
        /vagga$/, // group
        /.*/, // leaf
    ];
    const RE_GROUPS_2 = [ // e.g., MN
        /:[0-9]+\.[a-z]+[1-9]$|pannasa$|nipata$/, // group
        /vagga$/, // group
        /.*/, // leaf
    ];
    const RE_GROUPS_3 = [ // e.g., SN
        /.*vaggasamyutta$/, // group
        /.*[a-z][0-9]+(-samyutta)?$/, // group
        /.*vagga|peyyala|di|pannasaka$/, // group
        /.*[0-9]+\.[-0-9]+$/, // leaf
    ];
    const RE_GROUPS_1ANY = [ 
        /.*/, // group (always matched)
        /.*/, // leaf (never matched)
    ];

    class Tipitaka {
        constructor(opts={}) {
            (opts.logger || logger).logInstance(this, opts);
            let { 
                entryMap,
                reStructures = [
                    RE_GROUPS_1,
                    RE_GROUPS_2MN, 
                    RE_GROUPS_2, 
                    RE_GROUPS_3, 
                    RE_GROUPS_1ANY,
                ],
                rootId = STRUCTURE[0],
                rootLang = 'pli',
            } = opts;
            Object.assign(this, {
                reStructures,
                rootId,
                rootLang,
            });
            if (!entryMap) {
                entryMap = {};
                STRUCTURE.forEach(rp=>{
                    let rpParts = rp.split('/');
                    for (let [i,id] of rpParts.entries()) {
                        let node = entryMap[id];
                        if (!node) {
                            node = { 
                                id, 
                                name:{
                                    [rootLang]: id[0].toUpperCase()+id.slice(1),
                                }, 
                                entries:[],
                            };
                            entryMap[id] = node;
                            if (i > 0) {
                                let parentId = rpParts[i-1];
                                entryMap[parentId].entries.push(id);
                                node.parent = parentId;
                            }
                        }
                    }
                });
            }
            this.entryMap = entryMap;
        }

        addSuper({names, lang=this.rootLang}) {
            let { 
                entryMap, 
                rootLang,
            } = this;
            let idNames = Object.entries(names);
            for (let [id,name] of idNames) {
                let node = entryMap[id];
                if (!node) {
                    let shortId = id.split('.').pop();
                    node = entryMap[shortId];
                    if (node) {
                        node.id = id;
                        node.name[rootLang] = name;
                        entryMap[shortId] = id;
                    } else {
                        node = { 
                            id, 
                            name: {},
                            entries: [],
                        }
                    }
                    entryMap[id] = node;
                }
                node.name[lang] = name;
            }

            return this;
        }

        entryOfId(id) {
            let { entryMap } = this;
            let value = entryMap[id];
            return typeof value === 'string' ? entryMap[value] : value;
        }

        addNames({names, lang=this.rootLang, simpleLeaf, superId}) {
            let { 
                entryMap, 
                reStructures,
                rootLang,
            } = this;
            let groups = [];
            let idNames = Object.entries(names);
            let id0 = idNames[0][0];
            let node0 = this.entryOfId(id0);
            let reStructure;
            let name0 = node0 && node0.name[rootLang] || idNames[0][1];
            for (let i = 0; i<reStructures.length; i++) {
                if (reStructures[i][0].test(id0)) {
                    reStructure = reStructures[i];
                    break;
                }
            }
            superId = superId || id0.split('-')[0];
            var superNode = this.entryOfId(superId);
            if (!superNode) {
                superNode = { 
                    id: superId, 
                    name:{}, 
                    entries:[],
                };
                entryMap[superId] = superNode;
            }
            if (!reStructure) {
                throw new Error([
                    `could not classify structure for`,
                    JSON.stringify(idNames[0]),
                ].join(' '));
            }
            for (let [id,name] of idNames) {
                let node = this.entryOfId(id);
                if (!node) {
                    node = {id, name:{}};
                    entryMap[id] = node;
                }
                node.name[lang] = name;
                let nameRoot = node.name[rootLang];
                if (nameRoot == null) {
                    throw new Error(`no Pali name for ${JSON.stringify({id,name})}`);
                }
                for (var iGroup = 0; iGroup < reStructure.length; iGroup++) {
                    let reGroup = reStructure[iGroup];
                    if (reGroup.test(node.id)) {
                        break;
                    }
                }
                let isLeaf = iGroup === reStructure.length - 1;

                if (isLeaf) {
                    let parent = groups[groups.length-1] || superNode;
                    lang === rootLang && parent.entries.push(id);
                    node.suid = id.split(':')[1].replace(/^[0-9]+\./,'');
                    node.parent = parent.id;
                } else if (iGroup < reStructure.length) {
                    node.entries = node.entries || [];
                    groups = [...groups.slice(0,iGroup), node];
                    if (lang === rootLang) {
                        let parent = groups[groups.length-2] || superNode;
                        if (parent) {
                            parent.entries.push(id);
                            node.parent = parent.id;
                        }
                    }

                } else {
                    throw new Error([
                        `addNames() cannot classify`,
                        JSON.stringify({id, nameRoot}),
                        `by`,
                        reStructure.join(','),
                    ].join(' '));
                }
                this.debug(id, node.name[rootLang], iGroup, groups.length, );
            }
            return this;
        }
    }

    module.exports = exports.Tipitaka = Tipitaka;
})(typeof exports === "object" ? exports : (exports = {}));
