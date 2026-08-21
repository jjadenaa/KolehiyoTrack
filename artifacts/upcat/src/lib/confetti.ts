import confetti from "canvas-confetti";

export const UNIVERSITY_CONFETTI_COLORS: Record<string, string[]> = {
  upcat: ["#7B1113", "#014421", "#F1B82D", "#FFFFFF", "#8B1E22"], // UP Maroon, Forest Green, Gold
  acet: ["#0038A8", "#002060", "#FFFFFF", "#C5A059", "#4B88FF"], // Ateneo Blue, Gold, White
  dcat: ["#006A4E", "#118C4F", "#FFFFFF", "#C5A059", "#2ECC71"], // DLSU Green, White, Gold
  ustet: ["#F1B82D", "#1A1A1A", "#FFFFFF", "#FFD700", "#E67E22"], // UST Gold, Black, White
  default: ["#6366F1", "#10B981", "#F59E0B", "#EC4899", "#3B82F6"],
};

/**
 * Standard test completion confetti cannon burst from bottom corners
 */
export function triggerCompletionConfetti(universityId: string = "upcat") {
  const colors = UNIVERSITY_CONFETTI_COLORS[universityId] || UNIVERSITY_CONFETTI_COLORS.default;

  // Left cannon
  confetti({
    particleCount: 50,
    angle: 60,
    spread: 60,
    origin: { x: 0.05, y: 0.75 },
    colors,
    ticks: 250,
    gravity: 1.1,
    scalar: 1.1,
  });

  // Right cannon
  confetti({
    particleCount: 50,
    angle: 120,
    spread: 60,
    origin: { x: 0.95, y: 0.75 },
    colors,
    ticks: 250,
    gravity: 1.1,
    scalar: 1.1,
  });

  // Center sparkle pop after slight delay
  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 90,
      origin: { x: 0.5, y: 0.45 },
      colors: ["#FFD700", "#FFA500", "#FFFFFF", ...colors],
      ticks: 200,
      gravity: 0.9,
      scalar: 1.2,
      shapes: ["circle", "star" as any],
    });
  }, 220);
}

/**
 * High score / Outstanding achievement continuous multi-burst fireworks explosion
 */
export function triggerHighScoreConfetti(universityId: string = "upcat") {
  const colors = UNIVERSITY_CONFETTI_COLORS[universityId] || UNIVERSITY_CONFETTI_COLORS.default;
  const duration = 2.8 * 1000;
  const animationEnd = Date.now() + duration;

  // Big initial blast
  confetti({
    particleCount: 90,
    spread: 100,
    origin: { y: 0.55, x: 0.5 },
    colors: ["#FFD700", "#FFF", ...colors],
    scalar: 1.3,
    ticks: 300,
  });

  const interval: any = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 35 * (timeLeft / duration);

    // Random fireworks across the screen
    confetti({
      particleCount,
      startVelocity: 30,
      spread: 360,
      ticks: 200,
      origin: {
        x: Math.random() * 0.8 + 0.1,
        y: Math.random() * 0.4 + 0.15,
      },
      colors: ["#FFD700", ...colors],
      scalar: Math.random() * 0.6 + 0.8,
    });
  }, 350);
}
