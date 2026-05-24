export const buildInfo = {
  env: import.meta.env.VITE_APP_ENV || 'development',
  branch: import.meta.env.VITE_GIT_BRANCH || 'local',
  sha: import.meta.env.VITE_GIT_SHA || 'dev',
} as const

export const buildInfoLabel = `${buildInfo.env} · ${buildInfo.branch} · ${buildInfo.sha}`
