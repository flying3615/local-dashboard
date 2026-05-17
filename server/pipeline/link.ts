import { createHash } from "node:crypto";

import type { Item, ItemLink } from "../domain/types";

export interface KnownEntities {
  sources?: Array<{
    id: string;
    name?: string;
  }>;
}

export function linkItem(item: Item, knownEntities: KnownEntities): ItemLink[] {
  const source = knownEntities.sources?.find(
    (knownSource) => knownSource.id === item.sourceId,
  );

  if (!source) {
    return [];
  }

  return [
    {
      id: `link_${stableHash(`${item.id}|source|${source.id}`)}`,
      fromItemId: item.id,
      toEntityType: "source",
      toEntityId: source.id,
      linkReason: "source_match",
      confidence: 1,
    },
  ];
}

function stableHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
