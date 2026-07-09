import { NextRequest } from "next/server";
import { GET as legacyGET, PATCH as legacyPATCH } from "../../onboarding/route";
import { relay } from "@/lib/api/relay";

export const GET = (request: NextRequest) => relay(legacyGET, request);
export const PATCH = (request: NextRequest) => relay(legacyPATCH, request);
