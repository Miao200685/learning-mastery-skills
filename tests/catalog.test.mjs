import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { averageScore, renderCatalog, validateCatalog } from '../tools/render-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('外部技能目录结构合法且链接唯一', async () => {
  const catalog = JSON.parse(await readFile(path.join(root, 'catalog', 'skills.json'), 'utf8'));
  assert.equal(validateCatalog(catalog), true);
  const urls = new Set(catalog.entries.map((entry) => entry.url));
  assert.equal(urls.size, catalog.entries.length);
  for (const entry of catalog.entries) {
    assert.match(entry.url, /^https:\/\/github\.com\//);
    assert.ok(entry.license.length > 0);
    assert.ok(averageScore(entry.scores) >= 0 && averageScore(entry.scores) <= 5);
  }
});

test('生成目录与 catalog/skills.json 保持同步', async () => {
  const catalog = JSON.parse(await readFile(path.join(root, 'catalog', 'skills.json'), 'utf8'));
  const expected = renderCatalog(catalog);
  const actual = await readFile(path.join(root, 'docs', 'CATALOG.md'), 'utf8');
  assert.equal(actual, expected);
  assert.match(actual, /不得复制/);
});
