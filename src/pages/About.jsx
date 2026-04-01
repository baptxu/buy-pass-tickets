function FeatureCard({ title, text, accent }) {
  return (
    <article className="rounded-[26px] border border-[#2A2D3E] bg-[#171B28] p-6">
      <div className={`mb-4 inline-flex rounded-full px-3 py-1 text-xs font-medium ${accent}`}>{title}</div>
      <p className="text-sm leading-7 text-gray-300">{text}</p>
    </article>
  )
}

function InfoBlock({ title, text }) {
  return (
    <div className="rounded-[24px] border border-[#2A2D3E] bg-[#111520] p-5">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-gray-400">{text}</p>
    </div>
  )
}

export default function About({ onBackToLogin }) {
  return (
    <div className="min-h-screen bg-[#0F1117]">
      <div className="border-b border-[#2A2D3E] bg-[#131722]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <img src="/buypasslogo.png" alt="Buy Pass" className="h-10" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#7D89A8]">A propos</p>
              <h1 className="mt-1 text-lg font-semibold text-white">Buy Pass Tickets</h1>
            </div>
          </div>
          <button
            onClick={onBackToLogin}
            className="rounded-full border border-[#2A2D3E] px-4 py-2 text-sm text-gray-300 transition-all hover:text-white"
          >
            Connexion
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <section className="overflow-hidden rounded-[34px] border border-[#2A2D3E] bg-[radial-gradient(circle_at_top_left,_rgba(79,142,247,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(29,158,117,0.14),_transparent_28%),linear-gradient(135deg,#181D2C,#0F1117)] px-8 py-10">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.2fr)_340px]">
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-[#8AAFFF]">Billetterie premium & accompagnement</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
                On simplifie l'achat de billets difficiles a trouver.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-gray-300">
                Buy Pass Tickets accompagne les clients qui cherchent des places pour concerts, matchs, festivals
                et autres evenements tres demandes. L'objectif est simple : trouver les bons billets, securiser
                l'echange et garder un vrai suivi humain du debut a la fin.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={onBackToLogin}
                  className="rounded-full bg-[#4F8EF7] px-5 py-3 text-sm font-medium text-white transition-all hover:bg-[#3a7ae0]"
                >
                  Acceder a mon compte
                </button>
                <div className="rounded-full border border-[#2A2D3E] px-5 py-3 text-sm text-gray-300">
                  Concerts, football, festivals, demandes sur mesure
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[28px] border border-[#2A2D3E] bg-[#10141E]/90 p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Ce qu'on fait</p>
                <p className="mt-3 text-2xl font-bold text-white">Recherche, suivi, echange et livraison des billets</p>
              </div>
              <div className="rounded-[28px] border border-[#2A2D3E] bg-[#10141E]/90 p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Pour qui</p>
                <p className="mt-3 text-2xl font-bold text-white">Les clients qui veulent un service plus clair et plus accompagne</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <FeatureCard
            title="Recherche ciblee"
            accent="bg-[#4F8EF7]/10 text-[#9EC0FF] border border-[#4F8EF7]/20"
            text="Tu peux faire une demande sur un evenement disponible ou envoyer une recherche personnalisee avec tes criteres de date, budget, ville et categorie."
          />
          <FeatureCard
            title="Suivi transparent"
            accent="bg-[#1D9E75]/10 text-[#72D3B3] border border-[#1D9E75]/20"
            text="Chaque commande avance avec un statut clair, un echange direct par messages et un recapitulatif simple a comprendre a chaque etape."
          />
          <FeatureCard
            title="Dimension communautaire"
            accent="bg-[#F59E0B]/10 text-[#F5C569] border border-[#F59E0B]/20"
            text="Les utilisateurs peuvent noter la prestation apres reception des billets, consulter les avis publics et echanger via des groupes lies aux evenements."
          />
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-[30px] border border-[#2A2D3E] bg-[#161A25] p-7">
            <p className="text-xs uppercase tracking-[0.24em] text-[#7D89A8]">Comment ca marche</p>
            <div className="mt-6 space-y-4">
              <InfoBlock
                title="1. Tu envoies ta demande"
                text="Tu indiques l'evenement, le nombre de places, la categorie souhaitee et tes contraintes eventuelles."
              />
              <InfoBlock
                title="2. On te fait un retour clair"
                text="Tu suis l'avancement, le prix propose et les modalites via ton espace personnel."
              />
              <InfoBlock
                title="3. Tu recuperes tes billets"
                text="Une fois la commande finalisee, tu retrouves les informations dans ton historique et tu peux laisser un avis."
              />
            </div>
          </div>

          <div className="rounded-[30px] border border-[#2A2D3E] bg-[#161A25] p-7">
            <p className="text-xs uppercase tracking-[0.24em] text-[#7D89A8]">Ce qu'on retrouve sur le site</p>
            <div className="mt-6 space-y-4">
              <InfoBlock
                title="Espace client"
                text="Creation de demandes, suivi des commandes, messages, profil personnel et historique d'achat."
              />
              <InfoBlock
                title="Avis utilisateurs"
                text="Les retours publies apres livraison des billets permettent de rassurer les nouveaux arrivants et de donner de la visibilite sur la qualite du service."
              />
              <InfoBlock
                title="Chats et groupes evenement"
                text="Les clients peuvent rejoindre des discussions, echanger entre eux et recevoir des invitations a des groupes prives lies a un evenement confirme."
              />
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[30px] border border-[#2A2D3E] bg-[#131722] p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#7D89A8]">Pourquoi Buy Pass Tickets</p>
              <h3 className="mt-3 text-3xl font-bold text-white">Un positionnement simple : plus de clarté, plus de suivi, plus de confiance.</h3>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
                L'idee n'est pas seulement de vendre un billet. Le site sert aussi a rassurer, centraliser les informations
                et rendre l'experience plus fluide pour les clients qui veulent un vrai accompagnement.
              </p>
            </div>
            <button
              onClick={onBackToLogin}
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-[#111827] transition-all hover:bg-gray-200"
            >
              Creer un compte
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
