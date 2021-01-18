(typeof describe === 'function') && describe("tipitaka", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const { logger, LogInstance } = require('log-instance');
    const {
        Tipitaka,
    } = require("../index");
    const TEST_SUPER_PLI = {
        "super-name:3.dn": "Dīghanikāya",
        "super-name:7.mn": "Majjhimanikāya",
        "super-name:11.sn": "Saṁyuttanikāya",
        "super-name:17.an": "Aṅguttaranikāya",
        "super-name:22.kn": "",
        "super-name:30.thag": "Theragāthā",
        "super-name:31.thig": "Therīgāthā",
    }
    const TEST_SUPER_KEYS = Object.keys(TEST_SUPER_PLI);
    const TEST_SUPER_EN = {
        "super-name:3.dn": "Long Discourses Collection",
        "super-name:7.mn": "Middle Discourses Collection",
        "super-name:11.sn": "Linked Discourses Collection",
        "super-name:17.an": "Numbered Discourses Collection",
        "super-name:30.thag": "Verses of the Senior Monks",
        "super-name:31.thig": "Verses of the Senior Nuns",
    }
    const TEST_DN_PLI = {
        "dn-name:1.dn-silakkhandhavagga": "Sīlakkhandhavagga",
        "dn-name:2.dn1": "Brahmajālasutta",
        "dn-name:3.dn2": "Sāmaññaphalasutta",
        "dn-name:15.dn-mahavagga": "Mahāvagga",
        "dn-name:16.dn14": "Mahāpadānasutta",
        "dn-name:17.dn15": "Mahānidānasutta",
    }
    const TEST_AN_PLI = {
        "an-name:1.an1": "Ekakanipāta",
        "an-name:2.an1-cittapariyadanavagga": "Cittapariyādānavagga",
        "an-name:3.an1.1-10": "Cittapariyādānavagga",
        "an-name:4.an1-nivaranappahanavagga": "Nīvaraṇappahāṇavagga",
        "an-name:5.an1.11-20": "Nīvaraṇappahānavagga",
        "an-name:6.an1-akammaniyavagga": "Akammaniyavagga",
        "an-name:7.an1.21-30": "Akammaniyavagga",
        "an-name:8.an1-adantavagga": "Adantavagga",
        "an-name:9.an1.31-40": "Adantavagga",
    }
    const TEST_THAG_PLI = {
        "thag-name:1.thag-ekakanipata": "Ekakanipāta",
        "thag-name:2.thag-ekakanipata-pathamavagga": "Paṭhamavagga",
        "thag-name:3.thag1.1": "Subhūtittheragāthā",
        "thag-name:4.thag1.2": "Mahākoṭṭhikattheragāthā",
        "thag-name:13.thag-ekakanipata-dutiyavagga": "Dutiyavagga",
        "thag-name:14.thag1.11": "Cūḷavacchattheragāthā",
        "thag-name:312.thag18.1": "Mahākassapattheragāthā",
        "thag-name:313.thag-pannasanipata": "Paññāsanipāta",
        "thag-name:314.thag-pannasanipata-pathamavagga": "Paṭhamavagga",
        "thag-name:315.thag19.1": "Tālapuṭattheragāthā",
    }
    const TEST_MN_PLI = {
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
    }
    const TEST_MN_EN ={
        "mn-name:1.mn-mulapannasa": "The First Fifty",
        "mn-name:2.mn-mulapariyayavagga": "The Chapter on the Root of All Things ",
        "mn-name:3.mn1": "The Root of All Things ",
        "mn-name:57.mn-majjhimapannasa": "The Middle Fifty",
        "mn-name:58.mn-gahapativagga": "The Chapter on Householders",
        "mn-name:59.mn51": "With Kandaraka ",
        "mn-name:102.mn-brahmanavagga": "The Chapter on Brahmins",
        "mn-name:113.mn-uparipannasa": "The Final Fifty",
        "mn-name:114.mn-devadahavagga": "The Chapter Beginning With Devadaha",
    }
    const TEST_SN_PLI = {
        "sn-name:1.sn-sagathavaggasamyutta": "Sagāthāvaggasaṁyutta",
        "sn-name:2.sn1": "Devatāsaṁyutta",
        "sn-name:3.sn1-nalavagga": "Naḷavagga",
        "sn-name:4.sn1.1": "Oghataraṇasutta",
        "sn-name:5.sn1.2": "Nimokkhasutta",
        "sn-name:14.sn1-nandanavagga": "Nandanavagga",
        "sn-name:15.sn1.11": "Nandanasutta",
        "sn-name:25.sn1-sattivagga": "Sattivagga",
        "sn-name:36.sn1-satullapakayikavagga": "Satullapakāyikavagga",
        "sn-name:46.sn1.40": "Dutiyapajjunnadhītusuttaṁ",
        "sn-name:92.sn2": "Devaputtasaṁyutta",
        "sn-name:93.sn2-pathamavagga": "Paṭhamavagga",
        "sn-name:94.sn2.1": "Paṭhamakassapasutta",
        "sn-name:312.sn-nidanavaggasamyutta": "Nidānavaggasaṁyutta", 
        "sn-name:313.sn12": "Nidānasaṁyutta", 
        "sn-name:393.sn12.72-81": "Jātisuttādidasaka",
        "sn-name:394.sn12-antarapeyyala": "Antarapeyyāla",
        "sn-name:395.sn12-satthusuttadi": "Satthusuttādi",
        "sn-name:396.sn12.82": "Satthusutta",
        "sn-name:601.sn22": "Khandhasaṁyutta",
        "sn-name:602.sn22-mulapannasaka": "Mūlapaṇṇāsaka",
        "sn-name:603.sn22-nakulapituvagga": "Nakulapituvagga",
    };
    const TEST_SN_EN = {
        "sn-name:1.sn-sagathavaggasamyutta": 
            "The Group of Linked Discourses With Verses",
        "sn-name:2.sn1": "Linked Discourses With Deities",
        "sn-name:3.sn1-nalavagga": "A Reed ",
        "sn-name:14.sn1-nandanavagga": "The Garden of Delight ",
        "sn-name:25.sn1-sattivagga": "A Sword ",
        "sn-name:92.sn2": "Linked Discourses on Gods",
        "sn-name:93.sn2-pathamavagga": "Chapter One",
    };

    it("TESTTESTdefault constructor", ()=>{
        let taka = new Tipitaka();
        should(taka).properties({
            rootId: 'tipitaka',
        });
        should.deepEqual(taka.entryMap.tipitaka, {
            pli: 'Tipitaka',
            entries: [ 'abhidhamma', 'sutta', 'vinaya', ],
        });
        should.deepEqual(taka.entryMap.thig, {
            pli: 'Thig',
            parent:'kn',
            entries: [ ],
        });
        should.deepEqual(taka.reStructures, [[
            /vagga$/, // group
            /.*/, // leaf
        ],[
            /pannasa$/, // group
            /vagga$/, // group
            /.*/, // leaf
        ],[
            /:[0-9]+\.[a-z]+[1-9]$|pannasa$|nipata$/, // group
            /vagga$/, // group
            /.*/, // leaf
        ],[
            /.*vaggasamyutta$/, // group
            /.*[a-z][0-9]+(-samyutta)?$/, // group
            /.*vagga|peyyala|di|pannasaka$/, // group
            /.*[0-9]+\.[-0-9]+$/, // leaf
        ],[
            /.*/, 
            /.*/,
        ]]);
    });
    it("custom constructor", ()=>{
        let entryMap = {
            "sn-name:1.sn-sagathavaggasamyutta": {
                id: "sn-name:1.sn-sagathavaggasamyutta",
                name: {
                    pli: "Sagāthāvaggasaṁyutta",
                },
            },
        };
        let reStructures = [
            [ /.*paṇṇāsa$/, /.*vagga$/, /.*sutta$/ ],
        ];
        let taka = new Tipitaka({ entryMap, reStructures, });
        should(taka).properties({ entryMap, reStructures, });
    });
    it("TESTTESTaddNames(...) handles AN", ()=>{
        const PLITEST = TEST_AN_PLI;
        const PLIKEYS = Object.keys(PLITEST);
        let taka = new Tipitaka();
        let { entryMap } = taka;
        taka.addNames({names:PLITEST,lang:'pli'});
        //console.log(JSON.stringify(entryMap, null,2));

        let rootId = PLIKEYS[0];
        //console.log(rootId, taka.entryOfId(rootId));
        should(taka.entryOfId(rootId)).properties({ 
            pli: PLITEST[rootId], 
            entries: [
                'an-name:2.an1-cittapariyadanavagga',
                'an-name:4.an1-nivaranappahanavagga',
                'an-name:6.an1-akammaniyavagga',
                'an-name:8.an1-adantavagga'
            ],
        });

        // Leaf vs group node properties
        PLIKEYS.forEach(id=>{
            let node = taka.entryOfId(id);
            let suid = id.split(/:[0-9]+\./)[1]
                .replace(/[-a-z]*$/,'');
            let isLeaf = suid.startsWith('sn')
                ? /.*[0-9]+\.[-0-9]+/.test(suid)
                : /.*[0-9]\..*/.test(suid);
            if (isLeaf) {
                should(node).not.properties(['entries']);
            } else {
                should(node).properties(['entries']);
            }
        });

        // English names are merged with Pali names
        PLIKEYS.forEach(id=>{
            let node = taka.entryOfId(id);
            should(node).properties({ pli: PLITEST[id], });
        });
    });
    it("TESTTESTaddNames(...) handles DN", ()=>{
        const PLITEST = TEST_DN_PLI;
        const PLIKEYS = Object.keys(PLITEST);
        let taka = new Tipitaka();
        let { entryMap } = taka;
        taka.addNames({names:PLITEST,lang:'pli'});
        //console.log(JSON.stringify(entryMap, null,2));

        let rootId = PLIKEYS[0];
        //console.log(rootId, taka.entryOfId(rootId));
        should(taka.entryOfId(rootId)).properties({ 
            pli: PLITEST[rootId], 
            entries: [ 'dn-name:2.dn1', 'dn-name:3.dn2', ],
        });

        // Leaf vs group node properties
        PLIKEYS.forEach(id=>{
            let node = taka.entryOfId(id);
            let suid = id.split(/:[0-9]+\./)[1]
                .replace(/[-a-z]*$/,'');
            let isLeaf = /[0-9]/.test(suid);
            if (isLeaf) {
                should(node).not.properties(['entries']);
            } else {
                should(node).properties(['entries']);
            }
        });

        // English names are merged with Pali names
        PLIKEYS.forEach(id=>{
            let node = taka.entryOfId(id);
            should(node).properties({ pli: PLITEST[id], });
        });
    });
    it("TESTTESTaddNames(...) handles Thag", ()=>{
        const PLITEST = TEST_THAG_PLI;
        const PLIKEYS = Object.keys(PLITEST);
        let taka = new Tipitaka();
        let { entryMap } = taka;
        taka.addNames({names:PLITEST,lang:'pli'});
        //console.log(JSON.stringify(entryMap, null,2));

        let rootId = 'thag-name:1.thag-ekakanipata';
        should(taka.entryOfId(rootId)).properties({
            pli: PLITEST[rootId],
            parent: 'thag',
            entries: [
                'thag-name:2.thag-ekakanipata-pathamavagga',
                'thag-name:13.thag-ekakanipata-dutiyavagga',
            ],
        });

        // Leaf vs group node properties
        PLIKEYS.forEach(id=>{
            let node = taka.entryOfId(id);
            let suid = id.split(/:[0-9]+\./)[1]
                .replace(/[-a-z]*$/,'');
            let isLeaf = suid.startsWith('sn')
                ? /.*[0-9]+\.[-0-9]+/.test(suid)
                : /.*[0-9]\..*/.test(suid);
            if (isLeaf) {
                should(node).not.properties(['entries']);
            } else {
                should(node).properties(['entries']);
            }
        });

        // English names are merged with Pali names
        PLIKEYS.forEach(id=>{
            let node = taka.entryOfId(id);
            should(node).properties({ pli: PLITEST[id], });
        });
    });
    it("TESTTESTaddNames(...) handles MN", ()=>{
        const PLITEST = TEST_MN_PLI;
        const PLIKEYS = Object.keys(PLITEST);
        const ENTEST = TEST_MN_EN;
        let taka = new Tipitaka();
        let { entryMap } = taka;
        let superId = "super-name:7.mn";

        // Add root names first
        let result = taka.addNames({
            names:PLITEST,
            lang:'pli',
            superId,
        });
        should(result).equal(taka);
        should.deepEqual(taka.entryOfId(PLIKEYS[0]), { 
            pli: PLITEST[PLIKEYS[0]], 
            entries: [PLIKEYS[1]],
            parent: 'super-name:7.mn',
        });

        // Add other translated names after root names
        taka.addNames({
            names:ENTEST,
            lang:'en', 
            superId,
        });
        should(taka.entryOfId(PLIKEYS[0])).properties({
            pli: PLITEST[PLIKEYS[0]], 
            en: ENTEST[PLIKEYS[0]],
        });
        //console.log(JSON.stringify(entryMap, null,2));

        should.deepEqual(taka.entryOfId(superId).entries, [
            PLIKEYS[0], 
            PLIKEYS[3], 
            PLIKEYS[9], 
        ]);
        should(taka.entryOfId(PLIKEYS[0])).properties({parent:superId});
        should.deepEqual(taka.entryOfId(PLIKEYS[0]).entries, [
            PLIKEYS[1], // 2
        ]);
        should(taka.entryOfId(PLIKEYS[1])).properties({parent:PLIKEYS[0]});
        should.deepEqual(taka.entryOfId(PLIKEYS[1]).entries, [
            PLIKEYS[2], // 3
        ]);
        should(taka.entryOfId(PLIKEYS[2]).parent).equal(PLIKEYS[1]);
        should(taka.entryOfId(PLIKEYS[2])).not.properties(['entries']);
        should.deepEqual(taka.entryOfId(PLIKEYS[3]).entries, [
            PLIKEYS[4], // 58
            PLIKEYS[6], // 102
        ]);
        should.deepEqual(taka.entryOfId(PLIKEYS[4]).entries, [
            PLIKEYS[5], // 59
        ]);
        should(taka.entryOfId(PLIKEYS[5])).not.properties(['entries']);
        should.deepEqual(taka.entryOfId(PLIKEYS[6]).entries, [
            PLIKEYS[7], // 103
            PLIKEYS[8], // 104
        ]);
        should(taka.entryOfId(PLIKEYS[7])).not.properties(['entries']);
        should(taka.entryOfId(PLIKEYS[8])).not.properties(['entries']);
        should.deepEqual(taka.entryOfId(PLIKEYS[9]).entries, [
            PLIKEYS[10], // 114
        ]);
        should.deepEqual(taka.entryOfId(PLIKEYS[10]).entries, [
            PLIKEYS[11], // 115
        ]);
        should(taka.entryOfId(PLIKEYS[11])).not.properties(['entries']);

        // Leaf vs. group node properties
        PLIKEYS.forEach(id=>{
            let node = taka.entryOfId(id);
            let suid = id.split(':')[1].split('-')[0].split('.').slice(1).join('.');
            let isLeaf = /.*[1-9].*/.test(suid);
            if (isLeaf) {
                should(node).not.properties(['entries']);
            } else {
                should(node).properties(['entries']);
            }
        });

        // English names are merged with Pali names
        PLIKEYS.forEach(id=>{
            let node = taka.entryOfId(id);
            if (ENTEST[id]) {
                should(node).properties({ pli: PLITEST[id], en: ENTEST[id], });
            } else {
                should(node).properties({ pli: PLITEST[id], });
                should(node).not.properties({ en: ENTEST[id], });
            }
        });
    });
    it("TESTTESTaddNames(...) handles SN", ()=>{
        const PLITEST = TEST_SN_PLI;
        const PLIKEYS = Object.keys(PLITEST);
        const ENTEST = TEST_SN_EN;;
        let taka = new Tipitaka();
        let { entryMap } = taka;
        taka.addNames({names:PLITEST,lang:'pli'});
        //console.log(JSON.stringify(entryMap, null,2));
        taka.addNames({names:ENTEST,lang:'en', author:'sujato'});
        //console.log(JSON.stringify(entryMap, null,2));

        let rootId = 'sn-name:1.sn-sagathavaggasamyutta';
        should(taka.entryOfId(rootId)).properties({
            pli: PLITEST[rootId],
            en: ENTEST[rootId],
            entries: [ 'sn-name:2.sn1', 'sn-name:92.sn2',],
        });

        // Leaf vs group node properties
        PLIKEYS.forEach(id=>{
            let node = taka.entryOfId(id);
            let suid = id.split(/:[0-9]+\./)[1]
                .replace(/[-a-z]*$/,'');
            let isLeaf = suid.startsWith('sn')
                ? /.*[0-9]+\.[-0-9]+/.test(suid)
                : /.*[0-9]\..*/.test(suid);
            if (isLeaf) {
                should(node).not.properties(['entries']);
            } else {
                should(node).properties(['entries']);
            }
        });

        // English names are merged with Pali names
        PLIKEYS.forEach(id=>{
            let node = taka.entryOfId(id);
            if (ENTEST[id]) {
                should(node).properties({
                    pli: PLITEST[id],
                    en: ENTEST[id],
                });
            } else {
                should(node).properties({
                    pli: PLITEST[id],
                });
                should(node).not.properties('en');
            }
        });
    });
    it("TESTTESTaddNames(...) adds forest roots", ()=>{
        let taka = new Tipitaka();
        let { entryMap } = taka;
        let result = taka.addSuper({
            names:TEST_SUPER_PLI, 
            lang:'pli',
        });
        should(result).equal(taka);
        let idThag = 'super-name:30.thag';
        should.deepEqual(taka.entryOfId('thag'), {
            entries: [],
            pli: 'Theragāthā',
            parent: 'kn',
        });

        let idSN = 'super-name:11.sn';
        taka.addSuper({
            names:TEST_SUPER_EN, 
            lang:'en',
        });
        should.deepEqual(taka.entryOfId(idSN), {
            entries: [],
            en: "Linked Discourses Collection",
            pli: "Saṁyuttanikāya",
            parent: 'sutta',
        });

        let idMN = "super-name:7.mn";
        taka.addNames({names:TEST_MN_PLI, });
        should.deepEqual(taka.entryOfId(idMN), {
            en: "Middle Discourses Collection",
            pli: "Majjhimanikāya",
            entries: [
                'mn-name:1.mn-mulapannasa',                                  
                'mn-name:57.mn-majjhimapannasa',          
                'mn-name:113.mn-uparipannasa'  
            ],
            parent: 'sutta',
        });
        should(taka.entryOfId(idMN)).equal(taka.entryOfId('mn'));
    });
})
