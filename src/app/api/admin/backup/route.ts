import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireSuperAdminSession, denyAdmin } from "@/lib/apiAuth";
import { logAdminAction } from "@/lib/audit";

// GET /api/admin/backup — downloads the current SQLite database file
// directly. No scheduled/automated backup exists (no cron infra anywhere in
// this app) — this is the honest, real equivalent: a one-click manual copy.
export async function GET() {
  const session = await requireSuperAdminSession();
  if (!session) {
    return denyAdmin();
  }

  const dbPath = path.join(process.cwd(), "dev.db");
  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(dbPath);
  } catch {
    return NextResponse.json({ error: "Não foi possível ler o arquivo do banco" }, { status: 500 });
  }

  await logAdminAction({ actorId: session.sub, action: "system.backup_downloaded", targetType: "System", targetId: "dev.db" });

  const filename = `cortix-backup-${new Date().toISOString().slice(0, 10)}.db`;
  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": "application/x-sqlite3",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
