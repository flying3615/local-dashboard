import { getRegion } from "../config/regions";

export interface PropertySearchLink {
  id: string;
  provider: string;
  label: string;
  url: string;
  area: string;
  category: "residential_sale";
  notes: string;
}

export function configuredPropertySearchLinks(regionId: string = "kapiti"): PropertySearchLink[] {
  const region = getRegion(regionId);
  if (!region) return [];

  return [
    {
      id: `realestate_${region.id}_residential_sale`,
      provider: "realestate.co.nz",
      label: `${region.name} homes for sale`,
      url: `https://www.realestate.co.nz/residential/sale/${region.realestatePath}`,
      area: region.name,
      category: "residential_sale",
      notes:
        "External search link only. realestate.co.nz listings are not scraped or stored without API permission.",
    },
  ];
}
