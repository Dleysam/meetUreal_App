import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const verifyUserPhoto = async (liveSelfieBase64: string, referencePhotoBase64?: string): Promise<{ isReal: boolean; reason: string }> => {
  try {
    // Clean base64 strings
    const cleanSelfie = liveSelfieBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
    
    // Fix: Explicitly type parts as any[] to allow mixed content parts (text and inlineData)
    const parts: any[] = [
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanSelfie,
        },
      }
    ];

    let prompt = "Analyze this image for a dating app verification. CRITICAL LIVENESS CHECK: 1. Must be a real human face. 2. Must be a live selfie taken by the person holding the phone. 3. STRICTLY REJECT if it is a photo of a screen, a photo of a printed photo, a deepfake, or has moire patterns/pixel grids visible. 4. Reject if face is obstructed. Return JSON with boolean isReal and string reason.";

    if (referencePhotoBase64) {
      const cleanRef = referencePhotoBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanRef,
        },
      });
      prompt = "COMPARE these two images. Image 1 is a LIVE SELFIE verification attempt. Image 2 is the USER PROFILE PHOTO. \n\nTASKS:\n1. Check Image 1 for LIVENESS (not a screen, not a printed photo, real human).\n2. COMPARE Image 1 and Image 2. Do they depict the SAME PERSON?\n\nStrictly return `isReal: false` if they do not look like the same person or if Image 1 is not live. Return JSON with boolean isReal and string reason.";
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: parts,
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isReal: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
          },
          required: ["isReal", "reason"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      isReal: result.isReal ?? false,
      reason: result.reason ?? "Verification failed.",
    };
  } catch (error) {
    console.error("Gemini verification failed:", error);
    return { isReal: false, reason: "Service unavailable." };
  }
};