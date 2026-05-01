import { ttsReaderPanelCompactMainPaperSx, ttsReaderPanelCompactRowSx, ttsReaderPanelExpandedPaperSx } from "./ttsReaderPanelStyles";
import { useTtsParagraphPlayback } from "../../hooks/useTtsParagraphPlayback";
import { DEFAULT_TTS_VOICE_ID } from "../../hooks/tts/ttsPlaybackConstants";
import { TtsReaderPanelCompactClose } from "./TtsReaderPanelCompactClose";
import { TtsReaderPanelErrorMessage } from "./TtsReaderPanelErrorMessage";
import { TtsReaderPanelTransportRow } from "./TtsReaderPanelTransportRow";
import { TTS_READER_PANEL_MOTION_MS } from "./ttsReaderPanelConstants";
import { TtsReaderPanelVoiceSpeed } from "./TtsReaderPanelVoiceSpeed";
import { TtsReaderPanelHeader } from "./TtsReaderPanelHeader";
import { Box, Collapse, Paper } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

export type TtsPlayback = ReturnType<typeof useTtsParagraphPlayback>;

export const TtsReaderPanel = ({
  open,
  onClose,
  playback,
  ttsData,
  voice,
  setVoice,
  commitPlayback,
  speed,
  setSpeed,
  voiceOptions,
  bookTitle,
  readerFormat,
  pdfPage,
  pdfNumPages,
  onScrollToReading,
  scrollToReadingEnabled,
}: {
  open: boolean;
  onClose: () => void;
  playback: TtsPlayback;
  ttsData:
    | {
        ttsSettings: {
          mode: string;
          voice: string;
          model: string;
          readerShowPage?: boolean;
          readerShowTitle?: boolean;
        };
      }
    | undefined;
  voice: string;
  setVoice: (v: string) => void;
  commitPlayback: (p: { voice?: string; speed?: number }) => void;
  speed: number;
  setSpeed: (n: number) => void;
  voiceOptions: string[];
  bookTitle: string | null;
  readerFormat: "pdf" | "epub";
  pdfPage: number;
  pdfNumPages: number;
  onScrollToReading: () => void;
  scrollToReadingEnabled: boolean;
}) => {
  const { t } = useTranslation("reader");
  const { t: tc } = useTranslation("common");
  const tts = ttsData?.ttsSettings;
  const showPage = tts?.readerShowPage !== false;
  const showTitle = tts?.readerShowTitle !== false;

  const engineLabel = tts?.mode === "custom" ? t("engineCustom") : t("engineKokoro");
  const isKokoroEngine = tts?.mode !== "custom";

  const mergedVoices = useMemo(() => {
    if (!voiceOptions.length) return [DEFAULT_TTS_VOICE_ID];
    const base = voiceOptions.includes(DEFAULT_TTS_VOICE_ID) ? [...voiceOptions] : [DEFAULT_TTS_VOICE_ID, ...voiceOptions];
    if (voice && !base.includes(voice)) return [voice, ...base];
    return base;
  }, [voice, voiceOptions]);

  const selectVoiceValue = useMemo(() => {
    if (mergedVoices.includes(voice)) return voice;
    if (mergedVoices.includes(DEFAULT_TTS_VOICE_ID)) return DEFAULT_TTS_VOICE_ID;
    return mergedVoices[0] ?? DEFAULT_TTS_VOICE_ID;
  }, [mergedVoices, voice]);

  if (!open) return null;

  const { playing, busy, err, paraIndex, totalParas, togglePlay, goParagraph } = playback;
  const compactPlaybackBar = playing;

  const chunkPart = totalParas > 0 ? t("chunkProgress", { current: paraIndex + 1, total: totalParas }) : t("chunkNone");

  const pagePart = showPage && readerFormat === "pdf" && pdfPage >= 1 ? (pdfNumPages >= 1 ? t("metaPdfPageOf", { page: pdfPage, total: pdfNumPages }) : t("metaPdfPageOnly", { page: pdfPage })) : "";
  const metaLineText = pagePart
    ? `${t("metaLine", { engine: engineLabel, model: tts?.model ?? t("modelFallback"), chunk: chunkPart })} · ${pagePart}`
    : t("metaLine", { engine: engineLabel, model: tts?.model ?? t("modelFallback"), chunk: chunkPart });

  const errorFooter = isKokoroEngine ? t("ttsErrorFooterKokoro") : t("ttsErrorFooterCustom");

  const panelBody = (
    <>
      <TtsReaderPanelHeader hidden={compactPlaybackBar} playing={playing} onClose={onClose} showTitle={showTitle} bookTitle={bookTitle} metaLineText={metaLineText} panelTitle={t("aiReaderPanelTitle")} closeLabel={tc("close")} />
      {err ? <TtsReaderPanelErrorMessage message={err} footer={errorFooter} /> : null}
      <TtsReaderPanelTransportRow
        compact={compactPlaybackBar}
        playing={playing}
        busy={busy}
        totalParas={totalParas}
        paraIndex={paraIndex}
        prevLabel={t("prevChunk")}
        nextLabel={t("nextChunk")}
        playLabel={t("playTts")}
        pauseLabel={t("pauseTts")}
        loadingLabel={tc("loadingEllipsis")}
        scrollToReadingLabel={t("scrollToReading")}
        onPrev={() => goParagraph(-1)}
        onNext={() => goParagraph(1)}
        onTogglePlay={() => togglePlay()}
        onScrollToReading={onScrollToReading}
        scrollToReadingEnabled={scrollToReadingEnabled}
      />
      <Collapse in={!compactPlaybackBar} timeout={TTS_READER_PANEL_MOTION_MS} collapsedSize={0} easing={{ exit: "easeInOut" as const, enter: "easeInOut" as const }}>
        <TtsReaderPanelVoiceSpeed t={t} mergedVoices={mergedVoices} selectVoiceValue={selectVoiceValue} voice={voice} setVoice={setVoice} commitPlayback={commitPlayback} isKokoroEngine={isKokoroEngine} speed={speed} setSpeed={setSpeed} />
      </Collapse>
    </>
  );

  if (compactPlaybackBar) {
    return (
      <Box sx={(th) => ttsReaderPanelCompactRowSx(th)}>
        <Paper elevation={8} sx={(th) => ttsReaderPanelCompactMainPaperSx(th)}>
          {panelBody}
        </Paper>
        <TtsReaderPanelCompactClose onClose={onClose} closeLabel={tc("close")} />
      </Box>
    );
  }

  return (
    <Paper elevation={8} sx={(th) => ttsReaderPanelExpandedPaperSx(th)}>
      {panelBody}
    </Paper>
  );
};
