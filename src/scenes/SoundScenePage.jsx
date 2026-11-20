import { Link } from '@tanstack/react-router';
import SceneExperience from './SceneExperience.jsx';
import DiscoverGallery from './DiscoverGallery.jsx';
import { sceneById, sceneText } from './catalog.mjs';
import { getFeaturedScenePage } from './scene-pages.mjs';
import { localizePath } from '../locale.mjs';
import { isFreeScene } from '../subscription.mjs';

export default function SoundScenePage({ slug, locale = 'en' }) {
  const page = getFeaturedScenePage(slug);
  const zh = locale === 'zh';
  if (!page) {
    return <article className="sc-article"><h1>{zh ? '找不到这个声音场景' : 'Soundscape not found'}</h1><Link to={localizePath('/', locale)}>{zh ? '返回探索' : 'Back to Discover'}</Link></article>;
  }

  const scene = sceneById(page.sceneId);
  const filmLicenseUrl = scene.filmLicenseUrl || (scene.filmLicense === 'CC BY 3.0'
    ? 'https://creativecommons.org/licenses/by/3.0/'
    : 'https://www.pexels.com/license/');

  return (
    <>
      <SceneExperience key={page.journeyId} initialJourneyId={page.journeyId} />
      <article className="sc-article" aria-labelledby="sc-scene-story">
        <div className="sc-article-top">
          <span className="sc-section-kicker">SOUNDSCAPES / {sceneText(page.eyebrow, locale)}</span>
          <Link to={localizePath('/', locale)}>{zh ? '全部场景' : 'All scenes'} <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="sc-article-lead">
          <div>
            <h2 id="sc-scene-story">{sceneText(page.title, locale)}</h2>
            <p>{sceneText(page.summary, locale)}</p>
          </div>
          <div className="sc-article-facts" aria-label={zh ? '作品信息' : 'Work details'}>
            <span>{zh ? '画面' : 'FILM'}<strong>{sceneText(scene.filmPlace, locale)}</strong></span>
            <span>{zh ? '音乐' : 'AUDIO'}<strong>{zh ? '原创独立编排' : 'Original arrangement'}</strong></span>
            <span>{zh ? '时长' : 'PROGRAMME'}<strong>15 MIN / LOOP</strong></span>
            <span>{zh ? '体验' : 'ACCESS'}<strong>{isFreeScene(page.sceneId) ? (zh ? '基础版开放' : 'Free listening') : 'PLUS'}</strong></span>
          </div>
        </div>
        <div className="sc-article-sections">
          {page.sections.map((part, idx) => (
            <section key={idx}>
              <span className="sc-section-kicker">{String(idx + 1).padStart(2, '0')}</span>
              <h3>{sceneText(part.heading, locale)}</h3>
              <p>{sceneText(part.body, locale)}</p>
            </section>
          ))}
        </div>
        <section className="sc-article-layers">
          <div>
            <p className="sc-section-kicker">{zh ? '声音结构' : 'THE SOUND PALETTE'}</p>
            <h3>{zh ? '多一点喜欢的声音，少一点不需要的。' : 'Hear every layer. Adjust what matters.'}</h3>
            <p>{zh ? '这些是本场景正在使用的声音层，均可在 Studio 中独立调节。' : 'These are the layers used by this journey. Each can be tuned independently in Studio.'}</p>
            <button type="button" className="sc-article-cta" onClick={() => window.dispatchEvent(new Event('soundcocktail:open-scene-studio'))}>{zh ? '打开声音 Studio' : 'Open Sound Studio'} <span aria-hidden="true">↗</span></button>
          </div>
          <ul>
            {scene.layers.map((layer, index) => (
              <li key={layer.id}><span>{String(index+1).padStart(2,'0')}</span><strong>{sceneText(layer.label, locale)}</strong><small>{sceneText(layer.detail, locale)}</small></li>
            ))}
          </ul>
        </section>
        <aside className="sc-article-source" aria-label={zh ? '素材与授权' : 'Sources and licences'}>
          <p className="sc-section-kicker">{zh ? '来源与授权 · TRANSPARENCY' : 'SOURCES & LICENSING'}</p>
          <p>{zh ? '地点画面与声音分别制作，不能当成同步现场录音。' : 'The destination film and the soundtrack were produced separately. They are not synchronous field recordings.'}</p>
          <p>{sceneText(scene.filmPlace, locale)} · <a href={scene.filmSourcePage} target="_blank" rel="noopener noreferrer">{scene.filmCreator}</a> · <a href={filmLicenseUrl} target="_blank" rel="noopener noreferrer">{scene.filmLicense}</a></p>
          <Link to={localizePath('/sources', locale)}>{zh ? '浏览全部音源说明' : 'Explore all sound sources'} ↗</Link>
        </aside>
      </article>
      <DiscoverGallery locale={locale} exclude={slug} />
    </>
  );
}
