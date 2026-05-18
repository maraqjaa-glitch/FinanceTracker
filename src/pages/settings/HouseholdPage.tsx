import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, UserMinus, Crown, Shield, Plus, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import TopHeader from '@/components/layout/TopHeader'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useHouseholdStore } from '@/store/householdStore'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { supabase } from '@/lib/supabase'
import type { HouseholdMember } from '@/types'

// ─── Invite form schema ───────────────────────
const inviteSchema = z.object({ email: z.string().email() })
type InviteForm = z.infer<typeof inviteSchema>

// ─── Rename schema ────────────────────────────
const renameSchema = z.object({ name: z.string().min(1) })
type RenameForm = z.infer<typeof renameSchema>

export default function HouseholdPage() {
  const { t } = useTranslation()
  const { activeHousehold, members, fetchMembers } = useHouseholdStore()
  const { session } = useAuthStore()
  const { addToast } = useUIStore()

  const [inviteOpen, setInviteOpen]   = useState(false)
  const [renameOpen, setRenameOpen]   = useState(false)
  const [inviteLink, setInviteLink]   = useState<string | null>(null)
  const [copied, setCopied]           = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null)
  const [removeMemberName, setRemoveMemberName] = useState('')
  const [removing, setRemoving]       = useState(false)

  // Determine current user's role
  const myMember = members.find(m => m.user_id === session?.user.id)
  const isOwner = myMember?.role === 'owner'

  // ─── Invite ──────────────────────────────────
  const { register: regInvite, handleSubmit: handleInvite, reset: resetInvite, formState: { isSubmitting: inviting } } =
    useForm<InviteForm>({ resolver: zodResolver(inviteSchema) })

  const onInvite = async (data: InviteForm) => {
    if (!activeHousehold || !session) return
    try {
      const { data: invite, error } = await supabase
        .from('household_invitations')
        .insert({
          household_id: activeHousehold.id,
          invited_email: data.email,
          invited_by: session.user.id,
        })
        .select()
        .single()
      if (error) throw error

      // Generate shareable link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = (invite as any).token
      const link = `${window.location.origin}/?invite=${token}`
      setInviteLink(link)
      resetInvite()
      addToast({ type: 'success', title: t('household.invite') + ' sent' })
    } catch (e) {
      addToast({ type: 'error', title: e instanceof Error ? e.message : 'Failed to create invite' })
    }
  }

  const copyLink = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    addToast({ type: 'success', title: t('household.linkCopied') })
  }

  // ─── Rename household ─────────────────────────
  const { register: regRename, handleSubmit: handleRename, reset: resetRename, formState: { isSubmitting: renaming } } =
    useForm<RenameForm>({
      resolver: zodResolver(renameSchema),
      defaultValues: { name: activeHousehold?.name ?? '' },
    })

  const onRename = async (data: RenameForm) => {
    if (!activeHousehold) return
    try {
      const { error } = await supabase
        .from('households')
        .update({ name: data.name })
        .eq('id', activeHousehold.id)
      if (error) throw error
      useHouseholdStore.setState(s => ({
        activeHousehold: s.activeHousehold ? { ...s.activeHousehold, name: data.name } : null,
      }))
      setRenameOpen(false)
      addToast({ type: 'success', title: 'Household renamed' })
    } catch (e) {
      addToast({ type: 'error', title: e instanceof Error ? e.message : 'Failed to rename' })
    }
  }

  // ─── Remove member ────────────────────────────
  const confirmRemove = async () => {
    if (!removeMemberId || !activeHousehold) return
    setRemoving(true)
    try {
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', activeHousehold.id)
        .eq('user_id', removeMemberId)
      if (error) throw error
      await fetchMembers(activeHousehold.id)
      addToast({ type: 'success', title: 'Member removed' })
    } catch (e) {
      addToast({ type: 'error', title: e instanceof Error ? e.message : 'Failed to remove' })
    }
    setRemoving(false)
    setRemoveMemberId(null)
  }

  // ─── Change role ──────────────────────────────
  const changeRole = async (member: HouseholdMember, newRole: 'owner' | 'member') => {
    if (!activeHousehold) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('household_members').update({ role: newRole } as any)
        .eq('household_id', activeHousehold.id).eq('user_id', member.user_id)
      if (error) throw error
      await fetchMembers(activeHousehold.id)
      addToast({ type: 'success', title: `Role changed to ${newRole}` })
    } catch (e) {
      addToast({ type: 'error', title: e instanceof Error ? e.message : 'Failed' })
    }
  }

  return (
    <div>
      <TopHeader title={t('household.title')} showBack />

      <div className="px-4 py-4 flex flex-col gap-5">

        {/* Household info card */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Household
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {activeHousehold?.name ?? '—'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </p>
            </div>
            {isOwner && (
              <button
                onClick={() => { resetRename({ name: activeHousehold?.name ?? '' }); setRenameOpen(true) }}
                className="w-9 h-9 flex items-center justify-center rounded-xl"
                style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Members list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              {t('household.members')}
            </p>
            {isOwner && (
              <button
                onClick={() => setInviteOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 h-7 rounded-xl text-white"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <Plus className="w-3 h-3" />
                {t('household.invite')}
              </button>
            )}
          </div>

          <div className="card divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {members.map(m => {
              const name    = m.profile?.full_name ?? m.profile?.email ?? m.user_id.slice(0, 8)
              const email   = m.profile?.email ?? ''
              const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              const isSelf  = m.user_id === session?.user.id

              return (
                <div key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                  {/* Avatar */}
                  {m.profile?.avatar_url ? (
                    <img
                      src={m.profile.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: 'var(--color-accent)' }}
                    >
                      {initials}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {name}{isSelf ? ' (you)' : ''}
                      </p>
                      {m.role === 'owner' && (
                        <Crown className="w-3 h-3 flex-shrink-0" style={{ color: '#f59e0b' }} />
                      )}
                    </div>
                    {email && (
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {email}
                      </p>
                    )}
                  </div>

                  {/* Role badge */}
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: m.role === 'owner' ? '#f59e0b20' : 'var(--color-bg-elevated)',
                      color: m.role === 'owner' ? '#f59e0b' : 'var(--color-text-muted)',
                    }}
                  >
                    {t(`household.role.${m.role}`)}
                  </span>

                  {/* Actions (owner can manage others) */}
                  {isOwner && !isSelf && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => changeRole(m, m.role === 'owner' ? 'member' : 'owner')}
                        className="w-8 h-8 flex items-center justify-center rounded-xl"
                        style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-elevated)' }}
                        title={`Make ${m.role === 'owner' ? 'member' : 'owner'}`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setRemoveMemberId(m.user_id); setRemoveMemberName(name) }}
                        className="w-8 h-8 flex items-center justify-center rounded-xl"
                        style={{ color: '#ef444470', backgroundColor: 'var(--color-bg-elevated)' }}
                        title="Remove member"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Active invitations info */}
        {inviteLink && (
          <div
            className="card p-4"
            style={{ border: '1px solid #6366f130', backgroundColor: '#6366f108' }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              {t('household.inviteLink')}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-[10px] flex-1 break-all font-mono" style={{ color: 'var(--color-text-muted)' }}>
                {inviteLink}
              </p>
              <button
                onClick={copyLink}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-semibold text-white"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {copied
                  ? <><Check className="w-3 h-3" /> {t('household.linkCopied')}</>
                  : <><Copy className="w-3 h-3" /> {t('household.copyLink')}</>
                }
              </button>
            </div>
            <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Valid for 7 days. Share this link with the person you want to invite.
            </p>
          </div>
        )}
      </div>

      {/* ─── Invite modal ── */}
      <Modal open={inviteOpen} onClose={() => { setInviteOpen(false); setInviteLink(null) }} title={t('household.invite')}>
        <form onSubmit={handleInvite(onInvite)} className="flex flex-col gap-4">
          <div>
            <label className="label">{t('household.inviteEmail')}</label>
            <input
              {...regInvite('email')}
              type="email"
              className="input"
              placeholder="person@example.com"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="w-full h-12 rounded-2xl font-semibold text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {inviting ? '...' : 'Generate invite link'}
          </button>
          {inviteLink && (
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-[10px] break-all font-mono mb-2" style={{ color: 'var(--color-text-muted)' }}>
                {inviteLink}
              </p>
              <button
                type="button"
                onClick={copyLink}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 h-7 rounded-xl text-white"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> {t('household.copyLink')}</>}
              </button>
            </div>
          )}
        </form>
      </Modal>

      {/* ─── Rename modal ── */}
      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title={t('household.rename')}>
        <form onSubmit={handleRename(onRename)} className="flex flex-col gap-4">
          <div>
            <label className="label">Household name</label>
            <input {...regRename('name')} className="input" autoFocus />
          </div>
          <button
            type="submit"
            disabled={renaming}
            className="w-full h-12 rounded-2xl font-semibold text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {renaming ? '...' : t('common.save')}
          </button>
        </form>
      </Modal>

      {/* ─── Remove confirm ── */}
      <ConfirmDialog
        open={!!removeMemberId}
        title={`Remove ${removeMemberName}?`}
        description="They will lose access to this household and all its data."
        confirmLabel={t('household.removeMember')}
        destructive
        loading={removing}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveMemberId(null)}
      />
    </div>
  )
}
