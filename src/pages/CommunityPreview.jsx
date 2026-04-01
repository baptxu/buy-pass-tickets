import { useState } from 'react'
import AvatarBadge from '../components/AvatarBadge'
import StarRating from '../components/StarRating'
import ClientProfile from '../components/ClientProfile'

const MOCK_PROFILE = {
  id: 'preview-user',
  full_name: 'Kevin Mokai',
  phone: '+33 6 12 34 56 78',
  avatar_url: '',
}

const PREVIEW_SESSION = {
  user: {
    id: 'preview-user',
    email: 'kevin@buypass.test',
  },
}

const PREVIEW_ORDERS = [
  {
    id: 'order-1',
    event_name: 'Travis Scott',
    event_date: '2026-07-03',
    city: 'Paris',
    category: 'Pelouse Or',
    status: 'sent',
    seats: 2,
    price: '420€',
  },
  {
    id: 'order-2',
    event_name: 'PSG vs Milan',
    event_date: '2026-05-14',
    city: 'Paris',
    category: 'Virage',
    status: 'confirmed',
    seats: 3,
    price: '315€',
  },
]

const MOCK_REVIEWS = [
  {
    id: 'review-1',
    reviewer: { id: 'user-1', full_name: 'Lina B.', avatar_url: '' },
    rating: 5,
    event_name: 'Travis Scott',
    event_date: '2026-07-03',
    created_at: '2026-03-28T18:30:00Z',
    comment: "Echange rapide, billets recus sans stress et groupe super actif avant l'evenement.",
  },
  {
    id: 'review-2',
    reviewer: { id: 'user-2', full_name: 'Mehdi R.', avatar_url: '' },
    rating: 4,
    event_name: 'PSG vs Milan',
    event_date: '2026-05-14',
    created_at: '2026-03-25T10:15:00Z',
    comment: "Bonne communication du debut a la fin. J'aimerais juste plus de mises a jour auto.",
  },
]

const MOCK_GROUPS = [
  {
    id: 'group-global',
    name: 'Salon general',
    description: 'Tout le monde peut discuter ici, partager des retours et poser des questions.',
  },
  {
    id: 'group-travis',
    name: 'Groupe Travis Scott',
    description: "Groupe reserve aux personnes confirmees pour l'evenement du 3 juillet.",
  },
]

const INITIAL_MESSAGES = {
  'group-global': [
    { id: 'msg-1', author: 'Sarah', mine: false, time: '18:42', content: 'Qui va au concert de Travis Scott cet ete ?' },
    { id: 'msg-2', author: 'Vous', mine: true, time: '18:44', content: "Je suis chaud, surtout si on a un groupe pour s'organiser." },
  ],
  'group-travis': [
    { id: 'msg-3', author: 'Anis', mine: false, time: '19:02', content: 'On se retrouve a quelle heure devant la salle ?' },
    { id: 'msg-4', author: 'Vous', mine: true, time: '19:04', content: '20h devant l entree nord ca vous va ?' },
  ],
}

const INITIAL_GROUP_MEMBERS = {
  'group-global': [
    { id: 'member-1', name: 'Sarah', role: 'Membre' },
    { id: 'member-2', name: 'Kevin Mokai', role: 'Membre' },
    { id: 'member-3', name: 'Anis', role: 'Membre' },
  ],
  'group-travis': [
    { id: 'member-4', name: 'Kevin Mokai', role: 'Organisateur' },
    { id: 'member-5', name: 'Anis', role: 'Membre' },
    { id: 'member-6', name: 'Lina B.', role: 'Membre' },
  ],
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function CommunityPreview({ section = 'all' }) {
  const [rating, setRating] = useState(4)
  const [reviewText, setReviewText] = useState("Interface communautaire pour noter la prestation apres l'echange des billets.")
  const [groups, setGroups] = useState(MOCK_GROUPS)
  const [activeGroupId, setActiveGroupId] = useState(MOCK_GROUPS[0].id)
  const [messagesByGroup, setMessagesByGroup] = useState(INITIAL_MESSAGES)
  const [membersByGroup, setMembersByGroup] = useState(INITIAL_GROUP_MEMBERS)
  const [chatInput, setChatInput] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLinks, setInviteLinks] = useState([
    {
      id: 'invite-1',
      groupId: 'group-travis',
      email: 'mehdi@email.com',
      url: 'https://buy-pass.test/?groupInvite=abc123travis',
    },
  ])
  const [groupCreated, setGroupCreated] = useState(false)

  const activeGroup = groups.find(group => group.id === activeGroupId)
  const activeMessages = messagesByGroup[activeGroupId] || []
  const activeMembers = membersByGroup[activeGroupId] || []
  const activeInvites = inviteLinks.filter(invite => invite.groupId === activeGroupId)
  const averageRating = (
    MOCK_REVIEWS.reduce((sum, review) => sum + review.rating, rating) /
    (MOCK_REVIEWS.length + 1)
  ).toFixed(1)

  function createEventGroup() {
    if (groupCreated) return

    const nextGroup = {
      id: 'group-psg',
      name: 'Groupe PSG vs Milan',
      description: "Groupe cree pour les utilisateurs confirmes sur l'evenement du 14 mai.",
    }

    setGroups(current => [...current, nextGroup])
    setMessagesByGroup(current => ({
      ...current,
      [nextGroup.id]: [
        { id: 'msg-5', author: 'Nora', mine: false, time: '20:11', content: 'On fait un point transport ici ?' },
      ],
    }))
    setMembersByGroup(current => ({
      ...current,
      [nextGroup.id]: [
        { id: 'member-7', name: 'Kevin Mokai', role: 'Organisateur' },
        { id: 'member-8', name: 'Nora', role: 'Membre' },
      ],
    }))
    setActiveGroupId(nextGroup.id)
    setGroupCreated(true)
  }

  function sendPreviewMessage() {
    if (!chatInput.trim()) return

    setMessagesByGroup(current => ({
      ...current,
      [activeGroupId]: [
        ...(current[activeGroupId] || []),
        {
          id: `local-${Date.now()}`,
          author: 'Vous',
          mine: true,
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          content: chatInput.trim(),
        },
      ],
    }))
    setChatInput('')
  }

  function createPreviewInvite() {
    if (!activeGroupId || activeGroup?.name === 'Salon general') return

    setInviteLinks(current => [
      {
        id: `invite-${Date.now()}`,
        groupId: activeGroupId,
        email: inviteEmail || 'Lien libre',
        url: `https://buy-pass.test/?groupInvite=${Date.now().toString(36)}`,
      },
      ...current,
    ])
    setInviteEmail('')
  }

  const showProfile = section === 'all' || section === 'profile'
  const showReviews = section === 'all' || section === 'reviews'
  const showChat = section === 'all' || section === 'chat'

  return (
    <div className="min-h-screen bg-[#0F1117]">
      <div className="border-b border-[#2A2D3E] bg-[#171B28] px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[#7D89A8]">Preview locale</p>
            <h1 className="mt-2 text-2xl font-bold text-white">Aspect communautaire Buy Pass</h1>
          </div>
          <a href="/" className="rounded-lg border border-[#2A2D3E] px-3 py-2 text-sm text-gray-400 hover:text-white">
            Retour a l'app
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-wrap gap-2">
          <a href="/?preview=community" className="rounded-full border border-[#2A2D3E] px-3 py-1.5 text-xs text-gray-300 hover:text-white">Vue complete</a>
          <a href="/?preview=community&section=profile" className="rounded-full border border-[#2A2D3E] px-3 py-1.5 text-xs text-gray-300 hover:text-white">Profil</a>
          <a href="/?preview=community&section=reviews" className="rounded-full border border-[#2A2D3E] px-3 py-1.5 text-xs text-gray-300 hover:text-white">Avis</a>
          <a href="/?preview=community&section=chat" className="rounded-full border border-[#2A2D3E] px-3 py-1.5 text-xs text-gray-300 hover:text-white">Chat & groupes</a>
        </div>

        {showProfile && (
          <div className="mb-8">
            <ClientProfile
              session={PREVIEW_SESSION}
              orders={PREVIEW_ORDERS}
              previewMode
              previewProfile={MOCK_PROFILE}
            />
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
          <div className="space-y-6">
            {(showProfile || showReviews) && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] border border-[#2A2D3E] bg-[#161A25] p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Note moyenne</p>
                  <div className="mt-3 flex items-end gap-3">
                    <p className="text-4xl font-bold text-white">{averageRating}</p>
                    <StarRating value={Math.round(Number(averageRating))} readOnly size="sm" />
                  </div>
                </div>
                <div className="rounded-[24px] border border-[#2A2D3E] bg-[#161A25] p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Avis publics</p>
                  <p className="mt-3 text-4xl font-bold text-white">{MOCK_REVIEWS.length + 1}</p>
                </div>
                <div className="rounded-[24px] border border-[#2A2D3E] bg-[#161A25] p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Groupes actifs</p>
                  <p className="mt-3 text-4xl font-bold text-white">{groups.length}</p>
                </div>
              </div>
            )}

            {showReviews && (
              <>
                <section className="rounded-[28px] border border-[#2A2D3E] bg-[#161A25] p-6">
                  <div className="mb-5">
                    <h3 className="text-lg font-semibold text-white">Notation apres echange</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      L'avis se debloque une fois les billets envoyes. On voit ici le bloc de notation et le texte libre.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-[#2A2D3E] bg-[#0F1117] p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-white">Travis Scott</h4>
                        <p className="text-sm text-gray-400">Paris · 2026-07-03 · Pelouse Or</p>
                      </div>
                      <span className="rounded-full border border-[#1D9E75]/30 bg-[#1D9E75]/10 px-3 py-1 text-xs font-medium text-[#72D3B3]">
                        Billets envoyes
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4">
                      <StarRating value={rating} onChange={setRating} />
                      <span className="text-sm text-gray-500">{rating}/5</span>
                    </div>

                    <textarea
                      rows={3}
                      value={reviewText}
                      onChange={event => setReviewText(event.target.value)}
                      className="mt-4 w-full resize-none rounded-2xl border border-[#2A2D3E] bg-[#151926] px-4 py-3 text-sm text-white focus:border-[#4F8EF7] focus:outline-none"
                    />

                    <div className="mt-4 flex justify-end">
                      <button className="rounded-full bg-[#4F8EF7] px-5 py-2 text-sm font-medium text-white">
                        Publier l'avis
                      </button>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-[#2A2D3E] bg-[#161A25] p-6">
                  <div className="mb-5">
                    <h3 className="text-lg font-semibold text-white">Avis visibles par les autres utilisateurs</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Chaque avis reprend la note, l'auteur, sa photo et le contexte de l'evenement.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      ...MOCK_REVIEWS,
                      {
                        id: 'live-review',
                        reviewer: MOCK_PROFILE,
                        rating,
                        event_name: 'Travis Scott',
                        event_date: '2026-07-03',
                        created_at: new Date().toISOString(),
                        comment: reviewText,
                      },
                    ].map(review => (
                      <article key={review.id} className="rounded-[24px] border border-[#2A2D3E] bg-[#0F1117] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <AvatarBadge profile={review.reviewer} size="sm" />
                            <div>
                              <p className="font-medium text-white">{review.reviewer.full_name}</p>
                              <p className="text-xs text-gray-500">{review.event_name} · {review.event_date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <StarRating value={review.rating} readOnly size="sm" />
                            <p className="mt-1 text-xs text-gray-500">{formatDate(review.created_at)}</p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-gray-300">{review.comment}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>

          {showChat && (
            <div className="space-y-6">
              <section className="rounded-[28px] border border-[#2A2D3E] bg-[#171B28] p-6">
                <div className="mb-5">
                  <h3 className="text-lg font-semibold text-white">Creation de groupes evenement</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    On peut creer un groupe reserve aux personnes confirmees sur un meme evenement.
                  </p>
                </div>

                <div className="rounded-[24px] border border-[#2A2D3E] bg-[#0F1117] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">PSG vs Milan</p>
                      <p className="mt-1 text-xs text-gray-500">Paris · 2026-05-14 · personnes confirmees uniquement</p>
                    </div>
                    <button
                      onClick={createEventGroup}
                      className="rounded-full border border-[#1D9E75]/30 bg-[#1D9E75]/10 px-3 py-1.5 text-xs font-medium text-[#72D3B3]"
                    >
                      {groupCreated ? 'Groupe cree' : 'Creer le groupe'}
                    </button>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-[28px] border border-[#2A2D3E] bg-[#161A25]">
                <div className="border-b border-[#2A2D3E] px-5 py-4">
                  <h3 className="text-lg font-semibold text-white">Chat communautaire en direct</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Salon global pour tout le monde + groupes prives par evenement confirme.
                  </p>
                </div>

                <div className="border-b border-[#2A2D3E] px-5 py-4">
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
                        {group.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-b border-[#2A2D3E] px-5 py-4">
                  <h4 className="text-base font-semibold text-white">{activeGroup?.name}</h4>
                  <p className="mt-1 text-sm text-gray-400">{activeGroup?.description}</p>
                </div>

                <div className="grid min-h-[620px] xl:grid-cols-[minmax(0,1.15fr)_320px]">
                  <div className="flex min-h-[620px] flex-col border-b border-[#2A2D3E] xl:border-b-0 xl:border-r">
                    <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                      {activeMessages.map(message => (
                        <div key={message.id} className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-[24px] px-4 py-3 ${message.mine ? 'bg-[#4F8EF7] text-white' : 'border border-[#2A2D3E] bg-[#0F1117] text-gray-200'}`}>
                            <div className="mb-2 flex items-center gap-2">
                              <span className={`text-xs font-medium ${message.mine ? 'text-white/80' : 'text-[#9AA3C0]'}`}>
                                {message.author}
                              </span>
                              <span className={`text-[11px] ${message.mine ? 'text-white/60' : 'text-gray-500'}`}>
                                {message.time}
                              </span>
                            </div>
                            <p className="text-sm leading-6">{message.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-[#2A2D3E] p-4">
                      <div className="flex gap-2">
                        <input
                          value={chatInput}
                          onChange={event => setChatInput(event.target.value)}
                          onKeyDown={event => event.key === 'Enter' && sendPreviewMessage()}
                          placeholder="Ecrire un message..."
                          className="flex-1 rounded-2xl border border-[#2A2D3E] bg-[#0F1117] px-4 py-3 text-sm text-white focus:border-[#4F8EF7] focus:outline-none"
                        />
                        <button
                          onClick={sendPreviewMessage}
                          className="rounded-2xl bg-[#4F8EF7] px-4 py-3 text-sm font-medium text-white"
                        >
                          Envoyer
                        </button>
                      </div>
                    </div>
                  </div>

                  <aside className="space-y-4 px-5 py-5">
                    <div className="rounded-[22px] border border-[#2A2D3E] bg-[#10141E] p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Membres</p>
                      <div className="mt-4 space-y-3">
                        {activeMembers.map(member => (
                          <div key={member.id} className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-white">{member.name}</p>
                            <span className="text-xs text-gray-500">{member.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {activeGroup?.name !== 'Salon general' && (
                      <div className="rounded-[22px] border border-[#2A2D3E] bg-[#10141E] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Inviter un membre</p>
                        <p className="mt-2 text-sm text-gray-400">
                          Email cible ou lien libre. Quand la personne clique sur le lien avec son compte, elle rejoint le groupe.
                        </p>
                        <input
                          value={inviteEmail}
                          onChange={event => setInviteEmail(event.target.value)}
                          placeholder="email@exemple.com"
                          className="mt-4 w-full rounded-2xl border border-[#2A2D3E] bg-[#0F1117] px-4 py-3 text-sm text-white focus:border-[#4F8EF7] focus:outline-none"
                        />
                        <button
                          onClick={createPreviewInvite}
                          className="mt-4 w-full rounded-2xl bg-[#1D9E75] px-4 py-3 text-sm font-medium text-white"
                        >
                          Generer un lien
                        </button>
                      </div>
                    )}

                    {activeGroup?.name !== 'Salon general' && (
                      <div className="rounded-[22px] border border-[#2A2D3E] bg-[#10141E] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Invitations en attente</p>
                        <div className="mt-4 space-y-3">
                          {activeInvites.map(invite => (
                            <div key={invite.id} className="rounded-2xl border border-[#2A2D3E] bg-[#0F1117] p-3">
                              <p className="text-sm font-medium text-white">{invite.email}</p>
                              <p className="mt-1 break-all text-xs text-gray-500">{invite.url}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </aside>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
