import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { ChevronLeft, ChevronRight } from "lucide-react";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { getTranslations } from "next-intl/server";
import { getDocBySlug, getAllDocSlugs, getDocNavigation } from "@/lib/docs";
import { mdxComponents } from "@/components/mdx";
import { remarkAdmonitions } from "@/lib/remark-admonitions";
import { ArticleAd } from "@/components/ads";

interface DocPageProps {
  params: Promise<{ slug?: string[]; locale: string }>;
}

export async function generateStaticParams() {
  const locales = ["fr", "en"];
  const params: { locale: string; slug: string[] }[] = [];

  for (const locale of locales) {
    const slugs = getAllDocSlugs(locale);
    params.push({ locale, slug: [] }); // /docs
    for (const slug of slugs) {
      params.push({ locale, slug });
    }
  }

  return params;
}

export async function generateMetadata({
  params,
}: DocPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const doc = getDocBySlug(slug || ["intro"], locale);

  if (!doc) {
    return {
      title: "Not Found",
    };
  }

  return {
    title: doc.meta.title,
    description: doc.meta.description,
  };
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug, locale } = await params;
  const actualSlug = slug || ["intro"];
  const doc = getDocBySlug(actualSlug, locale);

  if (!doc) {
    notFound();
  }

  const { prev, next } = getDocNavigation(actualSlug, locale);
  const t = await getTranslations({ locale, namespace: "docs" });

  return (
    <article className="max-w-5xl py-6 lg:py-8 lg:pr-8">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-sm">
        <Link
          href="/docs"
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          Docs
        </Link>
        {actualSlug.map((segment, index) => (
          <span key={index} className="flex items-center gap-2">
            <span className="text-border">/</span>
            {index === actualSlug.length - 1 ? (
              <span className="text-primary font-medium">{segment}</span>
            ) : (
              <Link
                href={`/docs/${actualSlug.slice(0, index + 1).join("/")}`}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {segment}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Title */}
      <h1 className="text-4xl font-bold tracking-tight text-gradient mb-4">
        {doc.meta.title}
      </h1>

      {doc.meta.description && (
        <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
          {doc.meta.description}
        </p>
      )}

      {/* Separator */}
      <div className="h-px bg-gradient-to-r from-primary/50 via-border to-transparent mb-10" />

      {/* Content */}
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <MDXRemote
          source={doc.content}
          components={mdxComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm, remarkAdmonitions],
              rehypePlugins: [rehypeSlug],
            },
          }}
        />
      </div>

      {/* Discrete ad after content */}
      <ArticleAd />

      {/* Navigation */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-12" />

      <nav className="flex items-stretch gap-4">
        {prev ? (
          <Link
            href={prev.href}
            className="flex-1 group p-5 rounded-xl border-2 border-border bg-card/30 transition-all duration-300 hover:border-secondary/50 hover:bg-card/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 transition-colors group-hover:bg-secondary/20">
                <ChevronLeft className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{t("previous")}</div>
                <div className="font-semibold text-foreground group-hover:text-secondary transition-colors">
                  {prev.title}
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}

        {next ? (
          <Link
            href={next.href}
            className="flex-1 group p-5 rounded-xl border-2 border-border bg-card/30 transition-all duration-300 hover:border-primary/50 hover:bg-card/50"
          >
            <div className="flex items-center justify-end gap-3">
              <div className="text-right">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{t("next")}</div>
                <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {next.title}
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <ChevronRight className="h-5 w-5 text-primary" />
              </div>
            </div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </nav>
    </article>
  );
}
