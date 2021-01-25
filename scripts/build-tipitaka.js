#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { logger, LogInstance } = require('log-instance');
const {
    Tipitaka,
} = require("../index");

const APP_DIR = path.join(__dirname, '..');
const BILARA_DIR = path.join(APP_DIR, 'local', 'bilara-data');
const ROOT_NAME_DIR = path.join(BILARA_DIR, 'root/misc/site/name');
const TRANS_NAME_DIR = path.join(BILARA_DIR, 'translation/en/sujato/name');
const EN_NAME_DIR = path.join(BILARA_DIR, 'translation/en/sujato/name');
const OUT_PATH = path.join(APP_DIR, 'src', 'assets', 'tipitaka-sutta.json');

(async function() { try {
    let taka = new Tipitaka();
    let { entryMap } = taka;

    // super
    let superPliPath = path.join(ROOT_NAME_DIR, 'super-name_root-misc-site.json');
    let superPli = JSON.parse(await fs.promises.readFile(superPliPath));
    let superEnPath = path.join(EN_NAME_DIR, 'super-name_translation-en-sujato.json');
    let superEn = JSON.parse(await fs.promises.readFile(superEnPath));
    taka.addSuper({names:superPli, lang:'pli'});

    // Pali
    //let filterName = /mn-name/;
    let filterName;
    let pliNamesDir = path.join(ROOT_NAME_DIR, 'sutta');
    let pliNameFiles = await fs.promises.readdir(pliNamesDir);
    for (let [i, fname] of pliNameFiles.entries()) {
        if (filterName && !filterName.test(fname)) {
            continue;
        }
        let id = fname.split('-name')[0];
        if (entryMap[id]) {
            console.log(`processing: ${fname}`);
            let pliFilePath = path.join(pliNamesDir, fname);
            let names = JSON.parse(await fs.promises.readFile(pliFilePath));
            taka.addNames({names, lang:'pli'});
        }
    }

    // English
    let enNamesDir = path.join(TRANS_NAME_DIR, 'sutta');
    let enNameFiles = await fs.promises.readdir(enNamesDir);
    for (let [i, fname] of enNameFiles.entries()) {
        if (filterName && !filterName.test(fname)) {
            continue;
        }
        let id = fname.split('-name')[0];
        if (entryMap[id]) {
            let enFilePath = path.join(enNamesDir, fname);
            let names = JSON.parse(await fs.promises.readFile(enFilePath));
            Object.keys(names).length && taka.addNames({names, lang:'en'});
        }
    }

    let json = JSON.stringify(entryMap, null, 2);
    await fs.promises.writeFile(OUT_PATH, json);
    console.log(`completed:`, OUT_PATH);
} catch(e) {
    console.warn(e);
}})();
