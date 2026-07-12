export interface Choice {
  id: string;
  text: string;
}

export interface SessionAnswer {
  questionId: string;
  subject: string;
  questionText: string;
  imageUrl?: string;
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  isBlank: boolean;
  explanation?: string;
  choices?: Choice[];
  /** Explicit diagram spec preserved for review-page rendering */
  diagram?: import("./diagram").DiagramSpec;
}

export interface Session {
  id: string;
  answers: SessionAnswer[];
  totalScore: number;
  correctCount?: number;
  wrongCount?: number;
  blankCount?: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  createdAt: string;
}

export interface Question {
  id: string;
  subject: string;
  topic?: string;
  text: string;
  imageUrl?: string;
  passageId?: string;
  choices: Choice[];
  correctAnswer: string;
  explanation?: string;
  /** Explicit diagram specification. When present, the app renders this exactly instead of guessing from text. */
  diagram?: import("./diagram").DiagramSpec;
}
