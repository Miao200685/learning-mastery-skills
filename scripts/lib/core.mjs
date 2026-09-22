import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const SCHEMA_VERSION = 1;
export const REVIEW_ALGORITHM = 'sm2-lite-v1';
export const PROVENANCE_KINDS = new Set([
  'source_exact',
  'source_derived',
  'past_exam',
  'model_generated',
]);

export const REQUIRED_WORKSPACE_FILES = [
  'project.json',
  'sources/index.json',
  'knowledge/concepts.json',
  'practice/questions.jsonl',
  'practice/attempts.jsonl',
  'practice/mistakes.jsonl',
  'reviews/schedule.json',
  'progress/mastery.json',
  'progress/dashboard.md',
  'plan/roadmap.md',
  'plan/today.md',
];

export function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} 必须是非空字符串。`);
  }
  return value.trim();
}

export function isValidDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && formatDate(parsed) === value;
}

export function dateOnly(value = new Date()) {
  if (typeof value === 'string') {
    if (!isValidDateOnly(value)) throw new Error(`无效日期：${value}`);
    return value;
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(value) {
  if (!isValidDateOnly(value)) throw new Error(`无效日期：${value}`);
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDate(value) {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, '0'),
    String(value.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function addDays(value, amount) {
  const parsed = parseDateOnly(value);
  parsed.setUTCDate(parsed.getUTCDate() + Number(amount));
  return formatDate(parsed);
}

export function daysBetween(from, to) {
  return Math.round((parseDateOnly(to) - parseDateOnly(from)) / 86_400_000);
}

export function minimumDate(...values) {
  return values.filter(Boolean).sort()[0] ?? null;
}

export async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(file, options = {}) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' && Object.hasOwn(options, 'defaultValue')) {
      return structuredClone(options.defaultValue);
    }
    throw new Error(`无法读取 JSON 文件 ${file}：${error.message}`);
  }
}

export async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`,
  );
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  try {
    await fs.rename(temporary, file);
  } catch (error) {
    if (!['EEXIST', 'EPERM'].includes(error.code)) throw error;
    await fs.rm(file, { force: true });
    await fs.rename(temporary, file);
  }
}

export async function writeTextAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`,
  );
  await fs.writeFile(temporary, value, 'utf8');
  try {
    await fs.rename(temporary, file);
  } catch (error) {
    if (!['EEXIST', 'EPERM'].includes(error.code)) throw error;
    await fs.rm(file, { force: true });
    await fs.rename(temporary, file);
  }
}

export async function appendJsonl(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, `${JSON.stringify(value)}\n`, 'utf8');
}

export async function readJsonl(file) {
  const text = await fs.readFile(file, 'utf8');
  const records = [];
  const errors = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    try {
      records.push(JSON.parse(line));
    } catch (error) {
      errors.push(`第 ${index + 1} 行：${error.message}`);
    }
  });
  if (errors.length) {
    throw new Error(`无法解析 JSONL 文件 ${file}：${errors.join('；')}`);
  }
  return records;
}

export async function sha256File(file) {
  const hash = createHash('sha256');
  hash.update(await fs.readFile(file));
  return hash.digest('hex');
}

export function resolveLearningMode(project, today = dateOnly()) {
  if (project.mode && project.mode !== 'auto') return project.mode;
  if (!project.exam_date) return 'mastery';
  const remaining = daysBetween(today, project.exam_date);
  if (remaining > 30) return 'mastery';
  if (remaining > 7) return 'balanced';
  return 'exam';
}

export function learningModeWeights(project, today = dateOnly()) {
  const mode = resolveLearningMode(project, today);
  if (mode === 'mastery') return { mode, mastery: 80, exam: 20 };
  if (mode === 'balanced') return { mode, mastery: 60, exam: 40 };
  return { mode: 'exam', mastery: 20, exam: 80 };
}

export function createProject(input = {}) {
  const now = new Date().toISOString();
  const timezone = input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const mode = input.mode || 'auto';
  if (!['auto', 'mastery', 'balanced', 'exam'].includes(mode)) {
    throw new Error(`不支持的 mode：${mode}`);
  }
  const targetScore = Number(input.targetScore ?? 90);
  if (!Number.isFinite(targetScore) || targetScore < 0 || targetScore > 100) {
    throw new Error('target-score 必须在 0 到 100 之间。');
  }
  const availableMinutes = Number(input.availableMinutes ?? 60);
  if (!Number.isFinite(availableMinutes) || availableMinutes <= 0) {
    throw new Error('available-minutes 必须大于 0。');
  }
  if (input.examDate && !isValidDateOnly(input.examDate)) {
    throw new Error(`无效考试日期：${input.examDate}`);
  }
  return {
    schema_version: SCHEMA_VERSION,
    created_at: now,
    updated_at: now,
    name: input.name || '未命名学习项目',
    subject: input.subject || input.name || '未命名学科',
    goal: input.goal || '快速且深入地掌握，并以高分通过考试。',
    exam_date: input.examDate || null,
    target_score: targetScore,
    available_minutes_per_day: availableMinutes,
    language: input.language || 'zh-CN',
    timezone,
    mode,
    source_policy: input.sourcePolicy || 'materials_only',
    mastery_weights: {
      recall: 30,
      independent_application: 30,
      retention: 20,
      transfer: 20,
    },
  };
}

export async function initWorkspace(workspace, projectInput = {}) {
  const root = path.resolve(workspace);
  const projectPath = path.join(root, 'project.json');
  if (await pathExists(projectPath)) {
    throw new Error(`工作区已存在：${projectPath}`);
  }
  await fs.mkdir(path.join(root, 'sources', 'extracted'), { recursive: true });
  await fs.mkdir(path.join(root, 'knowledge'), { recursive: true });
  await fs.mkdir(path.join(root, 'plan'), { recursive: true });
  await fs.mkdir(path.join(root, 'practice'), { recursive: true });
  await fs.mkdir(path.join(root, 'exams'), { recursive: true });
  await fs.mkdir(path.join(root, 'reviews'), { recursive: true });
  await fs.mkdir(path.join(root, 'progress'), { recursive: true });

  const project = createProject(projectInput);
  await writeJsonAtomic(projectPath, project);
  await writeJsonAtomic(path.join(root, 'sources', 'index.json'), {
    schema_version: SCHEMA_VERSION,
    sources: [],
  });
  await writeJsonAtomic(path.join(root, 'knowledge', 'concepts.json'), {
    schema_version: SCHEMA_VERSION,
    concepts: [],
  });
  await writeJsonAtomic(path.join(root, 'reviews', 'schedule.json'), {
    schema_version: SCHEMA_VERSION,
    algorithm: REVIEW_ALGORITHM,
    items: {},
  });
  await writeJsonAtomic(path.join(root, 'progress', 'mastery.json'), {
    schema_version: SCHEMA_VERSION,
    concepts: {},
    updated_at: new Date().toISOString(),
  });
  await fs.writeFile(path.join(root, 'practice', 'questions.jsonl'), '', 'utf8');
  await fs.writeFile(path.join(root, 'practice', 'attempts.jsonl'), '', 'utf8');
  await fs.writeFile(path.join(root, 'practice', 'mistakes.jsonl'), '', 'utf8');
  await writeTextAtomic(
    path.join(root, 'plan', 'roadmap.md'),
    `# ${project.name} 学习路线\n\n> 使用 \`learning-material-to-course\` 导入资料并生成概念图后更新此文件。\n`,
  );
  await writeTextAtomic(
    path.join(root, 'plan', 'today.md'),
    `# 今日学习\n\n- 项目：${project.name}\n- 默认时长：${project.available_minutes_per_day} 分钟\n- 状态：等待导入材料与首次诊断\n`,
  );
  await writeTextAtomic(
    path.join(root, 'sources', 'extracted', 'README.md'),
    '# 提取内容\n\n每个来源可在此保存带定位信息的 Markdown；原始文件默认不复制。\n',
  );
  await writeTextAtomic(
    path.join(root, 'exams', 'README.md'),
    '# 模拟考试\n\n每套试卷、答案、评分和复盘使用独立子目录保存。\n',
  );
  const status = await collectWorkspaceStatus(root, { date: dateOnly() });
  await writeDashboard(root, status);
  return status;
}

export async function registerSource(workspace, sourcePath, options = {}) {
  const root = path.resolve(workspace);
  const absoluteSource = path.resolve(sourcePath);
  const stat = await fs.stat(absoluteSource);
  if (!stat.isFile()) throw new Error(`来源不是文件：${absoluteSource}`);
  const hash = await sha256File(absoluteSource);
  const indexFile = path.join(root, 'sources', 'index.json');
  const index = await readJson(indexFile);
  if (!Array.isArray(index.sources)) throw new Error('sources/index.json 缺少 sources 数组。');

  const existingByPath = index.sources.find((item) => item.path === absoluteSource);
  const generatedId = `src-${hash.slice(0, 12)}`;
  const requestedId = options.id || existingByPath?.id || generatedId;
  const idConflict = index.sources.find((item) => item.id === requestedId && item.path !== absoluteSource);
  if (idConflict) throw new Error(`来源 ID ${requestedId} 已被其他路径使用。`);

  if (existingByPath?.sha256 === hash) {
    return { changed: false, source: existingByPath, index };
  }

  const existingIndex = index.sources.findIndex((item) => item.id === requestedId);
  const now = new Date().toISOString();
  const previous = existingIndex >= 0 ? index.sources[existingIndex] : null;
  const source = {
    id: requestedId,
    title: options.title || path.basename(absoluteSource),
    path: absoluteSource,
    type: options.type || path.extname(absoluteSource).slice(1).toLowerCase() || 'unknown',
    sha256: hash,
    size_bytes: stat.size,
    locator_scheme: options.locatorScheme || defaultLocatorScheme(absoluteSource),
    extraction: {
      status: 'pending',
      extracted_path: options.extractedPath || null,
      confidence: null,
    },
    provenance_note: previous?.sha256
      ? `文件内容已变更；上一版本哈希 ${previous.sha256}`
      : null,
    added_at: previous?.added_at || now,
    updated_at: now,
  };

  if (existingIndex >= 0) index.sources[existingIndex] = source;
  else index.sources.push(source);
  index.sources.sort((left, right) => left.id.localeCompare(right.id));
  await writeJsonAtomic(indexFile, index);
  return { changed: true, source, index };
}

function defaultLocatorScheme(file) {
  const extension = path.extname(file).toLowerCase();
  if (extension === '.pdf') return 'page';
  if (extension === '.pptx') return 'slide';
  if (['.docx', '.md', '.txt', '.html', '.htm'].includes(extension)) return 'section';
  return 'region';
}

export async function collectWorkspaceStatus(workspace, options = {}) {
  const root = path.resolve(workspace);
  const today = options.date || dateOnly();
  if (!isValidDateOnly(today)) throw new Error(`无效状态日期：${today}`);
  const project = await readJson(path.join(root, 'project.json'));
  const sources = await readJson(path.join(root, 'sources', 'index.json'));
  const concepts = await readJson(path.join(root, 'knowledge', 'concepts.json'));
  const schedule = await readJson(path.join(root, 'reviews', 'schedule.json'));
  const mastery = await readJson(path.join(root, 'progress', 'mastery.json'));
  const questions = await readJsonl(path.join(root, 'practice', 'questions.jsonl'));
  const attempts = await readJsonl(path.join(root, 'practice', 'attempts.jsonl'));
  const mistakes = await readJsonl(path.join(root, 'practice', 'mistakes.jsonl'));

  const dueItems = Object.values(schedule.items || {})
    .filter((item) => item.due && item.due <= today)
    .sort((left, right) => left.due.localeCompare(right.due) || left.concept_id.localeCompare(right.concept_id));
  const overdueItems = dueItems.filter((item) => item.due < today);
  const conceptScores = Object.values(mastery.concepts || {})
    .map((item) => Number(item.mastery_score))
    .filter(Number.isFinite);
  const averageMastery = conceptScores.length
    ? conceptScores.reduce((sum, score) => sum + score, 0) / conceptScores.length
    : 0;
  const examAttempts = attempts
    .filter((item) => item.kind === 'exam' && Number.isFinite(Number(item.score_percent)))
    .slice(-5)
    .map((item) => Number(item.score_percent));
  const readiness = computeExamReadiness({
    concepts: concepts.concepts || [],
    mastery: mastery.concepts || {},
    examAttempts,
    mistakes,
  });

  return {
    workspace: root,
    date: today,
    project,
    mode: learningModeWeights(project, today),
    counts: {
      sources: Array.isArray(sources.sources) ? sources.sources.length : 0,
      concepts: Array.isArray(concepts.concepts) ? concepts.concepts.length : 0,
      questions: questions.length,
      attempts: attempts.length,
      mistakes: mistakes.length,
      scheduled_reviews: Object.keys(schedule.items || {}).length,
      due_reviews: dueItems.length,
      overdue_reviews: overdueItems.length,
    },
    average_mastery: round(averageMastery, 1),
    exam_readiness: readiness,
    due_items: dueItems,
  };
}

export function computeExamReadiness({ concepts, mastery, examAttempts, mistakes }) {
  const totalConcepts = concepts.length;
  const coveredConcepts = concepts.filter((concept) => {
    const conceptId = concept.id;
    const score = Number(mastery[conceptId]?.mastery_score ?? concept.mastery_score ?? 0);
    return (concept.source_refs?.length || 0) > 0 || score > 0;
  }).length;
  const coverage = totalConcepts ? (coveredConcepts / totalConcepts) * 100 : 0;
  const scores = concepts
    .map((concept) => Number(mastery[concept.id]?.mastery_score ?? concept.mastery_score))
    .filter(Number.isFinite);
  const masteryScore = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
  const mockScore = examAttempts.length
    ? examAttempts.reduce((sum, value) => sum + value, 0) / examAttempts.length
    : 0;
  const consistency = examAttempts.length > 1 ? Math.max(0, 100 - standardDeviation(examAttempts) * 2) : 0;
  const criticalMistakes = mistakes.filter(
    (item) => item.status !== 'resolved' && item.severity === 'critical',
  ).length;
  const penalty = Math.min(15, criticalMistakes * 3);
  const score = clamp(
    coverage * 0.25 + masteryScore * 0.3 + mockScore * 0.3 + consistency * 0.15 - penalty,
    0,
    100,
  );
  const uncertainty = examAttempts.length > 1
    ? Math.max(3, Math.min(12, standardDeviation(examAttempts) * 1.96))
    : 8;
  return {
    score: round(score, 1),
    range: [round(clamp(score - uncertainty, 0, 100), 1), round(clamp(score + uncertainty, 0, 100), 1)],
    components: {
      coverage: round(coverage, 1),
      mastery: round(masteryScore, 1),
      mock_exam: round(mockScore, 1),
      consistency: round(consistency, 1),
      critical_error_penalty: round(penalty, 1),
    },
  };
}

export async function validateWorkspace(workspace) {
  const root = path.resolve(workspace);
  const errors = [];
  const warnings = [];
  for (const relative of REQUIRED_WORKSPACE_FILES) {
    if (!(await pathExists(path.join(root, relative)))) errors.push(`缺少文件：${relative}`);
  }
  if (errors.length) return { ok: false, workspace: root, errors, warnings };

  let project;
  let sources;
  let concepts;
  let questions;
  let schedule;
  try {
    project = await readJson(path.join(root, 'project.json'));
    sources = await readJson(path.join(root, 'sources', 'index.json'));
    concepts = await readJson(path.join(root, 'knowledge', 'concepts.json'));
    questions = await readJsonl(path.join(root, 'practice', 'questions.jsonl'));
    schedule = await readJson(path.join(root, 'reviews', 'schedule.json'));
  } catch (error) {
    return { ok: false, workspace: root, errors: [error.message], warnings };
  }

  if (project.schema_version !== SCHEMA_VERSION) {
    errors.push(`project.schema_version 必须为 ${SCHEMA_VERSION}。`);
  }
  if (!isValidDateOnly(project.created_at?.slice(0, 10))) warnings.push('project.created_at 格式异常。');
  if (project.exam_date && !isValidDateOnly(project.exam_date)) errors.push('project.exam_date 不是有效日期。');
  if (!['auto', 'mastery', 'balanced', 'exam'].includes(project.mode)) errors.push('project.mode 无效。');
  if (project.source_policy !== 'materials_only') warnings.push('source_policy 不是 materials_only，考点可能缺少材料依据。');

  const sourceIds = new Set();
  for (const source of sources.sources || []) {
    if (!source.id) errors.push('来源缺少 id。');
    else if (sourceIds.has(source.id)) errors.push(`来源 id 重复：${source.id}`);
    else sourceIds.add(source.id);
    if (!source.path) errors.push(`来源 ${source.id || '(无 id)'} 缺少 path。`);
    if (source.sha256 && !/^[a-f0-9]{64}$/i.test(source.sha256)) {
      errors.push(`来源 ${source.id} 的 sha256 格式无效。`);
    }
    if (source.path && !(await pathExists(path.isAbsolute(source.path) ? source.path : path.resolve(root, source.path)))) warnings.push(`来源文件当前不可访问：${source.path}`);
  }

  const conceptIds = new Set();
  const conceptMap = new Map();
  for (const concept of concepts.concepts || []) {
    if (!concept.id) errors.push('概念缺少 id。');
    else if (conceptIds.has(concept.id)) errors.push(`概念 id 重复：${concept.id}`);
    else {
      conceptIds.add(concept.id);
      conceptMap.set(concept.id, concept);
    }
    if (!Array.isArray(concept.source_refs)) errors.push(`概念 ${concept.id || '(无 id)'} 缺少 source_refs 数组。`);
    const refs = Array.isArray(concept.source_refs) ? concept.source_refs : [];
    if (!concept.inferred && refs.length === 0) errors.push(`概念 ${concept.id || '(无 id)'} 无来源依据且未标记 inferred。`);
    for (const ref of refs) {
      if (!sourceIds.has(ref)) errors.push(`概念 ${concept.id} 引用了不存在的来源：${ref}`);
    }
  }
  for (const concept of concepts.concepts || []) {
    for (const prerequisite of concept.prerequisites || []) {
      if (!conceptIds.has(prerequisite)) errors.push(`概念 ${concept.id} 引用了不存在的前置概念：${prerequisite}`);
    }
  }
  for (const cycle of findConceptCycles(conceptMap)) {
    errors.push(`概念先修关系存在环：${cycle.join(' -> ')}`);
  }

  const questionIds = new Set();
  for (const question of questions) {
    if (!question.id) errors.push('题目缺少 id。');
    else if (questionIds.has(question.id)) errors.push(`题目 id 重复：${question.id}`);
    else questionIds.add(question.id);
    if (!PROVENANCE_KINDS.has(question.provenance)) {
      errors.push(`题目 ${question.id || '(无 id)'} 的 provenance 无效。`);
    }
    if (!Array.isArray(question.concept_ids) || question.concept_ids.length === 0) {
      errors.push(`题目 ${question.id || '(无 id)'} 必须关联至少一个概念。`);
    }
    for (const conceptId of question.concept_ids || []) {
      if (!conceptIds.has(conceptId)) errors.push(`题目 ${question.id} 引用了不存在的概念：${conceptId}`);
    }
    if (question.provenance && question.provenance !== 'model_generated') {
      if (!Array.isArray(question.source_refs) || question.source_refs.length === 0) {
        errors.push(`题目 ${question.id} 声称有来源但没有 source_refs。`);
      }
    }
    for (const sourceRef of question.source_refs || []) {
      if (!sourceIds.has(sourceRef)) errors.push(`题目 ${question.id} 引用了不存在的来源：${sourceRef}`);
    }
  }

  for (const [conceptId, item] of Object.entries(schedule.items || {})) {
    if (!conceptIds.has(conceptId)) warnings.push(`复习队列包含未知概念：${conceptId}`);
    if (item.due && !isValidDateOnly(item.due)) errors.push(`复习项 ${conceptId} 的 due 无效。`);
  }

  return {
    ok: errors.length === 0,
    workspace: root,
    errors,
    warnings,
    summary: {
      sources: sourceIds.size,
      concepts: conceptIds.size,
      questions: questionIds.size,
      scheduled_reviews: Object.keys(schedule.items || {}).length,
    },
  };
}

function findConceptCycles(conceptMap) {
  const cycles = [];
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  function visit(id) {
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      cycles.push([...stack.slice(start), id]);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    stack.push(id);
    for (const next of conceptMap.get(id)?.prerequisites || []) {
      if (conceptMap.has(next)) visit(next);
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of conceptMap.keys()) visit(id);
  return cycles;
}

export async function writeDashboard(workspace, status) {
  const root = path.resolve(workspace);
  const weights = status.mode;
  const dashboard = `# 学习仪表盘\n\n> 自动生成于 ${new Date().toISOString()}；可重新运行 \`workspace.mjs status --write-dashboard\` 更新。\n\n` +
    `## 当前状态\n\n` +
    `- 项目：${status.project.name}\n` +
    `- 学科：${status.project.subject}\n` +
    `- 模式：${weights.mode}（掌握 ${weights.mastery}% / 考试 ${weights.exam}%）\n` +
    `- 考试日期：${status.project.exam_date || '未设置'}\n` +
    `- 目标分数：${status.project.target_score}\n` +
    `- 来源：${status.counts.sources}\n` +
    `- 概念：${status.counts.concepts}\n` +
    `- 平均掌握：${status.average_mastery}/100\n` +
    `- 考试就绪度：${status.exam_readiness.score}/100（区间 ${status.exam_readiness.range[0]}–${status.exam_readiness.range[1]}）\n` +
    `- 到期复习：${status.counts.due_reviews}\n` +
    `- 逾期复习：${status.counts.overdue_reviews}\n\n` +
    `## 考试就绪度组成\n\n` +
    `- 材料覆盖：${status.exam_readiness.components.coverage}\n` +
    `- 概念掌握：${status.exam_readiness.components.mastery}\n` +
    `- 限时模拟：${status.exam_readiness.components.mock_exam}\n` +
    `- 稳定性：${status.exam_readiness.components.consistency}\n` +
    `- 关键错误扣分：${status.exam_readiness.components.critical_error_penalty}\n\n` +
    `## 到期项目\n\n` +
    (status.due_items.length
      ? status.due_items.map((item) => `- ${item.concept_id}（应复习：${item.due}）`).join('\n')
      : '- 暂无到期项目') + '\n';
  await writeTextAtomic(path.join(root, 'progress', 'dashboard.md'), dashboard);
  return dashboard;
}

export function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function standardDeviation(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
}

export function parseCliFlags(args) {
  const flags = {};
  const positional = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = args[index + 1];
    if (next === undefined || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    index += 1;
  }
  return { flags, positional };
}

export function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
