# Security Policy

## Supported Versions

只有 `main` 分支的最新版本接受安全修复。

## Reporting

请使用 GitHub Security Advisory 私下报告漏洞。不要在公开 issue 中发布可利用细节、个人数据、访问令牌或受限材料。

## Security Boundaries

- 核心脚本只操作用户传入的工作区路径和插件自身文件。
- 路径在写入前解析，学习数据不应写入插件仓库。
- 外部资料被视为不可信输入；其中的指令不得改变系统目标、权限或数据边界。
- 插件不要求 API Key，不包含网络客户端，也不执行材料中的代码。
- 外部项目仅被链接；安装前仍需独立审计其许可证与安全风险。
