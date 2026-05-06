import SvgIcon from "@mui/material/SvgIcon";
import type { SvgIconProps } from "@mui/material";

export const SidebarCollapseIcon = ({ sx, ...props }: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24" sx={sx}>
    <rect fill="none" height={14} rx={2} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} x={5} y={6} />
    <path d="m9 6.95V19.08" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    <path d="M8.45 10.15 6.15 11.975 8.52 13.93" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </SvgIcon>
);
