function Background() {
  return (
    <>
      <div className="grain" aria-hidden="true"></div>

      <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }} aria-hidden="true" focusable="false">
        <defs>
          <filter id="lg-refract" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="lgBlur" />
            <feTurbulence type="fractalNoise" baseFrequency="0.011 0.017" numOctaves="2" seed="8" stitchTiles="stitch" result="lgNoise" />
            <feDisplacementMap in="lgBlur" in2="lgNoise" scale="16" xChannelSelector="R" yChannelSelector="G" result="lgDisp" />
            <feColorMatrix in="lgDisp" type="saturate" values="1.45" />
          </filter>
          <filter id="lg-soft" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="lgBlur2" />
            <feTurbulence type="fractalNoise" baseFrequency="0.016 0.024" numOctaves="2" seed="5" stitchTiles="stitch" result="lgNoise2" />
            <feDisplacementMap in="lgBlur2" in2="lgNoise2" scale="7" xChannelSelector="R" yChannelSelector="G" result="lgDisp2" />
            <feColorMatrix in="lgDisp2" type="saturate" values="1.35" />
          </filter>
        </defs>
      </svg>
      <div className="aurora-fallback" aria-hidden="true"></div>
      <canvas id="auroraCanvas" aria-hidden="true"></canvas>
    </>
  )
}

function Navigation() {
  return (
    <nav className="topbar">
      <span className="mark"><span className="dot"></span>声音实验室</span>
      <a href="#mixer">调音台</a>
      <a href="#recipes">配方</a>
      <a href="#plus">进阶</a>
      <a href="#mine">我的配方</a>
      <a href="#sources">音源清单</a>
    </nav>
  )
}

function SoundCup() {
  return (
    <div className="glass-wrap">
      <div className="ck-scene" id="ckScene" aria-hidden="true">
        <div className="ck-glow"></div>
        <div className="cup-stage" id="cupStage">
          <svg id="wcSvg" viewBox="0 0 320 340" role="img" aria-label="随配比变化的手绘涂鸦鸡尾酒杯">
            <defs>
              <radialGradient id="wcHalo">
                <stop stopColor="#FFE9B3" stopOpacity=".72" />
                <stop offset="1" stopColor="#FFE9B3" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="wcShadow">
                <stop stopColor="#A46A36" stopOpacity=".33" />
                <stop offset="1" stopColor="#A46A36" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="wcGlass">
                <stop stopColor="#B6CDD0" stopOpacity=".52" />
                <stop offset=".18" stopColor="#FFFEF4" stopOpacity=".83" />
                <stop offset=".46" stopColor="#FFFEF4" stopOpacity=".17" />
                <stop offset=".74" stopColor="#E2ECE2" stopOpacity=".24" />
                <stop offset="1" stopColor="#91AEAD" stopOpacity=".54" />
              </linearGradient>
              <linearGradient id="wcFoot" x2="0" y2="1">
                <stop stopColor="#FFFDF0" stopOpacity=".9" />
                <stop offset="1" stopColor="#8CA4A5" stopOpacity=".48" />
              </linearGradient>
              <linearGradient id="wcLiquidGradient" x2="0" y2="1">
                <stop id="wcLiquidTop" />
                <stop id="wcLiquidMiddle" offset=".52" />
                <stop id="wcLiquidBottom" offset="1" />
              </linearGradient>
              <linearGradient id="wcLiquidLight">
                <stop stopColor="#FFF9D9" stopOpacity="0" />
                <stop offset=".27" stopColor="#FFF9D9" stopOpacity=".57" />
                <stop offset=".49" stopColor="#FFF9D9" stopOpacity=".08" />
                <stop offset=".75" stopColor="#FFF9D9" stopOpacity=".18" />
                <stop offset="1" stopColor="#FFF9D9" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="wcIce" x2="1" y2="1">
                <stop stopColor="#FFFDF0" stopOpacity=".91" />
                <stop offset=".56" stopColor="#FFFBEC" stopOpacity=".34" />
                <stop offset="1" stopColor="#A9C6C7" stopOpacity=".43" />
              </linearGradient>
              <linearGradient id="wcCitrus" x2=".7" y2="1">
                <stop stopColor="#FFECB7" />
                <stop offset="1" stopColor="#F1AB56" />
              </linearGradient>
              <linearGradient id="wcLeaf" x2=".65" y2="1">
                <stop stopColor="#B2C181" />
                <stop offset="1" stopColor="#628554" />
              </linearGradient>
              <path id="wcBowl" d="M49 78 C53 128 95 201 160 204 C225 201 267 128 271 78 Z" />
              <clipPath id="wcClip"><use href="#wcBowl" /></clipPath>
            </defs>
            <g id="wcBackdrop">
              <ellipse cx="158" cy="164" rx="151" ry="144" fill="url(#wcHalo)" />
              <g fill="none" stroke="#AC8060" strokeWidth="1.15" strokeLinecap="round">
                <path d="M41 122q2 7 8 9-6 2-8 9-2-7-8-9 6-2 8-9Z" opacity=".62" />
                <path d="M277 173q2 5 6 6-4 1-6 6-1-5-5-6 4-1 5-6Z" opacity=".54" />
                <path d="M48 225q9-3 14 1m195 18q8 2 16-3" opacity=".24" />
              </g>
              <circle cx="53" cy="182" r="1.5" fill="#BB9271" opacity=".43" />
              <circle cx="269" cy="144" r="1.8" fill="#BB9271" opacity=".43" />
            </g>
            <ellipse cx="160" cy="319" rx="102" ry="16" fill="url(#wcShadow)" />
            <g id="wcSway" strokeLinecap="round" strokeLinejoin="round">

              <path d="M151 199 Q161 202 169 199 C165 222 164 257 166 281
                       C167 291 186 294 210 299 Q230 303 230 308
                       Q229 318 159 319 Q90 318 90 310 Q88 304 109 300
                       C132 295 152 292 153 281 C156 256 154 225 151 199Z"
                    fill="url(#wcGlass)" stroke="#6E8E91" strokeWidth="1.75" />
              <path d="M155 211 Q161 249 156 283 Q154 297 130 300 M164 243q-1 37 4 45"
                    fill="none" stroke="#FFFBEE" strokeWidth="2.6" opacity=".84" />
              <path d="M91 309 Q150 320 229 307 Q225 317 160 319 Q103 319 91 309Z"
                    fill="url(#wcFoot)" stroke="#7C9897" strokeWidth="1.2" />
              <path d="M102 307q31-9 52-5m24 0q21-2 42 2" fill="none" stroke="#FFFEF3" strokeWidth="2.1" opacity=".75" />

              <use href="#wcBowl" fill="url(#wcGlass)" />
              <ellipse cx="160" cy="78" rx="111" ry="18" fill="#FFFDF2" fillOpacity=".29" stroke="#7F9A9B" strokeWidth="1.75" />
              <path d="M52 75 C79 61 222 56 265 74" fill="none" stroke="#FFFDF2" strokeWidth="2.9" opacity=".85" />

              <g id="wcPour" clipPath="url(#wcClip)" visibility="hidden">
                <path id="wcLiquid" fill="url(#wcLiquidGradient)" opacity=".88" />
                <path id="wcLiquidWash" fill="url(#wcLiquidLight)" />
                <path id="wcSurface" fillOpacity=".67" />
                <g id="wcIceG" fill="url(#wcIce)" stroke="#FFFBE8" strokeWidth="1" opacity="0">
                  <g>
                    <path d="M-14-5-9-13 7-15 15-6 12 7 4 11-11 8Z" />
                    <path d="M-14-5 4-3 15-6M4-3 4 11M-10-5-7-10 5-12" fill="none" opacity=".7" />
                  </g>
                  <g>
                    <path d="M-12-5-7-11 7-11 13-3 10 8-5 9-12 4Z" />
                    <path d="M-12-5 3-3 13-3M3-3-1 9M-6-8 5-9" fill="none" opacity=".7" />
                  </g>
                </g>
                <g id="wcBubbleG" fill="#FFFDF2" fillOpacity=".35" stroke="#FFFDF2" strokeWidth=".8">
                  <circle r="1.1" /><circle r="1.5" /><circle r="1" /><circle r="1.25" /><circle r="1.35" />
                </g>
                <path id="wcSurfaceEdge" fill="none" stroke="#FFFADE" strokeWidth="1.1" opacity=".83" />
              </g>

              <path d="M49 78 C53 128 95 201 160 204 C225 201 267 128 271 78"
                    fill="none" stroke="#66878B" strokeWidth="2.05" />
              <path d="M51 80 C80 100 228 103 269 81 M55 84 C87 101 230 104 265 87"
                    fill="none" stroke="#6F9295" strokeWidth="1.4" opacity=".8" />
              <path d="M56 86 C61 124 88 169 118 185 M126 190l11 5 M260 105 C251 143 230 171 209 187"
                    fill="none" stroke="#FFFEF1" strokeWidth="3.3" opacity=".86" />
              <g fill="none" stroke="#4e6e6e" strokeWidth=".85" opacity=".48">
                <path d="M48 91q8 30 23 53m-4-2q8 19 23 32m91 24q22-6 39-20m17-27q14-22 20-44" />
                <path d="M70 138l8-5m-6 11 9-5m-5 11 9-5m-5 11 8-4m121 20 5 5m2-11 5 5m1-13 4 5" />
                <path d="M98 312q19 7 44 8m37-1q19-2 32-4m-47-29q5 6 12 8" />
              </g>
              <path d="M60 113q15 47 48 68m136-48q-13 27-33 42" fill="none" stroke="#799897" strokeWidth=".88" opacity=".46" />
              <g id="wcCondG" fill="#FDFDF0" stroke="#A0BABA" strokeWidth=".75" opacity="0">
                <path d="M72 122q-3 5 .7 6 3.8-.9-.7-6ZM237 137q-2.8 4.7.5 5.7 3.7-.8-.5-5.7Z" />
                <circle cx="82" cy="136" r="1.7" /><circle cx="228" cy="149" r="1.25" />
              </g>

              <g id="wcGarLemon" transform="translate(256 74) rotate(-26)" opacity="0">
                <path d="M-23 0A23 23 0 0 1 23 0L21 3-22 3Z" fill="url(#wcCitrus)" stroke="#BA7844" strokeWidth="1.35" />
                <path d="M-19 0a19 19 0 0 1 38 0M0 0-13-13M0 0-6-18M0 0 3-18M0 0 12-14M0 0 17-8"
                      fill="none" stroke="#FFF4D4" strokeWidth="1.4" />
                <path d="M-17 2q19-1 34 0" fill="none" stroke="#E2934E" strokeWidth=".8" />
              </g>
              <g id="wcGarMint" transform="translate(254 79) rotate(-9)" opacity="0">
                <path d="M-1 2Q6-13 22-27" fill="none" stroke="#57774C" strokeWidth="1.5" />
                <path d="M7-9C-4-11-11-22-8-32 3-29 10-21 7-9Z M13-14C13-25 22-31 30-29 26-19 22-15 13-14Z M6-6C14-11 25-10 30-4 23 3 12 1 6-6Z"
                      fill="url(#wcLeaf)" stroke="#5F7955" strokeWidth="1.05" />
                <path d="M-5-26 6-11m10-6 10-8M9-6l15 1" fill="none" stroke="#DDE2A7" strokeWidth=".9" opacity=".76" />
              </g>
              <g id="wcGarCherry" transform="translate(254 76)" opacity="0">
                <path d="M-2-3Q1-22 17-29" fill="none" stroke="#728250" strokeWidth="1.55" />
                <path d="M8-23q9-13 20-8-4 11-20 8Z" fill="url(#wcLeaf)" stroke="#6A8153" strokeWidth=".85" />
                <path d="M-2-4C-18-9-18 13-6 16 8 21 15 2 4-4Q1-5-2-4Z" fill="#CB777E" stroke="#9E5D69" strokeWidth="1.25" />
                <path d="M-10 2q2-4 7-3" fill="none" stroke="#FFE5CC" strokeWidth="1.7" opacity=".85" />
              </g>
            </g>
          </svg>
        </div>
        <div className="ck-empty" id="glassEmpty" hidden>拉一格推子，开始调配</div>
        <p className="cup-hint">轻拖杯子，晃一晃</p>
      </div>
      <div className="glass-cap" id="glassCap">这杯还空着</div>
    </div>
  )
}

function Hero({ recipes, onChooseScene }) {
  return (
    <div className="hero">
      <div>
        <span className="kicker">SOUND LAB</span>
        <h1 id="heroTitle">调一杯声音</h1>
        <p className="lead">选个场景，留十分钟给手上的事。隔壁桌低声聊天，雨落在窗上，想听哪种声音多一点，随时回来调。</p>
        <div className="featured-scenes" id="featuredScenes" role="group" aria-label="选择一个免费场景">
          {recipes.filter(recipe => recipe.featured).map(recipe => (
            <button className="scene-option" type="button" key={recipe.name} onClick={() => onChooseScene(recipe)}>
              <span className="scene-intent">{recipe.intent}</span>
              <span className="scene-name">{recipe.name}</span>
            </button>
          ))}
        </div>
        <p className="hint scene-limit">免费场景 · 每次最多 10 分钟</p>
        <div className="cta-row">
          <button className="btn btn-primary" id="ctaPlay">▶ 自己调一杯</button>
          <button className="btn btn-ember" id="ctaImmersive">沉浸模式</button>
          <a href="#recipes" className="btn btn-ghost" style={{ textDecoration: 'none' }}>查看全部配方</a>
        </div>
      </div>
      <SoundCup />
    </div>
  )
}

function Mixer() {
  return (
    <section className="blk" id="mixer">
      <div className="sec-head"><h2>调音台</h2><span className="en">the mixing board</span></div>
      <p className="sec-sub">拉动推子叠加声音，打开「调音参数」调亮度、距离和节奏。乐器采样还能调音符的疏密与随机度。</p>
      <div className="mixer">
        <div className="mixer-bar">
          <button className="play-btn" id="playBtn" aria-label="播放或暂停">
            <svg id="playIcon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
          </button>
          <div className="mb-group">
            <span className="mb-label">总音量 MASTER</span>
            <input type="range" className="master-vol" id="masterVol" min="0" max="85" defaultValue={55} aria-label="总音量（舒适上限 85）" />
          </div>
          <div className="mb-group">
            <span className="mb-label">本次剩余 · 免费体验</span>
            <span className="timer-read" id="focusRead" role="timer">10:00</span>
          </div>
          <div className="spacer"></div>
          <button className="text-btn" id="immersiveBtn">进入沉浸模式</button>
          <button className="text-btn" id="randomBtn">随机一杯</button>
          <button className="text-btn" id="clearBtn">全部归零</button>
        </div>
        <p className="comfort-note" style={{ margin: '0 0 18px' }}>首次播放开始计时。暂停或切换配方后，倒计时继续。</p>
        <div className="mixer-controls">
          <div className="mixer-cup" aria-hidden="true">
            <svg viewBox="42 38 241 286"><use href="#wcSway" /></svg>
            <span id="mixerCupName"></span>
          </div>
          <div className="sound-filters" id="soundFilters" aria-label="筛选音源">
            <button className="chip on" data-filter="all" aria-pressed="true">全部</button>
            <button className="chip" data-filter="active" aria-pressed="false">正在调配</button>
            <button className="chip" data-filter="nature" aria-pressed="false">自然</button>
            <button className="chip" data-filter="city" aria-pressed="false">场所</button>
            <button className="chip" data-filter="inst" aria-pressed="false">乐器</button>
          </div>
        </div>
        <p className="empty-filter" id="emptyFilter" hidden>当前杯子为空。切到「全部」添加声音。</p>
        <div id="faders"></div>
      </div>
    </section>
  )
}

function RecipeMix({ mix, soundsById }) {
  const ingredients = Object.entries(mix).flatMap(([id, level]) => {
    const sound = soundsById.get(id)
    return sound ? [{ sound, level }] : []
  })
  const total = ingredients.reduce((sum, { level }) => sum + level, 0)
  return (
    <>
      <div className="mixbar" aria-hidden="true">
        {ingredients.map(({ sound, level }) => (
          <i key={sound.id} style={{ background: sound.color, width: total > 0 ? `${level / total * 100}%` : '0%' }} />
        ))}
      </div>
      <div className="mix-legend">
        {ingredients.map(({ sound, level }) => (
          <span key={sound.id}><i style={{ background: sound.color }} />{sound.name} {Math.round(level * 100)}</span>
        ))}
      </div>
    </>
  )
}

function Recipes({ recipes, sounds, onChooseScene, onShowPremium }) {
  const soundsById = new Map(sounds.map(sound => [sound.id, sound]))
  return (
    <section className="blk" id="recipes">
      <div className="sec-head"><h2>配方</h2><span className="en">recipes</span></div>
      <p className="sec-sub">按想做的事选一杯。免费配方可以直接听，也可以继续调整。</p>
      <div className="cards" id="recipeCards">
        {recipes.map(recipe => (
          <div className="card recipe-card" key={recipe.name}>
            <h3>{recipe.name}<span className={recipe.premium ? 'tag premium' : 'tag'}>{recipe.premium ? '进阶 · ' : ''}{recipe.tag}</span></h3>
            <p>{recipe.desc}</p>
            <RecipeMix mix={recipe.mix} soundsById={soundsById} />
            <div className="row">
              <button
                type="button"
                className={recipe.premium ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'}
                onClick={() => recipe.premium ? onShowPremium(recipe.name) : onChooseScene(recipe)}
              >
                {recipe.premium ? '了解进阶' : '进入场景'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Plus() {
  return (
    <section className="blk" id="plus">
      <div className="sec-head"><h2>声音实验室进阶</h2><span className="en">PLUS</span></div>
      <p className="sec-sub">想把一杯声音留得久一些，或去更远的地方听一听。</p>
      <div className="cards access-cards">
        <article className="card"><h3>免费</h3><p>4 款场景配方、12 种基础音效、3 种底噪。每次播放最多 10 分钟。</p></article>
        <article className="card"><h3>进阶 <span className="tag">筹备中</span></h3><p>解锁全部配方和音效，延长专注与沉浸时间。</p></article>
      </div>
    </section>
  )
}

function SavedRecipes() {
  return (
    <section className="blk" id="mine">
      <div className="sec-head"><h2>我的配方</h2><span className="en">my recipes</span></div>
      <p className="sec-sub">调到满意，给它起个名字存下来。还能生成一张配方卡发给朋友，或者把配方码发过去——对方粘贴进来，就能调出和你一模一样的一杯。</p>
      <div className="mine-grid">
        <div>
          <div className="save-box">
            <h3>存下这一杯</h3>
            <p>保存的是当前推子的配比，随时回来一键复现。</p>
            <div className="current-mix" id="currentMix">当前配比：还没有拉动任何推子。</div>
            <div className="field">
              <label htmlFor="recipeName">配方名字</label>
              <input type="text" id="recipeName" maxLength={16} placeholder="例如：加班到深夜的那杯" />
            </div>
            <button className="btn btn-ember" id="saveBtn" style={{ width: '100%', justifyContent: 'center' }}>保存配方</button>
          </div>
          <div className="save-box" style={{ marginTop: '14px' }}>
            <h3>导入朋友的配方</h3>
            <p>把朋友发你的配方码粘贴到这里。</p>
            <div className="field">
              <label htmlFor="importCode">配方码</label>
              <textarea id="importCode" placeholder="粘贴以 SYL- 开头的配方码…"></textarea>
            </div>
            <button className="btn btn-ghost" id="importBtn" style={{ width: '100%', justifyContent: 'center' }}>导入并调出这杯</button>
          </div>
        </div>
        <div className="mine-list" id="mineList">
          <div className="empty-note-2">还没有存过配方。<br />去调音台拉几格推子，调到「就是这个感觉」，再回来存下它。</div>
        </div>
      </div>
    </section>
  )
}

function Sources() {
  return (
    <section className="blk" id="sources">
      <div className="sec-head"><h2>音源清单</h2><span className="en">real recordings · sources &amp; licences</span></div>
      <p className="sec-sub">查看录音和采样的作者与授权。可用本地文件替换基础通道，文件只在当前页面使用。</p>
      <div className="src-list" id="srcList"><div className="skl skl-row" aria-hidden="true"></div><div className="skl skl-row" aria-hidden="true"></div><div className="skl skl-row" aria-hidden="true"></div></div>
      <p className="comfort-note" style={{ marginTop: '14px' }}>底噪 · 可单独开关</p>
      <div className="chips" style={{ marginTop: '8px' }}>
        <button className="chip" data-bed="white">白噪音 床声</button>
        <button className="chip" data-bed="pink">粉红噪音 床声</button>
        <button className="chip" data-bed="brown">褐色噪音 床声</button>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer>
      <span className="serif">声音实验室</span>
      <span>自己调一杯声音 · 睡前、工作、雨夜</span>
      <a href="#sources">音源清单</a>
    </footer>
  )
}

function Overlays() {
  return (
    <>
      <div className="immersive" id="immersive" role="dialog" aria-modal="true" aria-labelledby="immTitle" aria-hidden="true">
        <div className="flow" id="immFlow"></div>
        <div className="ck-scene ck-imm" id="immScene" aria-hidden="true"></div>
        <h2 id="immTitle">今晚这一杯</h2>
        <p className="sub2" id="immSub">留一点时间给手上的事。</p>
        <div className="focus-read" id="immFocus" role="timer" aria-label="本次体验剩余时间"></div>
        <div className="row2">
          <button className="ibtn" id="immPlay">暂停</button>
          <button className="ibtn" id="immExit">回调音台</button>
        </div>
      </div>

      <dialog className="access-dialog" id="sessionDone" aria-labelledby="sdTitle">
        <div className="sd-card">
          <h3 id="sdTitle">这 10 分钟结束了</h3>
          <p className="sd-sub">这杯还在。可以存下来，或再开一段体验。</p>
          <div className="sd-row">
            <button className="btn btn-primary" id="sdAgain">再听 10 分钟</button>
            <button className="btn btn-ghost" id="sdSave">保存这杯</button>
            <button className="btn btn-ghost" data-see-plus="">了解进阶</button>
            <button className="btn btn-ghost" id="sdClose">关闭</button>
          </div>
        </div>
      </dialog>

      <dialog className="access-dialog" id="premiumDialog" aria-labelledby="premiumTitle">
        <div className="sd-card">
          <h3 id="premiumTitle">进阶内容</h3>
          <p className="sd-sub" id="premiumMessage"></p>
          <div className="sd-row">
            <button className="btn btn-primary" data-see-plus="">了解进阶</button>
            <form method="dialog"><button className="btn btn-ghost">继续调音</button></form>
          </div>
        </div>
      </dialog>

      <div className="toast" id="toast" role="status"></div>
    </>
  )
}

export default function SoundLabView({ recipes = [], sounds = [], onChooseScene, onShowPremium }) {
  return (
    <>
      <a className="skip-link" href="#mixer">跳到调音台</a>
      <Background />
      <Navigation />
      <main>
        <Hero recipes={recipes} onChooseScene={onChooseScene} />
        <Mixer />
        <Recipes recipes={recipes} sounds={sounds} onChooseScene={onChooseScene} onShowPremium={onShowPremium} />
        <Plus />
        <SavedRecipes />
        <Sources />
        <Footer />
      </main>
      <Overlays />
    </>
  )
}
