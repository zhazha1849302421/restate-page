# ReState 主页 — 上传说明

这个文件夹就是**最终要上线的全部内容**，纯静态、无需构建、无任何外部请求。
字体（Caveat / Patrick Hand / Inter）、图表库（Chart.js）、手绘线库（rough.js）都已经放在 `vendor/` 里，
所以断网、公司内网、国内网络都能完整显示，不依赖 Google Fonts 和 CDN。

想改内容或改样式，看上一层目录 `restate-page/README.md`；改完后重新生成这个文件夹（见本文最后一节）。

---

## 1. 这里有什么

```
.nojekyll          告诉 GitHub Pages「原样提供文件」，不要用 Jekyll 处理（必须保留）
index.html         页面本体，所有文字都在这里
style.css          基础布局
theme-sketch.css   火柴人手绘风：纸张、颜色、字体、黑板标题
intro.css          开场动画样式和时间轴
data.js            所有数字、表格、案例
main.js            图表和交互
sketch.js          手绘边框 + 火柴人 + 鼠标火柴人
intro.js           开场动画
assets/            图片（论文插图、案例图、机器人图标）
vendor/            第三方库和字体 + 各自的许可证
```

总大小约 4.9 MB，其中图片约 4.3 MB。

---

## 2. 评审期间：匿名上线（anonymous.4open.science）

论文在双盲评审中，**不要用 `你的用户名.github.io`**，网址会暴露身份。

1. 在 GitHub 新建一个仓库，可以设为私有，名字随意（例如 `restate-page`）。
2. 打开仓库页面，点 **Add file → Upload files**，把**本文件夹里的所有内容**拖进去。
   - 要拖的是**文件夹里面的东西**，不是文件夹本身：上传后 `index.html` 必须在仓库最外层。
   - `.nojekyll` 以点开头，Windows 资源管理器默认可能不显示。如果拖不进去，在仓库里点 **Add file → Create new file**，文件名填 `.nojekyll`，内容留空，保存即可。
3. 打开 https://anonymous.4open.science ，用 GitHub 账号登录，选中这个仓库。
4. 勾选 **Page** 选项，在屏蔽关键词里填上姓名、学校、导师名、邮箱等需要隐藏的词。
5. 得到两个地址：主页用 `https://anonymous.4open.science/w/<id>/`，代码仓库用 `/r/<id>`。
   把主页地址写进论文或 supplementary。

## 3. 评审结束后：GitHub Pages（免费，和 OpenGame 一样）

1. 用同一个仓库，或在实名账号下新建一个（例如 `restate`），把本文件夹内容上传上去。
2. 进 **Settings → Pages**：
   - Source 选 **Deploy from a branch**
   - Branch 选 `main`，目录选 **`/ (root)`**，点 Save
3. 等 1–2 分钟，访问 `https://你的用户名.github.io/仓库名/`。
4. 以后要改页面，在网页上重新上传覆盖对应文件，几分钟后自动更新。

本页面所有链接都是相对路径，所以放在 `/仓库名/` 这种子路径下也能正常工作，不需要像 OpenGame 那样配 `basePath` 或 GitHub Actions。

## 4. 想用自己的域名（可选）

- 买一个域名，在 **Settings → Pages → Custom domain** 里填进去，再按提示在域名服务商那边加 DNS 记录。
- 或者改用 **Cloudflare Pages**：注册后选 "Direct Upload"，把本文件夹拖上去即可，同样免费，国内访问通常比 `github.io` 稳一些。

---

## 5. 上线前的检查清单

- [ ] **换掉两个占位链接**：在 `index.html` 里搜 `data-todo`，把 Paper 和 Code 的 `href="#"` 改成真实地址。不改的话，点击只会弹出 "Link will be available soon"。
- [ ] **正式公开时删掉 noindex**：`index.html` 第 9 行附近的 `<meta name="robots" content="noindex, nofollow" />`。留着搜索引擎和 Google Scholar 都搜不到这个页面；评审期间应当保留。
- [ ] **确认 BibTeX**：`index.html` 搜 `bib-code`，论文接收后补上作者和正式出处。
- [ ] **图片文件名大小写**：GitHub 的服务器区分大小写，Windows 不区分。替换图片时文件名必须和代码里完全一致（`fig1.jpg` 不能写成 `Fig1.JPG`）。
- [ ] **不要上传**上一层目录里的 `restate-page/`（开发版）、`restate-page_bak_*`（备份）和预览截图。

---

## 6. 改完内容后怎么重新生成这个文件夹

在 `restate-page/` 里改完并自测通过后，把下面这些文件复制过来覆盖即可：

- 8 个根文件：`index.html`、`style.css`、`theme-sketch.css`、`intro.css`、`data.js`、`main.js`、`sketch.js`、`intro.js`
- 改动过的 `assets/` 图片
- `vendor/`（只有换字体或升级库时才需要）

`.nojekyll` 保持不动。本文件夹**不包含** `README.md`（开发文档）、`logo.png`（切图用的原图）和 `mascot_*.png`（旧版机器人插图，当前页面没有用到），不需要上传它们。
