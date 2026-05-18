export interface PropertySearchLink {
  id: string;
  provider: string;
  label: string;
  url: string;
  area: string;
  category: "residential_sale";
  notes: string;
}

export function configuredPropertySearchLinks(): PropertySearchLink[] {
  return [
    {
      id: "realestate_paraparaumu_residential_sale",
      provider: "realestate.co.nz",
      label: "Paraparaumu homes for sale",
      url: "https://www.realestate.co.nz/residential/sale/wellington/kapiti-coast/paraparaumu",
      area: "Paraparaumu",
      category: "residential_sale",
      notes:
        "External search link only. realestate.co.nz listings are not scraped or stored without API permission.",
    },
  ];
}
