import test from 'node:test';
import assert from 'node:assert/strict';
import { compileMemories, parseDocument } from '../public/memory-compiler.js';

test('structured Markdown becomes small section-aware memories', () => {
  const items = parseDocument({ name: 'profile.md', text: '# Profile\n- **Phone**: Pixel 9 Pro\n- **Height**: 184 cm\n\n## Work\n- Building ANANSI' });
  assert.equal(items.length, 3);
  assert.deepEqual(items.map(item => item.section), ['Profile', 'Profile', 'Work']);
  assert.match(items[0].content, /Pixel 9 Pro/);
});

test('compiler removes repeats and keeps source provenance', () => {
  const result = compileMemories([
    { name: 'one.md', text: '## Devices\n- **Phone**: Pixel 9 Pro' },
    { name: 'two.md', text: '## Devices\n- **Phone**: Pixel 9 Pro' }
  ]);
  assert.equal(result.items.length, 1);
  assert.equal(result.duplicatesRemoved, 1);
  assert.deepEqual(result.items[0].sources, ['one.md', 'two.md']);
  assert.match(result.markdown, /anansi-memory\/v1/);
});
