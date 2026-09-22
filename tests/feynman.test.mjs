import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { initWorkspace, validateWorkspace, writeJsonAtomic } from '../scripts/lib/core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const feynmanCli = path.join(root, 'scripts', 'feynman.mjs');

function run(args) {
  return spawnSync(process.execPath, [feynmanCli, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

test('费曼循环完整记录六个阶段并验证完成状态', async (t) => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'learning-mastery-feynman-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  await initWorkspace(workspace, { name: '费曼测试', subject: '线性代数' });
  await writeJsonAtomic(path.join(workspace, 'knowledge', 'concepts.json'), {
    schema_version: 1,
    concepts: [{ id: 'c1', title: '向量', source_refs: ['s1'], prerequisites: [], inferred: false }],
  });
  await writeJsonAtomic(path.join(workspace, 'sources', 'index.json'), {
    schema_version: 1,
    sources: [{ id: 's1', path: path.join(workspace, 'missing.md'), sha256: 'a'.repeat(64) }],
  });
  const stages = [
    ['explain', '向量是有方向和大小的量。'],
    ['gap', '我还说不清为什么要排除零向量。'],
    ['source_check', '来源说明零向量没有确定方向。'],
    ['analogy', '像箭头，但不能表示零长度方向。'],
    ['simplify', '向量就是带方向的位移。'],
    ['transfer', '速度、力和位移都能用向量表示。'],
  ];
  for (const [stage, text] of stages) {
    const args = ['record', workspace, '--concept', 'c1', '--stage', stage, '--text', text];
    if (stage === 'analogy') args.push('--boundary', '零向量没有明确方向。');
    const result = run(args);
    assert.equal(result.status, 0, result.stderr);
  }
  const status = run(['status', workspace, '--json']);
  const payload = JSON.parse(status.stdout);
  assert.equal(payload.complete, 1);
  assert.equal(payload.in_progress, 0);
  const validation = await validateWorkspace(workspace);
  assert.equal(validation.ok, true, validation.errors.join('\n'));
  assert.match(await readFile(path.join(workspace, 'knowledge', 'feynman.json'), 'utf8'), /source_check/);
});

test('类比阶段必须包含失效边界', async (t) => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'learning-mastery-feynman-invalid-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  await initWorkspace(workspace, { name: '边界测试', subject: '测试' });
  await writeJsonAtomic(path.join(workspace, 'knowledge', 'concepts.json'), {
    schema_version: 1,
    concepts: [{ id: 'c1', title: '概念', source_refs: ['s1'], prerequisites: [], inferred: false }],
  });
  await writeJsonAtomic(path.join(workspace, 'sources', 'index.json'), {
    schema_version: 1,
    sources: [{ id: 's1', path: path.join(workspace, 'missing.md'), sha256: 'a'.repeat(64) }],
  });
  const result = run(['record', workspace, '--concept', 'c1', '--stage', 'analogy', '--text', '像水管']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /boundary/);
});
