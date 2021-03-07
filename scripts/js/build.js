#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Axios = require('axios');
const { logger } = require('log-instance');
const { Memoizer } = require('memo-again');
const {
    BilaraData,
    Publication,
    BilaraPathMap,
} = require('../../index');
const APP_DIR = path.join(__dirname, '..', '..');
const API_DIR = path.join(APP_DIR, 'api');
const SRC_DIR = path.join(APP_DIR, 'src');
const SRC_SUIDMAPJS = path.join(SRC_DIR, 'auto', 'suidmap.js');
const SRC_SUIDMAPJSON = path.join(SRC_DIR, 'auto', 'suidmap.json');

logger.logLevel = 'info';

async function writeJsonModule(name, filePath, json) {
    await fs.promises.writeFile(filePath, 
` 
// DO NOT EDIT THIS GENERATED FILE
(function(exports) { class ${name} { static get ${name.toLowerCase()}() { return (
//JSONSTART
${json} 
//JSONEND
)}} module.exports = exports.${name} = ${name};
})(typeof exports === "object" ? exports : (exports={}));
// DO NOT EDIT THIS GENERATED FILE
`
    );
}

(async function(){ try {
    let bilaraData = await new BilaraData().initialize(true);
    let publication = await new Publication().initialize();
    let bilaraPathMap = await new BilaraPathMap({publication}).initialize();
    let suidMap = await bilaraPathMap.buildSuidMap();
    let suidJson = JSON.stringify(suidMap, null, '\t');
    await writeJsonModule('SuidMap', SRC_SUIDMAPJS, suidJson);
    await fs.promises.writeFile(SRC_SUIDMAPJSON, suidJson);
} catch(e) {
    logger.warn(e);
}})();
