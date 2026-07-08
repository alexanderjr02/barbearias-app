import { NextRequest } from "next/server";
import { PATCH as legacyPATCH } from "../../../clients/[id]/route";
import { relay } from "@/lib/api/relay";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = (request: NextRequest, ctx: Ctx) => relay(legacyPATCH, request, ctx);
