import { Link } from '@tanstack/react-router';
import { useLocale } from '../locale.mjs';
import { sceneById, sceneText } from './catalog.mjs';
import { FEATURED_SCENE_PAGES, scenePagePath } from './scene-pages.mjs';
import { isFreeScene } from '../subscription.mjs';

/**
 * Searchable scene discovery shelf. The three cards point to real, distinct
 * SSR scene pages rather than silently changing a global single-page player.
 */
export default function DiscoverGallery({ locale: explicitLocale, exclude = null }) {
  const [uiLocale] = useLocale();
  const locale = explicitLocale || uiLocale;
  const zh = locale === 'zh';
  const pages = FEATURED_SCENE_PAGES.filter(page => page.slug !== exclude);

  return (
    <section className="sc-discover-gallery" aria-labelledby="sc-discover-title">
      <div className="sc-discover-heading">
        <div>
          <p className="sc-section-kicker">01 / DISCOVER BY PLACE</p>
          <h2 id="sc-discover-title">{zh ? '找一处，愿意停留的地方。' : 'Find somewhere to stay awhile.'}</h2>
        </div>
        <p>{zh ? '每一段声景都有自己的实景画面、声音层和调配空间。先听，再决定要不要动手。' : 'Every scene has its own credited film, musical layers and room to make it yours. Listen first. Create when you feel like it.'}</p>
      </div>
      <div className="sc-discover-grid">
        {pages.map((page, index) => {
          const scene = sceneById(page.sceneId);
          return (
            <Link key={page.slug} to={scenePagePath(page, locale)} className="sc-discover-card" aria-label={sceneText(page.title, locale)}>
              <div className="sc-discover-image">
                <img loading="lazy" decoding="async" src={scene.poster} alt={sceneText(scene.filmPlace, locale)}/>
                <div className="sc-discover-card-top"><span>{String(index + 1).padStart(2, '0')}</span><span>{isFreeScene(page.sceneId) ? (zh ? '免费体验' : 'OPEN LISTENING') : 'PLUS'}</span></div>
                <div className="sc-discover-card-foot"><span>{sceneText(page.eyebrow, locale)}</span><span aria-hidden="true">↗</span></div>
              </div>
              <div className="sc-discover-card-text">
                <h3>{sceneText(page.title, locale)}</h3>
                <p>{sceneText(page.summary, locale)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
