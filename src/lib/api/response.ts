import { NextResponse } from "next/server";

// Standard envelope for /api/v1/* — shared by the web app and the future
// Flutter client, so both consume the same documented shape.
export function ok<T>(data: T, init?: { status?: number }) {
  return NextResponse.json({ data, error: null }, { status: init?.status ?? 200 });
}

export function fail(message: string, status: number) {
  return NextResponse.json({ data: null, error: message }, { status });
}
