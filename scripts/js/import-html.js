#!/usr/bin/env node
const {
    js,
    logger,
    LOCAL_DIR,
} = require('just-simple').JustSimple;
const fs = require('fs');
const path = require('path');
const {
    BilaraData,
    ExecGit,
    ImportHtml,

} = require('../../index');
const LOCAL = path.join(__dirname, '../../local');
const BILARA_DATA = path.join(LOCAL, '/bilara-data');

function help() {
    console.log(`
NAME
    import-html - import Bhante Sujato HTML document(s)

SYNOPSIS
    import-html [OPTIONS] 
        Imports all files in designated folder

OPTIONS
    -?, --help
        Print this help text
    -s, --srcRoot
        Specify source root folder. REQUIRED.
    -d, --dstRoot
        Specify destination root folder. Default is "local/bilara-data"
    -t, --type
        Specify document type. Default is "root"
    -a, --author
        Specify document author. Default is "ms"
`);
    process.exit(0);
}

var logLevel = false;

var srcRoot = null;
var dstRoot = BILARA_DATA;
var type = 'root';
var translator = 'ms';
var nargs = process.argv.length;

for (var i = 2; i < nargs; i++) {
    var arg = process.argv[i];
    if (i<2) { continue; }
    if (arg === '-?' || arg === '--help') {
        help();
    } else if (arg === '-s' || arg === '--srcRoot') {
        srcRoot = arg;
    } else if (arg === '-d' || arg === '--dstRoot') {
        dstRoot = arg;
    } else if (arg === '-t' || arg === '--type') {
        type = arg;
    } else if (arg === '-a' || arg === '--author') {
        translator = arg;
    } else if (srcRoot == null) {
        srcRoot = arg;
    } else {
        help();
    }
}

if (srcRoot == null) { help(); }

if (!fs.existsSync(srcRoot)) {
    logger.error(`srcRoot not found:${srcRoot}`);
    process.exit(-1);
}
if (!fs.existsSync(dstRoot)) {
    logger.error(`dstRoot not found:${dstRoot}`);
    process.exit(-1);
}

(async function() {try{
    logger.info(`Importing HTML`);
    logger.info(`  srcRoot:${srcRoot}`);
    logger.info(`  dstRoot:${dstRoot}`);
    logger.info(`  type   :${type}`);
    logger.info(`  author :${translator}`);
    var importer = new ImportHtml({
        srcRoot,
        dstRoot,
        type,
        translator,
    });
    var files = fs.readdirSync(srcRoot);
    console.log(files);
    files.forEach(f => {
        var res = importer.import(f);
    });

    logger.info(`Import completed`);
    process.exit(-1);
} catch(e) {
    logger.error(e.stack);
    process.exit(-1);
}})();


