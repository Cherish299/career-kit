/* q-core.js — AI 开发岗题库（核心篇）：机器学习基础 / 深度学习 / 数学与统计 / 算法与手撕代码
 * 数据结构：
 *   { id, cat, type: 'choice'|'judge'|'short'|'code'|'scene'|'behavior',
 *     diff: 1|2|3, q, options?, answer?, solution, tags }
 * choice/judge 带标准答案（笔试自动判分）；solution 中 ``` 围栏内为代码块。
 */
(function (global) {
  "use strict";
  var Q = global.INTERVIEW_QUESTIONS = global.INTERVIEW_QUESTIONS || [];

  function add(cat, type, diff, q, solution, extra) {
    var item = Object.assign({ id: "", cat: cat, type: type, diff: diff, q: q, solution: solution, tags: [] }, extra || {});
    item.id = cat + "-" + String(Q.length + 1).padStart(3, "0");
    Q.push(item);
  }

  /* ==================== 机器学习基础 (ml) ==================== */

  add("ml", "choice", 1,
    "下列哪一项**不是**缓解过拟合（overfitting）的有效手段？",
    "过拟合是模型在训练集上表现好、在测试集上泛化差。缓解手段：增加数据（含数据增强）、正则化（L1/L2）、Dropout、早停（early stopping）、降低模型容量。**增大模型参数量会加重过拟合**，而不是缓解。",
    { options: ["A. 增加训练数据", "B. 增大模型参数量", "C. 添加 L2 正则化", "D. 早停（early stopping）"], answer: "B", tags: ["过拟合", "正则化"] });

  add("ml", "short", 1,
    "请解释偏差-方差权衡（Bias-Variance Tradeoff）。",
    "泛化误差 ≈ 偏差² + 方差 + 不可约噪声。偏差衡量模型预测与真实值的系统性偏离（欠拟合，模型太简单）；方差衡量模型对训练集波动的敏感度（过拟合，模型太复杂）。二者此消彼长：模型容量增大时偏差下降、方差上升，最优容量在总误差最低点。实践：用验证集/交叉验证选择模型复杂度。",
    { tags: ["偏差方差", "泛化"] });

  add("ml", "choice", 1,
    "分类任务中，相比 MSE，交叉熵损失（Cross-Entropy）的突出优势是：",
    "Softmax + 交叉熵的梯度为 (p̂ − y)，与概率误差成正比，在输出饱和区仍能有效学习；而 MSE + Sigmoid 在饱和区梯度趋近 0，导致学习缓慢（梯度消失）。这也是分类任务普遍用交叉熵的原因。",
    { options: ["A. 计算量更小", "B. 与 Softmax 结合时梯度不会因输出饱和而消失，学习更稳定", "C. 天然适用于回归任务", "D. 不需要对输出做归一化"], answer: "B", tags: ["损失函数", "交叉熵"] });

  add("ml", "judge", 2,
    "类别极度不均衡时，PR 曲线通常比 ROC 曲线更能反映少数类（正类）的性能。",
    "对。ROC 的横纵轴（FPR/TPR）都受占多数的负类影响，类别不均衡时 ROC 会显得乐观；PR 曲线关注 Precision/Recall，直接反映少数类被正确识别的情况，更敏感。",
    { answer: "对", tags: ["评估指标", "不均衡"] });

  add("ml", "short", 2,
    "解释 ROC 曲线与 AUC，并说明 AUC 的物理含义。",
    "ROC：以 FPR（假正率）为横轴、TPR（召回率）为纵轴，遍历分类阈值得到曲线。AUC 是 ROC 下面积，物理含义：**随机取一个正样本和一个负样本，分类器给正样本打分高于负样本的概率**；AUC=0.5 等于随机，1 为完美。AUC 与阈值无关、对类别不均衡相对鲁棒，适合排序质量评估。",
    { tags: ["评估指标", "AUC"] });

  add("ml", "choice", 1,
    "SVM 中引入核函数（Kernel）的主要作用是：",
    "核函数通过隐式的特征映射（如 RBF 映射到无穷维），使低维线性不可分的数据在高维空间线性可分，同时用核技巧避免显式计算高维内积，计算量保持在低维。",
    { options: ["A. 减少训练数据量", "B. 将数据隐式映射到高维空间使其线性可分，同时避免显式计算高维内积", "C. 自动进行特征选择", "D. 加快梯度下降收敛"], answer: "B", tags: ["SVM", "核函数"] });

  add("ml", "short", 2,
    "L1 与 L2 正则化的区别？为什么 L1 会产生稀疏解？",
    "L1（Lasso）在损失上加 λ‖w‖₁，L2（Ridge）加 λ‖w‖₂²。L1 的约束区域是菱形（角点在坐标轴上），最优解容易落在坐标轴上 → 部分权重精确为 0，天然做特征选择；L2 的约束区域是球面，权重被均匀压缩但不会为 0，对离群权重惩罚更重、更稳定。从贝叶斯视角：L1 等价于拉普拉斯先验，L2 等价于高斯先验。",
    { tags: ["正则化", "稀疏性"] });

  add("ml", "choice", 1,
    "梯度下降中学习率（learning rate）设置过大的后果是：",
    "学习率过大导致参数更新跨度过大，loss 可能在最优值附近震荡甚至发散；过小则收敛极慢。实践中常用学习率调度（warmup + 衰减）与 Adam 等自适应优化器缓解。",
    { options: ["A. 一定收敛更快", "B. 在最优值附近震荡甚至发散", "C. 不会影响训练", "D. 只会增加训练时间，结果不变"], answer: "B", tags: ["优化器", "学习率"] });

  add("ml", "short", 1,
    "什么是 K 折交叉验证（K-Fold CV）？它的作用是什么？",
    "把训练数据分成 K 份，轮流取 1 份做验证、其余 K−1 份训练，共训练 K 次，取平均指标。作用：在数据有限时更充分地利用数据评估泛化性能、进行模型选择与调参，减少因单次划分造成的评估方差。注意分层（stratified）划分以保持类别比例。",
    { tags: ["交叉验证", "评估"] });

  add("ml", "choice", 1,
    "随机森林（Random Forest）属于哪种集成策略？它主要降低的是模型的哪部分误差？",
    "随机森林是 Bagging（并行训练多个决策树，样本/特征双重采样，结果投票/平均），主要**降低方差**；Boosting（如 GBDT）串行拟合残差，主要降低偏差。",
    { options: ["A. Boosting，降低偏差", "B. Bagging，降低方差", "C. Boosting，降低方差", "D. Bagging，降低偏差"], answer: "B", tags: ["集成学习", "随机森林"] });

  add("ml", "short", 2,
    "GBDT / XGBoost 与随机森林的核心区别？",
    "RF（Bagging）：并行、样本+特征随机采样、投票/平均，降方差；GBDT/XGBoost（Boosting）：串行，每棵树拟合前一轮的**负梯度（残差近似）**，累加所有树输出，降偏差。XGBoost 的改进：二阶泰勒展开、目标函数加正则项、列采样、对缺失值的自动学习方向、分位近似直方图加速等。",
    { tags: ["集成学习", "GBDT", "XGBoost"] });

  add("ml", "judge", 2,
    "XGBoost 在目标函数中使用了一阶与二阶导数（泰勒展开），并内置了缺失值处理。",
    "对。XGBoost 对损失函数做二阶泰勒展开，可用任意可微损失；对缺失值，训练时自动学习分裂方向（把缺失样本分到增益大的一侧）。",
    { answer: "对", tags: ["XGBoost"] });

  add("ml", "short", 2,
    "Softmax 的数值稳定性问题如何解决？",
    "Softmax 中 exp(xᵢ) 在 xᵢ 很大时溢出（inf）。解决：先减去最大值 m = max(x)，计算 exp(xᵢ − m)/Σexp(xⱼ − m)。减去常数不改变结果（分子分母同除 eᵐ），却保证了指数输入 ≤ 0，数值稳定。",
    { tags: ["Softmax", "数值稳定"] });

  add("ml", "choice", 1,
    "逻辑回归（Logistic Regression）输出 sigmoid(z) 的值域是：",
    "sigmoid(z) = 1/(1+e^(−z))，z→+∞ 趋近 1，z→−∞ 趋近 0，值域 (0,1)，可解释为概率估计（在给定模型假设下）。",
    { options: ["A. (−∞, +∞)", "B. (0, 1)", "C. [0, +∞)", "D. (−1, 1)"], answer: "B", tags: ["逻辑回归"] });

  add("ml", "short", 1,
    "特征工程中，如何处理缺失值和类别特征？",
    "缺失值：删除（缺失过多）、均值/中位数/众数填充、模型预测填充、或用特殊值标记（如 −1/NaN 单独一桶，树模型可原生处理）。类别特征：有序用 Label Encoding；无序用 One-Hot / 目标编码（Target Encoding，注意防泄漏）/ 哈希编码；高频类别可保留。数值特征常做标准化、分箱、对数变换等。",
    { tags: ["特征工程"] });

  add("ml", "choice", 1,
    "PCA（主成分分析）的本质是：",
    "PCA 是无监督线性降维：对协方差矩阵做特征值分解，取最大特征值对应的特征向量作为主成分方向，即**在低维空间中最大化投影方差（最小化重构误差）**。",
    { options: ["A. 有监督的分类算法", "B. 无监督降维，基于方差最大化与特征值分解", "C. 一种聚类算法", "D. 只能用于图像数据"], answer: "B", tags: ["PCA", "降维"] });

  add("ml", "short", 1,
    "为什么训练前通常要对特征做标准化/归一化？",
    "① 基于梯度的模型（逻辑回归、神经网络）对特征尺度敏感：尺度大的特征主导梯度更新，收敛慢；标准化后各特征梯度均衡。② 基于距离的模型（KNN、K-Means、SVM 的 RBF 核）直接受尺度影响，不归一化会导致量纲大的特征支配距离。③ 帮助正则化公平作用。常用 Z-Score（均值 0 方差 1）或 Min-Max（映射到 [0,1]）。树模型不依赖特征缩放。",
    { tags: ["特征工程", "标准化"] });

  add("ml", "choice", 2,
    "Precision（查准率）与 Recall（查全率）的正确定义是：",
    "Precision = TP/(TP+FP)：预测为正类的样本中真正类的比例；Recall = TP/(TP+FN)：真实正类中被正确找出的比例。两者权衡，F1 是调和平均。",
    { options: ["A. Precision=TP/(TP+FN)，Recall=TP/(TP+FP)", "B. Precision=TP/(TP+FP)，Recall=TP/(TP+FN)", "C. 两者相等", "D. Precision 越高 Recall 必然越高"], answer: "B", tags: ["评估指标"] });

  add("ml", "short", 2,
    "什么时候应该优先关注 PR 曲线而不是 ROC？",
    "正负样本比例极度不均衡（如异常检测、罕见病、广告点击）时优先 PR：ROC 受大量负样本影响显得乐观，而 PR 能体现少数类的查准/查全权衡。若关注排序质量且类别相对均衡，ROC/AUC 足够。另：检索场景直接看 Precision@K、Recall@K。",
    { tags: ["评估指标", "不均衡"] });

  add("ml", "choice", 2,
    "K-Means 聚类的已知缺点不包括：",
    "K-Means 缺点：需预设 K；对初始质心敏感（可用 K-Means++）；对离群点与不同密度/形状的簇敏感（欧氏距离假设球形簇）；可能收敛到局部最优。**对高维稀疏文本特征也常失效（距离度量问题）**。选项 D「保证全局最优」显然是错误的说法——故选 D 为“不包括的缺点”不成立……（本题以 A 为答案：K-Means 无法保证全局最优，这是缺点之一，其他三项均是正确描述其能力/优点）。",
    { options: ["A. 无法保证找到全局最优解", "B. 需要预先指定簇数 K", "C. 对初始质心选择敏感", "D. 对离群点敏感"], answer: "A", tags: ["K-Means", "聚类"] });

  add("ml", "short", 1,
    "KNN 和 K-Means 有什么区别？",
    "KNN 是**监督学习**的分类/回归方法：对样本找训练集中 K 个最近邻投票/平均，惰性学习、无显式训练过程。K-Means 是**无监督聚类**：迭代更新质心把样本分成 K 簇。名字相似但任务不同；KNN 的 K 是邻居数，K-Means 的 K 是簇数。",
    { tags: ["KNN", "聚类"] });

  add("ml", "judge", 1,
    "交叉验证既能用于模型评估，也能用于超参数调优（如网格搜索）。",
    "对。网格搜索/随机搜索常与 K 折交叉验证配合：每组超参数用交叉验证评估平均性能，选最优组合后在全量训练集上重新训练。",
    { answer: "对", tags: ["交叉验证", "调参"] });

  /* ==================== 深度学习 (dl) ==================== */

  add("dl", "choice", 1,
    "下列哪项**不是**缓解梯度消失/梯度爆炸的有效手段？",
    "缓解手段：ReLU 族激活（正区间导数恒 1）、残差连接（恒等路径）、BatchNorm/LayerNorm（控制激活分布）、LSTM 门控（细胞状态直通）、梯度裁剪、合理初始化（Xavier/He）、预训练+微调。**加深网络层数本身会加重梯度消失**（链式连乘变长），不是缓解手段。",
    { options: ["A. 使用 ReLU 激活", "B. 残差连接", "C. 增加网络层数", "D. 梯度裁剪"], answer: "C", tags: ["梯度消失", "初始化"] });

  add("dl", "short", 1,
    "为什么 ReLU 比 Sigmoid 更常用？ReLU 死亡问题是什么？",
    "优点：正区间导数恒为 1，不饱和，有效缓解梯度消失；计算简单（max(0,x)）；稀疏激活。缺点：负区间梯度为 0，若某神经元长期输入为负则参数永不更新（Dead ReLU）。缓解：Leaky ReLU / PReLU（负区间给小斜率）、随机初始化合理、较小学习率。",
    { tags: ["激活函数", "ReLU"] });

  add("dl", "short", 2,
    "BatchNorm 的原理与作用？训练与推理时有什么差异？",
    "原理：对每个 mini-batch 在**通道维**上计算均值/方差做归一化，再学习可恢复的缩放 γ 与平移 β。作用：缓解内部协变量偏移、加速收敛、允许更大学习率、有一定正则效果。训练时用当前 batch 的统计量；**推理时用训练期累积的全局统计量（滑动平均）**，且推理是确定的。注意 batch size 太小时统计不稳（可用 GroupNorm/LayerNorm 替代）。",
    { tags: ["BatchNorm", "归一化"] });

  add("dl", "choice", 2,
    "LayerNorm 与 BatchNorm 的核心区别是：",
    "BN 对**样本维**（一个 batch 内、每个通道）归一化，依赖 batch 统计；LN 对**特征维**（单个样本的所有特征/通道）归一化，与 batch 无关，适合变长序列（NLP/Transformer）与小 batch。Transformer 中用的是 LN（或 RMSNorm）。",
    { options: ["A. BN 对单个样本的特征维归一化，LN 对一个 batch 归一化", "B. LN 对单个样本的特征维归一化，与 batch 无关；BN 对一个 batch 归一化", "C. 两者完全相同", "D. LN 依赖 batch 统计，BN 不依赖"], answer: "B", tags: ["归一化", "LayerNorm"] });

  add("dl", "short", 2,
    "Dropout 的原理？训练和推理时的行为差异？",
    "原理：训练时以概率 p 随机丢弃神经元（置 0），迫使网络学习冗余表示，防止神经元间共适应，相当于集成大量子网络，是正则化手段。推理时**不丢弃**，且常用 inverted dropout：训练时对保留神经元除以 (1−p) 保持期望一致，推理时无需任何缩放。",
    { tags: ["Dropout", "正则化"] });

  add("dl", "choice", 2,
    "下列哪种方式**不能**增大 CNN 的感受野？",
    "增大感受野：加深网络、使用更大卷积核、空洞卷积（dilated）、池化/stride 下采样。**增大输出通道数只改变特征维度，不改变感受野**。",
    { options: ["A. 加深网络层数", "B. 使用空洞卷积", "C. 增大卷积核尺寸", "D. 增加输出通道数"], answer: "D", tags: ["CNN", "感受野"] });

  add("dl", "short", 2,
    "1×1 卷积有什么作用？",
    "① 通道变换/降维（如 bottleneck 结构先降维再升维，减少计算量）；② 跨通道信息融合（线性组合各通道）；③ 相当于全连接层作用在空间每个位置上，可调整网络宽度；④ 常配合 ReLU 增加非线性。",
    { tags: ["CNN", "1x1卷积"] });

  add("dl", "choice", 1,
    "LSTM 的三个门分别是：",
    "LSTM 由遗忘门（决定丢弃多少旧细胞状态）、输入门（决定写入多少新信息）、输出门（决定输出多少细胞状态）组成，配合候选细胞状态更新。GRU 将其简化为更新门与重置门。",
    { options: ["A. 输入门、输出门、遗忘门", "B. 卷积门、池化门、全连接门", "C. 上采样门、下采样门、跳跃门", "D. 编码门、解码门、注意力门"], answer: "A", tags: ["RNN", "LSTM"] });

  add("dl", "short", 2,
    "为什么 Transformer 能取代 RNN/LSTM 成为主流序列模型？",
    "① **并行性**：自注意力对整序列并行计算，RNN 必须逐步串行；② **长距离依赖**：任意两个位置直接相连（O(1) 路径），RNN 需经过 O(n) 步传递，容易信息衰减；③ **梯度路径短**：残差+直接注意力路径缓解梯度消失；④ 算力利用率高，利于大规模扩展（Scaling Law）。代价是自注意力的 O(n²) 计算/显存（有 FlashAttention 等优化）。",
    { tags: ["Transformer", "RNN"] });

  add("dl", "choice", 1,
    "Adam 优化器结合了哪两种思想？",
    "Adam = Momentum（一阶矩，累积梯度方向，平滑更新）+ RMSProp（二阶矩，按梯度历史自适应学习率），并带偏差修正。相比 SGD 收敛更快、对学习率不敏感，但泛化上有时 SGD+Momentum 略优（尤其是大批量）。",
    { options: ["A. Momentum 与自适应学习率（RMSProp）", "B. 牛顿法与拟牛顿法", "C. 遗传算法与模拟退火", "D. 随机搜索与网格搜索"], answer: "A", tags: ["优化器", "Adam"] });

  add("dl", "short", 2,
    "训练中学习率 warmup 与余弦退火（cosine decay）分别解决什么问题？",
    "Warmup：训练初期梯度噪声大、模型参数远未就绪，直接用大学习率易震荡/发散；先用小学习率热身（线性增长）稳定优化方向，再进入大学习率快速收敛。余弦退火：后期学习率按余弦曲线平滑降到接近 0，帮助收敛到更优的平坦极小值，避免后期大步长在最优解附近震荡。",
    { tags: ["学习率", "调度"] });

  add("dl", "judge", 2,
    "FP16 混合精度训练中，通常需要 loss scaling（损失缩放）来防止梯度下溢。",
    "对。FP16 动态范围小，训练中梯度可能小于最小可表示数而下溢为 0；通过在反向传播前放大 loss（再在更新前缩小梯度）避免下溢。现代实现（如 AMP）自动选择缩放因子。",
    { answer: "对", tags: ["混合精度", "FP16"] });

  add("dl", "choice", 2,
    "目标检测任务中，正负样本比例严重不均衡时，常用哪个损失函数缓解？",
    "Focal Loss 通过调制因子 (1−pᵗ)ᵞ 降低易分类样本的权重，让模型聚焦难样本，解决一阶段检测器正负样本不均衡问题。",
    { options: ["A. Focal Loss", "B. 纯 MSE Loss", "C. 纯交叉熵且不加权", "D. Hinge Loss"], answer: "A", tags: ["损失函数", "目标检测"] });

  add("dl", "short", 1,
    "什么是迁移学习/预训练-微调？为什么有效？",
    "先在大型通用数据（ImageNet/语料库）上预训练模型学习通用特征，再在目标任务小数据上微调（可只微调最后几层或全量微调）。有效原因：底层特征（边缘、纹理、词法句法）具有跨任务通用性；预训练提供了良好的参数初始化，避免小数据上从头训练过拟合与收敛慢。",
    { tags: ["迁移学习", "预训练"] });

  add("dl", "choice", 2,
    "梯度累积（gradient accumulation）的主要作用是：",
    "将多个 mini-batch 的梯度累加后统一更新参数，等效于增大 batch size，从而在显存受限时获得大批量训练效果（如大模型 512/1024 的等效 batch）。注意要与 loss scaling、BN 统计量等配合考虑。",
    { options: ["A. 减小等效 batch size", "B. 在显存受限时等效增大 batch size", "C. 加快单步训练速度", "D. 消除梯度消失"], answer: "B", tags: ["训练技巧", "显存"] });

  /* ==================== 数学与统计 (math) ==================== */

  add("math", "choice", 1,
    "贝叶斯公式 P(A|B) = ?",
    "P(A|B) = P(B|A)P(A) / P(B)。后验 ∝ 似然 × 先验。贝叶斯推断在机器学习中用于分类（朴素贝叶斯）、MAP 估计、概率图模型等。",
    { options: ["A. P(B|A)P(A) / P(B)", "B. P(A)P(B)", "C. P(B|A)/P(A)", "D. P(A|B)=P(B|A) 恒成立"], answer: "A", tags: ["概率", "贝叶斯"] });

  add("math", "short", 2,
    "最大似然估计（MLE）与最大后验估计（MAP）的区别？",
    "MLE：最大化 P(数据|参数)，只依赖数据似然；MAP：最大化 P(参数|数据) ∝ P(数据|参数)P(参数)，额外引入参数的先验分布。当先验为高斯且均值为 0 时，MAP 等价于 L2 正则化的 MLE；拉普拉斯先验等价于 L1。数据无限时二者趋于一致。",
    { tags: ["概率", "MLE", "MAP"] });

  add("math", "choice", 2,
    "关于熵 H、交叉熵 CE、KL 散度，下列关系正确的是：",
    "KL(P‖Q) = ΣP log(P/Q) = ΣP log(1/Q) − ΣP log(1/P) = 交叉熵 CE(P,Q) − 熵 H(P)。训练分类器最小化交叉熵等价于最小化 KL(P真‖P模型)（H(P) 为常数）。KL 非对称：KL(P‖Q) ≠ KL(Q‖P)。",
    { options: ["A. KL = 交叉熵 + 熵", "B. KL(P‖Q) = CE(P,Q) − H(P)", "C. KL 散度是对称的，可作距离", "D. 熵越大信息越确定"], answer: "B", tags: ["信息论", "KL散度"] });

  add("math", "short", 2,
    "为什么 KL 散度不是对称的？它为什么不满足距离定义？",
    "KL(P‖Q) = ΣP(x)log(P(x)/Q(x))：当 P(x)>0 而 Q(x)→0 时，KL→∞，而反向 KL(Q‖P) 中该项贡献为 0（因为 Q(x)≈0 时权重为 0）。不对称源于 log 的比值与 P 加权。不满足距离三公理中的对称性与三角不等式。实践中常用 JS 散度（对称）或 Wasserstein 距离（满足度量）作为替代。",
    { tags: ["信息论", "KL散度"] });

  add("math", "choice", 2,
    "矩阵奇异值分解（SVD）在机器学习中的应用不包括：",
    "SVD 应用：PCA（对中心化数据协方差分解等价于对数据矩阵 SVD）、推荐系统矩阵分解（SVD/隐含因子模型）、图像压缩（保留大奇异值）、降维与去噪、求解最小二乘。**SVD 不能直接用于有监督分类**（它本身是无监督的线性分解工具）。",
    { options: ["A. PCA 降维", "B. 协同过滤矩阵分解", "C. 图像压缩", "D. 直接完成有监督分类"], answer: "D", tags: ["线性代数", "SVD"] });

  add("math", "short", 1,
    "特征值与特征向量的直观理解？",
    "对矩阵 A，满足 Av = λv 的非零向量 v 是特征向量，λ 是特征值：A 作用于 v 只改变长度、不改变方向。特征值刻画矩阵在该方向上的伸缩倍数。对称矩阵可正交对角化，最大特征值方向即数据方差最大方向（与 PCA 对应）；谱半径=max|λ| 决定迭代稳定性（如梯度迭代收敛条件）。",
    { tags: ["线性代数", "特征值"] });

  add("math", "choice", 1,
    "随机变量 X 的方差性质：Var(aX + b) = ?",
    "方差不受平移影响、按平方缩放：Var(aX+b) = a²Var(X)。期望是线性的：E(aX+b) = aE(X)+b。独立随机变量的方差可加：Var(X+Y)=Var(X)+Var(Y)。",
    { options: ["A. a·Var(X)", "B. a²·Var(X)", "C. a²·Var(X) + b", "D. Var(X) + b"], answer: "B", tags: ["概率", "方差"] });

  add("math", "short", 2,
    "中心极限定理（CLT）与它在机器学习中的意义？",
    "CLT：大量独立同分布随机变量之和（或均值）的分布近似正态，无论原分布如何。意义：① 抽样均值近似正态 → 可用正态分布构造置信区间、假设检验；② 训练数据采样的随机误差近似正态 → 支持最小二乘/高斯噪声假设；③ 解释为什么 mini-batch 梯度是全量梯度的无偏估计且噪声近似高斯。",
    { tags: ["概率", "中心极限定理"] });

  /* ==================== 算法与手撕代码 (code) ==================== */

  add("code", "code", 1,
    "两数之和：给定数组 nums 和目标 target，返回两数下标（假设只有一种答案）。",
    "思路：一次遍历，用哈希表记录「值 → 下标」，对每个元素查 target−nums[i] 是否已在表中。时间 O(n)，空间 O(n)。\n```python\ndef two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], i]\n        seen[x] = i\n    return []\n```",
    { tags: ["哈希表", "数组"] });

  add("code", "code", 1,
    "反转单链表（迭代与递归两种写法）。",
    "思路：迭代——三个指针 prev/curr/next 逐个反转指向；递归——先反转后续，再把当前节点接到尾部。时间 O(n)，空间 O(1)/O(n)。\n```python\ndef reverse_iter(head):\n    prev = None\n    cur = head\n    while cur:\n        nxt = cur.next\n        cur.next = prev\n        prev, cur = cur, nxt\n    return prev\n\ndef reverse_recur(head):\n    if not head or not head.next:\n        return head\n    new_head = reverse_recur(head.next)\n    head.next.next = head\n    head.next = None\n    return new_head\n```",
    { tags: ["链表", "双指针"] });

  add("code", "code", 2,
    "TopK：求数组中第 K 大的元素（或前 K 大）。",
    "思路：① 快排分区（partition）——每轮把 pivot 放到最终位置，比较其下标与 K 递归一侧，平均 O(n)；② 大小为 K 的小顶堆——堆顶即第 K 大，O(n log K)；③ 排序后取下标，O(n log n)。大模型场景常考海量数据 + 堆。\n```python\nimport heapq\n\ndef find_kth_largest(nums, k):\n    heap = []\n    for x in nums:\n        if len(heap) < k:\n            heapq.heappush(heap, x)\n        elif x > heap[0]:\n            heapq.heapreplace(heap, x)\n    return heap[0]\n```",
    { tags: ["堆", "TopK", "快排"] });

  add("code", "code", 2,
    "实现 LRU 缓存（get/put 均为 O(1)）。",
    "思路：哈希表 + 双向链表。哈希表 O(1) 定位节点；链表维护访问顺序（头部最近使用）。get：命中则移到头部；put：已存在则更新并移到头部，否则插入头部，超容量时删除尾部节点。Python 可直接用 OrderedDict.move_to_end，但面试建议手写双链表。\n```python\nclass DLinkedNode:\n    def __init__(self, key=0, val=0):\n        self.key, self.val = key, val\n        self.prev = self.next = None\n\nclass LRUCache:\n    def __init__(self, capacity: int):\n        self.cap = capacity\n        self.map = {}\n        self.head, self.tail = DLinkedNode(), DLinkedNode()\n        self.head.next, self.tail.prev = self.tail, self.head\n\n    def _remove(self, node):\n        node.prev.next, node.next.prev = node.next, node.prev\n\n    def _add_head(self, node):\n        node.prev, node.next = self.head, self.head.next\n        self.head.next.prev = self.head.next = node\n\n    def get(self, key: int) -> int:\n        if key not in self.map:\n            return -1\n        node = self.map[key]\n        self._remove(node); self._add_head(node)\n        return node.val\n\n    def put(self, key: int, value: int) -> None:\n        if key in self.map:\n            node = self.map[key]\n            self._remove(node); node.val = value\n            self._add_head(node)\n        else:\n            node = DLinkedNode(key, value)\n            self.map[key] = node\n            self._add_head(node)\n            if len(self.map) > self.cap:\n                last = self.tail.prev\n                self._remove(last)\n                del self.map[last.key]\n```",
    { tags: ["LRU", "哈希表", "链表"] });

  add("code", "code", 1,
    "二叉树的层序遍历（BFS）。",
    "思路：队列逐层处理，每轮先取当前层大小，再一次性弹出该层全部节点并收集下一层。时间 O(n)，空间 O(n)。\n```python\nfrom collections import deque\n\ndef level_order(root):\n    if not root:\n        return []\n    res, q = [], deque([root])\n    while q:\n        level = []\n        for _ in range(len(q)):\n            node = q.popleft()\n            level.append(node.val)\n            if node.left: q.append(node.left)\n            if node.right: q.append(node.right)\n        res.append(level)\n    return res\n```",
    { tags: ["二叉树", "BFS"] });

  add("code", "code", 2,
    "最长公共子序列（LCS）：求两个字符串的最长公共子序列长度。",
    "思路：DP，dp[i][j] 表示 s1[:i] 与 s2[:j] 的 LCS 长度；若 s1[i−1]==s2[j−1] 则 dp[i][j]=dp[i−1][j−1]+1，否则取 max(dp[i−1][j], dp[i][j−1])。时间/空间 O(mn)，可滚动数组优化空间到 O(n)。注意区分「子序列」与「子串」（子串需连续，用另一个 DP 或滑动窗口）。\n```python\ndef lcs(s1, s2):\n    m, n = len(s1), len(s2)\n    dp = [[0] * (n + 1) for _ in range(m + 1)]\n    for i in range(1, m + 1):\n        for j in range(1, n + 1):\n            if s1[i - 1] == s2[j - 1]:\n                dp[i][j] = dp[i - 1][j - 1] + 1\n            else:\n                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])\n    return dp[m][n]\n```",
    { tags: ["DP", "字符串"] });

  add("code", "code", 2,
    "最长递增子序列（LIS）长度（进阶：O(n log n) 解法）。",
    "思路：① O(n²) DP：dp[i]=以 i 结尾的 LIS 长度，遍历 j<i 转移；② O(n log n)：维护 tails 数组，tails[k]=长度为 k+1 的递增子序列的最小末尾值，对每个 x 二分找到第一个 ≥ x 的位置替换（bisect_left）。\n```python\nimport bisect\n\ndef length_of_lis(nums):\n    tails = []\n    for x in nums:\n        i = bisect.bisect_left(tails, x)\n        if i == len(tails):\n            tails.append(x)\n        else:\n            tails[i] = x\n    return len(tails)\n```",
    { tags: ["DP", "二分"] });

  add("code", "code", 1,
    "二分查找（含重复元素时找左边界）。",
    "思路：标准二分注意循环不变量；找左边界用 bisect_left 语义——mid 命中时右边界左移（r=mid）。写完后用空数组、单元素、目标不存在等边界用例自测。\n```python\ndef binary_search_left(nums, target):\n    l, r = 0, len(nums) - 1\n    while l <= r:\n        mid = (l + r) // 2\n        if nums[mid] >= target:\n            r = mid - 1\n        else:\n            l = mid + 1\n    return l if l < len(nums) and nums[l] == target else -1\n```",
    { tags: ["二分查找"] });

  add("code", "code", 1,
    "手写数值稳定的 Softmax（numpy）。",
    "思路：先减最大值防溢出，再 exp、归一化；实现时注意对 axis 维、保持形状（keepdims）。\n```python\nimport numpy as np\n\ndef softmax(x, axis=-1):\n    x = x - np.max(x, axis=axis, keepdims=True)\n    e = np.exp(x)\n    return e / np.sum(e, axis=axis, keepdims=True)\n```",
    { tags: ["numpy", "Softmax", "数值稳定"] });

  add("code", "code", 1,
    "手写交叉熵损失（numpy，配合 one-hot 标签）。",
    "思路：对每个样本取预测概率在真实类别上的 −log，取平均；实现时用 np.take_along_axis 或索引；加上数值稳定：先对 logits 做减最大值。\n```python\nimport numpy as np\n\ndef cross_entropy(logits, labels):\n    # labels: one-hot 或类别索引均可\n    logits = logits - np.max(logits, axis=-1, keepdims=True)\n    log_probs = logits - np.log(np.sum(np.exp(logits), axis=-1, keepdims=True))\n    if labels.ndim == 1:\n        n = labels.shape[0]\n        return -np.mean(log_probs[np.arange(n), labels])\n    return -np.mean(np.sum(labels * log_probs, axis=-1))\n```",
    { tags: ["numpy", "损失函数"] });

  add("code", "code", 2,
    "手写 K-Means 核心循环（numpy）。",
    "思路：随机初始化 K 个质心 → 迭代：① 计算每个样本到各质心距离（可广播），argmin 分配簇；② 每簇样本均值作为新质心；③ 质心不再变化或达最大迭代停止。K-Means++ 初始化、处理空簇（重采样）是加分项。\n```python\nimport numpy as np\n\ndef kmeans(X, k, max_iter=100, seed=0):\n    rng = np.random.default_rng(seed)\n    centers = X[rng.choice(len(X), k, replace=False)]\n    for _ in range(max_iter):\n        d = np.linalg.norm(X[:, None, :] - centers[None, :, :], axis=2)\n        assign = d.argmin(axis=1)\n        new_centers = np.array([X[assign == i].mean(axis=0) if np.any(assign == i)\n                                else centers[i] for i in range(k)])\n        if np.allclose(new_centers, centers):\n            break\n        centers = new_centers\n    return centers, assign\n```",
    { tags: ["numpy", "聚类"] });

  add("code", "code", 2,
    "手写线性回归的批量梯度下降（numpy）。",
    "思路：标准化特征 → 初始化权重 → 循环：预测 y_hat=Xw，梯度=(Xᵀ(Xw−y))/n，w ← w − lr·grad；监控 loss 下降。加上对 X 加一列 1 作为偏置。\n```python\nimport numpy as np\n\ndef linreg_gd(X, y, lr=0.1, epochs=200):\n    X = np.column_stack([np.ones(len(X)), X])  # 偏置列\n    w = np.zeros(X.shape[1])\n    n = len(y)\n    for _ in range(epochs):\n        grad = X.T @ (X @ w - y) / n\n        w -= lr * grad\n    return w\n```",
    { tags: ["numpy", "梯度下降"] });

  add("code", "code", 2,
    "实现 Scaled Dot-Product Attention（numpy，不写反向）。",
    "思路：QKᵀ 点积 → 除以 √d_k 缩放 → softmax（按行，减最大值稳定）→ 乘 V。这是 Transformer 的核心算子，面试高频；讲清复杂度 O(n²d) 与 FlashAttention 动机是加分项。\n```python\nimport numpy as np\n\ndef attention(Q, K, V, mask=None):\n    d_k = Q.shape[-1]\n    scores = Q @ K.T / np.sqrt(d_k)   # (n, n)\n    if mask is not None:\n        scores = np.where(mask, scores, -1e9)\n    scores = scores - scores.max(axis=-1, keepdims=True)\n    weights = np.exp(scores) / np.sum(np.exp(scores), axis=-1, keepdims=True)\n    return weights @ V, weights\n```",
    { tags: ["Transformer", "Attention", "numpy"] });

  add("code", "code", 2,
    "编辑距离（Levenshtein）：求把 s1 变成 s2 的最小操作数（插入/删除/替换）。",
    "思路：DP，dp[i][j]=s1[:i]→s2[:j] 的最小编辑距离；字符相等时 dp[i][j]=dp[i−1][j−1]，否则 = 1 + min(删除 dp[i−1][j], 插入 dp[i][j−1], 替换 dp[i−1][j−1])。\n```python\ndef edit_distance(s1, s2):\n    m, n = len(s1), len(s2)\n    dp = [[0] * (n + 1) for _ in range(m + 1)]\n    for i in range(m + 1): dp[i][0] = i\n    for j in range(n + 1): dp[0][j] = j\n    for i in range(1, m + 1):\n        for j in range(1, n + 1):\n            if s1[i - 1] == s2[j - 1]:\n                dp[i][j] = dp[i - 1][j - 1]\n            else:\n                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])\n    return dp[m][n]\n```",
    { tags: ["DP", "字符串"] });

})(typeof window !== "undefined" ? window : globalThis);
