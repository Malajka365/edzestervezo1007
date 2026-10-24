// A Kezdőlap widgetjeinek leíró adatai (komponens nélkül, hogy a layout-logika
// tisztán tesztelhető legyen; a komponens-hozzárendelés: dashboardWidgets.js).
//
// type: stabil azonosító (a mentett elrendezésben is ez szerepel)
// module_key: jogosultsági modul (null = mindig látható; a tartalom maga szűr)
// defaultSize / minSize: [szélesség 1–4 oszlop, magasság 1–3 sor]
// settings: [{ key, label, options: [[érték, felirat]] | 'players' | 'exercises' }]
//   (a 'players'/'exercises' opciókat a beállító panel tölti fel)
// allowMultiple: többször is felvehető; comingSoon: a katalógusban letiltva látszik
import {
  Timer,
  ShieldCheck,
  Trophy,
  CalendarDays,
  Bell,
  CalendarRange,
  UserCheck,
  HeartPulse,
  Activity,
  Medal,
  TrendingUp,
  Gauge,
  BarChart3,
  Users,
  Zap,
  Star,
  StickyNote,
  Smile,
  ClipboardPlus,
  CalendarClock,
} from 'lucide-react'

export const WIDGET_CATEGORIES = ['Áttekintés', 'Csapat és egészség', 'Teljesítmény', 'Eszközök']

const w = (type, def) => ({
  type,
  settings: [],
  defaultSettings: {},
  allowMultiple: false,
  comingSoon: false,
  ...def,
})

export const WIDGET_CATALOG = {
  today_session: w('today_session', {
    name: 'Mai edzés', icon: Timer, category: 'Áttekintés', module_key: 'calendar',
    description: 'A mai (vagy következő) edzés időpontja, helye és blokkjai, jelenlét-felvétellel.',
    defaultSize: [2, 2], minSize: [1, 1],
    settings: [{ key: 'detail', label: 'Mit mutasson', options: [['blocks', 'Blokkok listája'], ['compact', 'Csak időpont és hely']] }],
    defaultSettings: { detail: 'blocks' },
  }),
  availability: w('availability', {
    name: 'Ki bevethető?', icon: ShieldCheck, category: 'Csapat és egészség', module_key: 'players',
    description: 'Bevethető, korlátozott és sérült játékosok száma és listája.',
    defaultSize: [1, 2], minSize: [1, 1],
    settings: [{ key: 'show', label: 'Lista', options: [['issues', 'Csak korlátozott és sérült'], ['all', 'Mindenki']] }],
    defaultSettings: { show: 'issues' },
  }),
  next_match: w('next_match', {
    name: 'Következő mérkőzés', icon: Trophy, category: 'Áttekintés', module_key: 'matches',
    description: 'Ellenfél, helyszín és visszaszámlálás; kérésre az előző eredmény.',
    defaultSize: [1, 1], minSize: [1, 1],
    settings: [{ key: 'last', label: 'Előző eredmény', options: [['no', 'Ne mutassa'], ['yes', 'Mutassa']] }],
    defaultSettings: { last: 'no' },
  }),
  upcoming_week: w('upcoming_week', {
    name: 'Következő napok', icon: CalendarDays, category: 'Áttekintés', module_key: 'calendar',
    description: 'Edzések és mérkőzések időrendben.',
    defaultSize: [2, 2], minSize: [1, 1],
    settings: [
      { key: 'days', label: 'Időszak', options: [['7', '7 nap'], ['14', '14 nap']] },
      { key: 'types', label: 'Típusok', options: [['all', 'Minden'], ['match', 'Csak mérkőzés'], ['train', 'Csak edzés']] },
    ],
    defaultSettings: { days: '7', types: 'all' },
  }),
  todos: w('todos', {
    name: 'Teendők', icon: Bell, category: 'Áttekintés', module_key: null,
    description: 'Ami figyelmet kér: hiányzó mérés, fel nem vett jelenlét, visszatérés, ciklusváltás.',
    defaultSize: [2, 1], minSize: [1, 1],
    settings: [{ key: 'src', label: 'Források', options: [['all', 'Minden'], ['perf', 'Csak mérés'], ['health', 'Csak egészség']] }],
    defaultSettings: { src: 'all' },
  }),
  season_progress: w('season_progress', {
    name: 'Szezon', icon: CalendarRange, category: 'Áttekintés', module_key: 'macrocycle',
    description: 'Hol tart a szezonterv: aktuális mezociklus és hátralévő hetek.',
    defaultSize: [1, 1], minSize: [1, 1],
  }),
  weekly_attendance: w('weekly_attendance', {
    name: 'Heti jelenlét', icon: UserCheck, category: 'Csapat és egészség', module_key: 'attendance',
    description: 'Jelenléti arány az időszakra, a legtöbbet hiányzókkal.',
    defaultSize: [1, 1], minSize: [1, 1],
    settings: [{ key: 'period', label: 'Időszak', options: [['week', 'Ez a hét'], ['month', 'Ez a hónap'], ['season', 'Szezon']] }],
    defaultSettings: { period: 'week' },
  }),
  rehab_status: w('rehab_status', {
    name: 'Rehab-státusz', icon: HeartPulse, category: 'Csapat és egészség', module_key: 'rehab',
    description: 'Aktív rehabilitációk áttekintése.',
    defaultSize: [2, 1], minSize: [1, 1],
  }),
  recent_measurements: w('recent_measurements', {
    name: 'Friss mérések', icon: Activity, category: 'Teljesítmény', module_key: 'measurement',
    description: 'A legutóbbi mérések, egyéni csúccsal jelölve.',
    defaultSize: [2, 1], minSize: [1, 1],
    settings: [{ key: 'n', label: 'Sorok száma', options: [['3', '3'], ['5', '5'], ['8', '8']] }],
    defaultSettings: { n: '5' },
  }),
  leaderboard_top3: w('leaderboard_top3', {
    name: 'Ranglista', icon: Medal, category: 'Teljesítmény', module_key: 'stats',
    description: 'A csapat legjobbjai egy választott mutatóban.',
    defaultSize: [1, 2], minSize: [1, 1], allowMultiple: true,
    settings: [
      { key: 'metric', label: 'Mutató', options: [['rel', 'Relatív erő (guggolás)'], ['sq', 'Guggolás 1RM'], ['att', 'Jelenlét']] },
      { key: 'n', label: 'Hány fő', options: [['3', 'Top 3'], ['5', 'Top 5'], ['all', 'Mindenki']] },
    ],
    defaultSettings: { metric: 'rel', n: '3' },
  }),
  measurement_trend: w('measurement_trend', {
    name: 'Mérés-trend', icon: TrendingUp, category: 'Teljesítmény', module_key: 'stats',
    description: 'Egy játékos vagy a csapatátlag alakulása egy gyakorlatban.',
    defaultSize: [2, 2], minSize: [2, 1], allowMultiple: true,
    settings: [
      { key: 'who', label: 'Kit', options: 'players' },
      { key: 'ex', label: 'Gyakorlat', options: 'exercises' },
      { key: 'per', label: 'Időszak', options: [['8', '8 hét'], ['26', 'Fél év'], ['52', 'Egy év']] },
    ],
    defaultSettings: { who: 'team', ex: '', per: '8' },
  }),
  measurement_coverage: w('measurement_coverage', {
    name: 'Mérési lefedettség', icon: Gauge, category: 'Teljesítmény', module_key: 'measurement',
    description: 'Kit mikor mértek utoljára; aki régóta kimaradt, kiemelve.',
    defaultSize: [1, 2], minSize: [1, 1],
    settings: [{ key: 'limit', label: 'Figyelmeztetés', options: [['4', '4 hét után'], ['6', '6 hét után'], ['8', '8 hét után']] }],
    defaultSettings: { limit: '6' },
  }),
  weekly_load: w('weekly_load', {
    name: 'Heti terhelés', icon: BarChart3, category: 'Teljesítmény', module_key: 'macrocycle',
    description: 'A hét tervezett terhelése napokra bontva.',
    defaultSize: [2, 1], minSize: [2, 1],
  }),
  team_overview: w('team_overview', {
    name: 'Csapat-áttekintés', icon: Users, category: 'Csapat és egészség', module_key: 'players',
    description: 'Létszám és posztok.',
    defaultSize: [1, 1], minSize: [1, 1],
  }),
  quick_actions: w('quick_actions', {
    name: 'Gyors műveletek', icon: Zap, category: 'Eszközök', module_key: null,
    description: 'A leggyakoribb műveletek egy kattintásra.',
    defaultSize: [2, 1], minSize: [1, 1],
    settings: [{ key: 'set', label: 'Gombok', options: [['coach', 'Edző: edzés, mérkőzés, jelenlét'], ['fit', 'Erőnléti: mérés, csapatfelmérés, 1RM'], ['physio', 'Egészség: státusz, anamnézis, jelenlét']] }],
    defaultSettings: { set: 'coach' },
  }),
  favorite_exercises: w('favorite_exercises', {
    name: 'Kedvenc gyakorlatok', icon: Star, category: 'Eszközök', module_key: 'exercises',
    description: 'A gyakorlattárban csillagozott gyakorlatok.',
    defaultSize: [1, 1], minSize: [1, 1],
  }),
  note: w('note', {
    name: 'Jegyzet', icon: StickyNote, category: 'Eszközök', module_key: null,
    description: 'Saját jegyzet a kezdőlapon (csak te látod).',
    defaultSize: [1, 1], minSize: [1, 1], allowMultiple: true,
    defaultSettings: { text: '' },
  }),
  team_wellness: w('team_wellness', {
    name: 'Csapat-wellness', icon: Smile, category: 'Csapat és egészség', module_key: null, comingSoon: true,
    description: 'A reggeli kérdőív összesítője.', defaultSize: [1, 2], minSize: [1, 1],
  }),
  injury_summary: w('injury_summary', {
    name: 'Sérülés-összesítő', icon: ClipboardPlus, category: 'Csapat és egészség', module_key: null, comingSoon: true,
    description: 'Kihagyott napok és gyakori sérült testrészek.', defaultSize: [2, 1], minSize: [1, 1],
  }),
  rehab_bookings: w('rehab_bookings', {
    name: 'Mai rehab-időpontok', icon: CalendarClock, category: 'Csapat és egészség', module_key: null, comingSoon: true,
    description: 'A gyógytornászhoz foglalt mai időpontok.', defaultSize: [1, 1], minSize: [1, 1],
  }),
}
