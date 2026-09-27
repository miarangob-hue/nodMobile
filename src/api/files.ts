import * as FileSystem from "expo-file-system/legacy";
import { apiRequest } from "./client";
import type { UploadFileResponse } from "../types/api";

type UploadFilePayload = {
  providerId: string;
  documentType: string;
  fileUri: string;
  accessToken?: string | null;
};

export async function uploadFile({ providerId, documentType, fileUri, accessToken }: UploadFilePayload) {
  const mimeType = getMimeType(fileUri);
  const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64
  });

  return apiRequest<UploadFileResponse>("/upload-file", {
    method: "POST",
    accessToken,
    body: {
      provider_id: providerId,
      document_type: documentType,
      file_name: `${documentType}.${mimeType === "image/png" ? "png" : "jpg"}`,
      mime_type: mimeType,
      file_base64: `data:${mimeType};base64,${fileBase64}`
    }
  });
}

function getMimeType(fileUri: string) {
  const normalizedUri = fileUri.toLowerCase();

  if (normalizedUri.endsWith(".png")) {
    return "image/png";
  }

  return "image/jpeg";
}
