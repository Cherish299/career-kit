const DEFAULT_KEYWORDS = [
  "ai",
  "人工智能",
  "机器学习",
  "深度学习",
  "大模型",
  "llm",
  "rag",
  "agent",
  "算法",
  "后端",
  "backend",
  "python",
  "nlp",
  "数据",
  "知识图谱",
];

export function getKeywordConfig(value) {
  if (!value || !String(value).trim()) return DEFAULT_KEYWORDS;
  return String(value)
    .split(/[,，;；\n]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function filterJobs(rows, keywords = DEFAULT_KEYWORDS) {
  const normalizedKeywords = keywords.map((item) => item.toLowerCase());
  return rows.filter((row) => {
    const haystack = [row.title, row.description, row.requirements, row.company_name, row.location]
      .filter(Boolean)
      .join("\n")
      .toLowerCase();
    return normalizedKeywords.some((keyword) => haystack.includes(keyword));
  });
}

export { DEFAULT_KEYWORDS };
