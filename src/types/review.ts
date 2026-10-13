export type FileStatus = "added" | "modified" | "removed" | "renamed";

export interface User {
  login: string;
  name: string;
  color: string;
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  createdAt: string;
}

export interface PullRequest {
  number: number;
  title: string;
  body: string;
  author: string;
  baseRef: string;
  headRef: string;
  /** SHA of the latest commit on the branch. */
  headSha: string;
  commits: Commit[];
  state: "open" | "merged" | "closed";
}

export interface ChangedFile {
  /** Stable across commits, including renames. */
  fileId: string;
  path: string;
  previousPath: string | null;
  status: FileStatus;
  baseContent: string;
  headContent: string;
  /** Changes whenever this file's head content changes. */
  contentRevision: string;
}

export interface ReviewComment {
  id: string;
  fileId: string;
  path: string;
  /** Line in the head version (side "new") or base version (side "old"). */
  line: number;
  side: "new" | "old";
  body: string;
  author: string;
  /** Commit the comment was written against. */
  commitSha: string;
  createdAt: string;
  /** Present when the line no longer exists in the latest commit. */
  outdated: boolean;
  /** A proposed replacement for head lines [startLine, endLine] (inclusive, 1-based). */
  suggestion: Suggestion | null;
}

export interface Suggestion {
  startLine: number;
  endLine: number;
  /** Lines that should replace the range (may be empty to delete). */
  replacement: string[];
  /** The range's text when the suggestion was written; used to detect staleness. */
  originalLines: string[];
}

export interface FileChange {
  fileId: string;
  /** Full new content of the file. */
  content: string;
}

export type ReviewEvent = { type: "push"; headSha: string } | { type: "comment"; commentId: string };
