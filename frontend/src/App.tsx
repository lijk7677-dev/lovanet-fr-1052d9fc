import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { PerformanceProvider } from "@/contexts/PerformanceContext";
import { ThemeBubble } from "./components/ThemeBubble";
import { CartProvider } from "./context/CartContext";
import { CartDrawer } from "./components/CartDrawer";
import GoogleTranslate from "./components/GoogleTranslate";
import { LocalizedHead } from "./components/LocalizedHead";
import { AuthProvider } from "./contexts/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

const Index = lazy(() => import("./pages/Index"));
const RootLandingPage = lazy(() => import("./pages/RootLandingPage"));
const ChaineYoutube = lazy(() => import("./pages/ChaineYoutube"));
const ChaineYoutubeManga = lazy(() => import("./pages/ChaineYoutubeManga"));
const LecteursVideo = lazy(() => import("./pages/LecteursVideo"));
const PrimeVideo = lazy(() => import("./pages/PrimeVideo"));
const Tiktok = lazy(() => import("./pages/Tiktok"));
const Shop = lazy(() => import("./pages/Shop"));
const Contact = lazy(() => import("./pages/Contact"));
const Legals = lazy(() => import("./pages/Legals"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AnimeCountdown = lazy(() => import("./pages/AnimeCountdown"));
const AnimeCatalog = lazy(() => import("./pages/AnimeCatalog"));
const Discover = lazy(() => import("./pages/Discover"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const SyncDashboard = lazy(() => import("./pages/SyncDashboard"));
const Actualites = lazy(() => import("./pages/Actualites"));
const HubTrainStationStandalone = lazy(() => import("./pages/HubTrainStationStandalone"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const HubFerryStandalone = lazy(() => import("./pages/HubFerryStandalone"));
const Profile = lazy(() => import("./pages/Profile"));
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AiHub = lazy(() => import("./pages/AiHub").then((module) => ({ default: module.AiHub })));
const Onboarding3D = lazy(() => import("./components/Onboarding3D").then((module) => ({ default: module.Onboarding3D })));

import { GlobalTranslateWidget } from "./components/GlobalTranslateWidget";
import { PiPProvider } from "./contexts/PiPContext";
import { GamificationProvider } from "./contexts/GamificationContext";
import { GlobalPiPWidget } from "./components/GlobalPiPWidget";
import { Mobile3DSettingsToggle } from "./components/Mobile3DSettingsToggle";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@/lib/seoI18n";
import { usePushNotifications } from "./hooks/usePushNotifications";

const queryClient = new QueryClient();
const LOCALE_PREFIXES = SUPPORTED_LOCALES.filter((l) => l !== DEFAULT_LOCALE);

const APP_ROUTES: Array<{ path: string; element: JSX.Element }> = [
  { path: "/", element: <RootLandingPage /> },
  { path: "/anime-moments", element: <Index /> },
  { path: "/chaine-youtube", element: <ChaineYoutube /> },
  { path: "/chaine-youtube/manga", element: <ChaineYoutubeManga /> },
  { path: "/lecteurs-video", element: <LecteursVideo /> },
  { path: "/prime-video", element: <PrimeVideo /> },
  { path: "/tiktok", element: <Tiktok /> },
  { path: "/shop", element: <Shop /> },
  { path: "/contact", element: <Contact /> },
  { path: "/profile", element: <Profile /> },
  { path: "/legals", element: <Legals /> },
  { path: "/leaderboard", element: <Leaderboard /> },
  { path: "/anime-countdown", element: <AnimeCountdown /> },
  { path: "/anime-catalog", element: <AnimeCatalog /> },
  { path: "/actualites", element: <Actualites /> },
  { path: "/actualites/:slug", element: <Actualites /> },
  { path: "/decouvrir", element: <Discover /> },
  { path: "/hub/train-station", element: <HubTrainStationStandalone /> },
  { path: "/hub/ferry", element: <HubFerryStandalone /> },
  { path: "/login", element: <Login /> },
];

const REDIRECTS: Array<{ from: string; to: string }> = [
  { from: "/home", to: "/anime-moments" },
  { from: "/accueil", to: "/anime-moments" },
  { from: "/youtube", to: "/chaine-youtube" },
  { from: "/anime-moments-youtube", to: "/chaine-youtube" },
  { from: "/animemoments", to: "/chaine-youtube" },
  { from: "/animemomentsanimeofficiel", to: "/chaine-youtube" },
  { from: "/discover", to: "/decouvrir" },
  { from: "/prime", to: "/prime-video" },
  { from: "/amazon-prime", to: "/prime-video" },
  { from: "/tik-tok", to: "/tiktok" },
  { from: "/classement", to: "/leaderboard" },
  { from: "/boutique", to: "/shop" },
  { from: "/catalogue", to: "/anime-catalog" },
  { from: "/anime", to: "/anime-catalog" },
  { from: "/a-venir", to: "/anime-countdown" },
  { from: "/countdown", to: "/anime-countdown" },
  { from: "/admin", to: "/admin/sync" },
];

const AppShell = () => {
  usePushNotifications();
  const location = useLocation();
  if (location.hash?.includes('session_id=')) { return <AuthCallback />; }

  const pathname = location.pathname;
  const isHubPreviewRoute = pathname.startsWith("/hub/") || LOCALE_PREFIXES.some((lang) => pathname.startsWith(`/${lang}/hub/`));
  const rootPaths = new Set(["/", ...LOCALE_PREFIXES.map((lang) => `/${lang}`)]);
  const isRootLandingRoute = rootPaths.has(pathname);
  const isCatalogLikeRoute = pathname.startsWith("/anime-catalog") || pathname.startsWith("/tiktok") || pathname.startsWith("/anime-countdown") || LOCALE_PREFIXES.some((lang) => pathname.startsWith(`/${lang}/anime-catalog`) || pathname.startsWith(`/${lang}/tiktok`) || pathname.startsWith(`/${lang}/anime-countdown`));

  return (
    <PiPProvider>
      <GamificationProvider>
        <CartProvider>
          {!isHubPreviewRoute && <LocalizedHead />}
          <Toaster />
          <Suspense fallback={null}>
            {!isHubPreviewRoute && isRootLandingRoute && <Onboarding3D />}
          </Suspense>
          <Sonner />
          {!isHubPreviewRoute && <GlobalTranslateWidget />}
          {!isHubPreviewRoute && <GlobalPiPWidget />}
          <AnimatePresence mode="wait">
            <Suspense fallback={null}>
              <Routes location={location} key={location.pathname}>
                {APP_ROUTES.map((r) => (
                  <Route key={r.path} path={r.path} element={<motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }} className="w-full h-full">{r.element}</motion.div>} />
                ))}
              {LOCALE_PREFIXES.flatMap((lang) =>
                APP_ROUTES.map((r) => (
                  <Route
                    key={`${lang}-${r.path}`}
                    path={r.path === "/" ? `/${lang}` : `/${lang}${r.path}`}
                    element={<motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }} className="w-full h-full">{r.element}</motion.div>}
                  />
                )),
              )}
              {REDIRECTS.map((r) => (
                <Route key={`redir-${r.from}`} path={r.from} element={<Navigate to={r.to} replace />} />
              ))}
              <Route path="/admin/sync" element={<motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }} className="w-full h-full"><SyncDashboard /></motion.div>} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="/login" element={<motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }} className="w-full h-full"><Login /></motion.div>} />
              <Route path="/ai-hub" element={<motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }} className="w-full h-full"><AiHub /></motion.div>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </AnimatePresence>
      {!isHubPreviewRoute && <ThemeBubble />}
      {!isHubPreviewRoute && <Mobile3DSettingsToggle />}
      {!isHubPreviewRoute && <CartDrawer />}
      {!isHubPreviewRoute && <GoogleTranslate />}
        </CartProvider>
      </GamificationProvider>
    </PiPProvider>
  );
};

const App = () => (
  <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || "mock_client_id"}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <PerformanceProvider>
              <AppShell />
            </PerformanceProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </GoogleOAuthProvider>
);

export default App;
