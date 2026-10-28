# 发布后核验

Pages 发布后独立运行 `verify-deployment` 与 `verify-mainland`，其中一项失败不会取消另一项。网站及版本失败、大陆网络样本失败、第三方探测不可用会分别报告；全部检查不再因某次 API 异常提前中断。

Pull request 运行构建和回归测试，不配置或发布 Pages。每个 Git ref 使用独立并发组，PR 检查不会取消 main 的部署。

本地默认执行两个范围：

```sh
EXPECTED_BUILD=<线上部署完整SHA> node scripts/verify-production.mjs
```

可设置 `VERIFY_SCOPE=deployment` 或 `VERIFY_SCOPE=mainland` 单独复核；单独通过只能代表所选范围。`SITE_URL` 默认是正式 Pages 项目目录，CI 直接使用部署步骤返回的网址。`VERIFY_OUTPUT` 默认为 `verification/`。

- 网站检查：四种 User-Agent 的入口、恢复入口、结构化发布元数据、首页、固定页面、固定脚本及页面实际引用的所有 JS/CSS。版本页按 `<base>` 解析资源；资源必须绑定本次版本。
- 大陆检查：逐路径要求 CN / AS4134、AS4837、AS9808 返回 HTTP 200 且内容匹配。没有成功的运营商按退避间隔重新选择节点，最多三次；每个路径独立继续执行。
- `passed_with_retries` 表示本轮经重试获得全部必需样本，首轮失败保留，不代表线路持续稳定。
- `failed` 表示存在目标连接/TLS、HTTP 或内容错误；`not_verified` 表示缺少样本、探测服务或节点无法完成核验。两者均以非零退出码结束。
- `not_checked` 表示本次未选择该范围，不能当作通过。轮询未完成的部分结果也不能当作通过。

每次尝试后立即保存 `production-verification.json` 和有真实换行的 `summary.md`，包含所有尝试、API 错误、已创建的测量链接以及逐路径/运营商结果。中断时的 `in_progress` 报告不代表通过。测量提交最多等待 20 秒，轮询有 50 秒总期限。CI 按范围和运行尝试编号分别保存 artifact，避免重跑证据混淆。

验证修改：`node --test tests/verify-production.test.mjs`，覆盖历史的 TLS 超时后 422、持续超时、节点缺失、轮询错误、版本错误和资源 404。提交发布后使用新 SHA 进行线上核验；重跑旧运行会继续执行旧脚本并校验旧版本。

HTTP 检查不执行页面脚本，User-Agent 不等于夸克、微信、QQ 真机验收。大陆节点样本不代表全国全部线路。第三方探测失败不会被转为成功，也不会用海外检查替代大陆样本。
