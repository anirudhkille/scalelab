export const SITE_URL = "https://scalelab.anirudhkille.com";

type PageMetaProps = {
  readonly title: string;
  readonly description: string;
  readonly path?: string;
  readonly noIndex?: boolean;
};

/**
 * React 19 hoists the title, meta, and canonical link into <head>.
 * Render exactly one PageMeta per route so the document title stays unambiguous.
 */
export function PageMeta({ title, description, path, noIndex = false }: PageMetaProps) {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />
      {path ? <link rel="canonical" href={new URL(path, SITE_URL).toString()} /> : null}
    </>
  );
}
