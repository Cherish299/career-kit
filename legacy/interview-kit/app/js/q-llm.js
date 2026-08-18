/* q-llm.js — AI 开发岗题库（大模型篇）：Transformer与LLM / 训练与微调 / 推理与部署 / 场景与系统设计 / 项目与行为面试 */
(function (global) {
  "use strict";
  var Q = global.INTERVIEW_QUESTIONS = global.INTERVIEW_QUESTIONS || [];

  function add(cat, type, diff, q, solution, extra) {
    var item = Object.assign({ id: "", cat: cat, type: type, diff: diff, q: q, solution: solution, tags: [] }, extra || {});
    item.id = cat + "-" + String(Q.length + 1).padStart(3, "0");
    Q.push(item);
  }

  /* ==================== Transformer 与大模型 (llm) ==================== */

  add("llm", "short", 1,
    "简述 Transformer 的整体结构。",
    "Transformer 由 Encoder 与 Decoder 组成，核心模块：① 多头自注意力（Self-Attention）：Q/K/V 线性投影后做缩放点积注意力，多头上并行捕捉不同子空间关系；② 前馈网络 FFN：两层线性 + 激活（LLM 常用 SwiGLU/GeLU）；③ 残差连接 + 层归一化（Pre-LN 结构更常见）；④ 位置编码（绝对 sinusoidal / 相对 RoPE）。Encoder 双向注意力；Decoder 用带掩码的自注意力（防止看到未来）+ 交叉注意力（读 Encoder 输出）。",
    { tags: ["Transformer", "结构"] });

  add("llm", "choice", 2,
    "标准 Self-Attention 的时间复杂度是：",
    "对序列长度 n、维度 d：QKᵀ 为 O(n²d)，softmax 后乘 V 为 O(n²d)，总体 **O(n²·d)**。这是 Transformer 长序列瓶颈（显存与计算随 n 平方增长），催生了 FlashAttention、稀疏注意力、线性注意力（Mamba 等）以及长上下文的 KV Cache 优化。",
    { options: ["A. O(n·d)", "B. O(n²·d)", "C. O(n·d²)", "D. O(n³)"], answer: "B", tags: ["Attention", "复杂度"] });

  add("llm", "short", 2,
    "为什么 Attention 要除以 √d_k（缩放因子）？",
    "Q、K 的每个维度近似独立同分布（均值 0 方差 1）时，点积 Q·K 的方差约为 d_k，d_k 越大点积越大，softmax 输入进入饱和区 → 梯度趋近 0（softmax 的导数在极端概率处很小）。除以 √d_k 使点积方差回到 1，softmax 处于敏感区，梯度更稳定。这也是该结构被称为 Scaled Dot-Product Attention 的原因。",
    { tags: ["Attention", "数值稳定"] });

  add("llm", "short", 2,
    "多头注意力（Multi-Head Attention）的作用？",
    "把 Q/K/V 投影到 h 个低维子空间并行做注意力，再拼接输出：① 每个头关注不同关系模式（语法、指代、局部/远程依赖等）；② 增加模型表达能力的同时控制计算量（总维度不变）；③ 头数 h 与维度 d 的 trade-off：d 固定时 h 越大单头维度越小。MQA/GQA 则是对 KV 的共享/分组优化，降低 KV Cache 显存。",
    { tags: ["Attention", "多头"] });

  add("llm", "short", 3,
    "位置编码：绝对位置编码（sinusoidal）与 RoPE 的原理与优缺点？",
    "sinusoidal：用不同频率的正余弦函数给每个位置生成固定向量，加在输入上；优点无需学习、可外推任意长度；缺点无法显式表达相对位置关系。RoPE（旋转位置编码）：把位置信息编码为 Q/K 向量的**旋转**，使注意力分数只依赖相对位置（内积带相对位置项），天然支持相对位置建模，被 LLaMA/Qwen 等主流模型采用；配合 NTK 缩放等可做长度外推。其他：ALiBi（给注意力分数加线性偏置）、可学习位置编码（如 T5，需固定长度）。",
    { tags: ["位置编码", "RoPE"] });

  add("llm", "choice", 3,
    "MHA / MQA / GQA 的关系是：",
    "MHA 每头独立 Q/K/V 投影；MQA（Multi-Query）所有头共享同一组 K/V，显著减少 KV Cache 与显存，但质量略降；GQA（Grouped-Query）把注意力头分组，组内共享 K/V，是 MHA 与 MQA 的折中，质量损失小、KV Cache 节省明显（LLaMA2-70B、Qwen 等采用）。",
    { options: ["A. MQA 每头独立 K/V，GQA 全共享", "B. GQA 将头分组共享 K/V，介于 MHA 与 MQA 之间", "C. MHA 共享 K/V", "D. 三者完全相同"], answer: "B", tags: ["Attention", "KV Cache"] });

  add("llm", "short", 2,
    "什么是 KV Cache？为什么能加速推理？代价是什么？",
    "自回归解码时，每个 token 的注意力都要用到之前所有 token 的 K/V。KV Cache 把已生成 token 的 K/V 缓存下来，避免每步重复计算，使单步复杂度从 O(n²d) 降为 O(nd)。代价：显存随序列长度线性增长（2·n_layers·n_kv_heads·d_head·seq_len·字节数），长上下文推理显存压力大（GQA、量化、PagedAttention 等都在缓解）。注意：只有自注意力部分缓存 K/V，Q 每步重新计算。",
    { tags: ["KV Cache", "推理"] });

  add("llm", "short", 3,
    "大模型长度外推的手段有哪些？",
    "① **NTK 感知的 RoPE 缩放**：按比例放大 RoPE 频率基（不训练或少量微调即可外推）；② **YaRN**：结合 NTK 与窗口缩放；③ **ALiBi**：注意力分数加与距离成比例的线性偏置，天然外推；④ **位置插值（Position Interpolation）**：把位置索引按比例压缩，需微调；⑤ 相对位置编码（T5 bias）外推性较好；⑥ 训练时用随机长度/长文本数据增强。外推后的效果要用长文档评测集验证（如 LongBench）。",
    { tags: ["位置编码", "外推"] });

  add("llm", "short", 2,
    "Transformer 中的 FFN 结构是什么？为什么参数量占比大？",
    "标准 FFN：FFN(x) = W₂·σ(W₁x + b₁) + b₂，把维度 d 升到 4d 再降回 d。LLM 常用变体：GeLU/SiLU 激活、SwiGLU（门控线性单元，参数量略多但效果好）、MoE（把 FFN 替换为多个专家+路由）。FFN 参数量约占模型总参数的 2/3，因为中间维度是 4d。",
    { tags: ["FFN", "结构"] });

  add("llm", "choice", 2,
    "主流大模型（LLaMA/Qwen）的 FFN 激活函数与归一化通常使用：",
    "LLaMA/Qwen 系列 FFN 用 **SwiGLU（SiLU 门控）**，归一化用 **RMSNorm**（省去均值计算，等价于去掉中心化的 LayerNorm，训练更稳定、开销更小）。早期 GPT 用 GeLU + LayerNorm。",
    { options: ["A. ReLU + BatchNorm", "B. SwiGLU（SiLU）+ RMSNorm", "C. Tanh + GroupNorm", "D. LeakyReLU + InstanceNorm"], answer: "B", tags: ["激活函数", "归一化"] });

  add("llm", "short", 2,
    "为什么大模型普遍用 RMSNorm 而不是 LayerNorm？Pre-LN 与 Post-LN 的区别？",
    "RMSNorm 只做除以 RMS 的缩放（省掉减均值），计算更省、数值更稳，实验证明效果接近甚至更好。Post-LN：子层输出后加残差再归一化，原始 Transformer 结构，深层训练不稳；Pre-LN：先归一化再进子层，残差路径恒等更干净，深层更稳，主流 LLM 采用。",
    { tags: ["归一化", "RMSNorm"] });

  add("llm", "short", 2,
    "什么是 Tokenization？常见的子词算法有哪些？中文有什么注意点？",
    "把文本切成 token 的预处理步骤。常见算法：BPE（字节对编码，按频率合并）、WordPiece（按似然增益合并，BERT）、SentencePiece（把空格也当字符统一处理，Unigram 语言模型式）、字节级 BPE（LLaMA 等，任意 Unicode 可表示）。注意点：中文单字/词边界不清，常用字级或按词切分；token 数与计算/成本直接相关（中文 token 效率低于英文）；特殊 token（BOS/EOS/填充）与保留 token 要一致，词典外字符要有兜底。",
    { tags: ["Tokenization", "BPE"] });

  add("llm", "short", 2,
    "解码策略：greedy / beam search / top-k / top-p / temperature 的区别？",
    "greedy：每步取概率最高 token，快但易重复、局部最优；beam search：每步保留 top-B 条候选路径，适合翻译/摘要等目标明确任务；top-k：从概率最高的 k 个 token 中采样；top-p（nucleus）：从累计概率 ≥ p 的最小集合中采样，动态截断；temperature：对 logits 除以 T 再 softmax，T<1 更集中（更确定），T>1 更均匀（更多样）。生成类任务（对话）常用 top-p + temperature 采样；注意 temperature 与 top-k/p 可叠加。",
    { tags: ["解码", "采样"] });

  add("llm", "judge", 2,
    "Perplexity（困惑度）越低，模型对测试数据的建模越好。",
    "对。PPL = exp(平均负对数似然)，衡量模型对序列的困惑程度，越低说明模型给真实序列的概率越高、拟合越好。注意：PPL 低不代表下游任务表现好（与任务对齐不完全相关），且跨 tokenizer 的 PPL 不可直接比较。",
    { answer: "对", tags: ["评估", "Perplexity"] });

  add("llm", "short", 2,
    "什么是 Scaling Law 与涌现能力？",
    "Scaling Law（Kaplan/Chinchilla 等）：模型性能与参数量、数据量、计算量的幂律关系——增大三者收益递减，最优配比约为「数据 token 数 ≈ 20× 参数量」（Chinchilla）。涌现能力：模型规模超过某阈值后突然出现的、小模型没有的能力（如数学推理、代码生成、指令跟随），现在认为与评测方式有关，部分能力其实是平滑增长的。",
    { tags: ["Scaling Law", "涌现"] });

  add("llm", "short", 3,
    "MoE（Mixture of Experts）的原理与优缺点？",
    "把 FFN 替换为 N 个专家网络 + 一个路由器（router）：每个 token 由路由选出 Top-k 个专家计算（稀疏激活，如 k=2）。优点：总参数量大（容量大）但每 token 计算量小（FLOPs 只与激活的专家数相关），可用较少算力训练/推理更大模型；DeepSeek-V3、Mixtral、Qwen-MoE 等采用。缺点：显存占用仍按全部专家计；路由不均衡（负载均衡损失）；多卡通信（专家可能分布在不同卡上）；训练与推理实现复杂。",
    { tags: ["MoE", "架构"] });

  add("llm", "short", 2,
    "什么是思维链（CoT）？为什么有效？什么是上下文学习（ICL）？",
    "CoT：提示模型逐步推理再给出答案（Let's think step by step），显著提升数学/逻辑任务。有效原因：把隐式推理外显为中间步骤，让模型分解问题、减少一步到位的错误；与训练数据中的推理模式对齐。ICL：不更新参数，仅在 prompt 中给几个输入-输出示例，模型即学会任务——因为预训练中学到了模式匹配能力。进阶：Few-shot CoT、Self-Consistency（多次采样投票）。",
    { tags: ["CoT", "ICL", "Prompt"] });

  add("llm", "short", 2,
    "什么是 RAG？流程与关键组件？和长上下文的关系？",
    "RAG（检索增强生成）：检索外部知识库相关内容，拼进 prompt 让模型生成，缓解幻觉、知识过时与私有知识问题。流程：文档切分 → 嵌入（Embedding）→ 向量库（如 FAISS/Milvus）→ 查询向量化 → 检索 Top-k →（重排）→ 组装 prompt → LLM 生成。关键组件：切分策略（块大小/重叠）、embedding 模型、检索（向量/BM25 混合）、重排、引用溯源。与长上下文：超长上下文可缓解部分 RAG 需求，但成本高、注意力稀释；RAG 仍是知识密集型任务的主流方案，二者常结合。",
    { tags: ["RAG", "检索"] });

  add("llm", "short", 3,
    "什么是 Agent？ReAct 与 Function Calling 是什么？",
    "Agent：让 LLM 自主完成多步任务的系统，核心能力：规划（拆解任务）、工具调用（查询/代码/API）、记忆（上下文/长期存储）、反思（自我纠错）。ReAct：推理（Reasoning）与行动（Acting）交替——模型输出 Thought → Action（调工具）→ Observation → 继续，把思维链与工具执行结合。Function Calling：模型输出结构化 JSON（函数名+参数）而不是自然语言，由外部执行后把结果回填，是工具调用的工程化标准（OpenAI/Tool-Use 模型）。",
    { tags: ["Agent", "ReAct", "Function Calling"] });

  add("llm", "choice", 2,
    "长上下文推理时，最主要的显存瓶颈通常是：",
    "自回归解码时 KV Cache 显存随序列长度线性增长，长上下文下 KV Cache 往往超过权重与激活，成为主要瓶颈（所以有 GQA、KV 量化、PagedAttention、稀疏注意力等优化）。",
    { options: ["A. 模型权重", "B. KV Cache", "C. 优化器状态", "D. 梯度"], answer: "B", tags: ["显存", "长上下文"] });

  add("llm", "short", 3,
    "什么是 Mamba / 状态空间模型（SSM）？与 Transformer 对比？",
    "Mamba 基于状态空间模型：把序列建模为线性时变状态方程 h' = A h + B x，用选择性扫描（selective scan，输入相关地选择 A/B）实现类似注意力的内容感知，复杂度 **O(n)** 线性，且推理时可常数显存（固定状态）。对比：Transformer O(n²) 但并行与表达力强、生态成熟；Mamba 适合超长序列、低显存部署，但在大规模上的综合表现与生态仍逊于 Transformer，也有 Mamba-2 / 混合架构（如 Jamba、部分 Qwen3 混合注意力）的探索。",
    { tags: ["Mamba", "SSM", "架构"] });

  add("llm", "short", 3,
    "多模态大模型的基本结构？CLIP 是什么？",
    "主流多模态结构（如 LLaVA、Qwen-VL、InternVL）：视觉编码器（ViT/CLIP）+ 投影层（MLP/交叉注意力，把视觉特征对齐到文本 embedding 空间）+ LLM 主干，训练分阶段：预训练对齐 → 指令微调（图文指令）。CLIP：用对比学习在 4 亿图文对上训练「图片编码器 + 文本编码器」，拉近匹配图文对、推远不匹配对，得到对齐的图文 embedding，可做 zero-shot 分类、检索，也是多模态模型的视觉编码基础。",
    { tags: ["多模态", "CLIP"] });

  add("llm", "judge", 1,
    "翻译任务中，beam search 通常优于 greedy 解码。",
    "对。beam search 保留多条候选路径，避免 greedy 的局部最优，在翻译/摘要等确定性强任务上通常 BLEU/ROUGE 更高；对话/创作类任务则常用采样（top-p/temperature）保持多样性。",
    { answer: "对", tags: ["解码"] });

  /* ==================== 训练与微调 (train) ==================== */

  add("train", "short", 2,
    "SFT（监督微调）的流程与数据构造要点？",
    "流程：预训练模型 → 用指令-回答对（instruction, input, output）做有监督微调（标准 LM loss 只算回答部分）→ 得到指令跟随模型。数据要点：多样性（任务类型/领域/语言）、质量（人工或强模型筛选，去重、去毒）、难度配比（简单+困难混合）、格式一致（角色标记/模板）、数量：几万到几十万条即可显著提升（质量 > 数量）。",
    { tags: ["SFT", "微调"] });

  add("train", "short", 2,
    "LoRA 的原理？为什么能大幅节省显存？QLoRA 又做了什么？",
    "LoRA（Low-Rank Adaptation）：微调时冻结原权重 W，只训练低秩增量 ΔW = B·A（B∈R^{d×r}, A∈R^{r×k}, r<<d），前向用 W + α/r·BA。原假设：微调只改变权重的一个低秩子空间。节省显存原因：可训练参数量从全量降到 ~0.1%-1%（无需保存全部梯度与优化器状态，且可冻结部分层）。QLoRA：把预训练权重量化到 4-bit（NF4 + 双重量化）再冻结，只对 LoRA 参数做 BF16 训练，单卡消费级 GPU 可微调 7B/13B 级模型。",
    { tags: ["LoRA", "QLoRA", "PEFT"] });

  add("train", "choice", 2,
    "LoRA 中的秩 r 表示：",
    "r 是低秩分解的秩，决定可训练参数量与表达能力：r 越大 ΔW 表达力越强、参数量越大（r=8/16/64 常见）。r 过小欠拟合，过大收益递减。",
    { options: ["A. 学习率", "B. 低秩分解的秩（ΔW=B·A 的中间维度）", "C. 训练的轮数", "D. 模型层数"], answer: "B", tags: ["LoRA"] });

  add("train", "short", 2,
    "全参微调（Full Fine-tuning）与 PEFT（LoRA 等）的对比？",
    "全参微调：更新全部权重，效果上限高、适应彻底，但显存/算力开销大（需保存梯度与优化器状态）、容易遗忘通用能力（灾难性遗忘）、每个任务要存一份完整模型。PEFT：只训练少量参数（LoRA/Adapter/Prefix-Tuning），显存省 60-90%、训练快、多个任务可共用底座（切换低秩矩阵即可）、泛化与抗遗忘更好；缺点是复杂任务上限略低。实践：领域知识注入/风格适配常用 LoRA；重大能力（工具调用、数学推理）可能需要全参或更大 r。",
    { tags: ["微调", "PEFT"] });

  add("train", "short", 3,
    "RLHF 的完整流程？涉及哪几个模型？",
    "流程：① SFT 得到基座指令模型（Actor 初始）；② 收集人类偏好数据（同一 prompt 多个回答排序），训练**奖励模型 RM**（排序损失，常用 Bradley-Terry）；③ 用 PPO 优化 Actor：对每个生成样本计算 RM 打分 + KL 惩罚（约束 Actor 不要偏离 SFT 模型太远，防奖励黑客）+ 可选 token 级损失。涉及模型：Actor（待训练）、Reference（SFT 冻结版，算 KL）、Reward Model（打分）、Critic（PPO 价值网络，估计优势）。推理时只用 Actor。",
    { tags: ["RLHF", "PPO"] });

  add("train", "short", 3,
    "PPO 与 DPO 的区别？DPO 为什么不需要奖励模型？",
    "PPO 是在线强化学习：需要 RM 打分 + Critic 估计优势 + 重要性采样，训练不稳定、资源消耗大。DPO（Direct Preference Optimization）：直接从偏好数据（chosen/rejected 对）推导出隐式奖励的闭式解，把对齐损失写成「增加 chosen 概率、降低 rejected 概率 + 相对参考模型的 KL 约束」，**不需要 RM 与在线采样**，简单稳定、显存低。DPO 假设与 RM 优化等价（Bradley-Terry 下），但偏好分布与在线策略分布可能不一致，数据分布偏移时不如 PPO 灵活。",
    { tags: ["DPO", "RLHF"] });

  add("train", "short", 3,
    "GRPO 是什么？DeepSeek 为什么用它？",
    "GRPO（Group Relative Policy Optimization）：PPO 的简化——对每个 prompt 采样一组回答（如 8/16 条），用组内相对分数计算优势（如规则奖励的组内归一化），**去掉 Critic 价值网络**（PPO 需要），省一半以上显存，训练更稳定。DeepSeek-R1 用 GRPO + 规则奖励（格式正确性、答案可验证）做 RL 训练，让模型在推理时涌现长思维链，成本远低于依赖 RM 的 PPO 方案。",
    { tags: ["GRPO", "RL", "DeepSeek"] });

  add("train", "short", 2,
    "预训练数据为什么要清洗、去重与配比？",
    "清洗：去 HTML/噪声、过滤低质/有毒/隐私内容、语言识别；去重（MinHash 等）：重复数据导致过拟合、浪费算力、损害多样性；配比：混合高质量代码（提升推理/工具能力）、数学（提升推理）、多语言（覆盖面）、按比例上采样高质量来源（如 Chinchilla 配比）。数据质量直接决定模型上限，这也是「数据为中心」的 AI 趋势。",
    { tags: ["数据", "预训练"] });

  add("train", "short", 3,
    "分布式训练：DDP、ZeRO、张量并行、流水线并行的区别？",
    "DDP（数据并行）：每卡一份完整模型，各算各的 batch 梯度，AllReduce 同步——简单但单卡放不下时无效。ZeRO（DeepSpeed）：在数据并行基础上分片**优化器状态（1）/梯度（2）/参数（3）**，显存大幅下降，通信略有增加；ZeRO-Offload 可把状态放到 CPU。张量并行 TP：把单层权重按行/列切到多卡（如 Q/K/V 头切分），需通信矩阵结果，单机 NVLink 友好。流水线并行 PP：按层切分，卡间顺序传递激活（有气泡，可 micro-batch 流水）。序列并行、专家并行（MoE）是变体。大模型训练常组合：3D 并行（DP+TP+PP）+ ZeRO。",
    { tags: ["分布式", "ZeRO", "并行"] });

  add("train", "choice", 3,
    "ZeRO-3 与 ZeRO-1 相比：",
    "ZeRO-1 只分片优化器状态（显存节省 ~4x）；ZeRO-2 分片优化器+梯度；ZeRO-3 进一步分片模型参数（每层参数用时才聚合），显存节省最多、可训练超大模型，但通信开销最高（参数反复 gather）。",
    { options: ["A. 显存节省更多，通信开销也更大", "B. 显存节省更少", "C. 与 ZeRO-1 完全相同", "D. 不需要任何通信"], answer: "A", tags: ["ZeRO", "显存"] });

  add("train", "short", 2,
    "FP16 与 BF16 的区别？为什么训练大模型常用 BF16？",
    "FP16：1 符号 + 5 指数 + 10 尾数，动态范围小，小数值易下溢，需要 loss scaling；BF16：1 符号 + 8 指数 + 7 尾数，与 FP32 相同的动态范围，但精度低。训练大模型选 BF16：梯度/权重幅度跨越范围大，BF16 不会下溢（范围与 FP32 一致），且无需 loss scaling，训练更稳；尾数少的问题由优化器状态用 FP32 主权重（master weight）补偿。现代 GPU（A100/H100）原生加速 BF16。",
    { tags: ["混合精度", "BF16"] });

  add("train", "short", 2,
    "梯度裁剪（gradient clipping）的作用？",
    "把梯度范数限制在阈值内（如 max_norm=1.0）：① 防止梯度爆炸导致训练发散（尤其 RNN、大学习率、大模型初期）；② 让训练更稳定、损失曲线更平滑；③ 与 warmup、权重衰减共同构成大模型训练的稳定性三件套。实现：g = g · min(1, max_norm/‖g‖)。",
    { tags: ["梯度裁剪", "稳定性"] });

  add("train", "short", 2,
    "大模型训练中 warmup + 余弦衰减为什么必要？",
    "见「学习率调度」：大模型初期参数随机、梯度噪声大且 Adam 二阶矩估计不准，直接大学习率会发散/训练不稳定 → warmup 先小步稳定方向；后期余弦衰减平滑收敛到更优区域，避免震荡。实践：warmup 步数占总步数 1%-5%，峰值学习率与 batch 大小按线性缩放规则（如 3e-4 @ 8M tokens）。",
    { tags: ["学习率", "调度"] });

  add("train", "choice", 1,
    "训练中 train loss 持续下降但 val loss 上升，说明：",
    "模型开始过拟合：训练误差降、验证误差升。应对：早停、正则化、Dropout、数据增强、降低模型容量、增加数据。",
    { options: ["A. 欠拟合，应增大模型", "B. 过拟合，应加强正则化或早停", "C. 学习率太低", "D. 正常现象，继续训练即可"], answer: "B", tags: ["过拟合", "训练曲线"] });

  add("train", "short", 3,
    "什么是退火（annealing）阶段？指令微调数据质量与数量的关系？",
    "退火：训练后期把学习率降到极低并混入高质量数据（如代码/书籍/精标数据）的微调阶段，帮助模型收敛到更优极小值、固化关键能力，是不少前沿模型（如 DeepSeek）的标配。指令微调：质量远重要于数量——几万条高质量、多样、格式一致的指令即可显著提升；低质重复数据反而损害能力（对齐税、能力遗忘）。评估时注意用未见过的任务泛化（保留验证集）。",
    { tags: ["退火", "SFT", "数据质量"] });

  /* ==================== 推理与部署 (infer) ==================== */

  add("infer", "short", 3,
    "模型量化的原理？PTQ 与 QAT 的区别？GPTQ / AWQ 的思路？",
    "量化：把权重/激活从 FP16 压缩到 INT8/INT4（或 FP8），用低精度乘加（如 INT4 矩阵乘）加速并省显存。原理：权重分布近似高斯，可用 scale+zero-point 映射，或分组缩放（按 128 列一组）。PTQ：训练后量化，无需重训，用少量校准数据选 scale（GPTQ 按列做二阶误差补偿；AWQ 按激活幅度保护重要通道）；QAT：量化感知训练，把量化误差纳入训练（模拟量化算子），精度更高但成本大。LLM 常用 INT4 分组量化（GPTQ/AWQ），显存减半以上、速度提升，精度损失 1-3%。",
    { tags: ["量化", "GPTQ", "AWQ"] });

  add("infer", "short", 3,
    "vLLM 的 PagedAttention 核心思想？解决了什么问题？",
    "PagedAttention：借鉴操作系统**虚拟内存/分页**思想，把 KV Cache 按固定大小的块（block，如 16 token）管理，逻辑连续但物理上可分散在不连续内存块中。解决：① 传统预分配连续显存导致内部/外部碎片与浪费（KV 只占 20-30%）；② 支持请求间共享 KV（如 prefix 缓存、并行采样），吞吐大幅提升；③ 配合 continuous batching，利用率接近 90%+。这是 vLLM 高吞吐的核心。",
    { tags: ["vLLM", "PagedAttention"] });

  add("infer", "short", 2,
    "推理时显存占用由哪些构成？如何估算？",
    "① 模型权重：参数量 × 字节（FP16=2B，INT8=1B，INT4=0.5B），7B FP16 约 14GB；② KV Cache：2 × 层数 × KV头数 × 头维度 × 序列长度 × 字节 × batch；③ 激活/中间张量（prefill 阶段峰值明显）；④ 框架开销。估算 7B 模型 4K 上下文：权重 14GB + KV ~2-6GB。优化：量化权重、GQA、KV 量化、FlashAttention 减激活、offload。",
    { tags: ["显存", "推理"] });

  add("infer", "short", 3,
    "投机采样（Speculative Decoding）的原理？为什么能加速？",
    "用一个小而快的草稿模型（draft model）贪心生成 k 个 token，大模型一次性并行验证：接受概率由大模型分布与草稿分布之比决定（拒绝采样保证分布与直接大模型采样**等价**）。因为小模型生成快、大模型单步验证 k 个 token 的并行成本远低于串行生成 k 步，整体加速 2-3x。要求草稿与大模型分布接近（同族小模型/自草稿 N-gram）。",
    { tags: ["投机采样", "加速"] });

  add("infer", "short", 2,
    "连续批处理（Continuous Batching）为什么能提升吞吐？",
    "传统静态批处理：整批生成完才释放，长尾请求拖慢整批。连续批处理：请求粒度调度——某请求生成完（或达到 max_tokens）立即腾出显存/计算给新请求，批次动态增删；配合 PagedAttention 的分块显存管理，GPU 计算与显存利用率大幅提升，是 vLLM/SGLang 等引擎吞吐高的关键之一。",
    { tags: ["批处理", "吞吐"] });

  add("infer", "short", 2,
    "推理时张量并行（TP）的作用？为什么常用？",
    "单卡放不下模型权重时，把每层权重/注意力头切分到多卡，前向时每卡算一部分再 AllReduce 合并（如列并行+行并行）。好处：权重+KV Cache 均摊到多卡，能跑更大模型、提升单请求吞吐；局限：每层都要跨卡通信，扩展效率受卡间带宽限制（NVLink 才高效），一般 TP≤8（单机）。与 PP（按层切）相比 TP 通信更频繁但无气泡。",
    { tags: ["张量并行", "多卡"] });

  add("infer", "choice", 3,
    "FlashAttention 的核心思想是：",
    "FlashAttention：分块（tiling）计算注意力，把 Q/K/V 分块加载到 SRAM，用「在线 softmax」两遍扫描逐块更新统计量，避免实例化 O(n²) 的注意力矩阵（不写回 HBM），减少 HBM 读写 → 训练/推理显著加速、显存 O(n) 而非 O(n²)。",
    { options: ["A. 用哈希代替注意力", "B. 分块计算 + 在线 softmax，避免物化 O(n²) 矩阵，减少显存读写", "C. 把注意力换成卷积", "D. 只计算对角线附近的注意力"], answer: "B", tags: ["FlashAttention", "加速"] });

  add("infer", "short", 2,
    "首 token 延迟（TTFT）与生成吞吐（TPOT/吞吐）分别怎么优化？",
    "TTFT 由 prefill 决定（一次性处理整个 prompt）：优化——并行 prefill（序列并行/TP）、稀疏注意力、减少 prompt 长度（检索/压缩）、更快的 GEMM 与计算图优化。生成吞吐由 decode 决定（逐 token、带宽受限）：优化——KV Cache 优化（GQA/量化/分页）、continuous batching 提利用率、投机采样、量化、多卡 TP。线上通常把两者分开：TTFT 敏感场景（对话）与吞吐敏感场景（离线批量）采用不同部署配置。",
    { tags: ["TTFT", "吞吐"] });

  add("infer", "short", 2,
    "主流推理框架有哪些？prefix caching 是什么？",
    "vLLM（PagedAttention、吞吐高、生态好）、TensorRT-LLM（NVIDIA 深度优化、低延迟）、SGLang（RadixAttention 前缀树缓存、结构化生成）、LMDeploy、TGI（HF）、llama.cpp（端侧/CPU）。Prefix caching：把公共前缀（system prompt、few-shot 示例）的 KV Cache 缓存复用，多请求共享前缀时省去重复 prefill，RAG/Agent 多轮场景收益大（vLLM 自动 prefix caching、SGLang 前缀树）。",
    { tags: ["推理框架", "前缀缓存"] });

  add("infer", "judge", 2,
    "KV Cache 显存占用与序列长度成正比。",
    "对。KV Cache = 每层每头的 K/V 张量，随序列长度线性增长（与 batch 也成正比）。所以长上下文推理成本高，才需要 GQA、KV 量化、分页缓存等优化。",
    { answer: "对", tags: ["KV Cache", "显存"] });

  /* ==================== 场景与系统设计 (scene) ==================== */

  add("scene", "short", 2,
    "设计一个 RAG 问答系统，你会怎么做？",
    "① 离线索引：文档解析/清洗 → 切分（按语义块 300-500 token + 重叠）→ embedding（如 bge-m3）→ 向量库（Milvus/FAISS）+ 可选 BM25 倒排；② 在线流程：query 改写（多轮补全/意图）→ 检索 Top-50 → 重排（cross-encoder 精排 Top-5）→ 组装 prompt（含引用来源）→ LLM 生成（限制「不知道就说不知道」）→ 后处理（引用标记/格式）；③ 评估：检索召回率（Recall@k）、生成准确性（人工/LLM-judge）、幻觉率、端到端上线监控；④ 迭代：bad case 分析 → 调切分/embedding/重排/提示词。",
    { tags: ["RAG", "系统设计"] });

  add("scene", "short", 2,
    "设计一个推荐系统（如信息流），讲清架构。",
    "经典三段式：① 召回：多路召回——协同过滤（ItemCF/UserCF）、双塔向量召回（用户塔/物品塔，ANN 检索）、热门/地域/标签召回，每路取几百；② 粗排：轻量模型（双塔/DSSM）把候选从千级剪到百级；③ 精排：深度学习排序模型（DIN/DLRM 类，特征：用户/物品/交叉/上下文），输出 CTR/CVR 预估，再结合多样性/新鲜度/商业化做重排。冷启动：新用户用热门+注册画像，新物品用内容特征与探索（EE：UCB/汤普森采样）。评估：离线 AUC/GAUC，在线 A/B 实验。",
    { tags: ["推荐系统", "系统设计"] });

  add("scene", "short", 3,
    "如何评估大模型生成质量？",
    "① 自动指标：PPL、BLEU/ROUGE（有参考答案的受控任务）、BERTScore（语义相似）；② 基于模型的评估：LLM-as-a-Judge（用强模型打分/两两对比，注意位置偏差/自偏好）、RAG 场景的检索命中率与忠实度（Faithfulness）；③ 人工评估：对齐度、流畅性、事实性（金标准但贵）；④ 任务特定：代码（单测通过率 HumanEval）、数学（GSM8K/MATH 准确率）、问答（F1/EM）；⑤ 上线：用户反馈（点赞/采纳率）、bad case 回归集、A/B。注意避免用训练数据污染测试集。",
    { tags: ["评估", "LLM"] });

  add("scene", "short", 3,
    "训练一个 10B 参数模型需要多少显存？怎么设计多卡方案？",
    "估算（全参 Adam + FP16/BF16 混合精度）：权重 10B×2B=20GB；梯度 20GB；Adam 状态（FP32 一阶+二阶）10B×4B×2=80GB；合计 ~120GB，加激活与临时显存更多。方案：单机 8×80GB 用 3D 并行（DP/TP/PP+ZeRO-1）可训；单卡 24GB 用 ZeRO-3/offload 或 QLoRA（4bit 底座+LoRA，10B 可压到 ~10GB 级）。回答时给出数量级估算与「先算后配」的方法论（参数×字节×系数）。",
    { tags: ["显存估算", "系统设计"] });

  add("scene", "short", 2,
    "线上 LLM 服务延迟高，如何排查与优化？",
    "排查：拆 TTFT/prefill 与 TPOT/decode；定位瓶颈是计算（GPU 利用率）、带宽（显存拷贝）、排队（QPS/并发）、还是外部依赖（检索/工具）。优化手段分层：① 请求层：减少 prompt（压缩/检索）、流式输出、early stop、缓存（语义缓存/prefix cache）；② 模型层：量化（INT4/FP8）、投机采样、GQA/KV 量化、小模型路由（简单请求用小模型）；③ 框架层：continuous batching、TP/PP、FlashAttention、CUDA Graph；④ 系统层：GPU 规格/数量、负载均衡、超时与降级、动态批。先量化再优化，用 profiler（ncu/py-spy）定位。",
    { tags: ["性能优化", "系统设计"] });

  add("scene", "short", 2,
    "设计一个文本内容审核/分类系统。",
    "数据：标注体系（色情/暴力/政治/广告/辱骂等类别 + 置信度阈值）、多语言、对抗样本；模型：短文本用 FastText/TextCNN 基线 → BERT 类精排；长文本分段+聚合；大模型时代用 LLM 审核 + 小模型召回两级（召回候选→LLM 判定），或 Few-shot LLM 打分；特征：关键词/规则（漏网兜底）+ 语义模型融合。评估：精确率/召回率（安全优先，漏判>误判）、错误类型分析（如色情误伤正常内容）、延迟与成本预算。上线：双模型投票、人审抽检、持续 bad case 回流迭代。",
    { tags: ["内容审核", "系统设计"] });

  add("scene", "short", 3,
    "向量检索（ANN）与 BM25 的区别？混合检索怎么做？",
    "BM25：基于词频/逆文档频率的词法匹配，精确但同义改写召回差；向量检索：embedding 语义匹配，召回同义但可能引入无关结果；ANN（近似最近邻，如 HNSW/IVF-PQ）在亿级向量上毫秒级召回。混合检索：两路各取 Top-k 合并 → 重排（RRF 融合 / cross-encoder 精排），兼顾词法与语义；评估用召回率与 NDCG。实践：RAG 场景标配「BM25+向量」混合。",
    { tags: ["检索", "ANN", "BM25"] });

  add("scene", "short", 3,
    "什么是数据泄漏（Data Leakage）？在模型评估中有什么危害？",
    "数据泄漏：训练信息（目标值、未来信息、测试集样本）在训练/特征构建阶段被提前看到，导致评估虚高、上线崩盘。常见来源：① 特征里混入标签（如用是否点击后的行为做特征）；② 全局统计（归一化用全量均值/方差、目标编码用全量）；③ 样本重复或相似样本跨 train/test（去重不彻底）；④ 时序数据用未来信息（需按时间切分）；⑤ 测试集参与调参/早停选择。危害：离线指标乐观、线上效果断崖。对策：严格切分（分层/按时间）、特征只基于训练分布、去重、冻结测试集。",
    { tags: ["数据泄漏", "评估"] });

  /* ==================== 项目与行为面试 (behavior) ==================== */

  add("behavior", "short", 1,
    "介绍一个你最满意的项目（建议用 STAR 结构）。",
    "回答框架（STAR）：S（背景）——任务背景与规模（如 3 人团队、2 万用户数据）；T（任务）——你的目标与职责（明确你个人负责的部分）；A（行动）——具体方案与关键技术（如：用 X 模型 + Y 方案，量化改进）；R（结果）——量化成果（准确率提升 X%、上线后 QPS、节省成本）。加分点：讲清你的独立贡献、踩过的坑与决策依据、可复现细节（数据/代码/评估方式）。建议提前准备 2-3 个不同侧重点的项目（算法/工程/协作）。",
    { tags: ["行为面试", "STAR"] });

  add("behavior", "short", 1,
    "项目中遇到的最大困难是什么？你是怎么解决的？",
    "建议选一个「真实、有技术含量、结局向好」的困难，按：困难是什么（具体现象与影响）→ 排查过程（假设-验证，体现方法论）→ 解决手段（技术+协作）→ 结果与沉淀（经验/文档/流程改进）。避免：说没有困难；把锅全甩给别人；困难太简单。常见好素材：显存/性能瓶颈、数据质量问题、模型不收敛、跨团队协作冲突。",
    { tags: ["行为面试"] });

  add("behavior", "short", 1,
    "为什么选择 AI 开发方向？你的职业规划？",
    "结合个人经历讲动机（做过什么项目/竞赛/论文，发现对 XX 的兴趣）+ 对行业趋势的理解（大模型应用落地、AI 工程化）+ 3 年规划（1 年打好工程与算法基础、深入一个方向如推理优化/大模型应用，3 年成为能独立负责模块的工程师）。注意：规划要具体、与应聘岗位强相关，避免空话（「热爱学习」类）。",
    { tags: ["行为面试"] });

  add("behavior", "short", 2,
    "如何持续跟进 AI 前沿？",
    "结构化渠道：① 论文：arXiv（cs.CL/cs.LG）+ 顶会（NeurIPS/ICML/ACL/ICLR）+ 周报订阅（如 paperswithcode 趋势）；② 工程：GitHub 热门仓库（vLLM/transformers/DeepSpeed）、官方技术博客（DeepSeek/OpenAI/Qwen/Anthropic 论文解读）；③ 实践：复现/跑通 Demo、参加 Kaggle/天池、维护个人项目；④ 社区：知乎/公众号精选、AI 社群讨论。加分点：讲一个最近在看的具体工作（如某模型的技术报告），展现深度而非广度。",
    { tags: ["行为面试"] });

  add("behavior", "short", 2,
    "和同事/同学意见不合时怎么处理？",
    "原则：对事不对人、用数据说话。框架：① 先复述对方观点确认理解；② 用实验/数据/文档对比方案（谁能更快验证就验证谁）；③ 讨论时聚焦目标（用户/业务价值）而非立场；④ 达不成一致时按既定流程升级（导师/评审会）并保留记录；⑤ 无论结果，事后复盘。回答时给一个真实例子，突出你如何用验证代替争论。",
    { tags: ["行为面试"] });

  add("behavior", "short", 1,
    "你的实习/项目经历中，你具体负责什么？产出了什么？",
    "用「职责 → 动作 → 量化产出」作答：如「负责数据管线搭建，用 Airflow 调度 20+ 任务，把特征产出时间从 2 小时降到 20 分钟」；「负责模型优化，AUC 从 0.82 提到 0.86」。量化是核心：数字（规模/提升/成本）+ 独立贡献（哪些是你个人完成的）+ 影响（对团队/业务的价值）。",
    { tags: ["行为面试"] });

  add("behavior", "short", 1,
    "面试最后，应该反问面试官什么问题？",
    "好的反问体现思考深度与意向度：① 团队方向：团队目前在做什么、最关注的问题（如推理成本/数据）；② 岗位细节：新人的培养路径、主要负责的业务；③ 技术：团队对某技术选型（如推理框架、训练方案）的看法；④ 业务：岗位指标与挑战。避免：直接问薪资福利（留给 HR）、问「我表现怎么样」（可稍后再问）。",
    { tags: ["行为面试"] });

  add("behavior", "short", 1,
    "你的优缺点是什么？",
    "优点：选与岗位强相关的 2 个，用事实支撑（如「工程落地能力强：独立完成 XX 上线」）。缺点：选一个真实的、可改进的、且已有改进动作的缺点（如「初期容易在方案上过度设计，后来学会先做最小可行版本并用数据迭代」），切忌「我太追求完美」式伪缺点。回答结构：缺点 + 影响 + 改进措施 + 现状。",
    { tags: ["行为面试"] });

  add("behavior", "short", 1,
    "你了解我们公司/这个岗位在做什么吗？",
    "提前做功课：公司产品与技术公开信息（官网/技术博客/论文/开源项目）、岗位 JD 关键词、近期新闻（如发布的模型/产品）。回答：① 复述你理解的业务与岗位职责；② 结合自己的经历说明匹配点（技能/兴趣/做过的事）；③ 提一个具体的观察或问题（如「看到你们开源了 XX，想了解…」）。这题考的是诚意与信息搜集能力。",
    { tags: ["行为面试"] });

})(typeof window !== "undefined" ? window : globalThis);
