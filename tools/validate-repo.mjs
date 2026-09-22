#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCatalog, validateCatalog } from './render-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseFrontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
    throw new Error('SKILL.md 必须以 YAML frontmatter 开始。');
  }
  const end = text.search(/\r?\n---\r?\n/);
  if (end < 0) throw new Error('SKILL.md frontmatter 未闭合。');
  const block = text.slice(text.indexOf('\n') + 1, end).replace(/\r/g, '');
  const values = {};
  for (const line of block.split('\n')) {
    const match = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (match) values[match[1]] = match[2].trim().replace(/^"|"$/g, '');
  }
  return values;
}

function parseSimpleYaml(text) {
  const output = {};
  let section = null;
  for (const rawLine of text.replace(/\r/g, '').split('\n')) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith('#')) continue;
    const indent = rawLine.match(/^\s*/)[0].length;
    const match = /^\s*([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(rawLine);
    if (!match) continue;
    if (indent === 0) {
      section = match[2] ? null : match[1];
      output[match[1]] = match[2] ? match[2].replace(/^"|"$/g, '') : {};
    } else if (section) {
      output[section][match[1]] = match[2].replace(/^"|"$/g, '');
    }
  }
  return output;
}

export async function validateRepository(repoRoot = root) {
  const errors = [];
  const warnings = [];
  const pluginRoot = path.join(repoRoot, 'plugins', 'learning-mastery-skills');
  const manifestPath = path.join(pluginRoot, '.codex-plugin', 'plugin.json');
  const marketplacePath = path.join(repoRoot, '.agents', 'plugins', 'marketplace.json');

  let manifest;
  let marketplace;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    errors.push(`无法读取插件 manifest：${error.message}`);
  }
  try {
    marketplace = JSON.parse(await readFile(marketplacePath, 'utf8'));
  } catch (error) {
    errors.push(`无法读取 marketplace：${error.message}`);
  }

  if (manifest) {
    for (const field of ['name', 'version', 'description', 'author', 'license', 'skills', 'interface']) {
      if (!manifest[field]) errors.push(`plugin.json 缺少 ${field}。`);
    }
    if (manifest.name !== 'learning-mastery-skills') errors.push('plugin.json name 不正确。');
    if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) errors.push('plugin.json version 必须是 strict semver。');
    if (manifest.license !== 'MIT') errors.push('plugin.json license 必须为 MIT。');
    if (!manifest.author?.name) errors.push('plugin.json author.name 缺失。');
    if (!manifest.interface?.displayName || !manifest.interface?.shortDescription || !manifest.interface?.developerName || !manifest.interface?.category || !manifest.interface?.defaultPrompt) {
      errors.push('plugin.json interface 必填字段不完整。');
    }
    if (!Array.isArray(manifest.interface?.capabilities) || manifest.interface.capabilities.length === 0) {
      errors.push('plugin.json interface.capabilities 必须是非空数组。');
    }
    if (manifest.skills !== './skills/') errors.push('plugin.json skills 必须指向 ./skills/。');
  }

  if (marketplace) {
    if (marketplace.name !== 'learning-mastery') errors.push('marketplace name 必须为 learning-mastery。');
    const plugin = marketplace.plugins?.find((entry) => entry.name === 'learning-mastery-skills');
    if (!plugin) errors.push('marketplace 缺少 learning-mastery-skills 条目。');
    if (plugin?.source?.path !== './plugins/learning-mastery-skills') errors.push('marketplace source.path 不正确。');
    if (plugin?.category !== 'Education') errors.push('marketplace category 必须为 Education。');
    if (plugin?.policy?.installation !== 'AVAILABLE' || plugin?.policy?.authentication !== 'ON_INSTALL') {
      errors.push('marketplace policy 不正确。');
    }
  }

  const skillsRoot = path.join(pluginRoot, 'skills');
  let skillNames = [];
  try {
    skillNames = (await readdir(skillsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    errors.push(`无法读取 skills 目录：${error.message}`);
  }
  const expectedSkills = [
    'learning-exam-coach',
    'learning-mastery',
    'learning-material-to-course',
    'learning-momentum',
    'learning-review-coach',
    'learning-tutor',
  ];
  if (JSON.stringify(skillNames) !== JSON.stringify(expectedSkills)) {
    errors.push(`skill 目录列表不符合预期：${skillNames.join(', ')}`);
  }

  for (const skillName of skillNames) {
    const skillRoot = path.join(skillsRoot, skillName);
    const skillFile = path.join(skillRoot, 'SKILL.md');
    const yamlFile = path.join(skillRoot, 'agents', 'openai.yaml');
    try {
      const text = await readFile(skillFile, 'utf8');
      const frontmatter = parseFrontmatter(text);
      if (frontmatter.name !== skillName) errors.push(`${skillName}/SKILL.md name 与目录不一致。`);
      if (!frontmatter.description || frontmatter.description.length < 40) {
        errors.push(`${skillName}/SKILL.md description 过短或缺失。`);
      }
      if (/\[TODO:/i.test(text)) errors.push(`${skillName}/SKILL.md 仍含 TODO。`);
      const localReferences = [...text.matchAll(/\]\((references\/[^)]+)\)/g)].map((match) => match[1]);
      for (const reference of localReferences) {
        try {
          await readFile(path.join(skillRoot, reference), 'utf8');
        } catch {
          errors.push(`${skillName}/SKILL.md 引用了不存在的文件：${reference}`);
        }
      }
    } catch (error) {
      errors.push(`无法验证 ${skillName}/SKILL.md：${error.message}`);
    }
    try {
      const yaml = parseSimpleYaml(await readFile(yamlFile, 'utf8'));
      if (!yaml.interface?.display_name) errors.push(`${skillName}/agents/openai.yaml 缺少 display_name。`);
      if (!yaml.interface?.short_description) errors.push(`${skillName}/agents/openai.yaml 缺少 short_description。`);
      if (!yaml.interface?.default_prompt?.includes(`$${skillName}`)) {
        errors.push(`${skillName}/agents/openai.yaml default_prompt 必须显式提及 $${skillName}。`);
      }
    } catch (error) {
      errors.push(`无法验证 ${skillName}/agents/openai.yaml：${error.message}`);
    }
  }

  try {
    const catalog = JSON.parse(await readFile(path.join(repoRoot, 'catalog', 'skills.json'), 'utf8'));
    validateCatalog(catalog);
    const rendered = renderCatalog(catalog);
    const checkedIn = await readFile(path.join(repoRoot, 'docs', 'CATALOG.md'), 'utf8');
    if (rendered !== checkedIn) errors.push('docs/CATALOG.md 与 catalog/skills.json 不同步。');
  } catch (error) {
    errors.push(`目录验证失败：${error.message}`);
  }

  return { ok: errors.length === 0, errors, warnings, skills: skillNames };
}

async function main() {
  const result = await validateRepository(root);
  if (result.ok) {
    console.log(`仓库验证通过：${result.skills.length} 个 skill，插件和 marketplace 结构一致。`);
    for (const warning of result.warnings) console.warn(`警告：${warning}`);
    return;
  }
  console.error('仓库验证失败：');
  for (const error of result.errors) console.error(`- ${error}`);
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
