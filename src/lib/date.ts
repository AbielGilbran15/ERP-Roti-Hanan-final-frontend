const pad = (value: number) => String(value).padStart(2, "0");

export const localDateKey = (value: Date | string = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const startOfLocalDay = (value: Date | string = new Date()) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const endOfLocalDay = (value: Date | string = new Date()) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

export const addLocalDays = (value: Date | string, amount: number) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
};

export const toDateTimeLocalValue = (value: Date) =>
  `${localDateKey(value)}T${pad(value.getHours())}:${pad(value.getMinutes())}`;

export const defaultNeededAt = () => {
  const date = addLocalDays(new Date(), 1);
  date.setHours(8, 0, 0, 0);
  return toDateTimeLocalValue(date);
};
