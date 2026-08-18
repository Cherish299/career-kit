/* q-extra.js — AI 开发岗题库（补充篇）：补足高频考点，使总量 150+ */
(function (global) {
  "use strict";
  var Q = global.INTERVIEW_QUESTIONS = global.INTERVIEW_QUESTIONS || [];

  function add(cat, type, diff, q, solution, extra) {
    var item = Object.assign({ id: "", cat: cat, type: type, diff: diff, q: q, solution: solution, tags: [] }, extra || {});
    item.id = cat + "-" + String(Q.length + 1).padStart(3, "0");
    Q.push(item);
  }

  /* ---- 机器学习补充 ---- */

  add("ml", "short", 2,
    "线性回归与逻辑回归的区别与联系？",
    "联系：都是广义线性模型，训练都用梯度下降/最小二乘。区别：线性回归输出连续值（MSE 损失），用于回归；逻辑回归在线性组合外套 sigmoid 输出 (0,1) 概率（交叉熵损失 + 决策阈值），用于二分类，可扩展到 Softmax 多分类。逻辑回归本质仍是决策边界线性的分类器。",
    { tags: ["线性回归", "逻辑回归"] });

  add("ml", "short", 2,
    "类别不均衡有哪些处理手段？",
    "数据层面：过采样少数类（SMOTE 合成）、欠采样多数类、混合、数据增强；算法层面：类别权重（class weight，等价于调整损失）、Focal Loss、异常检测视角（孤立森林等）；评估层面：用 PR/AUC、F1、混淆矩阵而非 accuracy；阈值层面：对概率调阈值（如 0.3 而非 0.5）。工程上先看业务目标（漏判与误判的代价），再选策略组合。",
    { tags: ["不均衡", "采样"] });

  add("ml", "short", 2,
    "特征选择有哪些方法？",
    "① 过滤式（Filter）：与目标的相关性（卡方、互信息、方差阈值、相关系数），独立于模型、快；② 包裹式（Wrapper）：用模型性能评估特征子集（前向/后向搜索、递归特征消除 RFE），准但贵；③ 嵌入式（Embedded）：训练中自带选择（L1 正则的稀疏解、树模型特征重要性、线性模型系数）。实践中：先过滤粗筛 → 树模型重要性 → 业务先验兜底。",
    { tags: ["特征选择"] });

  add("ml", "choice", 1,
    "朴素贝叶斯的「朴素」是指：",
    "假设特征在给定类别下**相互独立**（条件独立），从而 P(x₁,x₂|y)=P(x₁|y)P(x₂|y)，计算量大减。现实中特征常相关，但朴素贝叶斯在文本分类等场景仍表现良好。",
    { options: ["A. 假设特征相互独立", "B. 假设样本独立同分布", "C. 假设先验均匀", "D. 假设模型是线性的"], answer: "A", tags: ["朴素贝叶斯"] });

  add("ml", "short", 2,
    "聚类效果如何评估？",
    "有标签：外部指标——纯度（Purity）、NMI（归一化互信息）、ARI（调整兰德指数）；无标签：内部指标——轮廓系数（Silhouette，同簇紧、异簇离）、Calinski-Harabasz、Davies-Bouldin；实践上结合可视化（t-SNE/UMAP）与业务解释性判断簇质量；K 的选择用肘部法则（SSE 曲线拐点）或 Gap Statistic。",
    { tags: ["聚类", "评估"] });

  /* ---- 深度学习补充 ---- */

  add("dl", "short", 2,
    "CNN 的权值共享与局部连接带来了什么？",
    "局部连接：每个神经元只连接局部感受野，参数量远小于全连接；权值共享：同一卷积核滑遍全图，同一特征检测器复用。二者大幅减少参数量、降低过拟合，并带来**平移等变性**（目标平移后特征响应同步平移），配合池化获得平移不变性与更大感受野，使 CNN 适合图像等网格结构数据。",
    { tags: ["CNN"] });

  add("dl", "short", 2,
    "GAN 与自编码器（AE/VAE）的区别？",
    "AE：编码器压缩到隐空间、解码器重建，训练目标是重建误差，学到的是稠密低维表示（无监督降维/特征）；VAE 在隐空间加高斯先验约束，可采样生成新样本。GAN：生成器 G 与判别器 D 对抗训练——G 骗过 D，D 区分真假，最终 G 学到的分布逼近真实分布，生成质量高但训练不稳（模式坍缩）。AE/VAE 更稳但生成模糊。扩散模型是当前图像生成主流。",
    { tags: ["GAN", "VAE"] });

  add("dl", "judge", 1,
    "RNN 处理长序列时容易出现梯度消失，LSTM 通过门控与细胞状态缓解了这一问题。",
    "对。LSTM 的细胞状态 C 提供了一条「直通」路径（遗忘门控制保留比例），梯度可跨长距离传播而不反复经过 tanh/sigmoid 饱和区，显著缓解梯度消失；但 LSTM 仍串行、难以并行与捕获极长依赖，故被 Transformer 取代。",
    { answer: "对", tags: ["RNN", "LSTM"] });

  add("dl", "short", 1,
    "常见的数据增强手段有哪些？",
    "图像：翻转/旋转/裁剪/缩放/颜色抖动/噪声/混合（Mixup、CutMix）；文本：同义词替换、回译、随机插入删除（EDA）；表格：SMOTE 合成、噪声扰动；音频：变速/加噪。作用：扩充数据多样性、提升泛化、缓解过拟合；注意增强要与任务语义一致（如 OCR 不能翻转文字）。",
    { tags: ["数据增强"] });

  /* ---- 数学补充 ---- */

  add("math", "short", 2,
    "如何判断一个函数是凸函数？为什么凸性对优化重要？",
    "定义：f(λx+(1−λ)y) ≤ λf(x)+(1−λ)f(y)（一阶条件：f(y) ≥ f(x)+∇f(x)ᵀ(y−x)；二阶：Hessian 半正定）。凸性重要：凸问题的**局部最优 = 全局最优**，梯度下降可保证收敛；非凸问题（神经网络）只能找到好的局部最优/鞍点，需要更好的初始化与调度。MSE 对参数是凸的，交叉熵+线性模型也是凸的。",
    { tags: ["凸优化"] });

  add("math", "short", 2,
    "互信息（Mutual Information）是什么？和相关系数的区别？",
    "MI(X;Y) = KL(P(X,Y)‖P(X)P(Y))，衡量两个变量共享的信息量（非线性），值为 0 当且仅当独立。相关系数只刻画**线性**关系（Pearson），非线性关系可能为 0 但 MI 很大。MI 在特征选择、决策树分裂（信息增益）、表征学习中常用；连续变量需估计（分箱/核密度）。",
    { tags: ["信息论", "互信息"] });

  /* ---- LLM 补充 ---- */

  add("llm", "short", 1,
    "词向量（Word2Vec）与 LLM 的 Token Embedding 有什么区别？",
    "Word2Vec：静态词向量——每个词一个固定向量，无法处理一词多义；上下文无关。LLM 的 embedding 是**上下文相关的**：输入 embedding（可学习的 token 向量表）+ 多层 Transformer 变换后，每个 token 的表示包含上下文信息（动态表示），且与注意力/位置编码协同。也可以说 LLM 底层仍是查表 + 上下文建模的组合。",
    { tags: ["Embedding", "词向量"] });

  add("llm", "short", 2,
    "大模型幻觉（Hallucination）的原因与缓解手段？",
    "原因：① 预训练目标是「下一个词」而非事实性，模型学习的是统计关联；② 训练数据本身有错误/过时/矛盾信息；③ 解码时模型倾向流畅生成而非检索事实；④ 微调数据中的错误回答被强化。缓解：RAG（外部知识约束）、提示词约束（不知道就说不知道/引用来源）、解码层面（降低温度、事实性采样）、模型层面（RLHF 对齐事实性、针对性微调）、后验证（交叉验证模型间一致性、工具查证）、评估监控（事实性指标）。",
    { tags: ["幻觉"] });

  add("llm", "choice", 2,
    "temperature 越低，生成结果：",
    "temperature 对 logits 除以 T 后再 softmax：T→0 趋近 greedy（概率集中到最高项），T 越大分布越均匀、越多样随机。T 低 → 更确定、更保守、重复风险高；T 高 → 更发散、可能跑题。",
    { options: ["A. 越多样随机", "B. 越确定、接近贪心", "C. 与 T 无关", "D. 一定更正确"], answer: "B", tags: ["采样", "Temperature"] });

  add("llm", "short", 2,
    "InstructGPT / ChatGPT 的「对齐」三步法是什么？",
    "① SFT：人工标注指令-回答对，微调基座模型；② 奖励模型：对同一 prompt 的多条回答排序（人工偏好），训练 RM；③ RLHF（PPO）：以 RM 为奖励优化策略，同时用 KL 约束防止偏离 SFT 模型。ChatGPT 即此路线的产物；后续 DPO/GRPO 等简化或改进了第 ③ 步。对齐目标：有用（helpful）、诚实（honest）、无害（harmless）。",
    { tags: ["对齐", "InstructGPT"] });

  add("llm", "short", 3,
    "如何评测长上下文能力？",
    "任务型基准：LongBench/LongBench-Chat（多文档问答、代码仓库级理解、长对话）、Needle-in-a-Haystack（大海捞针：把关键句埋在长文本中测试检索）；指标：长文本上的准确率、与短文本性能的衰减曲线（lost in the middle 现象：模型对中间位置信息遗忘）、位置敏感性分析。注意区分「能处理」（不崩）与「能利用」（真正用上远处信息）；训练时插值/外推的方法要在长测试集验证。",
    { tags: ["长上下文", "评测"] });

  /* ---- 训练补充 ---- */

  add("train", "short", 3,
    "什么时候用 SFT，什么时候用 RLHF/DPO？",
    "SFT：快速获得指令跟随能力、成本低、数据易得（指令-回答对），适合大多数垂直场景（领域问答、风格迁移）；缺点是目标函数是「模仿」而非「优化偏好」，可能学到数据中的不良模式。RLHF/DPO：有明确偏好信号（排序数据/可验证奖励）时进一步对齐——安全无害、事实性、推理能力（数学/代码用规则奖励），如 DeepSeek-R1 用 GRPO+规则奖励激发推理。工程建议：先 SFT 到一定水准，再按需上偏好优化；数据质量始终是第一位。",
    { tags: ["SFT", "RLHF", "DPO"] });

  add("train", "short", 2,
    "什么是知识蒸馏？大模型蒸馏的应用？",
    "蒸馏：用强教师模型（teacher）的输出分布（软标签/温度软化 logits）或生成数据，训练轻量学生模型（student），让学生的预测分布逼近教师。应用：① 模型压缩——把大模型蒸馏成小模型部署（如 7B→1.5B），降成本；② 数据蒸馏——用强模型生成高质量指令数据（self-instruct、教师合成+人工校验）训练学生；③ 多教师集成蒸馏。注意：学生上限受教师与数据质量限制，需防教师错误传播。",
    { tags: ["蒸馏"] });

  add("train", "judge", 2,
    "断点续训时，需要保存模型权重、优化器状态、学习率调度器状态与随机数种子（如需要严格复现）。",
    "对。只存权重会导致续训时优化器动量/二阶矩丢失、学习率重置，训练出现震荡或效果下降；完整 checkpoint（权重+优化器+调度器+epoch/step+RNG 状态）才能无缝续训与复现。大模型训练还常用异步 checkpoint 与临时快照防故障。",
    { answer: "对", tags: ["Checkpoint"] });

  add("train", "short", 2,
    "测试集污染（评估集混入训练数据）有什么危害？怎么防？",
    "危害：模型在公开 benchmark 上虚高（数据被反复刷、直接出现在预训练语料里），实际能力被高估，上线效果差。防治：① 预训练数据做 n-gram/embedding 去重剔除 benchmark 内容；② 用新构造/私有评测集交叉验证；③ 监控 benchmark 分数的异常跃升；④ 报告时说明评测集版本与去重方法。业界教训：不少公开模型在 GSM8K/HumanEval 上的分数存在污染争议。",
    { tags: ["数据污染", "评测"] });

  /* ---- 推理补充 ---- */

  add("infer", "short", 2,
    "量化后模型精度为什么会下降？哪些层最敏感？",
    "原因：权重量化引入离散误差，激活分布（尤其 outliers，如注意力 logits 中的大值）被截断；误差逐层累积。最敏感：注意力层（Q/K/V 投影与输出投影）、LayerNorm 后的激活（小数值相对误差大）、首尾层；FFN 相对鲁棒。缓解：逐层/逐列校准、混合精度（敏感层保留 FP16）、AWQ 按激活幅度保护、GPTQ 二阶误差补偿。经验法则：7B 级模型 INT4 通常损失 1-3% 任务指标。",
    { tags: ["量化", "精度"] });

  add("infer", "short", 2,
    "推理时 GPU 利用率低，可能的原因与对策？",
    "原因：① 单请求串行（batch=1 且无并发）→ 用 continuous batching/提高并发；② decode 阶段带宽受限（内存墙），计算单元空转 → 量化/投机采样/更小模型；③ 数据加载/预处理/后处理阻塞（CPU 瓶颈）→ 异步流水线；④ 多卡通信开销大 → 检查 TP 通信与拓扑；⑤ 框架开销（Python/调度）→ CUDA Graph、SGLang 等；⑥ 长 prompt prefill 与短请求混排不均衡 → 分离部署。对策第一步：用 nvidia-smi/nsight 确认瓶颈是 compute 还是 memory 还是 idle。",
    { tags: ["GPU", "性能"] });

  add("infer", "choice", 2,
    "推理服务中，把多个短请求拼成一个 batch 的收益主要是：",
    "矩阵乘按 batch 维度并行，GPU 计算单元利用率提升（单请求 decode 时矩阵过小、带宽受限），吞吐显著上升；代价是首 token 延迟略增与显存（KV Cache）随 batch 增长，需在延迟与吞吐间权衡。",
    { options: ["A. 降低单请求延迟", "B. 提升 GPU 利用率与整体吞吐（代价是显存与排队延迟）", "C. 减少显存占用", "D. 提升生成质量"], answer: "B", tags: ["批处理", "吞吐"] });

  /* ---- 手撕补充 ---- */

  add("code", "code", 1,
    "手写单层神经网络的 ReLU 前向（numpy，含批量矩阵乘）。",
    "思路：X@W+b 后过 ReLU；注意初始化（He：std=sqrt(2/fan_in)）与形状。\n```python\nimport numpy as np\n\ndef forward(X, W, b):\n    # X: (batch, in), W: (in, out)\n    z = X @ W + b\n    return np.maximum(0, z)\n```",
    { tags: ["numpy", "前向"] });

  add("code", "code", 2,
    "判断单链表是否有环，并找到环的入口（快慢指针）。",
    "思路：快指针每次 2 步、慢指针 1 步，相遇则有环；相遇后让一个指针回到头，两指针各走 1 步，再相遇处即环入口（数学推导：2(a+b)=a+b+c+b → a=c）。\n```python\ndef detect_cycle(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n        if slow is fast:\n            p, q = head, slow\n            while p is not q:\n                p, q = p.next, q.next\n            return q  # 环入口\n    return None\n```",
    { tags: ["链表", "快慢指针"] });

  add("code", "code", 2,
    "实现 LRU 之外，手写一个简单的 Top-K 高频词统计（海量文本）。",
    "思路：Counter 统计 → 堆取 Top-K；海量数据可先哈希分片到多机再归并。\n```python\nfrom collections import Counter\nimport heapq\n\ndef top_k_words(words, k):\n    cnt = Counter(words)\n    return heapq.nlargest(k, cnt.items(), key=lambda x: x[1])\n```",
    { tags: ["堆", "统计"] });

  /* ---- 场景补充 ---- */

  add("scene", "short", 3,
    "设计多轮对话（Agent）的上下文管理：如何控制 token 成本与记忆？",
    "① 窗口裁剪：只保留最近 N 轮 + 系统提示（最简）；② 摘要记忆：把早期对话滚动摘要成一段存入上下文；③ 向量记忆：长期事实写入向量库，按相关性检索注入；④ 结构化状态：把用户信息/任务状态抽成 JSON 存外部（DB），每轮只注入必要部分；⑤ 工具结果压缩/只留结论；⑥ prefix cache 复用系统提示的 KV，降低重复 prefill 成本。权衡：信息完整性 vs 成本/注意力稀释，用线上指标（任务完成率、用户满意度）验证。",
    { tags: ["多轮对话", "记忆", "成本"] });

  add("scene", "short", 3,
    "大模型推理成本太高，如何系统性降本？",
    "① 模型层：用小模型/蒸馏模型承担简单请求（路由分级）、量化（INT4/FP8）、MoE、投机采样提吞吐；② 缓存层：语义缓存（相同/相似问题直接复用）、prefix caching、结果缓存；③ 推理引擎：continuous batching、FlashAttention、TP/PP 调优、长尾请求降级（低配模型）；④ 请求层：prompt 压缩（检索只取相关片段）、减少 max_tokens 浪费、流式+早停；⑤ 架构层：批处理离线任务、错峰、RAG 减少重复生成。落地：先按「token 单价 × 用量」拆账定位大头，再逐项 A/B 验证质量损失。",
    { tags: ["成本优化", "系统设计"] });

})(typeof window !== "undefined" ? window : globalThis);
