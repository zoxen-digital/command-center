import { parseQuick, type Parsed } from "./parse";

// Spoken Hindi (Devanagari), Hinglish and English -> the same Parsed shape as quick add.
// Longer phrases come first. JS \b does not understand Devanagari, so words are matched between spaces.
const WORDS: [string, string][] = [
  ["हर रोज़|हर रोज|रोज़ाना|रोजाना|रोज़|रोज|हर दिन|प्रतिदिन|har roz|har din|rozana|roz", "daily"],
  ["हर हफ़्ते|हर हफ्ते|har hafte", "weekly"],
  ["हर महीने|har mahine", "monthly"],
  ["आज|aaj", "today"],
  ["परसों|परसो|parson|parso|day after tomorrow", "in 2 days"],
  ["कल|kal", "tomorrow"],
  ["सोमवार|somvar|somwar", "monday"],
  ["मंगलवार|mangalvar|mangalwar", "tuesday"],
  ["बुधवार|budhvar|budhwar", "wednesday"],
  ["गुरुवार|जुमेरात|guruvar|jumerat", "thursday"],
  ["शुक्रवार|जुम्मा|जुमा|shukravar|jumma", "friday"],
  ["शनिवार|shanivar", "saturday"],
  ["रविवार|इतवार|ravivar|itwar", "sunday"],
  ["सुबह|सवेरे|subah|morning", "~am"],
  ["दोपहर|dopahar|dopeher|afternoon", "~noon"],
  ["शाम|shaam|sham|evening", "~pm"],
  ["रात|raat|night", "~night"],
  ["बजकर|बजे|बजें|bajkar|baje|bje|o'clock", "~baje"],
  ["साढ़े|साढे|sadhe|saadhe", "~half"],
  ["सवा|sawa|sava", "~quarter"],
  ["पौने|paune", "~less"],
];

const NUMBERS: [string, string][] = [
  ["डेढ़|dedh", "1:30"], ["ढाई|dhai", "2:30"],
  ["एक|ek", "1"], ["दो|do", "2"], ["तीन|teen", "3"], ["चार|char|chaar", "4"],
  ["पाँच|पांच|paanch|panch", "5"], ["छह|छः|छे|chhe", "6"], ["सात|saat", "7"], ["आठ|aath", "8"],
  ["नौ|nau", "9"], ["दस|das", "10"], ["ग्यारह|gyarah", "11"], ["बारह|barah", "12"],
];

const norm = (s: string) => s.normalize("NFC");
const swap = (s: string, words: string, to: string) => s.replace(new RegExp(`(?<=\\s)(?:${norm(words)})(?=\\s)`, "giu"), to);

export function parseVoice(input: string, today: string, projects: { id: string; name: string }[] = []): Parsed & { projectId: string | null } {
  let s = norm(input).replace(/[०-९]/g, (c) => String(c.charCodeAt(0) - 0x966));
  s = ` ${s.replace(/\b([ap])\.\s?m\.?(?=\s|$)/gi, "$1m").replace(/[।,!?]|\.(?=\s|$)/g, " ").replace(/\s+/g, " ").trim()} `;

  for (const [w, to] of WORDS) s = swap(s, w, to);
  // Number words only count as numbers around a time, so "ek client" stays as it is.
  for (const [w, to] of NUMBERS) {
    s = s.replace(new RegExp(`(?<=\\s)(?:${norm(w)})(?=\\s~baje\\s)`, "giu"), to);
    s = s.replace(new RegExp(`(?<=~(?:half|quarter|less)\\s)(?:${norm(w)})(?=\\s)`, "giu"), to);
  }

  const part = (s.match(/~(am|noon|pm|night)/) || [])[1];
  let time: string | null = null;
  const m =
    s.match(/(~half |~quarter |~less )?(?<![\d/:-])(\d{1,2})(?::(\d{2}))? ~baje/) ||
    (part ? s.match(/(~half |~quarter |~less )?(?<![\d/:-])(\d{1,2}):(\d{2})(?= )/) : null);
  if (m && Number(m[2]) <= 23 && Number(m[3] || 0) < 60) {
    let h = Number(m[2]);
    let min = Number(m[3] || 0);
    if (h <= 12) {
      if (part === "am") h %= 12;
      else if (part === "noon") h = h === 11 ? 11 : (h % 12) + 12;
      else if (part === "pm") h = (h % 12) + 12;
      else if (part === "night") h = h === 12 ? 0 : h < 5 ? h : h + 12;
      else if (h < 7) h += 12; // nothing said: 1-6 means PM, 7-12 as spoken
    }
    if (m[1] === "~half ") min = 30;
    if (m[1] === "~quarter ") min = 15;
    if (m[1] === "~less ") { h = (h + 23) % 24; min = 45; }
    time = `${String(h % 24).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    s = s.replace(m[0], " ");
  } else if (part && !/\d\s?[ap]m\b/i.test(s)) {
    time = { am: "09:00", noon: "14:00", pm: "18:00", night: "21:00" }[part]!;
  }

  s = s.replace(/\s+/g, " ").replace(/~\w+( (को|में|पर|ko|mein|me))?(?= )/g, " ").replace(/\s+/g, " ");
  s = swap(s, "ज़रूरी|जरूरी|अर्जेंट|urgent|zaroori|zaruri|important|high priority", "!high");
  s = swap(s, "low priority", "!low");
  s = s.replace(/^ (?:please )?(?:add (?:a )?task|new task|task add karo|remind me to|set (?:a )?reminder to)(?: ki| to)? /i, " ");

  const low = s.toLowerCase();
  const project = projects.find((p) => p.name.length > 3 && low.includes(` ${p.name.toLowerCase()} `));

  const out = parseQuick(s.trim(), today);
  if (time) {
    out.time = time;
    out.date ||= today;
  }
  out.title = out.title.replace(/^(?:को|पर|में|ko|at|on)\s+/iu, "").replace(/\s+(?:को|पर|में|ko|at|on)$/iu, "").trim();
  return { ...out, projectId: project?.id ?? null };
}
