import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { PageShell } from "@/components/PageShell";
import { Trophy, Coins, Star, Crown, Medal, ArrowUp } from "lucide-react";
import { useGamification } from "@/contexts/GamificationContext";
import { useAuth } from "@/contexts/AuthContext";

const LEADERBOARD_TOP_VIDEO = "/leaderboard-banner.mp4";

// Mock data for the leaderboard to make it look alive
const MOCK_LEADERBOARD = [
  { id: "u1", name: "Kira_99", coins: 8450, achievements: 24, color: "#f472b6", isCurrentUser: false },
  { id: "u2", name: "NeonNinja", coins: 7200, achievements: 21, color: "#38bdf8", isCurrentUser: false },
  { id: "u3", name: "SakuraBot", coins: 6100, achievements: 18, color: "#22c55e", isCurrentUser: false },
  { id: "u4", name: "GokuLevel", coins: 5900, achievements: 18, color: "#facc15", isCurrentUser: false },
  { id: "u5", name: "CyberSamurai", coins: 4800, achievements: 15, color: "#ef4444", isCurrentUser: false },
  { id: "u6", name: "LovaFan_FR", coins: 4200, achievements: 14, color: null, isCurrentUser: false },
  { id: "u7", name: "MangaReaderX", coins: 3850, achievements: 12, color: null, isCurrentUser: false },
  { id: "u8", name: "IsekaiHero", coins: 3100, achievements: 10, color: "#38bdf8", isCurrentUser: false },
  { id: "u9", name: "SpeedRunner", coins: 2950, achievements: 9, color: null, isCurrentUser: false },
  { id: "u10", name: "OtakuKing", coins: 2400, achievements: 8, color: "#facc15", isCurrentUser: false },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const { lovaCoins, achievements, neonColor } = useGamification();

  // Combine real user with mock users and sort
  const rankingList = useMemo(() => {
    let list = [...MOCK_LEADERBOARD];
    
    // Add current user if they have any activity
    if (user || lovaCoins > 0 || achievements.length > 0) {
      list.push({
        id: user?.user_id || "me",
        name: user?.name || "Vous (Otaku Anonyme)",
        coins: lovaCoins,
        achievements: achievements.length,
        color: neonColor,
        isCurrentUser: true
      } as any);
    }
    
    return list.sort((a, b) => b.coins - a.coins);
  }, [user, lovaCoins, achievements, neonColor]);

  return (
    <PageShell>
      <Helmet>
        <title>Classement Global — Lovanet</title>
      </Helmet>
      
      <section className="container mx-auto px-4 lg:px-8 py-12 md:py-20 max-w-5xl">
        <div className="mb-8 overflow-hidden rounded-[1.6rem] border border-white/10">
          <div className="aspect-[21/9] w-full">
            <video
              src={LEADERBOARD_TOP_VIDEO}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <header className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-bold tracking-widest uppercase mb-4 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
            <Trophy className="w-3.5 h-3.5" /> Leaderboard Officiel
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-white drop-shadow-xl">
            Temple de la <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 bg-clip-text text-transparent">Renommée</span>
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto text-sm md:text-base">
            Découvrez les membres les plus actifs de la communauté Lovanet. Accumulez des LovaCoins en complétant des quêtes journalières et débloquez des succès pour gravir les échelons.
          </p>
        </header>

        <div className="relative rounded-[2rem] border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[200px] bg-amber-500/10 blur-[100px] pointer-events-none" />
          
          <div className="relative z-10">
            <div className="grid grid-cols-[3rem_1fr_4rem_5rem] md:grid-cols-[4rem_1fr_8rem_8rem] gap-4 p-4 md:p-6 border-b border-white/5 text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/40">
              <div className="text-center">Rang</div>
              <div>Membre</div>
              <div className="text-right">Succès</div>
              <div className="text-right">LovaCoins</div>
            </div>

            <div className="divide-y divide-white/5">
              {rankingList.map((player, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                
                return (
                  <div 
                    key={player.id} 
                    className={`grid grid-cols-[3rem_1fr_4rem_5rem] md:grid-cols-[4rem_1fr_8rem_8rem] gap-4 p-4 md:p-6 items-center transition-colors hover:bg-white/5 ${player.isCurrentUser ? 'bg-sky-500/10 border-l-4 border-l-sky-400' : ''}`}
                  >
                    <div className="flex justify-center">
                      {rank === 1 ? (
                        <div className="w-8 h-8 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                          <Crown className="w-4 h-4" />
                        </div>
                      ) : rank === 2 ? (
                        <div className="w-8 h-8 rounded-full bg-slate-300/20 text-slate-300 flex items-center justify-center border border-slate-300/50">
                          <Medal className="w-4 h-4" />
                        </div>
                      ) : rank === 3 ? (
                        <div className="w-8 h-8 rounded-full bg-orange-700/20 text-orange-500 flex items-center justify-center border border-orange-600/50">
                          <Medal className="w-4 h-4" />
                        </div>
                      ) : (
                        <span className="font-display font-bold text-white/40">{rank}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div 
                        className={`w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm bg-white/10 ${player.color ? 'border-2' : 'border border-white/20'}`}
                        style={player.color ? { borderColor: player.color, boxShadow: `0 0 10px ${player.color}40` } : {}}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span 
                        className={`font-bold truncate text-sm md:text-base ${player.isCurrentUser ? 'text-sky-300' : 'text-white'}`}
                        style={player.color ? { color: '#fff', textShadow: `0 0 8px ${player.color}, 0 0 15px ${player.color}` } : {}}
                      >
                        {player.name}
                        {player.isCurrentUser && <span className="ml-2 text-[9px] uppercase tracking-wider bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/40">Vous</span>}
                      </span>
                    </div>

                    <div className="text-right flex items-center justify-end gap-1.5">
                      <Star className="w-3.5 h-3.5 text-white/30 hidden md:block" />
                      <span className="font-bold text-white/80">{player.achievements}</span>
                    </div>

                    <div className="text-right flex items-center justify-end gap-1.5 text-amber-400 font-display">
                      <Coins className="w-3.5 h-3.5 hidden md:block" />
                      <span className="font-black md:text-lg">{player.coins.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
          </div>
        </div>
        
        <div className="mt-8 text-center text-white/40 text-xs flex items-center justify-center gap-2">
          <ArrowUp className="w-3 h-3" /> Pensez à compléter vos quêtes journalières pour grimper dans le classement !
        </div>
      </section>
    </PageShell>
  );
}
