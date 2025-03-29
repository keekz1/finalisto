import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string; friendId: string } }
) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get parameters from dynamic route
    const { userId, friendId } = params;

    if (!userId || !friendId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Check friendship existence
    const friendship = await db.friendship.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: friendId },
          { userAId: friendId, userBId: userId }
        ]
      }
    });

    if (!friendship) {
      return NextResponse.json(
        { error: "No friendship found between users" },
        { status: 403 }
      );
    }

    // Pagination handling
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const cursor = searchParams.get("cursor");

    // Fetch messages
    const messages = await db.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId }
        ]
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        receiver: { select: { id: true, name: true, image: true } }
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined
    });

    // Handle pagination
    const nextCursor = messages.length > limit ? messages.pop()?.id : null;

    return NextResponse.json(
      {
        data: messages,
        pagination: { nextCursor, hasMore: !!nextCursor }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}