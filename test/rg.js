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
  it("TESTTESTroot of suffering", async()=>{
    let pattern = 'root of suffering';
    let lang = 'en';
    let root = 'translation';

    console.log(`testRg`,{pattern, lang, root});
    var cwd = path.join(ROOT, `translation/${lang}`);
    var cmd = `rg -c -i -e '${pattern}'`;
    var execOpts = {
        cwd,
        shell: '/bin/bash',
        maxBuffer: MAXBUFFER,
    };
    console.log(`testRg`, execOpts);
    let { stdout, stderr } = await execPromise(cmd, execOpts);
    let lines = stdout && stdout.trim().split('\n') || [];
    should(lines.length).above(0);
  });
})
