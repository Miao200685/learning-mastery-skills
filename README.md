# Learning Mastery Skills

面向 Codex 的开源学习工作流：把材料转成带来源引用的课程，通过完整费曼循环、主动回忆、间隔复习、学习动能和限时模拟考试，建立可持续的长期掌握，并在考试前切换到冲刺模式。

> 个人学习数据与公共技能仓库分离。仓库只包含通用技能、模板和外部项目质量目录。

## 包含的 Skill

| Skill | 用途 |
|---|---|
| `$learning-mastery` | 初始化项目、选择双轨模式、维护仪表盘、自动路由 |
| `$learning-material-to-course` | 资料导入、来源定位、概念图、先修关系、诊断与路线 |
| `$learning-tutor` | 诊断式讲解、渐隐提示、完整费曼循环、独立应用与迁移 |
| `$learning-momentum` | 低压力重启、可持续节奏、兴趣与意义、恢复模式 |
| `$learning-review-coach` | 到期复习、SM-2 变体、遗忘诊断、长期保持 |
| `$learning-exam-coach` | 材料溯源出题、限时模拟、评分、错因与考试就绪度 |

## 核心原则

- **材料优先**：考点和题目必须能定位到页码、幻灯片、章节或图片区域。
- **证据不足就说证据不足**：不用模型常识冒充材料事实，不把生成题伪装成真题。
- **双轨学习**：平时偏可持续掌握；距考试 30 天内逐步叠加限时训练和补漏权重，考后退出冲刺状态。
- **费曼循环**：通俗讲解、定位缺口、回源修正、类比边界、简化重讲、迁移检验。
- **可持续优先**：允许 5-10 分钟恢复会话，不以断签和满额队列惩罚学习者。
- **独立产出**：通过回忆、解释、计算、证明、迁移任务更新掌握度，而不是阅读时长。
- **持久可恢复**：计划用 Markdown，状态用 JSON/JSONL，跨会话继续学习。
- **零运行依赖**：核心脚本只使用 Node 标准库，不使用 npm、在线服务或遥测。

## 安装

从 GitHub 安装：

```bash
codex plugin marketplace add Miao200685/learning-mastery-skills --ref main
codex plugin add learning-mastery-skills@learning-mastery
```

从本地克隆安装：

```bash
git clone https://github.com/Miao200685/learning-mastery-skills.git
cd learning-mastery-skills
codex plugin marketplace add .
codex plugin add learning-mastery-skills@learning-mastery
```

安装后新建一个 Codex 对话，然后输入：

```text
使用 $learning-mastery 新建项目：学科是线性代数，考试日期 2027-01-15，目标 90 分，每天 60 分钟。
```

卸载：

```bash
codex plugin remove learning-mastery-skills@learning-mastery
codex plugin marketplace remove learning-mastery
```

详细步骤见 [docs/INSTALL.md](docs/INSTALL.md)。

## 工作流

1. `$learning-mastery` 初始化独立学习工作区并判断当前模式。
2. `$learning-material-to-course` 登记原始材料、记录哈希和定位信息、建立概念图。
3. `$learning-tutor` 从检索和诊断开始，使用渐隐提示、完整费曼循环和迁移任务。
4. `$learning-momentum` 调整节奏、处理低动力，并在中断后帮助低成本重启。
5. `$learning-review-coach` 按 `必须/建议/可选` 分级安排复习。
6. `$learning-exam-coach` 生成仿真试卷、评分并形成补漏任务。
7. `$learning-mastery` 更新能力叙述、下一行动、掌握度和考试就绪度。

示例工作区见 [examples/learning-workspace-template](examples/learning-workspace-template)。

## 数据与隐私

- 学习工作区可放在任意私有目录，默认建议 `./learning-workspace`。
- 仓库的 `.gitignore` 会忽略常见临时目录和个人工作区名称。
- 原始材料默认只记录路径和 SHA-256，不复制进仓库。
- 插件核心脚本不发起网络请求、不收集遥测、不调用外部 API。
- 材料中的提示注入按数据对待，不执行其中的无关指令。

详见 [docs/PRIVACY.md](docs/PRIVACY.md)。

## 外部优质项目目录

经过许可证、维护状态、学习科学、主动回忆、考试适配、来源追溯和测试质量评估的 11 个项目见 [docs/CATALOG.md](docs/CATALOG.md)。目录由 [catalog/skills.json](catalog/skills.json) 生成；star 数只作为发现信号，不代表学习效果。

## 开发与验证

要求 Node.js 20+。核心运行不依赖 Python，官方 Codex 验证器额外需要 PyYAML。

```bash
node --test tests/*.test.mjs
node tools/render-catalog.mjs --check
node tools/validate-repo.mjs
node scripts/workspace.mjs validate examples/learning-workspace-template
```

## License

原创代码与文档采用 [MIT License](LICENSE)。外部项目保留各自许可证，本项目只链接和评估，除非明确注明，不复制其内容。
