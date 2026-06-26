import { chromium } from 'playwright';

const url = process.argv[2];
if (!url) {
  console.error(JSON.stringify({ error: 'No URL provided' }));
  process.exit(1);
}

const normalizedUrl = url
  .replace(/^(https?:\/\/)?(www\.)?/, 'https://www.')
  .replace('threads.com/', 'threads.net/');

function getPostText(post) {
  const fragments = post.text_post_app_info?.text_fragments?.fragments;
  if (fragments?.length) return fragments.map((f) => f.plaintext ?? '').join('');
  return post.caption?.text ?? '';
}

function getMedia(post) {
  const mediaType = post.media_type;
  // 1=image, 2=video, 8=carousel, 19=text-only
  if (mediaType === 19) return null;

  if (mediaType === 8 && post.carousel_media?.length) {
    const items = post.carousel_media.map((cm) => {
      const img = cm.image_versions2?.candidates?.[0];
      const vid = cm.video_versions?.[0];
      return {
        type: cm.media_type === 2 ? 'video' : 'image',
        imageUrl: img?.url ?? null,
        videoUrl: vid?.url ?? null,
        width: img?.width ?? cm.original_width ?? 0,
        height: img?.height ?? cm.original_height ?? 0,
      };
    });
    return { type: 'carousel', items };
  }

  const img = post.image_versions2?.candidates?.[0];
  const vid = post.video_versions?.[0];
  if (mediaType === 2 && vid) {
    return {
      type: 'video',
      items: [{
        type: 'video',
        imageUrl: img?.url ?? null,
        videoUrl: vid.url,
        width: vid.width ?? post.original_width ?? 0,
        height: vid.height ?? post.original_height ?? 0,
      }],
    };
  }

  if (img?.url) {
    return {
      type: 'image',
      items: [{
        type: 'image',
        imageUrl: img.url,
        videoUrl: null,
        width: img.width ?? post.original_width ?? 0,
        height: img.height ?? post.original_height ?? 0,
      }],
    };
  }

  return null;
}

function mapPost(post) {
  return {
    username: post.user.username,
    fullName: post.user.full_name,
    text: getPostText(post),
    likeCount: post.like_count ?? 0,
    replyCount: post.text_post_app_info?.direct_reply_count ?? 0,
    repostCount: post.text_post_app_info?.repost_count ?? 0,
    takenAt: post.taken_at,
    profilePicUrl: post.user.profile_pic_url,
    isVerified: post.user.is_verified,
    code: post.code ?? '',
    media: getMedia(post),
  };
}

function mapReply(post) {
  return {
    username: post.user.username,
    fullName: post.user.full_name,
    text: getPostText(post),
    likeCount: post.like_count ?? 0,
    replyCount: post.text_post_app_info?.direct_reply_count ?? 0,
    takenAt: post.taken_at,
    profilePicUrl: post.user.profile_pic_url,
    isVerified: post.user.is_verified,
    media: getMedia(post),
  };
}

try {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    });
    try {
      const page = await context.newPage();
      await page.goto(normalizedUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await page.waitForTimeout(4000);

      const relayData = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        for (const s of scripts) {
          const t = s.textContent ?? '';
          if (!t.includes('BarcelonaPostPageDirect') || !t.includes('thread_items')) continue;
          const marker = '"result":{"data":{"data":';
          const idx = t.indexOf(marker, t.indexOf('BarcelonaPostPageDirect'));
          if (idx === -1) continue;
          const dataStart = idx + '"result":{"data":'.length;
          let depth = 0, end = dataStart;
          for (let i = dataStart; i < t.length; i++) {
            if (t[i] === '{') depth++;
            else if (t[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
          }
          try { return JSON.parse(t.substring(dataStart, end)); } catch { /* skip */ }
        }
        return null;
      });

      if (!relayData?.data?.edges?.length) {
        throw new Error('Could not extract post data. The post may be private or unavailable.');
      }

      const edges = relayData.data.edges;
      const mainPost = edges[0].node.thread_items[0]?.post;
      if (!mainPost) throw new Error('Main post not found.');

      const replies = edges.slice(1)
        .map((e) => e.node?.thread_items?.[0]?.post)
        .filter((p) => p && getPostText(p))
        .map(mapReply);

      console.log(JSON.stringify({ post: mapPost(mainPost), replies }));
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
} catch (err) {
  console.error(JSON.stringify({ error: err.message ?? 'Scrape failed' }));
  process.exit(1);
}
