(typeof describe === 'function') && describe("verse", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        Verse,
    } = require("../index");

    const thag1_2 = [{ // 0
        scid: "thag1.2:0.1", 
        en: "Verses of the Senior Monks",
        pli: "Theragāthā",
        de: "de 1",
    },{ // 1
        scid: "thag1.2:0.2", 
        en: "The Book of the Ones",
        pli: "Ekakanipāta",
        de: "de 2",
    },{ // 2
        scid: "thag1.2:0.3", 
        en: "Chapter One",
        pli: "Paṭhamavagga",
        de: "de 3",
    },{ // 3
        scid: "thag1.2:0.4", 
        en: "1.2. Mahākoṭṭhita",
        pli: "1.2. Mahākoṭṭhikattheragāthā",
        de: "de 4",
    },{ // 4
        scid: "thag1.2:1.1", 
        en: "Calm and quiet,",
        pli: "“Upasanto uparato,",
        de: "de 5",
    },{ // 5
        scid: "thag1.2:1.2", 
        en: "thoughtful in counsel, and stable—",
        pli: "mantabhāṇī anuddhato;",
        de: "de 6",
    },{ // 6
        scid: "thag1.2:1.3", 
        en: "he shakes off bad qualities",
        pli: "Dhunāti pāpake dhamme,",
        de: "de 7",
    },{ // 7
        scid: "thag1.2:1.4", 
        en: "as the wind shakes leaves off a tree.",
        pli: "dumapattaṁva māluto”ti.",
        de: "de 8",
    },{ // 8
        scid: "thag1.2:1.5", 
        en: "It was thus that this verse was recited "+
            "by the senior venerable Mahākoṭṭhita.",
        pli: "Itthaṁ sudaṁ āyasmā mahākoṭṭhiko thero gāthaṁ abhāsitthāti.",
        de: "de 9",
    }];

    it("TESTTESTdefault ctor", ()=>{
        var verse = new Verse();
        should(verse).properties({
            lang: 'en',
            linkBase: 'https://suttacentral.net',
            linebreak: '<br/>',
        });
    });
    it("TESTTESTcustom ctor", ()=>{
        let linkBase = 'https://staging.suttacentral.net';
        let linebreak = '  \n';
        let lang = 'de';
        let searchLang = 'en';
        let showEn = true;
        let showPli = true;
        var opts = {
            lang,
            linkBase,
            linebreak,
            searchLang,
            showEn,
            showPli,
        };
        var verse = new Verse(opts);
        should(verse).properties(opts);
    });
    it("TESTTESTsuttacentralLink(...)", ()=>{
        let linkBase = 'https://test';
        let verse = new Verse({
            linkBase,
        });
        let suid = "thig1.2";
        let scid = suid;
        let linkText = "Thig1.2";
        should(verse.suttacentralLink(scid))
            .equal(`[${linkText}](${linkBase}/${scid})`);
        should(verse.suttacentralLink(scid,'en','sujato'))
            .equal(`[${linkText}](${linkBase}/${suid}/en/sujato#${scid})`);

        scid = `${suid}:1.5`;
        linkText = "Thig1.2:1.5";
        should(verse.suttacentralLink(scid))
            .equal(`[${linkText}](${linkBase}/${suid})`);
        should(verse.suttacentralLink(scid,'en','sujato'))
            .equal(`[${linkText}](${linkBase}/${suid}/en/sujato#${scid})`);

    });
    it("versify(...) => English, allMatched", ()=>{
        let verse = new Verse();
        let linkText = '>[Thag1.2:';
        let linebreak = '<br/>';
        let linkBase = 'https://suttacentral.net/thag1.2';
        let res = verse.versify(thag1_2);
        let text = thag1_2.slice(0,4).map(s=>s.en).join(linebreak);
        should(res[0]).equal(`${linkText}0.1](${linkBase}):${linebreak}${text}`);
        text = thag1_2.slice(4).map(s=>s.en).join(linebreak);
        should(res[1]).equal(`${linkText}1.1](${linkBase}):${linebreak}${text}`);
        should(res.length).equal(2);
    });
    it("versify(...) => English, allMatched", ()=>{
        let verse = new Verse();
        let thag = JSON.parse(JSON.stringify(thag1_2));
        thag[7].matched = true;
        let linkText = '>[Thag1.2:';
        let linebreak = '<br/>';
        let linkBase = 'https://suttacentral.net/thag1.2';
        let res = verse.versify(thag);
        let text = thag.slice(4).map(s=>s.en).join(linebreak);
        should(res[0]).equal(`${linkText}1.1](${linkBase}):${linebreak}${text}`);
        should(res.length).equal(1);
    });
    it("TESTTESTversify(...) => Deutsch, allMatched", ()=>{
        let lang = 'de';
        let verse = new Verse({lang});
        let linkText = '>[Thag1.2:';
        let linebreak = '<br/>';
        let linkBase = 'https://suttacentral.net/thag1.2';
        let res = verse.versify(thag1_2);
        let text = thag1_2.slice(0,4).map(s=>s[lang]).join(linebreak);
        should(res[0]).equal(`${linkText}0.1](${linkBase}):${linebreak}${text}`);
        text = thag1_2.slice(4).map(s=>s[lang]).join(linebreak);
        should(res[1]).equal(`${linkText}1.1](${linkBase}):${linebreak}${text}`);
        should(res.length).equal(2);
    });
    it("TESTTESTversify(...) => Deutsch, allMatched", ()=>{
        let lang = 'de';
        let showPli = true;
        let showEn = true;
        let verse = new Verse({lang, showPli, showEn});
        let thag = JSON.parse(JSON.stringify(thag1_2));
        thag[7].matched = true;
        let linkText = '>[Thag1.2:';
        let linebreak = '<br/>';
        let linkBase = 'https://suttacentral.net/thag1.2';
        let res = verse.versify(thag);

        let text = thag.slice(4).map(s=>s.pli).join(linebreak);
        should(res[0]).equal(`${linkText}1.1](${linkBase}):${linebreak}${text}`);

        text = thag.slice(4).map(s=>s.en).join(linebreak);
        should(res[1]).equal(
            `${linkText}1.1](${linkBase}/en/sujato#thag1.2:1.1):${linebreak}${text}`);

        text = thag.slice(4).map(s=>s[lang]).join(linebreak);
        should(res[2]).equal(`${linkText}1.1](${linkBase}):${linebreak}${text}`);

        should(res.length).equal(3);
    });
});
