function parseEmploymentDate(value) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function getEmployeeJoiningDate(employee) {
  return parseEmploymentDate(employee?.joiningDate);
}

export function hasEmployeeJoined(employee, referenceDate = new Date()) {
  const joiningDate = getEmployeeJoiningDate(employee);
  if (!joiningDate) return true;
  return startOfDay(referenceDate).getTime() >= startOfDay(joiningDate).getTime();
}

export function isOnOrAfterJoiningDate(date, employee) {
  const joiningDate = getEmployeeJoiningDate(employee);
  if (!joiningDate) return true;
  return startOfDay(date).getTime() >= startOfDay(joiningDate).getTime();
}

export function formatJoiningDate(employee, locale = 'en-US') {
  const joiningDate = getEmployeeJoiningDate(employee);
  if (!joiningDate) return '—';
  return joiningDate.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
