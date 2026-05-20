export const getProgressColor = (percentage: number) => {
  if (percentage === 100) return 'bg-emerald-500';
  if (percentage >= 70) return 'bg-blue-500';
  if (percentage >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
};

export const getProgressTextColor = (percentage: number) => {
  if (percentage <= 30) return 'text-rose-500';
  if (percentage <= 65) return 'text-amber-500';
  if (percentage <= 85) return 'text-emerald-400';
  return 'text-emerald-600';
};
