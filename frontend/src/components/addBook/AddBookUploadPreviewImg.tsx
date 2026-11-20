import { defaultCoverImgSrc } from "../../utils/cover/cover";
import { CoverShimmerSkeleton } from "../cover/CoverShimmerSkeleton";
import { Box } from "@mui/material";
import { useState } from "react";

type Props = {
  src: string;
  onFailed: () => void;
};

export const AddBookUploadPreviewImg = ({ src, onFailed }: Props) => {
  const [ready, setReady] = useState(false);

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%", bgcolor: "background.paper" }}>
      {!ready ? (
        <Box sx={{ position: "absolute", inset: 0 }}>
          <CoverShimmerSkeleton />
        </Box>
      ) : null}
      <Box
        component="img"
        src={defaultCoverImgSrc(src)}
        alt=""
        loading="eager"
        decoding="async"
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth < 8 || img.naturalHeight < 8) {
            onFailed();
            return;
          }
          setReady(true);
        }}
        onError={onFailed}
        sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </Box>
  );
};