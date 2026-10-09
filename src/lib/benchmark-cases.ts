/**
 * SYNTHETIC EDUCATIONAL BENCHMARK CASES
 *
 * IMPORTANT CLINICAL & REGULATORY NOTICE:
 * The cases below are fictional, simulated educational examples designed solely
 * for software workflow evaluation, user interface demonstration, and automated testing.
 * They are NOT clinically validated reference standards, verified clinical guidelines,
 * or actual patient records.
 *
 * All clinician review entries are fictional synthetic personas created strictly
 * to demonstrate the decision trace user interface. They do not represent real
 * licensed clinicians, medical endorsements, or certified diagnoses.
 */

import type { StoredCase } from "./case-storage";

export const BENCHMARK_CASE_PULPITIS: StoredCase = {
  id: "CASE-BENCH-001",
  createdAt: "2026-10-01T09:00:00.000Z",
  updatedAt: "2026-10-01T09:30:00.000Z",
  status: "reviewed",
  analysisStatus: "current",
  reviewStatus: "reviewed",
  caseData: {
    caseInformation: {
      caseId: "CASE-BENCH-001",
      age: 38,
      sex: "Female",
    },
    chiefComplaint:
      "Severe, sharp, throbbing pain in lower right molar that lingers for several minutes after cold water and wakes me at night.",
    historyOfPresentingComplaint: {
      duration: "4 days",
      onset: "Acute",
      symptoms:
        "Spontaneous throbbing pain radiating to the right preauricular area; intensified by thermal changes.",
      aggravatingFactors: "Cold liquids, hot tea, chewing pressure, lying supine",
      relievingFactors: "Temporary mild relief with ibuprofen 400mg, cold water briefly soothes when hot throbbing starts",
    },
    painAssessment: {
      painPresent: "yes",
      onset: "Acute, worsening over 96 hours",
      duration: "Continuous episodes lasting >30 minutes",
      frequency: "Frequent daily and nocturnal episodes",
      character: "Sharp initial then deep throbbing",
      severity: "8/10",
      spontaneousPain: "yes",
      provokedPain: "yes",
      provokingFactors: "Cold, heat, chewing",
      relievingFactors: "NSAIDs (partial)",
      nocturnalPain: "yes",
      lingeringPain: "yes",
    },
    toothAssessment: {
      toothNumber: "30",
      arch: "mandibular",
      quadrant: "lower_right",
      region: "posterior",
      toothStatus: "Restored",
    },
    pulpalAssessment: {
      coldTest: "Exaggerated, intense pain lingering for 35 seconds",
      heatTest: "Provokes dull prolonged throbbing",
      electricPulpTest: "18 (Adjacent tooth #29 responds at 34; tooth #31 at 36)",
      pulpTestResponse: "Hyper-responsive with prolonged lingering",
      lingeringDuration: "35 seconds",
    },
    periapicalAssessment: {
      percussion: "Moderately positive (dull ache on vertical percussion)",
      palpation: "Negative (no vestibular tenderness)",
      biteTest: "Mild tenderness on release over distobuccal cusp",
      mobility: "Normal (Grade 0)",
      sinusTract: "Absent",
      swelling: "No intraoral or extraoral swelling detected",
    },
    periodontalAssessment: {
      probingDepth: "2-3mm generalized sulcular depths around #30",
      bleedingOnProbing: "Absent",
      recession: "None",
      attachmentLoss: "None",
      furcation: "None",
      periodontalMobility: "Grade 0",
    },
    hardTissueAssessment: {
      caries: "Recurrent caries detected beneath disto-occlusal composite restoration",
      restoration: "Existing DO resin composite with marginal discoloration and ditching",
      fracture: "No obvious complete coronal fracture",
      crack: "Craze lines noted on mesial marginal ridge, no mobile cuspal segment",
      toothWear: "Moderate attrition on occlusal table",
      discoloration: "Slight grayish hue beneath distal margin",
    },
    softTissueAssessment: {
      mucosalFinding: "Normal pink mucosa, no fistula or erythema",
      gingivalFinding: "Stippled, firm gingival margin",
      ulcer: "None",
      swelling: "None",
      lesionDescription: "No pathosis observed",
    },
    structuredMedicalHistory: {
      systemicConditions: "Controlled hypertension (lisinopril 10mg daily)",
      medications: "Lisinopril, ibuprofen as needed",
      allergies: "No known drug allergies (NKDA)",
      relevantMedicalHistory: "Controlled hypertension on ACE inhibitor",
    },
    structuredDentalHistory: {
      previousTreatment: "DO composite restoration placed 4 years ago",
      previousPain: "No previous episodes on this tooth until 4 days ago",
      traumaHistory: "None",
      endodonticHistory: "None",
      periodontalHistory: "Normal baseline",
      extractionHistory: "None",
    },
    investigations: {
      investigationsPerformed: "Transillumination and periapical radiography",
      investigationResults: "Deep distal radiolucency approaching pulpal horn; intact lamina dura with slight widening at mesial apex",
      radiographAvailable: true,
      radiographType: "Periapical and bitewing",
    },
    relevantNegatives: {
      relevantNegativeFindings:
        "No sinus tract, no fluctuant swelling, no lymphadenopathy, no periodontal pocketing >3mm.",
    },
    clinicianNotes: {
      additionalClinicalNotes:
        "[SYNTHETIC EDUCATIONAL CASE]: Simulated reference scenario for software demonstration. Not an actual patient encounter or validated reference standard.",
    },
    clinicalExamination: {
      toothOrRegion: "30",
      extraoralFindings: "No facial asymmetry, lymphadenopathy, or extraoral swelling.",
      intraoralFindings: "Normal mucosa; firm stippled gingiva; no vestibular fluctuance.",
      hardTissueFindings: "Recurrent caries beneath disto-occlusal composite restoration.",
      softTissueFindings: "Normal pink attached gingiva without sinus tract.",
      periodontalFindings: "2-3mm sulcular depths without bleeding on probing.",
      pulpalFindings: "Hyper-responsive with 35-second lingering pain to cold.",
      percussion: "Positive",
      palpation: "Negative",
      mobility: "Grade 0",
      probing: "2-3mm",
      vitalityTests: "Cold test lingers 35s; EPT responsive at 18.",
    },
    medicalHistory: {
      conditions: "Hypertension (controlled)",
      allergies: "NKDA",
      medications: "Lisinopril 10mg",
    },
    dentalHistory: {
      previousTreatment: "DO composite restoration placed 4 years ago",
      previousExtractions: "None",
      endodonticTreatment: "None",
      prostheticTreatment: "None",
      orthodonticTreatment: "None",
      oralHygiene: "Fair (irregular flossing)",
    },
    radiograph: null,
  },
  analysis: {
    summary:
      "A 38-year-old female presents with acute spontaneous nocturnal pain and prolonged lingering thermal sensitivity on mandibular right first molar (tooth #30). Clinical testing demonstrates hyper-responsiveness with a 35-second lingering response to cold and positive vertical percussion. Findings are consistent with Symptomatic Irreversible Pulpitis complicated by Symptomatic Apical Periodontitis.",
    reportedInformation: [
      "Severe throbbing pain in lower right molar for 4 days",
      "Spontaneous pain episodes awakening patient at night",
      "Cold liquids provoke intense, lingering distress",
      "Controlled hypertension managed with Lisinopril",
    ],
    observedFindings: [
      "Tooth #30: Exaggerated response to cold lingering 35 seconds",
      "Tooth #30: Positive to vertical percussion (moderate tenderness)",
      "Tooth #30: Negative to vestibular palpation, no swelling or sinus tract",
      "Tooth #30: Sulcular probing depths 2-3mm without bleeding",
      "Disto-occlusal composite restoration with marginal ditching and secondary caries",
    ],
    inferredFindings: [
      "Bacterial microleakage beneath the composite has led to irreversible inflammatory pulpal degradation",
      "Inflammatory mediators have begun extending through apical foramina into the periodontal ligament, causing percussion tenderness",
    ],
    problemList: [
      "Acute irreversible pulpal inflammation (Tooth #30)",
      "Early periapical ligament inflammation (Tooth #30)",
      "Recurrent caries / failing coronal restoration (Tooth #30)",
    ],
    evidenceMap: [
      {
        finding: "Cold test lingers 35 seconds",
        interpretation: "Severe non-resolving C-fiber and A-delta pulpitis",
        diagnosticRelevance: "Confirms irreversible pulpal state",
      },
      {
        finding: "Nocturnal spontaneous pain",
        interpretation: "Intrapulpal pressure elevation with horizontal position",
        diagnosticRelevance: "Hallmark of irreversible inflammatory progression",
      },
    ],
    possibleDiagnoses: [
      {
        diagnosis: "Symptomatic Irreversible Pulpitis",
        diagnosticCategory: "pulpal",
        likelihood: "high",
        confidenceReason:
          "Confirmed by pathognomonic 35-second lingering pain to cold stimulus and spontaneous nocturnal throbbing episodes.",
        rank: 1,
        supportingFindings: [
          "Cold test lingering duration 35 seconds",
          "Spontaneous and nocturnal pain episodes",
          "Deep recurrent caries beneath existing restoration",
          "Lower EPT threshold compared to control teeth",
        ],
        contradictingFindings: [],
        evidenceType: "Definitive Sensibility Testing",
        reasoning:
          "Prolonged response to thermal testing indicates vital pulpal tissue unable to recover from inflammatory injury, meeting diagnostic criteria for irreversible pulpitis.",
        whyRanksHighest:
          "The unequivocal prolonged lingering thermal response rules out reversible pulpitis and normal pulp.",
        evidenceMap: [
          {
            finding: "Cold test lingers 35 seconds",
            interpretation: "Severe non-resolving C-fiber and A-delta pulpitis",
            diagnosticRelevance: "Confirms irreversible pulpal state",
          },
          {
            finding: "Nocturnal spontaneous pain",
            interpretation: "Intrapulpal pressure elevation with horizontal position",
            diagnosticRelevance: "Hallmark of irreversible inflammatory progression",
          },
        ],
      },
      {
        diagnosis: "Symptomatic Apical Periodontitis",
        diagnosticCategory: "apical",
        likelihood: "high",
        confidenceReason:
          "Positive vertical percussion tenderness indicates inflammatory extension into apical periodontal ligament fibers.",
        rank: 2,
        supportingFindings: [
          "Moderate tenderness to vertical percussion on tooth #30",
          "Slight widening of periodontal ligament space radiographically",
        ],
        contradictingFindings: [
          "Palpation negative (cortical bone not yet perforated)",
          "No vestibular fluctuance or sinus tract",
        ],
        evidenceType: "Mechanical Periapical Provocation",
        reasoning:
          "Occurs secondary to the advancing pulpal inflammation as inflammatory cytokines exit the apical foramina.",
        whyRanksHighest: "",
        evidenceMap: [
          {
            finding: "Percussion tenderness",
            interpretation: "Mechanoreceptor activation in inflamed apical PDL",
            diagnosticRelevance: "Establishes apical co-diagnosis",
          },
        ],
      },
      {
        diagnosis: "Reversible Pulpitis",
        diagnosticCategory: "pulpal",
        likelihood: "low",
        confidenceReason:
          "Excluded by spontaneous pain and prolonged lingering thermal sensitivity exceeding 30 seconds.",
        rank: 3,
        supportingFindings: ["Thermal sensitivity present", "Vital pulpal response"],
        contradictingFindings: [
          "Pain lingers for 35 seconds (reversible pulpitis subsides within seconds)",
          "Spontaneous pain episodes occur without external stimulus",
          "Nocturnal pain wakes patient",
        ],
        evidenceType: "Differential Exclusion",
        reasoning:
          "Reversible pulpitis is characterized by quick transient pain that dissipates promptly upon stimulus removal.",
        whyRanksHighest: "",
        evidenceMap: [],
      },
    ],
    differentialDiagnosis: [
      {
        diagnosis: "Cracked Tooth Syndrome",
        whyConsidered:
          "Mandibular molars with occlusal restorations frequently experience incomplete cuspal fractures.",
        supportingEvidence: [
          "Restored lower molar",
          "Mild tenderness on bite release test",
        ],
        supportingFindings: ["Restored lower molar", "Mild bite test tenderness"],
        evidenceAgainst: [
          "Thermal lingering dominates over sharp bite release pain",
          "Craze lines do not block transillumination",
        ],
        whatWouldChangeRanking:
          "Isolation of a mobile cuspal fragment or localized deep narrow periodontal probing defect.",
        missingEvidence: [
          "Staining with methylene blue after restoration removal",
          "Individual cuspal wedge testing with Tooth Slooth",
        ],
      },
    ],
    contradictions: [],
    missingInformation: [
      {
        item: "High-resolution periapical radiograph with parallel positioning",
        importance: "critical",
        whyItMatters:
          "To definitively assess root curvature, canal anatomy, and verify absence of root resorption before endodontic therapy.",
      },
      {
        item: "Bitewing radiograph of tooth #30",
        importance: "important",
        whyItMatters:
          "To accurately evaluate remaining coronal dentin thickness and assess pulpal floor proximity.",
      },
    ],
    suggestedInvestigations: [
      "Periapical radiograph centered on tooth #30 apex",
      "Vertical bitewing to determine restorative ferrule viability",
      "Tooth Slooth individual cusp load testing",
    ],
    treatmentConsiderations: [
      "Immediate pulpectomy / emergency pulpal debridement to achieve rapid pain relief",
      "Complete non-surgical root canal therapy (RCT) of tooth #30",
      "Coronal reconstruction with core buildup and full-coverage protective crown",
      "Analgesic protocol: Ibuprofen 600mg alternating with Acetaminophen 500mg if required",
    ],
    redFlags: [
      "Watch for rapid facial swelling or trismus signaling acute apical abscess progression",
      "Monitor for submandibular space fascial involvement",
    ],
    uncertainty: [
      "Extent of root canal calcification pending angled radiograph verification",
      "Exact restorability depends on biological width margins after caries excavation",
    ],
    decisionChangingEvidence: [
      "Presence of a vertical root fracture extending subgingivally would change prognosis from root canal to extraction",
    ],
    safetyNotes: [
      "Dentarith provides assistive clinical decision support only.",
      "Definitive pulpal access requires verified radiographic working length and clinician confirmation.",
    ],
  },
  review: {
    status: "reviewed",
    reviewedAt: "2026-10-01T09:30:00.000Z",
    reviewedBy: "Simulated Educational Reviewer (Synthetic Persona — Non-Clinical Demo)",
    notes:
      "[SYNTHETIC EDUCATIONAL CASE]: Simulated review note for software workflow demonstration. Not an actual patient encounter or validated clinical diagnosis.",
    corrections: {
      agreedWithAiDiagnosis: true,
      finalDiagnosis:
        "Symptomatic Irreversible Pulpitis with Symptomatic Apical Periodontitis (#30) [Simulated]",
      diagnosisNotes:
        "[Synthetic Educational Example] Concurs with pulpal/apical differential based on simulated findings. For demonstration only.",
      treatmentPlan:
        "1. Complete pulpectomy / Root canal therapy (RCT) tooth #30\n2. Placement of bonded composite core buildup\n3. Full-coverage zirconia crown to prevent catastrophic cusp fracture",
      treatmentPlanNotes:
        "Prioritize ferrule preservation during coronal caries debridement.",
      additionalObservations:
        "Distobuccal cusp exhibited micro-craze line, but pulpal debridement and cuspal reduction provided immediate relief.",
    },
  },
};

export const BENCHMARK_CASE_REVERSIBLE: StoredCase = {
  id: "CASE-BENCH-002",
  createdAt: "2026-10-02T10:15:00.000Z",
  updatedAt: "2026-10-02T10:45:00.000Z",
  status: "reviewed",
  analysisStatus: "current",
  reviewStatus: "reviewed",
  caseData: {
    caseInformation: {
      caseId: "CASE-BENCH-002",
      age: 45,
      sex: "Male",
    },
    chiefComplaint:
      "Brief sharp twinge to cold drinks and sweet desserts on upper left molar, stops immediately once stimulus is removed.",
    historyOfPresentingComplaint: {
      duration: "3 weeks",
      onset: "Gradual",
      symptoms: "Sharp transient sensitivity lasting 1-2 seconds only with cold beverages or ice cream.",
      aggravatingFactors: "Cold drinks, citrus, sweet foods, toothbrush contact",
      relievingFactors: "Immediate relief when stimulus ceases; no spontaneous pain",
    },
    painAssessment: {
      painPresent: "yes",
      onset: "Gradual over several weeks",
      duration: "1-2 seconds",
      frequency: "Only upon direct thermal or sweet contact",
      character: "Sharp, lancinating, brief",
      severity: "4/10",
      spontaneousPain: "no",
      provokedPain: "yes",
      provokingFactors: "Cold liquids, sweet foods",
      relievingFactors: "Removal of stimulus",
      nocturnalPain: "no",
      lingeringPain: "no",
    },
    toothAssessment: {
      toothNumber: "14",
      arch: "maxillary",
      quadrant: "upper_left",
      region: "posterior",
      toothStatus: "Intact with cervical wear",
    },
    pulpalAssessment: {
      coldTest: "Sharp, brisk response that dissipates within 1.5 seconds",
      heatTest: "Normal / negative",
      electricPulpTest: "32 (Matches contralateral tooth #3 at 30)",
      pulpTestResponse: "Vital, transient hypersensitivity",
      lingeringDuration: "1-2 seconds",
    },
    periapicalAssessment: {
      percussion: "Negative",
      palpation: "Negative",
      biteTest: "Negative",
      mobility: "Grade 0",
      sinusTract: "Absent",
      swelling: "None",
    },
    periodontalAssessment: {
      probingDepth: "1-2mm sulcular depths, no bleeding",
      bleedingOnProbing: "Absent",
      recession: "1.5mm buccal gingival recession exposing cervical root surface",
      attachmentLoss: "Mild localized buccal",
      furcation: "None",
      periodontalMobility: "Grade 0",
    },
    hardTissueAssessment: {
      caries: "No active cavitated caries detected",
      restoration: "Virgin occlusal surfaces",
      fracture: "None",
      crack: "None",
      toothWear: "V-shaped non-carious cervical lesion (NCCL / abfraction) at buccal cervical margin",
      discoloration: "None",
    },
    softTissueAssessment: {
      mucosalFinding: "Healthy pink mucosa",
      gingivalFinding: "Thin biotype with localized recession",
      ulcer: "None",
      swelling: "None",
      lesionDescription: "No pathosis",
    },
    structuredMedicalHistory: {
      systemicConditions: "None",
      medications: "None",
      allergies: "NKDA",
      relevantMedicalHistory: "No significant medical conditions",
    },
    structuredDentalHistory: {
      previousTreatment: "Routine preventative prophylaxis only",
      previousPain: "None",
      traumaHistory: "None",
      endodonticHistory: "None",
      periodontalHistory: "Localized recession",
      extractionHistory: "None",
    },
    investigations: {
      investigationsPerformed: "Transillumination and bitewing radiograph",
      investigationResults: "Bitewing shows intact coronal enamel and dentin without pulpal encroachment; normal periapical contour",
      radiographAvailable: true,
      radiographType: "Bitewing",
    },
    relevantNegatives: {
      relevantNegativeFindings:
        "No lingering thermal pain, no spontaneous pain, no nocturnal pain, negative percussion.",
    },
    clinicianNotes: {
      additionalClinicalNotes:
        "[SYNTHETIC EDUCATIONAL CASE]: Simulated reference scenario for software demonstration. Not an actual patient encounter or validated reference standard.",
    },
    clinicalExamination: {
      toothOrRegion: "14",
      extraoralFindings: "Symmetric facial contour; TMJ normal; no lymphadenopathy.",
      intraoralFindings: "Healthy oral mucosa; buccal cervical recession #14 with exposed dentin.",
      hardTissueFindings: "Non-carious cervical lesion (abfraction/wear) at buccal margin.",
      softTissueFindings: "1.5mm localized buccal recession without inflammation.",
      periodontalFindings: "1-2mm sulcular depths, no bleeding on probing.",
      pulpalFindings: "Sharp transient sensitivity resolving in 1.5 seconds.",
      percussion: "Negative",
      palpation: "Negative",
      mobility: "Grade 0",
      probing: "1-2mm",
      vitalityTests: "Cold test brisk, resolves in 1.5s; EPT 32 (normal control).",
    },
    medicalHistory: {
      conditions: "None",
      allergies: "NKDA",
      medications: "None",
    },
    dentalHistory: {
      previousTreatment: "Routine preventative prophylaxis only",
      previousExtractions: "None",
      endodonticTreatment: "None",
      prostheticTreatment: "None",
      orthodonticTreatment: "None",
      oralHygiene: "Good (uses hard bristle brush)",
    },
    radiograph: null,
  },
  analysis: {
    summary:
      "A 45-year-old male presents with sharp, non-lingering thermal sensitivity on maxillary left first molar (tooth #14). Examination reveals exposed cervical root dentin with a non-carious cervical lesion, normal vital response to cold resolving in <2 seconds, and negative periapical findings. Presentation is indicative of Reversible Pulpitis secondary to Cervical Dentin Hypersensitivity.",
    reportedInformation: [
      "Sharp sensitivity to cold drinks lasting only 1-2 seconds",
      "No spontaneous or nocturnal pain episodes",
      "Aggressive horizontal toothbrushing habit",
    ],
    observedFindings: [
      "Tooth #14: Cold test brisk, dissipates within 1.5 seconds without lingering",
      "Tooth #14: Percussion and palpation negative",
      "1.5mm buccal gingival recession with non-carious cervical dentin exposure",
      "Probing depths 1-2mm without active caries",
    ],
    inferredFindings: [
      "Patent dentinal tubules communicate hydrodynamic fluid movement to A-delta nerve fibers",
      "Pulpal tissue remains healthy and capable of returning to baseline following stimulus removal",
    ],
    problemList: [
      "Cervical dentin hypersensitivity (Tooth #14)",
      "Reversible pulpitis secondary to hydrodynamic tubule exposure",
      "Non-carious cervical lesion / improper brushing technique",
    ],
    evidenceMap: [
      {
        finding: "Cold stimulus response <2s",
        interpretation: "Reversible A-delta activation without C-fiber chronicity",
        diagnosticRelevance: "Excludes irreversible pulpal pathosis",
      },
    ],
    possibleDiagnoses: [
      {
        diagnosis: "Reversible Pulpitis / Dentin Hypersensitivity",
        diagnosticCategory: "pulpal",
        likelihood: "high",
        confidenceReason:
          "Pathognomonic transient thermal response resolving immediately (<2 seconds) with evident cervical tubule exposure.",
        rank: 1,
        supportingFindings: [
          "Cold test resolves in 1.5 seconds",
          "No spontaneous or lingering discomfort",
          "Visible cervical dentin exposure with explorer sensitivity",
          "Normal EPT response matching contralateral control",
        ],
        contradictingFindings: [],
        evidenceType: "Thermal Provocation Test",
        reasoning:
          "Fluid movement within patent dentinal tubules excites myelinated A-delta fibers without established pulp tissue necrosis.",
        whyRanksHighest:
          "Lack of lingering duration (<2 seconds) definitively confirms pulpal reversibility.",
        evidenceMap: [
          {
            finding: "Cold stimulus response <2s",
            interpretation: "Reversible A-delta activation without C-fiber chronicity",
            diagnosticRelevance: "Excludes irreversible pulpal pathosis",
          },
        ],
      },
      {
        diagnosis: "Symptomatic Irreversible Pulpitis",
        diagnosticCategory: "pulpal",
        likelihood: "low",
        confidenceReason:
          "Strongly contraindicated by lack of lingering pain, absence of spontaneous episodes, and negative nocturnal history.",
        rank: 2,
        supportingFindings: ["Vital thermal response"],
        contradictingFindings: [
          "Pain resolves within 2 seconds (not lingering)",
          "No spontaneous pain episodes",
          "Negative percussion test",
        ],
        evidenceType: "Differential Exclusion",
        reasoning:
          "Irreversible pulpitis requires sustained lingering pain beyond stimulus removal.",
        whyRanksHighest: "",
        evidenceMap: [],
      },
    ],
    differentialDiagnosis: [
      {
        diagnosis: "Initial Interproximal Caries Lesion",
        whyConsidered: "Occult proximal lesions can present with thermal sensitivity.",
        supportingEvidence: ["Thermal sensitivity on posterior molar"],
        supportingFindings: ["Thermal sensitivity"],
        evidenceAgainst: [
          "Recent bitewing radiograph shows intact proximal enamel and dentin",
        ],
        whatWouldChangeRanking: "Evidence of proximal enamel breakdown on bitewing.",
        missingEvidence: [],
      },
    ],
    contradictions: [],
    missingInformation: [
      {
        item: "Dietary acid intake assessment",
        importance: "useful",
        whyItMatters:
          "To identify extrinsic erosive factors (citrus, sparkling water) contributing to tubule patency.",
      },
    ],
    suggestedInvestigations: [
      "Dietary acid and brushing force review",
      "Occlusal analysis for excursive interferences causing abfraction",
    ],
    treatmentConsiderations: [
      "Application of in-office potassium nitrate / fluoride varnish tubule desensitizer",
      "Prescription 5000ppm sodium fluoride toothpaste for daily home use",
      "Switch to ultra-soft toothbrush and modified Bass brushing technique",
      "Consider conservative resin-modified glass ionomer or flowable composite restoration if hypersensitivity persists",
    ],
    redFlags: [
      "Advise patient to return promptly if pain transitions from transient to spontaneous or lingering",
    ],
    uncertainty: [
      "Degree of abfraction contribution from eccentric occlusal prematurities",
    ],
    decisionChangingEvidence: [
      "Onset of lingering pain >10 seconds would change diagnosis to irreversible pulpitis",
    ],
    safetyNotes: [
      "Dentarith clinical intelligence copilot recommendations require independent clinician confirmation.",
    ],
  },
  review: {
    status: "reviewed",
    reviewedAt: "2026-10-02T10:45:00.000Z",
    reviewedBy: "Simulated Educational Reviewer (Synthetic Persona — Non-Clinical Demo)",
    notes:
      "[SYNTHETIC EDUCATIONAL CASE]: Simulated review note for software workflow demonstration. Not an actual patient encounter or validated clinical diagnosis.",
    corrections: {
      agreedWithAiDiagnosis: true,
      finalDiagnosis: "Reversible Pulpitis secondary to Cervical Dentin Hypersensitivity (#14) [Simulated]",
      diagnosisNotes:
        "[Synthetic Educational Example] Concurs with reversible pulpitis / hypersensitivity differential for demonstration only.",
      treatmentPlan:
        "1. Applied Gluma desensitizer and 5% sodium fluoride varnish to buccal cervical #14\n2. Dispensed 1.1% NaF dentifrice (Prevident 5000)\n3. Oral hygiene instruction: soft brush, gentle circular motion\n4. Re-evaluate in 4 weeks",
      treatmentPlanNotes: "Avoid invasive restorative intervention unless symptoms persist.",
      additionalObservations:
        "Occlusion verified in centric relation and lateral excursions with 40um articulating paper; no heavy interference.",
    },
  },
};

export const BENCHMARK_CASE_NECROSIS: StoredCase = {
  id: "CASE-BENCH-003",
  createdAt: "2026-10-03T14:00:00.000Z",
  updatedAt: "2026-10-03T14:20:00.000Z",
  status: "analyzed",
  analysisStatus: "current",
  reviewStatus: "needs_review",
  caseData: {
    caseInformation: {
      caseId: "CASE-BENCH-003",
      age: 29,
      sex: "Female",
    },
    chiefComplaint:
      "Small gum boil above upper front tooth with occasional salty taste; tooth has slight grayish discoloration following sports injury 5 years ago.",
    historyOfPresentingComplaint: {
      duration: "6 weeks",
      onset: "Insidious",
      symptoms:
        "Painless small bump on the upper gum that periodically swells, drains a drop of fluid, and shrinks down.",
      aggravatingFactors: "None currently; historical blunt trauma during soccer match 5 years ago",
      relievingFactors: "Spontaneous decompression / drainage",
    },
    painAssessment: {
      painPresent: "no",
      onset: "Painless presentation",
      duration: "Intermittent drainage",
      frequency: "Drains every few days",
      character: "Painless drainage with mild dull pressure when closed",
      severity: "1/10",
      spontaneousPain: "no",
      provokedPain: "no",
      provokingFactors: "None",
      relievingFactors: "Drainage",
      nocturnalPain: "no",
      lingeringPain: "no",
    },
    toothAssessment: {
      toothNumber: "8",
      arch: "maxillary",
      quadrant: "upper_right",
      region: "anterior",
      toothStatus: "Discolored, unrestored",
    },
    pulpalAssessment: {
      coldTest: "Non-responsive (Negative - 0 response)",
      heatTest: "Non-responsive (Negative)",
      electricPulpTest: "80 (No response at maximum reading 80/80; adjacent #9 responds at 24)",
      pulpTestResponse: "Non-vital pulp",
      lingeringDuration: "None (0 seconds)",
    },
    periapicalAssessment: {
      percussion: "Mild tenderness / dull sound on percussion",
      palpation: "Slight fullness and tenderness over labial apical root prominence",
      biteTest: "Negative",
      mobility: "Grade 0",
      sinusTract: "Active sinus tract stoma present on labial attached gingiva 4mm apical to mucogingival junction of #8",
      swelling: "Localized papular stoma with seropurulent drainage on gentle palpation",
    },
    periodontalAssessment: {
      probingDepth: "2mm circumferential probing depths around tooth #8",
      bleedingOnProbing: "Absent",
      recession: "None",
      attachmentLoss: "None",
      furcation: "Not applicable (single-rooted)",
      periodontalMobility: "Grade 0",
    },
    hardTissueAssessment: {
      caries: "No clinical caries detected",
      restoration: "Virgin tooth, no restoration",
      fracture: "No coronal fracture",
      crack: "Enamel craze lines visible under transillumination",
      toothWear: "Mild incisal edge wear",
      discoloration: "Subtle grayish-yellow opacity compared to adjacent central incisor #9",
    },
    softTissueAssessment: {
      mucosalFinding: "Active draining sinus tract on attached gingiva above #8",
      gingivalFinding: "Localized erythema surrounding sinus stoma",
      ulcer: "None",
      swelling: "Papule at sinus tract orifice",
      lesionDescription: "Patent parulis with exudate",
    },
    structuredMedicalHistory: {
      systemicConditions: "None",
      medications: "None",
      allergies: "NKDA",
      relevantMedicalHistory: "No significant medical conditions",
    },
    structuredDentalHistory: {
      previousTreatment: "Historical trauma 5 years ago; no dental care at that time",
      previousPain: "None acute",
      traumaHistory: "Blunt sports trauma 5 years ago",
      endodonticHistory: "None",
      periodontalHistory: "Normal baseline",
      extractionHistory: "None",
    },
    investigations: {
      investigationsPerformed: "Transillumination and periapical radiography with gutta-percha point",
      investigationResults: "Well-circumscribed periapical radiolucency approximately 6mm in diameter centered at the apex of tooth #8",
      radiographAvailable: true,
      radiographType: "Periapical",
    },
    relevantNegatives: {
      relevantNegativeFindings:
        "Circumferential periodontal probing is within normal limits (2mm throughout); rules out primary periodontal origin.",
    },
    clinicianNotes: {
      additionalClinicalNotes:
        "[SYNTHETIC EDUCATIONAL CASE]: Simulated reference scenario for software demonstration. Not an actual patient encounter or validated reference standard.",
    },
    clinicalExamination: {
      toothOrRegion: "8",
      extraoralFindings: "Facial symmetry preserved; upper lip normal; no lymphadenopathy.",
      intraoralFindings: "Active sinus tract stoma on labial attached gingiva 4mm apical to MGJ of #8.",
      hardTissueFindings: "Unrestored crown with subtle grayish discoloration following trauma.",
      softTissueFindings: "Sinus tract stoma with localized erythema and seropurulent exudate.",
      periodontalFindings: "2mm circumferential probing depths; no deep periodontal pocketing.",
      pulpalFindings: "Non-responsive to thermal and electrical pulp testing (non-vital).",
      percussion: "Mild tenderness",
      palpation: "Slight fullness",
      mobility: "Grade 0",
      probing: "2mm",
      vitalityTests: "Cold test 0 (non-responsive); EPT 80/80 (non-responsive).",
    },
    medicalHistory: {
      conditions: "None",
      allergies: "NKDA",
      medications: "None",
    },
    dentalHistory: {
      previousTreatment: "Historical trauma 5 years ago; no dental care at that time",
      previousExtractions: "None",
      endodonticTreatment: "None",
      prostheticTreatment: "None",
      orthodonticTreatment: "None",
      oralHygiene: "Good",
    },
    radiograph: null,
  },
  analysis: {
    summary:
      "A 29-year-old female presents with a chronic draining sinus tract stoma on the labial attached gingiva above maxillary right central incisor (tooth #8) following dental trauma 5 years ago. The tooth is discolored, completely non-responsive to thermal and electric pulp testing, and exhibits a 6mm well-circumscribed periapical radiolucency. Findings establish Pulpal Necrosis with Chronic Apical Abscess.",
    reportedInformation: [
      "Recurrent draining gum boil above upper right central incisor for 6 weeks",
      "Historical sports trauma 5 years ago",
      "No acute pain at present; periodic discharge",
    ],
    observedFindings: [
      "Tooth #8: Non-responsive to cold and electric pulp testing (non-vital)",
      "Tooth #8: Active sinus tract on attached gingiva tracing to apex",
      "Tooth #8: Coronal grayish discoloration",
      "Tooth #8: Well-circumscribed 6mm periapical radiolucency",
      "Normal circumferential sulcular depths of 2mm",
    ],
    inferredFindings: [
      "Impact trauma severed or thrombosed the apical neurovascular bundle 5 years ago, culminating in aseptic pulpal necrosis followed by secondary anaerobic colonization",
      "Bacterial egress through the apical foramen established a chronic periapical abscess that perforated the labial cortical plate to establish a fistulous drainage pathway",
    ],
    problemList: [
      "Pulpal necrosis (Tooth #8)",
      "Chronic apical abscess with draining cutaneous/mucosal sinus tract",
      "Coronal tooth discoloration",
    ],
    evidenceMap: [
      {
        finding: "Cold and EPT non-responsive",
        interpretation: "Complete loss of sensory innervation and blood supply",
        diagnosticRelevance: "Defines pulpal necrosis",
      },
      {
        finding: "Sinus tract on attached gingiva",
        interpretation: "Chronic drainage pathway through labial cortical plate",
        diagnosticRelevance: "Defines chronic apical abscess",
      },
    ],
    possibleDiagnoses: [
      {
        diagnosis: "Pulpal Necrosis with Chronic Apical Abscess",
        diagnosticCategory: "pulpal",
        likelihood: "high",
        confidenceReason:
          "Confirmed by complete non-vitality to thermal and electric pulp testing, patent sinus tract stoma tracing to apex, and visible periapical radiolucency.",
        rank: 1,
        supportingFindings: [
          "Zero response to cold testing",
          "EPT non-responsive at 80/80",
          "Active draining sinus tract stoma",
          "Well-defined 6mm periapical radiolucency",
          "Historical trauma and crown discoloration",
        ],
        contradictingFindings: [],
        evidenceType: "Multi-modal Sensibility and Periapical Examination",
        reasoning:
          "The combination of a non-vital pulpal response and a draining sinus tract is diagnostic for chronic apical abscess.",
        whyRanksHighest:
          "Complete lack of sensibility plus active drainage directly distinguishes necrotic pulp from vital inflammatory conditions.",
        evidenceMap: [
          {
            finding: "Cold and EPT non-responsive",
            interpretation: "Complete loss of sensory innervation and blood supply",
            diagnosticRelevance: "Defines pulpal necrosis",
          },
          {
            finding: "Sinus tract on attached gingiva",
            interpretation: "Chronic drainage pathway through labial cortical plate",
            diagnosticRelevance: "Defines chronic apical abscess",
          },
        ],
      },
      {
        diagnosis: "Periodontal Abscess",
        diagnosticCategory: "periodontal",
        likelihood: "low",
        confidenceReason:
          "Excluded by normal 2mm sulcular probing depths and proven non-vitality of tooth #8.",
        rank: 2,
        supportingFindings: ["Draining lesion on gingiva"],
        contradictingFindings: [
          "Normal 2mm probing depths without deep pocketing or calculus",
          "Tooth is non-vital (periodontal abscess teeth are typically vital)",
        ],
        evidenceType: "Periodontal Probing Differential",
        reasoning:
          "Periodontal abscesses arise from established deep pockets with vital pulpal sensibility.",
        whyRanksHighest: "",
        evidenceMap: [],
      },
    ],
    differentialDiagnosis: [
      {
        diagnosis: "Periapical Cyst / Radicular Cyst",
        whyConsidered:
          "Longstanding chronic periapical lesions often undergo cystic epithelial proliferation from the rests of Malassez.",
        supportingEvidence: [
          "Well-circumscribed periapical radiolucency",
          "Long duration (5 years post-trauma)",
        ],
        supportingFindings: ["Longstanding lesion", "Circumscribed border"],
        evidenceAgainst: [
          "Definitive differentiation between apical granuloma and apical cyst requires histopathological examination",
        ],
        whatWouldChangeRanking:
          "Histopathological biopsy or aspiration of straw-colored cholesterol-laden fluid.",
        missingEvidence: [
          "Histopathological analysis post-apicoectomy or non-surgical healing progression over 6 months",
        ],
      },
    ],
    contradictions: [],
    missingInformation: [
      {
        item: "Angled periapical radiograph with gutta-percha tracing cone in sinus tract",
        importance: "critical",
        whyItMatters:
          "To radiographically confirm that the sinus tract traces unequivocally to the apex of #8 and not a lateral canal or adjacent tooth #9.",
      },
    ],
    suggestedInvestigations: [
      "Sinus tract tracing radiograph using size #25 gutta percha point",
      "CBCT limited field-of-view if labial fenestration or internal/external root resorption is suspected",
    ],
    treatmentConsiderations: [
      "Non-surgical root canal therapy (RCT) of tooth #8 with calcium hydroxide intracanal interappointment medicament",
      "Closure of sinus tract expected within 10-14 days following adequate chemo-mechanical debridement",
      "Permanent obturation once drainage ceases and tooth is asymptomatic",
      "Internal non-vital walking bleach (sodium perborate) to resolve coronal discoloration, followed by bonded composite lingual access closure",
    ],
    redFlags: [
      "If sinus tract closes prematurely with acute pain and swelling, emergency drainage must be re-established",
    ],
    uncertainty: [
      "Whether the periapical radiolucency represents a true cyst requiring apical surgery if non-surgical RCT fails to resolve lesion over 12 months",
    ],
    decisionChangingEvidence: [
      "Presence of vertical root fracture on CBCT would necessitate extraction and implant planning rather than endodontic therapy",
    ],
    safetyNotes: [
      "Assistive clinical intelligence copilot. Licensed dental practitioner clinical confirmation required.",
    ],
  },
  review: null,
};

export const BENCHMARK_CASES: StoredCase[] = [
  BENCHMARK_CASE_PULPITIS,
  BENCHMARK_CASE_REVERSIBLE,
  BENCHMARK_CASE_NECROSIS,
];
