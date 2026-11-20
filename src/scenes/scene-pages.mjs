/**
 * Search-friendly scene editorial pages. Every title and claim must be
 * supported by the footage and music provenance in scenes/catalog.mjs.
 * These are selected works, not generated SEO doorway pages.
 */
const text = (en, zh) => ({ en, zh });

export const FEATURED_SCENE_PAGES = Object.freeze([
  {
    slug: 'chiang-mai-focus',
    sceneId: 'chiang-mai',
    journeyId: 'focus-chiang-mai',
    intention: 'focus',
    eyebrow: text('THAILAND / FOCUS', '泰国 / 专注'),
    title: text('Chiang Mai Focus Soundscape', '清迈 · 花园里的专注音景'),
    summary: text(
      'A warm, editable focus soundscape inspired by Chiang Mai. Watch moving footage of Royal Park Rajapruek while soft harmonies and gentle textures settle into the background.',
      '一段以清迈为灵感的可调配专注音景。画面是皇家花园的真实移动镜头，温暖和声与轻柔纹理为阅读和工作留出空间。'
    ),
    sections: [
      {
        heading: text('A place to return to', '适合慢慢回来的地方'),
        body: text(
          'Choose this journey when you want company without distraction. The music is intentionally steady: a warm opening, quiet changes in the middle, and a low-pressure rhythm for writing or reading. This is a place-inspired composition, not a claim of on-location café recording.',
          '适合阅读、写作或安静工作的时刻。开场有一点温度，中段变化不抢注意力，音乐不要求你跟着节奏走。这是以清迈为灵感的作品，不是现场咖啡馆实录。'
        )
      },
      {
        heading: text('Make the balance your own', '把声音调成自己的样子'),
        body: text(
          'Begin with the curated balance, then open Studio to adjust harmony, melodic details and atmosphere separately. Café conversation is available only as an optional recording and stays off by default for focus. You can compare the mix without stopping the journey.',
          '从默认配方开始，再进入 Studio 分别调整和声、细节声部与氛围。咖啡馆交谈声是可选录音，专注模式下默认关闭。调配过程中不必停止聆听。'
        )
      },
      {
        heading: text('What you are seeing and hearing', '真实画面与声音来源'),
        body: text(
          'The moving image shows Royal Park Rajapruek in Chiang Mai, not an indoor rainy café. The soundtrack is an original procedural arrangement made for Sound Cocktail. Video and music have separate sources and should not be mistaken for synchronous field audio.',
          '移动影像来自清迈皇家花园，并不是雨中咖啡馆的内部实景。音乐是为 Sound Cocktail 制作的原创程序编排，影像与音乐有各自的来源，不代表同步拍摄的现场声音。'
        )
      }
    ]
  },
  {
    slug: 'bali-sound-bath',
    sceneId: 'bali',
    journeyId: 'meditate-bali',
    intention: 'meditate',
    eyebrow: text('INDONESIA / UNWIND', '印度尼西亚 / 放松'),
    title: text('Bali Sound Bath & Rice Terrace Film', '巴厘岛 · 梯田声浴'),
    summary: text(
      'Slow aerial travel over Balinese rice terraces with an editable singing-bowl-inspired composition. A gentle listening room for unwinding, not a medical treatment.',
      '在巴厘岛梯田的移动航拍中，聆听一段可自由调配、带有颂钵泛音灵感的声音作品。适合放松，不作为医疗或治疗建议。'
    ),
    sections: [
      {
        heading: text('An unhurried fifteen minutes', '给自己十五分钟'),
        body: text(
          'Follow the changing shapes of the rice terraces as long tones and delicate answering notes unfold. This sound bath is meant to create a sense of space and pause; it does not promise a clinical outcome or a particular sleep effect.',
          '看梯田的线条随着镜头缓缓变化，长音与稀疏的回应音慢慢展开。它提供的是空间感和休息的氛围，不承诺特定治疗效果或助眠效果。'
        )
      },
      {
        heading: text('Shape your listening room', '调配自己的聆听空间'),
        body: text(
          'Studio separates the harmony, musical details, synthetic air texture and a low-volume forest recording. Lower the details for a quieter sound, or widen the room while preserving the original musical balance.',
          'Studio 将和声、音乐细节、合成空气纹理和低音量森林环境录音分开控制。你可以减少细节，让整体更安静，也可以调整空间深度而不改变主旋律。'
        )
      },
      {
        heading: text('Footage provenance', '影像素材说明'),
        body: text(
          'The film is licensed aerial footage identified by its uploader as Bali rice terraces. The music is an independent original composition, not sound recorded at this location. Both sources are credited on the page.',
          '画面来自上传者标注为巴厘岛梯田的授权航拍素材。音乐是独立制作的原创作品，不是此地实录。页面列明了视频及声音来源。'
        )
      }
    ]
  },
  {
    slug: 'hoi-an-evening',
    sceneId: 'hoi-an',
    journeyId: 'relax-hoi-an',
    intention: 'relax',
    eyebrow: text('VIETNAM / EVENING', '越南 / 夜晚'),
    title: text('Hoi An Lantern River Evening Soundscape', '会安 · 灯笼河畔夜色音景'),
    summary: text(
      'A softly moving view of Hoi An’s lantern-lit river, paired with an original ambient composition. An evening scene for slowing down and adjusting your own sound layers.',
      '会安灯笼河道的实景移动影像，配上一段原创环境音乐。适合放慢节奏，也可以按自己的偏好调节不同声音层。'
    ),
    sections: [
      {
        heading: text('Stay after the lights come on', '灯笼亮起之后'),
        body: text(
          'The river is lit by reflections and small movements. This scene does not try to recreate a verified live street recording; instead it pairs identifiable place footage with a gentle musical interpretation of an evening by the water.',
          '河面的灯光和细微波动都在继续。这段作品没有冒充经过核验的夜市实地录音，而是让真实地点的影像与柔和音乐相遇，留下一个水边傍晚的印象。'
        )
      },
      {
        heading: text('A lighter, more personal mix', '更轻、更私人的配比'),
        body: text(
          'The separate harmony, details and atmosphere layers let you keep the evening gentle. Reduce the musical details when resting, or bring them back when journaling and unwinding after a long day.',
          '和声、细节与氛围可以独立调整。休息时降低音乐细节，写日记或整理一天的思绪时再加回来，不需要切换到完全不同的作品。'
        )
      },
      {
        heading: text('Respecting the source material', '尊重真实素材'),
        body: text(
          'The moving image is an attributed Hoi An river clip and the soundtrack is made separately. The original footage and license are linked below. This Plus journey remains previewable as editorial content even when playback is locked.',
          '移动画面为注明来源的会安河道素材，配乐独立制作。下方可以查看原素材与许可。即使这条进阶旅程尚未解锁，仍可浏览完整的场景说明。'
        )
      }
    ]
  }
]);

export const getFeaturedScenePage = slug =>
  FEATURED_SCENE_PAGES.find(page => page.slug === slug) || null;

export const scenePagePath = (page, locale = 'en') =>
  '/' + (locale === 'zh' ? 'zh' : 'en') + '/scenes/' + page.slug;
