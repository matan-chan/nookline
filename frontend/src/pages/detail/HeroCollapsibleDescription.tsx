import { Box, Button, Typography } from "@mui/material";
import { useLayoutEffect, useRef, useState } from "react";

const scrollbarHiddenSx = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  "&::-webkit-scrollbar": { display: "none" },
} as const;

const DESCRIPTION_SCROLL_BODY_PX = 108;

type LineClamp = { xs: number; sm: number; md: number };

type Props = {
  text: string;
  seeMoreLabel: string;
  seeLessLabel: string;
  lineClamp: LineClamp;
  toggleSx?: Record<string, unknown>;
};

export const HeroCollapsibleDescription = ({ text, seeMoreLabel, seeLessLabel, lineClamp, toggleSx }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const measureRef = useRef<HTMLParagraphElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const body = scrollBodyRef.current;
    const p = measureRef.current;
    if (!body || !p || expanded) return;
    const measure = () => {
      const el = measureRef.current;
      const box = scrollBodyRef.current;
      if (!el || !box) return;
      setShowToggle(el.scrollHeight > box.clientHeight + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(body);
    return () => ro.disconnect();
  }, [text, expanded]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        flex: { xs: "none", md: 1 },
        minHeight: { xs: 0, md: 0 },
        minWidth: 0,
      }}
    >
      <Box
        ref={scrollBodyRef}
        sx={{
          width: "100%",
          maxWidth: 640,
          mx: { xs: "auto", md: 0 },
          flex: { xs: "none", md: 1 },
          minHeight: { xs: 0, md: DESCRIPTION_SCROLL_BODY_PX },
          height: { xs: "auto", md: "auto" },
          maxHeight: { xs: "none", md: "none" },
          overflowY: expanded ? "auto" : "hidden",
          overflowX: "hidden",
          ...(expanded ? scrollbarHiddenSx : {}),
        }}
      >
        <Typography
          ref={measureRef}
          variant="body1"
          sx={{
            color: "text.secondary",
            lineHeight: 1.65,
            textAlign: "left",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: { xs: "0.8125rem", sm: "0.875rem", md: "1rem" },
            ...(!expanded
              ? {
                  display: "-webkit-box",
                  WebkitLineClamp: { xs: lineClamp.xs, sm: lineClamp.sm, md: lineClamp.md },
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }
              : {}),
          }}
        >
          {text}
        </Typography>
      </Box>
      {(showToggle || expanded) && (
        <Button
          size="small"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          sx={{
            alignSelf: "flex-start",
            mt: 0.75,
            p: 0,
            minWidth: 0,
            textTransform: "none",
            fontSize: { xs: "0.6875rem", sm: "0.75rem" },
            flexShrink: 0,
            ...toggleSx,
          }}
        >
          {expanded ? seeLessLabel : seeMoreLabel}
        </Button>
      )}
    </Box>
  );
};
