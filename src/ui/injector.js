(function () {
  function ensureStylesInjected() {
    if (document.getElementById("comsummarizer-style")) {
      return;
    }

    const style = document.createElement("div");
    style.id = "comsummarizer-style";
    document.head?.appendChild(style);
  }

  function createPanel(title) {
    const panel = document.createElement("section");
    panel.className = "comsummarizer-panel";
    panel.setAttribute("aria-live", "polite");

    const header = document.createElement("div");
    header.className = "comsummarizer-panel__header";
    header.textContent = title;

    const body = document.createElement("div");
    body.className = "comsummarizer-panel__body";

    panel.append(header, body);
    return { panel, body };
  }

  function injectSummary(root, summaryText, statusText) {
    ensureStylesInjected();

    const existing = document.getElementById("comsummarizer-summary");
    if (existing) {
      existing.remove();
    }

    const { panel, body } = createPanel("ComSummarizer");
    panel.id = "comsummarizer-summary";

    const status = document.createElement("div");
    status.className = "comsummarizer-panel__status";
    status.textContent = statusText;

    const content = document.createElement("div");
    content.className = "comsummarizer-panel__content";
    content.textContent = summaryText;

    body.append(status, content);
    root.prepend(panel);
  }

  function renderError(root, message) {
    injectSummary(root, message, "Error");
  }

  function ensureCommentActions(commentElement) {
    if (commentElement.querySelector(".comsummarizer-actions")) {
      return commentElement.querySelector(".comsummarizer-actions");
    }

    const actions = document.createElement("div");
    actions.className = "comsummarizer-actions";
    commentElement.appendChild(actions);
    return actions;
  }

  function addTranslateButton(commentElement, label, onTranslate) {
    ensureStylesInjected();

    const actions = ensureCommentActions(commentElement);
    if (actions.querySelector("button.comsummarizer-translate")) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "comsummarizer-translate";
    button.textContent = label;
    button.addEventListener("click", async () => {
      button.disabled = true;
      const originalLabel = button.textContent;
      button.textContent = "...";
      try {
        await onTranslate();
      } finally {
        button.textContent = originalLabel;
        button.disabled = false;
      }
    });

    actions.appendChild(button);
  }

  function injectTranslation(commentElement, translatedText) {
    const existing = commentElement.querySelector(".comsummarizer-translation");
    if (existing) {
      existing.remove();
    }

    const block = document.createElement("div");
    block.className = "comsummarizer-translation";
    block.textContent = translatedText;
    commentElement.appendChild(block);
  }

  globalThis.ComSummarizerInjector = {
    ensureStylesInjected,
    injectSummary,
    renderError,
    addTranslateButton,
    injectTranslation,
  };
})();
