// Provider-agnostic NFS-e (nota fiscal de serviço) issuing, mirroring the shape
// of src/lib/payments.ts. A barbershop connects a fiscal integrator at deploy
// time; until then invoices run in a simulated mode (see /api/invoices).
//
// Concrete integration: Focus NFe (https://focusnfe.com.br) — the most common
// NFS-e gateway in Brazil. NFe.io is stubbed as an extension point.

export type FiscalProvider = "FOCUSNFE" | "NFEIO";
export const FISCAL_PROVIDERS: FiscalProvider[] = ["FOCUSNFE", "NFEIO"];

export function isFiscalProvider(v: unknown): v is FiscalProvider {
  return typeof v === "string" && (FISCAL_PROVIDERS as string[]).includes(v);
}

export type InvoiceStatus = "processing" | "authorized" | "error" | "cancelled";

export interface IssueInvoiceInput {
  ref: string; // our unique reference (the ServiceInvoice id)
  cnpjPrestador: string;
  municipalServiceCode: string;
  issRate: number; // %
  amount: number;
  description: string;
  clientName: string;
  clientDoc?: string | null; // CPF/CNPJ do tomador
}

export interface IssueInvoiceResult {
  status: InvoiceStatus;
  providerRef?: string;
  number?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  message?: string;
}

const FOCUS_BASE = process.env.FOCUSNFE_BASE_URL || "https://api.focusnfe.com.br";

function basicAuth(token: string): string {
  return "Basic " + Buffer.from(`${token}:`).toString("base64");
}

// Focus NFe status strings → our normalized status.
function mapFocusStatus(s: unknown): InvoiceStatus {
  switch (s) {
    case "autorizado":
      return "authorized";
    case "cancelado":
      return "cancelled";
    case "erro_autorizacao":
    case "rejeitado":
      return "error";
    default:
      return "processing";
  }
}

interface FocusResponse {
  status?: string;
  numero?: string;
  url?: string;
  caminho_xml_nota_fiscal?: string;
  mensagem?: string;
  erros?: { mensagem?: string }[];
}

async function focusIssue(apiKey: string, input: IssueInvoiceInput): Promise<IssueInvoiceResult> {
  const body = {
    data_emissao: new Date().toISOString(),
    prestador: { cnpj: input.cnpjPrestador.replace(/\D/g, "") },
    servico: {
      aliquota: input.issRate,
      discriminacao: input.description,
      iss_retido: false,
      item_lista_servico: input.municipalServiceCode,
      valor_servicos: Number(input.amount.toFixed(2)),
    },
    tomador: {
      razao_social: input.clientName,
      ...(input.clientDoc ? { cpf: input.clientDoc.replace(/\D/g, "") } : {}),
    },
  };

  const res = await fetch(`${FOCUS_BASE}/v2/nfse?ref=${encodeURIComponent(input.ref)}`, {
    method: "POST",
    headers: { Authorization: basicAuth(apiKey), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as FocusResponse;

  if (!res.ok && res.status !== 202) {
    return { status: "error", message: data.mensagem || data.erros?.[0]?.mensagem || `Falha ao emitir (HTTP ${res.status})` };
  }
  return {
    status: mapFocusStatus(data.status),
    providerRef: input.ref,
    number: data.numero,
    pdfUrl: data.url,
    xmlUrl: data.caminho_xml_nota_fiscal,
    message: data.status,
  };
}

async function focusStatus(apiKey: string, ref: string): Promise<IssueInvoiceResult> {
  const res = await fetch(`${FOCUS_BASE}/v2/nfse/${encodeURIComponent(ref)}`, {
    headers: { Authorization: basicAuth(apiKey) },
  });
  const data = (await res.json().catch(() => ({}))) as FocusResponse;
  return {
    status: mapFocusStatus(data.status),
    providerRef: ref,
    number: data.numero,
    pdfUrl: data.url,
    xmlUrl: data.caminho_xml_nota_fiscal,
    message: data.status,
  };
}

export async function issueServiceInvoice(provider: FiscalProvider, apiKey: string, input: IssueInvoiceInput): Promise<IssueInvoiceResult> {
  if (provider === "FOCUSNFE") return focusIssue(apiKey, input);
  return { status: "error", message: "Provedor fiscal ainda não implementado. Use Focus NFe por enquanto." };
}

export async function fetchInvoiceStatus(provider: FiscalProvider, apiKey: string, providerRef: string): Promise<IssueInvoiceResult> {
  if (provider === "FOCUSNFE") return focusStatus(apiKey, providerRef);
  return { status: "error", message: "Provedor fiscal ainda não implementado." };
}
