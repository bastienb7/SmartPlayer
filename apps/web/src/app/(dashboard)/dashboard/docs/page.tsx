"use client";

import { useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play, Type, MousePointer, Zap, Shield, Repeat, Layers, Timer,
  BarChart3, Gauge, Filter, Sliders, MessageSquare, Settings,
  BookOpen, ChevronDown, ChevronRight, Users, Globe, Eye, Pause,
} from "lucide-react";

interface DocSection {
  id: string;
  icon: any;
  title: string;
  titleFr: string;
  color: string;
  features: DocFeature[];
}

interface DocFeature {
  name: string;
  nameFr: string;
  description: string;
  descriptionFr: string;
  impact?: string;
  impactFr?: string;
  howTo?: string;
  howToFr?: string;
}

const docs: DocSection[] = [
  {
    id: "player",
    icon: Settings,
    title: "Player Settings",
    titleFr: "Paramètres du lecteur",
    color: "text-primary",
    features: [
      {
        name: "Smart Autoplay",
        nameFr: "Autoplay intelligent",
        description: "The video starts playing automatically but muted. A customizable overlay with your message invites the viewer to click to unmute. This dramatically increases play rates (up to 3x) compared to a static play button.",
        descriptionFr: "La vidéo démarre automatiquement en sourdine. Un overlay personnalisable avec votre message invite le spectateur à cliquer pour activer le son. Cela augmente considérablement le taux de lecture (jusqu'à 3x) par rapport à un bouton play statique.",
        impact: "+200% play rate on average",
        impactFr: "+200% de taux de lecture en moyenne",
        howTo: "Player Settings → Smart Autoplay → Enable, customize the muted and click messages.",
        howToFr: "Paramètres du lecteur → Autoplay intelligent → Activer, personnaliser les messages.",
      },
      {
        name: "Fictitious Progress Bar",
        nameFr: "Barre de progression fictive",
        description: "The progress bar moves faster during the first part of the video, making viewers feel they've already watched more than they have. This psychological trick reduces early drop-offs.",
        descriptionFr: "La barre de progression avance plus vite au début de la vidéo, donnant l'impression au spectateur d'avoir déjà regardé plus. Cette astuce psychologique réduit les abandons précoces.",
        impact: "+15-30% retention improvement",
        impactFr: "+15-30% d'amélioration de la rétention",
      },
      {
        name: "Recovery Thumbnail",
        nameFr: "Image de récupération",
        description: "When a viewer pauses or gets distracted, a clickable image overlay appears after a configurable delay to re-engage them.",
        descriptionFr: "Quand un spectateur met en pause ou est distrait, une image cliquable apparaît après un délai configurable pour le réengager.",
      },
      {
        name: "Resume Play",
        nameFr: "Reprise de lecture",
        description: "Returning visitors see a prompt to continue watching from where they left off. Position is saved in the browser for up to 7 days.",
        descriptionFr: "Les visiteurs de retour voient une invitation à reprendre la lecture là où ils se sont arrêtés. La position est sauvegardée dans le navigateur pendant 7 jours.",
      },
      {
        name: "Player Customization",
        nameFr: "Personnalisation du lecteur",
        description: "Full control over colors (primary, controls, background), border radius, which controls to show/hide (play, volume, fullscreen, speed, rewind, timer), and auto-hide behavior.",
        descriptionFr: "Contrôle total sur les couleurs (principale, contrôles, fond), rayons des bords, quels contrôles afficher/masquer, et le masquage automatique.",
      },
    ],
  },
  {
    id: "engagement",
    icon: Eye,
    title: "Engagement & Conversion",
    titleFr: "Engagement & Conversion",
    color: "text-emerald-400",
    features: [
      {
        name: "CTA Buttons",
        nameFr: "Boutons CTA",
        description: "Timed call-to-action buttons that appear at a specific timestamp in the video. Customizable text, colors, position (inside video or below), font, shape (rounded/pill/square), and duration. Can stay forever or disappear after X seconds.",
        descriptionFr: "Boutons d'appel à l'action temporisés qui apparaissent à un moment précis de la vidéo. Texte, couleurs, position, police, forme et durée personnalisables. Peut rester indéfiniment ou disparaître après X secondes.",
        impact: "Direct conversion driver — typically 5-15% click rate",
        impactFr: "Moteur de conversion direct — taux de clic typique de 5-15%",
        howTo: "Video → CTAs → Add CTA → Configure text, URL, timestamp, style.",
        howToFr: "Vidéo → CTAs → Ajouter CTA → Configurer texte, URL, timestamp, style.",
      },
      {
        name: "Headlines A/B Testing",
        nameFr: "Titres A/B Testing",
        description: "Add text, image, or GIF headlines above/below/overlaying your video. Create multiple variants and A/B test them to find the best performer. 65+ Google Fonts available.",
        descriptionFr: "Ajoutez des titres (texte, image, GIF) au-dessus/en-dessous/en overlay de votre vidéo. Créez des variantes et testez-les en A/B. 65+ polices Google disponibles.",
        impact: "Find the headline that converts best",
        impactFr: "Trouvez le titre qui convertit le mieux",
      },
      {
        name: "Exit-Intent Popup",
        nameFr: "Popup de sortie",
        description: "Shows a customizable popup when the visitor tries to leave the page (mouse leaves window, tab switch, back button, or idle timeout). Recovers abandoning visitors.",
        descriptionFr: "Affiche un popup personnalisable quand le visiteur essaie de quitter la page (souris hors fenêtre, changement d'onglet, bouton retour, ou inactivité). Récupère les visiteurs qui abandonnent.",
        impact: "Recover 5-15% of abandoning visitors",
        impactFr: "Récupère 5-15% des visiteurs qui abandonnent",
      },
      {
        name: "Mini-Hook",
        nameFr: "Mini-Hook",
        description: "Small notification banners that appear at key moments (25%, 50%, 75%) to maintain viewer attention with engaging messages.",
        descriptionFr: "Petites notifications qui apparaissent aux moments clés (25%, 50%, 75%) pour maintenir l'attention avec des messages engageants.",
      },
      {
        name: "Countdown Timer",
        nameFr: "Compte à rebours",
        description: "Display a countdown timer on the video to create urgency. Supports realtime, session-based, or evergreen countdowns.",
        descriptionFr: "Affiche un compte à rebours sur la vidéo pour créer de l'urgence. Supporte les décomptes en temps réel, par session ou evergreen.",
      },
      {
        name: "Social Proof",
        nameFr: "Preuve sociale",
        description: "Toast notifications showing social proof messages (purchases, signups) at configurable intervals to build trust.",
        descriptionFr: "Notifications toast montrant des preuves sociales (achats, inscriptions) à intervalles configurables pour renforcer la confiance.",
      },
      {
        name: "Interactive Polls",
        nameFr: "Sondages interactifs",
        description: "Add single or multiple choice polls during video playback. Can pause the video while voting. Shows results after answering.",
        descriptionFr: "Ajoutez des sondages à choix unique ou multiple pendant la lecture. Peut mettre en pause la vidéo pendant le vote. Affiche les résultats après réponse.",
      },
    ],
  },
  {
    id: "tracking",
    icon: BarChart3,
    title: "Analytics & Tracking",
    titleFr: "Analytiques & Suivi",
    color: "text-blue-400",
    features: [
      {
        name: "Video Analytics",
        nameFr: "Analytiques vidéo",
        description: "Complete analytics dashboard per video: total plays, unique viewers, watch time, completion rate, pause points, seek patterns, CTA click-through rate, returning viewers, device breakdown (desktop/mobile).",
        descriptionFr: "Tableau de bord analytique complet par vidéo : lectures totales, visiteurs uniques, temps de visionnage, taux de complétion, points de pause, patterns de navigation, CTR des CTA, visiteurs récurrents, répartition par appareil.",
      },
      {
        name: "Engagement Heatmap",
        nameFr: "Heatmap d'engagement",
        description: "Visual color-coded heatmap showing which parts of the video are most watched, where viewers pause, and where they seek. Identifies your strongest and weakest content sections.",
        descriptionFr: "Heatmap visuelle en couleurs montrant les parties les plus regardées, où les spectateurs mettent en pause et où ils naviguent. Identifie vos sections de contenu les plus fortes et les plus faibles.",
      },
      {
        name: "Drop-off Funnel",
        nameFr: "Entonnoir d'abandon",
        description: "Shows where viewers stop watching with a visual funnel chart. Identifies the exact percentage where the biggest drop-off occurs.",
        descriptionFr: "Montre où les spectateurs arrêtent de regarder avec un graphique en entonnoir. Identifie le pourcentage exact du plus gros abandon.",
      },
      {
        name: "Tracking Pixels",
        nameFr: "Pixels de suivi",
        description: "Integrate Facebook Pixel, Google Analytics (GA4), and TikTok Pixel. Auto-fires PageView and ViewContent events. Add custom conversion events triggered at specific timestamps. Optional fire delay to filter casual visitors.",
        descriptionFr: "Intégrez Facebook Pixel, Google Analytics (GA4) et TikTok Pixel. Déclenche automatiquement les événements PageView et ViewContent. Ajoutez des événements de conversion personnalisés. Délai optionnel pour filtrer les visiteurs occasionnels.",
      },
    ],
  },
  {
    id: "advanced",
    icon: Sliders,
    title: "Advanced Features",
    titleFr: "Fonctionnalités avancées",
    color: "text-violet-400",
    features: [
      {
        name: "Video Funnels",
        nameFr: "Funnels vidéo",
        description: "Chain multiple videos into a seamless sequence (hook → body → CTA → bonus). The viewer experiences one continuous video. Supports A/B testing per step, combined progress bar, and preloading.",
        descriptionFr: "Enchaînez plusieurs vidéos en une séquence fluide (hook → body → CTA → bonus). Le spectateur vit une expérience vidéo continue. Supporte l'A/B testing par étape, la barre combinée et le préchargement.",
        impact: "Structure your sales message for maximum impact",
        impactFr: "Structurez votre message de vente pour un impact maximum",
      },
      {
        name: "Traffic Filter",
        nameFr: "Filtre de trafic",
        description: "Control who sees your video based on browser language, country (GeoIP), device type, URL parameters, VPN/proxy detection, and bot filtering. Non-matching visitors see a redirect video or URL.",
        descriptionFr: "Contrôlez qui voit votre vidéo selon la langue du navigateur, le pays (GeoIP), le type d'appareil, les paramètres URL, la détection VPN/proxy et le filtrage des bots.",
      },
      {
        name: "Page Sync",
        nameFr: "Synchronisation de page",
        description: "Show, hide, or scroll to page elements based on video progress. Reveal content, buttons, or sections as the viewer watches.",
        descriptionFr: "Affichez, masquez ou scrollez vers des éléments de la page selon la progression vidéo. Révélez du contenu à mesure que le spectateur regarde.",
      },
      {
        name: "Chapters",
        nameFr: "Chapitres",
        description: "Add chapter markers to the video timeline. Viewers can see the video structure and jump to specific sections.",
        descriptionFr: "Ajoutez des marqueurs de chapitres sur la timeline. Les spectateurs peuvent voir la structure et sauter à des sections spécifiques.",
      },
      {
        name: "Playback Options",
        nameFr: "Options de lecture",
        description: "Control seeking (disable to force linear watching), speed controls, quality selection, keyboard shortcuts, looping, and preload strategy.",
        descriptionFr: "Contrôlez la navigation (désactiver pour forcer le visionnage linéaire), les contrôles de vitesse, la sélection de qualité, les raccourcis clavier, la boucle et la stratégie de préchargement.",
      },
      {
        name: "Turbo Speed",
        nameFr: "Vitesse Turbo",
        description: "Slightly adjusts playback speed (0.95x to 1.15x) invisibly to the viewer and A/B tests which speed drives the best conversion rate.",
        descriptionFr: "Ajuste légèrement la vitesse de lecture (0.95x à 1.15x) de manière invisible et teste en A/B quelle vitesse génère le meilleur taux de conversion.",
      },
    ],
  },
  {
    id: "hosting",
    icon: Globe,
    title: "Hosting & Delivery",
    titleFr: "Hébergement & Diffusion",
    color: "text-amber-400",
    features: [
      {
        name: "HLS Multi-Quality Transcoding",
        nameFr: "Transcodage HLS multi-qualité",
        description: "Videos are automatically transcoded into multiple quality levels (360p, 480p, 720p, 1080p) with adaptive bitrate streaming. Viewers always get the best quality their connection can handle.",
        descriptionFr: "Les vidéos sont automatiquement transcodées en plusieurs niveaux de qualité (360p, 480p, 720p, 1080p) avec streaming adaptatif. Les spectateurs obtiennent toujours la meilleure qualité que leur connexion peut supporter.",
      },
      {
        name: "Global CDN",
        nameFr: "CDN mondial",
        description: "Videos are served through Cloudflare's global CDN with 200+ data centers worldwide. Zero egress fees.",
        descriptionFr: "Les vidéos sont servies via le CDN mondial Cloudflare avec 200+ datacenters. Aucun frais de bande passante.",
      },
      {
        name: "Video Library",
        nameFr: "Bibliothèque vidéo",
        description: "Organize videos with folders and categories (hook, body, CTA, bonus, custom). Grid and list views with search and filtering.",
        descriptionFr: "Organisez vos vidéos avec des dossiers et catégories (hook, body, CTA, bonus, custom). Vues en grille et liste avec recherche et filtres.",
      },
      {
        name: "Embed System",
        nameFr: "Système d'intégration",
        description: "Simple embed code (one div + one script tag) that works on any website. Supports both single videos and video funnels.",
        descriptionFr: "Code d'intégration simple (un div + un script) qui fonctionne sur tout site web. Supporte les vidéos uniques et les funnels vidéo.",
      },
    ],
  },
];

export default function DocsPage() {
  const [openSection, setOpenSection] = useState<string | null>("player");
  const [lang, setLang] = useState<"en" | "fr">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("sp_lang") as "en" | "fr") || "en";
    }
    return "en";
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            {lang === "fr" ? "Documentation des fonctionnalités" : "Features Documentation"}
          </h1>
          <p className="text-muted-foreground">
            {lang === "fr" ? "Guide complet de toutes les fonctionnalités SlyPlayer." : "Complete guide to all SlyPlayer features."}
          </p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setLang("en")} className={`text-xs px-2 py-1 rounded ${lang === "en" ? "bg-primary text-white" : "text-muted-foreground"}`}>EN</button>
          <button onClick={() => setLang("fr")} className={`text-xs px-2 py-1 rounded ${lang === "fr" ? "bg-primary text-white" : "text-muted-foreground"}`}>FR</button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { n: docs.reduce((s, d) => s + d.features.length, 0), l: lang === "fr" ? "Fonctionnalités" : "Features" },
          { n: 5, l: lang === "fr" ? "Catégories" : "Categories" },
          { n: 3, l: lang === "fr" ? "Plateformes pixel" : "Pixel Platforms" },
          { n: "65+", l: lang === "fr" ? "Polices Google" : "Google Fonts" },
        ].map((s, i) => (
          <Card key={i}>
            <div className="text-center py-2">
              <div className="text-2xl font-bold text-primary">{s.n}</div>
              <div className="text-xs text-muted-foreground">{s.l}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Sections */}
      {docs.map((section) => (
        <div key={section.id} className="mb-4">
          <button
            onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/30 transition-all bg-card"
          >
            <section.icon className={`w-5 h-5 ${section.color}`} />
            <span className="font-semibold flex-1 text-left">{lang === "fr" ? section.titleFr : section.title}</span>
            <Badge variant="default">{section.features.length}</Badge>
            {openSection === section.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>

          {openSection === section.id && (
            <div className="mt-2 space-y-3 pl-4 border-l-2 border-primary/20 ml-6">
              {section.features.map((feature, i) => (
                <Card key={i} className="ml-2">
                  <CardTitle className="text-base mb-2">{lang === "fr" ? feature.nameFr : feature.name}</CardTitle>
                  <CardContent className="p-0">
                    <p className="text-sm text-muted-foreground mb-3">
                      {lang === "fr" ? feature.descriptionFr : feature.description}
                    </p>
                    {(feature.impact || feature.impactFr) && (
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="success" className="text-[10px]">
                          {lang === "fr" ? feature.impactFr : feature.impact}
                        </Badge>
                      </div>
                    )}
                    {(feature.howTo || feature.howToFr) && (
                      <p className="text-xs text-primary/80 bg-primary/5 rounded px-2 py-1.5">
                        {lang === "fr" ? "Comment : " : "How to: "}{lang === "fr" ? feature.howToFr : feature.howTo}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
