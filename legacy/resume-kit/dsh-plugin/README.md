# dsh-resume-kit

应届生春招秋招简历工作台 —— DSH Desktop 客户端插件。

- **入口**：侧边栏底部「📄 简历工作台」按钮（`sidebar.footer.action` 插槽）
- **形态**：按钮打开全屏浮层（`shell.overlay` 插槽），内部以 `<iframe srcDoc>` 渲染内嵌的单文件简历应用
- **宿主契约**：`package.json` 声明 `dsh.client`（platform: web），`exports["./client"]` 指向 `dist/client.js`
- **依赖**：react / react/jsx-runtime（模块图静态注册）+ `slots` 服务（由 client-runtime 提供）

## 构建

`dist/client.js` 与 `dist/index.js` 由仓库根目录 `scripts/build.js` 生成（内嵌 `dist/resume-workbench.html` 单文件应用）：

```bash
node scripts/build.js
```

## 启用条目（profile 层）

```yaml
# %APPDATA%\dsh-desktop\harness\profiles\web\cordis.patch.yml
- insert:
    - id: resume-kit
      name: dsh-resume-kit
```

> 注意：配置行的 `inject` 字段是**服务名**（如 `webRuntime`），不是配置项 id；
> 本插件的 node 半部为空实现，不注入任何服务，因此不写 inject。

## 文件

| 文件 | 作用 |
| --- | --- |
| `dist/client.js` | 浏览器侧 bundle（`window.__ModuleLoader__.load`），注册两个插槽入口 |
| `dist/index.js` | 宿主侧 node 半部（no-op，仅为让 loader 激活条目） |
| `package.json` | `dsh.client` 声明 + exports 映射 |
