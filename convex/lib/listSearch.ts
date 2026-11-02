/** Page a filtered in-memory list. Cursors are numeric offsets. */
export function offsetPage<T>(rows: T[], cursor: string | null | undefined, limit: number) {
  const offset = cursor && /^\d+$/.test(cursor) ? Number(cursor) : 0;
  const page = rows.slice(offset, offset + limit);
  const next = offset + page.length;
  const isDone = next >= rows.length;
  return { page, isDone, continueCursor: isDone ? "" : String(next) };
}

export function activeSearchTerm(term: string | undefined) {
  const trimmed = term?.trim() ?? "";
  return trimmed.length >= 2 ? trimmed : undefined;
}

export async function docsById<IdType extends string, DocType extends { _id: IdType }>(
  ids: Array<IdType | undefined>,
  load: (id: IdType) => Promise<DocType | null>,
) {
  const unique: IdType[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }
  const docs = await Promise.all(unique.map((id) => load(id)));
  const map = new Map<IdType, DocType>();
  for (const doc of docs) {
    if (doc) map.set(doc._id, doc);
  }
  return map;
}
