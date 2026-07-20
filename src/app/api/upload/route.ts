import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// POST /api/upload — guarda a imagem e devolve a URL pública.
//
// Dois destinos, escolhidos pelo ambiente:
//
// - Com BLOB_READ_WRITE_TOKEN (produção na Vercel): vai para o Vercel Blob.
//   Obrigatório lá, porque o disco de uma função serverless é efêmero — toda
//   foto de perfil, logo e foto de corte sumiria no deploy seguinte, e o
//   banco ficaria cheio de URLs apontando para o vazio.
// - Sem o token (desenvolvimento): grava em public/uploads como sempre, para
//   não exigir conta na nuvem só para rodar na sua máquina.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Formato inválido. Use JPG, PNG ou WEBP." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Arquivo muito grande (máximo 5MB)" }, { status: 400 });
  }

  const filename = `${randomUUID()}.${extension}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { url } = await put(`uploads/${filename}`, file, {
      access: "public",
      contentType: file.type,
      // O nome já é um UUID, então não precisa do sufixo aleatório que o
      // Blob acrescenta por padrão — e sem ele a URL fica previsível.
      addRandomSuffix: false,
    });
    return NextResponse.json({ url }, { status: 201 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), bytes);

  return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
}
