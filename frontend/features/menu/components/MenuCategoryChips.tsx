'use client';

import Image from 'next/image';
import {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {ChevronLeft, ChevronRight, LayoutGrid, Search, Sparkles, Tag, X} from 'lucide-react';
import {cn} from '@/lib/utils';
import {FEATURED_TAB_ID, PROMOS_TAB_ID, type MenuTab} from '../menuItems';

/** Chips with no category photo get an icon instead. */
const CHIP_ICONS = {[FEATURED_TAB_ID]: Sparkles, [PROMOS_TAB_ID]: Tag} as const;

/** Show the "find a category" search box once the list gets this long. */
const SEARCH_THRESHOLD = 8;

function TabAvatar({tab, active, size}: {tab: MenuTab; active: boolean; size: 'sm' | 'lg'}) {
  const ChipIcon = tab.imageUrl ? null : CHIP_ICONS[tab.id as keyof typeof CHIP_ICONS];
  const box = size === 'sm' ? 'h-8 w-8' : 'h-12 w-12';
  if (tab.imageUrl) {
    return (
      <span className={cn('relative shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800', box)}>
        <Image src={tab.imageUrl} alt="" fill sizes={size === 'sm' ? '32px' : '48px'} className="object-cover" />
      </span>
    );
  }
  if (ChipIcon) {
    return (
      <span
        className={cn(
          'grid shrink-0 place-items-center rounded-full',
          box,
          active ? 'bg-white/15' : 'bg-[#2d4a35]/10 text-[#2d4a35] dark:text-[#7ed4a0]'
        )}
      >
        <ChipIcon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
      </span>
    );
  }
  if (size === 'lg') {
    // Big grid tiles always get an avatar so the grid stays aligned.
    return (
      <span
        className={cn(
          'grid shrink-0 place-items-center rounded-full text-base font-bold',
          box,
          active ? 'bg-white/15 text-white' : 'bg-[#2d4a35]/10 text-[#2d4a35] dark:text-[#7ed4a0]'
        )}
      >
        {tab.label.charAt(0).toUpperCase()}
      </span>
    );
  }
  return null;
}

/**
 * Category navigation built for long lists (20+ categories):
 *
 * - One sticky, horizontally scrolling chip row (the pattern used by most food
 *   delivery apps). The active chip is scrolled into the middle automatically.
 * - Edge fades + arrow buttons on desktop show there is more to scroll.
 * - An "All" button opens a full grid of every category with item counts and
 *   a quick search, so nobody has to swipe through 20 chips to find one.
 */
export function MenuCategoryChips({
  tabs,
  activeId,
  onSelect,
  counts
}: {
  tabs: MenuTab[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Item count per tab id, shown in the "All categories" panel. */
  counts?: Record<string, number>;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({left: false, right: false});
  const [panelOpen, setPanelOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    });
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateEdges, tabs.length]);

  // Keep the active chip visible (centered) whenever it changes.
  useEffect(() => {
    const el = scrollerRef.current;
    const chip = el?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(activeId)}"]`);
    if (!el || !chip) return;
    const target = chip.offsetLeft - el.clientWidth / 2 + chip.clientWidth / 2;
    el.scrollTo({left: Math.max(0, target), behavior: 'smooth'});
  }, [activeId]);

  // Close the panel on Escape and lock page scroll while it is open.
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [panelOpen]);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({left: dir * el.clientWidth * 0.7, behavior: 'smooth'});
  };

  const pick = (id: string) => {
    onSelect(id);
    setPanelOpen(false);
    setFilter('');
  };

  const activeTab = tabs.find(t => t.id === activeId);
  const q = filter.trim().toLowerCase();
  const panelTabs = q ? tabs.filter(t => t.label.toLowerCase().includes(q)) : tabs;

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={panelOpen}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition-colors hover:border-[#2d4a35]/40 hover:bg-[#2d4a35]/5 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          title="See all categories"
        >
          <LayoutGrid className="h-4 w-4 text-[#2d4a35] dark:text-[#7ed4a0]" />
          <span className="hidden sm:inline">All</span>
          <span className="rounded-full bg-[#2d4a35]/10 px-1.5 text-[11px] font-bold text-[#2d4a35] dark:text-[#7ed4a0]">
            {tabs.length}
          </span>
        </button>

        <div className="relative min-w-0 flex-1">
          {/* Edge fades hint that the row scrolls. */}
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[var(--chip-fade,#ffffff)] to-transparent transition-opacity',
              edges.left ? 'opacity-100' : 'opacity-0'
            )}
          />
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[var(--chip-fade,#ffffff)] to-transparent transition-opacity',
              edges.right ? 'opacity-100' : 'opacity-0'
            )}
          />
          {edges.left && (
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Scroll categories left"
              className="absolute left-0 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md hover:bg-gray-50 md:grid dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {edges.right && (
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Scroll categories right"
              className="absolute right-0 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md hover:bg-gray-50 md:grid dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <div
            ref={scrollerRef}
            onScroll={updateEdges}
            role="tablist"
            aria-label="Menu categories"
            className="flex snap-x gap-2 overflow-x-auto scroll-smooth scrollbar-hide py-1"
          >
            {tabs.map(tab => {
              const active = tab.id === activeId;
              const hasAvatar =
                !!tab.imageUrl || !!CHIP_ICONS[tab.id as keyof typeof CHIP_ICONS];
              return (
                <button
                  key={tab.id}
                  data-tab-id={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSelect(tab.id)}
                  className={cn(
                    'flex h-10 shrink-0 snap-start items-center gap-2 rounded-full border pr-3.5 text-sm font-semibold whitespace-nowrap transition-colors',
                    hasAvatar ? 'pl-1' : 'pl-3.5',
                    active
                      ? 'border-[#2d4a35] bg-[#2d4a35] text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-[#2d4a35]/40 hover:bg-[#2d4a35]/5 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                  )}
                >
                  <TabAvatar tab={tab} active={active} size="sm" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Portal: the chip bar sits in a sticky/transformed parent that would
          otherwise trap a `fixed` overlay. */}
      {panelOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Close categories"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setPanelOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="All categories"
            className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl dark:bg-gray-900"
          >
            <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-gray-200 sm:hidden dark:bg-gray-700" />
            <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#2d4a35] dark:text-[#7ed4a0]">
                  All categories
                </h3>
                {activeTab && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Viewing <span className="font-semibold">{activeTab.label}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {tabs.length >= SEARCH_THRESHOLD && (
              <div className="px-5 pb-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    autoFocus
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    placeholder="Find a category"
                    aria-label="Find a category"
                    className="h-10 w-full rounded-full bg-gray-100 pl-10 pr-4 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#2d4a35]/40 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>
            )}

            <div className="overflow-y-auto px-5 pb-6">
              {panelTabs.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No category matches “{filter}”.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {panelTabs.map(tab => {
                    const active = tab.id === activeId;
                    const count = counts?.[tab.id];
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => pick(tab.id)}
                        className={cn(
                          'flex min-w-0 items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors',
                          active
                            ? 'border-[#2d4a35] bg-[#2d4a35] text-white'
                            : 'border-gray-100 bg-gray-50 text-gray-800 hover:border-[#2d4a35]/40 hover:bg-[#2d4a35]/5 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100'
                        )}
                      >
                        <TabAvatar tab={tab} active={active} size="lg" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{tab.label}</span>
                          {typeof count === 'number' && (
                            <span
                              className={cn(
                                'block text-xs',
                                active ? 'text-white/75' : 'text-gray-500 dark:text-gray-400'
                              )}
                            >
                              {count} item{count === 1 ? '' : 's'}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
