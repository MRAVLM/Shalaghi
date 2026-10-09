import { copyText } from "../api/clipboard";
import { showToast } from "../ui/toast";
import type { PromptSnippet } from "./snippetStore";

export function renderSnippetList(
  snippets: PromptSnippet[],
  onCopied: (snippet: PromptSnippet) => void,
): HTMLElement {
  const list = document.createElement("div");
  list.className = "snippet-list";

  for (const snippet of snippets) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "snippet-item";
    button.title = "Click to copy";

    const title = document.createElement("strong");
    title.textContent = snippet.title;
    const preview = document.createElement("span");
    preview.textContent = snippet.text;
    button.append(title, preview);

    button.addEventListener("click", () => {
      void copyText(snippet.text)
        .then(() => {
          showToast(`Copied: ${snippet.title}`);
          onCopied(snippet);
        })
        .catch(() => {
          showToast("Copy failed — clipboard denied", true);
        });
    });
    list.append(button);
  }
  return list;
}
