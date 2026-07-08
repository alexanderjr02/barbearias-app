import { NextRequest } from "next/server";
import { DELETE as legacyDELETE } from "../../../../../staff/[id]/time-off/[timeOffId]/route";
import { relay } from "@/lib/api/relay";

type Ctx = { params: Promise<{ id: string; timeOffId: string }> };

export const DELETE = (request: NextRequest, ctx: Ctx) => relay(legacyDELETE, request, ctx);
