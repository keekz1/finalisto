// app/api/messages/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { adminDb } from "@/lib/firebase-admin"; // Your Firebase Admin instance
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId, text, chatId } = await req.json();
    const pathSegments = req.nextUrl.pathname.split('/');
    const userId = pathSegments[3];
    const friendId = pathSegments[4];

    if (!userId || !friendId || !messageId || !text || !chatId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (currentUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update with Admin SDK
    await adminDb.doc(`chats/${chatId}/messages/${messageId}`).update({
      status: "sent",
      validatedAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}