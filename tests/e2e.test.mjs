import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, appendFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateWorkspace, writeJsonAtomic } from '../scripts/lib/core.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceCli = path.join(projectRoot, 'scripts', 'workspace.mjs');
const reviewCli = path.join(projectRoot, 'scripts', 'review.mjs');

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`命令失败：${process.execPath} ${script} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

test('端到端完成来源、概念、题目、复习和仪表盘闭环', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'learning-mastery-e2e-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'lesson.md');
  await writeFile(source, '# 导数的定义\n导数描述函数在某一点的瞬时变化率。\n', 'utf8');

  run(workspaceCli, [
    'init',
    root,
    '--name',
    '微积分测试',
    '--subject',
    '微积分',
    '--exam-date',
    '2026-10-10',
  ]);
  const sourceResult = run(workspaceCli, ['source', root, source, '--json']);
  const sourcePayload = JSON.parse(sourceResult.stdout);
  assert.equal(sourcePayload.changed, true);

  await writeJsonAtomic(path.join(root, 'knowledge', 'concepts.json'), {
    schema_version: 1,
    concepts: [
      {
        id: 'concept-derivative-definition',
        title: '导数的定义',
        learning_objective: '能够解释并计算导数定义',
        type: 'concept',
        prerequisites: [],
        source_refs: [sourcePayload.source.id],
        exam_weight: 5,
        inferred: false,
      },
    ],
  });
  await appendFile(
    path.join(root, 'practice', 'questions.jsonl'),
    `${JSON.stringify({
      id: 'q1',
      concept_ids: ['concept-derivative-definition'],
      provenance: 'source_exact',
      source_refs: [sourcePayload.source.id],
      locator: 'section:导数的定义',
      prompt: '什么是导数？',
      answer: '函数在某一点的瞬时变化率。',
    })}\n`,
    'utf8',
  );

  run(reviewCli, ['schedule', root, '--concept', 'concept-derivative-definition', '--due', '2026-09-22']);
  run(reviewCli, [
    'grade',
    root,
    '--concept',
    'concept-derivative-definition',
    '--quality',
    '5',
    '--date',
    '2026-09-22',
  ]);
  const validation = await validateWorkspace(root);
  assert.equal(validation.ok, true, validation.errors.join('\n'));
  const statusResult = run(workspaceCli, ['status', root, '--date', '2026-09-22', '--json']);
  const status = JSON.parse(statusResult.stdout);
  assert.equal(status.counts.sources, 1);
  assert.equal(status.counts.concepts, 1);
  assert.equal(status.counts.attempts, 1);
  assert.ok(status.average_mastery > 0);
  assert.match(await readFile(path.join(root, 'progress', 'dashboard.md'), 'utf8'), /平均掌握/);
});

test('来源题禁止缺少 source_refs，模型生成题可显式标记', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'learning-mastery-provenance-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await run(workspaceCli, ['init', root, '--name', '来源测试', '--subject', '测试']);
  await writeJsonAtomic(path.join(root, 'knowledge', 'concepts.json'), {
    schema_version: 1,
    concepts: [
      {
        id: 'c1',
        title: '概念',
        source_refs: ['s1'],
        prerequisites: [],
        inferred: false,
      },
    ],
  });
  await writeJsonAtomic(path.join(root, 'sources', 'index.json'), {
    schema_version: 1,
    sources: [{ id: 's1', path: path.join(root, 'missing.md'), sha256: 'a'.repeat(64) }],
  });
  const questionFile = path.join(root, 'practice', 'questions.jsonl');
  await appendFile(
    questionFile,
    `${JSON.stringify({
      id: 'bad-source',
      concept_ids: ['c1'],
      provenance: 'source_exact',
      source_refs: [],
    })}\n`,
    'utf8',
  );
  let validation = await validateWorkspace(root);
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /声称有来源但没有 source_refs/);

  await writeFile(
    questionFile,
    `${JSON.stringify({
      id: 'generated',
      concept_ids: ['c1'],
      provenance: 'model_generated',
      source_refs: [],
      provenance_note: '模型生成的额外练习，不作为考场事实。',
    })}\n`,
    'utf8',
  );
  validation = await validateWorkspace(root);
  assert.equal(validation.ok, true, validation.errors.join('\n'));
});
