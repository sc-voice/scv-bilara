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
  const TIMEOUT = 5*1000;
  this.timeout(TIMEOUT);

  it("TESTTESTversion", async()=>{
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
    should(lines[0]).match(/ripgrep.*rev/);
  });
  it("TESTTESTtestRg => root of suffering", async()=>{
    logger.warn([
      "WARNING!!!",
      "\n",
      "testRg: Ripgrep integration is fragile:",
      "              Node 16   Node 18",
      "            +=========+=========+",
      " ripgrep 12 | OK      | OK      |",
      " ripgrep 13 | TIMEOUT | TIMEOUT | HELP!!!",
      "            +=========+=========+",
    ].join('\n'));
    let pattern = 'root of suffering';
    var cwd = path.join(CWD, `translation/en`);
    should(fs.existsSync(cwd)).equal(true);
    var cmd = [
      `rg -c`,
      `--debug`,
      //`--line-buffered`,  // DOES NOT HELP
      //`--no-mmap`,        // DOES NOT HELP
      //`--threads 1`,      // DOES NOT HELP
      //`--with-filename`,  // DOES NOT HELP
      `-e '${pattern}'`,
    ].join(' ');
    var execOpts = {
        cwd,
        shell: '/bin/sh',       // shell does not matter
        maxBuffer: 5*MAXBUFFER, // increasing maxBuffer does not matter
        timeout: TIMEOUT,       // given more time does not matter
    };
    console.log(`testRg`, 
      JSON.stringify({pattern, cmd, execOpts}, null,2));
    let p = new Promise((resolve, reject) => {
      exec(cmd, execOpts, (err, stdout, stderr)=> {
        let res = {err,stdout,stderr};
        resolve(res);
      });
    });
    let res = await p;
    let { err, stdout, stderr } = res;
    let lines = stdout && stdout.trim().split('\n') || [];
    console.log({lines, res});
    should(lines.length).above(7);
  });
})
