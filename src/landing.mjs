/**
 * 场景落地页与 About 页内容（SEO/GEO P1）。
 *
 * 单一事实来源：每个落地页的 SEO（标题/描述/OG）、正文、预设配方、
 * FAQ 归属都在这里；路由层（src/routes/en/*.tsx、zh/*.tsx）只负责
 * 渲染，seo.mjs 只负责从这里取数拼 head 与 JSON-LD。
 *
 * 文案原则：真实、具体、诚实——写声音本身和用法，不写医疗承诺。
 * 睡眠类说法只引用已核实的来源（见 FAQ：2025 年 Ding 等《Sleep
 * Medicine》荟萃分析，12 项随机试验、1301 人；同时写明证据不一）。
 * 预设配方只用免费通道（12 个），落地页首次打开不触发付费提示。
 */
import { SOUNDS } from './catalog.mjs';

const SOUND_BY_ID = new Map(SOUNDS.map((s) => [s.id, s]));

/** 落地页 key（URL 段与 sitemap 共用）。 */
export const LANDING_KEYS = ['sleep', 'focus', 'relax', 'rain', 'cafe'];

/**
 * 每个落地页的预设配方：与站内已有精选配方对应（sleep=雨夜独处、
 * focus=咖啡馆靠窗、relax=篝火边），rain 与 cafe 为同风格新配方。
 * mix 值 0–1；全部是免费通道，引擎 tweenTo 也会再过滤一次。
 */
export const LANDING_PRESETS = {
  sleep: { name: '雨夜独处', nameEn: 'Rainy Night Alone', mix: { rain: 0.76, piano: 0.24, wind: 0.18 } },
  focus: { name: '咖啡馆靠窗', nameEn: 'Window Seat Café', mix: { cafe: 0.62, keyboard: 0.38, guitar: 0.18 } },
  relax: { name: '篝火边', nameEn: 'By the Campfire', mix: { fire: 0.75, wind: 0.24, piano: 0.16 } },
  rain: { name: '雨落窗边', nameEn: 'Rain on the Window', mix: { rain: 0.8, stream: 0.3, wind: 0.2 } },
  cafe: { name: '午后咖啡馆', nameEn: 'Afternoon Café', mix: { cafe: 0.7, keyboard: 0.3, piano: 0.2 } },
};

/**
 * FAQ 池（8 条，双语）。每条注明归属页面；答案 2–4 句，带具体事实
 * 的地方只写已核实的内容。白噪音与睡眠那条引用 Ding 等 2025 年
 * 《Sleep Medicine》荟萃分析（12 项随机试验、1301 人），同时写明
 * 证据不一与 2026 年粉红噪音实验室研究的提醒。
 */
export const LANDING_FAQS = [
  {
    id: 'white-noise-sleep',
    pages: ['sleep', 'rain'],
    q: {
      en: 'Is white noise good for sleep?',
      zh: '白噪音对睡眠有好处吗？',
    },
    a: {
      en: 'The evidence is mixed, and it is worth saying so. A 2025 meta-analysis of 12 randomized trials with 1,301 people (Ding et al., Sleep Medicine) found white noise improved questionnaire-rated sleep quality in adults and older adults. But an earlier review rated the evidence very low quality, and a 2026 lab study found pink noise at 50 dB cut REM sleep. What seems safest: keep it low — below conversation level — and use it to mask sudden noises, not to replace quiet.',
      zh: '证据并不一致，这一点值得说清楚。2025 年一项荟萃分析汇总了 12 项随机试验、共 1301 人（Ding 等，《Sleep Medicine》），发现白噪音改善了成人和老年人的问卷睡眠质量评分。但更早的综述认为证据质量很低，2026 年一项实验室研究还发现 50 分贝的粉红噪音会减少 REM 睡眠。比较稳妥的做法是：音量放低——低于说话声——用它盖住突然的响动，而不是代替安静。',
    },
  },
  {
    id: 'noise-colors',
    pages: ['sleep', 'focus', 'relax'],
    q: {
      en: "What's the difference between white, brown and pink noise?",
      zh: '白噪音、棕色噪音、粉红噪音有什么区别？',
    },
    a: {
      en: 'It is about how sound energy is spread across frequencies. White noise has equal energy at every frequency — a bright hiss. Pink noise is softer at high frequencies — a deeper, more even shush. Brown noise is deeper still, weighted toward low frequencies — a low rumble. None is proven better than the others for sleep or focus; try each for a night or a work session and keep the one you forget you are hearing.',
      zh: '区别在声音能量在不同频率上的分布。白噪音各频率能量相等，听起来是明亮的嘶嘶声；粉红噪音高频较弱，更深、更均匀；棕色噪音更偏向低频，是低沉的轰鸣。没有证据证明哪一种对睡眠或专注更好——各试一晚或一个工作时段，留住那个让你忘记它在响的。',
    },
  },
  {
    id: 'rain-thunder',
    pages: ['sleep', 'rain'],
    q: {
      en: 'Can I mix rain and thunder sounds for sleep?',
      zh: '雨声加雷声能助眠吗？',
    },
    a: {
      en: "Yes — it is the most-saved combination on Sound Cocktail. Keep the rain steady and up front, and the thunder low and far away; thunder that is too close or too loud wakes people up instead of settling them. On this site, thunder and rainy street are in the Rain Night Pack ($3.99 / ¥12, one-time), while rain itself is free.",
      zh: '可以——这是 Sound Cocktail 上最多人保存的搭配。雨声保持稳定、放在前面，雷声放低、放远；雷声太近太响反而会把人吵醒。站内雷声和雨夜街道在雨夜包里（$3.99 / ¥12，一次性买断），雨声本身免费。',
    },
  },
  {
    id: 'volume',
    pages: ['focus', 'sleep', 'cafe'],
    q: {
      en: 'How loud should background sounds be for focus?',
      zh: '专注时背景音应该多响？',
    },
    a: {
      en: 'Quieter than a conversation — roughly the level of a quiet room with a window open, around 40–50 dB. The test is simple: if you notice the sound instead of your work, turn it down. If a sudden noise from outside still pulls you out, turn it up a little. The right level is the one you stop hearing.',
      zh: '比说话声轻——大概相当于开着窗的安静房间，40–50 分贝左右。判断标准很简单：如果你注意到的是声音而不是手上的事，就调小；如果外面的突然响动还是把你拉出来，就调大一点。对的音量，是那个让你不再注意到的音量。',
    },
  },
  {
    id: 'concentration',
    pages: ['focus', 'cafe'],
    q: {
      en: 'Do ambient sounds actually help you concentrate?',
      zh: '环境音真的能帮人集中注意力吗？',
    },
    a: {
      en: 'For many people, yes — mostly by masking. A steady background sound covers the unpredictable noises (voices, doors, traffic) that break concentration, and a regular sound can mark the start of a work session. The evidence is suggestive rather than conclusive: one well-known 2012 study found moderate ambient noise, around 70 dB, helped creative thinking, while louder noise hurt it. Treat it as a tool to try, not a guarantee.',
      zh: '对很多人来说可以——主要是靠掩盖。稳定的背景音盖住了那些不可预测的响动（说话声、关门声、车流），而固定的声音也能标记一个工作时段的开始。证据是提示性的，不是定论：2012 年一项有名的研究发现，中等强度的环境音（约 70 分贝）有助于创造性思考，太响反而有害。把它当作一个值得试的工具，而不是保证。',
    },
  },
  {
    id: 'free',
    pages: ['sleep', 'focus', 'relax', 'rain', 'cafe'],
    q: {
      en: 'Is Sound Cocktail free? What do the paid packs include?',
      zh: 'Sound Cocktail 免费吗？付费包包含什么？',
    },
    a: {
      en: 'Mixing is free — 22 sounds, no app to install, no account needed to start. Free sessions run up to 10 minutes each. Three one-time packs unlock extra channels: Focus Pack ($1.99 / ¥6) unlocks market voices, wooden fish & drum and wind chimes; Sleep Pack ($2.99 / ¥9) unlocks insects, night train, harp, forest and boat cabin; Rain Night Pack ($3.99 / ¥12) unlocks thunder and rainy street. There is no subscription.',
      zh: '混音免费——22 种声音，不用下载应用，不用注册就能开始调。免费体验每次最多 10 分钟。三个一次性买断的包解锁更多通道：专注包（$1.99 / ¥6）解锁市场人声、木鱼/手鼓和风铃；助眠包（$2.99 / ¥9）解锁虫鸣、夜行火车、竖琴、森林和船舱；雨夜包（$3.99 / ¥12）解锁雷声和雨夜街道。没有订阅。',
    },
  },
  {
    id: 'account',
    pages: ['relax', 'cafe'],
    q: {
      en: 'Do I need an account? Can I use Sound Cocktail offline?',
      zh: '不用注册能用吗？能离线用吗？',
    },
    a: {
      en: 'No account is needed to mix. An account (email or Google) is only needed to buy a pack and keep it across devices. Sound Cocktail needs an internet connection — sounds are generated and streamed in your browser — so there is no offline mode yet.',
      zh: '调音不用注册。账号（邮箱或 Google）只在买包、跨设备同步权益时才需要。Sound Cocktail 需要联网——声音在浏览器里实时合成和播放——所以目前还没有离线模式。',
    },
  },
  {
    id: 'sounds',
    pages: ['relax', 'rain'],
    q: {
      en: 'What sounds can I mix?',
      zh: '能混哪些声音？',
    },
    a: {
      en: '22 sounds in three groups: nature (rain, wind, waves, stream, thunder, birds, insects, fire, forest), places (café voices, traffic, night train, rural night, market, rainy street, boat cabin, keyboard taps) and instruments (piano, guitar, wind chimes, wooden fish & drum, harp notes). 12 are free; 10 are in the three packs. 18 are real field recordings, listed with their source and license on the site; piano, guitar and harp play note samples from the FluidR3 GM soundfont (CC BY 3.0); the wooden fish & drum is synthesized live in your browser.',
      zh: '22 种声音，分三组：自然（雨、风、海浪、溪流、雷、鸟鸣、虫鸣、篝火、森林）、场所（咖啡馆人声、街道车流、夜行火车、乡村夜晚、市场、雨夜街道、船舱、键盘轻敲）和乐器（钢琴、吉他拨弦、风铃、木鱼/手鼓、单音竖琴）。12 种免费，10 种在三个包里。18 种是真实野外录音，在站内音源清单里标了来源和授权；钢琴、吉他和竖琴用 FluidR3 GM 音色库采样（CC BY 3.0）；木鱼/手鼓由浏览器实时合成。',
    },
  },
];

/** 按页面取 FAQ（保持 LANDING_FAQS 里的顺序）。 */
export function faqsForPage(key) {
  return LANDING_FAQS.filter((f) => f.pages.includes(key));
}

/**
 * 落地页正文与 SEO。
 *
 * 结构：seo（双语标题/描述/OG）+ content（双语 h1、导语、3 个小节、
 * 预设说明）。每页英文正文约 350–450 词（不含 FAQ），中文约 500–700
 * 字；每节只写这个场景真实的东西，不写放之四海皆准的套话。
 */
export const LANDING_PAGES = {
  sleep: {
    key: 'sleep',
    seo: {
      en: {
        title: 'Rain Sounds for Sleep · Sound Cocktail',
        description:
          'Rain sounds for sleep: mix steady rain, a little piano and wind into a cup that stays on all night. Free ambient sound mixer — no app, no account.',
        ogTitle: 'Rain Sounds for Sleep · Sound Cocktail',
        ogDescription:
          'Steady rain, a little piano, wind at the edges. Mix it yourself, save it, and let the night sound even.',
      },
      zh: {
        title: '雨声助眠 · Sound Cocktail — 雨声白噪音混音',
        description:
          '雨声助眠：把稳定的雨声、一点钢琴和风调成一杯，整晚陪着你。免费环境音混音器，不用下载，不用注册。',
        ogTitle: '雨声助眠 · Sound Cocktail',
        ogDescription: '稳定的雨声、一点钢琴、边缘的风。自己调一杯，让夜里听起来均匀一点。',
      },
    },
    content: {
      en: {
        h1: 'Rain sounds for sleep',
        standfirst:
          'Steady rain, a little piano you can barely hear, and wind at the edges. This is the mix most people save when they want the night to feel quieter — not silent, just even.',
        sections: [
          {
            h2: 'Why rain works at night',
            body: 'Rain is steady, broadband sound: it fills the room at the same level all night, so a door closing, a car passing or a pipe knocking no longer stands out. The brain stops tracking a sound that never changes, which is exactly what you want when you are trying to fall asleep. The trick is the level — loud enough to cover the room, quiet enough to forget. If you can still hear individual drops, it is probably too loud; if the street outside still pulls you awake, it is too quiet.',
          },
          {
            h2: 'The mix on this page',
            body: 'This page opens with Rainy Night Alone: rain at 76, piano at 24, wind at 18. The rain does the work — a full, even wash. The piano is barely there, one note now and then, far away; it keeps the mix from feeling flat without giving your brain a melody to follow. The wind sits at the edges and makes the rain feel like weather rather than a recording. If you want thunder in it, keep it low and far away — thunder is in the Rain Night Pack, and it works best as a distant rumble you notice twice an hour, not a crack overhead.',
          },
          {
            h2: 'How to use it',
            body: 'Press play, turn the volume down until the rain is a texture rather than a sound, and leave it alone. A timer helps: give the night a start time and let the mix run. If you wake at 3 a.m., do not reach for your phone — the mix is still there, at the same level, doing the same thing. The same cup, night after night, becomes part of going to bed, and that routine is worth more than any single recipe. Sound Cocktail is not a sleep treatment — it is a way to make the night sound steadier while you do the rest yourself.',
          },
        ],
        presetNote:
          'This page loads with Rainy Night Alone — rain 76, piano 24, wind 18. Move any fader to make it yours.',
      },
      zh: {
        h1: '雨声助眠',
        standfirst:
          '稳定的雨声、几乎听不见的一点钢琴、边缘的风。这是最多人保存的配方——不是为了让夜里变安静，而是让夜里听起来均匀一点。',
        sections: [
          {
            h2: '雨声为什么适合夜里',
            body: '雨声是稳定的宽频声音：整晚以同样的音量填满房间，关门声、过路的车、水管的响动就不再突出。大脑会停止追踪一个从不变化的声音，而这正是入睡时想要的。诀窍在音量——盖得住房间，又轻到可以忘记。还能听清一滴一滴的雨点，就是太响了；外面的街道声还是把你拉醒，就是太轻了。',
          },
          {
            h2: '这页的配方',
            body: '这页打开就是「雨夜独处」：雨 76、钢琴 24、风 18。雨声负责全部工作——满满一层均匀的水声。钢琴几乎听不见，隔一会儿才有一个很远的音符，让混音不发闷，又不给大脑一段旋律去跟。风在边缘，让雨听起来像天气，而不是一段录音。想要雷声的话，把它放低、放远——雷声在雨夜包里，最好的用法是一小时才注意到两次的远处闷响，而不是头顶的一声炸裂。',
          },
          {
            h2: '怎么用',
            body: '按下播放，把音量调到雨声变成质感、而不是声音的程度，然后别管它。定个时也好：给夜里一个开始的时间，让混音一直响着。凌晨三点醒了，别伸手拿手机——混音还在那里，同样的音量，做同样的事。同一杯、每晚都一样，慢慢就成了入睡的一部分，而这个 routine 比任何一张配方都值。Sound Cocktail 不是助眠治疗——它只是让夜里听起来稳一点，剩下的靠你自己。',
          },
        ],
        presetNote: '这页打开就是「雨夜独处」——雨 76、钢琴 24、风 18。拉动任何一个推子，把它调成你的。',
      },
    },
  },
  focus: {
    key: 'focus',
    seo: {
      en: {
        title: 'Focus Sounds for Studying & Deep Work · Sound Cocktail',
        description:
          'Focus sounds for studying: café voices, keyboard taps and a little guitar — steady background noise that masks distractions. Free ambient sound mixer, no app, no account.',
        ogTitle: 'Focus Sounds for Studying · Sound Cocktail',
        ogDescription:
          'Café voices, keyboard taps, a guitar now and then. Mix a cup for deep work and keep it on for one session.',
      },
      zh: {
        title: '专注白噪音 · Sound Cocktail — 学习与深度工作',
        description:
          '专注白噪音：咖啡馆人声、键盘轻敲和一点吉他——稳定的背景音盖住干扰。免费环境音混音器，不用下载，不用注册。',
        ogTitle: '专注白噪音 · Sound Cocktail',
        ogDescription: '咖啡馆人声、键盘轻敲、隔一会儿的吉他。调一杯深度工作的声音，一次用一个时段。',
      },
    },
    content: {
      en: {
        h1: 'Focus sounds for studying and deep work',
        standfirst:
          'Café voices low enough to be texture, keyboard taps keeping a rhythm, a guitar now and then. This is the sound of a coffee shop where nobody bothers you — and it is the mix people reach for when the work in front of them needs an hour of undivided attention.',
        sections: [
          {
            h2: 'Why a café helps you focus',
            body: 'A café works because the noise is moderate and steady. Sudden sounds — a voice behind you, a door, a notification — are what break concentration; a constant background wash covers them without asking for attention itself. One well-known 2012 study found moderate ambient noise, around 70 dB, helped creative thinking, while louder noise hurt it. The level matters more than the sound: if you can follow the words of the people next to you, the voices are too loud; if the room feels dead silent, the mix is too quiet.',
          },
          {
            h2: 'The mix on this page',
            body: 'This page opens with Window Seat Café: café voices at 62, keyboard taps at 38, guitar at 18. The voices are the point — low talk at the next table, never quite words you can follow. The keyboard is the rhythm of the room, soft taps that come and go. The guitar is the surprise: one phrase now and then, just enough to keep the mix from feeling like a loop. Every channel is free, so the whole mix plays without an account or a pack.',
          },
          {
            h2: 'Use it for one session',
            body: 'The mix works best when it has a job. Pick one thing — a chapter, a draft, a problem set — and give it one session: 25 minutes if you are starting, 50 if you are warmed up. Press play, open the work, and do not touch the faders until the timer ends. When the session ends, stop the sound too. The pairing is the point: the same cup, the same work, the same hour, day after day. That is how a background sound becomes a cue to focus, instead of just noise.',
          },
        ],
        presetNote:
          'This page loads with Window Seat Café — café voices 62, keyboard 38, guitar 18. Move any fader to make it yours.',
      },
      zh: {
        h1: '专注白噪音：学习与深度工作',
        standfirst:
          '咖啡馆人声轻到只剩质感，键盘轻敲保持着节奏，隔一会儿来一段吉他。这是那种没人打扰你的咖啡馆的声音——也是手上的事需要一小时全神贯注时，最多人伸手去拿的配方。',
        sections: [
          {
            h2: '咖啡馆为什么帮人专注',
            body: '咖啡馆有用，是因为噪音适中且稳定。真正打断专注的，是突然的声音——身后的说话声、关门声、提示音；而持续的背景音把它们盖住，自己又不抢注意力。2012 年一项有名的研究发现，中等强度的环境音（约 70 分贝）有助于创造性思考，太响反而有害。音量比声音本身更重要：如果你能听清隔壁桌在说什么，人声就太响了；如果房间安静得发死，混音就太轻了。',
          },
          {
            h2: '这页的配方',
            body: '这页打开就是「咖啡馆靠窗」：咖啡馆人声 62、键盘轻敲 38、吉他拨弦 18。人声是重点——隔壁桌低声聊天，永远听不清具体在说什么。键盘是房间的节奏，轻轻的敲击声时有时无。吉他是意外：隔一会儿来一句，刚好让混音不像在循环。每个通道都免费，整杯不用账号、不用买包就能听。',
          },
          {
            h2: '一次只做一件事',
            body: '这个配方最好在有任务的时候用。选一件事——一章书、一篇草稿、一套习题——给它一个时段：刚开始 25 分钟，热身之后 50 分钟。按下播放，打开要做的事，计时结束前别碰推子。时段结束，声音也停下。配对才是重点：同一杯、同一件事、同一个小时，天天如此。背景音就是这样从"噪音"变成"开始专注"的信号的。',
          },
        ],
        presetNote: '这页打开就是「咖啡馆靠窗」——咖啡馆人声 62、键盘轻敲 38、吉他拨弦 18。拉动任何一个推子，把它调成你的。',
      },
    },
  },
  relax: {
    key: 'relax',
    seo: {
      en: {
        title: 'Relaxing Ambient Sounds to Wind Down · Sound Cocktail',
        description:
          'Wind down with fire, waves and birds: slow ambient sounds for the last hour of the day. Free ambient sound mixer — no app, no account.',
        ogTitle: 'Wind Down with Fire, Waves & Birds · Sound Cocktail',
        ogDescription:
          'A campfire, wind, a little piano. Slow sounds for the last hour of the day — mix your own and save it.',
      },
      zh: {
        title: '放松白噪音 · Sound Cocktail — 篝火、海浪、鸟鸣',
        description:
          '用篝火、海浪和鸟鸣放慢一天的结尾：给睡前最后一小时的慢声音。免费环境音混音器，不用下载，不用注册。',
        ogTitle: '放松白噪音 · Sound Cocktail',
        ogDescription: '一堆篝火、风、一点钢琴。给一天最后一小时的慢声音——自己调一杯，存下来。',
      },
    },
    content: {
      en: {
        h1: 'Relaxing sounds to wind down',
        standfirst:
          'A campfire, wind, a little piano. Slow sounds for the last hour of the day — nothing that asks for attention, everything that lets the evening settle.',
        sections: [
          {
            h2: 'Slowing down is a transition, not a switch',
            body: 'The last hour of the day is hard because it asks you to change gear with nothing to hold on to. A steady, slow sound gives the evening a shape: the fire crackles at the same pace, the wind comes and goes, and there is nothing to finish. It is not about falling asleep — it is about letting the day end before bed, instead of carrying it there. A slow sound also gives the evening something to do: put the kettle on, open a book, let the fire be the only thing making noise. Keep the volume low enough that you have to listen for it; the moment it becomes the loudest thing in the room, it has stopped relaxing you.',
          },
          {
            h2: 'The mix on this page',
            body: 'This page opens with By the Campfire: fire at 75, wind at 24, piano at 16. The fire is the whole mix — wood popping now and then, a warm crackle that never hurries. The wind is light, just enough to make the fire feel outdoors. The piano is one note at a time, far away, like someone practicing in the next room. All three channels are free, so the mix plays in full without an account.',
          },
          {
            h2: 'Make it a small ritual',
            body: 'The mix matters less than the repetition. Same cup, same time, same chair — ten minutes with the fire on and the phone in another room. After a week, the sound itself becomes the signal: the fire starts, the day is over. If ten minutes feels too short, make it fifteen — but keep the start time the same. The ritual works because it repeats, not because it is long. If you want a different evening, change one fader: more wind for a colder night, waves instead of fire for a summer one. Save the version that works and give it a name; a named cup is one you will actually come back to.',
          },
        ],
        presetNote:
          'This page loads with By the Campfire — fire 75, wind 24, piano 16. Move any fader to make it yours.',
      },
      zh: {
        h1: '放松的声音：放慢一天的结尾',
        standfirst:
          '一堆篝火、风、一点钢琴。给一天最后一小时的慢声音——什么都不抢注意力，只让傍晚慢慢沉下来。',
        sections: [
          {
            h2: '放慢是一个过渡，不是一个开关',
            body: '一天的最后一小时难，是因为它要求你换挡，却没东西可抓。稳定而缓慢的声音给傍晚一个形状：篝火以同样的节奏噼啪作响，风时有时无，没有什么需要完成。它不是为了让你睡着——而是让这一天在上床之前就结束，而不是把它带进被窝。慢声音也给傍晚找了件事做：烧一壶水，翻开一本书，让篝火成为唯一在响的东西。音量放到需要仔细听才听得见的程度；它一旦变成房间里最响的东西，就不再让人放松了。',
          },
          {
            h2: '这页的配方',
            body: '这页打开就是「篝火边」：篝火 75、风 24、钢琴 16。篝火就是全部——木柴隔一会儿响一下，温暖的噼啪声从不着急。风很轻，刚好让火听起来像在户外。钢琴一次一个音，很远，像隔壁房间有人在练琴。三个通道都免费，整杯不用账号就能听完。',
          },
          {
            h2: '把它变成一个小仪式',
            body: '配方本身不如重复重要。同一杯、同一个时间、同一把椅子——篝火开着，手机放在另一个房间，十分钟。一周之后，声音本身就成了信号：火一点起来，这一天就结束了。十分钟觉得短，就改成十五分钟——但开始的时间别变。仪式有用，是因为它重复，不是因为它长。想换个晚上，改一个推子就行：夜里冷一点就多加点风，夏天就把篝火换成海浪。把好用的版本存下来、起个名字；起了名字的杯子，才是你真的会回来喝的那一杯。',
          },
        ],
        presetNote: '这页打开就是「篝火边」——篝火 75、风 24、钢琴 16。拉动任何一个推子，把它调成你的。',
      },
    },
  },
  rain: {
    key: 'rain',
    seo: {
      en: {
        title: 'Rain Sounds · Rain on a Window · Sound Cocktail',
        description:
          'Rain sounds: steady rain on a window with a stream underneath and wind at the edges. The plainest mix on Sound Cocktail, and the most-played. Free, no app, no account.',
        ogTitle: 'Rain Sounds · Rain on a Window · Sound Cocktail',
        ogDescription:
          'Rain 80, stream 30, wind 20. Rain alone, done properly — mix it yourself and save it.',
      },
      zh: {
        title: '雨声 · Sound Cocktail — 雨落窗边',
        description:
          '雨声：窗边的雨，下面一条溪流，边缘的风。站里最简单、也最多人听的配方。免费，不用下载，不用注册。',
        ogTitle: '雨声 · 雨落窗边 · Sound Cocktail',
        ogDescription: '雨 80、溪流 30、风 20。只有雨声，但做对了——自己调一杯，存下来。',
      },
    },
    content: {
      en: {
        h1: 'Rain sounds: rain on a window',
        standfirst:
          'Rain at 80, a stream at 30, wind at 20. The plainest mix on this site, and the most-played. Rain alone, done properly — no thunder, no tricks, just water on glass.',
        sections: [
          {
            h2: 'Why rain is the most-searched ambient sound',
            body: 'Rain is the sound people reach for first, and the reason is simple: it is steady, broadband, and familiar. It covers a room the way a blanket covers a bed — evenly, with no edges. Different rains feel different: rain on a window is close and soft, rain on a roof is heavier, rain on a street has cars in it. This page is the window kind. If you want the street kind, the Rain Night Pack adds rainy street and thunder.',
          },
          {
            h2: 'The mix on this page',
            body: 'This page opens with Rain on the Window: rain at 80, stream at 30, wind at 20. The rain is up front and does almost everything. The stream runs underneath — a thinner, moving water sound that keeps the rain from feeling flat. The wind sits at the edges and makes it feel like weather outside a real window, not a loop. All three channels are free. Turn the rain up to 90 and it becomes a storm; turn it down to 50 and it becomes a drizzle you can read to. If the rain ever feels too even, add a little wind — it breaks the pattern just enough to feel like weather.',
          },
          {
            h2: 'Rain for reading, sleeping, working',
            body: 'The same sound does three jobs at three volumes. For reading, keep it low — a texture behind the page. For sleep, keep it steady and a little louder, so the night has no gaps in it. For working, put it in the middle: loud enough to cover the room, quiet enough to forget. If one volume is not working, change the volume before you change the mix — most rain problems are volume problems. Keep the mix the same for a week before you change it; the ear learns a sound the way it learns a room, and a familiar rain works better than a new one.',
          },
        ],
        presetNote:
          'This page loads with Rain on the Window — rain 80, stream 30, wind 20. Move any fader to make it yours.',
      },
      zh: {
        h1: '雨声：雨落窗边',
        standfirst:
          '雨 80、溪流 30、风 20。站里最简单、也最多人听的配方。只有雨声，但做对了——没有雷、没有花样，只有水落在玻璃上。',
        sections: [
          {
            h2: '雨声为什么是搜得最多的环境音',
            body: '雨声是人们第一个伸手去拿的声音，原因很简单：它稳定、宽频、熟悉。像被子盖住床一样均匀地盖住房间，没有棱角。不同的雨感觉不同：窗边的雨近而柔，屋顶的雨更重，街道的雨里有车声。这页是窗边那一种。想要街道那一种，雨夜包里有雨夜街道和雷声。',
          },
          {
            h2: '这页的配方',
            body: '这页打开就是「雨落窗边」：雨 80、溪流 30、风 20。雨声在前面，几乎负责全部。溪流在下面流——更细、更流动的水声，让雨不发闷。风在边缘，让它听起来像真实窗外的天气，而不是一段循环。三个通道都免费。雨推到 90 就成了暴雨，降到 50 就成了可以伴着读书的毛毛雨。如果雨声听起来太均匀，加一点风——刚好打乱一点规律，让它更像天气。',
          },
          {
            h2: '读书、睡觉、工作的雨声',
            body: '同一种声音，在三个音量下做三件事。读书时放轻——一层在书页后面的质感。睡觉时放稳、稍响一点，让夜里没有空隙。工作时放中间：盖得住房间，又轻到可以忘记。如果某个音量不管用，先改音量再改配方——雨声的问题，大多是音量的问题。先把一个配方固定用一周再改；耳朵学一种声音，就像学一个房间，熟悉的雨比新的雨更好用。',
          },
        ],
        presetNote: '这页打开就是「雨落窗边」——雨 80、溪流 30、风 20。拉动任何一个推子，把它调成你的。',
      },
    },
  },
  cafe: {
    key: 'cafe',
    seo: {
      en: {
        title: 'Café Ambience for Writing & Reading · Sound Cocktail',
        description:
          'Café ambience for writing: low voices, keyboard taps and a little piano — the sound of a café where nobody bothers you. Free ambient sound mixer, no app, no account.',
        ogTitle: 'Café Ambience for Writing · Sound Cocktail',
        ogDescription:
          'Café voices 70, keyboard 30, piano 20. Write in a café that never closes — mix it yourself.',
      },
      zh: {
        title: '咖啡馆背景音 · Sound Cocktail — 写作与阅读',
        description:
          '咖啡馆背景音：低声交谈、键盘轻敲和一点钢琴——那种没人打扰你的咖啡馆的声音。免费环境音混音器，不用下载，不用注册。',
        ogTitle: '咖啡馆背景音 · Sound Cocktail',
        ogDescription: '咖啡馆人声 70、键盘 30、钢琴 20。在一家永远不打烊的咖啡馆里写作——自己调一杯。',
      },
    },
    content: {
      en: {
        h1: 'Café ambience for writing and reading',
        standfirst:
          'Café voices at 70, keyboard taps at 30, a little piano at 20. The sound of a café where nobody bothers you — low talk as texture, a keyboard keeping time, and a piano that never asks to be listened to.',
        sections: [
          {
            h2: 'Why writers like café sound',
            body: 'Writing needs company without conversation. A café gives you both: people around you, and nobody talking to you. The voices in this mix are kept low on purpose — if you can follow what the next table is saying, the mix is too loud and the words will get into your sentences. At the right level the voices stop being language and become weather. That is also what the research points to: moderate ambient noise, around 70 dB, helped creative thinking in a well-known 2012 study, while louder noise hurt it.',
          },
          {
            h2: 'The mix on this page',
            body: 'This page opens with Afternoon Café: café voices at 70, keyboard taps at 30, piano at 20. The voices are the room — a low murmur that never resolves into words. The keyboard is the work happening around you, soft taps that come in bursts. The piano replaces the guitar from the focus mix: one note at a time, slower and softer, because writing wants less rhythm and more air. All three channels are free, so the whole café plays without an account.',
          },
          {
            h2: 'Write with it',
            body: 'Use the mix the way you would use a café: sit down, press play, and write until the cup is empty. Pair it with a small target — 300 words, ten pages, one scene — and let the sound mark the session. When the target is done, stop the sound; the café closes when you do. If the voices start to distract you, turn them down ten points before you touch anything else. And if you write a good page with this mix, save it as a recipe and give it the name of the thing you wrote — the cup will remember the work.',
          },
        ],
        presetNote:
          'This page loads with Afternoon Café — café voices 70, keyboard 30, piano 20. Move any fader to make it yours.',
      },
      zh: {
        h1: '咖啡馆背景音：写作与阅读',
        standfirst:
          '咖啡馆人声 70、键盘轻敲 30、一点钢琴 20。那种没人打扰你的咖啡馆的声音——低声交谈只是质感，键盘保持着节奏，钢琴从不要求你去听它。',
        sections: [
          {
            h2: '写作者为什么喜欢咖啡馆的声音',
            body: '写作需要陪伴，但不需要对话。咖啡馆同时给了这两样：身边有人，却没人跟你说话。这页的人声是故意放轻的——如果你能听清隔壁桌在说什么，混音就太响了，那些话会钻进你的句子里。在对的音量下，人声不再是语言，变成了天气。研究也指向这一点：2012 年一项有名的研究发现，中等强度的环境音（约 70 分贝）有助于创造性思考，太响反而有害。',
          },
          {
            h2: '这页的配方',
            body: '这页打开就是「午后咖啡馆」：咖啡馆人声 70、键盘轻敲 30、钢琴 20。人声就是房间本身——低低的嗡鸣，永远听不成句子。键盘是周围正在进行的工作，轻轻的敲击声一阵一阵。钢琴换掉了专注配方里的吉他：一次一个音，更慢、更轻，因为写作要的不是节奏，是空气。三个通道都免费，整间咖啡馆不用账号就能听。',
          },
          {
            h2: '就着它写',
            body: '把这个配方当一家真的咖啡馆用：坐下来，按下播放，写到这杯喝完。配一个小目标——300 字、十页、一个场景——让声音标记这个时段。目标完成，声音也停下；你走，咖啡馆就打烊。如果人声开始分心，先把它调低十个点，再碰别的。哪天用这个配方写出满意的一页，把它存成配方，用写的东西给它起个名字——这杯会记得这份工作。',
          },
        ],
        presetNote: '这页打开就是「午后咖啡馆」——咖啡馆人声 70、键盘 30、钢琴 20。拉动任何一个推子，把它调成你的。',
      },
    },
  },
};

/**
 * About 页（/about，双语）。
 *
 * 与首页 About 区块（locale.mjs 的 about）保持一致、不矛盾：
 * 同样说"免费混音器、22 种声音、不用下载、不用注册"，这里是更完整
 * 的版本：作者身份、声音来源、诚实声明与医疗免责。
 */
export const ABOUT_PAGE = {
  seo: {
    en: {
      title: 'About Sound Cocktail — made by one independent developer',
      description:
        'Sound Cocktail is a free ambient sound mixer made by limer, an independent full-stack developer. 22 sounds: real field recordings and live synthesis. Not a medical product.',
      ogTitle: 'About Sound Cocktail',
      ogDescription:
        'A free ambient sound mixer, made by one independent developer. Real recordings, live synthesis, no subscription.',
    },
    zh: {
      title: '关于 Sound Cocktail — 一个独立开发者的作品',
      description:
        'Sound Cocktail 是一款免费的环境音混音器，作者 limer，一名独立全栈开发者。22 种声音：真实野外录音与实时合成。不是医疗产品。',
      ogTitle: '关于 Sound Cocktail',
      ogDescription: '一款免费的环境音混音器，一个独立开发者做的。真实录音、实时合成、没有订阅。',
    },
  },
  content: {
    en: {
      h1: 'About Sound Cocktail',
      lead: 'Sound Cocktail is a small web app for mixing ambient sounds the way you mix a cocktail: pick a few sounds, set each one’s level, and save the cup. It is made by one person — limer, an independent full-stack developer — not a company.',
      sections: [
        {
          h2: 'Why this exists',
          body: 'I wanted a mixer that felt like making something, not operating a machine. Most sound apps give you a play button and a volume slider; this one gives you a glass. You pour in rain, add a little piano, turn the fire up a notch — and the cup fills as the mix comes together. The point was never the number of sounds. It was the feeling of making a cup that sounds like tonight.',
        },
        {
          h2: 'How the sounds are made',
          body: 'The 22 sounds come from two places. 18 are real field recordings — rain, streets, cafés, night trains — each listed with its author, source and license in the Sources section of the mixer. Piano, guitar and harp play note samples from Frank Wen’s FluidR3 GM soundfont (CC BY 3.0). The wooden fish & drum is synthesized live in your browser by a Web Audio engine, which also tunes every sound for brightness, distance and density. Nothing is a stock loop pretending to be a recording: the site says which is which.',
        },
        {
          h2: 'What it costs, and what it is not',
          body: 'Mixing is free, with sessions of up to 10 minutes each. Three one-time packs unlock extra channels — Focus ($1.99 / ¥6), Sleep ($2.99 / ¥9) and Rain Night ($3.99 / ¥12). There is no subscription and no account needed to mix; an account is only needed to buy a pack. Sound Cocktail is not a medical product. It does not treat insomnia, anxiety or tinnitus, and it is not a substitute for medical advice — if sleep problems persist, talk to a doctor. It is a way to make a room sound better while you work, read or wind down.',
        },
      ],
    },
    zh: {
      h1: '关于 Sound Cocktail',
      lead: 'Sound Cocktail 是一款调环境音的小网页应用，调法像调酒：挑几种声音，各调各的音量，调出一杯存下来。作者只有一个人——limer，一名独立全栈开发者——不是一家公司。',
      sections: [
        {
          h2: '为什么做这个',
          body: '我想要一个调音器，感觉像在做一样东西，而不是在操作一台机器。大多数声音应用只给你一个播放键和一个音量条；这个给你一只杯子。你倒进雨声，加一点钢琴，把篝火调高一格——杯子就随着混音一起满上来。重点从来不是声音的数量，而是调出一杯"听起来像今晚"的感觉。',
        },
        {
          h2: '声音是怎么来的',
          body: '22 种声音来自两个地方。18 种是真实的野外录音——雨、街道、咖啡馆、夜行火车——每一段的作者、来源和授权都标在调音台的音源清单里。钢琴、吉他和竖琴用的是 Frank Wen 的 FluidR3 GM 音色库采样（CC BY 3.0）。木鱼/手鼓由浏览器里的 Web Audio 引擎实时合成，引擎同时负责每种声音的亮度、距离和疏密。没有拿现成循环冒充录音的东西：站里写明了哪个是哪个。',
        },
        {
          h2: '多少钱，以及它不是什么',
          body: '混音免费，每次最多 10 分钟。三个一次性买断的包解锁更多通道——专注包（$1.99 / ¥6）、助眠包（$2.99 / ¥9）、雨夜包（$3.99 / ¥12）。没有订阅，调音不用注册；账号只在买包时才需要。Sound Cocktail 不是医疗产品，不治疗失眠、焦虑或耳鸣，也不能代替医生的建议——睡眠问题持续存在的话，请去看医生。它只是在你工作、读书或放松时，让房间听起来好一点。',
        },
      ],
    },
  },
};

/** 混音页（/mix/:code）的默认名：码里没写名字时按语言补。 */
export const MIX_DEFAULT_NAME = {
  en: 'A shared cup',
  zh: '朋友分享的一杯',
};

/** 按 id 取声音（供混音页展示配料用）。 */
export function soundByIdForMix(id) {
  return SOUND_BY_ID.get(id) || null;
}
