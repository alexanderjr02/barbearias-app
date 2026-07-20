import { NextRequest } from "next/server";
import { GET as legacyGET, PUT as legacyPUT } from "../../../client/preferences/route";
import { relay } from "@/lib/api/relay";

export const GET = (request: NextRequest) => relay(legacyGET, request);
export const PUT = (request: NextRequest) => relay(legacyPUT, request);
