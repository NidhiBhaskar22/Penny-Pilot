const LLM_PROVIDER = (process.env.LLM_PROVIDER || "groq").toLowerCase();

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const GROQ_BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b";

function buildPrompt(summary) {
  const payload = {
    label: summary?.label || "",
    totals: {
      income: Number(summary?.totalIncome || 0),
      expense: Number(summary?.totalExpense || 0),
      investment: Number(summary?.totalInvestment || 0),
      balance: Number(summary?.balances?.current || 0),
    },
    spendAnomalies: summary?.insights?.spendAnomalies?.topAnomalies || [],
    incomeStability: {
      stabilityScore: Number(summary?.insights?.incomeStability?.stabilityScore || 0),
      average: Number(summary?.insights?.incomeStability?.average || 0),
      topSource: summary?.insights?.incomeStability?.topSource || null,
    },
    investmentHealth: {
      totalInvested: Number(summary?.insights?.investmentHealth?.totalInvested || 0),
      concentration: summary?.insights?.investmentHealth?.concentration || null,
      topHoldings: summary?.insights?.investmentHealth?.concentration?.topHoldings || [],
    },
    analysis: {
      spending: {
        topCategories: summary?.analysis?.spending?.topCategories || [],
        habits: summary?.analysis?.spending?.habits || null,
        limitViolations: summary?.analysis?.spending?.limitViolations || [],
        topPurchases: summary?.analysis?.spending?.topPurchases || [],
      },
      investment: {
        portfolio: summary?.analysis?.investment?.portfolio || null,
        bestPerformers: summary?.analysis?.investment?.bestPerformers || [],
        worstPerformers: summary?.analysis?.investment?.worstPerformers || [],
      },
      netWorth: summary?.analysis?.netWorth || null,
    },
    riskForecast: {
      confidence: summary?.insights?.riskForecast?.confidence || "low",
      projection: summary?.insights?.riskForecast?.monthEndProjection || null,
      riskSignals: summary?.insights?.riskForecast?.riskSignals || null,
      runway: summary?.insights?.riskForecast?.savingsRunway || null,
    },
  };

  return `
You are a personal finance analysis assistant for an Indian user.
Use only the provided structured data.
Do not invent values.
Do not provide regulated investment advice.
Respond only as valid JSON with this exact shape:
{
  "summary": "string",
  "incomeInsight": "string",
  "expenseInsight": "string",
  "investmentInsight": "string",
  "riskInsight": "string",
  "actions": ["string", "string", "string"]
}

Keep each string concise and practical. Focus on Indian personal finance context.

Data:
${JSON.stringify(payload)}
`.trim();
}

function safeParseInsight(content) {
  try {
    return JSON.parse(content);
  } catch (_) {
    return {
      summary: content,
      incomeInsight: "",
      expenseInsight: "",
      investmentInsight: "",
      riskInsight: "",
      actions: [],
    };
  }
}

async function generateWithOllama(summary) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: buildPrompt(summary),
      stream: false,
      format: "json",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Ollama request failed: ${response.status} ${text}`);
    error.statusCode = response.status;
    throw error;
  }

  const data = await response.json();
  return safeParseInsight(data?.response || "");
}

async function generateWithOpenAI(summary) {
  if (!OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: buildPrompt(summary),
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`OpenAI request failed: ${response.status} ${text}`);
    error.statusCode = response.status;
    throw error;
  }

  const data = await response.json();
  const content =
    data?.output_text ||
    data?.output?.[0]?.content?.find((item) => item.type === "output_text")?.text ||
    "";

  return safeParseInsight(content);
}

async function generateWithGroq(summary) {
  if (!GROQ_API_KEY) {
    const error = new Error("GROQ_API_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a personal finance analysis assistant for an Indian user. Use only the provided structured data. Do not invent values. Respond only with valid JSON.",
        },
        {
          role: "user",
          content: buildPrompt(summary),
        },
      ],
      response_format: {
        type: "json_object",
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Groq request failed: ${response.status} ${text}`);
    error.statusCode = response.status;
    throw error;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  return safeParseInsight(content);
}

async function generateSummary(summary) {
  if (LLM_PROVIDER === "ollama") {
    return generateWithOllama(summary);
  }
  if (LLM_PROVIDER === "groq") {
    return generateWithGroq(summary);
  }
  return generateWithOpenAI(summary);
}

module.exports = {
  generateSummary,
};
