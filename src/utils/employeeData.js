import { API_CONFIG } from "../config/apiConfig";

function getApiOrigin() {
  try {
    return new URL(API_CONFIG.BASE_URL).origin;
  } catch {
    return null;
  }
}

function toAbsoluteUrl(value) {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const origin = getApiOrigin();
  if (!origin) return trimmed;

  if (trimmed.startsWith("/")) {
    return `${origin}${trimmed}`;
  }

  return `${origin}/${trimmed.replace(/^\.?\//, "")}`;
}

function pickProfileImageUrl(employee) {
  if (!employee || typeof employee !== "object") return null;

  const candidates = [
    employee.profileImageUrl,
    employee.profilePictureUrl,
    employee.profilePhotoUrl,
    employee.avatarUrl,
    employee.imageUrl,
    employee.photoUrl,
    employee.profileImage,
    employee.profilePicture,
    employee.profilePhoto,
    employee.avatar,
    employee.image,
    employee.photo,
    employee.account?.profileImageUrl,
    employee.account?.profilePictureUrl,
    employee.account?.profilePhotoUrl,
    employee.account?.avatarUrl,
    employee.account?.imageUrl,
    employee.user?.profileImageUrl,
    employee.user?.profilePictureUrl,
    employee.user?.profilePhotoUrl,
    employee.user?.avatarUrl,
    employee.user?.imageUrl,
  ];

  for (const candidate of candidates) {
    const resolved = toAbsoluteUrl(candidate);
    if (resolved) return resolved;
  }

  return null;
}

export function normalizeEmployeeData(value) {
  if (!value) return null;

  const employee =
    value.data && typeof value.data === "object" && !Array.isArray(value.data)
      ? value.data
      : value;

  if (!employee || typeof employee !== "object" || Array.isArray(employee)) {
    return employee;
  }

  const profileImageUrl = pickProfileImageUrl(employee);

  return {
    ...employee,
    profileImageUrl,
  };
}

export function unwrapEmployeeResponse(response) {
  return normalizeEmployeeData(response?.data);
}
