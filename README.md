# 神人刘题库训练站 v2.2.8 正式版

网址保持：https://huahai061x-ship-it.github.io/shenrenliu-qbank/

本次更新说明见 [v2.2.8复盘与图标验收报告.md](v2.2.8复盘与图标验收报告.md)。原题507道、原图111张、填空池208道、18题60种轮换挖空及考试比例均保持不变。

复盘优先展示本场错题/未答题，再展示已答对的慢题，不重复列出错题。默认使用本场实际呈现快照，可切换原题作对照；历史、错题本与断点保存挖空位置及答案。旧历史没有快照时回退原题。快照存盘去重，导出备份仍为完整独立数据。

品牌图标统一为繁体“劉”的路径式标志，保留网站名称“神人刘题库训练站”。资源来源及许可见 [licenses/ICON-SOURCE.md](licenses/ICON-SOURCE.md)。已有桌面快捷方式可能需移除后重新添加才能更新操作系统保存的图标，勿清除浏览器学习数据。

## 兼容与发布维护

- `APP_VERSION` 只控制应用显示版本。`STORE_SCHEMA_VERSION=2` 保持既有备份兼容；`SESSION_SCHEMA_VERSION=3`、`BANK_SCHEMA_VERSION=1` 分别控制断点与题库结构兼容。
- 无schema或schema 1/2的旧断点按字段结构迁移，不依赖应用版本字符串枚举；新断点保存独立schema、应用版本及本次作答信心贡献元数据。
- 题库文本只可凭原图证据改动，禁止根据扫描结果自动替换。#12已核对第3页，原图就是“办公会”，正确答案“更衣室”，因此保留原文。
- 原图缓存仅缓存实际看过的图片；在线network-first，失败后回退缓存。旧images-v1迁移到images-v2后删除，保留离线已看图片。
- 版本一致性测试检查核心常量及实际渲染的首页和设置页，不能只检测“文件中出现新版字符串”。
- GitHub Pages构建缓存版本继续使用commit SHA。CI全部通过后才部署。

## GitHub Actions 官方稳定版本复核（2026-09-26）

现有checkout v7、setup-python v7、configure-pages v6、upload-pages-artifact v5已是官方稳定新major，保留；deploy-pages从v4升级到官方稳定v5。checkout、setup-python、configure-pages和deploy-pages使用Node 24；upload-pages-artifact为composite。

官方依据：[checkout](https://github.com/actions/checkout/releases/tag/v7.0.1)、[setup-python](https://github.com/actions/setup-python/releases/tag/v7.0.0)、[configure-pages](https://github.com/actions/configure-pages/releases/tag/v6.0.0)、[upload-pages-artifact](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0)、[deploy-pages](https://github.com/actions/deploy-pages/releases/tag/v5.0.1)。未编造不存在的新major。
