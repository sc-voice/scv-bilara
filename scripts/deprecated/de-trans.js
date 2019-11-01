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
    BilaraPath,
    FuzzyWordSet,
    Pali,
    Seeker,
    SegDoc,
    SuttaCentralId,

} = require('../index');
const LOCAL = path.join(__dirname, '../local');
const BILARA_DATA = path.join(LOCAL, '/bilara-data');

function help() {
    console.log(`
NAME
        de-trans.js - convert Bhante Sujato source into DE translation file

SYNOPSIS
        de-trans.js SUTTA_ID

DESCRIPTION
        Searches bilara-data for sutta and converts it to DE
        translation file format 
`);
    process.exit(0);
}

var logLevel = false;
var pattern;

var nargs = process.argv.length;
if (nargs < 3) {
    help();
}
for (var i = 2; i < nargs; i++) {
    var arg = process.argv[i];
    if (arg === '-?' || arg === '--help') {
        help();
    } else {
        pattern = pattern ? `${pattern} ${arg}` : arg;
    }
}

function wrap(line, len = 65) {
    var a = line.split(' ').reduce((a,w) => {
        if (a.len + w.length + 1 > len) {
            a.text += `\n${w}`;
            a.len = w.length;
        } else if (a.len) {
            a.text += ` ${w}`;
            a.len += w.length + 1;
        } else {
            a.text += w;
            a.len += w.length;
        }
        return a;
    }, {
        text: "",
        len: 0,
    });
    return a.text;
}

(async function() { try {
    var bd = await new BilaraData({
        logLevel,
    }).initialize();
    var skr = await new Seeker({
        logLevel,
    }).initialize();
    var res = await skr.find({
        pattern,
    });
    res.mlDocs.forEach(mld => {
        console.log(mld.suid.toUpperCase(), '\n');
        console.log(`:blurb:...\n`);
        var segs = mld.segments();
        segs.forEach((seg,i) => {
            if (seg.en) {
                switch (i) {
                    case 0:
                        console.log(`:Nikaya:${seg.en}\n`);
                        break;
                    case 1:
                        console.log(`:Vagga:${seg.en}\n`);
                        break;
                    case 2:
                        console.log(`:title:${seg.en}`);
                        break;
                    default:
                        console.log();
                        if (/^[0-9]+ *$/.test(seg.en)) {
                            console.log(`:title:${seg.en}`);
                        } else {
                            console.log(wrap(seg.en, 100000));
                        }
                        break;
                }
            }
        });
    });
} catch(e) { logger.warn(e.stack); }})();
