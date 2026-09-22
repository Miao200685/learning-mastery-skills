# Contributing

## 质量门槛

新增或修改技能必须满足：

- 描述能明确触发条件，避免泛化到无关任务。
- 工作流基于可迁移的学习机制，而不是长篇通用建议。
- 事实性输出保留来源定位；缺少证据时明确返回 `证据不足`。
- 不把 `model_generated` 练习描述为真题或官方考点。
- 状态变化有可恢复的数据结构、边界条件和验证方法。
- 不复制许可证不兼容的外部内容。
- 不提交个人学习数据、密钥或受限材料。

## 本地验证

```bash
node --test tests/*.test.mjs
node tools/render-catalog.mjs --check
node tools/validate-repo.mjs
node scripts/workspace.mjs validate examples/learning-workspace-template
```

如本机已有 Codex 官方 `skill-creator` 和 `plugin-creator`，还应运行其 `quick_validate.py` 与 `validate_plugin.py`。

## 更新外部目录

1. 直接核验上游仓库的许可证、最近提交、README、SKILL.md、测试和安装说明。
2. 修改 `catalog/skills.json`，不要直接编辑生成的 `docs/CATALOG.md`。
3. 运行 `node tools/render-catalog.mjs`。
4. 在 PR 中写明核验日期、变化和仍然存在的风险。
5. 无法确认许可证的项目只能链接，不得复制代码或大段文本。

## 提交规范

使用 Conventional Commits，例如：

- `feat: add exam readiness calculation`
- `fix: cap review date before exam`
- `docs: refresh external skill audit`
