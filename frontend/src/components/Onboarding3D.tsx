import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles, MeshTransmissionMaterial, ContactShadows } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Shield, Cpu, Bot, Sparkles as SparkleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as THREE from 'three';

// ---------------------------------------------------------
// 1. LOVA-BOT (Fairy / Plant Guide)
// ---------------------------------------------------------
const LovaBot = ({ isSpeaking }) => {
  const wingsRef = useRef(null);
  const coreRef = useRef(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (wingsRef.current) {
      wingsRef.current.children[0].rotation.y = Math.sin(t * 20) * 0.5;
      wingsRef.current.children[1].rotation.y = -Math.sin(t * 20) * 0.5;
    }
    if (coreRef.current && isSpeaking) {
      coreRef.current.scale.setScalar(1 + Math.sin(t * 10) * 0.2);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Glowing Core */}
      <mesh ref={coreRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial color="#a7f3d0" />
      </mesh>
      {/* Glass Shell */}
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <MeshTransmissionMaterial color="#10b981" transmission={0.9} thickness={0.5} roughness={0.1} />
      </mesh>
      {/* Wings */}
      <group ref={wingsRef}>
        <mesh position={[-0.6, 0.2, 0]} rotation={[0, 0.5, -0.2]}>
          <cylinderGeometry args={[0.01, 0.4, 0.8, 3]} />
          <meshBasicMaterial color="#34d399" wireframe />
        </mesh>
        <mesh position={[0.6, 0.2, 0]} rotation={[0, -0.5, 0.2]}>
          <cylinderGeometry args={[0.01, 0.4, 0.8, 3]} />
          <meshBasicMaterial color="#34d399" wireframe />
        </mesh>
      </group>
      <Sparkles count={20} scale={2} size={4} speed={0.4} color="#6ee7b7" />
    </group>
  );
};

// ---------------------------------------------------------
// 2. LOVA-AI (Crystalline Entity)
// ---------------------------------------------------------
const LovaAI = ({ isSpeaking }) => {
  const crystalsRef = useRef(null);
  const coreRef = useRef(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (crystalsRef.current) {
      crystalsRef.current.rotation.y = t * 0.5;
      crystalsRef.current.position.y = Math.sin(t * 2) * 0.2;
    }
    if (coreRef.current && isSpeaking) {
      coreRef.current.rotation.x = t * 2;
      coreRef.current.rotation.y = t * 2;
    }
  });

  return (
    <group>
      <group ref={crystalsRef}>
        {/* Main Crystal */}
        <mesh position={[0, 0, 0]}>
          <octahedronGeometry args={[0.8, 0]} />
          <MeshTransmissionMaterial color="#38bdf8" transmission={0.95} thickness={1} roughness={0.1} emissive="#0284c7" emissiveIntensity={0.2} />
        </mesh>
        {/* Orbiting Shards */}
        {Array.from({ length: 4 }).map((_, i) => (
          <mesh key={i} position={[Math.cos(i * Math.PI / 2) * 1.5, Math.sin(i) * 0.5, Math.sin(i * Math.PI / 2) * 1.5]} rotation={[i, i, i]}>
            <octahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial color="#818cf8" metalness={0.8} roughness={0.2} emissive="#4f46e5" emissiveIntensity={0.5} />
          </mesh>
        ))}
      </group>
      {/* Inner Data Core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.3, 0]} />
        <meshBasicMaterial color="#e879f9" wireframe />
      </mesh>
      <Sparkles count={40} scale={3} size={2} speed={1} color="#38bdf8" />
    </group>
  );
};

// ---------------------------------------------------------
// 3. LOVA KING AI (Wood/Stone Golem with Magic Core)
// ---------------------------------------------------------
const LovaKingAI = ({ isSpeaking }) => {
  const armsRef = useRef(null);
  const coreRef = useRef(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Breathing/Hovering
    if (coreRef.current && isSpeaking) {
      coreRef.current.scale.setScalar(1 + Math.sin(t * 8) * 0.1);
    }
    // Slowly moving heavy arms
    if (armsRef.current) {
      armsRef.current.children[0].position.y = -0.5 + Math.sin(t) * 0.2;
      armsRef.current.children[1].position.y = -0.5 + Math.sin(t + Math.PI) * 0.2;
    }
  });

  return (
    <group position={[0, -0.5, 0]}>
      {/* Wood Torso (Bark) */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.8, 0.5, 1.5, 7]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.2, 0.4]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[1.2, 0.8, 0.8]} />
        <meshStandardMaterial color="#452e23" roughness={1} />
      </mesh>

      {/* Glowing Inner Core (Soul) */}
      <mesh ref={coreRef} position={[0, 0.8, 0.2]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color="#34d399" />
      </mesh>

      {/* Floating Stone/Wood Arms */}
      <group ref={armsRef}>
        {/* Left Arm */}
        <group position={[-1.5, -0.5, 0.5]} rotation={[0, 0.2, 0.2]}>
          <mesh>
            <boxGeometry args={[0.8, 1.2, 0.8]} />
            <meshStandardMaterial color="#334155" roughness={0.8} />
          </mesh>
          {/* Glowing runes/vines on arm */}
          <mesh position={[0.41, 0, 0]}>
            <planeGeometry args={[0.2, 0.8]} />
            <meshBasicMaterial color="#34d399" />
          </mesh>
        </group>
        {/* Right Arm */}
        <group position={[1.5, -0.5, 0.5]} rotation={[0, -0.2, -0.2]}>
          <mesh>
            <boxGeometry args={[0.8, 1.2, 0.8]} />
            <meshStandardMaterial color="#452e23" roughness={1} />
          </mesh>
          <mesh position={[-0.41, 0, 0]}>
            <planeGeometry args={[0.2, 0.8]} />
            <meshBasicMaterial color="#34d399" />
          </mesh>
        </group>
      </group>

      {/* Horns/Branches on Head */}
      <mesh position={[-0.4, 1.8, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.1, 0.8, 4]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
      </mesh>
      <mesh position={[0.4, 1.8, 0]} rotation={[0, 0, -0.5]}>
        <coneGeometry args={[0.1, 0.8, 4]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
      </mesh>

      <Sparkles count={30} scale={4} size={6} speed={0.2} color="#10b981" />
    </group>
  );
};

// ---------------------------------------------------------
// COMPACT TRANSPARENT ONBOARDING / ASSISTANT WIDGET
// ---------------------------------------------------------

const stepsData = [
  {
    name: "Lova-Bot",
    icon: <Bot className="w-4 h-4" />,
    color: "from-green-400 to-emerald-500",
    text: "Je suis Lova-Bot ! Je t'accompagne dans tes premiers pas. N'hésite pas à explorer les vidéos et la boutique magique.",
    Component: LovaBot,
  },
  {
    name: "Lova-AI",
    icon: <Cpu className="w-4 h-4" />,
    color: "from-sky-400 to-indigo-400",
    text: "Intelligence cristalline connectée. Je filtre et optimise tes recommandations pour un univers Lovanet sur-mesure.",
    Component: LovaAI,
  },
  {
    name: "Lova King AI",
    icon: <Shield className="w-4 h-4" />,
    color: "from-amber-400 to-emerald-600",
    text: "Je suis Lova King AI, l'esprit millénaire de la forêt numérique. Je protège l'écosystème et garantis la puissance de Lovanet.",
    Component: LovaKingAI,
  }
];

export const Onboarding3D = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [step, setStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [botId, setBotId] = useState("lova-bot");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Determine current bot ID based on step
    if (step === 0) setBotId("lova-bot");
    if (step === 1) setBotId("lova-ai");
    if (step === 2) setBotId("lova-king");
    setChatResponse(""); // Reset chat when switching bots
  }, [step]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatResponse("");
    setIsTyping(true);
    setIsSpeaking(true);

    try {
      const res = await fetch(process.env.REACT_APP_BACKEND_URL + "/api/chat/lovanet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_type: botId,
          messages: [{ role: "user", content: userMsg }]
        })
      });

      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      setIsTyping(false);

      let accumulated = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setChatResponse(accumulated);
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }
    } catch (err) {
      console.error(err);
      setChatResponse("Erreur de connexion avec mes circuits.");
      setIsTyping(false);
    }
    
    setTimeout(() => setIsSpeaking(false), 2000);
  };

  useEffect(() => {
    const hasSeen = localStorage.getItem("lovanet_bots_intro_v5");
    if (hasSeen) {
      setMinimized(true);
    }
  }, []);

  useEffect(() => {
    setIsSpeaking(true);
    const timer = setTimeout(() => setIsSpeaking(false), 4000);
    return () => clearTimeout(timer);
  }, [step, minimized]);

  const handleNext = () => {
    if (step < stepsData.length - 1) {
      setStep(s => s + 1);
    } else {
      setMinimized(true);
      localStorage.setItem("lovanet_bots_intro_v5", "true");
    }
  };

  const handleClose = () => {
    setMinimized(true);
    localStorage.setItem("lovanet_bots_intro_v5", "true");
  };

  if (!isVisible) return null;

  const currentData = stepsData[step];
  const CurrentAvatar = currentData.Component;

  if (minimized) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        className="fixed bottom-5 right-3 z-[60] cursor-pointer sm:right-4 md:bottom-6 md:right-6"
        onClick={() => { setMinimized(false); setStep(0); }}
      >
        <div className="relative w-16 h-16 rounded-full border border-white/20 bg-black/40 backdrop-blur-md shadow-[0_0_20px_rgba(56,189,248,0.3)] overflow-hidden">
          <Canvas camera={{ position: [0, 0, 3] }}>
            <ambientLight intensity={1} />
            <directionalLight position={[5, 5, 5]} intensity={2} />
            <Float speed={3} rotationIntensity={0.5} floatIntensity={1}>
              <LovaBot isSpeaking={false} />
            </Float>
          </Canvas>
        </div>
        <div className="absolute -top-2 -right-2 bg-fuchsia-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse">
          IA
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed bottom-5 left-4 right-4 z-[60] pointer-events-auto sm:left-5 sm:right-5 md:bottom-6 md:left-auto md:right-6 md:w-[400px]"
      >
        <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)_inset]">
          
          <button 
            onClick={() => { setMinimized(true); localStorage.setItem("lovanet_bots_intro_v5", "true"); }}
            className="absolute top-3 right-3 p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition text-white z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-full h-[220px] relative bg-gradient-to-b from-transparent to-black/50">
            <Canvas camera={{ position: [0, 0.5, 4], fov: 50 }}>
              <ambientLight intensity={1.5} />
              <directionalLight position={[5, 5, 5]} intensity={2} color="#ffffff" />
              <directionalLight position={[-5, -5, -5]} intensity={1} color="#38bdf8" />
              <Float speed={2} rotationIntensity={0.1} floatIntensity={0.5}>
                <CurrentAvatar isSpeaking={isSpeaking} />
              </Float>
              <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1} maxPolarAngle={Math.PI/2} />
            </Canvas>
          </div>

          <div className="p-5 text-center relative z-10 border-t border-white/10 bg-black/60 flex flex-col justify-end">
            <h3 className={`text-xl font-black text-transparent bg-clip-text bg-gradient-to-r ${currentData.color} mb-2 flex items-center justify-center gap-2`}>
              <span className={`text-${currentData.color.split(' ')[1].replace('to-', '')}`}><SparkleIcon className="w-4 h-4" /></span>
              {currentData.name}
            </h3>
            
            <div className="text-xs text-white/80 mb-3 text-left leading-relaxed min-h-[48px] max-h-[80px] overflow-y-auto custom-scrollbar bg-white/5 p-2 rounded-lg border border-white/10">
              {chatResponse ? chatResponse : (isTyping ? "..." : currentData.text)}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2 mb-4 relative z-20">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Demander à ${currentData.name}...`}
                className="flex-1 bg-black/50 border border-white/20 rounded-full px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400"
              />
              <button 
                type="submit" 
                disabled={isTyping || !chatInput.trim()}
                className={`px-3 rounded-full bg-gradient-to-r ${currentData.color} text-white font-bold text-xs shadow-lg disabled:opacity-50 transition-all`}
              >
                Envoyer
              </button>
            </form>
            
            <div className="flex justify-between items-center w-full mt-auto">
              <div className="flex gap-2">
                {stepsData.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => { setStep(i); setChatResponse(""); }}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${i === step ? 'bg-gradient-to-r ' + currentData.color + ' w-4' : 'bg-white/20'}`} 
                    aria-label={`Bot ${i + 1}`}
                  />
                ))}
              </div>
              <Button onClick={handleClose} size="sm" className="h-8 text-xs rounded-full bg-white/10 border border-white/20 font-bold text-white hover:bg-white/20 transition-all">
                Masquer <X className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
