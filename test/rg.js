(typeof describe === 'function') && describe("rg", function() {
  const should = require("should");
  const fs = require('fs');
  const path = require('path');
  const { exec, } = require('child_process');
  const { logger } = require('log-instance');
  const CWD = path.join(__dirname, '..', 'local', 'ebt-data');
  const util = require("node:util");
  const execPromise = util.promisify(exec);
  const MAXBUFFER = 10 * 1024 * 1024;
  const TIMEOUT = 2*1000;
  this.timeout(TIMEOUT);

  it("version", async()=>{
    should(fs.existsSync(CWD)).equal(true);
    var cwd = CWD;
    var cmd = `rg --version`;
    var execOpts = {
        cwd,
        shell: '/bin/bash',
        maxBuffer: MAXBUFFER,
    };
    let { stdout, stderr }  = await execPromise(cmd, execOpts);
    let lines = stdout && stdout.trim().split('\n') || [];
    should(lines[0]).match(/ripgrep.*[0-9]+.[0-9]+/);
  });
  it("testRg => root of suffering", async()=>{
    let pattern = 'root of suffering';
    var cwd = path.join(CWD, `translation/en`);
    should(fs.existsSync(cwd)).equal(true);
    var cmd = [
      `rg -c`,
      `-e '${pattern}'`,
      `./`,
    ].join(' ');
    var execOpts = {
        cwd,
        shell: '/bin/sh',       // shell does not matter
        maxBuffer: MAXBUFFER, // increasing maxBuffer does not matter
        timeout: TIMEOUT,       // given more time does not matter
    };
    //console.log(`testRg`, 
      //JSON.stringify({pattern, cmd, execOpts}, null,2));
    let p = new Promise((resolve, reject) => {
      exec(cmd, execOpts, (err, stdout, stderr)=> {
        let res = {err,stdout,stderr};
        resolve(res);
      });
    });
    let res = await p;
    let { err, stdout, stderr } = res;
    let lines = stdout && stdout.trim().split('\n') || [];
    //console.log({lines, res});
    should(lines.length).above(7);
  });
})
