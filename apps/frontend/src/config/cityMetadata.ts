export const CITY_METADATA: Record<
  string,
  {
    name: string;
    code: string;
    center: [number, number];
    quickPills: string[];
  }
> = {
  delhi: {
    name: "Delhi, IN",
    code: "DELHI",
    center: [77.209, 28.6139],
    quickPills: ["Kashmere Gate", "Rajiv Chowk", "HUDA City Centre", "Noida City Centre"],
  },
  kochi: {
    name: "Kochi, KL",
    code: "KMRL",
    center: [76.2711, 9.9312],
    quickPills: ["Aluva", "Edapally", "MG Road", "SN Junction"],
  },
  hyderabad: {
    name: "Hyderabad, TS",
    code: "HMRL",
    center: [78.4867, 17.385],
    quickPills: ["Miyapur", "LB Nagar", "Raidurg", "Secunderabad"],
  },
  bengaluru: {
    name: "Bengaluru, KA",
    code: "BMRCL",
    center: [77.5946, 12.9716],
    quickPills: ["Majestic", "Whitefield", "MG Road", "Nagasandra"],
  },
  chennai: {
    name: "Chennai, TN",
    code: "CMRL",
    center: [80.2707, 13.0827],
    quickPills: ["Chennai Central", "Airport", "Guindy", "Koyambedu"],
  },
  ahmedabad: {
    name: "Ahmedabad, GJ",
    code: "GMRC",
    center: [72.5714, 23.0225],
    quickPills: ["Vastral Gam", "Thaltej", "Old High Court", "Motera Stadium"],
  },
};
