#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { logger } = require('log-instance');
const { Memoizer } = require('memo-again');
const {
    BilaraData,
    Publication,
    BilaraPathMap,
    ExecGit,
} = require('../../index');
const APP_DIR = path.join(__dirname, '..', '..');
const API_DIR = path.join(APP_DIR, 'api');
const SRC_DIR = path.join(APP_DIR, 'src');
const SRC_SUIDMAPJSON = path.join(SRC_DIR, 'auto', 'suidmap.json');
const EBT_DATA = 'ebt-data';

logger.logLevel = 'info';

(async function(){ try {
    let execGit = new ExecGit({
        repo: 'https://github.com/ebt-site/ebt-data.git',
        logger,
    });
    let name = EBT_DATA;
    let root = path.join(APP_DIR, "local", EBT_DATA);
    let bilaraData = await new BilaraData({
        name,
        root,
        branch: 'published',
        execGit,
    }).initialize(true);
    let publication = await new Publication({root, name}).initialize();
    let bilaraPathMap = await new BilaraPathMap({publication, root}).initialize();
    let suidMap = await bilaraPathMap.buildSuidMap();
    let suidJson = JSON.stringify(suidMap, null, '\t');
    await fs.promises.writeFile(SRC_SUIDMAPJSON, suidJson);
} catch(e) {
    logger.warn(e);
}})();
