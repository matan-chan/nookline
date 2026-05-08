import { APP_CUSTOMIZATION } from "../pages/settings/Tts/settingsQueries";
import { useQuery } from "@apollo/client";

export const usePdfToEpubSetting = () => {
  const { data } = useQuery<{ appCustomization: { convertPdfToEpub: boolean } }>(APP_CUSTOMIZATION);
  return data?.appCustomization?.convertPdfToEpub === true;
};

