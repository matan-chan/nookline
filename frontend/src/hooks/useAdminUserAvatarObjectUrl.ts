import { getStoredToken } from "../auth/authStorage";
import { useEffect, useState } from "react";

export const useAdminUserAvatarObjectUrl = (userId: number | undefined, hasAvatar: boolean) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (userId == null || userId < 1 || !hasAvatar) {
      setUrl(null);
      return;
    }
    const t = getStoredToken();
    if (t == null) {
      setUrl(null);
      return;
    }
    let blobUrl: string | null = null;
    let cancelled = false;
    void fetch(`/api/files/avatar/user/${userId}`, { headers: { Authorization: `Bearer ${t}` } })
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
  }, [userId, hasAvatar]);

  return url;
};
