"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Github, MessageCircle, Twitter } from "lucide-react";
import { FooterAd } from "@/components/ads";
import { useCookieConsent } from "@/contexts/cookie-consent-context";

const socialLinks = [
  { title: "Twitter", href: "https://twitter.com/Hytale", icon: Twitter },
  { title: "GitHub", href: "https://github.com/timiliris/Hytale-Docs", icon: Github },
];

export function Footer() {
  const t = useTranslations("footer");
  const { openPreferences } = useCookieConsent();

  const footerLinks = {
    gameplay: [
      { title: t("firstSteps"), href: "/docs/gameplay/getting-started/first-steps" },
      { title: t("combat"), href: "/docs/gameplay/combat/overview" },
      { title: t("regions"), href: "/docs/gameplay/world/regions" },
      { title: t("creatures"), href: "/docs/gameplay/creatures/overview" },
    ],
    development: [
      { title: t("modding"), href: "/docs/modding/overview" },
      { title: t("plugins"), href: "/docs/modding/plugins/overview" },
      { title: t("servers"), href: "/docs/servers/overview" },
      { title: t("api"), href: "/docs/api/overview" },
    ],
    tools: [
      { title: t("serverCalculator"), href: "/tools/server-calculator" },
      { title: t("projectGenerator"), href: "/tools/project-generator" },
      { title: t("jsonValidator"), href: "/tools/json-validator" },
    ],
  };

  return (
    <footer className="border-t border-border bg-sidebar">
      <div className="container px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <img
                src="/logo-h.png"
                alt="Hytale"
                className="h-8 w-8 object-contain"
              />
              <span className="text-xl font-bold">
                <span className="text-foreground">Hytale</span>
                <span className="text-primary">Docs</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {t("description")}
            </p>
            <div className="flex gap-2">
              {socialLinks.map((link) => (
                <a
                  key={link.title}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:border-muted transition-colors"
                >
                  <link.icon className="h-4 w-4" />
                  <span className="sr-only">{link.title}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Gameplay */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              {t("gameplay")}
            </h3>
            <ul className="space-y-3">
              {footerLinks.gameplay.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Development */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              {t("development")}
            </h3>
            <ul className="space-y-3">
              {footerLinks.development.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              {t("tools")}
            </h3>
            <ul className="space-y-3">
              {footerLinks.tools.map((link) => (
                <li key={link.title}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Discrete ad */}
        <FooterAd />

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {t("copyright")}
            </p>
            <div className="flex gap-6">
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("privacy")}
              </Link>
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("terms")}
              </Link>
              <Link
                href="/docs/community/contributing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("contribute")}
              </Link>
              <button
                onClick={openPreferences}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("cookieSettings")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
