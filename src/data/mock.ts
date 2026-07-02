export type Employee = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  jobDescription: string;
  level: string;
  score: number;
  profileCompletion: number;
  assessmentStatus: "已完成" | "未评估" | "进行中";
  lastAssessment: string;
  productAbility: string;
  technicalAbility: string;
  projectExperience: string;
  summary: string;
  explanation: string;
  tags: string[];
};

export const employees: Employee[] = [
  {
    id: "E-1001",
    name: "张岚",
    phone: "13800001001",
    email: "zhanglan@example.com",
    role: "产品经理",
    jobDescription: "负责企业效率工具和 AI 办公场景规划，推进跨部门需求梳理与落地验收。",
    level: "P7",
    score: 88,
    profileCompletion: 96,
    assessmentStatus: "已完成",
    lastAssessment: "2026-06-28",
    productAbility: "熟练使用 Codex、DeepSeek、飞书智能伙伴进行文档生成、数据整理、流程梳理和原型评审。",
    technicalAbility: "了解 RAG、Prompt Engineering、Agent 工作流，能与研发共同拆解数据查询型助手方案。",
    projectExperience: "主导销售知识库问答助手，从 FAQ、制度文档和项目资料中构建检索问答流程，覆盖售前资料查询与方案初稿生成。",
    summary: "产品应用能力强，能将 AI 能力映射到业务流程，适合担任 AI 办公提效项目负责人。",
    explanation: "具备稳定的 AI 产品使用习惯，能独立完成任务拆解、提示词设计和交付验收。技术深度不以工程实现为主，但对 RAG 和数据查询助手有清晰理解。",
    tags: ["Codex", "RAG", "办公提效", "产品设计"],
  },
  {
    id: "E-1002",
    name: "陈旭",
    phone: "13800001002",
    email: "chenxu@example.com",
    role: "数据工程师",
    jobDescription: "负责经营数据建模、数据服务接口和指标平台建设，支持业务分析和自动化报表。",
    level: "P6",
    score: 91,
    profileCompletion: 92,
    assessmentStatus: "已完成",
    lastAssessment: "2026-06-29",
    productAbility: "熟练使用 ChatGPT、DeepSeek、Cursor 辅助 SQL 分析、Python 脚本编写和数据质量排查。",
    technicalAbility: "熟悉 Python、Postgres、LangChain、向量检索和数据处理流水线，能实现基础 RAG 应用。",
    projectExperience: "建设经营分析助手，将 BI 指标口径、数据字典和历史分析报告接入向量检索，支持自然语言查询指标解释与 SQL 草稿生成。",
    summary: "技术实现能力和数据场景理解较强，适合承担数据查询助手、指标问答和 RAG 后端实现。",
    explanation: "在数据处理和 AI 工程结合方面表现突出，能把业务问题转换成可执行的数据任务。需要继续加强模型评估、权限控制和复杂 Agent 编排能力。",
    tags: ["Python", "Postgres", "LangChain", "数据查询"],
  },
  {
    id: "E-1003",
    name: "李曼",
    phone: "13800001003",
    email: "liman@example.com",
    role: "运营专员",
    jobDescription: "负责活动运营、用户触达和内容素材管理，维护日常运营数据和复盘材料。",
    level: "P5",
    score: 78,
    profileCompletion: 84,
    assessmentStatus: "已完成",
    lastAssessment: "2026-06-20",
    productAbility: "能够使用 Kimi、通义千问、飞书多维表格 AI 进行内容生成、活动复盘和表格分类。",
    technicalAbility: "掌握基础自动化表格公式和轻量脚本概念，暂不具备独立开发 AI 系统能力。",
    projectExperience: "参与运营素材智能分类项目，整理标签体系和样本数据，配合算法同事验证生成内容质量。",
    summary: "AI 产品应用基础扎实，适合运营提效、内容生产和数据整理类任务。",
    explanation: "能在明确任务边界下使用 AI 工具提升效率，但技术实现和复杂业务抽象能力仍处于成长阶段。",
    tags: ["内容生成", "运营提效", "表格自动化"],
  },
  {
    id: "E-1004",
    name: "周启",
    phone: "13800001004",
    email: "zhouqi@example.com",
    role: "算法工程师",
    jobDescription: "负责视觉检测、模型训练和边缘端推理优化，支持制造质量场景智能化升级。",
    level: "P8",
    score: 96,
    profileCompletion: 98,
    assessmentStatus: "已完成",
    lastAssessment: "2026-06-30",
    productAbility: "熟练使用 Codex、Claude、Weights & Biases、Label Studio 辅助模型开发、实验管理和代码审查。",
    technicalAbility: "熟悉 Python、PyTorch、强化学习、视觉模型、边缘推理、LangChain 和模型服务化部署。",
    projectExperience: "2025 年采用 IoT 技术和强化学习搭建质量视觉分析助手，在端侧完成瑕疵识别和工艺参数优化建议输出。",
    summary: "AI 技术深度和项目经验均突出，适合复杂 AI 项目技术负责人或专家顾问。",
    explanation: "具备从算法验证到工程落地的完整能力，对业务场景、模型迭代和端侧部署均有实践。建议参与企业级 AI 能力标准建设。",
    tags: ["PyTorch", "强化学习", "视觉检测", "边缘推理"],
  },
  {
    id: "E-1005",
    name: "王越",
    phone: "13800001005",
    email: "wangyue@example.com",
    role: "销售经理",
    jobDescription: "负责重点客户拓展、方案沟通和商机推进，沉淀行业客户需求和竞品信息。",
    level: "P6",
    score: 0,
    profileCompletion: 58,
    assessmentStatus: "未评估",
    lastAssessment: "-",
    productAbility: "使用 AI 工具生成拜访纪要和客户邮件，正在尝试用知识库辅助售前问答。",
    technicalAbility: "暂无技术栈开发经验。",
    projectExperience: "参与行业方案资料库整理，提供客户常见问题和场景样本。",
    summary: "尚未完成 AI 自评估，档案信息需要补充。",
    explanation: "暂无有效评估结果。",
    tags: ["销售赋能", "客户纪要"],
  },
];

export const scoreBands = [
  { label: "0-59 基础薄弱", count: 4, value: 16, tone: "orange" as const },
  { label: "60-74 入门应用", count: 6, value: 24, tone: "cyan" as const },
  { label: "75-84 熟练应用", count: 9, value: 36, tone: "blue" as const },
  { label: "85-94 复合能力", count: 5, value: 20, tone: "green" as const },
  { label: "95-100 高潜专家", count: 1, value: 4, tone: "green" as const },
];

export const keywordStats = [
  { label: "Python", value: 68 },
  { label: "Codex", value: 62 },
  { label: "RAG", value: 54 },
  { label: "数据处理", value: 49 },
  { label: "视觉检测", value: 31 },
];

export const assessmentMessages = [
  { by: "ai", text: "第 1 轮：请描述你最近一次使用 AI 工具完成工作的场景，包括目标、工具和结果。" },
  { by: "user", text: "我使用 Codex 辅助整理需求说明，将会议纪要拆成页面清单和验收标准。" },
  { by: "ai", text: "第 2 轮：如果让你为一个业务流程设计 AI 助手，你会如何拆解数据、权限和评估指标？" },
  { by: "user", text: "我会先梳理数据源和用户角色，再定义可回答问题边界，最后用命中率和人工复核通过率评估。" },
];
