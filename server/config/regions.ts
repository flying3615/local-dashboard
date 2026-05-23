export interface RegionConfig {
  id: string;
  name: string;
  council: string;
  suburbs: string[];
  homesNzPath: string;
  realestatePath: string;
  homesNzSitemapFilter: string;
  realestateSitemapFilter: string;
}

const regions: RegionConfig[] = [
  {
    id: "kapiti",
    name: "Kapiti Coast",
    council: "Kapiti Coast District Council",
    suburbs: [
      "Paraparaumu",
      "Paraparaumu Beach",
      "Raumati Beach",
      "Raumati South",
      "Waikanae",
      "Waikanae Beach",
      "Otaki",
      "Paekakariki",
    ],
    homesNzPath: "wellington/kapiti-coast/paraparaumu",
    realestatePath: "wellington/kapiti-coast/paraparaumu",
    homesNzSitemapFilter: "paraparaumu",
    realestateSitemapFilter: "paraparaumu",
  },
  {
    id: "wellington",
    name: "Wellington City",
    council: "Wellington City Council",
    suburbs: [
      "Thorndon",
      "Kelburn",
      "Te Aro",
      "Mt Victoria",
      "Newtown",
      "Island Bay",
      "Karori",
      "Miramar",
      "Seatoun",
      "Brooklyn",
      "Aro Valley",
      "Hataitai",
      "Lyall Bay",
      "Oriental Bay",
      "Roseneath",
      "Wadestown",
      "Ngaio",
      "Khandallah",
      "Northland",
      "Vogeltown",
      "Berhampore",
      "Southgate",
      "Newlands",
      "Johnsonville",
      "Churton Park",
      "Tawa",
    ],
    homesNzPath: "wellington/wellington-city",
    realestatePath: "wellington/wellington-city",
    homesNzSitemapFilter: "wellington",
    realestateSitemapFilter: "wellington-city",
  },
  {
    id: "lower-hutt",
    name: "Lower Hutt",
    council: "Hutt City Council",
    suburbs: [
      "Lower Hutt",
      "Petone",
      "Eastbourne",
      "Wainuiomata",
      "Naenae",
      "Taita",
      "Avalon",
      "Epuni",
      "Moera",
      "Gracefield",
      "Seaview",
      "Woburn",
      "Waterloo",
      "Homedale",
      "Waiwhetu",
      "Korokoro",
      "Maungaraki",
      "Normandale",
      "Belmont",
      "Boulcott",
      "Days Bay",
      "Harbour View",
      "Kelson",
    ],
    homesNzPath: "wellington/lower-hutt",
    realestatePath: "wellington/lower-hutt",
    homesNzSitemapFilter: "lower-hutt",
    realestateSitemapFilter: "lower-hutt",
  },
  {
    id: "upper-hutt",
    name: "Upper Hutt",
    council: "Upper Hutt City Council",
    suburbs: [
      "Upper Hutt",
      "Silverstream",
      "Birchville",
      "Brown Owl",
      "Mangaroa",
      "Maymorn",
      "Te Marua",
      "Whitemans Valley",
      "Wallaceville",
      "Timberlea",
      "Heretaunga",
      "Pinehaven",
      "Elderslea",
      "Trentham",
      "Clouston Park",
    ],
    homesNzPath: "wellington/upper-hutt",
    realestatePath: "wellington/upper-hutt",
    homesNzSitemapFilter: "upper-hutt",
    realestateSitemapFilter: "upper-hutt",
  },
  {
    id: "porirua",
    name: "Porirua",
    council: "Porirua City Council",
    suburbs: [
      "Porirua",
      "Titahi Bay",
      "Whitby",
      "Camborne",
      "Paremata",
      "Papakowhai",
      "Aotea",
      "Elsdon",
      "Ranui Heights",
      "Cannons Creek",
      "Waitangirua",
      "Ascot Park",
      "Mana Island",
      "Plimmerton",
      "Pukerua Bay",
    ],
    homesNzPath: "wellington/porirua",
    realestatePath: "wellington/porirua",
    homesNzSitemapFilter: "porirua",
    realestateSitemapFilter: "porirua",
  },
];

const regionMap = new Map(regions.map((r) => [r.id, r]));

export function allRegions(): RegionConfig[] {
  return regions;
}

export function getRegion(id: string): RegionConfig | undefined {
  return regionMap.get(id);
}

export function defaultRegion(): RegionConfig {
  return regions[0]!;
}
