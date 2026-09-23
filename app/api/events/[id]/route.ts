import { config } from "@/db";
import { getEventDetail, seedSamples } from "@/lib/events";
import { boundary, json, ApiError } from "@/lib/server";
export const GET = (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) =>
  boundary(async () => {
    await seedSamples();
    const e = await getEventDetail((await params).id);
    if (
      !e ||
      !e.published ||
      (e.sample === 1 && config().SEED_SAMPLE_EVENTS === "false")
    )
      throw new ApiError(404, "ایونت پیدا نشد.");
    return json({ event: e });
  });
