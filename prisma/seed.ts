/**
 * Loads participants from data/users.csv (upsert by email) and, when the
 * tables are empty, the starter store catalogue and challenge ideas from the
 * program deck.
 *
 *   npm run db:seed            participants + catalogue
 *   npm run db:seed -- --demo  also opens the current sprint and adds sample gifts
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { giveGem } from "../src/lib/give";
import { syncSprints, getQuota } from "../src/lib/sprint";

const db = new PrismaClient();
const ROLES = ["EXECUTIVE", "LEAD", "MANAGER", "MEMBER"];

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") row.push(cell), (cell = "");
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell), rows.push(row), (row = []), (cell = "");
    } else cell += ch;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  return body.map((r) => Object.fromEntries(header!.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

async function seedUsers(path: string) {
  const rows = parseCsv(readFileSync(path, "utf8"));
  for (const r of rows) {
    const email = r.email!.toLowerCase();
    const role = (r.role || "MEMBER").toUpperCase();
    if (!ROLES.includes(role)) throw new Error(`Unknown role "${r.role}" for ${email}`);
    const data = { name: r.name!, role, title: r.title || null, team: r.team || null, isAdmin: r.isAdmin === "true" };
    await db.user.upsert({ where: { email }, create: { email, ...data }, update: data });
  }
  for (const r of rows) {
    const manager = r.managerEmail ? await db.user.findUnique({ where: { email: r.managerEmail.toLowerCase() } }) : null;
    if (r.managerEmail && !manager) throw new Error(`Manager ${r.managerEmail} of ${r.email} not found`);
    await db.user.update({ where: { email: r.email!.toLowerCase() }, data: { managerId: manager?.id ?? null } });
  }
  console.log(`✓ ${rows.length} participants`);
}

async function seedCatalogue() {
  if ((await db.product.count()) === 0) {
    await db.product.createMany({
      data: [
        { name: "Yakaboo certificate · 1000 UAH", description: "An e-gift card for the books you love.", category: "OTHER", price: 2, emoji: "📚", sortOrder: 1 },
        { name: "Split Fiction × 2", description: "Two copies — one for you, one for a friend. Co-op is better together.", category: "OTHER", price: 5, emoji: "🎮", sortOrder: 2 },
        { name: "Focus Time voucher", description: "Half a day of protected focus or personal development time.", category: "TIME", price: 4, emoji: "⏳", sortOrder: 3 },
        { name: "Charity donation in your name", description: "A donation to a cause you care about, made on your behalf.", category: "IMPACT", price: 3, emoji: "💚", sortOrder: 4 },
        { name: "Exclusive training session", description: "A curated session that accelerates your growth.", category: "EXPERIENCE", price: 10, emoji: "🎓", sortOrder: 5 },
        { name: "Lunch with Top Management", description: "An hour, a great table, and leadership’s full attention.", category: "EXPERIENCE", price: 15, emoji: "🍽️", sortOrder: 6, stock: 2 },
        { name: "“Game Changer” tech kit", description: "Limited-edition branded tech accessories.", category: "MERCH", price: 8, emoji: "🎧", sortOrder: 7, stock: 10 },
        { name: "PMI Thanos hoodie", description: "Limited edition “Gem Master” hoodie. For those who collected them all.", category: "MERCH", price: 20, emoji: "🧥", sortOrder: 8, stock: 5 },
      ],
    });
    console.log("✓ store catalogue");
  }
  if ((await db.challenge.count()) === 0) {
    await db.challenge.createMany({
      data: [
        { title: "Documentation Zen", description: "Best project structure that anyone can understand in 5 minutes.", emoji: "📚" },
        { title: "Meeting Samurai", description: "Most effective meeting prep with agenda and pre-read materials.", emoji: "⚔️" },
        { title: "Feedback Architect", description: "Most constructive and thoughtful peer feedback.", emoji: "🏗️" },
        { title: "Tool Master", description: "Best workflow automation or productivity hack.", emoji: "🔧" },
        { title: "Jargon Slayer", description: "Explaining complex technical concepts in simple terms.", emoji: "🗣️" },
        { title: "Error-Free Hero", description: "Identifying critical issues during the planning phase.", emoji: "🦸" },
        { title: "The Connector", description: "Building bridges between previously disconnected teams.", emoji: "🌉" },
        { title: "Culture Storyteller", description: "Best story of PMI values solving real challenges.", emoji: "📖" },
      ],
    });
    console.log("✓ challenge ideas (drafts — activate up to two in Admin)");
  }
}

const COMMENTS = [
  "Amazing collaboration within the eCRM sendouts refactoring project",
  "Stayed late to help me unblock the release — truly appreciated",
  "Your onboarding guide made my first week so much easier, thank you",
  "Brilliant idea to automate the weekly report, saved us hours",
  "Thanks for the rapid feedback on the design review yesterday",
  "Jumped in to support the team during a really tough incident",
  "Bridged product and marketing perfectly on the campaign launch",
  "Bold proposal on simplifying our approval process — game changing",
];

async function seedDemoActivity() {
  const sprint = await syncSprints(db);
  if (!sprint) return console.log("· program has not started yet (PROGRAM_START) — no demo activity");
  const users = await db.user.findMany({ where: { active: true } });
  const colors = ["BLUE", "PURPLE", "GREEN"];
  let n = 0;
  for (const [i, u] of users.entries()) {
    if (i % 3 === 2) continue; // leave some quota unused
    const q = await getQuota(db, sprint.id, u.id);
    if (q.transparentLeft > 0) {
      const to = users[(i * 7 + 3) % users.length]!;
      if (to.id !== u.id && !q.thankedIds.includes(to.id)) {
        await giveGem(db, { fromId: u.id, toId: to.id, source: "TRANSPARENT", color: colors[i % 3]!, comment: COMMENTS[i % COMMENTS.length]! });
        n++;
      }
    }
    if (q.yellowPendingIds.length > 0) {
      await giveGem(db, { fromId: u.id, toId: q.yellowPendingIds[0]!, source: "YELLOW", color: "YELLOW", comment: "Delivered the full committed sprint scope — outstanding work" });
      n++;
    }
  }
  const active = await db.challenge.count({ where: { status: "ACTIVE" } });
  if (active === 0) {
    await db.challenge.updateMany({ where: { title: { in: ["Documentation Zen", "Tool Master"] } }, data: { status: "ACTIVE", startsAt: new Date() } });
  }
  console.log(`✓ demo: ${n} gifts in sprint ${sprint.number}`);
}

async function main() {
  await seedUsers(process.env.USERS_CSV || "data/users.csv");
  await seedCatalogue();
  if (process.argv.includes("--demo")) await seedDemoActivity();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
