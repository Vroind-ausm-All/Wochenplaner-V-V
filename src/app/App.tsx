import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useEffect } from 'react';
import { DndProvider, TrashZone } from '../dnd/Dnd';
import { CalendarPage, PickActions } from '../features/calendar/CalendarPage';
import { EventSheet, SeriesDialog } from '../features/calendar/EventSheet';
import { CompanionPage } from '../features/companion/Companion';
import { FamilyPage } from '../features/family/FamilyPage';
import { HomePage } from '../features/home/HomePage';
import { MealPlanner } from '../features/meals/MealPlanner';
import { RecipeDetail } from '../features/meals/RecipeDetail';
import { SettingsPage } from '../features/settings/SettingsPage';
import { ShoppingPage } from '../features/shopping/ShoppingPage';
import { TasksPage } from '../features/tasks/TasksPage';
import { ExternalSheet } from '../features/external/ExternalUi';
import { ReminderCenter } from '../features/reminders/ReminderCenter';
import { useExternalUpdater } from '../features/external/useExternal';
import { useWeatherUpdater } from '../features/weather/useWeather';
import { WeatherNow } from '../features/weather/WeatherPanel';
import { useNow } from '../lib/useClock';
import { useStore, type View } from '../store/store';
import { discoverServer } from '../store/sync';
import { Toast } from '../ui/Toast';
import { ServerLoginSheet, SyncBadge } from '../features/sync/SyncUi';
import { useKiosk } from './useKiosk';
import './app.css';

const NAV: { id: View; icon: string; label: string }[] = [
  { id: 'home', icon: '⌂', label: 'Heute' },
  { id: 'calendar', icon: '▦', label: 'Kalender' },
  { id: 'meals', icon: '♨', label: 'Essen' },
  { id: 'companion', icon: '♡', label: 'Wir-Zeit' },
  { id: 'shopping', icon: '🛒', label: 'Einkauf' },
  { id: 'tasks', icon: '✓', label: 'Aufgaben' },
  { id: 'family', icon: '▧', label: 'Familie' },
  { id: 'settings', icon: '⚙', label: 'Einstellungen' },
];

const PAGES: Record<View, () => React.ReactElement> = {
  home: HomePage,
  calendar: CalendarPage,
  meals: MealPlanner,
  companion: CompanionPage,
  shopping: ShoppingPage,
  tasks: TasksPage,
  family: FamilyPage,
  settings: SettingsPage,
};

export function App() {
  const view = useStore((s) => s.view);
  const setUi = useStore((s) => s.setUi);
  const recipeOpen = useStore((s) => s.recipeOpen);
  const openItems = useStore((s) => s.data.shopping.filter((x) => !x.done).length);
  const now = useNow();
  const kiosk = useKiosk();
  useWeatherUpdater();
  useExternalUpdater();
  useEffect(() => void discoverServer(), []);
  const Page = PAGES[view];

  return (
    <MotionConfig reducedMotion="user">
      <DndProvider>
        <div className={`app ${kiosk.dimmed ? 'is-dimmed' : ''} ${view === 'calendar' ? 'is-full' : ''}`}>
          <nav className="rail" aria-label="Bereiche">
            <div className="brand">
              WIR.<small>Raum für das, was zählt</small>
            </div>
            {NAV.map((n) => (
              <button key={n.id} className="rail__btn" aria-current={view === n.id ? 'page' : undefined} onClick={() => setUi({ view: n.id })}>
                {view === n.id && <motion.span layoutId="rail-active" className="rail__active" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <span className="rail__icon">{n.icon}</span>
                <span className="rail__label">{n.label}</span>
                {n.id === 'shopping' && openItems > 0 && <span className="rail__count">{openItems}</span>}
              </button>
            ))}
            <div className="rail__foot small">
              <SyncBadge />
            </div>
          </nav>
          <div className="main">
            <header className="topbar">
              <div className="topbar__title">
                <span className="eyebrow">Unser Familienzuhause</span>
              </div>
              <span className="grow" />
              <WeatherNow />
              <span className="topbar__time">{now}</span>
              <button className="btn icon" onClick={kiosk.toggleNight} aria-label="Tag/Nacht umschalten" title="Tag/Nacht">
                {kiosk.night ? '☀' : '☾'}
              </button>
              <button className="btn icon" onClick={() => kiosk.setSleeping(true)} aria-label="Bildschirm dunkel" title="Bildschirm dunkel">
                ◼
              </button>
            </header>
            <main className="content">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={view} className="page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <Page />
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
        <EventSheet />
        <SeriesDialog />
        <ExternalSheet />
        <RecipeDetail key={recipeOpen ?? 'none'} />
        <PickActions />
        <TrashZone />
        <Toast />
        <ServerLoginSheet />
        <ReminderCenter />
        <AnimatePresence>
          {(kiosk.sleeping || kiosk.dimmed) && (
            <motion.div
              className={`sleep ${kiosk.sleeping ? 'is-black' : ''}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onPointerDown={kiosk.wake}
            >
              {kiosk.sleeping && <span>Tippen zum Aufwecken</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </DndProvider>
    </MotionConfig>
  );
}
