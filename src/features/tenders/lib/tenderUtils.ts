export const truncateText = (text: string, maxLength: number) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

export const formatDate = (date: string) => {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleString("default", { month: "long" });
  const year = d.getFullYear();
  const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `${day}${suffix} ${month}, ${year}`;
};

export const getTimeStatus = (closingDate: string) => {
  const now = new Date();
  const closing = new Date(closingDate);
  const diff = closing.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;

  if (diff > 0) {
    return { text: `(${months} months ${remainingDays} days) remaining`, color: "text-green-600" };
  }
  const absDays = Math.abs(days);
  const absMonths = Math.floor(absDays / 30);
  const absRemainingDays = absDays % 30;
  return { text: `Expired ${absMonths} months ${absRemainingDays} days ago`, color: "text-red-600" };
};
