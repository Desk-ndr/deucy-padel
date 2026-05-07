import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PlayerProvider } from "@/contexts/PlayerContext";
import ErrorBoundary from "@/components/ErrorBoundary";

// Auth Components
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ProtectedAdminRoute } from "@/components/auth/ProtectedAdminRoute";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Join from "./pages/Join";
import Tournaments from "./pages/Tournaments";
import Matches from "./pages/Matches";
import Leaderboard from "./pages/Leaderboard";

import AuctionHouse from "./pages/AuctionHouse";
import AuctionLive from "./pages/Auction";
import LotDetail from "./pages/LotDetail";
import PledgeDetail from "./pages/PledgeDetail";
import Pledges from "./pages/Pledges";
import CompleteEntry from "./pages/CompleteEntry";
import PlayerProfile from "./pages/PlayerProfile";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import BlitzList from "./pages/BlitzList";
import BlitzTournament from "./pages/BlitzTournament";
import BlitzRanking from "./pages/BlitzRanking";
import BlitzJoin from "./pages/BlitzJoin";
import BlitzLogin from "./pages/BlitzLogin";
import BlitzHowItWorks from "./pages/BlitzHowItWorks";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTournamentCreate from "./pages/admin/AdminTournamentCreate";
import AdminTournamentDetail from "./pages/admin/AdminTournamentDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PlayerProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary label="root">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/blitz" replace />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/join" element={<Join />} />
            <Route path="/blitz" element={<BlitzList />} />
            <Route path="/p/:token" element={<BlitzJoin />} />
            <Route path="/blitz/login" element={<BlitzLogin />} />
            <Route path="/blitz/how-it-works" element={<BlitzHowItWorks />} />
            <Route path="/blitz/ranking" element={<BlitzRanking />} />
            <Route path="/blitz/:id" element={<BlitzTournament />} />

            {/* Protected player routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/complete-entry" element={<CompleteEntry />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/home" element={<Tournaments />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/auction" element={<AuctionHouse />} />
              <Route path="/auction/live" element={<AuctionLive />} />
              <Route path="/auction/lot/:lotId" element={<LotDetail />} />
              <Route path="/auction/pledge/:pledgeItemId" element={<LotDetail />} />
              <Route path="/auction/:pledgeId" element={<PledgeDetail />} />
              <Route path="/pledges" element={<Pledges />} />
              <Route path="/player/:playerId" element={<PlayerProfile />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Public admin login */}
            <Route path="/admin" element={<AdminLogin />} />

            {/* Protected admin routes */}
            <Route element={<ProtectedAdminRoute />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/tournaments/new" element={<AdminTournamentCreate />} />
              <Route path="/admin/tournaments/:tournamentId" element={<AdminTournamentDetail />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </PlayerProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
