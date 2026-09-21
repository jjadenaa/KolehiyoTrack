export interface ApplicationTimeline {
  id: string;
  shortName?: string;
  fullName: string;
  openStr: string;
  closeStr: string;
  openDate: Date;
  closeDate?: Date;
  applyUrl: string;
  institutionType?: "State University" | "Public" | "Private" | "Government Scholarship";
  islandGroup?: "Luzon" | "Visayas" | "Mindanao" | "Nationwide";
  region?: string;
  isUAAP?: boolean;
  isBig4?: boolean;
  isNCAA?: boolean;
}

export const APPLICATION_TIMELINES: ApplicationTimeline[] = [
  {
    id: "slsu",
    fullName: "Southern Luzon State University",
    openStr: "September 10, 2026",
    closeStr: "December 3, 2026",
    openDate: new Date("2026-09-10T00:00:00"),
    closeDate: new Date("2026-12-03T23:59:59"),
    applyUrl: "https://slsu.edu.ph/",
  },
  {
    id: "neust",
    fullName: "Nueva Ecija University of Science and Technology",
    openStr: "September 3, 2026",
    closeStr: "November 30, 2026",
    openDate: new Date("2026-09-03T00:00:00"),
    closeDate: new Date("2026-11-30T23:59:59"),
    applyUrl: "https://neust.edu.ph/",
  },
  {
    id: "ucn",
    fullName: "University of Camarines Norte",
    openStr: "September 7, 2026",
    closeStr: "October 30, 2026",
    openDate: new Date("2026-09-07T00:00:00"),
    closeDate: new Date("2026-10-30T23:59:59"),
    applyUrl: "https://ucn.edu.ph/",
  },
  {
    id: "jru",
    fullName: "Jose Rizal University",
    openStr: "September 7, 2026",
    closeStr: "TBA",
    openDate: new Date("2026-09-07T00:00:00"),
    applyUrl: "https://jru.edu/",
  },
  {
    id: "ssu",
    fullName: "Sorsogon State University",
    openStr: "September 7, 2026",
    closeStr: "December 4, 2026",
    openDate: new Date("2026-09-07T00:00:00"),
    closeDate: new Date("2026-12-04T23:59:59"),
    applyUrl: "https://sorsu.edu.ph/",
  },
  {
    id: "admu",
    fullName: "Ateneo de Manila University",
    openStr: "June 22, 2026",
    closeStr: "August 24, 2026",
    openDate: new Date("2026-06-22T00:00:00"),
    closeDate: new Date("2026-08-24T23:59:59"),
    applyUrl: "https://ateneo.admissions.ph/",
  },
  {
    id: "dlsu",
    fullName: "De La Salle University",
    openStr: "July 15, 2026",
    closeStr: "September 30, 2026",
    openDate: new Date("2026-07-15T00:00:00"),
    closeDate: new Date("2026-09-30T23:59:59"),
    applyUrl: "https://applyarchershub.dlsu.edu.ph/ApplicationLandingPage/index/DLSU",
  },
  {
    id: "bu",
    fullName: "Bicol University",
    openStr: "July 23, 2026",
    closeStr: "October 30, 2026",
    openDate: new Date("2026-07-23T00:00:00"),
    closeDate: new Date("2026-10-30T23:59:59"),
    applyUrl: "https://ibu.bicol-u.edu.ph/sign-up?fbclid=IwY2xjawTQPAJwZG9mAWV4dG4DYWVtAjEwAGJyaWQRMUEzSHpab2JIZ3hWMUhXaWRzcnRjBmFwcF9pZBAyMjIwMzkxNzg4MjAwODkyAAEeTjS04h49KzBzXXXEaiX2Da6cZA9L2zAs1TctSssit2Uj4g5iW7snT69yb04_aem_kbbDwP7cLHCmOLDVE3__dA",
  },
  {
    id: "nu",
    fullName: "National University",
    openStr: "August 8, 2026",
    closeStr: "TBA",
    openDate: new Date("2026-08-08T00:00:00"),
    applyUrl: "https://onlineapp.national-u.edu.ph/quest/register.php?fbclid=IwY2xjawTlVvlwZG9mAWV4dG4DYWVtAjEwAGJyaWQRMWoxM0RBazZCMm8xT0JVcHdzcnRjBmFwcF9pZBAyMjIwMzkxNzg4MjAwODkyAAEeFhNu_FJ9xs6Q1LrXWWkyzbilyC80NGxIL3HkcE_3vVKMn387UZJg0hUcp3Q_aem_o2XOUjub7T4nVo5RD6JESg",
  },
  {
    id: "adu",
    shortName: "ADU",
    fullName: "Adamson University",
    openStr: "September 17, 2026",
    closeStr: "TBA",
    openDate: new Date("2026-09-17T00:00:00"),
    applyUrl: "https://www.adamson.edu.ph/",
  },
  {
    id: "benilde",
    shortName: "DLSU-BENILDE",
    fullName: "De La Salle-College of Saint Benilde",
    openStr: "September 15, 2026",
    closeStr: "March 17, 2027",
    openDate: new Date("2026-09-15T00:00:00"),
    closeDate: new Date("2027-03-17T23:59:59"),
    applyUrl: "https://www.benilde.edu.ph/",
  },
  {
    id: "dost",
    fullName: "DOST - SEI Scholarship",
    openStr: "August 17, 2026",
    closeStr: "September 24, 2026",
    openDate: new Date("2026-08-17T00:00:00"),
    closeDate: new Date("2026-09-24T23:59:59"),
    applyUrl: "https://www.sei.dost.gov.ph/",
  },
  {
    id: "ust",
    fullName: "University of Santo Tomas",
    openStr: "August 8, 2026",
    closeStr: "January 8, 2027",
    openDate: new Date("2026-08-08T00:00:00"),
    closeDate: new Date("2027-01-08T23:59:59"),
    applyUrl: "https://ustet.ust.edu.ph/home?id=blue",
  },
  {
    id: "bulsu",
    fullName: "Bulacan State University",
    openStr: "August 25, 2026",
    closeStr: "November 27, 2026",
    openDate: new Date("2026-08-25T00:00:00"),
    closeDate: new Date("2026-11-27T23:59:59"),
    applyUrl: "https://bulsu.edu.ph/",
  },
  {
    id: "feu",
    fullName: "Far Eastern University",
    openStr: "September 5, 2026",
    closeStr: "TBA",
    openDate: new Date("2026-09-05T00:00:00"),
    applyUrl: "https://www.feu.edu.ph/",
  },
  {
    id: "naap",
    fullName: "National Aviation Academy of the Philippines",
    openStr: "September 1, 2026",
    closeStr: "October 31, 2026",
    openDate: new Date("2026-09-01T00:00:00"),
    closeDate: new Date("2026-10-31T23:59:59"),
    applyUrl: "https://caap.gov.ph/",
  },
  {
    id: "plm",
    fullName: "Pamantasan ng Lungsod ng Maynila",
    openStr: "August 14, 2026",
    closeStr: "September 30, 2026",
    openDate: new Date("2026-08-14T00:00:00"),
    closeDate: new Date("2026-09-30T23:59:59"),
    applyUrl: "https://plm.edu.ph/",
  },
  {
    id: "pnu",
    fullName: "Philippine Normal University",
    openStr: "August 3, 2026",
    closeStr: "October 23, 2026",
    openDate: new Date("2026-08-03T00:00:00"),
    closeDate: new Date("2026-10-23T23:59:59"),
    applyUrl: "https://pwebss.pnu.edu.ph/pnu/applicants/",
  },
  {
    id: "dlsp",
    shortName: "DLSP",
    fullName: "Dalubhasaan ng Lungsod ng San Pablo",
    openStr: "October 5, 2026",
    closeStr: "TBA",
    openDate: new Date("2026-10-05T00:00:00"),
    applyUrl: "https://dlsp.edu.ph/",
  },
  {
    id: "evsu",
    shortName: "EVSU",
    fullName: "Eastern Visayas State University",
    openStr: "November 3, 2026",
    closeStr: "TBA",
    openDate: new Date("2026-11-03T00:00:00"),
    applyUrl: "https://evsu.edu.ph/",
  },
  {
    id: "mseuf",
    shortName: "MSEUF",
    fullName: "Manuel S. Enverga University Foundation",
    openStr: "September 17, 2026",
    closeStr: "TBA",
    openDate: new Date("2026-09-17T00:00:00"),
    applyUrl: "https://mseuf.edu.ph/",
  },
  {
    id: "plp",
    shortName: "PLP",
    fullName: "Pamantasan ng Lungsod ng Pasig",
    openStr: "September 21, 2026",
    closeStr: "TBA",
    openDate: new Date("2026-09-21T00:00:00"),
    applyUrl: "https://plp.edu.ph/",
  },
  {
    id: "bisu",
    shortName: "BISU",
    fullName: "Bohol Island State University",
    openStr: "September 15, 2026",
    closeStr: "November 27, 2026",
    openDate: new Date("2026-09-15T00:00:00"),
    closeDate: new Date("2026-11-27T23:59:59"),
    applyUrl: "https://bisu.edu.ph/",
  },
  {
    id: "vsu",
    shortName: "VSU",
    fullName: "Visayas State University",
    openStr: "September 14, 2026",
    closeStr: "November 14, 2026",
    openDate: new Date("2026-09-14T00:00:00"),
    closeDate: new Date("2026-11-14T23:59:59"),
    applyUrl: "https://vsu.edu.ph/",
  },
  {
    id: "dlsu-lipa",
    shortName: "DLSU-LIPA",
    fullName: "De La Salle Lipa",
    openStr: "September 7, 2026",
    closeStr: "TBA",
    openDate: new Date("2026-09-07T00:00:00"),
    applyUrl: "https://www.dlsl.edu.ph/",
  },
  {
    id: "cspc",
    shortName: "CSPC",
    fullName: "Camarines Sur Polytechnic Colleges",
    openStr: "October 1, 2026",
    closeStr: "October 31, 2026",
    openDate: new Date("2026-10-01T00:00:00"),
    closeDate: new Date("2026-10-31T23:59:59"),
    applyUrl: "https://cspc.edu.ph/",
  },
  {
    id: "addu",
    shortName: "ADDU",
    fullName: "Ateneo de Davao University",
    openStr: "September 18, 2026",
    closeStr: "TBA",
    openDate: new Date("2026-09-18T00:00:00"),
    applyUrl: "https://www.addu.edu.ph/",
    institutionType: "Private",
    islandGroup: "Mindanao",
    region: "Region XI",
  },
  {
    id: "kld",
    shortName: "KLD",
    fullName: "Kolehiyo ng Lungsod ng Dasmariñas",
    openStr: "September 21, 2026",
    closeStr: "October 2, 2026",
    openDate: new Date("2026-09-21T00:00:00"),
    closeDate: new Date("2026-10-02T23:59:59"),
    applyUrl: "https://kld.edu.ph/",
    institutionType: "Public",
    islandGroup: "Luzon",
    region: "Region IV-A",
  },
];

export function getActiveApplicationTimelines(): ApplicationTimeline[] {
  const now = new Date();
  return APPLICATION_TIMELINES.filter((item) => {
    // If there's a closing date, only show it if the closing date hasn't passed
    if (item.closeDate) {
      return now <= item.closeDate;
    }
    // If TBA or open ongoing, keep it
    return true;
  }).sort((a, b) => {
    if (!a.closeDate && !b.closeDate) return 0;
    if (!a.closeDate) return 1;
    if (!b.closeDate) return -1;
    return a.closeDate.getTime() - b.closeDate.getTime();
  });
}

export const STUDY_TIPS_POOL = [
  "Review core math formulas and read 20 mins of English passages daily",
  "Don't leave blank items if there's no right-minus-wrong penalty; always make an educated guess",
  "Simulate actual exam timing using mock tests to build mental stamina and speed",
  "Master ratio, proportion, and algebra fundamentals — they show up in both Math and Science",
  "In Filipino and English Reading Comprehension, read the questions first before tackling long passages",
  "Track your recurring mistakes in the Mistake Diary to turn weak spots into strengths",
  "Get at least 7–8 hours of restful sleep before mock tests and review days to consolidate memory",
  "Practice active recall by explaining complex concepts aloud without looking at your notes",
  "Focus heavily on high-yield science topics: Genetics, Cell Biology, Kinematics, and Stoichiometry",
  "Pace yourself during tests: spend no more than 60–75 seconds on single-step multiple choice questions"
];
