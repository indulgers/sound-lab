/**
 * 首页（/en、/zh）：只有旅程（SceneExperience）。
 *
 * 旧版页内锚点兼容：有人带着 #recipes / #plus / #mine / #sources
 * 打开首页（旧书签、旧外链），直接跳到对应的新页面（replace，
 * 不留一跳历史）。#mixer 是旧版调音台锚点，已下线，routeForAnchor 返回 null，不跳。
 */
import { useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import SceneExperience from './scenes/SceneExperience.jsx';
import { routeForAnchor } from './redirects.mjs';
import { localizePath, useLocale } from './locale.mjs';

export default function HomePage() {
  const navigate = useNavigate();
  const [locale] = useLocale();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seg = routeForAnchor(window.location.hash);
    if (seg) void navigate({ to: localizePath(seg, locale), replace: true });
  }, []);
  const zh = locale === 'zh';
  const destinations = [
    { path: '/rain', en: 'Rain Sounds for Meditation', zh: '雨声与冥想', enSub: 'Listen to rain and stream sounds, then change the balance.', zhSub: '听雨声与流水，自由调整声音比例。' },
    { path: '/focus', en: 'Focus Sounds for Deep Work', zh: '深度专注背景音', enSub: 'A calmer sound mix for reading, coding and writing.', zhSub: '为阅读、编程和写作调配安静的声音。' },
    { path: '/cafe', en: 'Coffee Shop Ambience', zh: '咖啡馆氛围音', enSub: 'Make a quieter café mix with optional conversation.', zhSub: '用轻柔环境声和可选人声创造咖啡馆氛围。' },
    { path: '/sleep', en: 'Rain & Night Sounds for Sleep', zh: '助眠雨声与夜晚环境音', enSub: 'Build an even, low-volume background soundscape.', zhSub: '用稳定、柔和的声音营造安静的夜晚。' },
    { path: '/relax', en: 'Relaxing Ambient Soundscapes', zh: '放松与环境声景', enSub: 'A gentle sound space to unwind without distraction.', zhSub: '用轻柔的声音和空间感慢慢放松。' },
    { path: '/recipes', en: 'Explore Sound Recipes', zh: '探索声音配方', enSub: 'Try existing mixes and make your own with real controls.', zhSub: '试听现有配方，再用真实的音量控制做出自己的版本。' },
  ];

  return (
    <>
      <SceneExperience />
      <section className="sc-seo-discover" aria-labelledby="sc-seo-discover-heading">
        <div className="sc-seo-discover-intro">
          <p className="sc-seo-eyebrow">{zh ? '声音空间 · SOUND COCKTAIL' : 'SOUND COCKTAIL / EXPLORE'}</p>
          <h2 id="sc-seo-discover-heading">{zh ? '为此刻选择一种声音。' : 'A sound for wherever you are.'}</h2>
          <p>{zh
            ? '听雨、让注意力回来，或在安静的咖啡馆里写作。选择场景后可以播放、调整声音，找到适合自己的配比。'
            : 'Rain, quiet cafés, focus and sleep. Each listening room has playable sounds you can tune for your own moment.'}</p>
        </div>
        <nav className="sc-seo-grid" aria-label={zh ? '探索声音与场景' : 'Explore sounds and listening rooms'}>
          {destinations.map(item => (
            <Link key={item.path} className="sc-seo-link" to={localizePath(item.path, locale)}>
              <span className="sc-seo-arrow" aria-hidden="true">↗</span>
              <h3>{zh ? item.zh : item.en}</h3>
              <p>{zh ? item.zhSub : item.enSub}</p>
            </Link>
          ))}
        </nav>
      </section>
    </>
  );
}
