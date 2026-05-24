export const ADMIN_TOKEN_KEY = 'ktm.admin.token'

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
  window.dispatchEvent(new CustomEvent('ktm:admin-signed-in'))
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  window.dispatchEvent(new CustomEvent('ktm:admin-signed-out'))
}

export function isAdminSignedIn(): boolean {
  return Boolean(getAdminToken())
}
