export function buildToolMap(tools: Array<{ name: string }>) {
  const toolMap: Record<string, (typeof tools)[number]> = {};

  tools.forEach((tool) => {
    const shortName = tool.name.replace(/^mcp__local_mcp__/, "");
    toolMap[shortName] = tool;
  });

  return toolMap;
}

export const jsonParser = async (content: string) => {
  let parsed;

  try {
    const cleaned = content
      .replace(/^```json/, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim();
    parsed = await JSON.parse(cleaned);
  } catch (error) {
    console.error("JSON parse error:", error);
  }
  return parsed;
};


export function parseLLMResponse(raw: string) {
  try {
    // Step 1: Normalize escape characters (handles \n, \", etc.)
    const decoded = raw
      .replace(/^```json/, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim();

    // Step 2: Unescape JSON if needed
    const cleaned = JSON.parse(decoded); // Handles double-escaped JSON strings

    // Step 3: Validate minimal shape
    if (
      typeof cleaned.done === "boolean" &&
      typeof cleaned.message === "string" &&
      typeof cleaned.paymentInformation === "object"
    ) {
      return cleaned;
    } else {
      throw new Error("Invalid structure");
    }
  } catch (err) {
    console.error("Failed to parse LLM response:", err, "\nRaw input:", raw);
    return {
      done: false,
      message: "Invalid response format.",
      paymentInformation: {},
    };
  }
}

export function normalizeToYYYYMMDD(dateStr: string): string {
  const yyyymmddRegex = /^\d{8}$/;
  if (yyyymmddRegex.test(dateStr)) {
    return dateStr;
  }

  const parsedDate = new Date(dateStr);
  if (isNaN(parsedDate.getTime())) {
    throw new Error("Invalid date format: " + dateStr);
  }

  const yyyy = parsedDate.getFullYear();
  const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const dd = String(parsedDate.getDate()).padStart(2, '0');

  return `${yyyy}${mm}${dd}`;
}

export function titleSanitizer (title:string): string {  
  return (title.trim().replace(/\./g, '').toUpperCase())
}
