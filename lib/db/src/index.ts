import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: any = null;
let db: any = null;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
  } catch (err) {
    console.warn("[AI Studio] Real database initialization failed, falling back to mock:", err);
  }
} else {
  console.warn("[AI Studio] DATABASE_URL not set — using mock database fallback");
}

if (!db) {
  const createMockChain = (): any => {
    const mock: any = () => mock;
    mock[Symbol.iterator] = function* () {
      yield mock;
    };
    return new Proxy(mock, {
      get: (target, prop) => {
        if (prop === Symbol.iterator) {
          return target[Symbol.iterator];
        }
        if (prop === "then") {
          return (resolve: any) =>
            resolve([
              {
                id: "mock_id",
                totalScore: "0",
                answers: [],
                totalQuestions: 0,
                timeTakenSeconds: 0,
                subject: "math",
                text: "Mock Question",
                choices: [],
                correctAnswer: "A",
                explanation: "Mock Explanation",
              },
            ]);
        }
        return createMockChain();
      },
    });
  };

  db = createMockChain();
}

export { pool, db };
export * from "./schema";
