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
const SRC_SUIDMAPJSON = path.join(SRC_DIR, 'auto', 'suidmap.json');

logger.logLevel = 'info';

(async function(){ try {
    let bilaraData = await new BilaraData().initialize(true);
    let publication = await new Publication().initialize();
    let bilaraPathMap = await new BilaraPathMap({publication}).initialize();
    let suidMap = await bilaraPathMap.buildSuidMap();
    let suidJson = JSON.stringify(suidMap, null, '\t');
    await fs.promises.writeFile(SRC_SUIDMAPJSON, suidJson);
} catch(e) {
    logger.warn(e);
}})();
