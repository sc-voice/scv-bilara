import { describe, it, expect } from '@sc-voice/vitest';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { logger } from 'log-instance';
import util from "node:util";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CWD = path.join(__dirname, '..', 'local', 'ebt-data');
const execPromise = util.promisify(exec);
const MAXBUFFER = 10 * 1024 * 1024;
const TIMEOUT = 2*1000;

describe("rg", { timeout: TIMEOUT }, function() {
  it("version", { timeout: TIMEOUT }, async()=>{
    expect(fs.existsSync(CWD)).toBe(true);
    var cwd = CWD;
    var cmd = `rg --version`;
    var execOpts = {
        cwd,
        shell: '/bin/bash',
        maxBuffer: MAXBUFFER,
    };
    let { stdout, stderr }  = await execPromise(cmd, execOpts);
    let lines = stdout && stdout.trim().split('\n') || [];
    expect(lines[0]).toMatch(/ripgrep.*[0-9]+.[0-9]+/);
  });
  it("testRg => root of suffering", { timeout: TIMEOUT }, async()=>{
    let pattern = 'root of suffering';
    var cwd = path.join(CWD, `translation/en`);
    expect(fs.existsSync(cwd)).toBe(true);
    var cmd = [
      `rg -c`,
      `-e '${pattern}'`,
      `./`,
    ].join(' ');
    var execOpts = {
        cwd,
        shell: '/bin/sh',
        maxBuffer: MAXBUFFER,
        timeout: TIMEOUT,
    };
    let p = new Promise((resolve, reject) => {
      exec(cmd, execOpts, (err, stdout, stderr)=> {
        let res = {err,stdout,stderr};
        resolve(res);
      });
    });
    let res = await p;
    let { err, stdout, stderr } = res;
    let lines = stdout && stdout.trim().split('\n') || [];
    expect(lines.length).toBeGreaterThan(7);
  });
});
