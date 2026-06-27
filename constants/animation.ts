export const Duration = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
} as const;

export const Spring = {
  gentle: { damping: 20, stiffness: 150 },
  bouncy: { damping: 14, stiffness: 120 },
  snappy: { damping: 18, stiffness: 180 },
} as const;
