import type { Item } from "../domain/types";

export function tagItem(item: Item): Item {
  const tags = new Set(item.tags);
  const locationText = [item.area, item.address].filter(Boolean).join(" ");

  if (isClearlyParaparaumu(locationText)) {
    tags.add("paraparaumu");
  } else {
    tags.add("needs_manual_address_check");
  }

  if (item.startsAt) {
    tags.add("open_home_soon");
  }

  return {
    ...item,
    tags: [...tags],
  };
}

function isClearlyParaparaumu(value: string): boolean {
  return /\bparaparaumu(?:\s+beach)?\b/i.test(value);
}
