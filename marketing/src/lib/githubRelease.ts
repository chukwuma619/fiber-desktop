import { FIBER_DESKTOP_REPO_URL } from "../constants/marketing";

export type GithubRepoSlug = { owner: string; repo: string };

export function parseGithubRepo(repoUrl: string): GithubRepoSlug | null {
  try {
    const u = new URL(repoUrl);
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") {
      return null;
    }
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;
    return { owner: segments[0]!, repo: segments[1]! };
  } catch {
    return null;
  }
}

export type GithubReleaseAsset = {
  name: string;
  browser_download_url: string;
  size: number;
};

export type GithubLatestRelease = {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  assets: GithubReleaseAsset[];
};

export function latestReleaseApiUrl(slug: GithubRepoSlug): string {
  return `https://api.github.com/repos/${slug.owner}/${slug.repo}/releases/latest`;
}

export async function fetchLatestGithubRelease(
  slug: GithubRepoSlug,
): Promise<GithubLatestRelease> {
  const res = await fetch(latestReleaseApiUrl(slug), {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `GitHub API ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }
  return res.json() as Promise<GithubLatestRelease>;
}

export function defaultFiberDesktopRepoSlug(): GithubRepoSlug | null {
  return parseGithubRepo(FIBER_DESKTOP_REPO_URL);
}
