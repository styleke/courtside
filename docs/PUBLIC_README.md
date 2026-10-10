# Courtside · 场边

北京时间优先的网球观赛网站：今日比赛、观赛日历、球员与排名、发现、网球知识。

## 状态

本仓库是用于评审和联调的测试工程。已有数据具有各自核验日期，不代表当前实时赛况。发布网站与接通数据采集需分别验收。

- Node.js 22；运行时无第三方依赖。
- `npm test`：业务与回归测试。
- `npm run build`：生成 `dist/site` 静态站。
- `npm run probe:phase1`：有限的一次性来源诊断；不写入网站数据。
- `npm start`：本机开发服务。

## 免费发布

使用公开仓库、GitHub Pages 和标准 GitHub Actions 运行环境。Pages 发布来源选择 GitHub Actions。发布工作流只上传 `dist/site`，没有自定义域名或收费运行器配置。

自动更新默认关闭。只有相应来源取得适用的使用条件并通过云端采集验收后，才设置仓库变量 `COURTSIDE_COLLECTION_ENABLED=true`。这个变量本身不能替代来源许可或数据校验。

所有来源的长期采集条件分别记录在 `config/source-feasibility.json`；`config/sources.json` 保留真正的生产通道许可开关。一次HTTP成功或网页可读不表示已经完成可靠采集。

不包含账号密钥、不提供站内购票、不转载完整赛事视频。
