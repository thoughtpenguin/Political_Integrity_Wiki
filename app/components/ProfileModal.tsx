'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { db, auth } from '@/lib/firebase-client'
import { doc, updateDoc } from 'firebase/firestore'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  isInitialSetup?: boolean
}

export default function ProfileModal({ isOpen, onClose, isInitialSetup = false }: ProfileModalProps) {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState(() => user?.displayName || '')
  const googlePhotoURL = auth.currentUser?.photoURL || ''
  const [photoOption, setPhotoOption] = useState<'google' | 'default'>(() => {
    if (user?.photoURL && (user.photoURL === googlePhotoURL || !googlePhotoURL)) {
      return 'google'
    }
    return 'default'
  })
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [agreedToTOS, setAgreedToTOS] = useState(false)

  if (!isOpen || !user) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) {
      alert('Display name is required.')
      return
    }
    if (isInitialSetup && !agreedToTOS) {
      alert('You must agree to the Terms of Service to continue.')
      return
    }

    setIsSaving(true)
    try {
      const userRef = doc(db, 'users', user.uid)
      const updateData: {
        displayName: string
        photoURL: string
        hasCompletedSetup: boolean
        agreedToTOS?: boolean
        agreedToTOSAt?: string
      } = {
        displayName,
        photoURL: photoOption === 'google' ? googlePhotoURL : '',
        hasCompletedSetup: true
      }
      if (isInitialSetup) {
        updateData.agreedToTOS = true
        updateData.agreedToTOSAt = new Date().toISOString()
      }
      await updateDoc(userRef, updateData)
      router.refresh()
      onClose()
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <h2 className="modal-title">
          {isInitialSetup ? 'Complete Your Profile' : 'Edit Profile'}
        </h2>
        <p className="modal-description text-secondary" style={{ marginBottom: '1.5rem' }}>
          {isInitialSetup 
            ? 'Welcome! Please set your display name to get started.' 
            : 'Update your display name for the community.'}
        </p>

        {isInitialSetup && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.4'
          }}>
            🔒 <strong>Privacy Policy:</strong> We do not collect any personal data other than your public profile info (display name, chosen avatar) and the data contributions/proposals you actively submit to candidate profiles.
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
          <div>
            <label className="label" style={{ marginBottom: '0.75rem' }}>Profile Picture</label>
            <div className={`profile-photo-options ${googlePhotoURL ? 'two-options' : 'one-option'}`}>
              {/* Option 1: Google Photo */}
              {googlePhotoURL && (
                <button
                  type="button"
                  onClick={() => setPhotoOption('google')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    background: photoOption === 'google' ? 'var(--bg-card-hover)' : 'var(--bg-secondary)',
                    border: photoOption === 'google' ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    outline: 'none',
                    boxShadow: photoOption === 'google' ? 'var(--shadow-glow)' : 'none',
                  }}
                >
                  <Image
                    src={googlePhotoURL}
                    alt="Google Profile"
                    width={56}
                    height={56}
                    style={{
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Google Photo</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>Imported picture</div>
                  </div>
                </button>
              )}
              
              {/* Option 2: Default Photo */}
              <button
                type="button"
                onClick={() => setPhotoOption('default')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: photoOption === 'default' ? 'var(--bg-card-hover)' : 'var(--bg-secondary)',
                  border: photoOption === 'default' ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  outline: 'none',
                  boxShadow: photoOption === 'default' ? 'var(--shadow-glow)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {(displayName.trim() || user.displayName || 'A').charAt(0).toUpperCase()}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Default Avatar</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>Dynamic initials</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="label">Display Name</label>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your public name"
              maxLength={50}
              required
            />
          </div>

          {isInitialSetup && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                id="tos-checkbox"
                type="checkbox"
                checked={agreedToTOS}
                onChange={(e) => setAgreedToTOS(e.target.checked)}
                style={{
                  marginTop: '0.25rem',
                  cursor: 'pointer',
                  width: '16px',
                  height: '16px',
                  accentColor: 'var(--accent-primary)',
                }}
                required
              />
              <label htmlFor="tos-checkbox" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1.4, userSelect: 'none' }}>
                I have read and agree to the{' '}
                <Link href="/terms-of-service" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)', textDecoration: 'underline' }}>
                  Terms of Service
                </Link>
                .
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            {!isInitialSetup && (
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={isSaving || (isInitialSetup && !agreedToTOS)} style={{ flex: 1 }}>
              {isSaving ? 'Saving...' : (isInitialSetup ? 'Get Started' : 'Save Changes')}
            </button>
          </div>
        </form>

        {isInitialSetup && (
          <div className="modal-footer text-muted">
            By continuing, you agree to our community guidelines and Terms of Service.
          </div>
        )}
      </div>
    </div>
  )
}
