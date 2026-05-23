import type { Item } from "../domain/types";
import { getRegion } from "../config/regions";

export function tagItem(item: Item): Item {
  const tags = new Set(item.tags);
  const locationText = [item.area, item.address].filter(Boolean).join(" ");
  const regionId = item.region ?? "kapiti";

  if (matchesRegion(locationText, regionId)) {
    tags.add(regionId);
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

function matchesRegion(locationText: string, regionId: string): boolean {
  const region = getRegion(regionId);
  if (!region) return false;

  const lower = locationText.toLowerCase();
  return region.suburbs.some((suburb) =>
    lower.includes(suburb.toLowerCase()),
  );
}
