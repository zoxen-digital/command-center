import mongoose, { Schema, model, models } from "mongoose";

const g = globalThis as unknown as { _mongo?: Promise<typeof mongoose> };

export function dbConnect() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local.");
  if (!g._mongo) {
    g._mongo = mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || "zoxen_dashboard" });
    g._mongo.catch(() => (g._mongo = undefined));
  }
  return g._mongo;
}

const opts = { timestamps: true, toJSON: { virtuals: true, versionKey: false } } as const;

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, default: "Software" },
    status: { type: String, enum: ["idea", "active", "paused", "done"], default: "active" },
    phases: { type: [String], default: ["Planning", "Design", "Build", "Testing", "Launch"] },
    phase: { type: Number, default: 0 }, // index into phases
    progress: { type: Number, default: null }, // manual override; null = calculated from tasks
    color: { type: String, default: "#2639e8" },
    folder: { type: String, default: "" },
    url: { type: String, default: "" },
    deadline: { type: String, default: null },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    order: { type: Number, default: 0 },
  },
  opts,
);

const TaskSchema = new Schema(
  {
    title: { type: String, required: true },
    notes: { type: String, default: "" },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    date: { type: String, default: null }, // null = backlog / someday
    time: { type: String, default: null },
    duration: { type: Number, default: 30 },
    repeat: { type: String, enum: ["none", "daily", "weekdays", "weekly", "monthly"], default: "none" },
    until: { type: String, default: null },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    remindBefore: { type: Number, default: 10 }, // minutes before; -1 = no reminder
    doneDates: { type: [String], default: [] }, // completed occurrences ("backlog" for undated)
    notified: { type: [String], default: [] }, // occurrences already reminded
    subtasks: { type: [{ title: String, done: Boolean }], default: [] },
  },
  opts,
);
TaskSchema.index({ date: 1 });
TaskSchema.index({ projectId: 1 });

const NoteSchema = new Schema(
  {
    title: { type: String, default: "" },
    body: { type: String, default: "" },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    pinned: { type: Boolean, default: false },
  },
  opts,
);

const NotificationSchema = new Schema(
  {
    title: String,
    body: String,
    taskId: { type: Schema.Types.ObjectId, default: null },
    read: { type: Boolean, default: false },
    shown: { type: Boolean, default: false }, // browser popup already shown
  },
  opts,
);

const SettingsSchema = new Schema(
  {
    key: { type: String, default: "main", unique: true },
    ownerName: { type: String, default: "Zubair" },
    timezone: { type: String, default: "Asia/Karachi" },
    notifyEmail: { type: String, default: "" },
    emailReminders: { type: Boolean, default: true },
    digestEnabled: { type: Boolean, default: true },
    digestTime: { type: String, default: "08:00" },
    eveningEnabled: { type: Boolean, default: true },
    eveningTime: { type: String, default: "21:30" },
    lastDigest: { type: String, default: "" },
    lastEvening: { type: String, default: "" },
    seeded: { type: Boolean, default: false },
  },
  opts,
);

const ActivitySchema = new Schema(
  { day: { type: String, index: true }, text: String, projectId: { type: Schema.Types.ObjectId, default: null } },
  opts,
);

export const Project = models.Project || model("Project", ProjectSchema);
export const Task = models.Task || model("Task", TaskSchema);
export const Note = models.Note || model("Note", NoteSchema);
export const Notification = models.Notification || model("Notification", NotificationSchema);
export const Settings = models.Settings || model("Settings", SettingsSchema);
export const Activity = models.Activity || model("Activity", ActivitySchema);

export async function getSettings() {
  await dbConnect();
  let s = await Settings.findOne({ key: "main" });
  if (!s) s = await Settings.create({ key: "main", notifyEmail: process.env.NOTIFY_EMAIL || "" });
  return s;
}

/** Plain JSON (ids as strings) for API responses. */
export function plain<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc));
}
