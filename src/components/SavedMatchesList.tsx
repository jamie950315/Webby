import React, { useEffect, useState, useRef, useMemo } from 'react';
import { SavedMatch, getSavedMatches, getHighestCandidate, deleteMatches } from '../utils/storage';
import { Candidate } from '../services/openrouter';
import { getIframeContent } from '../utils/iframe';
import { Check, Clock, LayoutTemplate, PlayCircle, Trash2, Wrench, X } from 'lucide-react';
import { translations } from '../i18n';

const cardThumbnailCache = new Map<string, string>();

function getCardCacheKey(c: Candidate) {
  return `card:${c.html}\0${c.css}\0${c.js}`;
}

const CardPreview = React.memo(({ candidate, lang, title }: { candidate: Candidate, lang: string, title: string }) => {
  const cacheKey = getCardCacheKey(candidate);
  const cached = cardThumbnailCache.get(cacheKey);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [thumbnail, setThumbnail] = useState<string | undefined>(cached);

  const srcDoc = useMemo(() => getIframeContent(candidate, lang), [candidate.html, candidate.css, candidate.js, lang]);

  const capture = () => {
    const iframe = iframeRef.current;
    if (!iframe || cardThumbnailCache.has(cacheKey)) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const html = new XMLSerializer().serializeToString(doc.documentElement);
      const blob = new Blob([
        `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768">` +
        `<foreignObject width="100%" height="100%">${html}</foreignObject></svg>`
      ], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          try {
            const dataUrl = canvas.toDataURL('image/png');
            cardThumbnailCache.set(cacheKey, dataUrl);
            setThumbnail(dataUrl);
          } catch { /* tainted canvas */ }
        }
        URL.revokeObjectURL(url);
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
    } catch { /* keep iframe */ }
  };

  if (thumbnail) {
    return (
      <img
        src={thumbnail}
        className="absolute inset-0 w-full h-full object-cover"
        alt={title}
      />
    );
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      onLoad={capture}
      className="absolute top-1/2 left-1/2 pointer-events-none border-0"
      style={{ width: '1024px', height: '768px', transform: 'translate(-50%, -50%) scale(0.22)', transformOrigin: 'center center' }}
      sandbox="allow-scripts allow-same-origin"
      tabIndex={-1}
      title={title}
    />
  );
});

interface SavedMatchesListProps {
  onLoadMatch: (match: SavedMatch) => void;
  lang: string;
}

export function SavedMatchesList({ onLoadMatch, lang }: SavedMatchesListProps) {
  const [matches, setMatches] = useState<SavedMatch[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const t = translations[lang] || translations['en'];

  useEffect(() => {
    setMatches(getSavedMatches());
  }, []);

  if (matches.length === 0) {
    return null;
  }

  const recentMatches = matches.slice(0, 6);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = () => {
    deleteMatches(Array.from(selectedIds));
    const remaining = matches.filter(m => !selectedIds.has(m.id));
    setMatches(remaining);
    setSelectedIds(new Set());
    setIsSelecting(false);
  };

  const handleCancelSelect = () => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-20 px-8 pb-16 fade-in duration-700 delay-300 fill-mode-both relative z-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3 text-zinc-800 dark:text-zinc-200">
          <Clock className="w-6 h-6 text-indigo-500" />
          <h2 className="text-2xl font-semibold tracking-tight">{t.recentIdeas || 'Recent Ideas'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800/80 px-3 py-1 rounded-full border border-black/5 dark:border-white/5">
            {matches.length} saved
          </div>
          {!isSelecting ? (
            <button
              onClick={() => setIsSelecting(true)}
              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              title="Delete matches"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={handleCancelSelect}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {recentMatches.map((match) => {
          const previewCandidate = match.winner || getHighestCandidate(match.bracket);
          const hasPreview = !!previewCandidate && !!(previewCandidate.html || previewCandidate.css);
          const isSelected = selectedIds.has(match.id);

          return (
            <div
              key={match.id}
              role="button"
              tabIndex={0}
              onClick={() => isSelecting ? toggleSelect(match.id) : onLoadMatch(match)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isSelecting ? toggleSelect(match.id) : onLoadMatch(match); } }}
              className={`group relative flex flex-col aspect-[4/3] rounded-2xl overflow-hidden border bg-white dark:bg-zinc-900 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left w-full ring-1 focus:outline-none focus:ring-2 cursor-pointer
                ${isSelected
                  ? 'border-indigo-500 ring-indigo-500 focus:ring-indigo-500/50'
                  : 'border-zinc-200/80 dark:border-white/10 ring-black/5 dark:ring-white/5 focus:ring-indigo-500/50'
                }`}
            >
              {/* Checkbox overlay in selection mode */}
              {isSelecting && (
                <div className={`absolute top-3 right-3 z-30 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 shadow-sm
                  ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'bg-white/80 border-white/60 backdrop-blur-sm'}`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              )}

              {hasPreview ? (
                <div className="w-full h-full relative overflow-hidden bg-white group-hover:bg-zinc-50 transition-colors duration-500">
                  <CardPreview candidate={previewCandidate} lang={lang} title={match.initialPrompt} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none z-10" />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 relative overflow-hidden">
                  <div className="w-24 h-24 mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700/50 group-hover:scale-110 transition-transform duration-500">
                    <LayoutTemplate className="w-10 h-10 opacity-40 text-current group-hover:text-indigo-500 group-hover:opacity-100 transition-all duration-500" />
                  </div>
                  <span className="text-sm font-medium tracking-wide opacity-80">Generating preview...</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none z-10" />
                </div>
              )}

              <div className="absolute bottom-0 inset-x-0 px-4 py-3 z-20 flex items-end justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white line-clamp-1 leading-snug drop-shadow-sm">
                    {match.initialPrompt}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs font-medium text-white/70">
                    <span>{new Date(match.updatedAt).toLocaleDateString(lang, { month: 'short', day: 'numeric' })}</span>
                    <span className="w-1 h-1 rounded-full bg-indigo-400" />
                    <span className="text-indigo-300">R{match.rounds}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!match.winner && (
                    <Wrench className="w-3.5 h-3.5 text-zinc-300 opacity-60" />
                  )}
                  {!isSelecting && (
                    <PlayCircle className="w-6 h-6 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
