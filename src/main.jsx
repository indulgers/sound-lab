import { memo, useCallback, useLayoutEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Outlet, RouterProvider, createRootRoute, createRoute, createRouter, useRouter, useRouterState } from '@tanstack/react-router';
import SoundLabView from './SoundLabView.jsx';
import CheckoutView from './CheckoutView.jsx';
import { RECIPES, SOUNDS } from './catalog.mjs';
import { mountSoundLab } from './sound-lab.mjs';
import { mountVisualEffects } from './visual-effects.mjs';
import './styles.css';

const View = memo(SoundLabView);

function SoundLab() {
  const router = useRouter();
  const focusRoute = useRouterState({ select: state => state.location.pathname.replace(/\/$/, '') === '/focus' });
  const controller = useRef(null);
  const chooseScene = useCallback(recipe => controller.current?.chooseScene(recipe), []);
  const showPremium = useCallback(name => controller.current?.showPremium(name), []);

  useLayoutEffect(() => {
    const effects = mountVisualEffects();
    const lab = mountSoundLab({
      onMixChange: effects.onMixChange,
      onFocusChange(open) {
        const path = router.state.location.pathname;
        const to = open ? '/focus' : '/';
        if (path.replace(/\/$/, '') !== to.replace(/\/$/, '')) {
          void router.navigate({ to, resetScroll: false });
        }
      },
    });
    controller.current = lab;
    return () => {
      lab.dispose();
      effects.dispose();
      controller.current = null;
    };
  }, [router]);

  useLayoutEffect(() => {
    controller.current?.setFocus(focusRoute);
  }, [focusRoute]);

  return <><View recipes={RECIPES} sounds={SOUNDS} onChooseScene={chooseScene} onShowPremium={showPremium} /><Outlet /></>;
}

const rootRoute = createRootRoute({ component: SoundLab });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/' });
const focusRoute = createRoute({ getParentRoute: () => rootRoute, path: '/focus' });
const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  validateSearch: (search) => ({ pack: typeof search.pack === 'string' ? search.pack : '' }),
  component: CheckoutView,
});
const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute, focusRoute, checkoutRoute]) });

createRoot(document.getElementById('root')).render(<RouterProvider router={router} />);
