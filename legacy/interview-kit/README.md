# 🧠 AI 岗刷题（笔试 · 面试）— Interview Kit

面向 **AI 开发 / 大模型算法工程师** 校招与实习的刷题工具，两种形态，同一套代码：

1. **独立网页应用** —— 双击即用，无需任何服务
2. **DSH Desktop 客户端插件** —— 下次启动桌面应用后，侧边栏底部出现「⚡ AI 刷题」按钮

题库共 **152 题**，覆盖 9 大方向：机器学习基础（27）、深度学习（19）、Transformer 与大模型（28）、训练与微调（19）、推理与部署（13）、数学与统计（10）、算法与手撕代码（17）、场景与系统设计（10）、项目与行为面试（9）。其中 40 题（选择 31 + 判断 9）带标准答案，支持**笔试自动判分**。

---

## 一、快速开始

### 形态 1：独立网页应用（现在就能用）

```
interview-kit/dist/interview-kit.html
```

双击用浏览器打开即可。学习进度自动保存在浏览器本地（localStorage），可导出/导入 JSON 备份。

### 形态 2：DSH 客户端插件

`dsh-plugin/` 为 DSH 客户端插件包。安装到 DSH 的 web profile 后（步骤与 resume-kit 插件一致：链接 `dsh-interview-kit` 到 profile 的 node_modules，并在 `cordis.patch.yml` 中加入 `id: interview-kit` 条目），侧边栏底部出现「⚡ AI 刷题」按钮（与「📄 简历工作台」并列），点击打开全屏刷题台。

---

## 二、功能

| 模块 | 功能 |
| --- | --- |
| 📚 **题库** | 按方向/题型/难度筛选、关键词搜索（可搜 LoRA / KV Cache / 过拟合…）、每题带难度星级与标签、一键展开答案解析（代码块高亮展示）、自评（😊会了 / 🤔模糊 / 😵不会）、⭐ 收藏、只看错题/只看收藏 |
| ✍️ **笔试模拟** | 选择 + 判断随机组卷（10-30 题、可选限时 5-20 分钟、可选方向范围），逐题作答 + 题号导航 + 计时器，交卷**自动判分**（分数 + 评级 + 逐题解析），错题自动进错题本 |
| 🎤 **面试模拟** | 简答/手撕/场景/行为题逐题展示，先思考再查看参考答案，自评后自动进入下一题，结束生成总结（答出/部分/没答出统计 + 题目回顾） |
| 📈 **学习统计** | 已练题数、掌握/模糊/待复习数、笔试正确率、9 方向进度条、**错题本**（一键跳转复习）、⭐ 收藏列表、学习历史、清空进度 |
| 💾 **进度备份** | JSON 导出/导入（合并覆盖），换设备不丢进度 |

### 题库内容示例（方向 → 代表题）

- **大模型**：Transformer 结构、Attention 为何除以 √dₖ、多头注意力、RoPE、KV Cache、MQA/GQA、长度外推、MoE、CoT、RAG、Agent/ReAct、Mamba、多模态/CLIP…
- **训练与微调**：SFT、LoRA/QLoRA 原理、RLHF/PPO、DPO、GRPO（DeepSeek-R1）、分布式（DDP/ZeRO/TP/PP）、BF16/FP16、梯度裁剪、数据配比…
- **推理与部署**：量化（GPTQ/AWQ/PTQ/QAT）、vLLM/PagedAttention、FlashAttention、投机采样、continuous batching、TTFT/吞吐、显存估算…
- **手撕代码**：两数之和、反转链表、TopK、LRU、层序遍历、LCS/LIS、二分、**数值稳定 Softmax、交叉熵、K-Means、线性回归梯度下降、Scaled Dot-Product Attention**（numpy 实现，AI 岗面试高频）
- **机器学习/深度学习**：偏差方差、正则化、SVM 核、GBDT/XGBoost、ROC/AUC、BN/LN、Dropout、LSTM、梯度消失…
- **场景/行为**：RAG 系统设计、推荐系统三段式、内容审核、多轮对话上下文管理、推理降本、STAR 式自我介绍…

---

## 三、题目来源与参考

题库由 AI 开发岗高频考点整理而成，编写时参考了以下公开面经/资料（2024-2025 秋招与实习）：

- [Datawhale Hello-Agents：LLM & VLM & Agent 面试问题总结](https://github.com/datawhalechina/hello-agents/blob/main/Extra-Chapter/Extra01-%E9%9D%A2%E8%AF%95%E9%97%AE%E9%A2%98%E6%80%BB%E7%BB%93.md)
- [LLM-Algorithm-Intern-Guide（2026 届大模型算法岗实习面经，含手撕 PPO/RoPE/Transformer 与 RLHF 八股）](https://github.com/Junvate/LLM-Algorithm-Intern-Guide)
- [AgentGuide：公司面试案例与 coding-questions](https://github.com/adongwanai/AgentGuide/blob/main/docs/04-interview/12-company-interview-cases.md)
- [我的秋招经历，大厂 AI 岗位面试真题总结（Datawhale）](https://blog.csdn.net/Datawhale/article/details/156520446)
- [2025 年大模型（LLM）面试通关指南：高频考点全梳理](https://adg.csdn.net/697311e2437a6b40336b80e6.html)
- [2025 大模型面试全攻略：校招/社招高频考点（含 MoE、Agent、多模态）](https://blog.csdn.net/m0_59162559/article/details/151118386)

> 答案与解析由 AI 整理，可能存在不准确之处；建议结合论文原文与技术博客核对（如 Transformer 论文、LoRA/QLoRA、vLLM、DeepSeek-R1 技术报告）。

---

## 四、开发与构建

```
interview-kit/
├── app/
│   ├── index.html
│   ├── style.css
│   └── js/
│       ├── q-core.js      # 题库：机器学习/深度学习/数学/手撕代码（60 题）
│       ├── q-llm.js       # 题库：大模型/训练微调/推理部署/场景/行为（64 题）
│       ├── q-extra.js     # 题库补充（28 题）
│       └── app.js         # 主逻辑
├── dsh-plugin/            # DSH 插件包（dist/ 由 build.js 生成）
├── scripts/
│   ├── build.js           # 单文件 + 插件 bundle
│   ├── test-data.js       # 题库完整性校验（152 题全部字段校验）
│   └── smoke/             # jsdom DOM 冒烟测试
└── dist/interview-kit.html          # 单文件成品
```

```bash
node scripts/build.js           # 构建
node scripts/test-data.js       # 题库校验
node scripts/smoke/smoke-dom.mjs  # DOM 冒烟测试（需 npm install --prefix scripts/smoke jsdom）
```

### 插件安装/更新

```bash
# 安装：与 resume-kit 插件一致（见其 README），链接 dsh-interview-kit 到 profile 的
#       node_modules 并在 cordis.patch.yml 加 id: interview-kit 条目；或用
#       dsh plugin --profile web add <本目录>/dsh-plugin
# 更新题目/代码：重新运行 node scripts/build.js（已加载实例 HMR 热更新，新安装下次启动生效）
```

---

## 五、常见问题

**Q：笔试模拟为什么有时候题目不足？**
某个方向下可自动判分的题（选择+判断）不足时，会按实际可用题数组卷（如 LLM 方向 7 题）。

**Q：数据存在哪？**
浏览器 localStorage（`interviewKit:state:v1`），含自评、错题、收藏、笔试记录与历史。建议定期导出 JSON。

**Q：和「简历工作台」插件冲突吗？**
不冲突。两个插件各自独立，侧边栏底部会并排显示「📄 简历工作台」与「⚡ AI 刷题」两个按钮。
