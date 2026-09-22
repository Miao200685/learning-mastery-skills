# 安装与使用

## 前置条件

- Codex CLI 版本支持 `codex plugin marketplace`。
- Node.js 20 或更高版本可供脚本命令使用。
- 插件核心功能不需要 npm、Python、网络服务或 API Key。

资料解析使用当前 Codex 环境中可用的文档、PDF、表格或图像工具。扫描件没有文本层时，系统会保留页面定位并标记待核验，不保证自动 OCR。

## 从 GitHub 安装

```bash
codex plugin marketplace add Miao200685/learning-mastery-skills --ref main
codex plugin add learning-mastery-skills@learning-mastery
```

安装或升级后新建 Codex 对话，以便重新加载技能。

## 从本地目录安装

```bash
git clone https://github.com/Miao200685/learning-mastery-skills.git
cd learning-mastery-skills
codex plugin marketplace add .
codex plugin add learning-mastery-skills@learning-mastery
```

## 第一次使用

```text
使用 $learning-mastery 新建学习项目。
学科：微观经济学
目标：理解模型并能在新案例中应用，期末考试达到 90 分
考试日期：2027-01-10
每天可用：60 分钟
材料：只使用我提供的教材、课件和历年题
```

随后把材料路径交给 `$learning-material-to-course`。工作区默认保存在项目中，不写入插件安装目录。`$learning-momentum` 负责低压力重启和可持续节奏；`$learning-tutor` 会执行完整费曼循环。

## 常用请求

```text
使用 $learning-material-to-course 导入 materials/ 下的所有资料并建立概念图。
使用 $learning-tutor 从诊断开始教我“消费者剩余”，完成后运行完整费曼循环。
使用 $learning-momentum 我今天只有 10 分钟，帮我做一次恢复模式。
使用 $learning-review-coach 完成今天到期的复习。
使用 $learning-exam-coach 生成一套 90 分钟模拟卷，考完后再评分。
使用 $learning-mastery 更新仪表盘，并告诉我未来三天最值得做什么。
```

## 更新

```bash
codex plugin marketplace upgrade learning-mastery
codex plugin add learning-mastery-skills@learning-mastery
```

## 卸载

```bash
codex plugin remove learning-mastery-skills@learning-mastery
codex plugin marketplace remove learning-mastery
```

卸载插件不会删除独立学习工作区。需要删除时先备份，再手工移除对应目录。

## 故障排查

- 看不到技能：确认安装命令成功，并新建 Codex 对话。
- 脚本找不到：从插件根目录运行 `node scripts/workspace.mjs --help`。
- 工作区验证失败：先读取错误，不覆盖状态文件；修复来源引用、概念 ID 或题目 provenance。
- 扫描材料读不清：保留原页图片定位，标记 `needs_review`，不要编造缺失文字。
- 远程安装失败：确认仓库为公共仓库，并检查 `--ref main` 和 marketplace 名称 `learning-mastery`。
