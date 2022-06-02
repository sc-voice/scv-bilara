(typeof describe === 'function') && describe("rg", function() {
  const should = require("should");
  const fs = require('fs');
  const path = require('path');
  const { exec, } = require('child_process');
  const { logger } = require('log-instance');
  const util = require('util');
  const execPromise = util.promisify(exec);
  const ROOT = path.join(__dirname, '..', 'local', 'ebt-data');
  const MAXBUFFER = 10 * 1024 * 1024;

  it("TESTTESTversion", async()=>{
    should(fs.existsSync(ROOT)).equal(true);
    var cwd = ROOT;
    var cmd = `rg --version`;
    var execOpts = {
        cwd,
        shell: '/bin/bash',
        maxBuffer: MAXBUFFER,
    };
    let { stdout, stderr }  = await execPromise(cmd, execOpts);
    let lines = stdout && stdout.trim().split('\n') || [];
    should(lines[0]).match(/ripgrep.*rev/);
  });
  it("TESTTESTtestRg => root of suffering", async()=>{
    // TBD: This test will fail with ripgrep 13 and node 16
    let pattern = 'root of suffering';
    let lang = 'en';
    let root = 'translation';

    console.log(`testRg`,{pattern, lang, root});
    var cwd = path.join(ROOT, `translation/${lang}`);
    should(fs.existsSync(cwd)).equal(true);
    var cmd = `rg -c -i -e '${pattern}'`;
    var execOpts = {
        cwd,
        shell: '/bin/sh',
        maxBuffer: 90*MAXBUFFER,
        timeout: 5*1000,
    };
    console.log(`testRg`, execOpts);
    let p = new Promise((resolve, reject) =>{
      try {
        exec(cmd, execOpts, (err,stdout,stderr)=>{
          let res = {err, stdout, stderr};
          if (err) {
            console.log(`exec() err[${err}]`);
            console.log(`stdout[${stdout}] stderr[${stderr}]`);
            reject(err);
          } else {
            console.log(`testRg() OK => ${res}`);
            resolve(res);
          }
        });
      } catch (e) {
        console.log("unexpected error", e);
        reject(e);
      }
    });
    //let { stdout, stderr } = await execPromise(cmd, execOpts);
    let { stdout, stderr } = await p;
    let lines = stdout && stdout.trim().split('\n') || [];
    console.log(lines);
    console.log('stderr', stderr);
    should(lines.length).above(7);
  });
})
