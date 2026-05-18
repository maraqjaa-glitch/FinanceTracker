import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { profile, loading } = useAuthStore()

  // If already completed, skip to dashboard
  useEffect(() => {
    if (!loading && profile?.onboarding_completed) {
      navigate('/dashboard', { replace: true })
    }
  }, [loading, profile, navigate])

  if (loading) return null

  return <OnboardingWizard />
}
