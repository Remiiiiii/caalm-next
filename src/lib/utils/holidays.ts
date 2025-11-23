import Holidays from 'date-holidays';

/**
 * Get US federal holidays for a given year
 */
export function getUSHolidays(year: number): Array<{
  date: Date;
  name: string;
  type: string;
}> {
  const hd = new Holidays('US');
  const holidays = hd.getHolidays(year);
  
  return holidays.map((holiday) => ({
    date: new Date(holiday.date),
    name: holiday.name,
    type: holiday.type || 'public',
  }));
}

/**
 * Get US holidays for a specific month
 */
export function getUSHolidaysForMonth(year: number, month: number): Array<{
  date: Date;
  name: string;
  type: string;
}> {
  const allHolidays = getUSHolidays(year);
  return allHolidays.filter((holiday) => {
    const holidayMonth = holiday.date.getMonth() + 1; // getMonth() returns 0-11
    return holidayMonth === month;
  });
}

/**
 * Check if a date is a US federal holiday
 */
export function isUSHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const holidays = getUSHolidays(year);
  const dateStr = date.toISOString().split('T')[0];
  
  return holidays.some((holiday) => {
    const holidayStr = holiday.date.toISOString().split('T')[0];
    return holidayStr === dateStr;
  });
}

