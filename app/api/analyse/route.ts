import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 300;

const CORE_DATASETS = [
  "conservation-area",
  "listed-building",
  "green-belt",
  "flood-risk-zone",
  "article-4-direction-area",
  "tree-preservation-zone",
  "brownfield-land"
];

const UK_POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i;

type Input = {
  address?: string;
  postcode?: string;
  siteArea?: string;
  currentUse?: string;
  planningRef?: string;
  notes?: string;
};

function cleanPostcode(value?: string) {
  if (!value) return undefined;
  const match = value.toUpperCase().match(UK_POSTCODE);
  if (!match) return undefined;
  const compact = match[1].replace(/\s+/g, "");
  return compact.slice(0, -3) + " " + compact.slice(-3);
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "FOX-Land-IQ/0.1" }
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${new URL(url).hostname}`);
  }
  return response.json();
}

async function gatherOpenData(address: string, suppliedPostcode?: string) {
  const postcode = cleanPostcode(suppliedPostcode) || cleanPostcode(address);
  const result: Record<string, unknown> = {
    postcode,
    postcodeLookup: null,
    planningDataConstraints: [],
    warnings: [] as string[]
  };

  let latitude: number | undefined;
  let longitude: number | undefined;

  if (postcode) {
    try {
      const pc = await fetchJson(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.replace(/\s/g, ""))}`
      );
      result.postcodeLookup = pc?.result ?? null;
      latitude = pc?.result?.latitude;
      longitude = pc?.result?.longitude;
    } catch (error) {
      (result.warnings as string[]).push(
        `Postcodes.io lookup failed: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }
  } else {
    (result.warnings as string[]).push(
      "No valid UK postcode was extracted. The AI must resolve the exact location through live research."
    );
  }

  try {
    const params = new URLSearchParams();
    if (typeof latitude === "number" && typeof longitude === "number") {
      params.set("latitude", String(latitude));
      params.set("longitude", String(longitude));
    } else if (postcode) {
      params.set("q", postcode);
    }
    for (const dataset of CORE_DATASETS) params.append("dataset", dataset);
    params.set("limit", "100");

    if (params.has("latitude") || params.has("q")) {
      const pd = await fetchJson(
        `https://www.planning.data.gov.uk/entity.json?${params.toString()}`
      );
      result.planningDataConstraints = pd?.entities ?? pd;
    }
  } catch (error) {
    (result.warnings as string[]).push(
      `Planning Data pre-screen failed: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }

  result.locationNote =
    "Postcode coordinates are postcode-centroid evidence, not parcel-boundary evidence. Planning Data coverage varies; no result is not proof of absence.";

  return result;
}

const appraisalSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "executive_summary",
    "policy_check",
    "planning_history",
    "constraints",
    "options",
    "routes",
    "strategies",
    "risks",
    "data_gaps",
    "sources",
    "professional_limitations"
  ],
  properties: {
    executive_summary: {
      type: "object",
      additionalProperties: false,
      required: [
        "site",
        "postcode",
        "local_planning_authority",
        "site_type",
        "site_area",
        "current_use",
        "development_suitability",
        "data_confidence",
        "best_development_concept",
        "likely_use_class",
        "strongest_consent_route",
        "indicative_capacity",
        "main_opportunity",
        "main_constraint",
        "immediate_next_step",
        "site_identification_confidence"
      ],
      properties: {
        site: { type: "string" },
        postcode: { type: "string" },
        local_planning_authority: { type: "string" },
        site_type: { type: "string" },
        site_area: { type: "string" },
        current_use: { type: "string" },
        development_suitability: { type: "integer", minimum: 0, maximum: 100 },
        data_confidence: { type: "integer", minimum: 0, maximum: 100 },
        best_development_concept: { type: "string" },
        likely_use_class: { type: "string" },
        strongest_consent_route: { type: "string" },
        indicative_capacity: { type: "string" },
        main_opportunity: { type: "string" },
        main_constraint: { type: "string" },
        immediate_next_step: { type: "string" },
        site_identification_confidence: {
          type: "string",
          enum: ["HIGH", "MEDIUM", "LOW"]
        }
      }
    },
    policy_check: {
      type: "object",
      additionalProperties: false,
      required: [
        "analysis_date",
        "national_policy_version",
        "local_plan",
        "emerging_plan",
        "summary",
        "relevant_policies"
      ],
      properties: {
        analysis_date: { type: "string" },
        national_policy_version: { type: "string" },
        local_plan: { type: "string" },
        emerging_plan: { type: "string" },
        summary: { type: "string" },
        relevant_policies: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["reference", "title", "status", "implication", "source_url"],
            properties: {
              reference: { type: "string" },
              title: { type: "string" },
              status: { type: "string" },
              implication: { type: "string" },
              source_url: { type: "string" }
            }
          }
        }
      }
    },
    planning_history: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["reference", "proposal", "date", "decision", "relevance", "source_url"],
        properties: {
          reference: { type: "string" },
          proposal: { type: "string" },
          date: { type: "string" },
          decision: { type: "string" },
          relevance: { type: "string" },
          source_url: { type: "string" }
        }
      }
    },
    constraints: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "status", "finding", "development_effect", "action", "source_url"],
        properties: {
          name: { type: "string" },
          status: { type: "string", enum: ["green", "amber", "red", "grey"] },
          finding: { type: "string" },
          development_effect: { type: "string" },
          action: { type: "string" },
          source_url: { type: "string" }
        }
      }
    },
    options: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "development",
          "use_class",
          "indicative_scale",
          "route",
          "suitability",
          "confidence",
          "score_breakdown",
          "supporting_factors",
          "key_risks"
        ],
        properties: {
          name: { type: "string" },
          development: { type: "string" },
          use_class: { type: "string" },
          indicative_scale: { type: "string" },
          route: { type: "string" },
          suitability: { type: "integer", minimum: 0, maximum: 100 },
          confidence: { type: "integer", minimum: 0, maximum: 100 },
          score_breakdown: {
            type: "object",
            additionalProperties: false,
            required: ["policy", "principle", "constraints", "access", "built_form", "history", "strategic_case"],
            properties: {
              policy: { type: "integer", minimum: 0, maximum: 30 },
              principle: { type: "integer", minimum: 0, maximum: 20 },
              constraints: { type: "integer", minimum: 0, maximum: 15 },
              access: { type: "integer", minimum: 0, maximum: 10 },
              built_form: { type: "integer", minimum: 0, maximum: 10 },
              history: { type: "integer", minimum: 0, maximum: 10 },
              strategic_case: { type: "integer", minimum: 0, maximum: 5 }
            }
          },
          supporting_factors: { type: "array", items: { type: "string" } },
          key_risks: { type: "array", items: { type: "string" } }
        }
      }
    },
    routes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["route", "eligibility", "score", "reason", "key_risk"],
        properties: {
          route: { type: "string" },
          eligibility: {
            type: "string",
            enum: ["ELIGIBLE", "POTENTIALLY ELIGIBLE", "NOT ELIGIBLE", "UNKNOWN"]
          },
          score: {
            anyOf: [
              { type: "integer", minimum: 0, maximum: 100 },
              { type: "null" }
            ]
          },
          reason: { type: "string" },
          key_risk: { type: "string" }
        }
      }
    },
    strategies: {
      type: "object",
      additionalProperties: false,
      required: ["low_risk", "balanced", "uplift", "opportunity_statement"],
      properties: {
        low_risk: { type: "string" },
        balanced: { type: "string" },
        uplift: { type: "string" },
        opportunity_statement: { type: "string" }
      }
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "risk", "response"],
        properties: {
          severity: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
          risk: { type: "string" },
          response: { type: "string" }
        }
      }
    },
    data_gaps: { type: "array", items: { type: "string" } },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url", "authority", "used_for"],
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          authority: { type: "string" },
          used_for: { type: "string" }
        }
      }
    },
    professional_limitations: { type: "string" }
  }
} as const;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Input;
    const address = body.address?.trim();

    if (!address || address.length < 5) {
      return NextResponse.json(
        { error: "Enter a site address, postcode, site name or planning reference." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not configured on the server. Add it as a secure environment variable before running AI appraisals."
        },
        { status: 503 }
      );
    }

    const openData = await gatherOpenData(address, body.postcode);
    const analysisDate = new Date().toISOString().slice(0, 10);
    const client = new OpenAI({ apiKey });

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
      reasoning: { effort: "high" },
      tools: [{ type: "web_search", search_context_size: "high" }],
      instructions: SYSTEM_PROMPT,
      input: buildUserPrompt({
        address,
        postcode: body.postcode,
        siteArea: body.siteArea,
        currentUse: body.currentUse,
        planningRef: body.planningRef,
        notes: body.notes,
        openData,
        analysisDate
      }),
      text: {
        format: {
          type: "json_schema",
          name: "fox_land_iq_appraisal",
          strict: true,
          schema: appraisalSchema
        }
      }
    } as any);

    const text = response.output_text;
    if (!text) throw new Error("The model returned no appraisal output.");

    const appraisal = JSON.parse(text);

    // Recalculate displayed suitability from the component score to guard against arithmetic drift.
    appraisal.options = (appraisal.options || []).map((option: any) => {
      const b = option.score_breakdown;
      const calculated =
        Number(b?.policy || 0) +
        Number(b?.principle || 0) +
        Number(b?.constraints || 0) +
        Number(b?.access || 0) +
        Number(b?.built_form || 0) +
        Number(b?.history || 0) +
        Number(b?.strategic_case || 0);
      return { ...option, suitability: Math.max(0, Math.min(100, calculated)) };
    });

    if (appraisal.options?.length) {
      const best = [...appraisal.options].sort(
        (a: any, b: any) => b.suitability - a.suitability
      )[0];
      appraisal.executive_summary.development_suitability = best.suitability;
    }

    return NextResponse.json({
      appraisal,
      open_data: openData,
      meta: {
        generated_at: new Date().toISOString(),
        model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
        methodology: "FOX Land IQ v0.1"
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while generating the appraisal."
      },
      { status: 500 }
    );
  }
}
