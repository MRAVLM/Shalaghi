import snippetData from "../../snippets/faster.json";

export interface PromptSnippet {
  id: string;
  title: string;
  text: string;
}

function isValidSnippet(item: unknown): item is PromptSnippet {
  if (typeof item !== "object" || item === null) {
    return false;
  }
  const record = item as Record<string, unknown>;
  return (
    typeof record["id"] === "string" &&
    record["id"].length > 0 &&
    typeof record["title"] === "string" &&
    record["title"].length > 0 &&
    typeof record["text"] === "string" &&
    record["text"].length > 0
  );
}

// Single source of truth for V1 snippets; PRD §5 lists the exact approved texts.
export function loadSnippets(): PromptSnippet[] {
  const data: unknown = snippetData;
  if (!Array.isArray(data) || !data.every(isValidSnippet)) {
    throw new Error("snippets/faster.json is malformed");
  }
  return data;
}
