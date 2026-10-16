export interface DeveloperInfo {
  name: string;
  role: string;
  linkedin: string;
  github: string;
  portfolio: string;
  whatsapp: string;
  facebook: string;
}

export interface TeacherInfo {
  name: string;
  role: string;
  whatsapp: string;
  facebook: string;
  youtube: string;
  phoneDisplay: string;
}

export const DEVELOPER: DeveloperInfo = {
  name: "Mir Mohammad Sajedul Islam",
  role: "Platform Architect & Lead Developer",
  linkedin: "https://www.linkedin.com/in/sajedul-islam-data/",
  github: "https://github.com/sajedulislam5840",
  portfolio: "https://sajedulislam5840.github.io/portfolio/",
  whatsapp: "https://wa.me/8801909027695",
  facebook: "https://www.facebook.com/rabbi12411",
};

export const TEACHER: TeacherInfo = {
  name: "AZS RAZON SIR",
  role: "Lead Academic Mentor (Physics & Chemistry)",
  whatsapp: "https://wa.me/8801916201426",
  facebook: "https://www.facebook.com/razon.sikdar.1",
  youtube: "https://www.youtube.com/@AZSChemistry",
  phoneDisplay: "+880 1916-201426",
};
