/* q-rag.js — 定制题库（RAG 与文档抽取 + 知识图谱）
 * 针对简历定制：AI 应用开发 / Agent 应用 / RAG 后端
 * 覆盖 EcoMINER 项目核心技术：文档解析、多模态图表抽取、向量检索、
 * 语义回填、Schema 校验、OBOE 本体、Neo4j 知识图谱、证据溯源。
 * 数据结构与 q-core.js 一致：{ id, cat, type, diff, q, options?, answer?, solution, tags }
 */
(function (global) {
  "use strict";
  var Q = global.INTERVIEW_QUESTIONS = global.INTERVIEW_QUESTIONS || [];

  function add(cat, type, diff, q, solution, extra) {
    var item = Object.assign({ id: "", cat: cat, type: type, diff: diff, q: q, solution: solution, tags: [] }, extra || {});
    item.id = cat + "-" + String(Q.length + 1).padStart(3, "0");
    Q.push(item);
  }

  /* ==================== RAG 与文档抽取 (rag) ==================== */

  add("rag", "short", 1,
    "简述 RAG（检索增强生成）的完整流程，并说明每一环节的作用。",
    "RAG 流程：① 离线索引：文档解析 → 清洗 → 语义切分（chunking）→ Embedding 向量化 → 写入向量库（FAISS/Chroma 等）；② 在线检索：用户 query 同样向量化 → 向量相似度检索（可加 BM25 混合检索与重排序）→ 取 top-k 相关片段；③ 生成：将检索片段拼入 prompt（附引用来源）→ LLM 生成回答。各环节作用：解析决定上游质量（乱码/表格丢失会污染检索）；切分决定语义单元完整性；向量检索负责相关性召回；重排序提升精排质量；引用来源保证可溯源、降低幻觉。",
    { tags: ["RAG", "检索", "流程"] });

  add("rag", "choice", 1,
    "对长文档做固定长度（如 512 token）切分时，最典型的质量问题是：",
    "固定长度切分会在句子/段落中间截断，破坏语义完整性——一个 chunk 里可能只有半句话，检索到的片段缺乏上下文，导致回答错误或答非所问。改进：按段落/标题/语义边界切分，带 overlap 重叠窗口，或用基于语义（如 embedding 相似度合并）的切分。",
    { options: ["A. 向量维度不一致", "B. 在语义边界处截断，破坏句子/段落完整性", "C. 无法建立索引", "D. 检索速度变慢"], answer: "B", tags: ["chunking", "切分"] });

  add("rag", "short", 2,
    "常用的文档切分策略有哪些？chunk size 如何选择？",
    "策略：① 固定长度 + overlap（简单，但易切断语义）；② 按结构切分（标题/段落/表格/代码块，Markdown/HTML 结构感知）；③ 语义切分（按 embedding 相似度把相邻句子合并成块）；④ 递归字符切分（LangChain RecursiveCharacterTextSplitter 按分隔符层级递归）。chunk size 选择权衡：太小→上下文不足、检索碎片化；太大→混入无关内容、超出 embedding 模型窗口。经验：LLM 问答 300-800 token 常见；表格/图表类可单独成块；最终用评测集（Recall@K + 端到端回答质量）调优。",
    { tags: ["chunking", "切分策略"] });

  add("rag", "short", 2,
    "为什么纯向量检索不够，需要混合检索（BM25 + 向量）？",
    "向量检索擅长语义相似（同义改写、跨语言），但对精确匹配（专有名词、编号、公式符号、缩写如 PPM/CO2、物种拉丁名）不敏感——embedding 可能把精确 token 语义稀释。BM25 是词法精确匹配，对精确术语召回强但无法理解同义语义。两者互补：混合检索（RRF 或加权融合）在召回阶段兼得精确与语义，再统一过重排序。科研文献场景专有名词多，混合检索尤为重要。",
    { tags: ["混合检索", "BM25"] });

  add("rag", "choice", 1,
    "FAISS 中 IndexFlatIP（暴力内积检索）与 HNSW（图索引）的主要区别是：",
    "IndexFlatIP 是精确检索，遍历全部向量算内积/余弦，结果精确但数据量大时慢（内存占用也高）；HNSW 是近似最近邻（ANN），用多层小世界图，检索时在图上贪心跳转，速度随数据量增长接近对数，但结果是近似的（召回率略低于 100%）。取舍：数据量小（<10 万）用精确索引；大规模用 HNSW/IVF，用 recall 指标验收近似损失。",
    { options: ["A. FlatIP 是近似检索，HNSW 是精确检索", "B. FlatIP 精确但慢，HNSW 近似但快，适合大规模", "C. 两者都只能存 128 维向量", "D. HNSW 不支持余弦相似度"], answer: "B", tags: ["FAISS", "ANN", "向量索引"] });

  add("rag", "short", 2,
    "重排序（Rerank）在 RAG 中的作用是什么？常见实现方式有哪些？",
    "第一阶段向量/混合检索只做粗召回（top-50~100），相关性排序粗糙；Rerank 用更强模型对候选精排，取 top-3~5 进 prompt。作用：提升精排质量→减少无关上下文→降低幻觉与成本。实现：① 交叉编码器（cross-encoder，如 bge-reranker）：query 与候选拼接过 Transformer 打分，精度高但慢，只能对少量候选；② LLM 排序（让 LLM 打分/排序，可解释）；③ 轻量规则（BM25 分数融合、位置加权）。流水线中 Rerank 是召回→精排的最后一环。",
    { tags: ["Rerank", "重排序", "精排"] });

  add("rag", "short", 2,
    "如何评估 RAG 系统的检索质量与端到端回答质量？",
    "检索质量：Recall@K（答案所在片段是否在前 K 个检索结果中）、Precision@K、MRR（首个相关结果的排序倒数）、NDCG。端到端：忠实度（faithfulness，回答是否基于检索片段而非幻觉）、答案相关性（answer relevance）、上下文相关性、引用准确性（引用是否真的支撑该句）。工程做法：人工标注小评测集 + LLM-as-judge 自动打分 + 黄金文档集（golden set）回归。上线后持续抽样人审。",
    { tags: ["RAG 评估", "Recall@K", "忠实度"] });

  add("rag", "short", 3,
    "RAG 常见的失败模式有哪些？分别如何缓解？",
    "① 检索不到/召回缺失：chunk 语义不完整、embedding 与领域不匹配、query 表述差→ 混合检索、Rerank、多路召回、query 改写/扩展；② 检索到但排序差：相关片段埋在长 chunk 里→ 精细切分、Rerank、MMR 去重；③ 上下文污染：top-k 太大混入无关片段→ 控制 k、相关性阈值过滤；④ 幻觉：模型忽略检索结果、编造→ 忠实度约束提示（如\"只能依据给定材料\"）、引用强制、结果校验；⑤ 检索质量本身低：文档解析乱码、表格丢失→ 修解析、图表单独抽取；⑥ 索引过期：数据更新→ 增量索引、版本化。治理思路：先定位失败在哪一环（检索/排序/生成），用评估集量化，再针对性优化。",
    { tags: ["RAG 失败", "幻觉", "排查"] });

  add("rag", "short", 2,
    "解析包含表格与图表的 PDF 时有哪些技术路线与难点？",
    "技术路线：① 文本层：PyMuPDF/pdfplumber 直接抽文本与表格（规则/坐标）；② 版面分析（layout）：检测标题/段落/表格/图区域（如 LayoutParser、PaddleOCR、VLM）；③ 表格结构化：表格检测+单元格解析（Table Transformer、VLM 提示）；④ 图表：图表区域识别→VLM 读图抽取数值/坐标轴/图例；⑤ 公式：公式识别（如 Mathpix）。难点：双栏排版阅读顺序、表格跨页/合并单元格、图表数值精度（坐标轴刻度、误差棒）、扫描件需 OCR、专有名词与单位归一化。质量要求高的场景建议\"文本抽取 + VLM 视觉校验\"双通道。",
    { tags: ["PDF 解析", "表格", "版面分析"] });

  add("rag", "short", 3,
    "如何从科研图表（坐标轴刻度、图例、Panel、误差棒）中抽取数值？给出一个多模态方案。",
    "方案：① 图表区域检测：版面分析定位 Figure 及其子图 Panel（按 (a)(b)(c) 标注切分）；② 多模态抽取：将整图（或逐 Panel）交给 VLM，提示词要求按 Panel 输出——x/y 轴标签与单位、图例条目、数据序列、数值点或区间（含误差棒上下界）；③ 结构化输出：用 Pydantic/JSON Schema 约束 VLM 输出为 {panel, series, x_value, y_value, unit, error} 列表；④ 数值校验：Schema 校验 + 规则校验（单位合法、数值范围、误差≥0），失败重试或标记待审；⑤ 语义回填：结合正文/图注上下文补全缺失的物种、实验处理等信息；⑥ 人审兜底：低置信度结果进审核队列。关键：VLM 数值精度有限（复杂刻度会读错），必须配后处理校验与人工兜底。",
    { tags: ["VLM", "图表抽取", "多模态", "Panel"] });

  add("rag", "choice", 2,
    "向量检索中，余弦相似度与内积（点积）的使用区别是：",
    "余弦相似度只衡量方向（已归一化，不受向量长度影响），适合文本语义相似度比较；内积同时受方向与长度影响，未归一化时长度大的向量得分天然高。若 embedding 已 L2 归一化，两者等价。选择：文本检索常用余弦（或归一化后内积）；对长度有意义的场景（如推荐中的偏好强度）用内积。注意 FAISS IndexFlatIP 用内积，配合归一化向量即等价余弦。",
    { options: ["A. 余弦考虑向量长度，内积只看方向", "B. 余弦只看方向（归一化后与内积等价），内积受长度影响", "C. 两者完全相同", "D. 内积不能用于文本"], answer: "B", tags: ["相似度", "余弦", "内积"] });

  add("rag", "short", 3,
    "设计一个从论文正文+图表中抽取测量记录（物种/组织/单位/数值）的流水线，并说明各阶段的输入输出。",
    "参考（EcoMINER 多阶段模式）：① 文档解析：PDF→结构化文本/图片（正文段落、表格、图表区域），输出带坐标的块；② 图表筛选：用图注/内容相关性筛选哪些图含目标测量数据（避免对所有图都跑 VLM）；③ 面板识别：切分 Figure 为 Panel，识别坐标轴/图例；④ 数值抽取：对选中 Panel 跑 VLM 抽取 {panel, series, x, y, unit, error}，Pydantic 约束输出；⑤ 语义回填：用 RAG（正文/图注检索）补全物种、组织、实验处理等上下文字段；⑥ 结果审核：Schema/规则校验 + 低置信度进人审队列，人工确认后入库。全链路统一阶段输入输出与中间产物（结构化状态+日志），失败可定位可重试。",
    { tags: ["流水线", "抽取系统", "系统设计"] });

  add("rag", "short", 2,
    "什么是\"语义回填\"？在图表数值抽取中起什么作用？",
    "图表（尤其只有坐标轴数值的图）通常不含物种名、实验处理等上下文信息，这些信息分散在正文、图注或相邻段落里。语义回填指：对已抽取的图表记录，用检索（RAG：语义切分→向量检索→召回图注/正文片段）找到相关上下文，用 LLM 把缺失字段（species、treatment、unit、组织）补全到记录中，并记录证据来源。作用：把\"孤立数值\"变成\"完整测量记录\"（Observation），是图表数据可用的关键一步；同时证据溯源要求回填字段必须能反查到原文出处。",
    { tags: ["语义回填", "RAG", "图表"] });

  add("rag", "judge", 2,
    "RAG 中 top-k 取得越大，回答质量一定越高。",
    "错。top-k 过大（如 20）会引入大量无关片段，稀释注意力、增加 token 成本，甚至把错误上下文混入导致幻觉（上下文污染）。正确做法：召回阶段取较多候选（如 50）过 Rerank，最终只给 LLM 少量高相关片段（如 3-5），并做相关性阈值过滤。",
    { answer: "错", tags: ["top-k", "上下文污染"] });

  add("rag", "short", 2,
    "RAG 与超长上下文（如 128K 窗口直接塞全文）相比，各自的优劣？什么场景必须用 RAG？",
    "超长上下文：免检索、实现简单，但 token 成本随长度线性暴涨、注意力对长文中部信息易丢失（lost in the middle）、推理延迟高、无法覆盖超出窗口的语料。RAG：成本与延迟可控、可扩展到任意规模语料、可增量更新、自带证据引用（可溯源）；缺点是依赖检索质量，检索失败就答错。必须用 RAG 的场景：语料远大于上下文窗口（如全库文献）、需要精确引用来源、数据频繁更新、需要控制单次调用成本。现在主流做法是 RAG + 长上下文结合：检索少量片段 + 长上下文兜底。",
    { tags: ["RAG vs 长上下文", "成本"] });

  /* ==================== 知识图谱与图数据 (kg) ==================== */

  add("kg", "short", 2,
    "图数据库（如 Neo4j）相比关系型数据库的优势？适合什么场景？",
    "优势：① 以节点+关系建模，多跳关系查询（如 A 论文引用了 B 图的 Panel，B 记录了物种 C）用 Cypher 一次遍历，而关系型需多次 JOIN，深度查询指数级退化；② 关系即一等公民，加边/改边灵活；③ 图算法（社区发现、路径、中心性）原生支持。适合：知识图谱、社交网络、推荐（协同过滤）、依赖分析、证据溯源等关系密集型场景。不适用的：纯事务/大宽表聚合统计（关系型更成熟）。",
    { tags: ["Neo4j", "图数据库"] });

  add("kg", "choice", 1,
    "Neo4j 使用的声明式查询语言是：",
    "Neo4j 使用 Cypher：声明式模式匹配语言，核心是 MATCH (n:Label)-[r:REL]->(m) 的 ASCII 艺术语法，类似 SQL 之于关系型。Gremlin 是 TinkerPop 的遍历式语言（也可用于 Neo4j 兼容层），SPARQL 是 RDF 三元组的查询语言（RDFLib 场景），GQL 是 ISO 新标准。",
    { options: ["A. SQL", "B. Cypher", "C. SPARQL", "D. XQuery"], answer: "B", tags: ["Cypher", "Neo4j"] });

  add("kg", "short", 2,
    "Cypher 中 MATCH 与 MERGE 的区别？分别什么场景用？",
    "MATCH：匹配已存在的模式并返回，不创建任何东西（只读/配合 CREATE 修改）。MERGE：\"匹配或创建\"——模式不存在则创建，存在则返回已有，常用于幂等写入（按唯一键 upsert）。MERGE 适合去重导入（如按论文 DOI、图 ID 作为唯一键）；但 MERGE 全模式匹配，易重复创建边，需配合 ON CREATE SET / ON MATCH SET 精确控制属性。性能上 MERGE 需要唯一约束支持。",
    { tags: ["Cypher", "MATCH", "MERGE"] });

  add("kg", "short", 3,
    "本体（Ontology）在知识图谱构建中的作用是什么？以 OBOE 为例说明 Observation/Measurement 数据模型。",
    "本体定义领域的概念、关系与约束（TBox），是知识图谱的\"模式层\"，保证不同来源数据能映射到统一结构、可推理、可互操作。OBOE（Extensible Observation Ontology）是生态学观测本体：核心模式为 Observation（一次观测）→ hasMeasurement（Measurement：数值+单位）→ 测量对象（Entity，如物种/样地）→ 上下文（Protocol/Experiment 等）。例如：对某样地 2024 年的一次土壤碳观测，Observation 关联 Entity（样地、土壤）、Property（碳含量）、Measurement（数值 12.3，单位 g/kg）。EcoMINER 用 OBOE 把抽取结果组织成 Observation/Measurement 记录，使跨文献数据可比、可溯源。",
    { tags: ["本体", "OBOE", "Observation", "知识图谱"] });

  add("kg", "short", 2,
    "实体关系抽取（NER + RE）的主流方法有哪些？",
    "① 规则/词典：正则+领域词典，精确但覆盖有限；② 序列标注（BiLSTM-CRF、BERT+CRF）做 NER，管道式再接关系分类；③ 联合抽取（Joint Model，如 CasRel、TPlinker）同时预测实体与关系，避免误差传播；④ 生成式/LLM：用 prompt 让 LLM 直接输出 (head, relation, tail) 三元组列表，配合 Pydantic 约束结构化输出，few-shot 可迁移新领域；⑤ 基于本体的约束：用 OBOE 等本体约束实体类型与关系类型，减少非法三元组。科研文献场景常用 LLM 生成 + Schema 校验 + 规则后处理。",
    { tags: ["NER", "关系抽取", "三元组"] });

  add("kg", "short", 3,
    "如何实现\"证据溯源\"——从知识图谱中的一条记录反查到原始论文与图表？",
    "思路：数据入库时保留 provenance（溯源链）。具体：① 每条 Observation/Measurement 节点带属性 evidence_id / source_paper / figure_id / panel_id / page / 段落定位；② 建立图谱关联边：Measurement -[:DERIVED_FROM]-> Panel -[:IN]-> Figure -[:IN]-> Paper，以及正文片段节点；③ 查询时从测量节点沿 DERIVED_FROM 边反查，得到论文元数据、图表定位与原始片段；④ 前端可展示\"证据链\"（论文→图表→Panel→数值→原文引用）；⑤ 回填字段同样记录其来源检索片段。关键：抽取阶段每个中间产物都携带来源锚点，图谱建模把溯源链作为一等关系。",
    { tags: ["证据溯源", "provenance", "知识图谱"] });

  add("kg", "short", 2,
    "RDF 三元组图与属性图（Labeled Property Graph）的区别？RDFLib 与 Neo4j 各自适用什么？",
    "RDF：三元组 (subject, predicate, object)，基于 URI 的开放语义网标准（W3C），支持推理（SPARQL + OWL/RDFS），跨数据集互操作强；缺点是建模冗长（n-ary 关系要用 reification）、无原生属性概念。属性图（Neo4j）：节点/关系可带属性与类型，建模直观、遍历快，支持图算法；缺点是标准化与互操作弱于 RDF。选型：数据要跨库共享/做语义推理 → RDF（RDFLib/rdflib + SPARQL）；应用内关系查询与图谱可视化 → 属性图（Neo4j）。实际系统可两者配合（RDF 做标准交换，Neo4j 做应用查询）。",
    { tags: ["RDF", "属性图", "SPARQL"] });

})(typeof window !== "undefined" ? window : globalThis);
