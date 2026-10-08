import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeClinicalCase } from "../../../lib/clinical-case";
import { POST } from "./route";

const generateContent = vi.hoisted(() => vi.fn());
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({ models: { generateContent } })),
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

  it("returns and validates a successful structured analysis", async () => {
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
    expect(request.config.responseMimeType).toBe("application/json");
    expect(request.config.responseJsonSchema).toBeDefined();
    expect(request.contents).not.toContain("secret-image-data");
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
});
