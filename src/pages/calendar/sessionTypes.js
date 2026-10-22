import { Dumbbell, Volleyball, Target, FileText } from 'lucide-react'

// Az edzéstípusok és a mérkőzés megjelenítése a naptár nézeteiben.
// A színek a témához igazodó t-* tokenekből jönnek (erő / labdás / taktika / meccs / pihenő).
export const SESSION_TYPES = {
  gym: {
    label: 'Konditerem',
    icon: Dumbbell,
    solid: 'bg-t-strength text-on-status',
    soft: 'border-t-strength/40 bg-t-strength/15',
  },
  ball: {
    label: 'Labdás',
    icon: Volleyball,
    solid: 'bg-t-ball text-on-status',
    soft: 'border-t-ball/40 bg-t-ball/15',
  },
  tactic: {
    label: 'Taktika',
    icon: Target,
    solid: 'bg-t-tactic text-on-status',
    soft: 'border-t-tactic/40 bg-t-tactic/15',
  },
  other: {
    label: 'Egyéb',
    icon: FileText,
    solid: 'bg-t-rest text-on-status',
    soft: 'border-t-rest/40 bg-t-rest/15',
  },
}

export const MATCH_STYLE = {
  solid: 'bg-t-match text-on-status',
  soft: 'border-t-match/40 bg-t-match/15',
}

export const getSessionType = (type) => SESSION_TYPES[type] ?? SESSION_TYPES.other
