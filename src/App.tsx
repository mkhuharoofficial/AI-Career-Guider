import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  ChevronRight, 
  Loader2, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  Target,
  BookOpen,
  TrendingUp,
  Award,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  Zap,
  Share2,
  Save,
  Copy,
  Check,
  Plane,
  Send,
  X,
  MessageSquare
} from 'lucide-react';
import { generateQuestions, generateRoadmap, generateRoadmapImage, chatWithMKK, CareerQuestion, RoadmapData, RoadmapPhase } from './services/gemini';
import { cn } from './lib/utils';

type AppState = 'landing' | 'interview' | 'thinking' | 'roadmap';

function PhaseItem({ phase, index }: { phase: RoadmapPhase, index: number }) {
  const [isExpanded, setIsExpanded] = useState(index === 0);

  return (
    <div className="mb-4 overflow-hidden border border-white/10 rounded-xl bg-white/5 transition-all duration-300">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
            {index + 1}
          </div>
          <div>
            <h3 className="font-bold text-lg">{phase.title}</h3>
            <p className="text-xs text-white/40 uppercase tracking-widest">Skill Acquisition Phase</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-5 h-5 text-white/40" />
        </motion.div>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-6 pt-0 border-t border-white/10">
              <p className="text-white/70 mb-6 leading-relaxed mt-4">
                {phase.description}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-mono text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap className="w-3 h-3" /> Core Skills
                  </h4>
                  <ul className="space-y-2">
                    {phase.skills.map((skill, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-white/60">
                        <div className="w-1 h-1 rounded-full bg-blue-500" />
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <BookOpen className="w-3 h-3" /> Learning Resources
                  </h4>
                  <ul className="space-y-2">
                    {phase.resources.map((resource, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-white/60 group cursor-pointer hover:text-white transition-colors">
                        <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-purple-400" />
                        {resource}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>('landing');
  const [goal, setGoal] = useState('');
  const [questions, setQuestions] = useState<CareerQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ question: string, answer: string }[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [roadmapImage, setRoadmapImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', parts: { text: string }[] }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [missingKey, setMissingKey] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if API key is missing
    const key = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
                (import.meta.env?.VITE_GEMINI_API_KEY);
    if (!key) {
      setMissingKey(true);
    }
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    const userMessage = chatInput;
    setChatInput('');
    const newHistory = [...chatHistory, { role: 'user' as const, parts: [{ text: userMessage }] }];
    setChatHistory(newHistory);
    setIsChatLoading(true);

    try {
      const response = await chatWithMKK(userMessage, chatHistory);
      setChatHistory([...newHistory, { role: 'model' as const, parts: [{ text: response }] }]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Load from URL or LocalStorage on mount
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) {
      try {
        const decoded = JSON.parse(atob(hash));
        if (decoded.roadmap && decoded.image) {
          setRoadmap(decoded.roadmap);
          setRoadmapImage(decoded.image);
          setGoal(decoded.goal || 'Shared Roadmap');
          setState('roadmap');
        }
      } catch (e) {
        console.error("Failed to decode shared roadmap", e);
      }
    } else {
      const saved = localStorage.getItem('last_roadmap');
      if (saved) {
        try {
          const decoded = JSON.parse(saved);
          setRoadmap(decoded.roadmap);
          setRoadmapImage(decoded.image);
          setGoal(decoded.goal || 'Saved Roadmap');
          setState('roadmap');
        } catch (e) {
          console.error("Failed to load saved roadmap", e);
        }
      }
    }
  }, []);

  const handleStart = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    try {
      const qs = await generateQuestions(goal);
      setQuestions(qs);
      setState('interview');
    } catch (error) {
      console.error("Failed to generate questions", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    const newAnswers = [...answers, { question: questions[currentQuestionIndex].question, answer: currentAnswer }];
    setAnswers(newAnswers);
    setCurrentAnswer('');

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setState('thinking');
      generateFinalRoadmap(newAnswers);
    }
  };

  const generateFinalRoadmap = async (finalAnswers: { question: string, answer: string }[]) => {
    try {
      const [data, image] = await Promise.all([
        generateRoadmap(goal, finalAnswers),
        generateRoadmapImage(goal)
      ]);
      setRoadmap(data);
      setRoadmapImage(image);
      
      // Save to LocalStorage automatically
      localStorage.setItem('last_roadmap', JSON.stringify({ roadmap: data, image, goal }));
      
      setState('roadmap');
    } catch (error) {
      console.error("Failed to generate roadmap", error);
    }
  };

  const handleShare = () => {
    if (!roadmap || !roadmapImage) return;
    const data = { roadmap, image: roadmapImage, goal };
    const encoded = btoa(JSON.stringify(data));
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleReset = () => {
    window.location.hash = '';
    localStorage.removeItem('last_roadmap');
    setState('landing');
    setGoal('');
    setRoadmap(null);
    setRoadmapImage(null);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white/20">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-8 min-h-screen flex flex-col">
        <AnimatePresence mode="wait">
          {state === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto text-center"
            >
              <div className="mb-8 p-4 rounded-full bg-white/5 border border-white/10">
                <Compass className="w-12 h-12 text-blue-400" />
              </div>
              <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-6 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
                PLAN YOUR CAREER
              </h1>
              <p className="text-xl text-white/60 mb-12 leading-relaxed">
                A smart AI helper to find your dream job path. We show you exactly what to learn.
              </p>
              
              <div className="w-full max-w-md space-y-4">
                {missingKey && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center mb-4">
                    <p className="font-bold mb-1">Missing API Key</p>
                    <p className="text-xs opacity-70">Please add your GEMINI_API_KEY to your environment variables to use this app on GitHub.</p>
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="What job do you want?"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
                <button
                  onClick={handleStart}
                  disabled={loading || !goal}
                  className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "START NOW"}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {state === 'interview' && (
            <motion.div
              key="interview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full"
            >
              <div className="w-full mb-12">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Assessment Phase</span>
                  <span className="text-2xl font-bold">{currentQuestionIndex + 1}<span className="text-white/20">/{questions.length}</span></span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="glass-panel p-8 md:p-12 w-full mb-8">
                <h2 className="text-2xl md:text-3xl font-medium mb-4 leading-tight">
                  {questions[currentQuestionIndex]?.question}
                </h2>
                <p className="text-white/40 text-sm mb-8 italic">
                  Context: {questions[currentQuestionIndex]?.context}
                </p>
                
                {questions[currentQuestionIndex]?.options ? (
                  <div className="grid grid-cols-1 gap-3">
                    {questions[currentQuestionIndex].options.map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setCurrentAnswer(option);
                          // Auto-advance for multiple choice
                          const newAnswers = [...answers, { question: questions[currentQuestionIndex].question, answer: option }];
                          setAnswers(newAnswers);
                          setCurrentAnswer('');
                          if (currentQuestionIndex < questions.length - 1) {
                            setCurrentQuestionIndex(prev => prev + 1);
                          } else {
                            setState('thinking');
                            generateFinalRoadmap(newAnswers);
                          }
                        }}
                        className={cn(
                          "w-full text-left px-6 py-4 rounded-xl border transition-all duration-200",
                          currentAnswer === option 
                            ? "bg-blue-500/20 border-blue-500 text-white" 
                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20"
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    autoFocus
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Type your detailed response..."
                    className="w-full bg-transparent border-b border-white/10 py-4 text-xl focus:outline-none focus:border-blue-500 transition-colors resize-none h-32"
                  />
                )}
              </div>

              {!questions[currentQuestionIndex]?.options && (
                <button
                  onClick={handleNextQuestion}
                  disabled={!currentAnswer.trim()}
                  className="ml-auto flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl font-bold hover:bg-white/90 transition-all disabled:opacity-50"
                >
                  {currentQuestionIndex === questions.length - 1 ? "GENERATE ROADMAP" : "NEXT QUESTION"}
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </motion.div>
          )}

          {state === 'thinking' && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              <div className="relative w-32 h-32 mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-2 border-dashed border-blue-500/30 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-4 border-2 border-dashed border-purple-500/30 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>
              <h2 className="text-4xl font-bold mb-4 tracking-tighter uppercase">Thinking...</h2>
              <p className="text-white/40 animate-pulse-slow">Making your special path now...</p>
            </motion.div>
          )}

          {state === 'roadmap' && roadmap && (
            <motion.div
              key="roadmap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 h-full"
            >
              {/* Left: Interactive Roadmap */}
              <div className="flex flex-col h-full max-h-[85vh]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                      <Target className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight uppercase">Your Career Path</h2>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleShare}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2 text-xs font-bold"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                      {copied ? "LINK COPIED" : "SHARE LINK"}
                    </button>
                    <button 
                      onClick={handleReset}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-bold"
                    >
                      NEW PATH
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar glass-panel p-8">
                  <div className="mb-8">
                    <h1 className="text-4xl font-serif italic mb-4 text-blue-400 border-b border-white/10 pb-4">
                      About Your Path
                    </h1>
                    <p className="text-white/70 leading-relaxed italic">
                      "{roadmap.executiveSummary}"
                    </p>
                  </div>

                  <div className="mb-8">
                    <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-400" /> Steps to Learn
                    </h2>
                    {roadmap.phases.map((phase, i) => (
                      <PhaseItem key={i} phase={phase} index={i} />
                    ))}
                  </div>

                  <div className="mb-8">
                    <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Award className="w-4 h-4 text-yellow-400" /> Goals to Reach
                    </h2>
                    <div className="space-y-3">
                      {roadmap.milestones.map((milestone, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                          <span className="text-sm text-white/70">{milestone}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-400" /> How to Grow
                    </h2>
                    <div className="p-6 rounded-xl bg-purple-500/5 border border-purple-500/20">
                      <p className="text-sm text-white/70 leading-relaxed">
                        {roadmap.strategy}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Visual Content */}
              <div className="flex flex-col h-full max-h-[85vh]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight uppercase">Your Path in Pictures</h2>
                </div>

                <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/10 group">
                  {roadmapImage ? (
                    <>
                      <img 
                        src={roadmapImage} 
                        alt="Career Journey" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-8 left-8 right-8">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-mono uppercase tracking-widest">
                            AI Visualization
                          </div>
                        </div>
                        <p className="text-sm text-white/60 italic">
                          "The path from current state to {goal}"
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-white/5">
                      <Loader2 className="w-12 h-12 text-white/20 animate-spin mb-4" />
                      <p className="text-white/40">Generating visual representation...</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="glass-panel p-4 text-center">
                    <BookOpen className="w-5 h-5 mx-auto mb-2 text-blue-400" />
                    <span className="text-[10px] uppercase tracking-tighter text-white/40">Knowledge</span>
                  </div>
                  <div className="glass-panel p-4 text-center">
                    <Award className="w-5 h-5 mx-auto mb-2 text-yellow-400" />
                    <span className="text-[10px] uppercase tracking-tighter text-white/40">Mastery</span>
                  </div>
                  <div className="glass-panel p-4 text-center">
                    <Sparkles className="w-5 h-5 mx-auto mb-2 text-purple-400" />
                    <span className="text-[10px] uppercase tracking-tighter text-white/40">Impact</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Chatbot */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-20 right-0 w-80 md:w-96 h-[500px] glass-panel flex flex-col overflow-hidden shadow-2xl border-white/20"
            >
              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <Plane className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Hello MKK</h3>
                    <p className="text-[10px] text-green-400 uppercase tracking-widest">Online Mentor</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {chatHistory.length === 0 && (
                  <div className="text-center py-8">
                    <Plane className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-sm text-white/40">Hello! I am MKK. Ask me anything about your career!</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={cn(
                    "max-w-[80%] p-3 rounded-2xl text-sm",
                    msg.role === 'user' 
                      ? "ml-auto bg-blue-500 text-white rounded-tr-none" 
                      : "mr-auto bg-white/10 text-white/80 rounded-tl-none border border-white/10"
                  )}>
                    {msg.parts[0].text}
                  </div>
                ))}
                {isChatLoading && (
                  <div className="mr-auto bg-white/10 text-white/40 p-3 rounded-2xl rounded-tl-none border border-white/10 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-white/10 bg-white/5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask MKK something..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isChatLoading}
                    className="p-2 bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 rounded-full bg-blue-500 shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors group relative"
        >
          <Plane className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
          {!isChatOpen && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#050505] rounded-full" />
          )}
        </motion.button>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-white/5">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-mono text-white/40 uppercase tracking-widest">System Online // Gemini 3.0</span>
          </div>
          <p className="text-xs text-white/20">© 2026 AI Career Navigator. Built for Scholarship Excellence.</p>
        </div>
      </footer>
    </div>
  );
}
