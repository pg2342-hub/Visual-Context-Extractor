import { useMutation } from "@tanstack/react-query";
import type { 
  AnalyzeImageRequest, 
  AnalyzeImageResponse,
  ErrorResponse 
} from "../../../lib/api-client-react/src/generated/api.schemas";
import { fileToBase64 } from "@/lib/utils";

export function useAnalyzeImage() {
  return useMutation<AnalyzeImageResponse, Error, File>({
    mutationFn: async (file: File) => {
      // 1. Convert file to base64
      const base64Data = await fileToBase64(file);
      
      const payload: AnalyzeImageRequest = {
        imageData: base64Data,
        mimeType: file.type
      };

      // 2. Perform the fetch request
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      // 3. Handle errors based on status code
      if (!response.ok) {
        let errorMessage = 'An unknown error occurred';
        try {
          const errorData = await response.json() as ErrorResponse;
          errorMessage = errorData.error || errorMessage;
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`;
          }
        } catch (e) {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      // 4. Return parsed success data
      return (await response.json()) as AnalyzeImageResponse;
    }
  });
}
