import { NextRequest } from "next/server";
import { PATCH as legacyPATCH, DELETE as legacyDELETE } from "../../../appointments/[id]/route";
import { relay } from "@/lib/api/relay";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = (request: NextRequest, ctx: Ctx) => relay(legacyPATCH, request, ctx);
export const DELETE = (request: NextRequest, ctx: Ctx) => relay(legacyDELETE, request, ctx);
