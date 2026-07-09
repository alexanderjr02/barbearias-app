import { prisma } from "./db";

// Records who did what to what from the SUPER_ADMIN panel. Failure to write
// an audit row must never take down the mutation it's logging, so this is
// deliberately fire-and-forget with its own error boundary.
export async function logAdminAction(params: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record action", params.action, error);
  }
}
