import { Project, getSettings } from "./db";

// First run: start the dashboard with the projects in the "My Zoxen Projects" folder.
const START = [
  { name: "Zoxen Dashboard", category: "Internal", folder: "Dashboard", color: "#2639e8", phase: 2, priority: "high", description: "Personal command center: projects, day planner, reminders." },
  { name: "Horror Game", category: "Game", folder: "Game", color: "#e5484d", phase: 1, description: "Godot horror / zombie game.", phases: ["Concept", "Prototype", "Levels & Art", "Polish", "Release"] },
  { name: "Zoxen CRM / Invoice Portal", category: "Internal", folder: "Invoice software", color: "#6c3bf5", phase: 3, description: "Clients, invoices, quotes and contracts for Zoxen Digital." },
  { name: "Sales Agent", category: "AI", folder: "Sales Agent", color: "#f59e0b", phase: 0, status: "idea", priority: "high", description: "AI sales agent for Zoxen Digital." },
  { name: "IlmConnect", category: "App", folder: "Something", color: "#10b981", phase: 2, description: "Study app." },
  { name: "ToolNest (Tools)", category: "Website", folder: "tools", color: "#0ea5e9", phase: 3, status: "paused", description: "Free online tools website. On hold, but working." },
  { name: "Zoxen Demos", category: "Website", folder: "Zoxen Demos", color: "#ec4899", phase: 3, description: "Demo websites for Zoxen Digital clients." },
];

export async function ensureSeed() {
  const s = await getSettings();
  if (s.seeded) return;
  if ((await Project.countDocuments()) === 0) await Project.insertMany(START.map((p, i) => ({ ...p, order: i })));
  s.seeded = true;
  await s.save();
}
