#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Axios = require('axios');
const { logger } = require('log-instance');
const { Memoizer } = require('memo-again');
const {
    BilaraData,
} = require('../../index');
const APP_DIR = path.join(__dirname, '..', '..');
const API_DIR = path.join(APP_DIR, 'api');
const SRC_DIR = path.join(APP_DIR, 'src');
const SRC_SUIDMAP = path.join(SRC_DIR, 'suidmap.js');

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
    let suidJson = JSON.stringify(bilaraData.bilaraPathMap.suidMap, null, '\t');
    await writeJsonModule('SuidMap', SRC_SUIDMAP, suidJson);
} catch(e) {
    logger.warn(e);
}})();
