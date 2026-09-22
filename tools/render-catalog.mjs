#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'catalog', 'skills.json');
const defaultOutput = path.join(root, 'docs', 'CATALOG.md');
const scoreKeys = [
  'learning_science',
  'active_learning',
  'retention',
  'exam_fit',
  'traceability',
  'persistence',
  'testing',
  'license_clarity',
  'maintenance',
];
const scoreLabels = {
  learning_science: '学习科学',
  active_learning: '主动学习',
  retention: '长期记忆',
  exam_fit: '考试适配',
  traceability: '来源追溯',
  persistence: '状态持久',
  testing: '测试质量',
  license_clarity: '许可清晰',
  maintenance: '维护活跃',
};
const tierOrder = ['direct', 'specialized', 'index'];

function fail(message) {
  throw new Error(message);
}

export function validateCatalog(catalog) {
  if (catalog.schema_version !== 1) fail('catalog.schema_version 必须为 1。');
  if (!catalog.checked_at || !/^\d{4}-\d{2}-\d{2}$/.test(catalog.checked_at)) {
    fail('catalog.checked_at 必须是 YYYY-MM-DD。');
  }
  if (!Array.isArray(catalog.entries) || catalog.entries.length === 0) fail('catalog.entries 不能为空。');
  const ids = new Set();
  const repos = new Set();
  for (const entry of catalog.entries) {
    for (const field of ['id', 'name', 'repo', 'url', 'license', 'tier', 'best_for', 'recommended_use']) {
      if (!entry[field]) fail(`${entry.id || '(unknown)'} 缺少 ${field}。`);
    }
    if (ids.has(entry.id)) fail(`目录 id 重复：${entry.id}`);
    if (repos.has(entry.repo)) fail(`仓库重复：${entry.repo}`);
    ids.add(entry.id);
    repos.add(entry.repo);
    if (!tierOrder.includes(entry.tier)) fail(`${entry.id} 的 tier 无效。`);
    if (!Number.isFinite(entry.stars) || entry.stars < 0) fail(`${entry.id} 的 stars 无效。`);
    for (const key of scoreKeys) {
      const value = entry.scores?.[key];
      if (!Number.isFinite(value) || value < 0 || value > 5) {
        fail(`${entry.id} 的分数 ${key} 必须在 0 到 5 之间。`);
      }
    }
    for (const field of ['strengths', 'risks']) {
      if (!Array.isArray(entry[field]) || entry[field].length === 0) fail(`${entry.id} 缺少 ${field}。`);
    }
  }
  return true;
}

export function averageScore(scores) {
  return Math.round((scoreKeys.reduce((sum, key) => sum + scores[key], 0) / scoreKeys.length) * 10) / 10;
}

function stars(value) {
  return `${value.toLocaleString('en-US')} ★`;
}

function dateOrUnknown(value) {
  return value || '未核实';
}

export function renderCatalog(catalog) {
  validateCatalog(catalog);
  const lines = [
    '# 学习类 Agent Skills 质量目录',
    '',
    `> 核验日期：${catalog.checked_at}`,
    '>',
    `> ${catalog.disclaimer}`,
    '',
    '## 评分方法',
    '',
    '每个维度按 0–5 分评估。总分只用于同类项目的相对比较，不代表实际学习效果；star 数只作为发现信号。',
    '',
    `维度：${scoreKeys.map((key) => scoreLabels[key]).join('、')}。`,
    '',
  ];
  for (const tier of tierOrder) {
    const entries = catalog.entries
      .filter((entry) => entry.tier === tier)
      .sort((left, right) => averageScore(right.scores) - averageScore(left.scores));
    lines.push(`## ${catalog.tiers[tier]}`, '');
    if (!entries.length) {
      lines.push('暂无条目。', '');
      continue;
    }
    for (const entry of entries) {
      lines.push(`### [${entry.name}](${entry.url})`, '');
      lines.push(
        `- 仓库：\`${entry.repo}\``,
        `- 许可证：${entry.license}`,
        `- Star：${stars(entry.stars)}`,
        `- 创建：${dateOrUnknown(entry.created_at)}；最近推送：${dateOrUnknown(entry.last_pushed)}`,
        `- Codex：${entry.codex_compatibility}`,
        `- 综合评分：**${averageScore(entry.scores)}/5**`,
        `- 最适合：${entry.best_for}`,
        '',
      );
      lines.push('**优点**', '');
      for (const value of entry.strengths) lines.push(`- ${value}`);
      lines.push('', '**风险**', '');
      for (const value of entry.risks) lines.push(`- ${value}`);
      lines.push('', `**建议用法**：${entry.recommended_use}`, '');
      lines.push(`**核验依据**：${entry.evidence}`, '');
      lines.push(
        `**分项**：${scoreKeys.map((key) => `${scoreLabels[key]} ${entry.scores[key]}`).join('；')}`,
        '',
      );
      lines.push('---', '');
    }
  }
  lines.push(
    '## 维护规则',
    '',
    '- 每季度或目录维护时重新核验许可证、最近提交、测试证据和安装方式。',
    '- 无法确认许可证的项目只能链接，不得复制进本仓库。',
    '- 发现仓库长期停更、安装失效或存在供应链风险后，应降级或移出目录。',
    '',
    '<!-- 由 tools/render-catalog.mjs 生成；修改 catalog/skills.json 后重新生成。 -->',
    '',
  );
  return lines.join('\n');
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const outputIndex = process.argv.indexOf('--output');
  const output = process.argv.includes('--check')
    ? defaultOutput
    : outputIndex >= 0 && process.argv[outputIndex + 1]
      ? process.argv[outputIndex + 1]
      : defaultOutput;
  const rendered = renderCatalog(catalog);
  if (process.argv.includes('--check')) {
    const existing = await readFile(output, 'utf8');
    if (existing !== rendered) {
      console.error('docs/CATALOG.md 已过期，请运行 node tools/render-catalog.mjs。');
      process.exitCode = 1;
    } else {
      console.log('目录文档与 skills.json 一致。');
    }
    return;
  }
  await writeFile(output, rendered, 'utf8');
  console.log(`已生成：${output}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
