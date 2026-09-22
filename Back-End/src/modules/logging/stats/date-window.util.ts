export interface DateWindowResult {
  start: string;
  end: string;
  days: string[];
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export function getDateWindow(days = 30, today = new Date()): DateWindowResult {
  const endDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const startDate = new Date(endDate.getTime() - (days - 1) * DAY_MS);
  const list: string[] = [];
  for (let i = 0; i < days; i += 1) {
    list.push(
      new Date(startDate.getTime() + i * DAY_MS).toISOString().slice(0, 10),
    );
  }
  return {
    start: list[0],
    end: list[list.length - 1],
    days: list,
  };
}
