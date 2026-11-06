/** Which of the four playable simulations suits a chapter, judged from its name. */

export type SimId = "projectile" | "bohr" | "molecule" | "ph";

interface Rule {
  sim: SimId;
  subject: "PHYSICS" | "CHEMISTRY";
  test: RegExp;
  /** Names that look similar but are a different topic (e.g. "Thermodynamics" is not dynamics). */
  not?: RegExp;
}

// English and Bangla chapter names. "ph" is matched as a whole word so "physics" never counts.
const RULES: Rule[] = [
  {
    sim: "projectile",
    subject: "PHYSICS",
    test: /projectile|kinemat|vector|mechanics|newton|\bmotion\b|\bdynamics\b|\bforce|gravit|প্রাস|ভেক্টর|গতি|নিউটন|মহাকর্ষ/i,
    not: /harmonic|circular|rotation|wave|thermo|ঘূর্ণন|তরঙ্গ|কম্পন|দোলন|তাপ/i,
  },
  {
    sim: "bohr",
    subject: "PHYSICS",
    test: /atom|quantum|bohr|spectr|nuclear|photo ?electric|modern physics|পরমাণু|কোয়ান্টাম|বোর|বর্ণালী|আধুনিক পদার্থ/i,
  },
  {
    sim: "molecule",
    subject: "CHEMISTRY",
    test: /bond|molecul|geometr|vsepr|hybrid|structure|organic|রাসায়নিক বন্ধন|বন্ধন|আণবিক|অণু|জ্যামিতি|গঠন/i,
  },
  {
    sim: "ph",
    subject: "CHEMISTRY",
    test: /\bph\b|acid|base|alkali|solution|titrat|buffer|equilibri|ionic|অম্ল|ক্ষার|দ্রবণ|পিএইচ|সাম্যাবস্থা|আয়ন/i,
  },
];

/** The first matching simulation for the chapter's own subject, or null when nothing fits. */
export function simForChapter(chapter: string, subject: string): SimId | null {
  const subj = subject.toUpperCase() === "CHEMISTRY" ? "CHEMISTRY" : "PHYSICS";
  for (const rule of RULES) {
    if (rule.subject === subj && rule.test.test(chapter) && !(rule.not && rule.not.test(chapter))) return rule.sim;
  }
  return null;
}
