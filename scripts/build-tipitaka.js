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
const EN_NAME_DIR = path.join(BILARA_DIR, 'translation/en/sujato/name');
const OUT_PATH = path.join(APP_DIR, 'src', 'assets', 'tipitaka-sutta.json');

(async function() { 
    let taka = new Tipitaka();
    let { entryMap } = taka;
    let superNamesPath = path.join(ROOT_NAME_DIR, 'super-name_root-misc-site.json');
    let superNames = JSON.parse(await fs.promises.readFile(superNamesPath));
    taka.addSuper({names:superNames});
    let pliNamesDir = path.join(ROOT_NAME_DIR, 'sutta');
    let pliNameFiles = await fs.promises.readdir(pliNamesDir);
    let enNamesDir = path.join(ROOT_NAME_DIR, 'sutta');
    let enNameFiles = await fs.promises.readdir(enNamesDir);
    for (let [i, fname] of enNameFiles.entries()) {
        let id = fname.split('-name')[0];
        if (entryMap[id]) {
            let enFilePath = path.join(enNamesDir, fname);
            let names = JSON.parse(await fs.promises.readFile(enFilePath));
            taka.addNames({names});
        }
    }
    let json = JSON.stringify(entryMap, null, 2);
    await fs.promises.writeFile(OUT_PATH, json);
    console.log(`completed:`, OUT_PATH);
})();
