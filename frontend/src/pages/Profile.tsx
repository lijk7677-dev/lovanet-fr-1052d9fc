import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import NeonFooterBar from "@/components/NeonFooterBar";
import { LocalizedHead } from "@/components/LocalizedHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  User, MapPin, Trophy, Coins, Star, Settings, Image as ImageIcon,
  LogOut, Heart, Clock, Play, Gift, ShieldCheck, Mail, Phone, Edit2
} from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    phone: "",
    street: "",
    city: "",
    postal_code: "",
    country: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
      toast.error("Veuillez vous connecter pour accéder à votre profil.");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      // Fetch full profile from backend
      fetch(`${process.env.REACT_APP_BACKEND_URL}/api/profile/me`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("lovanet_session_token") || ""}`,
        }
      })
      .then(res => res.json())
      .then(data => {
        setProfileData(data);
        setEditForm({
          name: data.name || "",
          bio: data.bio || "",
          phone: data.phone || "",
          street: data.address?.street || "",
          city: data.address?.city || "",
          postal_code: data.address?.postal_code || "",
          country: data.address?.country || "",
        });
      })
      .catch(err => console.error(err));
    }
  }, [user]);

  const handleSave = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/profile/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("lovanet_session_token") || ""}`,
        },
        body: JSON.stringify({
          name: editForm.name,
          bio: editForm.bio,
          phone: editForm.phone,
          address: {
            street: editForm.street,
            city: editForm.city,
            postal_code: editForm.postal_code,
            country: editForm.country,
          }
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfileData(updated);
        setIsEditing(false);
        toast.success("Profil mis à jour avec succès !");
      }
    } catch (e) {
      toast.error("Erreur lors de la mise à jour du profil.");
    }
  };

  if (loading || !profileData) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const { rewards, premium, address, wishlist } = profileData;
  const progressPercent = (rewards.xp % 1000) / 10; // Assuming 1000 XP per level

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-sans">
      <Navbar />
      <div className="h-16" />

      {/* IDEA 1: Bannière animée personnalisable */}
      <div className="relative h-[250px] md:h-[350px] w-full overflow-hidden">
        <img 
          src={premium.banner_url} 
          alt="Profile Banner" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        {/* Profile Info Overlay */}
        <div className="absolute bottom-0 w-full px-4 md:px-10 pb-6 flex flex-col md:flex-row items-end md:items-center gap-6">
          
          {/* IDEA 2 & 10: Cadre d'avatar évolutif & Aura de profil */}
          <div className="relative group">
            <div 
              className="absolute -inset-2 rounded-full opacity-60 blur-md animate-pulse"
              style={{ backgroundColor: premium.profile_aura }}
            />
            <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-background overflow-hidden bg-muted">
              {profileData.picture ? (
                <img src={profileData.picture} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-full h-full p-6 text-muted-foreground" />
              )}
            </div>
            <button className="absolute bottom-0 right-0 bg-background border border-white/10 p-2 rounded-full hover:bg-white/10 transition-colors">
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 mb-2 md:mb-0">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ textShadow: `0 0 20px ${premium.profile_aura}80` }}>
                {profileData.name || "Otaku Anonyme"}
              </h1>
              {/* IDEA 9: Titres honorifiques */}
              <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-bold text-white/90 backdrop-blur-md">
                {premium.title}
              </span>
            </div>
            <p className="text-white/60 mt-1 flex items-center gap-2">
              <Mail className="w-4 h-4" /> {profileData.email}
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 backdrop-blur-md" onClick={() => setIsEditing(!isEditing)}>
              <Edit2 className="w-4 h-4 mr-2" />
              {isEditing ? "Annuler" : "Éditer le Profil"}
            </Button>
            <Button variant="destructive" className="rounded-full" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        
        {/* Left Column */}
        <div className="space-y-8">
          
          {/* IDEA 3: Système de Niveau et d'XP */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/50 font-bold">Progression</p>
                  <h3 className="text-xl font-black mt-1">Niveau {rewards.level} <span className="text-white/50 text-sm">({rewards.rank})</span></h3>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{rewards.xp} XP</p>
                  <p className="text-xs text-white/50">Prochain niveau à {((Math.floor(rewards.xp / 1000) + 1) * 1000)} XP</p>
                </div>
              </div>
              <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="infos" className="w-full">
            <TabsList className="w-full bg-white/5 border border-white/10 p-1 rounded-xl grid grid-cols-3">
              <TabsTrigger value="infos" className="rounded-lg">Informations</TabsTrigger>
              <TabsTrigger value="wishlist" className="rounded-lg">Wishlist</TabsTrigger>
              <TabsTrigger value="stats" className="rounded-lg">Statistiques</TabsTrigger>
            </TabsList>

            <TabsContent value="infos" className="mt-6 space-y-6">
              {isEditing ? (
                <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Nom complet</label>
                      <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="bg-black/50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Téléphone</label>
                      <Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="bg-black/50" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Biographie</label>
                      <Input value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} className="bg-black/50" />
                    </div>
                  </div>
                  
                  <Separator className="bg-white/10 my-4" />
                  <h4 className="font-bold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" /> Adresse de livraison</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Adresse</label>
                      <Input value={editForm.street} onChange={e => setEditForm({...editForm, street: e.target.value})} className="bg-black/50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Code Postal</label>
                      <Input value={editForm.postal_code} onChange={e => setEditForm({...editForm, postal_code: e.target.value})} className="bg-black/50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Ville</label>
                      <Input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} className="bg-black/50" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Pays</label>
                      <Input value={editForm.country} onChange={e => setEditForm({...editForm, country: e.target.value})} className="bg-black/50" />
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} className="rounded-full px-8 bg-primary text-primary-foreground font-bold">
                      Enregistrer les modifications
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                    <h4 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-4">À propos</h4>
                    <p className="text-sm leading-relaxed">{profileData.bio || "Aucune biographie renseignée."}</p>
                    <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
                      <Phone className="w-4 h-4" /> {profileData.phone || "Non renseigné"}
                    </div>
                  </div>
                  
                  <div className="bg-white/5 border border-white/10 p-5 rounded-2xl relative overflow-hidden">
                    <MapPin className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5" />
                    <h4 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-4 relative z-10">Adresse Principale</h4>
                    {address.street ? (
                      <div className="space-y-1 text-sm relative z-10">
                        <p className="font-bold">{profileData.name}</p>
                        <p>{address.street}</p>
                        <p>{address.postal_code} {address.city}</p>
                        <p className="text-white/60">{address.country}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-white/50 relative z-10">Aucune adresse renseignée.</p>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="wishlist" className="mt-6">
              {/* IDEA 6: Historique holographique (Wishlist Interactive) */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[300px]">
                <h4 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" /> Ma Wishlist
                </h4>
                {wishlist.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {wishlist.map((itemId: string) => (
                      <div key={itemId} className="aspect-[3/4] rounded-xl bg-black/40 border border-white/10 flex items-center justify-center flex-col gap-2 group hover:border-white/30 transition-colors cursor-pointer">
                        <Play className="w-8 h-8 text-white/20 group-hover:text-white/80 transition-colors" />
                        <span className="text-xs text-white/50 font-bold">Item #{itemId}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-white/40">
                    <Heart className="w-12 h-12 mb-3 opacity-20" />
                    <p className="font-medium">Votre wishlist est vide.</p>
                    <p className="text-xs mt-1">Explorez le catalogue pour y ajouter des animes.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="stats" className="mt-6">
              {/* IDEA 5: Statistiques de visionnage */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <Clock className="w-8 h-8 text-sky-400 mb-2" />
                    <span className="text-3xl font-black">{Math.round(rewards.watch_time_mins / 60)}h</span>
                    <span className="text-xs uppercase tracking-widest text-white/50 font-bold mt-1">Temps de visionnage</span>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <Play className="w-8 h-8 text-purple-400 mb-2" />
                    <span className="text-3xl font-black">{wishlist.length * 3 + 12}</span>
                    <span className="text-xs uppercase tracking-widest text-white/50 font-bold mt-1">Épisodes vus</span>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* IDEA 7: Carte Membre Virtuelle Lovanet Premium (Holographic Tilt Card) */}
          <div className="perspective-1000 relative w-full aspect-[1.6/1] group cursor-pointer">
            <div className="w-full h-full transition-transform duration-500 transform-style-3d group-hover:rotate-y-12 group-hover:rotate-x-12 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-white/20 shadow-2xl p-5 flex flex-col justify-between overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {/* Holographic overlay */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/holographic-foil.png')] opacity-10 mix-blend-color-dodge" />
              
              <div className="flex justify-between items-start relative z-10">
                <div className="font-display font-black text-xl tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-500">
                  LOVANET PREMIUM
                </div>
                <ShieldCheck className="w-6 h-6 text-amber-400" />
              </div>
              
              <div className="relative z-10">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 mb-1">Membre Officiel</p>
                <p className="font-mono text-lg tracking-widest text-white/90">{profileData.user_id.split('_')[1].toUpperCase().replace(/(.{4})/g, '$1 ')}</p>
                <div className="flex justify-between items-end mt-4">
                  <p className="font-bold text-sm">{profileData.name.toUpperCase()}</p>
                  <p className="text-xs font-bold text-amber-400">{rewards.rank}</p>
                </div>
              </div>
            </div>
          </div>

          {/* IDEA 8: Boutique de récompenses & Portefeuille */}
          <Card className="bg-white/5 border-white/10 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 p-4 flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-amber-400">Portefeuille</h4>
              </div>
              <span className="text-2xl font-black text-amber-400">{rewards.lova_coins}</span>
            </div>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-white/60 text-center mb-4">Utilisez vos LovaCoins pour débloquer des avantages exclusifs.</p>
              
              <Button variant="outline" className="w-full justify-start border-white/10 bg-black/40 hover:bg-white/10 text-sm">
                <Gift className="w-4 h-4 mr-3 text-pink-400" /> Avatars Premium (Boutique)
              </Button>
              <Button variant="outline" className="w-full justify-start border-white/10 bg-black/40 hover:bg-white/10 text-sm">
                <Trophy className="w-4 h-4 mr-3 text-sky-400" /> Titres Honorifiques
              </Button>
              <Button variant="outline" className="w-full justify-start border-white/10 bg-black/40 hover:bg-white/10 text-sm">
                <Settings className="w-4 h-4 mr-3 text-white/60" /> Préférences Profil
              </Button>
            </CardContent>
          </Card>
          
          {/* IDEA 4: Badges d'accomplissement (Preview) */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <h4 className="text-sm font-bold flex items-center gap-2 mb-4"><Star className="w-4 h-4 text-yellow-400" /> Derniers Badges</h4>
              <div className="flex gap-2">
                {["🚀", "📰", "🍿", "🦉"].map((emoji, i) => (
                  <div key={i} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl hover:scale-110 transition-transform cursor-pointer">
                    {emoji}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </main>

      <NeonFooterBar />
    </div>
  );
}