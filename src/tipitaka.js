(function(exports) {
    const fs = require("fs");
    const path = require("path");
    const { logger } = require('log-instance');

    const RE_GROUPS_2 = [
        /.*paṇṇāsa$/,
        /.*vagga$/,
        /.*sutta$/,
    ]
    const RE_GROUPS_3 = [
        /.*vaggasaṁyutta$/,
        /.*saṁyutta$/,
        /.*vagga$/,
        /.*sutta$/,
    ]

    class Tipitaka {
        constructor(opts={}) {
            (opts.logger || logger).logInstance(this, opts);
            this.entryMap = {};
            this.reStructures = [RE_GROUPS_2, RE_GROUPS_3];
        }

        nameTree(nameId) {
            return entryMap[nameId];
        }

        addNames({bdJson, lang='pli', simpleLeaf, reStructure}) {
            let { 
                entryMap, 
                reStructures,
            } = this;
            let groups = [];
            let idNames = Object.entries(bdJson);
            let id0 = idNames[0][0];
            let node0 = entryMap[id0];
            let name0 = node0 && node0.name.pli || idNames[0][1];
            for (let i = 0; i<reStructures.length; i++) {
                if (reStructures[i][0].test(name0)) {
                    reStructure = reStructures[i];
                    break;
                }
            }
            if (!reStructure) {
                throw new Error([
                    `could not classify structure for`,
                    JSON.stringify(idNames[0]),
                ].join(' '));
            }
            for (let [id,name] of idNames) {
                let node = entryMap[id] || { id, name:{} };
                entryMap[id] = node;
                node.name[lang] = name;
                let namePli = node.name.pli;
                if (!namePli) {
                    throw new Error(`no Pali name for ${JSON.stringify({id,name})}`);
                }
                for (var iGroup = 0; iGroup < reStructure.length; iGroup++) {
                    let reGroup = reStructure[iGroup];
                    if (reGroup.test(namePli)) {
                        break;
                    }
                }
                let isLeaf = iGroup === reStructure.length - 1;

                if (isLeaf) {
                    groups[groups.length-1].entries[id] = node;
                    node.suid = id.split(':')[1].replace(/^[0-9]+\./,'');
                } else if (iGroup < reStructure.length) {
                    node.entries = node.entries || {};
                    groups = [...groups.slice(0,iGroup), node];
                    iGroup && (groups[iGroup-1].entries[id] = node);
                } else {
                    throw new Error([
                        `addNames() cannot classify`,
                        JSON.stringify({id, namePli}),
                        `by`,
                        reStructure.join(','),
                    ].join(' '));
                }
                this.debug(id, node.name.pli, iGroup, groups.length, );
            }
            return entryMap;
        }
    }

    module.exports = exports.Tipitaka = Tipitaka;
})(typeof exports === "object" ? exports : (exports = {}));
