const label = (en, zh) => ({ en, zh });
const musicFile = name => `/assets/audio/scenes/${name}.mp3`;

export const SCENES = [
  {
    id: 'bali', number: '01', name: label('Bali', '巴厘岛'),
    location: label('Rainforest retreat', '雨林栖居'),
    title: label('Bali,\nafter the rain.', '雨后，\n在巴厘岛。'),
    description: label('A stream wanders through the green.\nSinging bowls leave a little room to exhale.', '溪水穿过层层绿意。\n让颂钵的余韵，陪你慢慢松弛。'),
    note: label('Let the afternoon take its time.', '把时间，还给自己。'),
    tag: label('REST · SINGING BOWLS', '放松 · 颂钵与和声'),
    trackTitle: label('Bali Sound Bath', '巴厘岛 · 颂钵声浴'),
    video: '/assets/scenes/bali-rainforest.mp4',
    mobileVideo: '/assets/scenes/bali-rainforest-mobile.mp4',
    poster: '/assets/scenes/bali-rainforest.jpg',
    mobilePoster: '/assets/scenes/bali-rainforest-mobile.jpg',
    position: '57% center', mobilePosition: '58% center',
    warmth: .46, space: .37,
    layers: [
      { id: 'music', label: label('Bowls & harmony', '颂钵与和声'), detail: label('The original musical score', '完整音乐主轨'), file: musicFile('bali-score'), defaultLevel: .85, icon: 'music' },
      { id: 'texture', label: label('Distant resonance', '远处回响'), detail: label('Occasional answering tones', '间或响起的泛音回应'), file: musicFile('bali-resonance'), defaultLevel: .8, icon: 'spark' },
      { id: 'air', label: label('Air texture', '空气纹理'), detail: label('A soft, synthesized atmosphere', '轻柔的合成氛围'), file: musicFile('bali-air'), defaultLevel: .55, icon: 'wind' },
      { id: 'ambience', label: label('Forest', '林间环境声'), detail: label('A separate field recording', '独立环境录音'), file: '/assets/audio/forest.mp3', loopOverlapSeconds: 1, defaultLevel: .12, icon: 'leaf' },
    ],
  },
  {
    id: 'chiang-mai', number: '02', name: label('Chiang Mai', '清迈'),
    location: label('A quiet café window', '森林小镇 · 窗边咖啡馆'),
    title: label('An afternoon\nin Chiang Mai.', '在清迈，\n虚度一个午后。'),
    description: label('Warm keys, a little rain, and nowhere to rush.\nSettle into your own small corner of the world.', '暖琴、细雨，还有不必着急的时间。\n在世界的某个角落，安心待一会儿。'),
    note: label('Stay for one more cup.', '再待一杯咖啡的时间。'),
    tag: label('UNWIND · WARM KEYS', '慢下来 · 温暖琴声'),
    trackTitle: label('Chiang Mai Café Flow', '清迈 · 窗边慢时光'),
    video: '/assets/scenes/chiang-mai-cafe.mp4',
    mobileVideo: '/assets/scenes/chiang-mai-cafe-mobile.mp4',
    poster: '/assets/scenes/chiang-mai-cafe.jpg',
    mobilePoster: '/assets/scenes/chiang-mai-cafe-mobile.jpg',
    position: 'center', mobilePosition: 'center',
    warmth: .55, space: .28,
    layers: [
      { id: 'music', label: label('Music', '音乐'), detail: label('Warm keys, harmony & light rhythm', '暖琴、和声与轻节奏'), file: musicFile('chiang-mai-score'), defaultLevel: .85, icon: 'music' },
      { id: 'texture', label: label('Wood tones', '木质拨弦'), detail: label('Gentle, separate plucked notes', '独立的轻柔拨弦声部'), file: musicFile('chiang-mai-wood'), defaultLevel: .8, icon: 'spark' },
      { id: 'air', label: label('Air texture', '空气纹理'), detail: label('A soft, synthesized atmosphere', '轻柔的合成氛围'), file: musicFile('chiang-mai-air'), defaultLevel: .55, icon: 'wind' },
      { id: 'ambience', label: label('Café ambience', '咖啡馆环境声'), detail: label('A separate café recording', '独立咖啡馆录音'), file: '/assets/audio/cafe.mp3', loopOverlapSeconds: 1, defaultLevel: .12, icon: 'cup' },
    ],
  },
];

export const sceneById = id => SCENES.find(scene => scene.id === id) ?? SCENES[0];
export const sceneText = (value, locale = 'en') => value?.[locale] ?? value?.en ?? '';
