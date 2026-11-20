import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";

type Props = { percentage: number };

const BookCoverProgressBar = ({ percentage }: Props) => {
  const w = Math.min(100, Math.max(0, percentage));
  return (
    <Box
      aria-hidden
      sx={(t) => ({
        pointerEvents: "none",
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 5,
        height: 4,
        bgcolor: alpha(t.surfaces.highest, 0.95),
        borderTop: `1px solid ${alpha(t.palette.divider, 0.3)}`,
        fontVariantNumeric: "tabular-nums",
      })}
    >
      <Box
        sx={{
          height: "100%",
          width: `${w}%`,
          bgcolor: "secondary.main",
          transition: "width 0.3s ease",
        }}
      />
    </Box>
  );
};

export default BookCoverProgressBar;
