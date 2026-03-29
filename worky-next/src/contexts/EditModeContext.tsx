import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface EditModeContextValue {
  editMode: boolean
  toggleEditMode: () => void
}

const EditModeContext = createContext<EditModeContextValue>({
  editMode: true,
  toggleEditMode: () => {},
})

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [editMode, setEditMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('munters-edit-mode') !== 'off'
  })

  useEffect(() => {
    localStorage.setItem('munters-edit-mode', editMode ? 'on' : 'off')
    document.body.classList.toggle('read-only', !editMode)
  }, [editMode])

  const toggleEditMode = () => setEditMode(e => !e)

  return (
    <EditModeContext.Provider value={{ editMode, toggleEditMode }}>
      {children}
    </EditModeContext.Provider>
  )
}

export function useEditMode() {
  return useContext(EditModeContext)
}
