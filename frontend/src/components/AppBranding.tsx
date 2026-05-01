import { APP_CUSTOMIZATION } from "../pages/settings/settingsQueries";
import { useQuery } from "@apollo/client";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

export const DEFAULT_SITE_DISPLAY_NAME = "Nookline";
export const DEFAULT_FAVICON_HREF = "/favicon-96x96.png";

const SiteDisplayNameContext = createContext(DEFAULT_SITE_DISPLAY_NAME);
const FaviconHrefContext = createContext(DEFAULT_FAVICON_HREF);

export const useSiteDisplayName = () => useContext(SiteDisplayNameContext);
export const useAppFaviconHref = () => useContext(FaviconHrefContext);

const applyFaviconLink = (href: string, mime: string) => {
  const link = document.querySelector(
    'link[rel="icon"][data-tab-favicon]',
  ) as HTMLLinkElement | null;
  if (!link) return;
  link.href = href;
  link.type = mime;
};

const mimeFromHref = (href: string) => {
  const base = href.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  if (base === "svg") return "image/svg+xml";
  if (base === "ico") return "image/x-icon";
  if (base === "webp") return "image/webp";
  if (base === "jpg" || base === "jpeg") return "image/jpeg";
  if (base === "png") return "image/png";
  return "image/png";
};

type Props = { children: ReactNode };

const AppBranding = ({ children }: Props) => {
  const { data } = useQuery<{ appCustomization: { siteName: string; faviconUrl: string | null } }>(APP_CUSTOMIZATION);

  const siteDisplayName = useMemo(
    () => (data?.appCustomization?.siteName?.trim() ? data.appCustomization.siteName.trim() : DEFAULT_SITE_DISPLAY_NAME),
    [data?.appCustomization?.siteName],
  );

  const faviconHref = useMemo(() => {
    const u = data?.appCustomization?.faviconUrl?.trim();
    return u && u.length > 0 ? u : DEFAULT_FAVICON_HREF;
  }, [data?.appCustomization?.faviconUrl]);

  useEffect(() => {
    applyFaviconLink(faviconHref, mimeFromHref(faviconHref));
  }, [faviconHref]);

  useEffect(() => {
    document.title = siteDisplayName;
  }, [siteDisplayName]);

  return (
    <SiteDisplayNameContext.Provider value={siteDisplayName}>
      <FaviconHrefContext.Provider value={faviconHref}>{children}</FaviconHrefContext.Provider>
    </SiteDisplayNameContext.Provider>
  );
};

export default AppBranding;
