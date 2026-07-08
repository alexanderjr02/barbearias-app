import { NextRequest } from "next/server";
import { GET as legacyGET, PUT as legacyPUT } from "../../../../staff/[id]/availability/route";
import { relay } from "@/lib/api/relay";

type Ctx = { params: Promise<{ id: string }> };

export const GET = (request: NextRequest, ctx: Ctx) => relay(legacyGET, request, ctx);
export const PUT = (request: NextRequest, ctx: Ctx) => relay(legacyPUT, request, ctx);
