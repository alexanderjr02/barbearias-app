// Transactional email sending — Resend by default (REST API, no SDK needed).
//
// Configure via env:
//   RESEND_API_KEY   — your Resend API key (starts with "re_")
//   EMAIL_FROM       — verified sender, e.g. "CORTIX <nao-responda@seudominio.com>"
//   APP_URL          — optional base URL used to build links in emails; when
//                      unset, routes fall back to the request's own origin.
//
// When RESEND_API_KEY is absent (local dev before credentials are wired), we
// don't fail — we log the message (and any link) to the server console so the
// whole flow is testable immediately. Swapping providers later means changing
// only this file.

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const DEFAULT_FROM = "CORTIX <onboarding@resend.dev>";

// Há provedor de e-mail configurado? Quem chama usa isto para distinguir
// "não enviei porque falhou" de "não enviei porque ninguém ligou o e-mail
// ainda" — a diferença entre um alerta perdido e um alerta que nunca teve
// para onde ir.
export function isMailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendMail({ to, subject, html, text }: SendMailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  if (!apiKey) {
    // Dev fallback — no provider configured yet.
    console.warn(
      `[mailer] RESEND_API_KEY não configurado — e-mail NÃO enviado.\n` +
        `  Para: ${to}\n  Assunto: ${subject}\n\n${text}\n`
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // Surface a clean error to the caller; never leak the API key.
    throw new Error(`Falha ao enviar e-mail (${res.status}): ${detail.slice(0, 300)}`);
  }

  // Rastro do que saiu. Sem isto, um e-mail que não chega é indistinguível de
  // um e-mail que nunca foi tentado: quem investiga fica sem saber se olha o
  // spam, o provedor ou o código. O id é o mesmo que aparece no painel da
  // Resend, então dá para seguir a entrega de ponta a ponta. Nunca registra o
  // corpo — ele carrega link de redefinição de senha.
  const { id } = ((await res.json().catch(() => ({}))) as { id?: string }) ?? {};
  console.log(`[mailer] enviado id=${id ?? "?"} de=${from} para=${to} assunto="${subject}"`);
}

// Branded password-reset email. Kept plain and inline-styled so it renders
// consistently across mail clients (no external CSS/fonts).
export function passwordResetEmail(name: string, resetUrl: string): { subject: string; html: string; text: string } {
  const firstName = name.trim().split(/\s+/)[0] || "";
  const greeting = firstName ? `Olá, ${firstName}!` : "Olá!";
  const subject = "Redefinição de senha · CORTIX";

  const text =
    `${greeting}\n\n` +
    `Recebemos um pedido para redefinir a senha da sua conta CORTIX.\n` +
    `Abra o link abaixo para criar uma nova senha (válido por 1 hora):\n\n` +
    `${resetUrl}\n\n` +
    `Se você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.\n\n` +
    `Equipe CORTIX`;

  const html = `<!-- password reset -->
<div style="background:#09090b;padding:32px 0;font-family:Inter,system-ui,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#18181b;border:1px solid #27272a;border-radius:20px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#fbbf24,#d97706);padding:24px 28px;">
      <span style="font-size:22px;font-weight:900;color:#18181b;letter-spacing:1px;">CORT<span style="color:#7c2d12;">IX</span></span>
    </div>
    <div style="padding:28px;">
      <h1 style="margin:0 0 8px;font-size:20px;color:#fafafa;">${greeting}</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#a1a1aa;">
        Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha. O link expira em <strong style="color:#fbbf24;">1 hora</strong>.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#18181b;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:14px;">
        Redefinir minha senha
      </a>
      <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#71717a;">
        Se o botão não funcionar, copie e cole este endereço no navegador:<br/>
        <span style="color:#a1a1aa;word-break:break-all;">${resetUrl}</span>
      </p>
      <hr style="border:none;border-top:1px solid #27272a;margin:24px 0;"/>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;">
        Se você não solicitou a redefinição, ignore este e-mail — sua senha continua a mesma.
      </p>
    </div>
  </div>
</div>`;

  return { subject, html, text };
}

// Alerta operacional da PLATAFORMA para o dono do sistema (você) — cobrança
// falhou, barbearia suspensa, login de IP novo, health score caindo. Não vai
// para barbearia nem para cliente final.
export function platformAlertEmail(
  subject: string,
  body: string,
  metadata?: Record<string, unknown>
): { subject: string; html: string; text: string } {
  const detailLines = metadata
    ? Object.entries(metadata).map(([k, v]) => `${k}: ${String(v)}`)
    : [];

  const text =
    `${body}\n` +
    (detailLines.length ? `\nDetalhes:\n${detailLines.join("\n")}\n` : "") +
    `\n— CORTIX (alerta automático da plataforma)`;

  const detailHtml = detailLines.length
    ? `<div style="margin-top:20px;padding:14px 16px;background:#09090b;border:1px solid #27272a;border-radius:12px;">
        ${detailLines
          .map(
            (l) =>
              `<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:#a1a1aa;line-height:1.8;">${escapeHtml(l)}</div>`
          )
          .join("")}
      </div>`
    : "";

  const html = `<!-- platform alert -->
<div style="background:#09090b;padding:32px 0;font-family:Inter,system-ui,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#18181b;border:1px solid #27272a;border-radius:20px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#fbbf24,#d97706);padding:24px 28px;">
      <span style="font-size:22px;font-weight:900;color:#18181b;letter-spacing:1px;">CORT<span style="color:#7c2d12;">IX</span></span>
    </div>
    <div style="padding:28px;">
      <h1 style="margin:0 0 12px;font-size:18px;color:#fafafa;">${escapeHtml(subject)}</h1>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#a1a1aa;">${escapeHtml(body)}</p>
      ${detailHtml}
      <hr style="border:none;border-top:1px solid #27272a;margin:24px 0;"/>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;">
        Alerta automático da plataforma. Você pode desligar este tipo de aviso no painel administrativo.
      </p>
    </div>
  </div>
</div>`;

  return { subject: `${subject} · CORTIX`, html, text };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}
