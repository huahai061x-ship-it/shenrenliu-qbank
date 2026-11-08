# BUG 反馈中心

## 用户流程与布局

沿用蓝白、圆角和轻阴影。手机使用全屏弹窗、单列输入及至少44像素按钮；电脑与平板使用720像素居中弹窗。反馈不跳出当前答题页，不暂停考试计时，也不显示尚未提交的答案。

入口：主页“所有训练模式”的 BUG 反馈卡片（替换原待复核清单，可设为快捷入口）；顶部邮箱账号里的“BUG 反馈与记录”；题目上的“反馈本题问题”。个人待复核笔记仍可从反馈中心进入，原记录不变。

问题类型涵盖题目/答案、功能故障、界面、登录/同步、建议。问题描述必填，复现步骤、预期结果选填。最多3张截图，上传前可预览/移除，图片在本机缩放、压缩并去除原文件元信息。页面、题库、原题号、版本、窗口大小、浏览器可在提交前展开核对，不收集凭证或整套学习记录。

未提交草稿和截图按账号放在本机 IndexedDB。提交失败仍可重试；同一编号的重试不重复建单。“我的反馈”分页查看文字、截图、提交时间、状态及维护者处理说明；可新建关联原编号的补充反馈。刷新状态是用户主动操作，不声称实时推送。

## 后台存储与维护

继续使用现有经过身份校验的 Event Function，不开放公共HTTP入口。正式环境为 `shenrenliu-test-d3ftjonp001006b5`，函数 `shenrenliu-sync-prod`。`qbank_prod_v1` 中 `record.kind=feedback` 是反馈，owner=`feedback/<运行时UID>`；quota为独立owner。图片使用现有私有 `qbank_prod_payload_v2` 内容分块。普通学习同步仍只读本人原owner，无法混入反馈。

用户不能指定所有者、处理状态或回复；只能读自己的反馈。直接客户端数据库权限保持 ADMINONLY。后台校验图片类型/签名与总大小、文字长度、请求字段，每账号每天最多20条，使用事务进行去重与配额计数。

本地运维工具使用已经登录的CloudBase CLI身份，绝不打包给网站：

```
node scripts/feedback-admin.cjs list
node scripts/feedback-admin.cjs list new
node scripts/feedback-admin.cjs export <编号> <私有输出目录>
node scripts/feedback-admin.cjs reply <编号> reviewing <处理说明文本文件>
```

状态为 new 已收到、reviewing 排查中、needs_info 待补充、resolved 已处理。维护者通过工具或 CloudBase 控制台统一查看并处理，用户在同一反馈详情中能看到更新。不要把反馈及截图提交到代码仓库或发布目录，也不要在缺少依据时标记已解决。没有后台自动诊断或自动修复承诺。
