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
    center: [76.2999, 9.9816],
    quickPills: ["Aluva", "Edapally", "MG Road", "SN Junction"],
  },
  hyderabad: {
    name: "Hyderabad, TS",
    code: "HMRL",
    center: [78.4867, 17.385],
    quickPills: ["Miyapur", "LB Nagar", "Raidurg", "Secunderabad East"],
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
    quickPills: ["Chennai Central", "Chennai Airport", "Guindy", "Koyambedu"],
  },
  ahmedabad: {
    name: "Ahmedabad, GJ",
    code: "GMRC",
    center: [72.5714, 23.0225],
    quickPills: ["Vastral Gam", "Thaltej", "Old High Court", "Motera Stadium"],
  },
  mumbai: {
    name: "Mumbai, MH",
    code: "MM",
    center: [72.8500, 19.1450],
    quickPills: [
      "Versova",
      "Andheri",
      "Gundavali",
      "Dahisar (East)",
      "Andheri (West)",
      "Marol Naka",
      "Ghatkopar",
      "BKC",
      "Cuffe Parade",
    ],
  },
  pune: {
    name: "Pune, MH",
    code: "PMRDA",
    center: [73.8567, 18.5204],
    quickPills: [
      "Civil Court",
      "PCMC",
      "Swargate",
      "Vanaz",
      "Ramwadi",
      "Pune Railway Station",
      "Shivaji Nagar",
      "Deccan Gymkhana",
    ],
  },
  navi_mumbai: {
    name: "Navi Mumbai, MH",
    code: "CIDCO",
    center: [73.0650, 19.0400],
    quickPills: [
      "Belapur Terminal",
      "Utsav Chowk",
      "Central Park",
      "CIDCO Science Park",
      "Pethpada",
      "Pendhar",
      "Amandoot",
      "Sector 7",
    ],
  },
};

