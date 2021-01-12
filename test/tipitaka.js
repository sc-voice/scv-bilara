(typeof describe === 'function') && describe("tipitaka", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const { logger, LogInstance } = require('log-instance');
    const {
        Tipitaka,
    } = require("../index");


    it("TESTTESTdefault constructor", ()=>{
        let tptk = new Tipitaka();
    });
    it("TESTTESTaddNames(...) handles MN", ()=>{
        const PLITEST = {
            "mn-name:1.mn-mulapannasa": "Mūlapaṇṇāsa",
            "mn-name:2.mn-mulapariyayavagga": "Mūlapariyāyavagga",
            "mn-name:3.mn1": "Mūlapariyāyasutta",
            "mn-name:57.mn-majjhimapannasa": "Majjhimapaṇṇāsa",
            "mn-name:58.mn-gahapativagga": "Gahapativagga",
            "mn-name:59.mn51": "Kandarakasutta",
            "mn-name:102.mn-brahmanavagga": "Brāhmaṇavagga",
            "mn-name:103.mn91": "Brahmāyusutta",
            "mn-name:104.mn92": "Selasutta",
            "mn-name:113.mn-uparipannasa": "Uparipaṇṇāsa",
            "mn-name:114.mn-devadahavagga": "Devadahavagga",
            "mn-name:115.mn101": "Devadahasutta",
        };
        const PLIKEYS = Object.keys(PLITEST);
        const ENTEST = {
            "mn-name:1.mn-mulapannasa": "The First Fifty",
            "mn-name:2.mn-mulapariyayavagga": "The Chapter on the Root of All Things ",
            "mn-name:3.mn1": "The Root of All Things ",
            "mn-name:57.mn-majjhimapannasa": "The Middle Fifty",
            "mn-name:58.mn-gahapativagga": "The Chapter on Householders",
            "mn-name:59.mn51": "With Kandaraka ",
            "mn-name:102.mn-brahmanavagga": "The Chapter on Brahmins",
            "mn-name:113.mn-uparipannasa": "The Final Fifty",
            "mn-name:114.mn-devadahavagga": "The Chapter Beginning With Devadaha",
        };
        let tptk = new Tipitaka();
        let entryMap = tptk.addNames({bdJson:PLITEST,lang:'pli'});
        should(entryMap[PLIKEYS[0]].id).equal(PLIKEYS[0]);
        should.deepEqual(entryMap[PLIKEYS[0]].name, { pli: PLITEST[PLIKEYS[0]], });
        //console.log(JSON.stringify(entryMap, null,2));
        entryMap = tptk.addNames({bdJson:ENTEST,lang:'en', author:'sujato'});
        //console.log(JSON.stringify(entryMap, null,2));

        should.deepEqual(Object.keys(entryMap[PLIKEYS[1]].entries), [
            PLIKEYS[2], // 3
        ]);
        should(entryMap[PLIKEYS[2]]).not.properties(['entries']);
        should.deepEqual(Object.keys(entryMap[PLIKEYS[3]].entries), [
            PLIKEYS[4], // 58
            PLIKEYS[6], // 102
        ]);
        should.deepEqual(Object.keys(entryMap[PLIKEYS[4]].entries), [
            PLIKEYS[5], // 59
        ]);
        should(entryMap[PLIKEYS[5]]).not.properties(['entries']);
        should.deepEqual(Object.keys(entryMap[PLIKEYS[6]].entries), [
            PLIKEYS[7], // 103
            PLIKEYS[8], // 104
        ]);
        should(entryMap[PLIKEYS[7]]).not.properties(['entries']);
        should(entryMap[PLIKEYS[8]]).not.properties(['entries']);
        should.deepEqual(Object.keys(entryMap[PLIKEYS[9]].entries), [
            PLIKEYS[10], // 114
        ]);
        should.deepEqual(Object.keys(entryMap[PLIKEYS[10]].entries), [
            PLIKEYS[11], // 115
        ]);
        should(entryMap[PLIKEYS[11]]).not.properties(['entries']);

        // All nodes should self-identify
        PLIKEYS.forEach(id=>{
            let node = entryMap[id];
            should(node).properties({id});
        });

        // Leaf vs. group node properties
        PLIKEYS.forEach(id=>{
            let node = entryMap[id];
            let suid = id.split(':')[1].split('-')[0].split('.').slice(1).join('.');
            let isLeaf = /.*[1-9].*/.test(suid);
            if (isLeaf) {
                should(node).properties({suid});
            } else {
                should(node).not.properties({suid});
            }
        });

        // English names are merged with Pali names
        PLIKEYS.forEach(id=>{
            let node = entryMap[id];
            if (ENTEST[id]) {
                should.deepEqual(node.name, {
                    pli: PLITEST[id],
                    en: ENTEST[id],
                });
            } else {
                should.deepEqual(node.name, {
                    pli: PLITEST[id],
                });
            }
        });
    });
    it("addNames(...) handles SN", ()=>{
        const PLITEST = {
            "sn-name:1.sn-sagathavaggasamyutta": "Sagāthāvaggasaṁyutta",
            "sn-name:2.sn1": "Devatāsaṁyutta",
            "sn-name:3.sn1-nalavagga": "Naḷavagga",
            "sn-name:4.sn1.1": "Oghataraṇasutta",
            "sn-name:5.sn1.2": "Nimokkhasutta",
            "sn-name:14.sn1-nandanavagga": "Nandanavagga",
            "sn-name:15.sn1.11": "Nandanasutta",
            "sn-name:92.sn2": "Devaputtasaṁyutta",
            "sn-name:93.sn2-pathamavagga": "Paṭhamavagga",
            "sn-name:94.sn2.1": "Paṭhamakassapasutta",
        };
        const PLIKEYS = Object.keys(PLITEST);
        const ENTEST = {
            "sn-name:1.sn-sagathavaggasamyutta": 
                "The Group of Linked Discourses With Verses",
            "sn-name:2.sn1": "Linked Discourses With Deities",
            "sn-name:3.sn1-nalavagga": "A Reed ",
            "sn-name:14.sn1-nandanavagga": "The Garden of Delight ",
            "sn-name:25.sn1-sattivagga": "A Sword ",
            "sn-name:92.sn2": "Linked Discourses on Gods",
            "sn-name:93.sn2-pathamavagga": "Chapter One",
        };
        let tptk = new Tipitaka();
        let entryMap = tptk.addNames({bdJson:PLITEST,lang:'pli'});
        //console.log(JSON.stringify(entryMap, null,2));
        entryMap = tptk.addNames({bdJson:ENTEST,lang:'en', author:'sujato'});
        //console.log(JSON.stringify(entryMap, null,2));

        let rootId = 'sn-name:1.sn-sagathavaggasamyutta';
        should(entryMap[rootId].id).equal(rootId);
        should.deepEqual(entryMap[rootId].name, {
            pli: PLITEST[rootId],
            en: ENTEST[rootId],
        });

        // All nodes should self-identify
        PLIKEYS.forEach(id=>{
            let node = entryMap[id];
            should(node).properties({id});
        });

        // Leaf vs group node properties
        PLIKEYS.forEach(id=>{
            let node = entryMap[id];
            let suid = id.split(':')[1].split('-')[0].split('.').slice(1).join('.');
            let isLeaf = /.*[1-9]\..*/.test(suid);
            if (isLeaf) {
                should(node).properties({suid});
            } else {
                should(node).not.properties({suid});
            }
        });

        // English names are merged with Pali names
        PLIKEYS.forEach(id=>{
            let node = entryMap[id];
            if (ENTEST[id]) {
                should.deepEqual(node.name, {
                    pli: PLITEST[id],
                    en: ENTEST[id],
                });
            } else {
                should.deepEqual(node.name, {
                    pli: PLITEST[id],
                });
            }
        });
    });
})
