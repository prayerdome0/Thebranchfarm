import { DEMO_VIDEOS } from "@/lib/store";
import { ApiError, errorResponse, getAdmin, requireStaff } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

/** GET /api/videos — public farm videos (demo films when no backend is configured). */
export async function GET() {
  const admin = getAdmin();
  if (admin) {
    try {
      const snapshot = await admin.db.collection("videos").orderBy("createdAt", "desc").limit(200).get();
      if (snapshot.size) {
        return Response.json({
          source: "firestore",
          count: snapshot.size,
          videos: snapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
            return { id: doc.id, ...data, createdAt: createdAt?.toDate?.().toISOString() ?? data.createdAt };
          }),
        });
      }
    } catch {
      /* fall through to demo */
    }
  }
  const videos = DEMO_VIDEOS.map((video, index) => ({
    ...video,
    id: `demo-video-${index + 1}`,
  }));
  return Response.json({ source: "demo", count: videos.length, videos });
}

/** POST /api/videos — staff publish a farm video (uploaded via Cloudinary or Firebase Storage). */
export async function POST(request: Request) {
  try {
    const { db, actor } = await requireStaff(request);
    const body = (await request.json()) as Record<string, unknown>;
    const title = String(body.title || "").trim();
    const videoUrl = String(body.videoUrl || "").trim();
    if (title.length < 2) throw new ApiError(400, "Enter a title for the video.");
    if (!videoUrl) throw new ApiError(400, "Provide the videoUrl of the uploaded video.");

    const payload = {
      ...body,
      title,
      videoUrl,
      storagePath: String(body.storagePath || ""),
      posterUrl: body.posterUrl ? String(body.posterUrl) : "",
      posterPath: body.posterPath ? String(body.posterPath) : "",
      createdBy: actor.uid,
      createdByName: actor.name,
      createdAt: new Date(),
      archived: false,
    };
    const ref = await db.collection("videos").add(payload);
    return Response.json({ id: ref.id, ...payload }, { status: 201 });
  } catch (cause) {
    return errorResponse(cause);
  }
}
