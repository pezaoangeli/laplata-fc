import { createContext, useContext, useEffect, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setCarregando(true)
      setUser(u)
      if (u) {
        try {
          const registro = await getDoc(doc(db, 'admins', u.uid))
          setIsAdmin(registro.exists())
        } catch {
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }
      setCarregando(false)
    })
  }, [])

  const entrar = () => {
    const provedor = new GoogleAuthProvider()
    provedor.setCustomParameters({ prompt: 'select_account' }) // deixa escolher a conta Google
    return signInWithPopup(auth, provedor)
  }
  const sair = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, isAdmin, carregando, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
