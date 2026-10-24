import { createContext } from 'react'

// Ha egy widget a Kezdőlap keretén (WidgetFrame) belül fut, a keret adja a
// fejlécet; a WidgetCard ilyenkor csak a tartalmat rendereli.
export const WidgetFrameContext = createContext(false)
