const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const out = path.resolve('../../outputs/fixes-20261114/persistence');
fs.mkdirSync(out, {recursive:true});
const serve = r => {
  const name = new URL(r.request().url()).pathname;
  const file = path.resolve('dist', '.' + (name === '/' ? '/index.html' : name));
  return fs.existsSync(file) ? r.fulfill({path:file}) : r.fulfill({status:404, body:''});
};
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROME_BIN});
  const errors = [], results = [];
  try {
    async function page(width, guest = true) {
      const context = await browser.newContext({viewport:{width,height:900}, serviceWorkers:'block', acceptDownloads:true});
      await context.route('https://persist.test/**', serve);
      if (guest) await context.addInitScript(() => localStorage.setItem('shenrenliu_device_mode_v1','guest'));
      const p = await context.newPage();
      p.on('pageerror', e => errors.push(e.message));
      p.on('dialog', d => d.accept());
      await p.goto('https://persist.test/?banks=forming_forging_2026');
      await p.waitForFunction(() => window.BANK_RUNTIME?.app);
      return p;
    }
    const p = await page(1024, false);
    await p.locator('#deviceModeDialog [data-guest]').click();
    await p.reload();
    await p.waitForFunction(() => window.BANK_RUNTIME?.app);
    assert.match(await p.locator('.cloud-account-identity').innerText(), /访客/);
    // Use actual entry points for collection, review and tagged practice.
    for (const mode of ['favorite','wrong','today','flagged','tag']) {
      await p.evaluate(mode => {
        navHome(true);
        const q = QUESTION_BANK.find(q => q.type === 'single');
        const s = BANK_RUNTIME.app.getStore();
        s.settings.collectionBanks = {fav:[q.bankId],wrong:[q.bankId]};
        s.favorites = [q.id];
        s.wrong[q.id] = {count:1,wrongTotal:1,wrongStreak:1,lastWrong:Date.now(),corrected:false};
        s.reviewFlags[q.id] = Date.now();
        if (mode === 'favorite') startFavoriteStudy();
        if (mode === 'wrong') startWrongCategory('all');
        if (mode === 'today') startTodayReview(10);
        if (mode === 'flagged') startReviewStudy();
        if (mode === 'tag') startTagStudy(q.tags[0]);
        const item = BANK_RUNTIME.app.getSession().items[0];
        const wrong = item.optionOrder.findIndex(o => !item.q.answers.includes(o));
        chooseOption(wrong);
        showAnswer();
      }, mode);
      assert(await p.locator('.option.correct').count() > 0, mode);
      assert.equal(await p.locator('.option.wrong').count(), 1, mode);
      const title = await p.locator('.question-session-header h2').innerText();
      if (mode === 'favorite') {
        assert(await p.evaluate(() => {
          const item = BANK_RUNTIME.app.getSession().items[0], answer = JSON.stringify(item.answer);
          setReciteAnswerMode('always');
          setReciteAnswerMode('manual');
          const preserved = answer === JSON.stringify(item.answer);
          showAnswer();
          return preserved;
        }), 'display preferences preserve original selection');
        const exported = await p.evaluate(() => BANK_RUNTIME.getBackup(true));
        assert(exported.data.recentSessions[0].snapshot.session.items[0].showExplanation,
          'immediate ordinary export includes the latest reveal before debounce');
      }
      await p.getByRole('button',{name:'暂停保存，回首页',exact:true}).click();
      await p.reload();
      await p.waitForFunction(() => window.BANK_RUNTIME?.app);
      await p.evaluate(() => resumeSavedActivity(BANK_RUNTIME.app.getStore().recentSessions[0].id));
      assert.equal(await p.locator('.question-session-header h2').innerText(), title);
      assert.equal(await p.locator('.option.wrong').count(), 1);
      results.push(mode + ': reveal, pause, reload, resume');
    }
    // Export while writes really fail, then restore into a separate browser profile.
    await p.evaluate(() => {
      window.originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k,v) {
        if (k === BANK_CORE.KEY) throw new DOMException('simulated quota','QuotaExceededError');
        return originalSet.call(this,k,v);
      };
      retryLocalSave();
    });
    await p.locator('#deviceStorageDialog[open]').waitFor();
    const downloadEvent = p.waitForEvent('download');
    await p.locator('#deviceStorageDialog [data-export]').click();
    const download = await downloadEvent;
    const file = path.join(out,'emergency-backup.json');
    await download.saveAs(file);
    const backup = JSON.parse(fs.readFileSync(file,'utf8'));
    const expected = backup.data.recentSessions[0];
    assert(expected.snapshot.session.items[expected.snapshot.current].revealed);
    const n = await page(390);
    await n.evaluate(() => BANK_RUNTIME.openBackup());
    await n.locator('#backupFile').setInputFiles(file);
    await n.waitForFunction(() => !document.querySelector('#backupApply').disabled);
    const reloaded = n.waitForEvent('load');
    await n.locator('#backupApply').click();
    await reloaded;
    await n.waitForFunction(() => window.BANK_RUNTIME?.app);
    await n.evaluate(id => resumeSavedActivity(id), expected.id);
    assert.equal(await n.locator('.option.wrong').count(), 1);
    assert(await n.locator('.option.correct').count() > 0);
    assert.equal(await n.evaluate(() => BANK_RUNTIME.app.getSession().paperId), expected.id);
    await n.screenshot({path:path.join(out,'restored-phone.png')});
    results.push('Failed-save emergency export restored in independent profile with same paper, answer and reveal');
    await p.evaluate(() => Storage.prototype.setItem = originalSet);
    await p.locator('#deviceStorageDialog [data-retry]').click();
    assert.match(await p.locator('#deviceStorageDialog [role=status]').innerText(), /保存已恢复/);
    await p.locator('#deviceStorageDialog [data-close]').click();
    await p.evaluate(() => {
      Storage.prototype.setItem = function() { throw new DOMException('second failure','QuotaExceededError'); };
      retryLocalSave();
    });
    await p.locator('#deviceStorageDialog[open]').waitFor();
    await p.evaluate(() => Storage.prototype.setItem = originalSet);
    await p.locator('#deviceStorageDialog [data-retry]').click();
    assert.match(await p.locator('#deviceStorageDialog [role=status]').innerText(), /保存已恢复/);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out,'results.json'), JSON.stringify({results,errors},null,2));
    console.log('PASS guest, collection/review/tagged flows, quota failure emergency backup, independent restore and retry');
  } finally { await browser.close(); }
})().catch(e => {console.error(e); process.exitCode=1;});
