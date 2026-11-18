const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../public/app.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('const PERSONALITY_MAP'), source.indexOf('// Elements')) + '\n' + source.slice(source.indexOf('function renderPersonalityGrid(')) + '\nfunction escapeHtml(s) { return String(s).replaceAll("<", "&lt;"); }', context);
const render = values => context.renderPersonalityGrid(values);

test('hidden stat colors follow benefit direction and explain neutral ambition', () => {
  for (const key of ['loyalty', 'professionalism', 'pressure', 'sportsmanship', 'temperament', 'adaptability', 'Consistency', 'ImportantMatches', 'Versatility']) {
    assert.match(render({ [key]: 16 }), /text-green/);
    assert.match(render({ [key]: 5 }), /text-orange/);
    assert.doesNotMatch(render({ [key]: 10 }), /text-green|text-orange/);
    assert.match(render({ [key]: 16 }), /ค่าสูงเป็นผลดี/);
  }
  for (const key of ['controversy', 'InjuryProneness', 'Dirtiness']) {
    assert.match(render({ [key]: 5 }), /text-green/);
    assert.match(render({ [key]: 16 }), /text-orange/);
    assert.doesNotMatch(render({ [key]: 10 }), /text-green|text-orange/);
    assert.match(render({ [key]: 5 }), /ค่าต่ำเป็นผลดี/);
  }
  assert.doesNotMatch(render({ ambition: 20 }), /text-green|text-orange/);
  assert.match(render({ ambition: 20 }), /ย้าย/);
});

test('missing or invalid hidden stats never receive a good or bad color', () => {
  for (const value of [undefined, null, 0, 21, NaN, '16']) {
    const html = render({ professionalism: value });
    assert.doesNotMatch(html, /text-green|text-orange/);
    assert.match(html, /ไม่มีข้อมูล/);
  }
});
