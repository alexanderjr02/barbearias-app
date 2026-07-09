import { NextRequest } from "next/server";
import { GET as legacyGET, POST as legacyPOST, PATCH as legacyPATCH } from "../../../../support/tickets/[id]/route";
import { relay } from "@/lib/api/relay";

type Ctx = { params: Promise<{ id: string }> };

export const GET = (request: NextRequest, ctx: Ctx) => relay(legacyGET, request, ctx);
export const POST = (request: NextRequest, ctx: Ctx) => relay(legacyPOST, request, ctx);
export const PATCH = (request: NextRequest, ctx: Ctx) => relay(legacyPATCH, request, ctx);
