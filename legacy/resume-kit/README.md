# 📄 简历工作台（校招版）— Resume Kit

面向**应届毕业生春招/秋招**的简历制作工具，两种形态，同一套代码：

1. **独立网页应用** —— 双击即可用，不依赖任何服务
2. **DSH Desktop 客户端插件** —— 下次启动桌面应用后，侧边栏底部出现「简历工作台」按钮，点击打开全屏工作台

---

## 一、快速开始

### 形态 1：独立网页应用（现在就能用）

| 文件 | 说明 |
| --- | --- |
| `dist/resume-workbench.html` | **单文件版**：双击用浏览器打开即可，也可发给别人直接用（由 `node scripts/build.js` 生成） |
| `app/index.html` | 源码版（文件夹模式），同样可直接双击打开 |

> 数据自动保存在浏览器本地（localStorage），关闭页面不丢失。

### 形态 2：DSH 客户端插件

本目录 `dsh-plugin/` 是 DSH 客户端插件包（`dsh.client` 声明，platform: web）。安装到 DSH 的 web profile 后，侧边栏底部出现「📄 简历工作台」按钮，点击打开全屏工作台。

安装步骤（在目标机器的 DSH profile 目录执行，`<profile>` 为你的 profile 路径，如 `~/.dsh/profiles/web`）：

1. 将插件包链接进 profile 的 node_modules：`mklink /J <profile>\node_modules\dsh-resume-kit <本目录>\dsh-plugin`（或 `pnpm add` 该目录）
2. 在 `<profile>\cordis.patch.yml` 中加入启用条目：
   ```yaml
   - insert:
       - id: resume-kit
         name: dsh-resume-kit
   ```
3. 重启 DSH（或依赖 HMR 热加载）后生效：

- 侧边栏底部（设置按钮旁边）会出现「📄 简历工作台」按钮
- 点击后打开全屏工作台，包含独立版的所有功能
- 插件内的数据与独立版各自独立保存（浏览器 origin 相同则共享）

---

## 二、功能总览

| 模块 | 功能 |
| --- | --- |
| ✏️ **简历编辑** | 基本信息、求职意向、教育背景、实习经历、项目经历、校园经历、荣誉奖项、技能、自我评价、其他；左侧表单 + 右侧实时 A4 预览 |
| 🗂 **板块管理** | 每个大板块可**隐藏/显示**（如不需要求职意向可直接隐藏，数据不丢）、**调整顺序**（↑↓）；切换岗位模板不会覆盖你的自定义，可一键恢复模板默认顺序与显示 |
| 👁 **简历预览** | 6 类**岗位模板**（技术/产品/运营/市场/设计/职能）× 4 种风格（简约蓝/商务灰/清新绿/现代紫）；**打印/导出 PDF**（A4 精确排版） |
| 🩺 **简历体检** | 本地规则引擎打分（0-100）：硬伤检查、量化与结果、表达与结构（动词开头/STAR/空话）、岗位关键词匹配（系统初筛模拟）、完整度；逐条给出修改建议，可一键复制报告；**已隐藏的板块不参与检查** |
| 🎯 **求职台** | 校招时间线（提前批→正式批→补录→春招）、投递记录表（7 种状态 + CSV 导出）、准备清单（进度统计） |
| ✨ **AI 优化** | 可选接入 DeepSeek API：整体优化建议 / 按岗位定向改写 / 单条经历润色（可直接替换原文）。Key 仅存本机，直连官方 API；只发送可见板块的数据 |
| 💾 **备份导出** | 单文件 HTML 备份（含数据）、纯 JSON（可导入迁移）、Markdown 简历、投递记录 CSV |

### 岗位模板差异（以体检关键词为例）

| 模板 | 板块侧重 | 关键词示例 |
| --- | --- | --- |
| 技术开发 | 项目经历 > 实习 > 教育 | Java/Python/Spring/MySQL/Redis/算法/高并发… |
| 产品经理 | 实习 > 项目 > 校园 | PRD/原型/用户调研/A-B测试/数据分析/增长… |
| 运营 | 实习 > 校园 > 项目 | 拉新/留存/转化率/社群/公众号/活动策划… |
| 市场/销售 | 实习 > 校园 > 商赛 | 签约/销售额/客户/BD/路演/投放/ROI… |
| 设计 | 项目（作品集）> 实习 | Figma/UI/UX/设计规范/作品集… |
| 职能类 | 实习 > 校园 | 招聘/培训/考勤/薪酬/凭证/Excel… |

---

## 三、AI 优化配置（可选）

1. 打开应用 → 「✨ AI 优化」页
2. 填入 [DeepSeek 开放平台](https://platform.deepseek.com/) 的 API Key（`sk-` 开头），选择模型
3. 点击「保存」——Key 只存在本机浏览器 localStorage，请求直连 `api.deepseek.com`

三个任务：
- **整体优化建议**：结合目标岗位给出 5-8 条可执行修改意见
- **按岗位定向改写**：按当前模板的关键词重写实习/项目描述（保留事实、不编造）
- **润色选中经历**：对单条经历做 STAR + 量化润色，可一键替换原文

> 不用 AI 也完全不影响其他功能；体检与模板均为本地规则，完全离线。

---

## 四、开发与构建

```
resume-kit/
├── app/                    # 应用源码（原生 JS，无构建依赖）
│   ├── index.html          # 页面骨架
│   ├── style.css           # UI + 4 套简历主题 + 打印样式
│   └── js/
│       ├── templates.js    # 岗位模板 / 动词库 / 时间线 / 清单
│       ├── engine.js       # 体检规则引擎（纯函数）
│       ├── export.js       # 导出（Markdown/JSON/单文件备份）
│       ├── ai.js           # DeepSeek API 调用
│       ├── app.js          # 主逻辑
│       └── builtin-single-file.js  # 由 build.js 生成
├── dsh-plugin/             # DSH 插件包（dist/ 由 build.js 生成）
│   ├── package.json        # dsh.client 声明 + exports["./client"]
│   └── dist/client.js      # 插件 bundle（内嵌单文件应用，iframe srcDoc 渲染）
├── scripts/
│   ├── build.js            # 构建：单文件 HTML + 插件 bundle
│   ├── test-engine.js      # 引擎单测
│   └── smoke/              # jsdom DOM 冒烟测试
└── dist/resume-workbench.html     # 单文件成品
```

```bash
node scripts/build.js        # 构建（重新生成单文件 + 插件 bundle）
node scripts/test-engine.js  # 规则引擎测试
node scripts/smoke/smoke-dom.mjs  # DOM 冒烟测试
```

### 插件工作原理（给想改插件的人）

- 插件是一个 npm 包，`package.json` 声明 `dsh.client`（platform: web）+ `exports["./client"]`
- 宿主启动时扫描已启用条目 → 把 bundle 哈希写入 `window.__DSH_BOOT__` → 通过 `/plugins/<id>/client.js` 提供
- bundle 格式：`window.__ModuleLoader__.load({ id, factory })`，factory 用同步 `require` 引用 `react` / `react/jsx-runtime`
- 注册入口：`ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({...}, 组件))`（侧边栏底部按钮）与 `ctx.slots.inject("shell.overlay", ...)`（全屏浮层）
- 浮层内用 `<iframe srcDoc>` 渲染内嵌的单文件应用，与宿主完全隔离，自带完整功能

### 安装 / 卸载 / 更新插件

```bash
# 方式一：官方 CLI（需 pnpm）——在 profile 目录执行：
#   dsh plugin --profile <name> add <本插件目录>，例如：
node "<dsh安装目录>/node_modules/@deepseek-ai/dsh/lib/bin.js" plugin --profile web add "<本插件绝对路径>/dsh-plugin"

# 方式二：手动链接（无需 pnpm）——把 dsh-plugin 链接到 profile 的 node_modules：
#   mklink /J <profile>/node_modules/dsh-resume-kit <本插件绝对路径>/dsh-plugin

# 启用：在 profile 的 cordis.patch.yml 中加入：
#   - insert:
#       - id: resume-kit
#         name: dsh-resume-kit
# 删除该条目即停用

# 更新插件代码：重新运行 node scripts/build.js 即可（已加载实例会 HMR 热更新）
```

---

## 五、常见问题

**Q：修改插件代码后需要重启吗？**
已加载的插件 bundle 修改后通过 HMR 自动热更新（无需重启）；首次安装/启用在下次启动应用时生效。

**Q：插件会拖慢应用启动吗？**
不会。bundle 按需加载，node 半部是空实现。

**Q：数据存在哪？会丢吗？**
存在浏览器 localStorage（`resumeKit:state:v1`）。建议定期用「备份下载」导出单文件 HTML 备份（含数据）。

**Q：打印时怎样去掉页眉页脚？**
浏览器打印对话框里取消勾选「页眉和页脚」（Chrome/Edge 在"更多设置"中）。

**Q：AI 优化失败？**
检查 Key 是否正确、账户是否有余额；DeepSeek API 需要能访问 `api.deepseek.com`。
