export interface ThreadsMediaItem {
  type: "image" | "video";
  imageUrl: string | null;
  videoUrl: string | null;
  width: number;
  height: number;
}

export interface ThreadsMedia {
  type: "image" | "video" | "carousel";
  items: ThreadsMediaItem[];
}

export interface ThreadsPost {
  username: string;
  fullName: string;
  text: string;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  takenAt: number;
  profilePicUrl: string;
  isVerified: boolean;
  code: string;
  media: ThreadsMedia | null;
}

export interface ThreadsReply {
  username: string;
  fullName: string;
  text: string;
  likeCount: number;
  replyCount: number;
  takenAt: number;
  profilePicUrl: string;
  isVerified: boolean;
  media: ThreadsMedia | null;
}

export interface PostBlock {
  text: string;
  isMain: boolean;
  author?: string;
  avatarUrl?: string;
  score?: number;
  createdAt?: number;
  media?: ThreadsMedia | null;
}

export interface ScrapeThreadsResponseDto {
  blocks: PostBlock[];
  post: ThreadsPost;
  replyCount: number;
}
