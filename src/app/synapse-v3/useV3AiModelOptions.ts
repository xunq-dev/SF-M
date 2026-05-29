import { useCallback, useEffect, useRef, useState } from "react";
import type { V3AiProvider } from "./v3AiSettings";
import { writeV3AiSettings } from "./v3AiSettings";
import { fetchAiModels, type AiModelOption } from "./v3AiModelCatalog";

type CacheEntry = {
  options: AiModelOption[];
};

const sessionCache = new Map<string, CacheEntry>();

function cacheKey(provider: V3AiProvider, apiKey: string): string {
  const prefix = apiKey.trim().slice(0, 8);
  return `${provider}:${prefix}:${apiKey.trim().length}`;
}

function syncSelectedModel(
  fetched: AiModelOption[],
  savedModelId: string | undefined,
): void {
  const saved = savedModelId?.trim();
  if (!fetched.length) return;
  if (saved && fetched.some((o) => o.id === saved)) return;
  writeV3AiSettings({ model: fetched[0].id });
}

export function useV3AiModelOptions(
  provider: V3AiProvider,
  apiKey: string | undefined,
  savedModelId: string | undefined,
) {
  const [options, setOptions] = useState<AiModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const debounceRef = useRef<number | null>(null);

  const refresh = useCallback(() => {
    sessionCache.delete(cacheKey(provider, apiKey ?? ""));
    setRefreshToken((t) => t + 1);
  }, [provider, apiKey]);

  useEffect(() => {
    const key = apiKey?.trim() ?? "";
    if (!key) {
      setOptions([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }

    setLoading(true);
    setError(null);

    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      const ck = cacheKey(provider, key);
      const cached = sessionCache.get(ck);
      if (cached) {
        setOptions(cached.options);
        syncSelectedModel(cached.options, savedModelId);
        setLoading(false);
        return;
      }

      void (async () => {
        try {
          const fetched = await fetchAiModels(provider, key);
          sessionCache.set(ck, { options: fetched });
          setOptions(fetched);
          syncSelectedModel(fetched, savedModelId);
          setError(null);
        } catch (err) {
          setOptions([]);
          setError(err instanceof Error ? err.message : "Could not load models.");
        } finally {
          setLoading(false);
        }
      })();
    }, 400);

    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [provider, apiKey, savedModelId, refreshToken]);

  return { options, loading, error, refresh };
}
