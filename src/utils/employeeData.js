export function normalizeEmployeeData(value) {
  if (!value) return null;

  if (value.data && typeof value.data === 'object' && !Array.isArray(value.data)) {
    return value.data;
  }

  return value;
}

export function unwrapEmployeeResponse(response) {
  return normalizeEmployeeData(response?.data);
}
