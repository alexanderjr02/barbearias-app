import { NextRequest } from "next/server";
import { DELETE as legacyDELETE } from "../../../../client/waitlist/[id]/route";
import { relay } from "@/lib/api/relay";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = (request: NextRequest, ctx: Ctx) => relay(legacyDELETE, request, ctx);
