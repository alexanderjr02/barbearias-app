import { NextRequest } from "next/server";
import { GET as legacyGET } from "../../loyalty/route";
import { relay } from "@/lib/api/relay";

export const GET = (request: NextRequest) => relay(legacyGET, request);
