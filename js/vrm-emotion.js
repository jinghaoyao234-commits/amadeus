export const emotionToVrmExpression = {
  neutral: {},
  smile: { happy: 1 },
  annoyed: { angry: 1 },
  sad: { sad: 1 },
  surprised: { surprised: 1 },
  thinking: { relaxed: .5 },
  embarrassed: { happy: .35, relaxed: .3 }
};
