import { NextResponse } from "next/server";
import { completeInterviewSession } from "@/features/interview-session/server/services/complete-interview-session";
import { verifySessionAccess } from "@/features/interview-session/server/services/verify-session-access";
import {
  isInvalidOptionalBooleanInput,
  parseOptionalBoolean,
} from "@/features/interview-session/shared/utils/optional-boolean";

export async function POST(req: Request) {
  const { sessionId, isPublic, isDataReuseConsented, preview } =
    await req.json();
  const isPublicByUser = parseOptionalBoolean(isPublic);
  const dataReuseConsented = parseOptionalBoolean(isDataReuseConsented);

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  if (isInvalidOptionalBooleanInput(isPublic)) {
    return NextResponse.json(
      { error: "Invalid isPublic value" },
      { status: 400 }
    );
  }

  if (isInvalidOptionalBooleanInput(isDataReuseConsented)) {
    return NextResponse.json(
      { error: "Invalid isDataReuseConsented value" },
      { status: 400 }
    );
  }

  // プレビュー（職員確認）からの完了は、トークンが有効なら参加条件を問わない
  const previewCredential =
    typeof preview?.policyId === "string" && typeof preview?.token === "string"
      ? { policyId: preview.policyId, token: preview.token }
      : undefined;
  const ownershipResult = await verifySessionAccess(sessionId, {
    preview: previewCredential,
  });
  if (!ownershipResult.authorized) {
    return NextResponse.json({ error: ownershipResult.error }, { status: 403 });
  }

  try {
    const report = await completeInterviewSession({
      sessionId,
      isPublicByUser,
      isDataReuseConsented: dataReuseConsented,
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Complete interview error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to complete interview",
      },
      { status: 500 }
    );
  }
}
