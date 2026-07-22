import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } from "./auth";

export function setSessionCookies(response: NextResponse, accessToken: string, refreshToken: string, secure: boolean) {
  response.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_TTL,
  });
  response.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL,
  });
}

/**
 * Troca SÓ o token de acesso, deixando o de renovação como está.
 *
 * É o que a impersonação usa. O cookie de renovação continua sendo o do
 * admin, e isso é proposital: ele é a corda de segurança. Se o admin fechar a
 * aba dentro da barbearia, em no máximo 15 minutos a sessão volta a ser a
 * dele sozinha, porque a renovação só sabe emitir token para o dono do
 * refresh. Impersonação que não expira é impersonação esquecida.
 */
export function setAccessCookie(response: NextResponse, accessToken: string, secure: boolean) {
  response.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_TTL,
  });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
}
