import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdaptiveLlmModel } from "../../src/model/adaptive_model.js";
import { resolveLlmModel } from "../../src/model/registry.js";

vi.mock("../../src/model/registry.js");

describe("AdaptiveLlmModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use main model on success", async () => {
    const mockMainModel = {
      run: vi.fn().mockImplementation(async function* () {
        yield { text: "hello" };
      }),
    };
    const MockMainClass = vi.fn().mockImplementation(function () {
      return mockMainModel;
    });

    vi.mocked(resolveLlmModel).mockReturnValue(MockMainClass as any);

    const model = new AdaptiveLlmModel({
      main: { modelName: "main-model", apiKey: "key" },
    });

    const generator = model.run({ prompt: "test" } as any);
    const results = [];
    for await (const res of generator) {
      results.push(res);
    }

    expect(results).toEqual([{ text: "hello" }]);
    expect(mockMainModel.run).toHaveBeenCalled();
  });

  it("should fallback to next model on failure", async () => {
    const mockMainModel = {
      run: vi.fn().mockImplementation(async function* () {
        throw new Error("Main model failed");
      }),
    };
    const mockFallbackModel = {
      run: vi.fn().mockImplementation(async function* () {
        yield { text: "fallback success" };
      }),
    };

    const MockMainClass = vi.fn().mockImplementation(function () {
      return mockMainModel;
    });
    const MockFallbackClass = vi.fn().mockImplementation(function () {
      return mockFallbackModel;
    });

    vi.mocked(resolveLlmModel).mockImplementation((name) => {
      if (name === "main-model") return MockMainClass as any;
      if (name === "fallback-model") return MockFallbackClass as any;
      throw new Error("Unknown model");
    });

    const model = new AdaptiveLlmModel({
      main: { modelName: "main-model", apiKey: "key" },
      fallback: [{ modelName: "fallback-model", apiKey: "key" }],
    });

    const generator = model.run({ prompt: "test" } as any);
    const results = [];
    for await (const res of generator) {
      results.push(res);
    }

    expect(results).toEqual([{ text: "fallback success" }]);
    expect(mockMainModel.run).toHaveBeenCalled();
    expect(mockFallbackModel.run).toHaveBeenCalled();
  });

  it("should fail if all models fail", async () => {
    const mockMainModel = {
      run: vi.fn().mockImplementation(async function* () {
        throw new Error("Main model failed");
      }),
    };
    const mockFallbackModel = {
      run: vi.fn().mockImplementation(async function* () {
        throw new Error("Fallback model failed");
      }),
    };

    const MockMainClass = vi.fn().mockImplementation(function () {
      return mockMainModel;
    });
    const MockFallbackClass = vi.fn().mockImplementation(function () {
      return mockFallbackModel;
    });

    vi.mocked(resolveLlmModel).mockImplementation((name) => {
      if (name === "main-model") return MockMainClass as any;
      if (name === "fallback-model") return MockFallbackClass as any;
      throw new Error("Unknown model");
    });

    const model = new AdaptiveLlmModel({
      main: { modelName: "main-model", apiKey: "key" },
      fallback: [{ modelName: "fallback-model", apiKey: "key" }],
    });

    const generator = model.run({ prompt: "test" } as any);
    const results = [];
    for await (const res of generator) {
      results.push(res);
    }

    expect(results).toEqual([
      {
        errorCode: "ADAPTIVE_MODEL_ALL_FALLBACKS_FAILED",
        errorMessage: "All fallback models failed.",
      },
    ]);
  });
});
