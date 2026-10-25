import confetti from 'canvas-confetti';

export function burst(colors = ['#D6336C', '#F2A93B', '#FFD27A', '#22306B', '#ffffff']) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const base = { spread: 80, ticks: 220, gravity: 0.9, scalar: 1.1, colors };
  confetti({ ...base, particleCount: 60, origin: { x: 0.2, y: 0.7 }, angle: 60 });
  confetti({ ...base, particleCount: 60, origin: { x: 0.8, y: 0.7 }, angle: 120 });
  setTimeout(() => confetti({ ...base, particleCount: 80, spread: 120, origin: { y: 0.4 } }), 250);
}
