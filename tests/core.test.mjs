import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  addDays,
  collectWorkspaceStatus,
  computeExamReadiness,
  dateOnly,
  daysBetween,
  initWorkspace,
  learningModeWeights,
  registerSource,
  validateWorkspace,
  writeJsonAtomic,
} from '../scripts/lib/core.mjs';
import { applyReview, createReviewItem } from '../scripts/review.mjs';

test('日期运算保持 date-only 语义', () => {
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(daysBetween('2026-09-01', '2026-09-22'), 21);
});

test('双轨模式按考试剩余时间切换', () => {
  const project = { mode: 'auto', exam_date: '2026-10-31' };
  assert.deepEqual(learningModeWeights(project, '2026-09-01'), {
    mode: 'mastery',
    mastery: 80,
    exam: 20,
  });
  assert.deepEqual(learningModeWeights(project, '2026-10-01'), {
    mode: 'balanced',
    mastery: 60,
    exam: 40,
  });
  assert.deepEqual(learningModeWeights(project, '2026-10-27'), {
    mode: 'exam',
    mastery: 20,
    exam: 80,
  });
});

test('SM-2 变体执行 1 天、6 天和难度因子间隔', () => {
  const first = applyReview(createReviewItem('c1', '2026-09-22'), 5, {
    date: '2026-09-22',
  });
  assert.equal(first.interval_days, 1);
  assert.equal(first.due, '2026-09-23');
  assert.equal(first.ease, 2.6);
  const second = applyReview(first, 5, { date: '2026-09-23' });
  assert.equal(second.interval_days, 6);
  assert.equal(second.due, '2026-09-29');
  const third = applyReview(second, 5, { date: '2026-09-29' });
  assert.equal(third.interval_days, 17);
  assert.equal(third.due, '2026-10-16');
});

test('低质量复习重置并记录遗忘', () => {
  const item = { ...createReviewItem('c1', '2026-09-01'), repetitions: 4, interval_days: 20, lapses: 1 };
  const next = applyReview(item, 2, { date: '2026-09-22' });
  assert.equal(next.repetitions, 0);
  assert.equal(next.interval_days, 1);
  assert.equal(next.lapses, 2);
  assert.equal(next.due, '2026-09-23');
});

test('考试前压缩最后复习日期', () => {
  const item = { ...createReviewItem('c1', '2026-01-01'), repetitions: 3, interval_days: 30, ease: 2.5 };
  const next = applyReview(item, 4, { date: '2026-01-01', examDate: '2026-01-10' });
  assert.equal(next.due, '2026-01-09');
});

test('考试就绪度由覆盖、掌握、模拟和稳定性组合', () => {
  const result = computeExamReadiness({
    concepts: [
      { id: 'c1', source_refs: ['s1'] },
      { id: 'c2', source_refs: ['s1'] },
    ],
    mastery: {
      c1: { mastery_score: 90 },
      c2: { mastery_score: 70 },
    },
    examAttempts: [80, 90],
    mistakes: [{ status: 'open', severity: 'critical' }],
  });
  assert.equal(result.components.coverage, 100);
  assert.equal(result.components.mastery, 80);
  assert.equal(result.components.mock_exam, 85);
  assert.equal(result.components.critical_error_penalty, 3);
  assert.ok(result.score > 70 && result.score < 95);
});

test('工作区初始化和来源登记具备幂等性', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'learning-mastery-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'lesson.md');
  await writeFile(source, '# Lesson\n\nEvidence text.\n', 'utf8');
  await initWorkspace(root, {
    name: '测试课程',
    subject: '测试',
    examDate: '2026-10-10',
  });
  const first = await registerSource(root, source);
  const second = await registerSource(root, source);
  assert.equal(first.changed, true);
  assert.equal(second.changed, false);
  assert.equal(second.source.sha256, first.source.sha256);
  const validation = await validateWorkspace(root);
  assert.equal(validation.ok, true);
});

test('验证器拒绝无来源且未标记 inferred 的概念', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'learning-mastery-invalid-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initWorkspace(root, { name: '无效项目', subject: '测试' });
  await writeJsonAtomic(path.join(root, 'knowledge', 'concepts.json'), {
    schema_version: 1,
    concepts: [{ id: 'c1', title: '无依据概念', source_refs: [], prerequisites: [] }],
  });
  const validation = await validateWorkspace(root);
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /无来源依据/);
});

test('状态聚合能读取持久化工作区', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'learning-mastery-status-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await initWorkspace(root, { name: '状态项目', subject: '测试' });
  const status = await collectWorkspaceStatus(root, { date: dateOnly() });
  assert.equal(status.project.name, '状态项目');
  assert.equal(status.counts.concepts, 0);
  assert.equal(typeof status.exam_readiness.score, 'number');
  assert.match(await readFile(path.join(root, 'progress', 'dashboard.md'), 'utf8'), /学习仪表盘/);
});
