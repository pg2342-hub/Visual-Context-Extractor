import { useMutation } from "@tanstack/react-query";
import { fileToBase64 } from "@/lib/utils";
import type { ProjectAnalysisMemorySnapshot, ProjectFinding } from "@workspace/api-client-react";

export type AnalysisMode =
  | "summarize"
  | "extract_data_points"
  | "identify_ui_elements"
  | "describe_code"
  | "system_design";

export interface AnalysisRequest {
  files: File[];
  mode: AnalysisMode;
  projectId?: number;
}

export interface TechnicalDetails {
  composition: string;
  lighting: string;
  quality: string;
}

export interface AnalysisResponse {
  summary: string;
  text_content: string;
  tags: string[];
  technical_details: TechnicalDetails;
  mode_result: Record<string, unknown>;
  analysisRunId?: number;
  candidate_findings?: ProjectFinding[];
  memory_used?: ProjectAnalysisMemorySnapshot;
}

export function useAnalyzeImage() {
  return useMutation<AnalysisResponse, Error, AnalysisRequest>({
    mutationFn: async ({ files, mode, projectId }) => {
      const images = await Promise.all(
        files.map(async (file) => ({
          imageData: await fileToBase64(file),
          mimeType: file.type,
          fileName: file.name,
        }))
      );

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, mode, ...(projectId ? { projectId } : {}) }),
      });

      if (!response.ok) {
        let errorMessage = "An unknown error occurred";
        try {
          const errorData = await response.json() as { error?: string; details?: string };
          errorMessage = errorData.error || errorMessage;
          if (errorData.details) errorMessage += `: ${errorData.details}`;
        } catch {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      return response.json() as Promise<AnalysisResponse>;
    },
  });
}
