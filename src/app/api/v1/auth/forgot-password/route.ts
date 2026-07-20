import { NextRequest } from "next/server";
import { POST as legacyPOST } from "../../../auth/forgot-password/route";
import { relay } from "@/lib/api/relay";

export const POST = (request: NextRequest) => relay(legacyPOST, request);
