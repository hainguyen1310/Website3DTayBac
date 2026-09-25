/** Display legacy editorial copy with the current brand; never rewrite IDs or customer data. */
export function brandCopy(text: string): string {
  return text
    .replace(/(?<![\p{L}\p{N}_])Mộc(?![\p{L}\p{N}_]|\s+Châu)/gu, "A Sỉn")
    .replace(/(?<![\p{L}\p{N}_])MỘC(?![\p{L}\p{N}_]|\s+CHÂU)/gu, "A SỈN");
}
