(function(exports) {
    const fs = require("fs");
    const path = require("path");

    const RE_LEAF_PLI = /.*sutta$/;
    const RE_GROUP1_PLI = /.*pannasa|.*vaggasamyutta/; const RE_GROUP2_PLI = /.*vagga$/;

    class Tipitaka {
        constructor(opts={}) {
            this.entryMap = {};
            this.reLeafPli = opts.reLeafPli || RE_LEAF_PLI;
            this.reGroup1Pli = opts.reGroup1Pli || RE_GROUP1_PLI;
            this.reGroup2Pli = opts.reGroup2Pli || RE_GROUP2_PLI;
        }

        addNames({bdJson, lang='pli', simpleLeaf}) {
            let { entryMap, reLeafPli, reGroup1Pli, reGroup2Pli } = this;
            let groups = [];
            let idNames = Object.entries(bdJson);
            for (let [id,name] of idNames) {
                let node = entryMap[id] || { id, name:{} };
                entryMap[id] = node;
                node.name[lang] = name;
                let group1 = reGroup1Pli.test(id);
                let group2 = !group1 && reGroup2Pli.test(id);

                if (group1) {
                    node.entries = node.entries || {};
                    groups = [ node ];
                } else if (group2) {
                    node.entries = node.entries || {};
                    groups = [ groups[0], node ];
                    groups[0].entries[id] = node;
                } else {
                    groups[groups.length-1].entries[id] = node;
                    node.id = id;
                    node.suid = id.split(':')[1].replace(/^[0-9]+\./,'');
                }
                //console.log(
                    //JSON.stringify({id}), 
                    //group1 ? "group1" : (group2 ? "group2" : "leaf"), 
                    //groups.length, 
                //);
            }
            return entryMap;
        }
    }

    module.exports = exports.Tipitaka = Tipitaka;
})(typeof exports === "object" ? exports : (exports = {}));
