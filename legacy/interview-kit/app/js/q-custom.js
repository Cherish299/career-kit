/* q-custom.js — 定制题库（场景/算法/行为）
 * 针对简历定制：场景题结合 EcoMINER 文献抽取系统的真实设计问题；
 * 算法题覆盖校招笔试高频（Python）；行为题结合实习与项目经历。
 */
(function (global) {
  "use strict";
  var Q = global.INTERVIEW_QUESTIONS = global.INTERVIEW_QUESTIONS || [];

  function add(cat, type, diff, q, solution, extra) {
    var item = Object.assign({ id: "", cat: cat, type: type, diff: diff, q: q, solution: solution, tags: [] }, extra || {});
    item.id = cat + "-" + String(Q.length + 1).padStart(3, "0");
    Q.push(item);
  }

  /* ==================== 场景与系统设计 (scene) ==================== */

  add("scene", "short", 3,
    "设计生态学文献智能抽取系统的异步处理：输入 1000 篇 PDF，如何设计任务队列、并发、失败重试与进度查询？",
    "① 任务模型：Task { id, paper_id, status(pending/parsing/extracting/auditing/done/failed), stage, progress, created_at }，状态持久化（PostgreSQL/Redis）；② 队列：上传即入队（Redis List/Stream 或消息队列），Worker 消费；按阶段分队列（解析队列→抽取队列→图谱导入队列），支持优先级（用户加急）；③ 并发：Worker 池限制并发数（按 LLM 速率配额与机器资源），每任务内阶段串行、任务间并行；④ 失败重试：阶段失败标记 + 退避重试（如 3 次），重试上限后置 failed 或 needs_review；LLM 调用失败与解析失败区分处理；⑤ 进度查询：前端轮询或 SSE 推 Task 状态与阶段进度；⑥ 幂等：同一 PDF 重复上传去重（hash），阶段可断点续跑；⑦ 限流：LLM API 速率配额用令牌桶，避免触发 429。",
    { tags: ["任务队列", "异步", "并发", "系统设计"] });

  add("scene", "short", 3,
    "抽取结果如何做质量保障？请给出审核队列 + 抽样评估方案。",
    "审核队列：每阶段产物带置信度/校验结果；抽取数值通过 Schema 与规则校验（单位、范围、误差≥0、坐标轴对齐），不通过或置信度低 → needs_review 进人工审核队列（带上下文快照：原文截图、模型输出、校验原因）；人工可确认/修正/驳回，修正结果回流入库并作为优化样本。抽样评估：定期从已入库记录随机抽样（按文献类型/图表复杂度分层），人工复核正确率（记录级、字段级、数值误差），计算：入库准确率、人审通过率、人审比例（目标 <10%）。用评估结果反哺：调提示词、换模型、加规则，逐步降低人审率；重大改动用黄金集回归。",
    { tags: ["质量保障", "审核", "评估"] });

  add("scene", "short", 2,
    "FastAPI 接口设计：上传 PDF → 任务状态 → 结果导出，如何设计 REST 接口与数据模型？",
    "接口：POST /api/papers（multipart 上传，返回 paper_id + task_id）；GET /api/tasks/{task_id}（返回状态/阶段/进度/错误信息）；GET /api/papers/{paper_id}/records（分页返回抽取的测量记录）；GET /api/papers/{paper_id}/export?format=csv|json（导出）；POST /api/tasks/{task_id}/retry（失败重试）；审核相关：GET /api/reviews?status=pending、POST /api/reviews/{id}（确认/修正）。数据模型：Paper{id, filename, status, created_at}、Task{id, paper_id, stage, status, error, progress}、Measurement{id, paper_id, panel_id, species, property, value, unit, error, confidence, source_ref, status(pending/approved/rejected)}。要点：统一响应格式、错误码与幂等（上传去重）、分页与大文件导出用流式、任务状态机清晰。",
    { tags: ["FastAPI", "REST", "接口设计"] });

  add("scene", "short", 3,
    "论文图表数值抽取准确率低，如何系统性提升？（模型、提示、后处理、兜底）",
    "① 数据侧：提升图表区域检测与 Panel 切分准确率（版面分析调优），保证送入 VLM 的图像清晰完整；② 模型侧：选更擅长图表理解的 VLM（多模态能力对比评测），必要时微调领域模型；③ 提示侧：few-shot 给正确抽取示例（含坐标轴刻度读数、图例对应关系），要求逐项输出 x/y 值、单位、误差棒上下界；④ 结构约束：Pydantic Schema 约束输出，数值字段限定类型与范围；⑤ 后处理：规则校验（单位合法、数值在坐标轴范围内、误差≥0）、坐标轴刻度对齐校验、与正文/图注交叉验证（语义回填一致性）；⑥ 置信度与兜底：低置信度/校验失败进人工审核，不硬凑结果；⑦ 评测驱动：建图表黄金集，量化各方案准确率与误差，迭代优化；⑧ 成本权衡：高难图表才走 VLM，简单图表走规则，控制调用成本。",
    { tags: ["图表抽取", "VLM", "准确率", "优化"] });

  add("scene", "short", 2,
    "RAG 中向量库（FAISS/Chroma）与图数据库（Neo4j）如何配合使用？",
    "两者解决不同问题：向量库做\"语义相似检索\"——按内容相关性召回证据片段（哪篇论文/哪个图注讲了某物种的某指标）；图数据库做\"关系查询与溯源\"——沿实体关系多跳查询（该数值来自哪个论文的哪个 Panel，该论文还测了哪些指标）。配合模式：① RAG 召回证据 → 记录携带图谱实体 ID → 用图谱补全上下文（关联的物种、实验处理、同级测量）；② 图谱查询结果转文本注入 RAG prompt（graph RAG：把子图序列化为自然语言片段参与检索）；③ 入库时同时写向量索引与图谱，查询时先向量粗召回再图谱精化；④ 证据溯源走图谱边（DERIVED_FROM），内容检索走向量。",
    { tags: ["FAISS", "Neo4j", "graph RAG"] });

  add("scene", "short", 2,
    "LLM 输出不稳定，你的系统如何做测试？（pytest 覆盖哪些层？）",
    "分层测试：① 单元测试：纯函数（Schema 校验、规范化、单位换算、规则后处理）用确定性输入输出断言；② 契约测试：Pydantic 模型与 LLM 输出模板的 Schema 一致性；③ 集成测试：FastAPI 路由（上传→任务→结果）用 TestClient + mock LLM（固定返回）跑通全链路；④ LLM 层：mock/录制真实响应（黄金样例集）做回归——不每次真调 API（成本与不稳定）；⑤ 快照测试：解析结果与预期 JSON 对比；⑥ 模糊/边界：异常 PDF、空表、扫描件、超大文件；⑦ 冒烟：端到端跑 1-2 篇真实论文验证流程。LLM 输出不稳定 → 用\"mock 稳定 + 黄金集回归 + 随机种子/温度 0\"保证测试可复现；真实验证放定期人工抽查。",
    { tags: ["pytest", "测试", "LLM", "mock"] });

  add("scene", "short", 3,
    "如果系统要支持每天新增 500 篇论文入库并保持查询时效，架构上怎么演进？",
    "① 入库侧：流水线横向扩容（Worker 池按队列长度弹性伸缩），LLM 调用走异步批量 + 速率限制，解析/嵌入并行化；存储分库（任务表、记录表按时间分区）；② 索引侧：增量索引（论文入库即增量 embedding + 图谱写入，不重建全量）；向量库分片（按领域/时间分 collection），冷热分层（热数据在内存索引，冷数据走磁盘）；③ 查询侧：检索加缓存（热 query 结果缓存），Rerank 轻量化（小模型/级联），图谱查询加索引（节点属性索引、关系类型索引）；④ 治理：任务监控告警（队列积压、失败率）、数据质量看板、容量规划；⑤ 架构模式：事件驱动（论文入库发事件，下游消费）、微服务按阶段拆分（解析/抽取/图谱独立部署），故障隔离。核心：入库与查询解耦、增量优先、缓存与分层、可观测。",
    { tags: ["架构演进", "扩容", "增量索引"] });

  add("scene", "choice", 2,
    "多阶段 LLM 流水线中，某一阶段偶发超时（如 VLM 抽取 60s 未返回），最合理的处理是：",
    "偶发超时应走\"有限重试 + 超时降级 + 状态记录\"：瞬时超时指数退避重试（1-2 次），仍失败则标记阶段 failed/needs_review 让任务进入可恢复状态（用户可重试或走人工兜底），同时记录超时上下文便于排查。静默等待会让整个任务挂死；直接放弃会丢数据；无限重试会放大成本。",
    { options: ["A. 无限等待直到返回", "B. 直接放弃该任务并报错", "C. 有限重试 + 超时降级 + 状态可恢复（标记待重试/待审）", "D. 跳过该阶段继续后续阶段"], answer: "C", tags: ["超时", "重试", "流水线"] });

  /* ==================== 算法与手撕代码 (code) ==================== */

  add("code", "code", 1,
    "两数之和：给定整数数组 nums 和目标值 target，返回和为 target 的两个数的下标。假设每种输入只有一个答案。",
    "思路：一遍遍历，用哈希表记录\"值→下标\"，对每个数查 target−x 是否已出现。时间复杂度 O(n)，空间 O(n)。\n```python\ndef two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], i]\n        seen[x] = i\n    return []\n```",
    { tags: ["哈希表", "数组"] });

  add("code", "code", 2,
    "最长无重复字符子串：给定字符串 s，找出不含重复字符的最长子串的长度。",
    "思路：滑动窗口 + 哈希集合。右指针扩展，遇重复字符则左指针右移收缩窗口，维护窗口内字符集合与最大长度。时间复杂度 O(n)。\n```python\ndef length_of_longest_substring(s):\n    window = set()\n    left = ans = 0\n    for right, ch in enumerate(s):\n        while ch in window:\n            window.remove(s[left])\n            left += 1\n        window.add(ch)\n        ans = max(ans, right - left + 1)\n    return ans\n```",
    { tags: ["滑动窗口", "哈希表"] });

  add("code", "code", 2,
    "合并两个有序链表：将两个升序链表合并为一个新的升序链表并返回。",
    "思路：双指针归并 + 哑节点。谁小接谁，一个链表空了接另一条剩余。时间复杂度 O(n+m)。\n```python\ndef merge_two_lists(l1, l2):\n    dummy = cur = ListNode(0)\n    while l1 and l2:\n        if l1.val <= l2.val:\n            cur.next, l1 = l1, l1.next\n        else:\n            cur.next, l2 = l2, l2.next\n        cur = cur.next\n    cur.next = l1 or l2\n    return dummy.next\n```",
    { tags: ["链表", "双指针"] });

  add("code", "code", 2,
    "寻找旋转排序数组中的最小值：数组 [4,5,6,7,0,1,2] 是升序数组旋转得到的，返回最小值。",
    "思路：二分。旋转数组由两段升序组成，最小值在\"第二段起点\"。比较 mid 与 right：若 nums[mid] > nums[right]，说明最小值在右半段（mid 左移）；否则在左半段含 mid。时间复杂度 O(log n)。\n```python\ndef find_min(nums):\n    left, right = 0, len(nums) - 1\n    while left < right:\n        mid = (left + right) // 2\n        if nums[mid] > nums[right]:\n            left = mid + 1\n        else:\n            right = mid\n    return nums[left]\n```",
    { tags: ["二分查找", "数组"] });

  add("code", "code", 2,
    "二叉树的层序遍历：按层返回二叉树的节点值列表（每层一个列表）。",
    "思路：BFS 队列，记录每层节点数，逐层收集。时间复杂度 O(n)。\n```python\nfrom collections import deque\n\ndef level_order(root):\n    if not root:\n        return []\n    res, q = [], deque([root])\n    while q:\n        level, size = [], len(q)\n        for _ in range(size):\n            node = q.popleft()\n            level.append(node.val)\n            if node.left: q.append(node.left)\n            if node.right: q.append(node.right)\n        res.append(level)\n    return res\n```",
    { tags: ["二叉树", "BFS"] });

  add("code", "code", 3,
    "前 K 个高频元素：给定整数数组，返回出现频率前 K 高的元素（k 保证合法，答案唯一）。",
    "思路：Counter 统计频率后，用小顶堆维护前 K 个最大频率（堆大小为 K，频率比堆顶大就替换），最后堆内即答案。时间 O(n log k)，空间 O(n)。\n```python\nimport heapq\nfrom collections import Counter\n\ndef top_k_frequent(nums, k):\n    cnt = Counter(nums)\n    heap = []\n    for num, freq in cnt.items():\n        if len(heap) < k:\n            heapq.heappush(heap, (freq, num))\n        elif freq > heap[0][0]:\n            heapq.heapreplace(heap, (freq, num))\n    return [num for _, num in heap]\n```",
    { tags: ["堆", "哈希表", "TopK"] });

  /* ==================== 项目与行为面试 (behavior) ==================== */

  add("behavior", "short", 1,
    "请介绍你的 EcoMINER 项目：背景、你的角色、技术难点与最终成果。",
    "参考回答框架（结合自身经历组织）：背景——生态学论文数据分散在正文、图表与补充材料，人工提取费时且难以跨文献整合，需要一套自动化抽取系统；我的角色——核心开发，负责抽取链路整体设计与实现；技术方案——多阶段工作流（文档解析→图表筛选→Panel 识别→数值抽取→语义回填→结果审核），LLM/VLM 多模态抽取 + Pydantic 结构化输出，RAG 语义回填 + OBOE 本体映射 + Neo4j 知识图谱 + 证据溯源；难点——图表数值精度、模型输出不可靠（用 Schema 校验+重试+审核队列解决）、跨文献数据契约统一；成果——从 PDF 到结构化测量记录与知识图谱的一体化流程，接口化可复用。回答时突出量化（抽取准确率、吞吐、人审比例下降等）。",
    { tags: ["项目介绍", "EcoMINER"] });

  add("behavior", "short", 2,
    "实习/项目中，模型输出不稳定导致下游报错或数据错误，你是怎么定位和解决的？",
    "参考框架：问题现象（抽取字段为空/格式错乱/数值异常）；定位手段——全链路结构化日志与中间产物快照，按任务 ID 回放各阶段输入输出，确定是模型输出问题还是下游解析问题；根因——LLM 输出偏离 Schema、VLM 对复杂图表读数不准、上下文缺失；解决——① 输出侧：Pydantic Schema 校验 + 失败重试（换温度/提示）+ 规则后处理（单位/范围校验）；② 输入侧：few-shot 示例、图表图像预处理；③ 兜底：低置信度进人工审核队列，不硬凑数据；④ 预防：建立黄金样例回归集，改动前跑回归。体现\"可观测 → 定位 → 修复 → 预防\"的工程闭环。",
    { tags: ["问题排查", "模型不稳定"] });

  add("behavior", "short", 2,
    "同时负责解析、抽取、图谱导入多个模块，你如何管理优先级与进度？",
    "参考框架：① 目标对齐：先明确整体交付目标与里程碑（先跑通最小闭环，再优化质量）；② 依赖排序：按流水线依赖排（解析是抽取的前置，先打通上游再下游），关键路径优先；③ 拆分与并行：模块间按契约解耦，可并行开发；④ 节奏：每周设定可验收的小目标（如\"本周图表抽取跑通 50 篇\"），用任务看板跟踪；⑤ 风险前置：对高风险点（VLM 精度）先做小规模验证再全量投入；⑥ 沟通：与导师/同事同步进度与阻塞，必要时调整范围；⑦ 沉淀：阶段性复盘，把踩坑固化为文档与测试。",
    { tags: ["项目管理", "优先级"] });

})(typeof window !== "undefined" ? window : globalThis);
