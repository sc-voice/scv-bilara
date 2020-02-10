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
    -s, --srcRoot FOLDER
        Specify source root folder. REQUIRED.
    -d, --dstRoot FOLDER
        Specify destination root folder. Default is "local/bilara-data"
    -df, --dstFolder FOLDER
        Spectify destination subfolder. Default is ""
    --type TYPE
        Specify document type. Default is "root"
    -t, --translator TRANSLATOR
        Specify document translaotr. Default is "sujato"
    -tl, --transLang LANG
        Specify translation language. Default is "en"
    -a, --author AUTHOR
        Specify document author. Default is "ms"
    -al, --authorLang LANG
        Specifiy root language. Default is "pli"
`);
    process.exit(0);
}

var logLevel = false;

var srcRoot = null;
var dstRoot = BILARA_DATA;
var dstFolder = "abhidhamma";
var type = 'root';
var author = 'ms';
var rootLang = 'pli';
var translator = 'sujato';
var transLang = 'en';
var nargs = process.argv.length;

for (var i = 2; i < nargs; i++) {
    var arg = process.argv[i];
    if (i<2) { continue; }
    if (arg === '-?' || arg === '--help') {
        help();
    } else if (arg === '-s' || arg === '--srcRoot') {
        srcRoot = process.argv[++i];
    } else if (arg === '-d' || arg === '--dstRoot') {
        dstRoot = process.argv[++i];
    } else if (arg === '-df' || arg === '--dstFolder') {
        dstFolder = process.argv[++i];
    } else if (arg === '--type') {
        type = process.argv[++i];
    } else if (arg === '-a' || arg === '--author') {
        author = process.argv[++i];
    } else if (arg === '-al' || arg === '--authLang') {
        rootLang = process.argv[++i];
    } else if (arg === '-t' || arg === '--translator') {
        translator = process.argv[++i];
    } else if (arg === '-tl' || arg === '--transLang') {
        transLang = process.argv[++i];
    } else if (srcRoot == null) {
        srcRoot = process.argv[++i];
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
    logger.info(`  dstFolder:${dstFolder}`);
    logger.info(`  type   :${type}`);
    logger.info(`  author :${translator}`);
    var importer = new ImportHtml({
        srcRoot,
        dstRoot,
        dstFolder,
        type,
        translator,
        transLang,
        author,
        rootLang,
    });
    var files = fs.readdirSync(srcRoot, {withFileTypes:true});
    files.forEach(f => {
        if (f.isFile()) {
            if (f.name.match('.json')) {
                // skip
            } else {
                var res = importer.import(f.name);
            }
        } else if (f.isDirectory()) {
            var dirRoot = path.join(srcRoot, f.name);
            var dirFiles = fs.readdirSync(dirRoot);
            dirFiles.forEach(df => {
                var res = importer.import(df, f.name);
            });
        }
    });

    logger.info(`Import completed`);
    process.exit(-1);
} catch(e) {
    logger.error(e.stack);
    process.exit(-1);
}})();


