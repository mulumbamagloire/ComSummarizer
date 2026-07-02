(function () {
  const state = {
    running: false,
    processedComments: new Map(),
    scanTimer: null,
    observer: null,
  };

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isSupportedPage() {
    return globalThis.ComSummarizerSites.getSiteKind() !== "generic" || document.querySelector("[role='comment'], #comments, shreddit-comment");
  }

  function getUserLanguage() {
    return (navigator.languages && navigator.languages[0]) || navigator.language || "en";
  }

  function formatLanguageTag(languageTag) {
    return languageTag ? languageTag.toLowerCase().split("-")[0] : "und";
  }

  function scheduleScan() {
    clearTimeout(state.scanTimer);
    state.scanTimer = setTimeout(() => {
      void runScan();
    }, 500);
  }

  async function ensureApis() {
    const [summarizer, detector] = await Promise.all([
      globalThis.ComSummarizerChromeAI.createSummarizer(),
      globalThis.ComSummarizerChromeAI.createLanguageDetector(),
    ]);

    return { summarizer, detector };
  }

  function getCommentTextNode(comment) {
    return comment.element;
  }

  function getRelevantComments(comments, limit) {
    return comments.slice(0, limit);
  }

  async function summarizeComments(summarizer, comments) {
    const payload = comments
      .map((comment, index) => `Comment ${index + 1} (${comment.author || "unknown"}): ${comment.text}`)
      .join("\n\n");

    return globalThis.ComSummarizerChromeAI.summarize(summarizer.instance, payload);
  }

  async function detectCommentLanguage(detector, text) {
    const result = await globalThis.ComSummarizerChromeAI.detect(detector.instance, text);
    if (Array.isArray(result)) {
      return result[0]?.detectedLanguage || result[0]?.language || "und";
    }

    return result?.detectedLanguage || result?.language || result?.[0]?.language || "und";
  }

  async function translateComment(comment, commentLanguage, userLanguage) {
    const translator = await globalThis.ComSummarizerChromeAI.createTranslator(commentLanguage, userLanguage);
    if (!translator.ok) {
      throw new Error(translator.reason);
    }

    return globalThis.ComSummarizerChromeAI.translate(translator.instance, comment.text);
  }

  async function processComment(comment, userLanguage, detector) {
    const key = globalThis.ComSummarizerSites.getCommentKey(comment);
    if (state.processedComments.has(key)) {
      return;
    }

    state.processedComments.set(key, true);

    const textNode = getCommentTextNode(comment);
    const commentLanguage = formatLanguageTag(await detectCommentLanguage(detector, comment.text));
    const normalizedUserLanguage = formatLanguageTag(userLanguage);

    if (!commentLanguage || commentLanguage === "und" || commentLanguage === normalizedUserLanguage) {
      return;
    }

    globalThis.ComSummarizerInjector.addTranslateButton(textNode, "Traduire", async () => {
      try {
        const translatedText = await translateComment(comment, commentLanguage, normalizedUserLanguage);
        globalThis.ComSummarizerInjector.injectTranslation(textNode, translatedText);
      } catch (error) {
        globalThis.ComSummarizerInjector.injectTranslation(textNode, `Translation unavailable: ${error.message}`);
      }
    });
  }

  async function runScan() {
    if (state.running || !isSupportedPage()) {
      return;
    }

    state.running = true;

    try {
      const root = globalThis.ComSummarizerSites.getCommentRoot();
      const comments = globalThis.ComSummarizerSites.getComments();

      if (!comments.length) {
        if (root && !document.getElementById("comsummarizer-summary")) {
          globalThis.ComSummarizerInjector.renderError(root, "No visible comments found yet. The extension will keep watching the page.");
        }
        return;
      }

      const { summarizer, detector } = await ensureApis();
      if (!summarizer.ok) {
        globalThis.ComSummarizerInjector.renderError(root, summarizer.reason);
        return;
      }

      if (!detector.ok) {
        globalThis.ComSummarizerInjector.renderError(root, detector.reason);
        return;
      }

      const topFive = getRelevantComments(comments, 5);
      const summary = await summarizeComments(summarizer, topFive);
      globalThis.ComSummarizerInjector.injectSummary(root, summary, "Auto-summary of the 5 most relevant visible comments");

      const userLanguage = getUserLanguage();
      for (const comment of comments) {
        await processComment(comment, userLanguage, detector);
      }
    } catch (error) {
      const root = globalThis.ComSummarizerSites.getCommentRoot();
      globalThis.ComSummarizerInjector.renderError(root, `ComSummarizer error: ${error.message}`);
    } finally {
      state.running = false;
    }
  }

  function startObserver() {
    if (state.observer) {
      return;
    }

    state.observer = new MutationObserver(() => scheduleScan());
    state.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("scroll", scheduleScan, { passive: true });
    window.addEventListener("resize", scheduleScan, { passive: true });
  }

  async function boot() {
    while (!globalThis.ComSummarizerSites || !globalThis.ComSummarizerInjector || !globalThis.ComSummarizerChromeAI) {
      await delay(50);
    }

    startObserver();
    await runScan();
  }

  void boot();
})();
