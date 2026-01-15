"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import {
  Gamepad2,
  Server,
  Code,
  Wrench,
  Menu,
  Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSelector } from "./language-selector";
import { MobileSidebar } from "./sidebar";
import { SearchDialog } from "./search-dialog";
import { cn } from "@/lib/utils";

export function Navbar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  const mainNav = [
    {
      title: t("playerGuide"),
      href: "/docs/gameplay/overview",
      icon: Gamepad2,
    },
    {
      title: t("modding"),
      href: "/docs/modding/overview",
      icon: Code,
    },
    {
      title: t("servers"),
      href: "/docs/servers/overview",
      icon: Server,
    },
    {
      title: t("tools"),
      href: "/tools",
      icon: Wrench,
    },
  ];

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border"
          : "bg-transparent"
      )}
    >
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative flex h-8 w-8 items-center justify-center">
              <img
                src="/logo-h.png"
                alt="Hytale"
                className="h-8 w-8 object-contain transition-transform duration-200 group-hover:scale-110"
              />
            </div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-foreground">Hytale</span>
              <span className="text-primary">Docs</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {mainNav.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <SearchDialog />

            {/* GitHub - 44x44px minimum touch target */}
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground hover:bg-muted"
              asChild
            >
              <a
                href="https://github.com/timiliris/Hytale-Docs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub repository (opens in new tab)"
              >
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </a>
            </Button>

            {/* Language Selector */}
            <LanguageSelector />

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Mobile Menu - 44x44px minimum touch target */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label={t("menu")}
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">{t("menu")}</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[300px] bg-background border-l border-border p-0"
              >
                {/* Mobile Header */}
                <div className="flex items-center gap-2.5 p-4 border-b border-border">
                  <img
                    src="/logo-h.png"
                    alt="Hytale"
                    className="h-7 w-7 object-contain"
                  />
                  <span className="text-lg font-bold">
                    <span className="text-foreground">Hytale</span>
                    <span className="text-primary">Docs</span>
                  </span>
                </div>

                {/* Mobile Nav */}
                <nav className="p-4 space-y-1">
                  {mainNav.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.title}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.title}
                      </Link>
                    );
                  })}
                </nav>

                {/* Mobile Sidebar for docs */}
                {pathname.startsWith("/docs") && (
                  <div className="border-t border-border p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      {t("navigation")}
                    </p>
                    <MobileSidebar />
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
