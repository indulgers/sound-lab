/**
 * 配方页（/en/recipes、/zh/recipes）：配方卡片列表。
 *
 * 选场景 / 看进阶直接走引擎控制器（外壳常驻，音频不重启）；
 * 进阶配方按已解锁通道判定能不能直接听。
 */
import { useLab } from './lab-context.jsx';
import { recipeDisplay } from './catalog.mjs';
import { isFreeSound } from './listening-session.mjs';
import { isMixUnlocked, soundsForPacks } from './packs.mjs';
import { t, useLocale } from './locale.mjs';

function RecipeMix({ mix, soundsById, locale }) {
  const ingredients = Object.entries(mix).flatMap(([id, level]) => {
    const sound = soundsById.get(id);
    return sound ? [{ sound, level }] : [];
  });
  const total = ingredients.reduce((sum, { level }) => sum + level, 0);
  return (
    <>
      <div className="mixbar" aria-hidden="true">
        {ingredients.map(({ sound, level }) => (
          <i key={sound.id} style={{ background: sound.color, width: total > 0 ? `${(level / total) * 100}%` : '0%' }} />
        ))}
      </div>
      <div className="mix-legend">
        {ingredients.map(({ sound, level }) => (
          <span key={sound.id}><i style={{ background: sound.color }} />{locale === 'en' ? (sound.en || sound.name) : sound.name} {Math.round(level * 100)}</span>
        ))}
      </div>
    </>
  );
}

export default function RecipesPage() {
  const { recipes, sounds, chooseScene, showPremium, ownedPacks } = useLab();
  const [locale] = useLocale();
  const soundsById = new Map(sounds.map((sound) => [sound.id, sound]));
  // 能用的通道 = 免费通道 + 已拥有包的通道；进阶配方按这个集合判定是否可听。
  const unlockedSounds = new Set(sounds.filter((sound) => isFreeSound(sound.id)).map((sound) => sound.id));
  soundsForPacks(ownedPacks).forEach((id) => unlockedSounds.add(id));
  return (
    <section className="blk" id="recipes">
      <div className="sec-head"><h2>{t(locale, 'recipes.title')}</h2>{locale === 'en' ? <span className="en">{t(locale, 'recipes.en')}</span> : null}</div>
      <p className="sec-sub">{t(locale, 'recipes.sub')}</p>
      <div className="cards" id="recipeCards">
        {recipes.map((recipe) => {
          // 进阶配方：用到每个进阶通道都已解锁时才能直接听，否则还是进介绍页。
          const unlocked = !recipe.premium || isMixUnlocked(recipe.mix, unlockedSounds);
          const display = recipeDisplay(recipe, locale);
          return (
            <div className="card recipe-card" key={recipe.name}>
              <h3>{display.name}<span className={recipe.premium ? 'tag premium' : 'tag'}>{recipe.premium ? t(locale, 'recipes.premiumTag') : ''}{display.tag}</span></h3>
              <p>{display.desc}</p>
              <RecipeMix mix={recipe.mix} soundsById={soundsById} locale={locale} />
              <div className="row">
                <button
                  type="button"
                  className={unlocked ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                  onClick={() => (unlocked ? chooseScene(recipe) : showPremium(recipe.name))}
                >
                  {unlocked ? t(locale, 'recipes.enter') : t(locale, 'recipes.learnMore')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
