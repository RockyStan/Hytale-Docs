"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
  { code: "fr", name: "Francais", flag: "FR" },
  { code: "en", name: "English", flag: "EN" },
] as const;

export function LanguageSelector() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as "fr" | "en" });
  };

  const currentLanguage = languages.find((lang) => lang.code === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label={`Select language. Current: ${currentLanguage?.name || "Select language"}`}
        >
          <Globe className="h-5 w-5" />
          <span className="sr-only">
            {currentLanguage?.name || "Select language"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-popover border-border"
      >
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`cursor-pointer ${
              locale === language.code
                ? "text-primary bg-primary/10"
                : "text-popover-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <span className="mr-2 text-xs font-bold">{language.flag}</span>
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
