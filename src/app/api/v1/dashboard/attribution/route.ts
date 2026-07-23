import { NextRequest } from "next/server";
import { GET as webGET, PATCH as webPATCH } from "../../../dashboard/attribution/route";
import { relay } from "@/lib/api/relay";

// v1 para o app mobile: reaproveita os handlers do web (fonte única da lógica)
// e reembrulha no envelope { data, error }.
export const GET = (request: NextRequest) => relay(webGET, request);
export const PATCH = (request: NextRequest) => relay(webPATCH, request);
