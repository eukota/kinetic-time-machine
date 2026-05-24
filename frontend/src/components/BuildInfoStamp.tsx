import { buildInfo, buildInfoLabel } from '../lib/buildInfo'

export const BuildInfoStamp = () => (
  <p
    className="flex-shrink-0 text-center py-1 px-2 bg-kinetic-navy border-t border-white/5 text-[10px] font-mono font-medium text-white/25 tracking-wide select-all"
    title={`Build: ${buildInfoLabel}`}
  >
    {buildInfoLabel}
  </p>
)
