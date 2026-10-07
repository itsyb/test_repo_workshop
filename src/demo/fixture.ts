// Fictional participants for the public static demo. Deliberately separate
// from data/users.csv so real names never end up on GitHub Pages.

export type DemoUser = {
  id: string;
  email: string;
  name: string;
  role: "EXECUTIVE" | "LEAD" | "MANAGER" | "MEMBER";
  managerId: string | null;
  title: string;
  team: string;
  isAdmin: boolean;
  avatarUrl: null;
  active: true;
};

const ROWS: [name: string, role: DemoUser["role"], manager: string | null, title: string, team: string][] = [
  ["Olena Kovalenko", "EXECUTIVE", null, "Head of Digital", "Leadership"],
  ["Andrii Melnyk", "LEAD", "Olena Kovalenko", "Engineering Lead", "Platform"],
  ["Iryna Shevchenko", "LEAD", "Olena Kovalenko", "Product Lead", "Product"],
  ["Taras Bondarenko", "LEAD", "Olena Kovalenko", "Marketing Lead", "eCRM"],
  ["Mariia Tkachenko", "MANAGER", "Andrii Melnyk", "Engineering Manager", "Platform"],
  ["Dmytro Kravets", "MANAGER", "Iryna Shevchenko", "Product Manager", "Product"],
  ["Sofiia Oliinyk", "MANAGER", "Taras Bondarenko", "CRM Manager", "eCRM"],
  ["Yurii Lysenko", "MEMBER", "Mariia Tkachenko", "Senior Backend Engineer", "Platform"],
  ["Kateryna Moroz", "MEMBER", "Mariia Tkachenko", "Frontend Engineer", "Platform"],
  ["Bohdan Savchenko", "MEMBER", "Mariia Tkachenko", "QA Engineer", "Platform"],
  ["Anna Pavlenko", "MEMBER", "Mariia Tkachenko", "DevOps Engineer", "Platform"],
  ["Oleh Rudenko", "MEMBER", "Andrii Melnyk", "Solution Architect", "Platform"],
  ["Viktoriia Marchenko", "MEMBER", "Dmytro Kravets", "Product Designer", "Product"],
  ["Maksym Honcharenko", "MEMBER", "Dmytro Kravets", "Business Analyst", "Product"],
  ["Yuliia Kozak", "MEMBER", "Dmytro Kravets", "UX Researcher", "Product"],
  ["Serhii Polishchuk", "MEMBER", "Iryna Shevchenko", "Data Analyst", "Product"],
  ["Nataliia Boiko", "MEMBER", "Sofiia Oliinyk", "CRM Specialist", "eCRM"],
  ["Roman Zinchenko", "MEMBER", "Sofiia Oliinyk", "Email Developer", "eCRM"],
  ["Khrystyna Levchenko", "MEMBER", "Sofiia Oliinyk", "Content Manager", "eCRM"],
  ["Vladyslav Hrytsenko", "MEMBER", "Taras Bondarenko", "Performance Marketer", "eCRM"],
  ["Daryna Kushnir", "MEMBER", "Taras Bondarenko", "Brand Manager", "eCRM"],
  ["Artem Vasylenko", "MEMBER", "Olena Kovalenko", "Scrum Master", "Leadership"],
];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, "-");
const idOf = (name: string) => `u-${slug(name)}`;

export const DEMO_USERS: DemoUser[] = ROWS.map(([name, role, manager, title, team]) => ({
  id: idOf(name),
  email: `${slug(name).replace("-", ".")}@example.com`,
  name,
  role,
  managerId: manager ? idOf(manager) : null,
  title,
  team,
  isAdmin: role === "EXECUTIVE",
  avatarUrl: null,
  active: true,
}));

/** People offered on the demo sign-in screen — one per role. */
export const PERSONAS = [
  { id: idOf("Olena Kovalenko"), note: "Executive · Admin console" },
  { id: idOf("Andrii Melnyk"), note: "Lead · gives Yellow gems" },
  { id: idOf("Mariia Tkachenko"), note: "Manager · 4 direct reports" },
  { id: idOf("Kateryna Moroz"), note: "Team member" },
];

export const GIFT_COMMENTS: Record<string, string[]> = {
  BLUE: [
    "Stayed late to help me unblock the release — truly appreciated",
    "Your onboarding guide made my first week so much easier, thank you",
    "Jumped in to support the team during a really tough incident",
    "Thank you for the patience while pairing with me on the migration",
  ],
  PURPLE: [
    "Amazing collaboration within the eCRM sendouts refactoring project",
    "Thanks for the rapid feedback on the design review yesterday",
    "Bridged product and marketing perfectly on the campaign launch",
    "Solved the integration blocker together with us in one afternoon",
  ],
  GREEN: [
    "Brilliant idea to automate the weekly report, saved us hours",
    "Bold proposal on simplifying our approval process — game changing",
    "Your caching proposal cut our page load in half",
    "Rebuilt the test pipeline on your own initiative — so much faster now",
  ],
  YELLOW: [
    "Delivered the full committed sprint scope — outstanding work",
    "Every committed story done and demo-ready. Great sprint!",
  ],
};
