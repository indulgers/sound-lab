/**
 * 首页（/en、/zh）：只有 Hero + 调音台。
 *
 * 旧版页内锚点兼容：有人带着 #recipes / #plus / #mine / #sources
 * 打开首页（旧书签、旧外链），直接跳到对应的新页面（replace，
 * 不留一跳历史）。#mixer 本就是首页，不用跳。
 */
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import MixerSection from './MixerSection.jsx';
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
  return <MixerSection />;
}
