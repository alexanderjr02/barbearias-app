"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Funcionalidades", href: "#features" },
  { label: "Preços", href: "#pricing" },
  { label: "Por que nós", href: "#why-us" },
  { label: "FAQ", href: "#faq" },
];

export function MarketingNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--mkt-bg)]/85 backdrop-blur-xl border-b border-[var(--mkt-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--mkt-gold)] to-amber-600 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-black" />
            </div>
            <span className="text-xl font-black text-[var(--mkt-text)] tracking-tight">
              CORT<span className="text-[var(--mkt-gold)]">IX</span>
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-[var(--mkt-text-dim)] hover:text-[var(--mkt-text)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Começar grátis</Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-[var(--mkt-text-dim)] hover:text-[var(--mkt-text)]"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-[var(--mkt-surface)] border-t border-[var(--mkt-border)]">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-[var(--mkt-text-dim)] hover:text-[var(--mkt-text)] py-2 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 space-y-2 border-t border-[var(--mkt-border)]">
              <Link href="/login" className="block">
                <Button variant="ghost" className="w-full">
                  Entrar
                </Button>
              </Link>
              <Link href="/register" className="block">
                <Button className="w-full">Começar grátis</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
