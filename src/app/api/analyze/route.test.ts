import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeClinicalCase } from "../../../lib/clinical-case";
import { POST } from "./route";

const generateContent = vi.hoisted(() => vi.fn());
const genAIConstructorSpy = vi.hoisted(() => vi.fn());

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation((options) => {
    genAIConstructorSpy(options);
    return { models: { generateContent } };
  }),
}));

const validAnalysis = {
  summary: "Findings suggest a localized pulpal process.",
  reportedInformation: ["Patient reports cold sensitivity for 3 days"],
  observedFindings: ["Tooth 36 deep carious lesion", "Tenderness on percussion"],
  inferredFindings: ["Pulpal inflammation with periapical involvement suspected"],
  problemList: ["Cold sensitivity", "Deep caries"],
  possibleDiagnoses: [
    {
      diagnosis: "Symptomatic Irreversible Pulpitis",
      diagnosticCategory: "pulpal" as const,
      likelihood: "moderate" as const,
      confidenceReason:
        "Concordant thermal and physical findings in presence of deep caries, pending radiograph.",
      rank: 1,
      whyRanksHighest: "Lingering cold response and deep caries indicate irreversible pulpal damage.",
      supportingFindings: ["Cold sensitivity"],
      contradictingFindings: [],
      evidenceType: "clinical findings",
      reasoning: "Lingering response consistent with pulpal inflammation.",
      evidenceMap: [
        {
          finding: "Cold sensitivity",
          interpretation: "Thermal hyper-responsiveness",
          diagnosticRelevance: "Indicates pulpal inflammation",
        },
      ],
    },
  ],
  evidenceMap: [
    {
      finding: "Cold sensitivity",
      interpretation: "Thermal hyper-responsiveness",
      diagnosticRelevance: "Indicates pulpal inflammation",
    },
  ],
  differentialDiagnosis: [
    {
      diagnosis: "Dentin hypersensitivity",
      whyConsidered: "Cold sensitivity complaint",
      supportingEvidence: ["Cold sensitivity"],
      supportingFindings: ["Cold sensitivity"],
      evidenceAgainst: ["Deep caries suggests pulpal rather than dentinal etiology"],
      whatWouldChangeRanking: "If pulp testing response was transient without caries proximity",
      missingEvidence: ["Pulp testing with lingering evaluation"],
    },
  ],
  contradictions: [],
  missingInformation: [
    {
      item: "Periapical radiograph",
      importance: "critical" as const,
      whyItMatters: "Required to evaluate proximity to pulp and rule out apical lesion",
    },
    {
      item: "Duration of pain after stimulus",
      importance: "important" as const,
      whyItMatters: "Distinguishes reversible from irreversible pulpitis",
    },
  ],
  suggestedInvestigations: ["Complete pulp vitality testing", "Periapical radiograph"],
  treatmentConsiderations: ["Review the tooth before treatment planning", "Caries excavation"],
  redFlags: [],
  uncertainty: ["Radiographic and objective sensibility confirmation unavailable"],
  decisionChangingEvidence: ["Periapical radiolucency on radiograph", "Unresponsive to EPT"],
  safetyNotes: ["A licensed dentist must review all suggestions before definitive action."],
};

const clinicalCase = normalizeClinicalCase(
  {
    caseId: "CASE-001",
    age: "34",
    sex: "Female",
    complaint: "Sensitivity on the lower left",
    duration: "3 days",
    symptoms: "Cold sensitivity",
    region: "Tooth 36",
    pulpal: "Tender to cold",
  },
  {
    fileName: "scan.png",
    mimeType: "image/png",
    size: 100,
    dataUrl: "data:image/png;base64,secret-image-data",
  }
);

const originalApiKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;

afterEach(() => {
  generateContent.mockReset();
  genAIConstructorSpy.mockReset();
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;

  if (originalModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = originalModel;
});

describe("POST /api/analyze", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.GEMINI_MODEL;
  });

  it("returns a safe error when the API key is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify(clinicalCase),
      })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "AI analysis is temporarily unavailable. Please contact your administrator.",
    });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("handles invalid Gemini JSON without exposing internals", async () => {
    generateContent.mockResolvedValue({ text: "not-json" });
    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify(clinicalCase),
      })
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "The AI returned an invalid assessment. Please try again.",
    });
  });

  it("returns and validates a successful structured analysis with gemini-3.8-flash default", async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify(validAnalysis) });
    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify(clinicalCase),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(validAnalysis);
    const request = generateContent.mock.calls[0][0];
    expect(request.model).toBe("gemini-3.8-flash");
    expect(request.config.responseMimeType).toBe("application/json");
    expect(request.config.responseJsonSchema).toBeDefined();
    expect(request.config.abortSignal).toBeDefined();
    expect(request.contents).not.toContain("secret-image-data");

    expect(genAIConstructorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "test-key",
        httpOptions: expect.objectContaining({
          timeout: 25000,
          retryOptions: expect.objectContaining({
            attempts: 2,
            initialDelay: 1.0,
            maxDelay: 3.0,
            httpStatusCodes: [429, 503],
          }),
        }),
      })
    );
  });

  it("does not send thinkingConfig in generateContent request by default", async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify(validAnalysis) });
    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify(clinicalCase),
      })
    );

    expect(response.status).toBe(200);
    const request = generateContent.mock.calls[0][0];
    expect(request.config.thinkingConfig).toBeUndefined();
  });

  it("allows configuring model through GEMINI_MODEL environment variable", async () => {
    process.env.GEMINI_MODEL = "gemini-custom-pro";
    generateContent.mockResolvedValue({ text: JSON.stringify(validAnalysis) });
    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify(clinicalCase),
      })
    );

    expect(response.status).toBe(200);
    const request = generateContent.mock.calls[0][0];
    expect(request.model).toBe("gemini-custom-pro");
  });

  it("ensures radiograph data is excluded from request payload", async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify(validAnalysis) });
    await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify(clinicalCase),
      })
    );

    const request = generateContent.mock.calls[0][0];
    expect(request.contents).not.toContain("secret-image-data");
    const parsedPayload = JSON.parse(request.contents);
    expect(parsedPayload.radiograph).toBeNull();
  });

  it("returns structured HTTP 504 when call times out via TimeoutError", async () => {
    const timeoutErr = new Error("The operation was aborted due to timeout");
    timeoutErr.name = "TimeoutError";
    generateContent.mockRejectedValue(timeoutErr);

    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify(clinicalCase),
      })
    );

    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({
      error: "AI analysis timed out. Please try again.",
    });
  });

  it("returns structured HTTP 504 when call is aborted via AbortError", async () => {
    const abortErr = new Error("This operation was aborted");
    abortErr.name = "AbortError";
    generateContent.mockRejectedValue(abortErr);

    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify(clinicalCase),
      })
    );

    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({
      error: "AI analysis timed out. Please try again.",
    });
  });

  it("handles exhausted upstream 503 error safely with 502 without leaking internals", async () => {
    generateContent.mockRejectedValue({
      status: 503,
      message: "This model is currently experiencing high demand.",
    });

    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify(clinicalCase),
      })
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "AI analysis is temporarily unavailable. Please try again.",
    });
  });

  it("handles exhausted upstream 429 rate limit safely with 502 without leaking internals", async () => {
    generateContent.mockRejectedValue({
      status: 429,
      message: "Resource has been exhausted (e.g. check quota).",
    });

    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify(clinicalCase),
      })
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "AI analysis is temporarily unavailable. Please try again.",
    });
  });
});
