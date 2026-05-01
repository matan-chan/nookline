import { getStoredToken } from "../auth/authStorage";
import { useEffect, useState } from "react";

export const useAvatarObjectUrl = (hasAvatar: boolean | undefined) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAvatar) {
      setUrl(null);
      return;
    }
    const t = getStoredToken();
    if (!t) {
      setUrl(null);
      return;
    }
    let blobUrl: string | null = null;
    let cancelled = false;
    void fetch("/api/files/avatar/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (cancelled || b == null) return;
        blobUrl = URL.createObjectURL(b);
        setUrl(blobUrl);
      });
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [hasAvatar]);

  return url;
};
