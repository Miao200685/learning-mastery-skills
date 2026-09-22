#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectWorkspaceStatus,
  dateOnly,
  initWorkspace,
  parseCliFlags,
  printJson,
  registerSource,
  validateWorkspace,
  writeDashboard,
} from './lib/core.mjs';

const HELP = `learning-mastery workspace 工具

用法：
  node scripts/workspace.mjs init <工作区> [选项]
  node scripts/workspace.mjs source <工作区> <文件> [选项]
  node scripts/workspace.mjs validate <工作区> [--json]
  node scripts/workspace.mjs status <工作区> [--date YYYY-MM-DD] [--json] [--write-dashboard]

init 选项：
  --name <名称>                 项目名称
  --subject <学科>              学科或技能名称
  --goal <目标>                 学习目标
  --exam-date <YYYY-MM-DD>      考试日期
  --target-score <0-100>        目标分数，默认 90
  --available-minutes <分钟>    每日可用时间，默认 60
  --timezone <IANA 时区>        例如 Asia/Shanghai
  --mode <auto|mastery|balanced|exam>
  --language <语言>             默认 zh-CN
  --source-policy <策略>        默认 materials_only

source 选项：
  --id <来源ID>
  --title <标题>
  --type <类型>
  --locator-scheme <page|slide|section|region>
  --extracted-path <提取文本路径>
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

async function runInit(args) {
  const { flags, positional } = parseCliFlags(args);
  const workspace = requireWorkspace(positional);
  const status = await initWorkspace(workspace, {
    name: flags.name,
    subject: flags.subject,
    goal: flags.goal,
    examDate: flags['exam-date'],
    targetScore: flags['target-score'],
    availableMinutes: flags['available-minutes'],
    timezone: flags.timezone,
    mode: flags.mode,
    language: flags.language,
    sourcePolicy: flags['source-policy'],
  });
  console.log(`已创建工作区：${workspace}`);
  console.log(`模式：${status.mode.mode}；下次运行 status 可查看掌握度。`);
}

async function runSource(args) {
  const { flags, positional } = parseCliFlags(args);
  const workspace = requireWorkspace(positional);
  if (!positional[1]) usageError('缺少来源文件路径。');
  const result = await registerSource(workspace, positional[1], {
    id: flags.id,
    title: flags.title,
    type: flags.type,
    locatorScheme: flags['locator-scheme'],
    extractedPath: flags['extracted-path'],
  });
  if (flags.json) printJson(result);
  else if (result.changed) console.log(`已登记来源：${result.source.id} (${result.source.title})`);
  else console.log(`来源未变化：${result.source.id}`);
}

async function runValidate(args) {
  const { flags, positional } = parseCliFlags(args);
  const workspace = requireWorkspace(positional);
  const result = await validateWorkspace(workspace);
  if (flags.json) printJson(result);
  else {
    console.log(result.ok ? '工作区验证通过。' : '工作区验证失败。');
    if (result.summary) {
      console.log(
        `来源 ${result.summary.sources}；概念 ${result.summary.concepts}；题目 ${result.summary.questions}；复习项 ${result.summary.scheduled_reviews}`,
      );
    }
    for (const error of result.errors) console.error(`错误：${error}`);
    for (const warning of result.warnings) console.warn(`警告：${warning}`);
  }
  if (!result.ok) process.exitCode = 1;
}

async function runStatus(args) {
  const { flags, positional } = parseCliFlags(args);
  const workspace = requireWorkspace(positional);
  const status = await collectWorkspaceStatus(workspace, { date: flags.date || dateOnly() });
  if (flags['write-dashboard']) await writeDashboard(workspace, status);
  if (flags.json) {
    printJson(status);
    return;
  }
  console.log(`项目：${status.project.name}`);
  console.log(`模式：${status.mode.mode}（掌握 ${status.mode.mastery}% / 考试 ${status.mode.exam}%）`);
  console.log(`平均掌握：${status.average_mastery}/100`);
  console.log(
    `考试就绪度：${status.exam_readiness.score}/100（区间 ${status.exam_readiness.range[0]}–${status.exam_readiness.range[1]}）`,
  );
  console.log(
    `来源 ${status.counts.sources}；概念 ${status.counts.concepts}；题目 ${status.counts.questions}；到期复习 ${status.counts.due_reviews}；逾期 ${status.counts.overdue_reviews}`,
  );
  if (status.due_items.length) {
    console.log('到期项目：');
    for (const item of status.due_items) console.log(`- ${item.concept_id}（${item.due}）`);
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }
  if (command === 'init') return runInit(args);
  if (command === 'source') return runSource(args);
  if (command === 'validate') return runValidate(args);
  if (command === 'status') return runStatus(args);
  usageError(`未知命令：${command}`);
}


if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    if (error.isUsage) console.error(HELP);
    process.exitCode = 1;
  });
}
