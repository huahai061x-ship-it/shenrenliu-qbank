const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const id = 'test_native_fill';
async function install(context) {
  const bank = JSON.parse(fs.readFileSync(path.join(root, 'banks/sinotruk-culture.json'), 'utf8'));
  bank.meta.id = id;
  const sandbox = {window: {}};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'culture-insights.js'), 'utf8'), sandbox);
  for (const q of bank.questions) {
    const note = sandbox.window.CULTURE_INSIGHTS[q.id];
    if (note) q.explanation = note.join('：');
  }
  // Exercise custom native-fill banks without re-enabling the retired public bank.
  await context.addInitScript(data => {
    const key = 'shenrenliu_qbank_custom_banks_v1';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify([data]));
  }, bank);
}
module.exports = {id, install};
