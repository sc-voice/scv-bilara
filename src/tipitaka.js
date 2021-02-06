(function(exports) {
    const SUTTA_ENTRIES = require('./assets/tipitaka-sutta.json');
    const { logger } = require('log-instance');
    const STRUCTURE = [
        'tipitaka',
        'tipitaka/abhidhamma',
        'tipitaka/sutta',
        'tipitaka/sutta/an',
        'tipitaka/sutta/dn',
        'tipitaka/sutta/kn',
        //'tipitaka/sutta/kn/bv',
        //'tipitaka/sutta/kn/cnd',
        //'tipitaka/sutta/kn/cp',
        'tipitaka/sutta/kn/dhp',
        'tipitaka/sutta/kn/iti',
        //'tipitaka/sutta/kn/ja',
        'tipitaka/sutta/kn/kp',
        //'tipitaka/sutta/kn/mil',
        //'tipitaka/sutta/kn/mnd',
        //'tipitaka/sutta/kn/ne',
        //'tipitaka/sutta/kn/pe',
        //'tipitaka/sutta/kn/ps',
        //'tipitaka/sutta/kn/pv',
        //'tipitaka/sutta/kn/snp',
        //'tipitaka/sutta/kn/tha-ap',
        'tipitaka/sutta/kn/thag',
        //'tipitaka/sutta/kn/thi-ap',
        'tipitaka/sutta/kn/thig',
        'tipitaka/sutta/kn/ud',
        //'tipitaka/sutta/kn/vv',
        'tipitaka/sutta/mn',
        'tipitaka/sutta/sn',
        'tipitaka/sutta/snp',
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
    const RE_GROUPS_1DHP = [
        /.*vagga$/,
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
                                [rootLang]: id[0].toUpperCase()+id.slice(1),
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
            this.groupMap = {};
        }

        static create(opts={}) {
            return new Tipitaka({
                entryMap: SUTTA_ENTRIES,
            });
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
                        node[rootLang] = name;
                        entryMap[shortId] = id;
                    } else {
                        node = { 
                            entries: [],
                        }
                    }
                    entryMap[id] = node;
                }
                node[lang] = name;
            }

            return this;
        }

        entryOfId(id) {
            let { entryMap } = this;
            let value = entryMap[id];
            return typeof value === 'string' ? entryMap[value] : value;
        }

        breadcrumbs(idLeaf) {
            let { entryMap } = this;
            let result = [];

            for (let id=idLeaf, node; (node = this.entryOfId(id)); id = node.parent) {
                let breadcrumb = Object.assign({id}, node);
                result = [breadcrumb, ...result];
            }
            return result;
        }

        addNames({names, lang=this.rootLang, simpleLeaf, superId}) {
            let { 
                entryMap, 
                reStructures,
                rootLang,
            } = this;
            let groups = [];
            let idStack = [];
            let idNames = Object.entries(names);
            if (idNames.length === 0) {
                throw new Error('names is required');
            }
            let id0 = idNames[0][0];
            let node0 = this.entryOfId(id0);
            let reStructure;
            let name0 = node0 && node0[rootLang] || idNames[0][1];
            for (let i = 0; i<reStructures.length; i++) {
                if (reStructures[i][0].test(id0)) {
                    reStructure = reStructures[i];
                    break;
                }
            }
            superId = superId || id0.split('-')[0];
            idStack.push(superId);
            var superNode = this.entryOfId(superId);
            if (!superNode) {
                superNode = { 
                    entries:[],
                };
                entryMap[superId] = superNode;
            }
            superNode.group = superId;
            if (!reStructure) {
                throw new Error([
                    `could not classify structure for`,
                    JSON.stringify(idNames[0]),
                ].join(' '));
            }
            for (let [id,name] of idNames) {
                let node = this.entryOfId(id);
                if (!node) {
                    node = {};
                    entryMap[id] = node;
                }
                node[lang] = name;
                let nameRoot = node[rootLang];
                if (nameRoot == null) {
                    throw new Error(`no Pali name for ${JSON.stringify({id,name})}`);
                }
                for (var iGroup = 0; iGroup < reStructure.length; iGroup++) {
                    let reGroup = reStructure[iGroup];
                    if (reGroup.test(id)) {
                        break;
                    }
                }
                let isLeaf = iGroup === reStructure.length - 1;

                if (isLeaf) {
                    let suid = id.split(':')[1].replace(/^[0-9]+\./,'');
                    entryMap[id] = suid;
                    entryMap[suid] = node;
                    let parent = groups[groups.length-1] || superNode;
                    lang === rootLang && parent.entries.push(suid);
                    node.parent = idStack[groups.length];
                } else if (iGroup < reStructure.length) {
                    node.entries = node.entries || [];
                    groups = [...groups.slice(0,iGroup), node];
                    idStack = [...idStack.slice(0,iGroup+1), id];
                    if (lang === rootLang) {
                        let parent = groups[groups.length-2] || superNode;
                        if (parent) {
                            parent.entries.push(id);
                            node.parent = idStack[groups.length-1];
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
                this.debug(id, node[rootLang], iGroup, groups.length, );
            }
            return this;
        }

        groupId(id) {
            let node = this.entryOfId(id);
            if (!node || node.parent === this.rootId) {
                throw new Error(`groupId(${id}) not implemented (node:${node})`);
            }
            return node.group || this.groupId(node.parent);
        }

        leaves(id) {
            let node = this.entryOfId(id);
            if (!node) {
                return [];
            }
            if (!node.entries) {
                return [id];
            }

            return node.entries.reduce((a,entry) => {
                return [...a, ...this.leaves(entry)];
            }, []);
        }

        groupLeaves(id) {
            let groupId = this.groupId(id);
            if (!groupId) {
                return [];
            }
            let leaves = this.groupMap[groupId];
            if (!leaves) {
                leaves = this.leaves(groupId);
                this.groupMap[groupId] = leaves;
            }
            return leaves;
        }

        nextId(id) {
            let leaves = this.groupLeaves(id);
            if (!leaves) {
                throw new Error(`nextId(${id}) no group`);
            }
            let iLeaf = leaves.findIndex(en=>en===id);
            return iLeaf>=0 && leaves[iLeaf+1] || null;
        }

        previousId(id) {
            let leaves = this.groupLeaves(id);
            if (!leaves) {
                throw new Error(`nextId(${id}) no group`);
            }
            let iLeaf = leaves.findIndex(en=>en===id);
            return iLeaf>0 && leaves[iLeaf-1] || null;
        }

        parentOfId(id) {
            let node = this.entryOfId(id);
            return node && this.entryOfId(node.parent);
        }
    }

    module.exports = exports.Tipitaka = Tipitaka;
})(typeof exports === "object" ? exports : (exports = {}));
