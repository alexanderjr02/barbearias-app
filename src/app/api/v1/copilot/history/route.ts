import { NextRequest } from "next/server";
import { GET as legacyGET, DELETE as legacyDELETE } from "../../../copilot/history/route";
import { relay } from "@/lib/api/relay";

export const GET = (request: NextRequest) => relay(legacyGET, request);
export const DELETE = (request: NextRequest) => relay(legacyDELETE, request);
