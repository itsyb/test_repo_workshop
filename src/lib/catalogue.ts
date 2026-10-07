// Starter store catalogue and challenge ideas from the program deck.
// Used by the database seed and by the static demo.

export const STARTER_PRODUCTS = [
  { name: "Yakaboo certificate · 1000 UAH", description: "An e-gift card for the books you love.", category: "OTHER", price: 2, emoji: "📚", sortOrder: 1, stock: null },
  { name: "Split Fiction × 2", description: "Two copies — one for you, one for a friend. Co-op is better together.", category: "OTHER", price: 5, emoji: "🎮", sortOrder: 2, stock: null },
  { name: "Focus Time voucher", description: "Half a day of protected focus or personal development time.", category: "TIME", price: 4, emoji: "⏳", sortOrder: 3, stock: null },
  { name: "Charity donation in your name", description: "A donation to a cause you care about, made on your behalf.", category: "IMPACT", price: 3, emoji: "💚", sortOrder: 4, stock: null },
  { name: "Exclusive training session", description: "A curated session that accelerates your growth.", category: "EXPERIENCE", price: 10, emoji: "🎓", sortOrder: 5, stock: null },
  { name: "Lunch with Top Management", description: "An hour, a great table, and leadership’s full attention.", category: "EXPERIENCE", price: 15, emoji: "🍽️", sortOrder: 6, stock: 2 },
  { name: "“Game Changer” tech kit", description: "Limited-edition branded tech accessories.", category: "MERCH", price: 8, emoji: "🎧", sortOrder: 7, stock: 10 },
  { name: "PMI Thanos hoodie", description: "Limited edition “Gem Master” hoodie. For those who collected them all.", category: "MERCH", price: 20, emoji: "🧥", sortOrder: 8, stock: 5 },
] as const;

export const CHALLENGE_IDEAS = [
  { title: "Documentation Zen", description: "Best project structure that anyone can understand in 5 minutes.", emoji: "📚" },
  { title: "Meeting Samurai", description: "Most effective meeting prep with agenda and pre-read materials.", emoji: "⚔️" },
  { title: "Feedback Architect", description: "Most constructive and thoughtful peer feedback.", emoji: "🏗️" },
  { title: "Tool Master", description: "Best workflow automation or productivity hack.", emoji: "🔧" },
  { title: "Jargon Slayer", description: "Explaining complex technical concepts in simple terms.", emoji: "🗣️" },
  { title: "Error-Free Hero", description: "Identifying critical issues during the planning phase.", emoji: "🦸" },
  { title: "The Connector", description: "Building bridges between previously disconnected teams.", emoji: "🌉" },
  { title: "Culture Storyteller", description: "Best story of PMI values solving real challenges.", emoji: "📖" },
] as const;
