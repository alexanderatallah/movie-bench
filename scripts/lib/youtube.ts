function parseCount(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

interface YouTubeVideosResponse {
  items?: Array<{
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }>;
}

export async function getYouTubeVideoStats(videoId: string): Promise<{
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
} | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(videoId)}&key=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`YouTube API error: ${resp.status}`);
  }

  const data = (await resp.json()) as YouTubeVideosResponse;
  const stats = data.items?.[0]?.statistics;
  if (!stats) {
    return { view_count: null, like_count: null, comment_count: null };
  }

  return {
    view_count: parseCount(stats.viewCount),
    like_count: parseCount(stats.likeCount),
    comment_count: parseCount(stats.commentCount),
  };
}
