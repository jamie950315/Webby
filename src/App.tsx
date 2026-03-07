import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { enhancePrompt, generateCandidateStream, Candidate, mutateCandidateStream } from './services/openrouter';
import { Loader2, Wand2, Play, Download, Copy, RefreshCw, ChevronRight, Check, Code2, Layout, ChevronDown, ChevronUp, Network, X, ChevronLeft, Globe, Key, Moon, Sun, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { languages, translations, getBrowserLanguage } from './i18n';

type Phase = 'setup' | 'tournament' | 'result';

type BracketNode = {
  id: string;
  left?: BracketNode;
  right?: BracketNode;
  candidate: Candidate | 'generate' | null;
};

const BracketNodeComponent = ({ node, onPreview, finalWinner, isWinnerOfMatch, t }: { 
  node: BracketNode, 
  onPreview: (c: Candidate) => void, 
  finalWinner?: Candidate | null,
  isWinnerOfMatch?: boolean,
  t: Record<string, string>
}) => {
  const isLeaf = !node.left && !node.right;
  const isFinalWinnerPath = finalWinner && node.candidate === finalWinner;
  
  const card = (
    <div className={`w-32 p-3 border rounded-xl shadow-sm text-center bg-white dark:bg-zinc-950 relative z-10 transition-all duration-500 
      ${isFinalWinnerPath ? 'border-orange-500 ring-2 ring-orange-500 ring-offset-2' : 
        isWinnerOfMatch ? 'border-green-500 ring-1 ring-green-500' : 
        node.candidate && node.candidate !== 'generate' ? 'border-indigo-300 dark:border-indigo-500/50 ring-1 ring-indigo-300 dark:ring-indigo-500/50' : 
        'border-zinc-200 dark:border-zinc-800'}`}>
      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{isLeaf ? t.variation : t.winner}</div>
      {node.candidate && node.candidate !== 'generate' ? (
        <button onClick={() => onPreview(node.candidate as Candidate)} className={`text-sm font-semibold hover:underline ${isFinalWinnerPath ? 'text-orange-600' : isWinnerOfMatch ? 'text-green-600' : 'text-indigo-600 dark:text-indigo-400'}`}>
          {t.preview}
        </button>
      ) : (
        <div className="text-sm text-zinc-400 dark:text-zinc-500">{t.tbd}</div>
      )}
    </div>
  );

  if (isLeaf) {
    return card;
  }

  const leftIsWinnerPath = finalWinner && node.left?.candidate === finalWinner;
  const rightIsWinnerPath = finalWinner && node.right?.candidate === finalWinner;
  
  const leftIsWinner = node.candidate && node.left?.candidate === node.candidate;
  const rightIsWinner = node.candidate && node.right?.candidate === node.candidate;

  return (
    <div className="flex flex-col items-center">
      {card}
      <div className={`w-[2px] h-6 transition-colors duration-500 ${isFinalWinnerPath ? 'bg-orange-500 z-20' : 'bg-zinc-300 dark:bg-zinc-700'}`}></div>
      <div className="flex flex-row justify-center relative pt-6">
        <div className={`flex flex-col items-center relative px-4 before:content-[''] before:absolute before:top-0 before:left-1/2 before:w-[calc(50%+1rem)] before:h-[2px] before:bg-zinc-300 dark:before:bg-zinc-700 before:transition-colors before:duration-500 after:content-[''] after:absolute after:top-0 after:left-1/2 after:w-[2px] after:h-6 after:bg-zinc-300 dark:after:bg-zinc-700 after:-translate-x-1/2 after:transition-colors after:duration-500 ${leftIsWinnerPath ? 'before:!bg-orange-500 after:!bg-orange-500 before:z-20 after:z-20' : ''}`}>
          <BracketNodeComponent node={node.left!} onPreview={onPreview} finalWinner={finalWinner} isWinnerOfMatch={leftIsWinner} t={t} />
        </div>
        <div className={`flex flex-col items-center relative px-4 before:content-[''] before:absolute before:top-0 before:right-1/2 before:w-[calc(50%+1rem)] before:h-[2px] before:bg-zinc-300 dark:before:bg-zinc-700 before:transition-colors before:duration-500 after:content-[''] after:absolute after:top-0 after:left-1/2 after:w-[2px] after:h-6 after:bg-zinc-300 dark:after:bg-zinc-700 after:-translate-x-1/2 after:transition-colors after:duration-500 ${rightIsWinnerPath ? 'before:!bg-orange-500 after:!bg-orange-500 before:z-20 after:z-20' : ''}`}>
          <BracketNodeComponent node={node.right!} onPreview={onPreview} finalWinner={finalWinner} isWinnerOfMatch={rightIsWinner} t={t} />
        </div>
      </div>
    </div>
  );
};

function getIframeContent(candidate: Candidate, lang: string) {
  const t = translations[lang] || translations['en'];
  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    ${candidate.css || ''}
    body { font-family: sans-serif; margin: 0; padding: 0; }
  </style>
</head>
<body>
  ${candidate.html || `<div class="p-4 text-gray-500">${t.generating}</div>`}
  <script>
    try {
      ${candidate.js || ''}
    } catch (e) {
      console.error("User JS Error:", e);
    }

    // Intercept link clicks for demo purposes
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a');
      if (link) {
        e.preventDefault();
        const existingToast = document.getElementById('demo-toast');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.id = 'demo-toast';
        toast.textContent = '${t.demoToast}';
        toast.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #18181b; color: #fff; padding: 10px 20px; border-radius: 8px; z-index: 9999; font-family: sans-serif; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); opacity: 0; transition: opacity 0.3s ease; pointer-events: none;';
        document.body.appendChild(toast);
        
        // Trigger reflow
        void toast.offsetWidth;
        toast.style.opacity = '1';
        
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      }
    });
  </script>
</body>
</html>
  `;
}

function CandidateView({ candidate, onChoose, isGenerating, label, showPhilosophy, isWinner, t, lang }: { candidate: Candidate | undefined, onChoose: () => void, isGenerating: boolean, label: string, showPhilosophy: boolean, isWinner?: boolean, t: Record<string, string>, lang: string }) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const codeEndRef = useRef<HTMLDivElement>(null);
  const lastFinishedRef = useRef<boolean>(false);

  // Auto-scroll code view when generating
  useEffect(() => {
    if (viewMode === 'code' && !candidate?.isFinished) {
      codeEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [candidate?.raw, viewMode]);

  // Auto-switch to preview when finished
  useEffect(() => {
    if (candidate?.isFinished && !lastFinishedRef.current) {
      setViewMode('preview');
    } else if (candidate && !candidate.isFinished && viewMode === 'preview' && !candidate.html) {
      // If just started generating and no HTML yet, show code
      setViewMode('code');
    }
    lastFinishedRef.current = !!candidate?.isFinished;
  }, [candidate?.isFinished, candidate]);

  if (!candidate) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative h-full">
      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white/90 backdrop-blur p-1 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setViewMode('preview')}
          className={`p-2 rounded-md transition-colors ${viewMode === 'preview' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'}`}
          title="Preview"
        >
          <Layout className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('code')}
          className={`p-2 rounded-md transition-colors ${viewMode === 'code' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'}`}
          title="Code"
        >
          <Code2 className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className={`flex-1 relative bg-white dark:bg-zinc-950 overflow-hidden border-4 transition-colors duration-500 ${isWinner ? 'border-green-500' : 'border-transparent'}`}>
        {viewMode === 'preview' ? (
          <iframe 
            srcDoc={getIframeContent(candidate, lang)}
            className="absolute inset-0 w-full h-full border-0"
            title={label}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-950 text-zinc-300 p-6 overflow-y-auto font-mono text-sm">
            <pre className="whitespace-pre-wrap break-words">{candidate.raw}</pre>
            {!candidate.isFinished && (
              <div className="flex items-center gap-2 mt-4 text-indigo-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="animate-pulse">{t.generating}</span>
              </div>
            )}
            <div ref={codeEndRef} />
          </div>
        )}
      </div>

      {/* Footer / Controls */}
      <div className="p-6 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shrink-0 flex flex-col gap-4 transition-all duration-300">
        {showPhilosophy && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-1 overflow-hidden"
          >
            <h3 className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              {t.designPhilosophy}
              {!candidate.isFinished && <span className="text-xs text-indigo-500 normal-case flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> {t.generating}</span>}
            </h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-3 h-14 overflow-hidden" title={candidate.design_philosophy}>
              {candidate.design_philosophy || "Waiting for AI..."}
            </p>
          </motion.div>
        )}
        <button 
          onClick={onChoose}
          disabled={isGenerating || !candidate.isFinished}
          className="w-full py-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t.chooseWinner}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [initialPrompt, setInitialPrompt] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [rounds, setRounds] = useState(4);
  const [matchIndex, setMatchIndex] = useState(1);
  const [bracket, setBracket] = useState<BracketNode | null>(null);
  const [currentMatchNode, setCurrentMatchNode] = useState<BracketNode | null>(null);
  const [showBracket, setShowBracket] = useState(false);
  const [previewCandidate, setPreviewCandidate] = useState<Candidate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [candidates, setCandidates] = useState<{left: Candidate, right: Candidate} | null>(null);
  const [winner, setWinner] = useState<Candidate | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPhilosophy, setShowPhilosophy] = useState(true);
  const [language, setLanguage] = useState(getBrowserLanguage());
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [enhanceModel, setEnhanceModel] = useState(() => localStorage.getItem('enhance_model') || 'google/gemini-3-flash-preview');
  const [generateModel, setGenerateModel] = useState(() => localStorage.getItem('generate_model') || 'openai/gpt-5.4');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [tempEnhanceModel, setTempEnhanceModel] = useState('');
  const [tempGenerateModel, setTempGenerateModel] = useState('');
  const [bracketZoom, setBracketZoom] = useState(1);
  const bracketViewportRef = useRef<HTMLDivElement>(null);
  const bracketContentRef = useRef<HTMLDivElement>(null);
  const bracketPrevScrollSizeRef = useRef({ width: 0, height: 0 });
  const [bracketViewportSize, setBracketViewportSize] = useState({ width: 0, height: 0 });
  const [bracketContentSize, setBracketContentSize] = useState({ width: 0, height: 0 });

  // Set initial zoom based on rounds when opening bracket
  useEffect(() => {
    if (showBracket) {
      setBracketZoom(Math.max(0.5, Math.min(1, 0.8 * (10 / rounds))));
    }
  }, [showBracket, rounds]);

  const handleZoom = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomChange = e.deltaY > 0 ? -0.1 : 0.1;
      setBracketZoom(prev => Math.max(0.5, Math.min(2, prev + zoomChange)));
    }
  };

  useEffect(() => {
    if (!showBracket) return;

    const viewportEl = bracketViewportRef.current;
    const contentEl = bracketContentRef.current;
    if (!viewportEl || !contentEl) return;

    const updateMetrics = () => {
      setBracketViewportSize({
        width: viewportEl.clientWidth,
        height: viewportEl.clientHeight,
      });
      setBracketContentSize({
        width: contentEl.offsetWidth,
        height: contentEl.offsetHeight,
      });
    };

    updateMetrics();
    const observer = new ResizeObserver(updateMetrics);
    observer.observe(viewportEl);
    observer.observe(contentEl);

    return () => observer.disconnect();
  }, [showBracket, bracket]);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const t = translations[language] || translations['en'];
  const baseBracketWidth = bracketContentSize.width;
  const baseBracketHeight = bracketContentSize.height;
  const scaledBracketWidth = bracketContentSize.width * bracketZoom;
  const scaledBracketHeight = bracketContentSize.height * bracketZoom;
  const horizontalOverflowEachSide = Math.max(0, (scaledBracketWidth - baseBracketWidth) / 2);
  const verticalOverflowDown = Math.max(0, scaledBracketHeight - baseBracketHeight);
  const verticalCompensation = 0;
  const horizontalPadding = Math.ceil(horizontalOverflowEachSide + 48);
  const topPadding = 64;
  const bottomPadding = Math.ceil(verticalOverflowDown + 128);
  const canvasMinWidth = Math.max(bracketViewportSize.width, baseBracketWidth + horizontalPadding * 2);
  const canvasMinHeight = Math.max(bracketViewportSize.height, baseBracketHeight + topPadding + bottomPadding);

  useEffect(() => {
    if (!showBracket) {
      bracketPrevScrollSizeRef.current = { width: 0, height: 0 };
    }
  }, [showBracket]);

  useLayoutEffect(() => {
    if (!showBracket) return;
    const viewportEl = bracketViewportRef.current;
    if (!viewportEl) return;

    const id = requestAnimationFrame(() => {
      const prev = bracketPrevScrollSizeRef.current;
      const nextWidth = viewportEl.scrollWidth;
      const nextHeight = viewportEl.scrollHeight;

      if (prev.width === 0 && prev.height === 0) {
        viewportEl.scrollLeft = Math.max(0, (nextWidth - viewportEl.clientWidth) / 2);
        viewportEl.scrollTop = 0;
      } else {
        viewportEl.scrollLeft += (nextWidth - prev.width) / 2;
      }

      bracketPrevScrollSizeRef.current = { width: nextWidth, height: nextHeight };
    });

    return () => cancelAnimationFrame(id);
  }, [showBracket, bracketZoom, canvasMinWidth, canvasMinHeight]);

  const handleEnhance = async () => {
    if (!initialPrompt.trim()) return;
    if (!apiKey) {
      setTempApiKey(apiKey);
      setTempEnhanceModel(enhanceModel);
      setTempGenerateModel(generateModel);
      setShowApiKeyModal(true);
      return;
    }
    setIsEnhancing(true);
    try {
      const result = await enhancePrompt(initialPrompt, enhanceModel, language, apiKey);
      setEnhancedPrompt(result);
    } catch (error) {
      console.error(error);
      alert("Failed to enhance prompt.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const saveApiKey = () => {
    if (!tempApiKey.trim()) return;
    localStorage.setItem('gemini_api_key', tempApiKey.trim());
    localStorage.setItem('enhance_model', tempEnhanceModel.trim() || 'google/gemini-3-flash-preview');
    localStorage.setItem('generate_model', tempGenerateModel.trim() || 'openai/gpt-5.4');
    setApiKey(tempApiKey.trim());
    setEnhanceModel(tempEnhanceModel.trim() || 'google/gemini-3-flash-preview');
    setGenerateModel(tempGenerateModel.trim() || 'openai/gpt-5.4');
    setShowApiKeyModal(false);
  };

  function buildBracketTree(n: number): BracketNode {
    const leaves: BracketNode[] = Array.from({ length: n }, (_, i) => ({
      id: `leaf-${i}`,
      candidate: 'generate'
    }));
    let internalId = 0;

    function build(nodes: BracketNode[]): BracketNode {
      if (nodes.length === 1) return nodes[0];
      const mid = Math.ceil(nodes.length / 2);
      const left = build(nodes.slice(0, mid));
      const right = build(nodes.slice(mid));
      return {
        id: `match-${internalId++}`,
        left,
        right,
        candidate: null
      };
    }

    return build(leaves);
  }

  function getNextMatch(node: BracketNode): BracketNode | null {
    if (!node.left || !node.right) return null;
    
    if (node.left.candidate === null) {
      const leftMatch = getNextMatch(node.left);
      if (leftMatch) return leftMatch;
    }
    if (node.right.candidate === null) {
      const rightMatch = getNextMatch(node.right);
      if (rightMatch) return rightMatch;
    }
    
    if (node.candidate === null && node.left.candidate !== null && node.right.candidate !== null) {
      return node;
    }
    
    return null;
  }

  const startMatch = async (matchNode: BracketNode) => {
    setIsGenerating(true);
    
    const leftItem = matchNode.left!.candidate!;
    const rightItem = matchNode.right!.candidate!;

    if (!apiKey) {
      setTempApiKey(apiKey);
      setTempEnhanceModel(enhanceModel);
      setTempGenerateModel(generateModel);
      setShowApiKeyModal(true);
      setIsGenerating(false);
      return;
    }

    const newCandidates = {
      left: leftItem === 'generate' ? { html: '', css: '', js: '', design_philosophy: '', isFinished: false, raw: '' } : leftItem,
      right: rightItem === 'generate' ? { html: '', css: '', js: '', design_philosophy: '', isFinished: false, raw: '' } : rightItem
    };
    setCandidates(newCandidates);

    try {
      const promises = [];
      if (leftItem === 'generate') {
        promises.push((async () => {
          for await (const chunk of generateCandidateStream(enhancedPrompt, 'left', generateModel, language, apiKey)) {
            setCandidates(prev => prev ? { ...prev, left: chunk } : null);
          }
        })());
      }
      if (rightItem === 'generate') {
        promises.push((async () => {
          for await (const chunk of generateCandidateStream(enhancedPrompt, 'right', generateModel, language, apiKey)) {
            setCandidates(prev => prev ? { ...prev, right: chunk } : null);
          }
        })());
      }
      await Promise.all(promises);
    } catch (error) {
      console.error(error);
      alert("Failed to generate candidates.");
    } finally {
      setIsGenerating(false);
    }
  };

  const startTournament = async () => {
    if (!enhancedPrompt.trim()) return;
    setPhase('tournament');
    setMatchIndex(1);
    
    const root = buildBracketTree(rounds);
    setBracket(root);
    const firstMatch = getNextMatch(root);
    setCurrentMatchNode(firstMatch);
    if (firstMatch) {
      startMatch(firstMatch);
    }
  };

  const handleChoice = async (choice: 'left' | 'right') => {
    if (!candidates || !currentMatchNode || !bracket) return;
    const chosen = candidates[choice];
    
    const updateTree = (node: BracketNode): BracketNode => {
      if (node.id === currentMatchNode.id) {
        return { 
          ...node, 
          candidate: chosen,
          left: { ...node.left!, candidate: candidates.left },
          right: { ...node.right!, candidate: candidates.right }
        };
      }
      if (node.left && node.right) {
        return {
          ...node,
          left: updateTree(node.left),
          right: updateTree(node.right)
        };
      }
      return node;
    };

    const newBracket = updateTree(bracket);
    setBracket(newBracket);

    const nextMatch = getNextMatch(newBracket);
    if (nextMatch) {
      setMatchIndex(prev => prev + 1);
      setCurrentMatchNode(nextMatch);
      startMatch(nextMatch);
    } else {
      setWinner(chosen);
      setPhase('result');
    }
  };

  const handleCopyCode = () => {
    if (!winner) return;
    const code = getIframeContent(winner, language);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!winner) return;
    const code = getIframeContent(winner, language);
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const restart = () => {
    setPhase('setup');
    setInitialPrompt('');
    setEnhancedPrompt('');
    setCandidates(null);
    setWinner(null);
    setMatchIndex(1);
    setBracket(null);
    setCurrentMatchNode(null);
    setShowBracket(false);
    setPreviewCandidate(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Wand2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight leading-none">Webby</h1>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wider">{t.subtitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {phase === 'tournament' && (
            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
              {t.match} {matchIndex} / {Math.max(1, rounds - 1)}
            </div>
          )}
          {phase !== 'setup' && (
            <button 
              onClick={() => setShowBracket(true)} 
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Network className="w-4 h-4" />
              {t.bracket}
            </button>
          )}
          
          <div className="relative">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setTempApiKey(apiKey);
                setTempEnhanceModel(enhanceModel);
                setTempGenerateModel(generateModel);
                setShowApiKeyModal(true);
              }}
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2"
              title={t.settings}
            >
              <Key className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2"
            >
              <Globe className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline-block">
                {languages.find(l => l.code === language)?.flag} {languages.find(l => l.code === language)?.name}
              </span>
            </button>
            
            <AnimatePresence>
              {showLangMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden z-50"
                >
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${language === lang.code ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-zinc-700 dark:text-zinc-300'}`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      {lang.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {phase === 'setup' && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 overflow-y-auto p-6 md:p-12"
            >
              <div className="max-w-3xl mx-auto space-y-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wand2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-bold tracking-tight text-indigo-600 dark:text-indigo-400 uppercase">Webby</span>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight">{t.whatToBuild}</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">{t.enterIdea}</p>
                  
                  <div className="flex gap-4">
                    <input 
                      type="text"
                      value={initialPrompt}
                      onChange={(e) => setInitialPrompt(e.target.value)}
                      placeholder={t.placeholder}
                      className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                      onKeyDown={(e) => e.key === 'Enter' && handleEnhance()}
                    />
                    <button 
                      onClick={handleEnhance}
                      disabled={isEnhancing || !initialPrompt.trim()}
                      className="px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white dark:text-zinc-900 rounded-xl font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                      {isEnhancing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                      {t.enhancePrompt}
                    </button>
                  </div>
                </div>

                {enhancedPrompt && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold">{t.detailedPrompt}</h3>
                    <textarea 
                      value={enhancedPrompt}
                      onChange={(e) => setEnhancedPrompt(e.target.value)}
                      className="w-full h-64 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow resize-none font-mono text-sm leading-relaxed"
                    />
                    
                    <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6 mt-8">
                      <h3 className="text-lg font-semibold">{t.evolutionSettings}</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="font-medium text-zinc-700 dark:text-zinc-300">{t.numGenerations}</label>
                          <input 
                            type="number" 
                            min="2" 
                            max="50" 
                            value={rounds}
                            onChange={(e) => setRounds(Math.max(2, Math.min(50, parseInt(e.target.value) || 2)))}
                            className="w-20 px-3 py-1.5 text-center border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <input 
                          type="range" 
                          min="2" 
                          max="50" 
                          value={rounds}
                          onChange={(e) => setRounds(parseInt(e.target.value))}
                          className="w-full accent-indigo-600"
                        />
                      </div>

                      <button 
                        onClick={startTournament}
                        className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 flex items-center justify-center gap-2 transition-colors"
                      >
                        <Play className="w-5 h-5" />
                        {t.startGeneration}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {phase === 'tournament' && (
            <motion.div 
              key="tournament"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative"
            >
              <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800">
                <CandidateView 
                  candidate={candidates?.left} 
                  onChoose={() => handleChoice('left')} 
                  isGenerating={isGenerating}
                  label={t.leftCandidate}
                  showPhilosophy={showPhilosophy}
                  isWinner={currentMatchNode?.left?.candidate !== 'generate' && currentMatchNode?.left?.candidate !== null}
                  t={t}
                  lang={language}
                />
              </div>
              
              {/* Toggle Philosophy Button in the middle */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 z-20 hidden md:flex transition-all duration-300" 
                style={{ bottom: showPhilosophy ? '180px' : '80px' }}
              >
                <button 
                  onClick={() => setShowPhilosophy(!showPhilosophy)}
                  className="p-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
                  title={t.togglePhilosophy}
                >
                  {showPhilosophy ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex-1 flex flex-col">
                <CandidateView 
                  candidate={candidates?.right} 
                  onChoose={() => handleChoice('right')} 
                  isGenerating={isGenerating}
                  label={t.rightCandidate}
                  showPhilosophy={showPhilosophy}
                  isWinner={currentMatchNode?.right?.candidate !== 'generate' && currentMatchNode?.right?.candidate !== null}
                  t={t}
                  lang={language}
                />
              </div>
            </motion.div>
          )}

          {phase === 'result' && winner && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col h-full bg-zinc-100 dark:bg-zinc-800"
            >
              {/* Top Bar for Result Phase */}
              <div className="p-4 flex justify-end gap-2 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <button 
                  onClick={handleCopyCode}
                  className="px-4 py-2 bg-white dark:bg-zinc-950 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/50 flex items-center gap-2 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? t.copied : t.copyCode}
                </button>
                <button 
                  onClick={handleDownload}
                  className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white dark:text-zinc-900 shadow-sm rounded-lg text-sm font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t.downloadSource}
                </button>
                <button 
                  onClick={restart}
                  className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 flex items-center gap-2 transition-colors ml-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t.restart}
                </button>
              </div>
              
              <div className="flex-1 relative">
                <iframe 
                  srcDoc={getIframeContent(winner, language)}
                  className="absolute inset-0 w-full h-full border-0 bg-white dark:bg-zinc-950"
                  title={t.finalWinnerTitle}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals outside main AnimatePresence to prevent unmounting of phase content */}
        <AnimatePresence>
          {showBracket && bracket && (
            <motion.div
              key="bracket-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-zinc-50 dark:bg-zinc-900 w-full h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="p-4 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Network className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    {t.bracket}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBracketZoom(prev => Math.max(0.5, Math.min(2, prev - 0.2)))}
                      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setBracketZoom(prev => Math.max(0.5, Math.min(2, prev + 0.2)))}
                      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-2"></div>
                    <button onClick={() => setShowBracket(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div
                  ref={bracketViewportRef}
                  className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-900 overscroll-contain"
                  onWheel={handleZoom}
                >
                  <div
                    className="grid place-items-center"
                    style={{
                      minWidth: canvasMinWidth || '100%',
                      minHeight: canvasMinHeight || '100%',
                      paddingLeft: horizontalPadding,
                      paddingRight: horizontalPadding,
                      paddingTop: topPadding,
                      paddingBottom: bottomPadding,
                    }}
                  >
                    <div
                      ref={bracketContentRef}
                      className="inline-block will-change-transform"
                      style={{
                        transformOrigin: 'top center',
                        transform: `translateY(${verticalCompensation}px) scale(${bracketZoom})`,
                        transition: 'transform 0.3s',
                      }}
                    >
                      <BracketNodeComponent node={bracket} onPreview={(c) => setPreviewCandidate(c)} finalWinner={winner} t={t} />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {previewCandidate && (
            <motion.div 
              key="preview-modal"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed inset-0 z-[60] bg-zinc-900 dark:bg-zinc-100 flex flex-col"
            >
              <div className="p-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-b border-zinc-800 dark:border-zinc-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <button onClick={() => setPreviewCandidate(null)} className="p-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg transition-colors flex items-center gap-2">
                    <ChevronLeft className="w-5 h-5" />
                    {t.backToBracket}
                  </button>
                  <h2 className="text-lg font-medium">{t.pagePreview}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(getIframeContent(previewCandidate, language));
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-4 py-2 bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? t.copied : t.copyCode}
                  </button>
                  <button 
                    onClick={() => {
                      const blob = new Blob([getIframeContent(previewCandidate, language)], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'variation.html';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {t.download}
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-white dark:bg-zinc-950 relative">
                <iframe 
                  srcDoc={getIframeContent(previewCandidate, language)}
                  className="absolute inset-0 w-full h-full border-0"
                  title={t.preview}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </motion.div>
          )}

          {showApiKeyModal && (
            <motion.div 
              key="api-key-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      {t.settings}
                    </h2>
                    <button onClick={() => setShowApiKeyModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.enterApiKey}</label>
                      <input
                        type="password"
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        placeholder={t.apiKeyPlaceholder}
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.enhanceModel || 'Enhance Prompt Model'}</label>
                      <input
                        type="text"
                        value={tempEnhanceModel}
                        onChange={(e) => setTempEnhanceModel(e.target.value)}
                        placeholder="google/gemini-3-flash-preview"
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.generateModel || 'Generate Web Model'}</label>
                      <input
                        type="text"
                        value={tempGenerateModel}
                        onChange={(e) => setTempGenerateModel(e.target.value)}
                        placeholder="openai/gpt-5.4"
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                        onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
                      />
                    </div>
                  </div>

                  <button
                    onClick={saveApiKey}
                    className="w-full py-3 bg-indigo-600 dark:bg-indigo-500 text-white dark:text-zinc-900 rounded-xl font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    {t.saveApiKey}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
