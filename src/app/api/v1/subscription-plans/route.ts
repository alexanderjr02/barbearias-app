import { NextRequest } from "next/server";
import { GET as legacyGET, POST as legacyPOST } from "../../subscription-plans/route";
import { relay } from "@/lib/api/relay";

export const GET = (request: NextRequest) => relay(legacyGET, request);
export const POST = (request: NextRequest) => relay(legacyPOST, request);
