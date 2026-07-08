import { NextRequest } from "next/server";
import { GET as legacyGET, POST as legacyPOST } from "../../../../staff/[id]/time-off/route";
import { relay } from "@/lib/api/relay";

type Ctx = { params: Promise<{ id: string }> };

export const GET = (request: NextRequest, ctx: Ctx) => relay(legacyGET, request, ctx);
export const POST = (request: NextRequest, ctx: Ctx) => relay(legacyPOST, request, ctx);
