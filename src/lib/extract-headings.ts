export interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Extracts headings from MDX content for table of contents
 * This function parses the raw MDX source to find headings
 */
export function extractHeadings(content: string): TocItem[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const items: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    // Create slug from heading text (same logic as rehype-slug)
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    items.push({ id, text, level });
  }

  return items;
}
