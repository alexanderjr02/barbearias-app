"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
      renderButton: (
        parent: HTMLElement,
        options: { theme: string; size: string; width: string; text: string; shape: string }
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

interface Props {
  onSuccess: (idToken: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
}

// Renders Google's own "Sign in with Google" button via Google Identity
// Services — nothing to install, nothing to keep in sync visually with
// Google's branding guidelines. Silently renders nothing when
// NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't configured, instead of showing a
// button that can only ever fail.
export function GoogleSignInButton({ onSuccess, text = "continue_with" }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (!scriptLoaded || !GOOGLE_CLIENT_ID || !buttonRef.current || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => onSuccess(response.credential),
    });
    // `outline` (branco) e `rectangular` são temas oficiais do Google —
    // marca dentro das diretrizes deles e igual ao botão branco "Continuar com
    // Google" do app. Fica ao lado do de Apple, formando o mesmo par de entrada
    // social do app.
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: "100%",
      text,
      shape: "rectangular",
    });
    // onSuccess is expected to be stable enough across renders for this
    // one-time button render (identical pattern to a mount-only effect).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded, text]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setScriptLoaded(true)} />
      <div ref={buttonRef} className="w-full flex justify-center [&>div]:w-full" />
    </>
  );
}
