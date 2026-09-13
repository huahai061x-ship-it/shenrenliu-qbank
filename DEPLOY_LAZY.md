# 最省事的网址部署

1. 在 GitHub 新建一个公开仓库，把本目录全部文件推送到 `main` 分支。
2. 打开仓库 `Settings → Pages`，将 `Build and deployment → Source` 设为 `GitHub Actions`。
3. 打开 `Actions`，等待 `Test and deploy GitHub Pages` 变绿；页面会显示正式网址，通常为 `https://用户名.github.io/仓库名/`。
4. 以后只需修改文件并推送到 `main`，测试通过后同一网址会自动更新；重新打开或正常刷新即可切换新版，离线缓存仍可使用。
5. 可选：在 `Settings → Pages → Custom domain` 绑定自己的域名；不购买域名也不影响使用。

上线后请分别用中国移动、联通、电信网络实测。GitHub Pages 在中国大陆的可访问性无法由代码保证；若个别网络不稳定，再迁移到香港节点。
