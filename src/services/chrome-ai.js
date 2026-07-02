(function () {
  const globalObject = globalThis;

  function resolveApi(name) {
    return (
      globalObject[name] ||
      globalObject.ai?.[name.toLowerCase()] ||
      globalObject.ai?.[name] ||
      null
    );
  }

  async function getAvailability(api) {
    if (!api) {
      return "unavailable";
    }

    if (typeof api.availability === "function") {
      try {
        return await api.availability();
      } catch (error) {
        return "unavailable";
      }
    }

    return "available";
  }

  async function createSummarizer() {
    const api = resolveApi("Summarizer");
    const availability = await getAvailability(api);

    if (!api || availability === "unavailable") {
      return {
        ok: false,
        reason: "Summarizer API unavailable on this browser.",
      };
    }

    const instance = typeof api.create === "function" ? await api.create({ type: "key-points", format: "markdown", length: "short" }) : api;

    return { ok: true, instance };
  }

  async function createLanguageDetector() {
    const api = resolveApi("LanguageDetector");
    const availability = await getAvailability(api);

    if (!api || availability === "unavailable") {
      return {
        ok: false,
        reason: "Language Detector API unavailable on this browser.",
      };
    }

    const instance = typeof api.create === "function" ? await api.create() : api;
    return { ok: true, instance };
  }

  async function createTranslator(sourceLanguage, targetLanguage) {
    const api = resolveApi("Translator");
    const availability = await getAvailability(api);

    if (!api || availability === "unavailable") {
      return {
        ok: false,
        reason: "Translator API unavailable on this browser.",
      };
    }

    const instance = typeof api.create === "function" ? await api.create({ sourceLanguage, targetLanguage }) : api;

    return { ok: true, instance };
  }

  async function summarize(instance, text) {
    if (!instance) {
      throw new Error("Summarizer instance not available.");
    }

    if (typeof instance.summarize === "function") {
      return instance.summarize(text);
    }

    if (typeof instance.summarizeStreaming === "function") {
      let result = "";
      const stream = await instance.summarizeStreaming(text);
      for await (const chunk of stream) {
        result += chunk;
      }
      return result;
    }

    throw new Error("Summarizer API does not expose summarize().");
  }

  async function detect(instance, text) {
    if (!instance) {
      throw new Error("Language Detector instance not available.");
    }

    if (typeof instance.detect === "function") {
      return instance.detect(text);
    }

    throw new Error("Language Detector API does not expose detect().");
  }

  async function translate(instance, text) {
    if (!instance) {
      throw new Error("Translator instance not available.");
    }

    if (typeof instance.translate === "function") {
      return instance.translate(text);
    }

    throw new Error("Translator API does not expose translate().");
  }

  globalObject.ComSummarizerChromeAI = {
    createSummarizer,
    createLanguageDetector,
    createTranslator,
    summarize,
    detect,
    translate,
  };
})();
