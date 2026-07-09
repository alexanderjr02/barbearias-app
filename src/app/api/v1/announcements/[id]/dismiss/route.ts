import { NextRequest } from "next/server";
import { POST as legacyPOST } from "../../../../announcements/[id]/dismiss/route";
import { relay } from "@/lib/api/relay";

type Ctx = { params: Promise<{ id: string }> };

export const POST = (request: NextRequest, ctx: Ctx) => relay(legacyPOST, request, ctx);
