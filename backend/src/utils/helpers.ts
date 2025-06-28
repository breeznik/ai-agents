export function buildToolMap(tools: Array<{ name: string }>) {
  const toolMap: Record<string, (typeof tools)[number]> = {};

  tools.forEach((tool) => {
    const shortName = tool.name.replace(/^mcp__mcp_local__/, "");
    toolMap[shortName] = tool;
  });

  return toolMap;
}

export const jsonParser = async (content:string) => {
  let parsed;
    try {
    parsed = await JSON.parse(content);
  } catch (error) {
    console.error("JSON parse error:", error);
  }
  return parsed;
};
