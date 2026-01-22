import { Request, Response } from "express";
import { db } from "../db";
import { contactsTable, companiesTable } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { asyncHandler } from "../utils/asyncHandler";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI - automatically picks up GEMINI_API_KEY from environment
const ai = new GoogleGenAI({});

interface ParseRequest {
  text: string;
  llm: string;
}

interface ParseResponse {
  name: string | null;
  email: string | null;
  phone: string | null;
  found_in_database: boolean;
  company: string | null;
}

interface LLMExtraction {
  name: string | null;
  email: string | null;
  phone: string | null;
}

// JSON Schema for contact extraction (Gemini structured outputs)
const contactExtractionSchema = {
  type: "object" as const,
  properties: {
    name: {
      type: ["string", "null"] as const,
      description: "The person's full name, or null if not found"
    },
    email: {
      type: ["string", "null"] as const,
      description: "The email address, or null if not found"
    },
    phone: {
      type: ["string", "null"] as const,
      description: "The phone number, or null if not found"
    }
  },
  required: ["name", "email", "phone"] as const
};

/**
 * Extract contact information from text using LLM with structured outputs
 */
async function extractContactInfo(text: string, llmModel: string): Promise<LLMExtraction> {
  try {
    if (llmModel.startsWith("gemini")) {
      const prompt = `Extract contact information from the following text. 
Look for the person's name, email address, and phone number.
If any field is not found in the text, return null for that field.

Text: ${text}`;

      // Use Gemini API with structured outputs
      const response = await ai.models.generateContent({
        model: llmModel,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: contactExtractionSchema,
        },
      });

      const extracted = JSON.parse(response.text ?? "{}");
      return {
        name: extracted.name ?? null,
        email: extracted.email ?? null,
        phone: extracted.phone ?? null,
      };
    } else {
      throw new Error(`Unsupported LLM model: ${llmModel}`);
    }
  } catch (error) {
    console.error("Error extracting contact info:", error);
    throw error;
  }
}

/**
 * Search for contact in database by name
 */
async function findContactInDatabase(name: string | null): Promise<{ found: boolean; company: string | null }> {
  if (!name) {
    return { found: false, company: null };
  }

  try {
    // Search for contact with matching name (case-insensitive)
    const results = await db
      .select({
        contact_id: contactsTable.contact_id,
        first_name: contactsTable.first_name,
        last_name: contactsTable.last_name,
        company_name: companiesTable.name,
      })
      .from(contactsTable)
      .leftJoin(companiesTable, eq(contactsTable.company_id, companiesTable.company_id))
      .where(
        sql`CONCAT(${contactsTable.first_name}, ' ', ${contactsTable.last_name}) ILIKE ${`%${name}%`}`
      );

    if (results.length > 0) {
      return {
        found: true,
        company: results[0].company_name || null,
      };
    }

    return { found: false, company: null };
  } catch (error) {
    console.error("Error searching database:", error);
    return { found: false, company: null };
  }
}

/**
 * POST /parse
 * Parse contact information from text and validate against database
 */
export const parseContact = asyncHandler(async (req: Request, res: Response) => {
  const { text, llm }: ParseRequest = req.body;

  // Validate required fields
  if (!text || !llm) {
    return res.status(400).json({
      error: "Missing required fields: text and llm",
    });
  }

  // Extract contact info using LLM
  const extracted = await extractContactInfo(text, llm);

  // Search database for contact
  const dbResult = await findContactInDatabase(extracted.name);

  // Build response
  const response: ParseResponse = {
    name: extracted.name,
    email: extracted.email,
    phone: extracted.phone,
    found_in_database: dbResult.found,
    company: dbResult.company,
  };

  return res.status(200).json(response);
});

/**
 * GET /health
 * Health check endpoint
 */
export const healthCheck = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Test database connection
    await db.select().from(contactsTable).limit(1);
    
    return res.status(200).json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    return res.status(200).json({
      status: "ok",
      database: "disconnected",
    });
  }
});
