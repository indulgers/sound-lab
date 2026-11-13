/**
 * 法律页内容（Terms of Service / Privacy Policy）。
 *
 * 事实来源与 About 页一致（landing.mjs 的 ABOUT_PAGE）：一人运营
 * （limer，独立全栈开发者）、22 种声音、18 段真实录音 + FluidR3
 * 采样（CC BY 3.0）+ 浏览器实时合成、三包一次性价格、无订阅、
 * 医疗免责。内容按 Waffo Pancake 的商家审核清单写：
 * - ToS 模板（docs.waffo.ai/mor/account-reviews/tos）：第 1–3、8、
 *   10–16 节为通用节；计费按一次性买断写（无 V1 订阅 / V2 点数 /
 *   V3 混合）；第 11 节点名 Waffo Pancake 为支付处理方；第 14 节
 *   为可选，写明运营者为个人、不编造公司地址与管辖地。
 * - Privacy 模板（docs.waffo.ai/mor/account-reviews/privacy-policy）：
 *   14 节；只写实际收集的数据；卡号不经本站；Waffo Pancake 为
 *   PCI-DSS 处理方；保留期给数字；权利 30 天内答复；变更 15 天。
 * - 审核清单（docs.waffo.ai/mor/account-reviews）：ToS 须含产品
 *   描述、价格与计费周期、退款与取消政策、免责与违规/停用条款；
 *   Privacy 须含收集什么、如何使用与存储、是否与第三方共享、
 *   用户数据权利；法律链接须在页脚、无登录可打开；客服邮箱须
 *   真实、已监控，且与提交审核的联系邮箱一致。
 *
 * 运营者：Zhu Weiye（朱伟晔），个人开发者，无公司。联系邮箱统一
 * 用 weiyezhu180@gmail.com（唯一真实且已监控的地址；ToS 模板
 * 第 16 节的建议：能可靠保证一个渠道，就全部填它）。
 */

/** 运营者（ToS 模板第 1 节要求个人须给法定姓名，品牌名不够）。 */
export const LEGAL_OPERATOR = {
  nameEn: 'Zhu Weiye',
  nameZh: '朱伟晔',
  email: 'weiyezhu180@gmail.com',
};

/** 两页的更新日期（同一天；含“最后更新”前缀，组件直接渲染）。 */
export const LEGAL_UPDATED = {
  en: 'Last updated: 13 November 2026',
  zh: '最后更新：2026年11月13日',
};

export const LEGAL_KEYS = ['terms', 'privacy'];

/**
 * 法律页内容结构：与 AboutPage / LandingCopy 同款——seo + content，
 * content[locale] = { h1, lead, updated, sections: [{ h2, body: [段落], list?: [条目] }] }。
 * body 段落与 list 条目均为纯字符串；组件只负责渲染，不拼文案。
 */
export const TERMS_PAGE = {
  seo: {
    en: {
      title: 'Terms of Service · Sound Cocktail',
      description:
        'Terms of Service for Sound Cocktail — a free ambient sound mixer by one independent developer. One-time sound packs, no subscription, 7-day refunds, and the rules for using the site.',
      ogTitle: 'Terms of Service · Sound Cocktail',
      ogDescription:
        'The rules for using Sound Cocktail: one-time packs, no subscription, refunds within 7 days, and acceptable use.',
    },
    zh: {
      title: '服务条款 · Sound Cocktail',
      description:
        'Sound Cocktail 服务条款——一个独立开发者做的免费环境音混音器。一次性买断声音包、无订阅、7 天内可退款，以及使用本站的规则。',
      ogTitle: '服务条款 · Sound Cocktail',
      ogDescription: '使用 Sound Cocktail 的规则：一次性买断、无订阅、7 天内可退款，以及可接受使用范围。',
    },
  },
  content: {
    en: {
      h1: 'Terms of Service',
      lead: 'These Terms govern your use of Sound Cocktail — made by one person, Zhu Weiye, an independent full-stack developer, not a company. By using the site or buying a pack, you agree to these Terms; if you do not agree, please do not use the Service.',
      sections: [
        {
          h2: '1. Who we are',
          body: [
            'Sound Cocktail (soundcocktail.app) is operated by Zhu Weiye, an individual developer — there is no company behind the site. These Terms are the agreement between you and the operator; “Service” means the Sound Cocktail website and everything on it.',
          ],
        },
        {
          h2: '2. What the Service is',
          body: [
            'Sound Cocktail is a free ambient sound mixer. Mix 22 sounds — rain, fire, café voices, piano and more — into a cup and save it. Mixing is free, with sessions of up to 10 minutes each.',
            'Three one-time packs unlock extra channels: Focus ($1.99 / ¥6), Sleep ($2.99 / ¥9) and Rain Night ($3.99 / ¥12). No subscription; an account is only needed to buy a pack. Packs are virtual goods delivered instantly: when your payment succeeds, the pack is unlocked in your account.',
          ],
        },
        {
          h2: '3. Accounts',
          body: [
            'You must be at least 13 years old to create an account. If you are under the age of majority where you live, you may use the Service only with a parent or guardian’s permission.',
            'Register with accurate information, keep your password secret, and do not share your account. You are responsible for everything that happens under it. If someone else has used your account, tell us at once at weiyezhu180@gmail.com.',
          ],
        },
        {
          h2: '4. Packs, prices and payment',
          body: [
            'Outside China you pay in US dollars through Waffo Pancake, our merchant of record — by card (Visa, Mastercard), Apple Pay, Google Pay, WeChat Pay or Alipay. In China you pay in yuan through Alipay. The price shown at checkout is the price you pay; taxes are handled by the payment processor.',
            'Every purchase is a one-time charge — no recurring payments, nothing to cancel. We never see or store your card details — payment is handled entirely by Waffo Pancake or Alipay. Delivery is instant: a pack is unlocked as soon as the payment succeeds; if it does not unlock, contact support.',
          ],
        },
        {
          h2: '5. Refunds',
          body: [
            'Because the packs are delivered instantly, please try the free sounds first. If something goes wrong, contact us at weiyezhu180@gmail.com within 7 days and we will give you a full refund if the pack did not unlock, if you were charged twice, or if you are not satisfied.',
            'Refunds are processed through our payment processor and usually appear on your statement within 5–10 business days. After 7 days we cannot refund a purchase, and a purchase that has already been refunded cannot be refunded again.',
          ],
        },
        {
          h2: '6. Billing disputes',
          body: [
            'If you have a problem with a charge, contact us first at weiyezhu180@gmail.com before going to your bank, with your order number and what happened. We will look into it promptly.',
          ],
        },
        {
          h2: '7. Acceptable use',
          body: [
            'Use the Service for personal listening. You must not:',
          ],
          list: [
            'Resell, redistribute or give away the sounds or the packs.',
            'Download the audio files in bulk or scrape the site.',
            'Use automated tools to hammer the service.',
            'Share or sell your account, or try to unlock packs without paying.',
            'Use the Service for anything illegal.',
          ],
        },
        {
          h2: '8. Intellectual property',
          body: [
            '18 sounds are real field recordings, each credited in the Sources section of the mixer; piano, guitar and harp use note samples from Frank Wen’s FluidR3 GM soundfont (CC BY 3.0); the wooden fish and drum are synthesized live in your browser.',
            'You may listen to the sounds for yourself, but you may not copy, redistribute, re-upload or commercially use them. The mixes you make and the names you give them are yours; we store them only so we can show them back to you.',
          ],
        },
        {
          h2: '9. Your data and privacy',
          body: [
            'We collect as little as possible: your email and a hashed password, your orders and packs, and the mixes you save. Card details never touch our servers — Waffo Pancake is our payment processor and handles payments under PCI-DSS.',
            'Our Privacy Policy explains what we collect, how we use it and how to delete it, and you can ask us to delete your account and data at any time.',
          ],
        },
        {
          h2: '10. Disclaimers and liability',
          body: [
            'The Service is provided “as is”, without warranties of any kind. We do not promise it will always be available or error-free.',
            'Sound Cocktail is not a medical product. It does not treat insomnia, anxiety or tinnitus, and it is not a substitute for medical advice — if sleep problems persist, talk to a doctor.',
            'To the extent the law allows, our total liability to you for any claim is limited to the amount you paid us in the 12 months before the claim. Nothing in these Terms limits liability that cannot be limited by law.',
          ],
        },
        {
          h2: '11. Ending your account',
          body: [
            'You can stop using the Service at any time. To delete your account, email us at weiyezhu180@gmail.com and we will delete your account and personal data within 90 days.',
            'Deleting your account also removes access to the packs you bought, and we cannot restore them afterwards. We may suspend or close an account that breaks these Terms or abuses the Service.',
          ],
        },
        {
          h2: '12. Governing law',
          body: [
            'If we disagree, please email us first. These Terms are governed by the laws of the jurisdiction where the operator is based; if a dispute cannot be resolved by email, it may be brought in the courts of that jurisdiction.',
          ],
        },
        {
          h2: '13. Changes to these Terms',
          body: [
            'We may update these Terms from time to time. Updates will be posted here with a new date, and take effect 14 days after posting. If you keep using the Service after that, you accept the new Terms.',
          ],
        },
        {
          h2: '14. Contact',
          body: [
            'For support, billing questions, security reports or anything about these Terms, email weiyezhu180@gmail.com. It is monitored by the operator.',
          ],
        },
      ],
    },
    zh: {
      h1: '服务条款',
      lead: '本条款约束您对 Sound Cocktail 的使用。Sound Cocktail 是一个小网页应用，作者只有一个人——朱伟晔，一名独立全栈开发者——不是一家公司。使用本站或购买声音包，即表示您同意本条款；如果不同意，请不要使用本服务。',
      sections: [
        {
          h2: '一、我们是谁',
          body: [
            'Sound Cocktail（soundcocktail.app）由朱伟晔运营，他是一名个人开发者。本站背后没有公司。本条款是您与运营者之间的协议。本条款中所说的“服务”指 Sound Cocktail 网站及其全部内容。',
          ],
        },
        {
          h2: '二、服务是什么',
          body: [
            'Sound Cocktail 是一款免费的环境音混音器。您可以把 22 种声音——雨声、篝火、咖啡馆人声、钢琴等等——调成一杯存下来。混音免费，每次最多 10 分钟。',
            '三个一次性买断的声音包解锁更多通道：专注包（$1.99 / ¥6）、助眠包（$2.99 / ¥9）、雨夜包（$3.99 / ¥12）。没有订阅，没有重复扣费，调音不用注册；账号只在买包时才需要。声音包是虚拟商品，付款成功后立刻交付：包会在您的账号里马上解锁。',
          ],
        },
        {
          h2: '三、账号',
          body: [
            '注册账号须年满 13 岁。如果您未达到所在地的成年年龄，须在父母或监护人同意后才能使用本服务。',
            '注册时请提供真实信息，妥善保管密码，不要与他人共享账号。账号下发生的一切由您负责。如果怀疑账号被他人使用，请立即写信到 weiyezhu180@gmail.com，我们会帮您处理。',
          ],
        },
        {
          h2: '四、声音包、价格与付款',
          body: [
            '价格在付款前就标在站上：专注包 $1.99 / ¥6，助眠包 $2.99 / ¥9，雨夜包 $3.99 / ¥12。中国以外地区用美元付款，走 Waffo Pancake（我们的收款代理）——支持银行卡（Visa、Mastercard）、Apple Pay、Google Pay、微信支付或支付宝。中国大陆地区用人民币走支付宝付款。',
            '结账时显示的价格就是实付价格，税费由支付处理方处理。每笔购买都是一次性扣费。我们绝不会要求您授权重复扣费，也没有什么需要取消的订阅。',
            '我们看不到、也不保存您的银行卡信息——付款全程由 Waffo Pancake 或支付宝处理。交付是即时的：付款成功后，包会在您的账号里马上解锁。如果没有解锁，请联系客服，我们会处理。',
          ],
        },
        {
          h2: '五、退款',
          body: [
            '因为声音包是即时交付的，请先试用免费声音，确认混音器是您想要的再买。如果出了问题，我们会负责：购买后 7 天内写信到 weiyezhu180@gmail.com，如果包没有解锁、被重复扣费，或者您对包不满意，我们会全额退款。',
            '退款由支付处理方执行，通常在 5–10 个工作日内回到您的账上。超过 7 天的购买无法退款；已经退过款的购买也不能再次退款。',
          ],
        },
        {
          h2: '六、账单争议',
          body: [
            '如果扣费有问题，请先联系我们（weiyezhu180@gmail.com），不要先去找银行。请告诉我们订单号和事情经过，我们会尽快处理。先找银行会让双方都更慢。',
          ],
        },
        {
          h2: '七、可接受使用',
          body: [
            '本服务仅供个人收听。您不得：',
          ],
          list: [
            '转售、再分发或赠送本站的声音或声音包。',
            '批量下载音频文件或爬取本站。',
            '用自动化工具大量访问本站。',
            '共享或出售账号，或绕过付费解锁声音包。',
            '将本服务用于任何违法用途。',
          ],
        },
        {
          h2: '八、知识产权',
          body: [
            '声音与本站是运营者的作品。18 种声音是真实的野外录音，每一段的作者、来源和授权都标在调音台的音源清单里。钢琴、吉他和竖琴用的是 Frank Wen 的 FluidR3 GM 音色库采样（CC BY 3.0）。木鱼和手鼓由浏览器实时合成。设计、调音台和代码都属于运营者。',
            '您可以自己收听这些声音，但不得复制、再分发、重新上传或商业使用。您调出的配方和起的名字属于您；我们保存它们只是为了再展示给您。',
          ],
        },
        {
          h2: '九、您的数据与隐私',
          body: [
            '我们收集的数据越少越好：您的邮箱和加密后的密码（绝不是明文密码）、您的订单和拥有的包、以及您保存的配方。银行卡信息绝不会经过我们的服务器——Waffo Pancake 是我们的支付处理方，按 PCI-DSS 处理付款。',
            '我们的隐私政策说明了我们收集什么、怎么用、怎么删除；您可以随时要求我们删除您的账号和数据。',
          ],
        },
        {
          h2: '十、免责与责任限制',
          body: [
            '本服务按“现状”提供，不作任何保证。我们不承诺它永远可用、永远不出错。',
            'Sound Cocktail 不是医疗产品，不治疗失眠、焦虑或耳鸣，也不能代替医生的建议——睡眠问题持续存在的话，请去看医生。',
            '在法律允许的范围内，我们对任何索赔的总责任不超过您在索赔前 12 个月内向我们支付的金额。本条款不限制法律规定不得限制的责任。',
          ],
        },
        {
          h2: '十一、结束账号',
          body: [
            '您可以随时停止使用本服务。要删除账号，请写信到 weiyezhu180@gmail.com，我们会在 90 天内删除您的账号和个人数据。',
            '删除账号后，您购买的包也无法再使用，而且无法恢复，请确认后再申请。如果账号违反本条款或滥用服务，我们可能暂停或关闭它。',
          ],
        },
        {
          h2: '十二、适用法律',
          body: [
            '如果我们之间有分歧，请先写邮件沟通——大多数问题都能这样解决。本条款适用运营者所在地的法律。如果邮件无法解决争议，可向该地的法院提起。',
          ],
        },
        {
          h2: '十三、条款变更',
          body: [
            '我们可能不时更新本条款。更新时会在本页发布新版本并更新上方的日期，变更在发布 14 天后生效。此后继续使用本服务，即表示您接受新条款。',
          ],
        },
        {
          h2: '十四、联系方式',
          body: [
            '客服、账单问题、安全报告或任何关于本条款的事，请写信到 weiyezhu180@gmail.com。这是唯一的联系渠道，由运营者本人查看。',
          ],
        },
      ],
    },
  },
};

export const PRIVACY_PAGE = {
  seo: {
    en: {
      title: 'Privacy Policy · Sound Cocktail',
      description:
        'Privacy Policy for Sound Cocktail — what we collect (email, orders, saved mixes), how we use it, who processes payments (Waffo Pancake, Alipay), and your data rights.',
      ogTitle: 'Privacy Policy · Sound Cocktail',
      ogDescription:
        'What Sound Cocktail collects, how it is used, and your rights — plain language, no tracking, no data sales.',
    },
    zh: {
      title: '隐私政策 · Sound Cocktail',
      description:
        'Sound Cocktail 隐私政策——我们收集什么（邮箱、订单、保存的配方）、怎么用、谁处理付款（Waffo Pancake、支付宝），以及您的数据权利。',
      ogTitle: '隐私政策 · Sound Cocktail',
      ogDescription: 'Sound Cocktail 收集什么、怎么用、您有什么权利——直白写，没有追踪，不卖数据。',
    },
  },
  content: {
    en: {
      h1: 'Privacy Policy',
      lead: 'Sound Cocktail is made by one person, and it collects as little as possible. This policy explains what we collect, why, who else touches it, and what you can ask us to do with it.',
      sections: [
        {
          h2: '1. Data controller',
          body: [
            'The data controller is Zhu Weiye, an individual developer operating Sound Cocktail. You can reach us at weiyezhu180@gmail.com. There is no company and no data protection officer — the scale and sensitivity of the processing do not require one.',
          ],
        },
        {
          h2: '2. What we collect',
          body: [
            'We collect only what the Service needs to work:',
            'We do not collect card numbers or any payment credentials. Payments go to Waffo Pancake (outside China) or Alipay (in China), and your card details never touch our servers.',
          ],
          list: [
            'Account information: your email address and a hashed password. We never store your password in plain text, and we never see it.',
            'Google sign-in: if you sign in with Google, we receive your name, email address and profile photo from Google. We do not store any Google tokens.',
            'Orders and entitlements: which packs you bought, the price and currency, the order number, the payment status and the date — so we can unlock your packs and show them to you.',
            'Your mixes: the recipes you save and the names you give them.',
            'Preferences: your language choice, stored in your browser.',
          ],
        },
        {
          h2: '3. How we use it',
          body: [
            'We use your information only to run the Service: to let you mix sounds and keep your account (contract); to take payment and unlock your packs (contract); to keep you signed in (contract); to prevent abuse and fraud (legitimate interest); to answer your support messages (contract); and to keep the transaction records the law requires (legal obligation).',
            'We do not send marketing emails, and we do not use your data for advertising.',
          ],
        },
        {
          h2: '4. Cookies and local storage',
          body: [
            'We use one strictly necessary cookie: sc_session keeps you signed in for 30 days. It is HttpOnly, Secure and SameSite=Lax.',
            'Your browser also stores two things locally: your language choice (sc-locale) and the mixes you save (sound-lab.recipes). That data stays on your device and you can clear it at any time.',
            'We run no analytics, no advertising trackers and no third-party marketing pixels.',
          ],
        },
        {
          h2: '5. Sharing',
          body: [
            'We do not sell your personal information, and we do not share it except with the processors below, who only use it to provide their service:',
          ],
          list: [
            'Cloudflare — hosting and storage. Our order and entitlement records live in Cloudflare KV.',
            'Waffo Pancake — overseas payments, our PCI-DSS payment processor. Card data never touches our servers.',
            'Alipay — payments in China.',
            'Google — sign-in only, when you choose it.',
          ],
        },
        {
          h2: '6. Security',
          body: [
            'Passwords are hashed with PBKDF2 and never stored in plain text. Sessions use a secure HttpOnly cookie. Access to your data is limited to the operator.',
            'If we discover a data breach that affects you, we will tell you and the relevant authority within 72 hours.',
          ],
        },
        {
          h2: '7. Retention',
          body: [
            'We keep your account and order data while your account is active. If you delete your account, we erase your personal data within 90 days.',
            'Transaction records are kept for as long as tax and accounting law requires, and no longer than 7 years after the transaction. Data in your browser’s local storage is yours to clear at any time.',
          ],
        },
        {
          h2: '8. Your rights',
          body: [
            'You have the right to access your data, correct it, delete it, restrict how we use it, take it with you (portability), object to our use of it, withdraw consent where consent was the basis, and not be subject to decisions made only by automated processing.',
            'To exercise any of these rights, email weiyezhu180@gmail.com. We will answer within 30 calendar days. You also have the right to complain to your local data protection authority.',
          ],
        },
        {
          h2: '9. Marketing',
          body: [
            'We do not send marketing emails or newsletters. The only emails you will get from us are the ones you ask for: order receipts, password resets and replies to your support messages.',
          ],
        },
        {
          h2: '10. International transfers',
          body: [
            'Your data is stored and processed on Cloudflare’s global network and by Waffo, Alipay and Google, which operate across borders. Where your data leaves your region, the transfer relies on the standard contractual clauses or other safeguards those processors provide.',
          ],
        },
        {
          h2: '11. Children',
          body: [
            'Sound Cocktail is not directed at children under 13, and we do not knowingly collect personal information from them. You must be at least 13 to create an account. If you believe a child has given us personal information, email us and we will delete it.',
          ],
        },
        {
          h2: '12. Third-party services',
          body: [
            'Checkout runs on Waffo Pancake or Alipay, and Google sign-in runs on Google. Those services have their own privacy policies, and we are not responsible for their websites or their practices.',
          ],
        },
        {
          h2: '13. Changes to this policy',
          body: [
            'We may update this policy from time to time. When we do, we will post the new version here and update the date above; the changes take effect 15 days after posting. If you keep using the Service after that, you accept the new policy.',
          ],
        },
        {
          h2: '14. Contact',
          body: [
            'For any privacy question, or to exercise your data rights, email weiyezhu180@gmail.com. That is where rights requests land, and it is monitored by the operator.',
          ],
        },
      ],
    },
    zh: {
      h1: '隐私政策',
      lead: 'Sound Cocktail 是一个人的作品，收集的数据越少越好。本政策说明我们收集什么、为什么收集、还有谁会接触到这些数据，以及您可以要求我们做什么。',
      sections: [
        {
          h2: '一、数据控制者',
          body: [
            '数据控制者是朱伟晔，一名运营 Sound Cocktail 的个人开发者。联系邮箱：weiyezhu180@gmail.com。本站没有公司，也没有数据保护官——处理数据的规模和敏感程度不需要设这个职位。',
          ],
        },
        {
          h2: '二、我们收集什么',
          body: [
            '我们只收集服务正常运行需要的数据：',
            '我们不收集银行卡号或任何付款凭证。付款交给 Waffo Pancake（中国以外地区）或支付宝（中国大陆地区），您的银行卡信息绝不会经过我们的服务器。',
          ],
          list: [
            '账号信息：您的邮箱地址和加密后的密码。我们绝不以明文保存密码，也看不到您的密码。',
            'Google 登录：如果您用 Google 登录，我们会从 Google 收到您的姓名、邮箱地址和头像。我们不保存任何 Google 令牌。',
            '订单与权益：您买了哪个包、价格与币种、订单号、付款状态和日期——用来给您解锁包、展示给您看。',
            '您的配方：您保存的配方和起的名字。',
            '偏好设置：您的语言选择，存在浏览器里。',
          ],
        },
        {
          h2: '三、我们怎么用',
          body: [
            '我们只把您的信息用于运行本服务：让您调音、维持账号（履行合同）；收款并解锁您的包（履行合同）；保持登录状态（履行合同）；防止滥用与欺诈（正当利益）；回复您的客服消息（履行合同）；以及保存法律要求的交易记录（法定义务）。',
            '我们不发营销邮件，也不把您的数据用于广告。',
          ],
        },
        {
          h2: '四、Cookie 与本地存储',
          body: [
            '我们只用一个必需的 Cookie：sc_session 让您保持登录 30 天。它是 HttpOnly、Secure、SameSite=Lax。',
            '浏览器还会本地存两样东西：您的语言选择（sc-locale）和您保存的配方（sound-lab.recipes）。这些数据只在您的设备上，随时可以清除。',
            '我们不跑任何统计分析，没有广告追踪器，也没有第三方营销像素。',
          ],
        },
        {
          h2: '五、共享',
          body: [
            '我们不出售您的个人信息，除以下处理方外也不与他人共享；他们只把数据用于提供各自的服务：',
          ],
          list: [
            'Cloudflare——托管与存储。我们的订单与权益记录存在 Cloudflare KV 里。',
            'Waffo Pancake——中国以外地区的付款，我们的 PCI-DSS 支付处理方。银行卡数据绝不会经过我们的服务器。',
            '支付宝——中国大陆地区的付款。',
            'Google——仅在您选择时用于登录。',
          ],
        },
        {
          h2: '六、安全',
          body: [
            '密码用 PBKDF2 加密保存，绝不明文存储。会话使用安全的 HttpOnly Cookie。只有运营者本人能接触到您的数据。',
            '如果发现影响您的数据泄露，我们会在 72 小时内通知您和相关监管机构。',
          ],
        },
        {
          h2: '七、保留期限',
          body: [
            '账号有效期间，我们保存您的账号与订单数据。删除账号后，我们会在 90 天内删除您的个人数据。',
            '交易记录按税务与会计法律的要求保存，且不超过交易后 7 年。浏览器本地存储的数据由您自己随时清除。',
          ],
        },
        {
          h2: '八、您的权利',
          body: [
            '您有权访问、更正、删除自己的数据，限制我们对数据的使用，带走数据（可携带权），反对我们使用数据，在以同意为依据时撤回同意，以及不受仅由自动化处理作出的决定约束。',
            '要行使以上任何权利，请写信到 weiyezhu180@gmail.com，我们会在 30 个自然日内答复。您也有权向当地的数据保护机构投诉。',
          ],
        },
        {
          h2: '九、营销',
          body: [
            '我们不发营销邮件或订阅通讯。您收到的邮件只会是您主动要的那些：订单收据、密码重置，以及对您客服消息的回复。',
          ],
        },
        {
          h2: '十、跨境传输',
          body: [
            '您的数据存储和处理在 Cloudflare 的全球网络以及 Waffo、支付宝和 Google 进行，这些服务都在跨境运营。如果您的数据离开您所在的地区，传输依靠这些处理方提供的标准合同条款或其他保障措施。',
          ],
        },
        {
          h2: '十一、儿童',
          body: [
            'Sound Cocktail 不面向 13 岁以下儿童，我们也不会有意收集他们的个人信息。注册账号须年满 13 岁。如果您认为有儿童向我们提供了个人信息，请写信告诉我们，我们会删除它。',
          ],
        },
        {
          h2: '十二、第三方服务',
          body: [
            '结账在 Waffo Pancake 或支付宝进行，Google 登录在 Google 进行。这些服务各有自己的隐私政策；我们不对它们的网站或做法负责。',
          ],
        },
        {
          h2: '十三、政策变更',
          body: [
            '我们可能不时更新本政策。更新时会在本页发布新版本并更新上方的日期，变更在发布 15 天后生效。此后继续使用本服务，即表示您接受新政策。',
          ],
        },
        {
          h2: '十四、联系方式',
          body: [
            '任何隐私问题，或要行使您的数据权利，请写信到 weiyezhu180@gmail.com。权利请求都发到这里，由运营者本人查看。',
          ],
        },
      ],
    },
  },
};
