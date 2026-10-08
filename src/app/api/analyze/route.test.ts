import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeClinicalCase } from "../../../lib/clinical-case";
import { POST } from "./route";

const generateContent = vi.hoisted(() => vi.fn());
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({ models: { generateContent } })),
}));

const validAnalysis = {
  summary: "Findings suggest a localized pulpal process.",
  problemList: ["Cold sensitivity"],
  possibleDiagnoses: [{ diagnosis: "Reversible pulpitis", likelihood: "moderate", supportingFindings: ["Cold sensitivity"] }],
  differentialDiagnosis: ["Dentin hypersensitivity"],
  missingInformation: ["Duration of pain after stimulus"],
  suggestedInvestigations: ["Complete pulp vitality testing"],
  treatmentConsiderations: ["Review the tooth before treatment planning"],
  redFlags: [],
  uncertainty: "The supplied findings are limited.",
};

const clinicalCase = normalizeClinicalCase({
  caseId: "CASE-001",
  age: "34",
  sex: "Female",
  complaint: "Sensitivity on the lower left",
  duration: "3 days",
  symptoms: "Cold sensitivity",
  region: "Tooth 36",
  pulpal: "Tender to cold",
}, {
  fileName: "scan.png",
  mimeType: "image/png",
  size: 100,
  dataUrl: "data:image/png;base64,secret-image-data",
});

const originalApiKey = process.env.GEMINI_API_KEY;

afterEach(() => {
  generateContent.mockReset();
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;
});

describe("POST /api/analyze", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("returns a safe error when the API key is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const response = await POST(new Request("http://localhost/api/analyze", { method: "POST", body: JSON.stringify(clinicalCase) }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "AI analysis is temporarily unavailable. Please contact your administrator." });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("handles invalid Gemini JSON without exposing internals", async () => {
    generateContent.mockResolvedValue({ text: "not-json" });
    const response = await POST(new Request("http://localhost/api/analyze", { method: "POST", body: JSON.stringify(clinicalCase) }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "The AI returned an invalid assessment. Please try again." });
  });

  it("returns and validates a successful structured analysis", async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify(validAnalysis) });
    const response = await POST(new Request("http://localhost/api/analyze", { method: "POST", body: JSON.stringify(clinicalCase) }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(validAnalysis);
    const request = generateContent.mock.calls[0][0];
    expect(request.config.responseMimeType).toBe("application/json");
    expect(request.config.responseJsonSchema).toBeDefined();
    expect(request.contents).not.toContain("secret-image-data");
  });
});
