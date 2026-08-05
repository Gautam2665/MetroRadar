export const CITY_METADATA: Record<
  string,
  {
    name: string;
    code: string;
    center: [number, number];
    lines: { name: string; code: string; color: string }[];
    quickPills: string[];
    upcomingJourney: { from: string; to: string; time: string; inMin?: number; line: string; color: string };
  }
> = {
  delhi: {
    name: "Delhi, IN",
    code: "DELHI",
    center: [77.209, 28.6139],
    lines: [
      { name: "Red Line", code: "RED", color: "#EF4444" },
      { name: "Violet Line", code: "VIOLET", color: "#8B5CF6" },
      { name: "Yellow Line", code: "YELLOW", color: "#EAB308" },
      { name: "Blue Line", code: "BLUE", color: "#3B82F6" },
    ],
    quickPills: ["Kashmere Gate", "Rajiv Chowk", "HUDA City Centre", "Noida City Centre"],
    upcomingJourney: { from: "Kashmere Gate", to: "HUDA City Centre", time: "In 12 mins", inMin: 12, line: "Yellow Line", color: "#EAB308" },
  },
  kochi: {
    name: "Kochi, KL",
    code: "KMRL",
    center: [76.2711, 9.9312],
    lines: [{ name: "Cyan Line", code: "CYAN", color: "#00e5ff" }],
    quickPills: ["Aluva", "Edapally", "MG Road", "SN Junction"],
    upcomingJourney: { from: "Aluva", to: "SN Junction", time: "In 6 mins", inMin: 6, line: "Cyan Line", color: "#00e5ff" },
  },
  hyderabad: {
    name: "Hyderabad, TS",
    code: "HMRL",
    center: [78.4867, 17.385],
    lines: [
      { name: "Red Line", code: "RED", color: "#EF4444" },
      { name: "Blue Line", code: "BLUE", color: "#3B82F6" },
      { name: "Green Line", code: "GREEN", color: "#10B981" },
    ],
    quickPills: ["Miyapur", "LB Nagar", "Raidurg", "Secunderabad"],
    upcomingJourney: { from: "Raidurg", to: "Secunderabad", time: "In 15 mins", inMin: 15, line: "Blue Line", color: "#3B82F6" },
  },
  bengaluru: {
    name: "Bengaluru, KA",
    code: "BMRCL",
    center: [77.5946, 12.9716],
    lines: [
      { name: "Purple Line", code: "PURPLE", color: "#8B5CF6" },
      { name: "Green Line", code: "GREEN", color: "#10B981" },
    ],
    quickPills: ["Majestic", "Whitefield", "MG Road", "Nagasandra"],
    upcomingJourney: { from: "Majestic", to: "Whitefield", time: "In 8 mins", inMin: 8, line: "Purple Line", color: "#8B5CF6" },
  },
  chennai: {
    name: "Chennai, TN",
    code: "CMRL",
    center: [80.2707, 13.0827],
    lines: [
      { name: "Blue Line", code: "BLUE", color: "#3B82F6" },
      { name: "Green Line", code: "GREEN", color: "#10B981" },
    ],
    quickPills: ["Chennai Central", "Airport", "Guindy", "Koyambedu"],
    upcomingJourney: { from: "Chennai Central", to: "Airport", time: "In 10 mins", inMin: 10, line: "Blue Line", color: "#3B82F6" },
  },
  ahmedabad: {
    name: "Ahmedabad, GJ",
    code: "GMRC",
    center: [72.5714, 23.0225],
    lines: [
      { name: "East-West Line", code: "EW", color: "#F97316" },
      { name: "North-South Line", code: "NS", color: "#10B981" },
    ],
    quickPills: ["Vastral Gam", "Thaltej", "Old High Court", "Motera Stadium"],
    upcomingJourney: { from: "Old High Court", to: "Motera Stadium", time: "In 14 mins", inMin: 14, line: "North-South Line", color: "#10B981" },
  },
};
