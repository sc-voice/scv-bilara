#!/usr/bin/env node
const {
    js,
    logger,
    LOCAL_DIR,
} = require('just-simple').JustSimple;
const {
    Verifier,
} = require('../../index');

function help() {
    console.log(`
NAME
        verify - verify/repair bilara-data data integrity 

SYNOPSIS
        verify [OPTIONS] PATTERN_KEYWORDS

DESCRIPTION
        Verifies selected suttas.

OPTIONS
        -f, --fix
        Update files with fixed segment errors

        -n, --number
        Force segment id renumbering
`);
    process.exit(0);
}

var pattern;
var fixFile = false;
var forceRenumber = false;

var nargs = process.argv.length;
if (nargs < 3) {
    help();
}
for (var i = 2; i < nargs; i++) {
    var arg = process.argv[i];
    if (i<2) { continue; }
    if (arg === '-?' || arg === '--help') {
        help();
    } else if (arg === '-f' || arg === '--fix') {
        fixFile = true;
    } else if (arg === '-n' || arg === '--number') {
        forceRenumber = true;
    } else {
        pattern = pattern ? `${pattern} ${arg}` : arg;
    }
}

pattern = pattern || `mn1`;

(async function() { try {
    var verifier = await new Verifier({
        fixFile,
        forceRenumber,
    }).initialize();
    await verifier.verify(pattern);
} catch(e) { logger.warn(e.stack); }})();
