#!/usr/bin/env node
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  SCHEMA_VERSION,
  dateOnly,
  parseCliFlags,
  pathExists,
  printJson,
  readJson,
  validateWorkspace,
  writeJsonAtomic,
} from './lib/core.mjs';

const STAGES = ['explain', 'gap', 'source_check', 'analogy', 'simplify', 'transfer'];
const HELP = `learning-mastery 费曼循环

用法：
  node scripts/feynman.mjs record <工作区> --concept <概念ID> --stage <阶段> [选项]
  node scripts/feynman.mjs show <工作区> --concept <概念ID> [--json]
  node scripts/feynman.mjs status <工作区> [--json]

阶段：
  explain       不用术语向外行解释
  gap           标记讲不清的具体句子
  source_check  回源并修正
  analogy       给出类比及失效边界
  simplify      用不同表示重新简化解释
  transfer      在新例子中检验

选项：
  --text <文本>             记录内容
  --file <路径>             从 UTF-8 文件读取内容
  --confidence <1-5>
  --source <ID:定位>        source_check 可选来源定位
  --boundary <文本>         analogy 必填的类比失效边界
  --new-cycle               强制开始新一轮
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

async function loadStore(workspace) {
  const file = path.join(workspace, 'knowledge', 'feynman.json');
  if (!(await pathExists(file))) {
    return { schema_version: SCHEMA_VERSION, concepts: {} };
  }
  const store = await readJson(file);
  if (store.schema_version !== SCHEMA_VERSION) throw new Error('feynman.json schema_version 不受支持。');
  if (!store.concepts || typeof store.concepts !== 'object' || Array.isArray(store.concepts)) {
    throw new Error('feynman.json 缺少 concepts 对象。');
  }
  return store;
}

function newCycle() {
  const now = new Date().toISOString();
  return {
    id: `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'in_progress',
    started_at: now,
    completed_at: null,
    stages: {},
  };
}

async function record(args) {
  const { flags, positional } = parseCliFlags(args);
  const workspace = requireWorkspace(positional);
  if (!flags.concept) usageError('缺少 --concept。');
  if (!flags.stage) usageError('缺少 --stage。');
  if (!STAGES.includes(flags.stage)) usageError(`未知阶段：${flags.stage}`);
  const validation = await validateWorkspace(workspace);
  if (!validation.ok) throw new Error(`工作区验证失败：${validation.errors.join('；')}`);

  const concepts = await readJson(path.join(workspace, 'knowledge', 'concepts.json'));
  if (!(concepts.concepts || []).some((item) => item.id === flags.concept)) {
    throw new Error(`概念不存在：${flags.concept}`);
  }

  let text = flags.text;
  if (flags.file) text = await readFile(path.resolve(flags.file), 'utf8');
  if (!text || !String(text).trim()) usageError('请提供 --text 或 --file。');
  if (flags.stage === 'analogy' && !flags.boundary) usageError('analogy 阶段必须提供 --boundary。');

  const confidence = flags.confidence === undefined ? null : Number(flags.confidence);
  if (confidence !== null && (!Number.isInteger(confidence) || confidence < 1 || confidence > 5)) {
    usageError('--confidence 必须是 1 到 5 的整数。');
  }

  const store = await loadStore(workspace);
  const concept = store.concepts[flags.concept] || {
    concept_id: flags.concept,
    cycles: [],
  };
  let cycle = flags['new-cycle'] ? null : [...concept.cycles].reverse().find((item) => item.status === 'in_progress');
  if (!cycle) {
    cycle = newCycle();
    concept.cycles.push(cycle);
  }
  cycle.stages[flags.stage] = {
    text: String(text).trim(),
    confidence,
    source: flags.source || null,
    boundary: flags.boundary || null,
    recorded_at: dateOnly(),
  };
  if (STAGES.every((stage) => cycle.stages[stage])) {
    cycle.status = 'complete';
    cycle.completed_at = new Date().toISOString();
  }
  store.concepts[flags.concept] = concept;
  await writeJsonAtomic(path.join(workspace, 'knowledge', 'feynman.json'), store);

  const payload = { cycle, complete: cycle.status === 'complete' };
  if (flags.json) printJson(payload);
  else {
    console.log(`已记录 ${flags.concept} / ${flags.stage}。`);
    console.log(cycle.status === 'complete' ? '费曼循环已完成。' : `下一阶段：${STAGES.find((stage) => !cycle.stages[stage])}`);
  }
}

async function show(args) {
  const { flags, positional } = parseCliFlags(args);
  const workspace = requireWorkspace(positional);
  if (!flags.concept) usageError('缺少 --concept。');
  const store = await loadStore(workspace);
  const concept = store.concepts[flags.concept];
  if (!concept) throw new Error(`没有费曼记录：${flags.concept}`);
  if (flags.json) printJson(concept);
  else {
    for (const cycle of concept.cycles) {
      console.log(`# ${cycle.id} [${cycle.status}]`);
      for (const stage of STAGES) {
        const item = cycle.stages[stage];
        if (!item) continue;
        console.log(`- ${stage}: ${item.text}`);
        if (item.boundary) console.log(`  边界：${item.boundary}`);
      }
    }
  }
}

async function status(args) {
  const { flags, positional } = parseCliFlags(args);
  const workspace = requireWorkspace(positional);
  const store = await loadStore(workspace);
  const cycles = Object.values(store.concepts).flatMap((concept) => concept.cycles || []);
  const result = {
    concepts: Object.keys(store.concepts).length,
    cycles: cycles.length,
    complete: cycles.filter((cycle) => cycle.status === 'complete').length,
    in_progress: cycles.filter((cycle) => cycle.status !== 'complete').length,
    incomplete: cycles
      .filter((cycle) => cycle.status !== 'complete')
      .map((cycle) => ({
        concept_id: Object.entries(store.concepts).find(([, concept]) => concept.cycles.includes(cycle))?.[0],
        cycle_id: cycle.id,
        missing: STAGES.filter((stage) => !cycle.stages[stage]),
      })),
  };
  if (flags.json) printJson(result);
  else {
    console.log(`费曼概念：${result.concepts}；循环：${result.cycles}；完成：${result.complete}；进行中：${result.in_progress}`);
    for (const item of result.incomplete) {
      console.log(`- ${item.concept_id} / ${item.cycle_id}：缺少 ${item.missing.join('、')}`);
    }
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }
  if (command === 'record') return record(args);
  if (command === 'show') return show(args);
  if (command === 'status') return status(args);
  usageError(`未知命令：${command}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    if (error.isUsage) console.error(HELP);
    process.exitCode = 1;
  });
}
