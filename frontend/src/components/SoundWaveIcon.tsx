import { SvgIcon, type SvgIconProps } from "@mui/material";

const IDLE_HEIGHTS = [5, 8, 12, 7, 14, 8, 11, 6, 13, 9, 10, 6] as const;

type Props = SvgIconProps & {
  levels?: number[];
};

export const SoundWaveIcon = ({ levels, ...props }: Props) => {
  const bars = levels?.length === 12 ? levels : [...IDLE_HEIGHTS];
  return (
    <SvgIcon viewBox="0 0 32 16" {...props}>
      {bars.map((h, i) => {
        const x = 1 + i * 2.55;
        const y = (16 - h) / 2;
        return <rect key={i} x={x} y={y} width={1.6} height={h} rx={0.8} />;
      })}
    </SvgIcon>
  );
};