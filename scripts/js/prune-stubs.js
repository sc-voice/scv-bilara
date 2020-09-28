#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const LOCAL = path.join(__dirname, '..', '..', 'local');
const BILARA_PATH = path.join(LOCAL, 'bilara-data');

var argv = process.argv;
var rm = argv.slice(2).includes('rm');

async function traverse(root, cb) { try {
    var de = await fs.promises.readdir(root, {withFileTypes:true});
    for (var ide=0; ide<de.length; ide++) {
        let entry = de[ide];
        let depath = path.join(root, entry.name);
        if (entry.isDirectory()) {
            await traverse(depath, cb);
        } else {
            let stats = await fs.promises.stat(depath);
            cb(depath, stats);
        }
    }
} catch(e) {
    console.log(e);
}}

var total = {
    files: 0,
    nochange: 0,
};
function prune(fpath, stats) {
    if (fpath.endsWith(".json") && stats.size < 10) {
        total.files++;
        rm && fs.promises.unlink(fpath);
    } else {
        total.nochange++;
    }
}

var promise = traverse(BILARA_PATH, prune);
promise.then(res=>{
    console.log(`results rm:${rm}`, total);
});
