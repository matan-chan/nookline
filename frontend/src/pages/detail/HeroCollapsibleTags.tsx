import { Box, Button, Chip, Stack, useMediaQuery, useTheme } from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import { useState } from "react";
import { DETAIL_LAVENDER } from "./detailPurpleAccent";

const MOBILE_TAG_LIMIT = 3;

type Props = {
  labels: string[];
  seeMoreLabel: string;
  seeLessLabel: string;
};

export const HeroCollapsibleTags = ({ labels, seeMoreLabel, seeLessLabel }: Props) => {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("sm"));
  const [expanded, setExpanded] = useState(false);
  if (labels.length === 0) return null;

  const overLimit = labels.length > MOBILE_TAG_LIMIT;
  const collapsed = narrow && overLimit && !expanded;
  const visible = collapsed ? labels.slice(0, MOBILE_TAG_LIMIT) : labels;
  const showToggle = narrow && overLimit;

  const chipSx = (th: Theme) => ({
    bgcolor: th.surfaces.high,
    color: "text.secondary",
    border: `1px solid ${alpha(DETAIL_LAVENDER, 0.35)}`,
    fontWeight: 600,
    fontSize: { xs: "0.6rem", md: "0.65rem" },
    letterSpacing: "0.06em",
    height: { xs: 24, md: 28 },
  });

  const toggleButton = showToggle ? (
    <Button
      size="small"
      onClick={() => setExpanded((v) => !v)}
      aria-expanded={expanded}
      sx={{
        alignSelf: "center",
        p: 0,
        minWidth: 0,
        textTransform: "none",
        fontSize: { xs: "0.6875rem", sm: "0.75rem" },
        color: DETAIL_LAVENDER,
        flexShrink: 0,
      }}
    >
      {expanded ? seeLessLabel : seeMoreLabel}
    </Button>
  ) : null;

  if (!showToggle) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", width: "100%", alignItems: { xs: "stretch", md: "flex-start" } }}>
        <Stack direction="row" flexWrap="wrap" gap={1} justifyContent={{ xs: "center", md: "flex-start" }}>
          {visible.map((label) => (
            <Chip key={label} label={label} size="small" sx={(th) => chipSx(th)} />
          ))}
        </Stack>
      </Box>
    );
  }

  const lastLabel = visible[visible.length - 1];
  const leadingLabels = visible.slice(0, -1);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%", alignItems: { xs: "stretch", md: "flex-start" } }}>
      <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" justifyContent={{ xs: "center", md: "flex-start" }}>
        {leadingLabels.map((label) => (
          <Chip key={label} label={label} size="small" sx={(th) => chipSx(th)} />
        ))}
        <Stack direction="row" flexWrap="nowrap" gap={1} alignItems="center" sx={{ maxWidth: "100%" }}>
          <Chip key={lastLabel} label={lastLabel} size="small" sx={(th) => chipSx(th)} />
          {toggleButton}
        </Stack>
      </Stack>
    </Box>
  );
};
