const KEY_PREFIX = "profile_image:";

export function getPrincipalKey(me) {
  const principalType = me?.principal_type || me?.principalType || me?.type;
  const userId = me?.user?.user_id || me?.user?.id || me?.user_id;
  const employeeId = me?.employee?.employee_id || me?.employee?.id || me?.employee_id;
  const id = userId || employeeId || "unknown";
  const t = principalType || (userId ? "user" : employeeId ? "employee" : "unknown");
  return `${KEY_PREFIX}${t}:${id}`;
}

export function loadProfileImage(me) {
  try {
    const key = getPrincipalKey(me);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveProfileImage(me, dataUrl) {
  const key = getPrincipalKey(me);
  localStorage.setItem(key, dataUrl);
}

export function clearProfileImage(me) {
  const key = getPrincipalKey(me);
  localStorage.removeItem(key);
}

