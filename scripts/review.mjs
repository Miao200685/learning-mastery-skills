#!/usr/bin/env node
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  REVIEW_ALGORITHM,
  addDays,
  appendJsonl,
  clamp,
  dateOnly,
  daysBetween,
  isValidDateOnly,
  parseCliFlags,
  printJson,
  readJson,
  round,
  validateWorkspace,
  writeJsonAtomic,
} from './lib/core.mjs';

const HELP = `learning-mastery 复习工具

用法：
  node scripts/review.mjs schedule <工作区> --concept <概念ID> [--due YYYY-MM-DD]
  node scripts/review.mjs due <工作区> [--date YYYY-MM-DD] [--limit N] [--json]
  node scripts/review.mjs grade <工作区> --concept <概念ID> --quality <0-5> [选项]
  node scripts/review.mjs stats <工作区> [--date YYYY-MM-DD] [--json]

grade 选项：
  --date <YYYY-MM-DD>           默认今天
  --response-seconds <秒>
  --hint-level <0-3>
  --note <文本>

复习算法：sm2-lite-v1。质量低于 3 时次日重来；成功时间隔为 1、6、前间隔乘难度因子。
`;

function usageError(message) {
  const error = new Error(message);
  error.isUsage = true;
  throw error;
}

function requireWorkspace(args) {
  if (!args[0]) usageError('缺少工作区路径。');
  return path.resolve(args[0]);
}

export function createReviewItem(conceptId, startDate, dueDate) {
  if (!isValidDateOnly(startDate)) throw new Error(`无效开始日期：${startDate}`);
  const due = dueDate || startDate;
  if (!isValidDateOnly(due)) throw new Error(`无效到期日期：${due}`);
  return {
    concept_id: conceptId,
    ease: 2.5,
    interval_days: 0,
    repetitions: 0,
    lapses: 0,
    due,
    last_reviewed: null,
    last_quality: null,
    history: [],
  };
}

export function applyReview(item, quality, options) {
  const normalizedQuality = Number(quality);
  if (!Number.isInteger(normalizedQuality) || normalizedQuality < 0 || normalizedQuality > 5) {
    throw new Error('quality 必须是 0 到 5 的整数。');
  }
  const reviewDate = options.date;
  if (!isValidDateOnly(reviewDate)) throw new Error(`无效复习日期：${reviewDate}`);

  const current = {
    ...createReviewItem(item.concept_id, item.due || reviewDate, item.due || reviewDate),
    ...item,
    history: Array.isArray(item.history) ? [...item.history] : [],
  };
  const oldEase = Number.isFinite(Number(current.ease)) ? Number(current.ease) : 2.5;
  const nextEase = Math.max(
    1.3,
    oldEase + 0.1 - (5 - normalizedQuality) * (0.08 + (5 - normalizedQuality) * 0.02),
  );

  let repetitions;
  let intervalDays;
  let lapses = Number(current.lapses || 0);
  if (normalizedQuality < 3) {
    repetitions = 0;
    intervalDays = 1;
    lapses += 1;
  } else {
    const previousRepetitions = Math.max(0, Number(current.repetitions || 0));
    if (previousRepetitions === 0) intervalDays = 1;
    else if (previousRepetitions === 1) intervalDays = 6;
    else intervalDays = Math.max(1, Math.round(Number(current.interval_days || 1) * nextEase));
    repetitions = previousRepetitions + 1;
  }

  let due = addDays(reviewDate, intervalDays);
  const examDate = options.examDate;
  if (examDate && isValidDateOnly(examDate) && examDate >= reviewDate) {
    const finalReviewDate = addDays(examDate, -1);
    if (finalReviewDate >= reviewDate && due > finalReviewDate) due = finalReviewDate;
  }

  return {
    ...current,
    ease: round(nextEase, 4),
    interval_days: intervalDays,
    repetitions,
    lapses,
    due,
    last_reviewed: reviewDate,
    last_quality: normalizedQuality,
    history: [
      ...current.history,
      {
        reviewed_at: reviewDate,
        quality: normalizedQuality,
        interval_days: intervalDays,
        ease: round(nextEase, 4),
      },
    ].slice(-100),
  };
}

async function loadContext(workspace, requireValid = true) {
  if (requireValid) {
    const validation = await validateWorkspace(workspace);
    if (!validation.ok) {
      throw new Error(`工作区验证失败：${validation.errors.join('；')}`);
    }
  }
  const project = await readJson(path.join(workspace, 'project.json'));
  const concepts = await readJson(path.join(workspace, 'knowledge', 'concepts.json'));
  const schedule = await readJson(path.join(workspace, 'reviews', 'schedule.json'));
  if (schedule.algorithm !== REVIEW_ALGORITHM) {
    throw new Error(`不支持的复习算法：${schedule.algorithm}`);
  }
  if (!schedule.items || typeof schedule.items !== 'object' || Array.isArray(schedule.items)) {
    throw new Error('reviews/schedule.json 缺少 items 对象。');
  }
  return { project, concepts, schedule };
}

function findConcept(concepts, conceptId) {
  const concept = (concepts.concepts || []).find((item) => item.id === conceptId);
  if (!concept) throw new Error(`概念不存在：${conceptId}`);
  return concept;
}

async function saveSchedule(workspace, schedule) {
  await writeJsonAtomic(path.join(workspace, 'reviews', 'schedule.json'), schedule);
}

async function updateMastery(workspace, project, conceptId, quality, reviewDate, item) {
  const masteryFile = path.join(workspace, 'progress', 'mastery.json');
  const mastery = await readJson(masteryFile);
  if (!mastery.concepts || typeof mastery.concepts !== 'object') mastery.concepts = {};
  const previous = mastery.concepts[conceptId] || { components: {} };
  const components = {
    recall: Number(previous.components?.recall || 0),
    independent_application: Number(previous.components?.independent_application || 0),
    retention: Number(previous.components?.retention || 0),
    transfer: Number(previous.components?.transfer || 0),
  };
  const evidence = previous.evidence || {};
  const reviewCount = Number(evidence.review_count || 0);
  const qualityPercent = (quality / 5) * 100;
  components.recall = reviewCount
    ? (components.recall * reviewCount + qualityPercent) / (reviewCount + 1)
    : qualityPercent;

  const successfulDates = new Set(evidence.successful_review_dates || []);
  if (quality >= 3) successfulDates.add(reviewDate);
  const sortedSuccess = [...successfulDates].sort();
  let spacedSuccesses = 0;
  for (let index = 1; index < sortedSuccess.length; index += 1) {
    if (daysBetween(sortedSuccess[index - 1], sortedSuccess[index]) >= 7) spacedSuccesses += 1;
  }
  components.retention = spacedSuccesses >= 2 ? 100 : spacedSuccesses === 1 ? 60 : quality >= 3 ? 30 : 0;

  const weights = project.mastery_weights || {
    recall: 30,
    independent_application: 30,
    retention: 20,
    transfer: 20,
  };
  const masteryScore = round(
    (components.recall * Number(weights.recall || 0) +
      components.independent_application * Number(weights.independent_application || 0) +
      components.retention * Number(weights.retention || 0) +
      components.transfer * Number(weights.transfer || 0)) /
      100,
    1,
  );
  const mastered =
    masteryScore >= 85 &&
    spacedSuccesses >= 1 &&
    Number(evidence.transfer_evidence_count || 0) >= 1 &&
    item.lapses === 0;

  mastery.concepts[conceptId] = {
    concept_id: conceptId,
    components: Object.fromEntries(
      Object.entries(components).map(([key, value]) => [key, round(value, 1)]),
    ),
    mastery_score: masteryScore,
    mastered,
    evidence: {
      ...evidence,
      review_count: reviewCount + 1,
      successful_review_dates: sortedSuccess,
      spaced_success_count: spacedSuccesses,
      last_reviewed: reviewDate,
      last_quality: quality,
    },
  };
  mastery.updated_at = new Date().toISOString();
  await writeJsonAtomic(masteryFile, mastery);
  return mastery.concepts[conceptId];
}

async function runSchedule(args) {
  const { flags, positional } = parseCliFlags(args);
  const workspace = requireWorkspace(positional);
  if (!flags.concept) usageError('缺少 --concept。');
  const context = await loadContext(workspace);
  findConcept(context.concepts, flags.concept);
  const startDate = flags.date || dateOnly();
  const due = flags.due || startDate;
  if (!isValidDateOnly(due)) usageError(`无效 --due：${due}`);
  const existing = context.schedule.items[flags.concept];
  if (existing && !flags.force) {
    if (flags.json) printJson({ changed: false, item: existing });
    else console.log(`复习项已存在：${flags.concept}（${existing.due}）`);
    return;
  }
  const item = existing
    ? { ...existing, due, updated_at: new Date().toISOString() }
    : createReviewItem(flags.concept, startDate, due);
  context.schedule.items[flags.concept] = item;
  await saveSchedule(workspace, context.schedule);
  if (flags.json) printJson({ changed: true, item });
  else console.log(`已安排复习：${flags.concept} -> ${due}`);
}

async function runDue(args) {
  const { flags, positional } = parseCliFlags(args);
  const workspace = requireWorkspace(positional);
  const context = await loadContext(workspace);
  const today = flags.date || dateOnly();
  if (!isValidDateOnly(today)) usageError(`无效 --date：${today}`);
  const limit = flags.limit === undefined ? Number.POSITIVE_INFINITY : Number(flags.limit);
  if (Number.isNaN(limit) || limit < 0) usageError('--limit 必须是非负数字。');
  const items = Object.values(context.schedule.items)
    .filter((item) => item.due <= today)
    .sort((left, right) => left.due.localeCompare(right.due) || left.concept_id.localeCompare(right.concept_id))
    .slice(0, Number.isFinite(limit) ? limit : undefined);
  if (flags.json) printJson({ date: today, count: items.length, items });
  else if (!items.length) console.log('今天没有到期复习。');
  else {
    console.log(`到期复习 ${items.length} 项：`);
    for (const item of items) console.log(`- ${item.concept_id}（${item.due}${item.due < today ? '，已逾期' : ''}）`);
  }
}

async function runGrade(args) {
  const { flags, positional } = parseCliFlags(args);
  const workspace = requireWorkspace(positional);
  if (!flags.concept) usageError('缺少 --concept。');
  if (flags.quality === undefined) usageError('缺少 --quality。');
  const quality = Number(flags.quality);
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    usageError('--quality 必须是 0 到 5 的整数。');
  }
  const reviewDate = flags.date || dateOnly();
  const context = await loadContext(workspace);
  findConcept(context.concepts, flags.concept);
  const existing = context.schedule.items[flags.concept] || createReviewItem(flags.concept, reviewDate, reviewDate);
  const updated = applyReview(existing, quality, {
    date: reviewDate,
    examDate: context.project.exam_date,
  });
  context.schedule.items[flags.concept] = updated;
  await saveSchedule(workspace, context.schedule);
  const mastery = await updateMastery(
    workspace,
    context.project,
    flags.concept,
    quality,
    reviewDate,
    updated,
  );
  const attempt = {
    id: `attempt-${randomUUID()}`,
    kind: 'review',
    concept_ids: [flags.concept],
    reviewed_at: reviewDate,
    quality,
    response_seconds: flags['response-seconds'] ? Number(flags['response-seconds']) : null,
    hint_level: flags['hint-level'] ? Number(flags['hint-level']) : 0,
    note: flags.note || null,
  };
  await appendJsonl(path.join(workspace, 'practice', 'attempts.jsonl'), attempt);
  if (quality < 3) {
    await appendJsonl(path.join(workspace, 'practice', 'mistakes.jsonl'), {
      id: `mistake-${randomUUID()}`,
      concept_ids: [flags.concept],
      discovered_at: reviewDate,
      severity: 'normal',
      status: 'open',
      source_attempt_id: attempt.id,
      note: flags.note || '复习质量低于 3，需要重新诊断。',
    });
  }
  const result = { item: updated, mastery, attempt };
  if (flags.json) printJson(result);
  else {
    console.log(`已记录 ${flags.concept}：质量 ${quality}/5；下次复习 ${updated.due}。`);
    console.log(`当前掌握度：${mastery.mastery_score}/100；已掌握：${mastery.mastered ? '是' : '否'}`);
  }
}

async function runStats(args) {
  const { flags, positional } = parseCliFlags(args);
  const workspace = requireWorkspace(positional);
  const context = await loadContext(workspace);
  const today = flags.date || dateOnly();
  const items = Object.values(context.schedule.items);
  const due = items.filter((item) => item.due <= today);
  const overdue = due.filter((item) => item.due < today);
  const lapses = items.reduce((sum, item) => sum + Number(item.lapses || 0), 0);
  const success = items.filter((item) => Number(item.last_quality) >= 3).length;
  const attempted = items.filter((item) => item.last_quality !== null).length;
  const stats = {
    date: today,
    total: items.length,
    due: due.length,
    overdue: overdue.length,
    lapses,
    success_rate: attempted ? round((success / attempted) * 100, 1) : 0,
  };
  if (flags.json) printJson(stats);
  else {
    console.log(`复习项：${stats.total}；到期：${stats.due}；逾期：${stats.overdue}`);
    console.log(`累计遗忘：${stats.lapses}；最近成功率：${stats.success_rate}%`);
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }
  if (command === 'schedule') return runSchedule(args);
  if (command === 'due') return runDue(args);
  if (command === 'grade') return runGrade(args);
  if (command === 'stats') return runStats(args);
  usageError(`未知命令：${command}`);
}


if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    if (error.isUsage) console.error(HELP);
    process.exitCode = 1;
  });
}
