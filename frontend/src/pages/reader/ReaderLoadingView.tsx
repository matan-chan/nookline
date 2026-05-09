import { ReaderBottomBar } from "../../components/ReaderBottomBar";
import { Box, CircularProgress } from "@mui/material";

type ReaderLoadingViewProps = {
  backHref: string;
  aiOpen: boolean;
  onAiToggle: () => void;
};

export const ReaderLoadingView = ({ backHref, aiOpen, onAiToggle }: ReaderLoadingViewProps) => (
  <>
    <Box sx={{ display: "flex", minHeight: 0, flex: 1, alignItems: "center", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
    <ReaderBottomBar backHref={backHref} aiOpen={aiOpen} onAiToggle={onAiToggle} />
  </>
);
