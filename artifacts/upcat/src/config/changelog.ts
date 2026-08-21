export interface ChangelogItem {
  version: string;
  date: string;
  isCurrent?: boolean;
  changes: {
    title: string;
    description: string;
  }[];
}

// 1. Change your global version number here
export const CURRENT_VERSION = "v0.3.0 Beta";

// 2. Add or update release notes here (newest first)
export const CHANGELOG_DATA: ChangelogItem[] = [
   {
    version: "v0.3.1",
    date: "August 21, 2026",
    changes: [
      {
        title: "Added PDF import, added more universities, +more features and bug fixes",
        description: "Added AI to import PDF reviewers & manual import, added DLSU & ACET, ability to set exam dates, bug fixes"
      }
    ]
  },
  {
    version: "v0.3.0",
    date: "July 26, 2026",
    changes: [
      {
        title: "Added AI chatbox support, updated college applications, bug fixes",
        description: "Added Gemini 3.6 support, calendar, more university application reminders, smooth UI animations, bug fixes"
      }
    ]
  },
  {
    version: "v0.2.1",
    date: "July 26, 2026",
    changes: [
      {
        title: "Added better table support, Bug fixes + More",
        description: "Added better looks for questions that uses tables, added more animations, several bug fixes "
      }
    ]
  },
  {
    version: "v0.2.0",
    date: "July 24, 2026",
    changes: [
      {
        title: "Bicol University College Entrance Test 2027, Bug fixes + More",
        description: "Added BUCET 2027 Mock Tests, improved question sync and fixed major bugs. "
      }
    ]
  },
  {
    version: "v0.1.0",
    date: "July 17, 2026",
    changes: [
      {
        title: "Missions, Targets, Application Timeline, Bug fixes + More",
        description: "Added daily missions that resets every midnight, added specific goals to achieve, get updated when universities open their applications, improved UI, and fixed major bugs. "
      }
    ]
  },
  {
    version: "v0.0.2",
    date: "July 13, 2026",
    changes: [
      {
        title: "Daily Streak Count + bug fixes",
        description: "Added daily streak count for users."
      }
    ]
  },
  {
    version: "v0.0.1",
    date: "July 2026",
    changes: [
      {
        title: "Initial Release",
        description: "Launched high-fidelity mock test engine supporting UPCAT custom question banks, real-time grading, and performance tracking."
      }
    ]
  }
];
