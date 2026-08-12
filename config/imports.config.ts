export default {
  lobstr: {
    resultsPerPage: 100,
  },
  firecrawl: {
    maxPagesPerSite: 8,
    maxTotalPages: 500,
    confirmThreshold: 50,
  },
  generation: {
    provider: "openai",
    model: "gpt-4o-mini",
    maxTokens: 1024,
  },
};
