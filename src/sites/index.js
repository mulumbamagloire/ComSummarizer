(function () {
  function normalizeWhitespace(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function getSiteKind() {
    const hostname = location.hostname.replace(/^www\./, "");

    if (hostname.includes("youtube.com")) {
      return "youtube";
    }

    if (hostname.includes("reddit.com")) {
      return "reddit";
    }

    return "generic";
  }

  function extractText(element) {
    return normalizeWhitespace(element?.innerText || element?.textContent || "");
  }

  function collectVisibleCommentElements(elements) {
    return Array.from(elements)
      .map((element) => ({
        element,
        text: extractText(element),
      }))
      .filter((item) => item.text.length > 10);
  }

  function scoreComment(item) {
    const likeText = item.element.querySelector?.("#vote-count-middle, [aria-label*='like'], [aria-label*='upvote']")?.textContent || "";
    const likes = Number.parseInt(likeText.replace(/[^0-9]/g, ""), 10) || 0;
    return item.text.length + likes * 40;
  }

  function getCommentRoot() {
    return (
      document.querySelector("#comments") ||
      document.querySelector("ytd-comments#comments") ||
      document.querySelector("shreddit-comments-page") ||
      document.querySelector("main") ||
      document.body
    );
  }

  function getYouTubeComments() {
    const selectors = [
      "ytd-comment-thread-renderer #content-text",
      "ytd-comment-renderer #content-text",
      "#content-text"
    ];

    const candidates = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
    const items = collectVisibleCommentElements(candidates);

    return items.map((item) => ({
      site: "youtube",
      text: item.text,
      author: extractText(item.element.closest("ytd-comment-thread-renderer, ytd-comment-renderer")?.querySelector("#author-text")),
      element: item.element.closest("ytd-comment-thread-renderer, ytd-comment-renderer") || item.element,
      score: scoreComment(item),
    }));
  }

  function getRedditComments() {
    const selectors = [
      "shreddit-comment",
      "[data-testid='comment']",
      "div[data-testid='comment']",
      "div[role='comment']"
    ];

    const candidates = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
    const items = collectVisibleCommentElements(candidates);

    return items.map((item) => ({
      site: "reddit",
      text: item.text,
      author: extractText(item.element.querySelector("[data-testid='comment-author-link'], a[href*='/user/'], a[href*='/u/']")),
      element: item.element,
      score: scoreComment(item),
    }));
  }

  function getGenericComments() {
    const jsonLdComments = Array.from(document.querySelectorAll("script[type='application/ld+json']"))
      .flatMap((script) => {
        try {
          const payload = JSON.parse(script.textContent || "{}");
          const nodes = Array.isArray(payload) ? payload : [payload];
          return nodes.flatMap((node) => {
            if (node?.comment) {
              return [{ text: normalizeWhitespace(typeof node.comment === "string" ? node.comment : node.comment.text || ""), element: script }];
            }

            return [];
          });
        } catch {
          return [];
        }
      });

    const ariaCandidates = Array.from(document.querySelectorAll("[role='comment'], [aria-label*='comment' i], [data-comment-id], [id*='comment' i], [class*='comment' i]"));
    const structuralCandidates = ariaCandidates.length > 0 ? ariaCandidates : Array.from(document.querySelectorAll("article, section, li, div"))
      .filter((element) => {
        const text = extractText(element);
        return text.length > 30 && text.length < 1500 && element.children.length < 12;
      });

    const candidates = [...jsonLdComments, ...collectVisibleCommentElements(ariaCandidates), ...collectVisibleCommentElements(structuralCandidates)];
    const seen = new Set();

    return candidates
      .map((item) => ({
        site: "generic",
        text: item.text,
        author: extractText(item.element?.querySelector?.("[itemprop='author'], [class*='author' i], [data-testid*='author' i]")),
        element: item.element,
        score: item.text.length,
      }))
      .filter((item) => item.text && !seen.has(item.text) && seen.add(item.text));
  }

  function getComments() {
    const site = getSiteKind();
    const comments = site === "youtube" ? getYouTubeComments() : site === "reddit" ? getRedditComments() : getGenericComments();

    return comments
      .filter((item) => item.text && item.element)
      .sort((left, right) => right.score - left.score);
  }

  function getCommentKey(comment) {
    return `${comment.site}:${comment.text.slice(0, 160)}`;
  }

  globalThis.ComSummarizerSites = {
    getSiteKind,
    getCommentRoot,
    getComments,
    getCommentKey,
  };
})();
