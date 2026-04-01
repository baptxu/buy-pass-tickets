import { useEffect, useEffectEvent, useState } from 'react'
import { supabase } from '../lib/supabase'
import AvatarBadge from './AvatarBadge'
import StarRating from './StarRating'

const SETUP_PENDING_COPY = {
  reviews: "Les avis seront visibles ici dès que l'espace communauté sera activé côté base de données.",
  chat: "Le chat sera disponible ici dès que les tables communauté seront déployées sur Supabase.",
  invites: "Les invitations par lien seront prêtes dès que le module groupes sera activé côté base de données.",
}

function buildEventKey(item) {
  return [item?.event_name, item?.event_date, item?.city]
    .map(value => String(value || '').trim().toLowerCase())
    .join('::')
}

function formatReviewDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatMessageTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function parseFeatureError(rawMessage, feature) {
  if (!rawMessage) return { text: '', pendingSetup: false }

  const message = String(rawMessage)
  const isPendingSetup =
    message.includes('schema cache') ||
    message.includes('Could not find the table') ||
    message.includes('does not exist') ||
    message.includes('infinite recursion detected in policy')

  if (isPendingSetup) {
    return {
      text: SETUP_PENDING_COPY[feature],
      pendingSetup: true,
    }
  }

  return {
    text: message,
    pendingSetup: false,
  }
}

export default function CommunityHub({ session, orders, onBack, focusGroupId = null, entryNotice = '', onClearEntryNotice }) {
  const [profilesMap, setProfilesMap] = useState({})
  const [reviews, setReviews] = useState([])
  const [groups, setGroups] = useState([])
  const [activeGroupId, setActiveGroupId] = useState(null)
  const [messages, setMessages] = useState([])
  const [groupMembers, setGroupMembers] = useState([])
  const [groupInvites, setGroupInvites] = useState([])
  const [drafts, setDrafts] = useState({})
  const [chatInput, setChatInput] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [lastInviteLink, setLastInviteLink] = useState('')
  const [loading, setLoading] = useState(true)
  const [reviewSavingId, setReviewSavingId] = useState(null)
  const [groupBusyKey, setGroupBusyKey] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [chatError, setChatError] = useState('')
  const [chatSuccess, setChatSuccess] = useState('')

  async function fetchProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .order('full_name', { ascending: true })

    if (error) {
      setChatError(error.message)
      return
    }

    const nextMap = {}
    ;(data || []).forEach(entry => { nextMap[entry.id] = entry })
    setProfilesMap(nextMap)
  }

  async function fetchReviews() {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('visible', true)
      .order('created_at', { ascending: false })

    if (error) {
      setReviewError(error.message)
      return
    }

    setReviews(data || [])
  }

  async function ensureGlobalChatRoom() {
    let group = null
    const existing = await supabase
      .from('chat_groups')
      .select('id, name, is_global, event_key, event_name, created_at')
      .eq('is_global', true)
      .maybeSingle()

    if (existing.error && existing.error.code !== 'PGRST116') {
      setChatError(existing.error.message)
      return
    }

    if (existing.data) {
      group = existing.data
    } else {
      const created = await supabase
        .from('chat_groups')
        .insert({
          name: 'Salon general',
          slug: 'global',
          is_global: true,
          created_by: session.user.id,
        })
        .select('id, name, is_global, event_key, event_name, created_at')
        .maybeSingle()

      if (created.error) {
        const duplicate = await supabase
          .from('chat_groups')
          .select('id, name, is_global, event_key, event_name, created_at')
          .eq('is_global', true)
          .maybeSingle()

        if (duplicate.error) {
          setChatError(created.error.message)
          return
        }

        group = duplicate.data
      } else {
        group = created.data
      }
    }

    if (!group?.id) return

    const memberResult = await supabase
      .from('chat_group_members')
      .upsert(
        {
          group_id: group.id,
          user_id: session.user.id,
          role: 'member',
        },
        { onConflict: 'group_id,user_id' }
      )

    if (memberResult.error) {
      setChatError(memberResult.error.message)
      return
    }

    await fetchGroups(group.id)
  }

  async function fetchGroups(preferredGroupId) {
    const memberships = await supabase
      .from('chat_group_members')
      .select('group_id')
      .eq('user_id', session.user.id)

    if (memberships.error) {
      setChatError(memberships.error.message)
      return
    }

    const groupIds = memberships.data?.map(entry => entry.group_id) || []
    if (groupIds.length === 0) {
      setGroups([])
      setActiveGroupId(null)
      return
    }

    const groupsResult = await supabase
      .from('chat_groups')
      .select('id, name, is_global, event_key, event_name, created_at')
      .in('id', groupIds)
      .order('is_global', { ascending: false })
      .order('created_at', { ascending: true })

    if (groupsResult.error) {
      setChatError(groupsResult.error.message)
      return
    }

    const nextGroups = groupsResult.data || []
    setGroups(nextGroups)
    setActiveGroupId(current => {
      if (current && nextGroups.some(group => group.id === current)) return current
      return preferredGroupId || nextGroups[0]?.id || null
    })
  }

  async function fetchGroupMembers(groupId) {
    const { data, error } = await supabase
      .from('chat_group_members')
      .select('id, user_id, role, joined_at')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true })

    if (error) {
      setChatError(error.message)
      return
    }

    setGroupMembers(data || [])
  }

  async function fetchGroupInvites(groupId) {
    const { data, error } = await supabase
      .from('chat_group_invites')
      .select('id, token, target_email, created_at, expires_at, accepted_at')
      .eq('group_id', groupId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      setInviteError(error.message)
      return
    }

    setGroupInvites(data || [])
  }

  const fetchMessages = useEffectEvent(async (groupId) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })

    if (error) {
      setChatError(error.message)
      return
    }

    setMessages(data || [])
  })

  const syncFocusedGroup = useEffectEvent((groupId) => {
    setActiveGroupId(groupId)
  })

  const loadActiveGroupPanels = useEffectEvent((groupId) => {
    fetchMessages(groupId)
    fetchGroupMembers(groupId)
    fetchGroupInvites(groupId)
  })

  async function submitReview(order) {
    const draft = drafts[order.id]
    if (!draft?.rating) {
      setReviewError('Choisis une note avant de publier ton avis.')
      return
    }

    setReviewSavingId(order.id)
    setReviewError('')

    const result = await supabase
      .from('reviews')
      .insert({
        order_id: order.id,
        reviewer_id: session.user.id,
        rating: draft.rating,
        comment: draft.comment?.trim() || null,
        event_name: order.event_name,
        event_date: order.event_date,
      })

    if (result.error) {
      setReviewError(result.error.message)
      setReviewSavingId(null)
      return
    }

    setDrafts(current => {
      const next = { ...current }
      delete next[order.id]
      return next
    })
    setReviewSavingId(null)
    await fetchReviews()
  }

  async function createEventGroup(order) {
    const eventKey = buildEventKey(order)
    setGroupBusyKey(eventKey)
    setChatError('')
    setChatSuccess('')

    const rpcResult = await supabase.rpc('create_event_chat_group', {
      target_order_id: order.id,
    })

    if (rpcResult.error) {
      setChatError(rpcResult.error.message)
      setGroupBusyKey('')
      return
    }

    await fetchGroups(rpcResult.data)
    setChatSuccess('Le groupe evenement a ete cree et rempli avec les membres confirmes.')
    setGroupBusyKey('')
  }

  async function createInviteLink() {
    if (!activeGroupId) return

    setInviteBusy(true)
    setInviteError('')
    setChatSuccess('')

    const { data, error } = await supabase.rpc('create_group_invite', {
      target_group_id: activeGroupId,
      invite_email: inviteEmail.trim() || null,
    })

    if (error) {
      setInviteError(error.message)
      setInviteBusy(false)
      return
    }

    const url = new URL(window.location.href)
    url.searchParams.set('groupInvite', data.token)
    const inviteLink = url.toString()

    try {
      await navigator.clipboard.writeText(inviteLink)
      setChatSuccess('Lien d invitation cree et copie.')
    } catch {
      setChatSuccess('Lien d invitation cree.')
    }

    setLastInviteLink(inviteLink)
    setInviteEmail('')
    await fetchGroupInvites(activeGroupId)
    setInviteBusy(false)
  }

  async function sendMessage() {
    if (!activeGroupId || !chatInput.trim()) return

    setChatSending(true)
    setChatError('')

    const result = await supabase
      .from('chat_messages')
      .insert({
        group_id: activeGroupId,
        sender_id: session.user.id,
        content: chatInput.trim(),
      })
      .select('*')
      .maybeSingle()

    if (result.error) {
      setChatError(result.error.message)
      setChatSending(false)
      return
    }

    setMessages(current => current.some(message => message.id === result.data.id) ? current : [...current, result.data])
    setChatInput('')
    setChatSending(false)
  }

  const bootstrapCommunity = useEffectEvent(async () => {
    setLoading(true)
    setReviewError('')
    setChatError('')

    await Promise.all([
      fetchProfiles(),
      fetchReviews(),
      ensureGlobalChatRoom(),
    ])

    setLoading(false)
  })

  const activeGroup = groups.find(group => group.id === activeGroupId)
  const activeMembers = groupMembers.map(member => ({
    ...member,
    profile: profilesMap[member.user_id],
  }))
  const reviewFeedback = parseFeatureError(reviewError, 'reviews')
  const chatFeedback = parseFeatureError(chatError, 'chat')
  const inviteFeedback = parseFeatureError(inviteError, 'invites')
  const chatUnavailable = chatFeedback.pendingSetup
  const reviewsUnavailable = reviewFeedback.pendingSetup
  const reviewedOrderIds = new Set(reviews.map(review => review.order_id))
  const averageRating = reviews.length
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  const reviewableOrders = orders.filter(order => order.status === 'sent' && !reviewedOrderIds.has(order.id))

  const eventChatCandidates = []
  const seenKeys = new Set()
  orders
    .filter(order => ['confirmed', 'sent'].includes(order.status))
    .forEach(order => {
      const key = buildEventKey(order)
      if (!key || seenKeys.has(key)) return
      seenKeys.add(key)
      eventChatCandidates.push(order)
    })

  useEffect(() => {
    bootstrapCommunity()
  }, [session.user.id])

  useEffect(() => {
    if (!focusGroupId) return
    if (groups.some(group => group.id === focusGroupId)) {
      syncFocusedGroup(focusGroupId)
    }
  }, [focusGroupId, groups])

  useEffect(() => {
    if (!activeGroupId) return

    loadActiveGroupPanels(activeGroupId)
  }, [activeGroupId])

  useEffect(() => {
    if (!entryNotice || !onClearEntryNotice) return undefined

    const timeoutId = window.setTimeout(() => onClearEntryNotice(), 4500)
    return () => window.clearTimeout(timeoutId)
  }, [entryNotice, onClearEntryNotice])

  useEffect(() => {
    if (!activeGroupId) return undefined

    const channel = supabase
      .channel(`community-chat-${activeGroupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `group_id=eq.${activeGroupId}`,
        },
        payload => {
          setMessages(current => current.some(message => message.id === payload.new.id) ? current : [...current, payload.new])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeGroupId])

  if (loading) {
    return (
      <div className="rounded-[28px] border border-[#2A2D3E] bg-[#131722] p-10 text-center text-gray-400">
        Chargement de l'espace communaute...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Communaute Buy Pass</h2>
          <p className="mt-1 text-sm text-gray-400">Avis apres echange et salons en direct. La photo de profil se gere depuis le profil personnel.</p>
        </div>
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white border border-[#2A2D3E] px-3 py-2 rounded-lg">
          ← Retour
        </button>
      </div>

      {entryNotice && (
        <div className="rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-200">
          {entryNotice}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[24px] border border-[#2A2D3E] bg-[#161A25]">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5">
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7D89A8]">Aspect communautaire</p>
                <h3 className="mt-1.5 text-base font-semibold text-white">Avis publics et discussions entre utilisateurs</h3>
                <p className="mt-1 text-xs text-gray-500">
                  La photo de profil se modifie depuis le profil personnel, puis s'affiche automatiquement ici.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-[#2A2D3E] bg-[#0F1117] px-4 py-2.5">
                <AvatarBadge profile={profilesMap[session.user.id]} size="sm" />
                <div>
                  <p className="text-sm font-medium text-white">{profilesMap[session.user.id]?.full_name || 'Mon profil'}</p>
                  <p className="text-[11px] text-gray-500">Photo sync depuis le profil</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[20px] border border-[#2A2D3E] bg-[#161A25] p-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Note moyenne</p>
              <p className="mt-2 text-3xl font-bold text-white">{averageRating}</p>
              <div className="mt-1.5 flex justify-center">
                <StarRating value={Math.round(Number(averageRating))} readOnly size="sm" />
              </div>
            </div>
            <div className="rounded-[20px] border border-[#2A2D3E] bg-[#161A25] p-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Avis publiés</p>
              <p className="mt-2 text-3xl font-bold text-white">{reviews.length}</p>
            </div>
            <div className="rounded-[20px] border border-[#2A2D3E] bg-[#161A25] p-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Salons rejoints</p>
              <p className="mt-2 text-3xl font-bold text-white">{groups.length}</p>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#2A2D3E] bg-[#161A25] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Noter une prestation</h3>
                <p className="mt-1 text-sm text-gray-400">Les avis se debloquent une fois les billets envoyes.</p>
              </div>
            </div>

            {reviewFeedback.text && (
              <p className={`mb-4 rounded-xl px-4 py-3 text-sm ${reviewFeedback.pendingSetup ? 'border border-amber-400/20 bg-amber-400/10 text-amber-100' : 'border border-red-400/20 bg-red-400/10 text-red-200'}`}>
                {reviewFeedback.text}
              </p>
            )}

            {reviewableOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#2A2D3E] px-4 py-8 text-center text-sm text-gray-500">
                {reviewsUnavailable
                  ? "L'espace avis s'activera automatiquement une fois le module communauté déployé."
                  : 'Aucun billet envoye a noter pour le moment.'}
              </div>
            ) : (
              <div className="space-y-4">
                {reviewableOrders.map(order => {
                  const draft = drafts[order.id] || { rating: 0, comment: '' }
                  return (
                    <article key={order.id} className="rounded-[24px] border border-[#2A2D3E] bg-[#0F1117] p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h4 className="text-base font-semibold text-white">{order.event_name}</h4>
                          <p className="text-sm text-gray-400">{order.city} · {order.event_date} · {order.category}</p>
                        </div>
                        <span className="rounded-full border border-[#1D9E75]/30 bg-[#1D9E75]/10 px-3 py-1 text-xs font-medium text-[#72D3B3]">
                          Billets envoyes
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <StarRating
                          value={draft.rating}
                          onChange={rating => setDrafts(current => ({ ...current, [order.id]: { ...(current[order.id] || {}), rating } }))}
                        />
                        <span className="text-sm text-gray-500">{draft.rating ? `${draft.rating}/5` : 'Choisis une note'}</span>
                      </div>

                      <textarea
                        rows={3}
                        value={draft.comment}
                        onChange={event => setDrafts(current => ({ ...current, [order.id]: { ...(current[order.id] || {}), comment: event.target.value } }))}
                        placeholder="Dis comment s'est passe l'echange des billets, la rapidite, la qualite du suivi..."
                        className="mt-4 w-full resize-none rounded-2xl border border-[#2A2D3E] bg-[#151926] px-4 py-3 text-sm text-white focus:border-[#4F8EF7] focus:outline-none"
                      />

                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => submitReview(order)}
                          disabled={reviewSavingId === order.id}
                          className="rounded-full bg-[#4F8EF7] px-5 py-2 text-sm font-medium text-white transition-all hover:bg-[#3a7ae0] disabled:opacity-50"
                        >
                          {reviewSavingId === order.id ? 'Publication...' : 'Publier mon avis'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-[#2A2D3E] bg-[#161A25] p-6">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-white">Avis des utilisateurs</h3>
              <p className="mt-1 text-sm text-gray-400">Les retours publies sont visibles par toute la communaute.</p>
            </div>

            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#2A2D3E] px-4 py-8 text-center text-sm text-gray-500">
                {reviewsUnavailable
                  ? 'Les premiers avis apparaitront ici une fois la fonctionnalite activée.'
                  : 'Aucun avis public pour le moment.'}
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => {
                  const author = profilesMap[review.reviewer_id]
                  return (
                    <article key={review.id} className="rounded-[24px] border border-[#2A2D3E] bg-[#0F1117] p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <AvatarBadge profile={author} size="sm" />
                          <div>
                            <p className="font-medium text-white">{author?.full_name || 'Utilisateur Buy Pass'}</p>
                            <p className="text-xs text-gray-500">{review.event_name} · {review.event_date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <StarRating value={review.rating} readOnly size="sm" />
                          <p className="mt-1 text-xs text-gray-500">{formatReviewDate(review.created_at)}</p>
                        </div>
                      </div>
                      {review.comment && <p className="mt-4 text-sm leading-6 text-gray-300">{review.comment}</p>}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-[#2A2D3E] bg-[#171B28] p-6">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-white">Salons en direct</h3>
              <p className="mt-1 text-sm text-gray-400">Discute avec toute la communaute ou cree un groupe avec les personnes confirmees pour un evenement.</p>
            </div>

            {chatFeedback.text && (
              <p className={`mb-4 rounded-xl px-4 py-3 text-sm ${chatFeedback.pendingSetup ? 'border border-amber-400/20 bg-amber-400/10 text-amber-100' : 'border border-red-400/20 bg-red-400/10 text-red-200'}`}>
                {chatFeedback.text}
              </p>
            )}
            {chatSuccess && <p className="mb-4 rounded-xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-200">{chatSuccess}</p>}

            <div className="space-y-3">
              {eventChatCandidates.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#2A2D3E] px-4 py-6 text-center text-sm text-gray-500">
                  Les groupes evenement s'activent des qu'une commande passe en confirmee.
                </div>
              )}

              {eventChatCandidates.map(order => {
                const eventKey = buildEventKey(order)
                const existingGroup = groups.find(group => group.event_key === eventKey)
                return (
                  <div key={eventKey} className="rounded-[22px] border border-[#2A2D3E] bg-[#0F1117] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{order.event_name}</p>
                        <p className="mt-1 text-xs text-gray-500">{order.city} · {order.event_date}</p>
                      </div>
                      {existingGroup ? (
                        <button
                          onClick={() => setActiveGroupId(existingGroup.id)}
                          className="rounded-full border border-[#4F8EF7]/40 bg-[#4F8EF7]/10 px-3 py-1.5 text-xs font-medium text-[#9EC0FF]"
                        >
                          Ouvrir le groupe
                        </button>
                      ) : (
                        <button
                          onClick={() => createEventGroup(order)}
                          disabled={groupBusyKey === eventKey || chatUnavailable}
                          className="rounded-full border border-[#1D9E75]/30 bg-[#1D9E75]/10 px-3 py-1.5 text-xs font-medium text-[#72D3B3] disabled:opacity-50"
                        >
                          {chatUnavailable ? 'Bientot disponible' : groupBusyKey === eventKey ? 'Creation...' : 'Creer le groupe'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-[#2A2D3E] bg-[#161A25]">
            <div className="border-b border-[#2A2D3E] px-5 py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Chat communautaire</h3>
                  <p className="mt-1 text-sm text-gray-400">Un salon general et des groupes prives partageables par lien.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {groups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => setActiveGroupId(group.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      activeGroupId === group.id
                        ? 'bg-[#4F8EF7] text-white'
                        : 'border border-[#2A2D3E] text-gray-400 hover:text-white'
                    }`}
                  >
                    {group.is_global ? 'Salon general' : group.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-b border-[#2A2D3E] px-5 py-4">
              <h4 className="text-base font-semibold text-white">{activeGroup?.is_global ? 'Salon general' : activeGroup?.name || 'Aucun salon'}</h4>
              <p className="mt-1 text-sm text-gray-400">
                {activeGroup?.is_global
                  ? 'Canal communautaire ouvert a tous les utilisateurs.'
                  : activeGroup?.event_name
                    ? `Groupe reserve aux personnes confirmees pour ${activeGroup.event_name}.`
                    : 'Selectionne un salon pour commencer.'}
              </p>
            </div>

            {!activeGroupId ? (
              <div className="px-5 py-10">
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[26px] border border-dashed border-[#2A2D3E] bg-[#10141E] px-6 text-center">
                  <div className="mb-5 rounded-full border border-[#2A2D3E] bg-[#141928] px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#7D89A8]">
                    Aucun salon selectionne
                  </div>
                  <h4 className="text-2xl font-semibold text-white">
                    {chatUnavailable ? 'Module chat en cours d activation' : 'Choisis un salon pour commencer a discuter'}
                  </h4>
                  <p className="mt-3 max-w-lg text-sm leading-7 text-gray-400">
                    {chatUnavailable
                      ? "Les groupes et conversations seront visibles ici dès que l'infrastructure communauté sera activée."
                      : "Ouvre le salon general ou cree un groupe evenement pour acceder a la discussion, aux membres et aux liens d invitation."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid min-h-[620px] xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex min-h-[620px] flex-col border-b border-[#2A2D3E] xl:border-b-0 xl:border-r">
                  <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                    {messages.length === 0 && <p className="py-8 text-center text-sm text-gray-500">Aucun message pour l'instant.</p>}
                    {messages.map(message => {
                      const author = profilesMap[message.sender_id]
                      const mine = message.sender_id === session.user.id
                      return (
                        <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-[24px] px-4 py-3 ${mine ? 'bg-[#4F8EF7] text-white' : 'bg-[#0F1117] text-gray-200 border border-[#2A2D3E]'}`}>
                            <div className="mb-2 flex items-center gap-2">
                              {!mine && <AvatarBadge profile={author} size="sm" className="h-7 w-7 text-xs" />}
                              <span className={`text-xs font-medium ${mine ? 'text-white/80' : 'text-[#9AA3C0]'}`}>
                                {mine ? 'Vous' : author?.full_name || 'Utilisateur'}
                              </span>
                              <span className={`text-[11px] ${mine ? 'text-white/60' : 'text-gray-500'}`}>
                                {formatMessageTime(message.created_at)}
                              </span>
                            </div>
                            <p className="text-sm leading-6">{message.content}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="border-t border-[#2A2D3E] p-4">
                    {chatError && !chatFeedback.pendingSetup && (
                      <p className="mb-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300">
                        {chatError}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <input
                        value={chatInput}
                        onChange={event => setChatInput(event.target.value)}
                        onKeyDown={event => event.key === 'Enter' && !event.shiftKey && (event.preventDefault(), sendMessage())}
                        placeholder="Ecrire un message..."
                        disabled={chatSending}
                        className="flex-1 rounded-2xl border border-[#2A2D3E] bg-[#0F1117] px-4 py-3 text-sm text-white focus:border-[#4F8EF7] focus:outline-none disabled:opacity-50"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!chatInput.trim() || chatSending}
                        className="rounded-2xl bg-[#4F8EF7] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-[#3a7ae0] disabled:opacity-50"
                      >
                        {chatSending ? 'Envoi...' : 'Envoyer'}
                      </button>
                    </div>
                  </div>
                </div>

                <aside className="space-y-5 px-5 py-5">
                  <div>
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                      Membres · {activeMembers.length}
                    </p>
                    <div className="space-y-2">
                      {activeMembers.length === 0 && <p className="text-xs text-gray-600">Aucun membre chargé.</p>}
                      {activeMembers.map(member => (
                        <div key={member.id} className="flex items-center gap-2.5">
                          <AvatarBadge profile={member.profile} size="sm" />
                          <p className="min-w-0 flex-1 truncate text-sm text-white">{member.profile?.full_name || 'Utilisateur'}</p>
                          <span className="text-[10px] text-gray-600">{member.role === 'owner' ? 'Orga' : 'Membre'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!activeGroup?.is_global && (
                    <div className="rounded-[22px] border border-[#2A2D3E] bg-[#10141E] p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Inviter un membre</p>
                      <p className="mt-2 text-sm text-gray-400">
                        Renseigne un email pour reserver le lien a une personne precise, ou laisse vide pour un lien partageable.
                      </p>

                      <input
                        value={inviteEmail}
                        onChange={event => setInviteEmail(event.target.value)}
                        placeholder="email@exemple.com"
                        className="mt-4 w-full rounded-2xl border border-[#2A2D3E] bg-[#0F1117] px-4 py-3 text-sm text-white focus:border-[#4F8EF7] focus:outline-none"
                      />

                      {inviteFeedback.text && (
                        <p className={`mt-3 text-sm ${inviteFeedback.pendingSetup ? 'text-amber-200' : 'text-red-300'}`}>
                          {inviteFeedback.text}
                        </p>
                      )}

                      <button
                        onClick={createInviteLink}
                        disabled={inviteBusy || inviteFeedback.pendingSetup}
                        className="mt-4 w-full rounded-2xl bg-[#1D9E75] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-[#178760] disabled:opacity-50"
                      >
                        {inviteFeedback.pendingSetup ? 'Bientot disponible' : inviteBusy ? 'Creation...' : 'Generer un lien'}
                      </button>

                      {lastInviteLink && (
                        <div className="mt-4 rounded-2xl border border-[#2A2D3E] bg-[#0F1117] p-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Dernier lien cree</p>
                          <p className="mt-2 break-all text-sm text-[#9EC0FF]">{lastInviteLink}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {!activeGroup?.is_global && (
                    <div className="rounded-[22px] border border-[#2A2D3E] bg-[#10141E] p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Invitations en attente</p>
                      <div className="mt-4 space-y-3">
                        {groupInvites.length === 0 && <p className="text-sm text-gray-500">Aucune invitation en attente.</p>}
                        {groupInvites.map(invite => (
                          <div key={invite.id} className="rounded-2xl border border-[#2A2D3E] bg-[#0F1117] p-3">
                            <p className="text-sm font-medium text-white">{invite.target_email || 'Lien libre'}</p>
                            <p className="mt-1 break-all text-xs text-gray-500">{`${window.location.origin}${window.location.pathname}?groupInvite=${invite.token}`}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </aside>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
