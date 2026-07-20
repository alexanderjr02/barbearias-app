import { NextResponse } from "next/server";
import { vapidPublicKey, isPushConfigured } from "@/lib/push";

// GET /api/v1/push/public-key
//
// A chave VAPID pública que o navegador precisa para assinar o push. É pública
// por definição (vai embutida no app), então não exige login. Se o push não
// estiver configurado no servidor, devolve enabled:false para o app esconder o
// botão de ativar em vez de oferecer algo que não funciona.
export async function GET() {
  if (!isPushConfigured()) {
    return NextResponse.json({ enabled: false, key: null });
  }
  return NextResponse.json({ enabled: true, key: vapidPublicKey() });
}
