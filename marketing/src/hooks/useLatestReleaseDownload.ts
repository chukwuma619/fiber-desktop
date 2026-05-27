import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ClientOs } from "../lib/clientOs";
import { detectClientOs } from "../lib/clientOs";
import {
  defaultFiberDesktopRepoSlug,
  fetchLatestGithubRelease,
  type GithubLatestRelease,
} from "../lib/githubRelease";
import {
  installersFromRelease,
  pickRecommendedInstaller,
  type InstallerRow,
} from "../lib/releaseInstallers";

function noopSubscribe(): () => void {
  return () => {};
}

function getServerOs(): ClientOs {
  return "unknown";
}

export type LatestReleaseDownloadState =
  | { status: "idle" | "loading" }
  | {
      status: "ok";
      release: GithubLatestRelease;
      rows: InstallerRow[];
    }
  | { status: "error"; message: string };

export function useLatestReleaseDownload() {
  const slug = useMemo(() => defaultFiberDesktopRepoSlug(), []);
  const clientOs = useSyncExternalStore(noopSubscribe, detectClientOs, getServerOs);
  const [state, setState] = useState<LatestReleaseDownloadState>({ status: "idle" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (!slug) {
        setState({
          status: "error",
          message:
            "Release source is not a github.com URL. Open the releases page manually.",
        });
        return;
      }
      setState({ status: "loading" });
      try {
        const release = await fetchLatestGithubRelease(slug);
        if (cancelled) return;
        const rows = installersFromRelease(release);
        setState({ status: "ok", release, rows });
      } catch (e) {
        if (cancelled) return;
        const message =
          e instanceof Error ? e.message : "Could not load the latest release.";
        setState({ status: "error", message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, retryKey]);

  const recommended = useMemo(() => {
    if (state.status !== "ok") return undefined;
    return pickRecommendedInstaller(clientOs, state.rows);
  }, [state, clientOs]);

  const retry = () => setRetryKey((k) => k + 1);

  return {
    clientOs,
    state,
    recommended,
    retry,
  };
}
