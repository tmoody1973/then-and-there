// The Library's MLA citation carries the paper's properly cased name: <cite>Homer Guardian</cite>.
export const paperFromCite = (mla: string, fallback: string) => mla.match(/<cite>(.*?)<\/cite>/)?.[1] ?? fallback;
export const plainCitation = (mla: string) => mla.replace(/<\/?cite>/g, "");
