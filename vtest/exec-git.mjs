import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import PKG_INDEX from '../index.js';
const { ExecGit } = PKG_INDEX;
import { Files } from 'memo-again';
import { logger } from 'log-instance';

const TEST_REPO = "git@github.com:sc-voice/test-repo.git";
const TEST_REPOPATH = path.join(Files.LOCAL_DIR, 'test-repo');
const TEST_UNPUBLISHED = false;
const logLevel = false;

describe.sequential("exec-git", function() {
  it("default ctor", () => {
    var egit = new ExecGit();
    expect(egit.repo).toBe('https://github.com/suttacentral/bilara-data.git');
    expect(egit.repoPath).toBe(path.join(Files.LOCAL_DIR, 'bilara-data'));
  });

  it("custom ctor", () => {
    var repo = TEST_REPO;
    var repoPath = TEST_REPOPATH;
    var egit = new ExecGit({ repo, repoPath });
    expect(egit.repo).toBe(TEST_REPO);
    expect(egit.repoPath).toBe(TEST_REPOPATH);
  });

  it("gitLog(save) => latest git log", { timeout: 10000 }, async() => {
    var repo = TEST_REPO;
    var repoPath = TEST_REPOPATH;
    var execGit = new ExecGit({
      repo,
      repoPath,
    });
    var res = await execGit.gitLog();
    expect(res.stdout).toMatch(/commit/);

    // error handling
    var repoPath = "/tmp/notthere";
    expect(fs.existsSync(repoPath)).toBe(false);
    var execGit = new ExecGit({
      repo,
      repoPath,
    });
    execGit.logLevel = 'error';
    var eCaught = undefined;
    try {
      var res = await execGit.gitLog();
    } catch(e) {
      eCaught = e;
    }
    expect(eCaught.message).toMatch(/not found.*notthere/);
  });

  it("sync(...) syncs clones repo", { timeout: 10000 }, async() => {
    var repo = TEST_REPO;
    var repoPath = TEST_REPOPATH;
    if (fs.existsSync(repoPath)) {
      var cmd = "rm -rf test-repo";
      var cwd = Files.LOCAL_DIR;
      execSync(cmd, {cwd});
    }
    expect(fs.existsSync(repoPath)).toBe(false);
    var execGit = new ExecGit({
      repo,
      repoPath,
      logLevel,
    });
    var res = await execGit.sync();
    expect(fs.existsSync(repoPath)).toBe(true);
    expect(res).toBe(execGit);
  });

  it("add(...) git add", { timeout: 10000 }, async() => {
    var repo = TEST_REPO;
    var repoPath = TEST_REPOPATH;
    var execGit = new ExecGit({
      repo,
      repoPath,
      logLevel,
    });
    var res = await execGit.add();
    expect(res).toBe(execGit);
  });

  it("hasChanges() true if git has changes", { timeout: 10000 }, async() => {
    var repo = TEST_REPO;
    var repoPath = TEST_REPOPATH;
    var execGit = new ExecGit({
      repo,
      repoPath,
      logLevel,
    });
    var res = await execGit.hasChanges();
    expect(res).toBe(false);
  });

  it("commit(...) git commit", { timeout: 10000 }, async() => {
    var repo = TEST_REPO;
    var repoPath = TEST_REPOPATH;
    var execGit = new ExecGit({
      repo,
      repoPath,
      logLevel,
    });
    var res = await execGit.commit("new translations");
    expect(res).toBe(execGit);
  });

  it("branch() waits for indexLock", { timeout: 10000 }, async() => {
    try {
      if (!TEST_UNPUBLISHED) { return; }
      let root = path.join(Files.LOCAL_DIR, 'bilara-data');
      let execGit = new ExecGit({
        repo: `https://github.com/suttacentral/bilara-data.git`,
      });
      let logLevel = logger.logLevel;

      // create index.lock
      var indexLock = path.join(root, '.git', 'index.lock');
      expect(fs.existsSync(indexLock)).toBe(false);
      fs.writeFileSync(indexLock, 'test');
      let resolved = false;

      // bd.sync will block
      let branchPromise = execGit.branch('unpublished');
      branchPromise.then(()=>{ resolved = true; });
      await new Promise(r=>setTimeout(()=>r(), 200));
      expect(resolved).toBe(false);

      // bd.sync will continue
      await fs.promises.unlink(indexLock);
      await branchPromise;
      expect(resolved).toBe(true);
      logger.logLevel = logLevel;
    } finally {
      fs.existsSync(indexLock) &&  fs.unlinkSync(indexLock);
    }
  });

  it("branch() waits for others", { timeout: 10000 }, async() => {
    if (!TEST_UNPUBLISHED) { return; }
    let root = path.join(Files.LOCAL_DIR, 'bilara-data');
    let execGit = new ExecGit({
      repo: `https://github.com/suttacentral/bilara-data.git`,
    });

    // bd.sync will block
    let promises = [
      execGit.branch('unpublished'),
      execGit.branch('unpublished'),
    ];
    await Promise.all(promises);
  });

  it("gitLog(opts) returns git log", { timeout: 10000 }, async() => {
    let egit = new ExecGit();
    var { stdout } = await egit.gitLog();
    expect(stdout).toMatch(/^commit.*\nAuthor.*\nDate/msu);
    expect(stdout.split('commit').length).toBe(2);

    var { stdout } = await egit.gitLog({maxCount:2});
    expect(stdout.split('commit').length).toBe(3);
  });
});
