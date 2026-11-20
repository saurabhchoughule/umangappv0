export const todayISO = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

const at = (iso) => new Date(`${iso}T00:00:00`);
export const isValidDate = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(at(iso).getTime());
export const weekdayOf = (iso) => (isValidDate(iso) ? at(iso).toLocaleDateString("en-US", { weekday: "long" }) : "");
export const dateParts = (iso) => ({
  day: at(iso).getDate(),
  mon: at(iso).toLocaleDateString("en-US", { month: "short" }),
  year: at(iso).getFullYear(),
});
export const longDate = (iso) => at(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
