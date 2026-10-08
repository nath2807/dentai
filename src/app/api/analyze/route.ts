import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ClinicalAnalysis } from "../../../lib/clinical-analysis";
import { clinicalCaseSchema } from "../../../lib/clinical-case";

const defaultModel = "gemini-3.5-flash";
const rawSchema = z.toJSONSchema(ClinicalAnalysis) as Record<string, unknown>;
const clinicalAnalysisJsonSchema = { ...rawSchema };
delete clinicalAnalysisJsonSchema.$schema;
const clinicalSystemInstruction = `You are DentAI, a clinical decision-support copilot for licensed dentists.

DentAI is clinical decision support, not an autonomous diagnostic system. Analyze only the information supplied in the ClinicalCase. Never invent clinical findings, symptoms, radiographic findings, history, test results, or patient information. Clearly distinguish supplied findings from clinical inference. Provide possible diagnoses and differential diagnoses rather than claiming certainty, and explain supporting findings. Identify missing information that would materially affect assessment and suggest appropriate investigations when relevant. Provide treatment considerations, not autonomous treatment orders. Highlight red flags and situations requiring urgent professional assessment. A licensed dentist must review the output and make the final clinical decision. Do not provide dangerous or fabricated medical information. If the supplied information is insufficient, explicitly say so.

Return only the requested JSON object. Use empty arrays when there are no items. Keep uncertainty explicit and clinically cautious.`;

function publicError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const model = process.env.GEMINI_MODEL || defaultModel;
  const apiKeyPresent = Boolean(process.env.GEMINI_API_KEY);
  if (!apiKeyPresent) {
    return publicError("AI analysis is temporarily unavailable. Please contact your administrator.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return publicError("The submitted case could not be read.", 400);
  }

  const caseResult = clinicalCaseSchema.safeParse(body);
  if (!caseResult.success) {
    return publicError("Please review the case details and try again.", 422);
  }

  const caseWithoutImage = { ...caseResult.data, radiograph: null };
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    let response: { text?: string | null } | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: JSON.stringify(caseWithoutImage),
          config: {
            systemInstruction: clinicalSystemInstruction,
            responseMimeType: "application/json",
            responseJsonSchema: clinicalAnalysisJsonSchema,
          },
        });
        break;
      } catch (err: unknown) {
        const status = typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
        if ((status === 503 || status === 429) && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }

    if (!response?.text) {
      return publicError("The AI returned an empty assessment. Please try again.", 502);
    }

    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(response.text);
    } catch {
      return publicError("The AI returned an invalid assessment. Please try again.", 502);
    }

    const analysisResult = ClinicalAnalysis.safeParse(parsedResponse);
    if (!analysisResult.success) {
      return publicError("The AI returned an invalid assessment. Please try again.", 502);
    }

    return NextResponse.json(analysisResult.data);
  } catch (error) {
    console.error("[DentAI] Gemini API error:", error);
    return publicError("AI analysis is temporarily unavailable. Please try again.", 502);
  }
}