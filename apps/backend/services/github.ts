import axios from "axios";

export function getGithubUsername(github: string): string | null {
  let normalized = github.trim().replace(/\/$/, "");

  if (!normalized) return null;

  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    if (normalized.includes("github.com/")) {
      normalized = "https://" + normalized;
    } else {
      return normalized.includes("/") ? null : normalized;
    }
  }

  try {
    const url = new URL(normalized);
    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
      return null;
    }
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  } catch {
    return null;
  }
}

export interface GithubRepo {
  description: string | null;
  name: string;
  fullName: string;
  starCount: number;
}

export async function fetchGithubRepos(username: string): Promise<GithubRepo[]> {
  const headers: Record<string, string> = {};
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const { data } = await axios.get(
    `https://api.github.com/users/${username}/repos`,
    { headers }
  );

  return data.map((x: any) => ({
    description: x.description,
    name: x.name,
    fullName: x.full_name,
    starCount: x.stargazers_count,
  }));
}
