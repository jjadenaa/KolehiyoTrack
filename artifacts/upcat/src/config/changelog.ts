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
export const CURRENT_VERSION = "v0.0.2 Beta";

// 2. Add or update release notes here (newest first)
export const CHANGELOG_DATA: ChangelogItem[] = [
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
