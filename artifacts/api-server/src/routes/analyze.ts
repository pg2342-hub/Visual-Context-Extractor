import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { AnalyzeImageBody, AnalyzeImageResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

function isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
  return (SUPPORTED_MIME_TYPES as readonly string[]).includes(mimeType);
}

const EXTRACTION_PROMPT = `You are an expert image analyst. Analyze the provided image and extract structured information.

Return ONLY a valid JSON object with exactly these fields (no markdown, no extra text):
{
  "summary": "A concise 1-3 sentence description of what the image depicts",
  "subjects": ["list", "of", "main", "subjects", "or", "objects"],
  "setting": "The environment, location, or context of the image",
  "colors": ["dominant", "color", "names"],
  "mood": "The overall mood, tone, or emotion conveyed by the image",
  "text_content": "Any readable text visible in the image, or empty string if none",
  "tags": ["relevant", "descriptive", "keyword", "tags"],
  "technical_details": {
    "composition": "Description of the image composition and framing",
    "lighting": "Description of the lighting conditions",
    "quality": "Assessment of image quality and clarity"
  }
}`;

router.post("/analyze", async (req, res) => {
  const parseResult = AnalyzeImageBody.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.message,
    });
    return;
  }

  const { imageData, mimeType } = parseResult.data;

  if (!isSupportedMimeType(mimeType)) {
    res.status(400).json({
      error: "Unsupported file type",
      details: `Supported types are: ${SUPPORTED_MIME_TYPES.join(", ")}`,
    });
    return;
  }

  if (!imageData || imageData.trim().length === 0) {
    res.status(400).json({
      error: "Missing image data",
      details: "imageData must be a non-empty base64 string",
    });
    return;
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: imageData,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const block = message.content[0];
    if (!block || block.type !== "text") {
      res.status(500).json({
        error: "Invalid AI response",
        details: "Claude returned an unexpected response format",
      });
      return;
    }

    let parsed: unknown;
    try {
      const rawText = block.text.trim();
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : rawText;
      parsed = JSON.parse(jsonStr);
    } catch {
      res.status(500).json({
        error: "Failed to parse AI response",
        details: "Claude returned a response that could not be parsed as JSON",
      });
      return;
    }

    const validated = AnalyzeImageResponse.safeParse(parsed);
    if (!validated.success) {
      res.status(500).json({
        error: "Invalid AI response structure",
        details: validated.error.message,
      });
      return;
    }

    res.json(validated.data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Analyze error:", error);
    res.status(500).json({
      error: "AI API call failed",
      details: message,
    });
  }
});

export default router;
