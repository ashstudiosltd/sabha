import "server-only";
/** Messages and log fields are authored here; upstream bodies and credentials never escape. */
export class GitHubError extends Error {
  constructor(public readonly code: string, message: string, public readonly stage: string, public readonly status?: number) { super(message); this.name = "GitHubError"; }
}
export function reportGitHubError(cause: unknown, fallbackStage: string) {
 const error = cause instanceof GitHubError ? cause : new GitHubError("unexpected", "GitHub couldn’t be reached. Try again shortly.", fallbackStage);
 console.error("[project-github]", { code: error.code, stage: error.stage, status: error.status ?? null });
 return error;
}
export function githubFailure(status: number, stage: string): GitHubError {
 const message = status === 401
  ? "GitHub rejected the App authentication. Check that the App ID and private key in Vercel belong to the same GitHub App, then redeploy."
  : status === 403 ? "GitHub denied access. Check the App’s Contents read-only permission and installation approval. GitHub may also be limiting requests."
  : status === 404 ? "GitHub couldn’t access this repository or installation. Check that the App is installed on the selected repository."
  : status === 422 && stage === "installation-token" ? "GitHub couldn’t grant repository access. Check that this installation includes the repository and has approved Contents read-only permission."
  : status === 409 && stage === "commits" ? "This repository has no commits available on its default branch yet."
  : status === 429 ? "GitHub is limiting requests. Please try again later."
  : "GitHub couldn’t complete this request. Try again shortly.";
 return new GitHubError(`github-${status}`, message, stage, status);
}
