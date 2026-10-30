# 170PUPPET — 极简摄影作品集

纯静态网站（HTML + CSS + 原生 JS），无框架、无构建步骤，可直接部署到 GitHub Pages。
分为两个互不干扰的页面：

| 文件 | 作用 | 谁来打开 |
| --- | --- | --- |
| `index.html` | 访客展示端：只读画廊，读取 `data.json` 渲染 | 所有人（线上） |
| `admin.html` + `admin.js` | 本地管理端：上传、拖拽排序、生成 `data.json` | 只有你自己（本地） |
| `style.css` | 两端共用样式（访客画廊 + 管理界面） | — |
| `script.js` | 访客端逻辑（读取数据 / 瀑布流排版 / 灯箱） | — |
| `data.json` | 图片列表与顺序（唯一的数据来源） | — |
| `images/` | 图片文件 | — |

线上页面里没有任何上传 / 删除 / 拖拽入口；管理功能全部在 `admin.html` 里，而它只在你本地打开，不会被链接到线上页面（虽然文件会一起推上去，但没有入口也无法写入你的磁盘）。

---

## 一、本地使用管理端（上传 + 排序）

1. 双击 `admin.html`，或用一个本地服务打开（推荐，见下文「本地预览」）。
2. 点「点击选择图片」批量选图，或直接把图片拖进虚线框。图片会立即出现在「02 / 排序」区域。
   - 上传只做本地读取和压缩预览，**不会传到任何服务器**。
   - 状态自动存进浏览器 `localStorage`，刷新、关浏览器再打开都还在。
3. 调整顺序：
   - 按住卡片左右拖动即可换位（HTML5 Drag & Drop），松手即保存；
   - 也可以用卡片上的 `↑` `↓` 按钮微调（触屏设备用这个）。
4. 点「生成数据」，下方文本框会出现 `data.json` 内容 →点「下载 data.json」（或「复制 JSON」）。
5. 想重来：点右下「清空本地列表」，只清空浏览器缓存，不动你的原始图片。

> 注意：不同浏览器 / 不同端口下 `localStorage` 是隔离的。用 `http://localhost` 打开和直接双击 `file://` 打开，会看到两套不同的缓存。建议固定用同一种方式打开。

---

## 二、把新数据同步到线上网站

管理端只能帮你生成「顺序 + 文件名」，图片文件本身需要你自己复制。这是浏览器的安全限制（网页无法写你的磁盘）。

一次完整的更新流程：

1. 把这次要用的**原图**复制到项目的 `images/` 文件夹里，**文件名保持不变**（例如 `DSC01234.jpg`）。
2. 用管理端下载的 `data.json` 覆盖项目根目录的旧 `data.json`。
3. 本地刷新 `index.html` 检查顺序是否满意。
4. 推送到 GitHub（见下一节）。

`data.json` 结构如下，也可以手写维护：

```json
{
  "title": "170PUPPET",
  "updated": "2026-10-30",
  "photos": [
    { "src": "images/DSC01234.jpg", "name": "DSC01234.jpg", "w": 1600, "h": 2400 },
    { "src": "images/DSC05678.jpg", "name": "DSC05678.jpg", "w": 2400, "h": 1600 }
  ]
}
```

- `photos` 的数组顺序 = 网站上的展示顺序（左到右、上到下）。
- `w` / `h` 是原图尺寸，只用来提前占位、避免加载时页面跳动；写错不会报错，删掉也能跑。
- 不想用 `data.json` 也行：把 `script.js` 顶部的 `FALLBACK.photos` 改成你的图片路径数组，页面在 `fetch` 失败时就会用它。

**建议的图片规格**：长边 1600–2400px，JPEG 质量 80–85，单张控制在 500KB 以内。原图直出会让首屏变慢。

---

## 三、推到 GitHub 并部署 Pages

在项目文件夹里执行：

```bash
git init
git add .
git commit -m "init: 170PUPPET portfolio"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

然后打开仓库页面：

1. **Settings → Pages**
2. Source 选 `Deploy from a branch`
3. Branch 选 `main`，目录选 `/ (root)`，Save
4. 等 1–2 分钟，访问 `https://<你的用户名>.github.io/<仓库名>/`

补充说明：

- 如果仓库名就叫 `<你的用户名>.github.io`，访问地址是 `https://<你的用户名>.github.io/`。
- 项目里已放 `.nojekyll`，避免 GitHub 的 Jekyll 处理干扰静态文件。
- 之后每次更新：图片丢进 `images/`、替换 `data.json`，然后
  ```bash
  git add .
  git commit -m "update gallery"
  git push
  ```
  刷新线上页面即可（`fetch` 用了 `no-store`，一般是即时生效，被 CDN 缓存的话等一两分钟）。
- 想绑自己的域名：Settings → Pages → Custom domain，然后在 DNS 加一条 CNAME 记录。

---

## 四、本地预览

直接双击 `index.html` 时，浏览器会拦截 `fetch('data.json')`（`file://` 协议限制），页面会退回使用 `script.js` 里的内置数组——也能看，但读不到你新生成的 `data.json`。

想看真实效果，起一个本地服务：

```bash
# 在项目文件夹下，任选一种
python -m http.server 8000
npx serve .
```

然后访问 <http://localhost:8000/index.html>。管理端同理：<http://localhost:8000/admin.html>。

---

## 五、可以自己改的地方

| 想改什么 | 改哪里 |
| --- | --- |
| 网站标题 | `index.html` / `admin.html` 里的 `.site-title`；`admin.js` 里的 `SITE_TITLE` |
| 背景色、文字色 | `style.css` 顶部 `:root` 的 `--bg` / `--ink` |
| 图片间距 | `:root` 的 `--gap`（默认 20px） |
| 列数 | `style.css` 的 `.gallery` 中 `minmax(230px, 1fr)`，数值越大列越少 |
| 页面左右留白 | `:root` 的 `--pad` |
| 管理端缓存上限 | `admin.js` 的 `MAX_SIDE`（默认 1800，调小更省空间） |

当前占位图是 `images/01.svg` ~ `08.svg`，替换成真照片后，记得把 `data.json` 里的路径一起换掉（用管理端生成最省事）。
