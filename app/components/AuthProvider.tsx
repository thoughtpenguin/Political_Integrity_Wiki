'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase-client'

interface AuthUser {
  uid: string
  displayName: string
  photoURL: string
  email: string
  credibilityPoints: number
  isAdmin: boolean
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: () => Promise<void>
  logOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  logOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Get or create user profile in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid)
        const userDoc = await getDoc(userRef)

        if (userDoc.exists()) {
          const data = userDoc.data()
          setUser({
            uid: firebaseUser.uid,
            displayName: data.displayName || firebaseUser.displayName || 'Anonymous',
            photoURL: data.photoURL || firebaseUser.photoURL || '',
            email: data.email || firebaseUser.email || '',
            credibilityPoints: data.credibilityPoints || 0,
            isAdmin: data.isAdmin || false,
          })
        } else {
          // Create new user profile with 100 starting credibility points
          const newUser = {
            displayName: firebaseUser.displayName || 'Anonymous',
            photoURL: firebaseUser.photoURL || '',
            email: firebaseUser.email || '',
            credibilityPoints: 100,
            isAdmin: false,
            isBanned: false,
            createdAt: new Date().toISOString(),
          }
          await setDoc(userRef, newUser)
          setUser({
            uid: firebaseUser.uid,
            ...newUser,
          })
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const logOut = async () => {
    await signOut(auth)
    setUser(null)
  }

  return (
    <AuthContext value={{ user, loading, signIn, logOut }}>
      {children}
    </AuthContext>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
