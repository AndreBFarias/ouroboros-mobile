// Shim local para tree-shake real de lucide-react-native (M-BUNDLE-DIET).
//
// Metro/Hermes nao faz tree-shake do barrel `lucide-react-native` por
// padrao; importar `{ Plus } from 'lucide-react-native'` puxa todos os
// 1700+ icones (1.3 MB no bundle Hermes Android, medido baseline 8.84 MB).
// Este shim re-exporta cada icone do path direto, garantindo que so o
// que o app consome entre no bundle.
//
// Uso: trocar `from 'lucide-react-native'` por `from '@/lib/icons'`.
// Adicionar novo icone: importar do path direto e exportar named.
//
// Comentarios sem acento (convencao shell/CI).

export { default as AlertTriangle } from 'lucide-react-native/dist/esm/icons/triangle-alert.mjs';
export { default as BarChart } from 'lucide-react-native/dist/esm/icons/chart-no-axes-column-increasing.mjs';
export { default as Bell } from 'lucide-react-native/dist/esm/icons/bell.mjs';
export { default as BellRing } from 'lucide-react-native/dist/esm/icons/bell-ring.mjs';
export { default as Briefcase } from 'lucide-react-native/dist/esm/icons/briefcase.mjs';
export { default as Calendar } from 'lucide-react-native/dist/esm/icons/calendar.mjs';
export { default as CalendarRange } from 'lucide-react-native/dist/esm/icons/calendar-range.mjs';
export { default as Camera } from 'lucide-react-native/dist/esm/icons/camera.mjs';
export { default as Check } from 'lucide-react-native/dist/esm/icons/check.mjs';
export { default as ChevronDown } from 'lucide-react-native/dist/esm/icons/chevron-down.mjs';
export { default as ChevronLeft } from 'lucide-react-native/dist/esm/icons/chevron-left.mjs';
export { default as ChevronRight } from 'lucide-react-native/dist/esm/icons/chevron-right.mjs';
export { default as Dumbbell } from 'lucide-react-native/dist/esm/icons/dumbbell.mjs';
export { default as ExternalLink } from 'lucide-react-native/dist/esm/icons/external-link.mjs';
export { default as FileText } from 'lucide-react-native/dist/esm/icons/file-text.mjs';
export { default as FileX } from 'lucide-react-native/dist/esm/icons/file-x.mjs';
export { default as Fingerprint } from 'lucide-react-native/dist/esm/icons/fingerprint-pattern.mjs';
export { default as Hammer } from 'lucide-react-native/dist/esm/icons/hammer.mjs';
export { default as Hash } from 'lucide-react-native/dist/esm/icons/hash.mjs';
export { default as Heart } from 'lucide-react-native/dist/esm/icons/heart.mjs';
export { default as HelpCircle } from 'lucide-react-native/dist/esm/icons/circle-question-mark.mjs';
export { default as Home } from 'lucide-react-native/dist/esm/icons/house.mjs';
export { default as Image } from 'lucide-react-native/dist/esm/icons/image.mjs';
export { default as ImageIcon } from 'lucide-react-native/dist/esm/icons/image.mjs';
export { default as ImageOff } from 'lucide-react-native/dist/esm/icons/image-off.mjs';
export { default as Inbox } from 'lucide-react-native/dist/esm/icons/inbox.mjs';
export { default as Layers } from 'lucide-react-native/dist/esm/icons/layers.mjs';
export { default as ListChecks } from 'lucide-react-native/dist/esm/icons/list-checks.mjs';
export { default as MapPin } from 'lucide-react-native/dist/esm/icons/map-pin.mjs';
export { default as Menu } from 'lucide-react-native/dist/esm/icons/menu.mjs';
export { default as MessageCircle } from 'lucide-react-native/dist/esm/icons/message-circle.mjs';
export { default as Mic } from 'lucide-react-native/dist/esm/icons/mic.mjs';
export { default as Moon } from 'lucide-react-native/dist/esm/icons/moon.mjs';
export { default as Music } from 'lucide-react-native/dist/esm/icons/music.mjs';
export { default as Pause } from 'lucide-react-native/dist/esm/icons/pause.mjs';
export { default as Play } from 'lucide-react-native/dist/esm/icons/play.mjs';
export { default as Plus } from 'lucide-react-native/dist/esm/icons/plus.mjs';
export { default as Repeat } from 'lucide-react-native/dist/esm/icons/repeat.mjs';
export { default as Scale } from 'lucide-react-native/dist/esm/icons/scale.mjs';
export { default as Search } from 'lucide-react-native/dist/esm/icons/search.mjs';
export { default as Settings } from 'lucide-react-native/dist/esm/icons/settings.mjs';
export { default as Sigma } from 'lucide-react-native/dist/esm/icons/sigma.mjs';
export { default as Sparkles } from 'lucide-react-native/dist/esm/icons/sparkles.mjs';
export { default as Trash2 } from 'lucide-react-native/dist/esm/icons/trash-2.mjs';
export { default as Trophy } from 'lucide-react-native/dist/esm/icons/trophy.mjs';
export { default as Video } from 'lucide-react-native/dist/esm/icons/video.mjs';
export { default as Wallet } from 'lucide-react-native/dist/esm/icons/wallet.mjs';
export { default as X } from 'lucide-react-native/dist/esm/icons/x.mjs';
export { default as Zap } from 'lucide-react-native/dist/esm/icons/zap.mjs';

export type { LucideIcon, LucideProps } from 'lucide-react-native';
