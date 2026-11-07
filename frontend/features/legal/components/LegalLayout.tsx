'use client';

import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {ArrowUp, ChevronDown, ChevronLeft} from 'lucide-react';
import {Z} from '@/lib/zIndex';
import {useRouter} from 'next/navigation';

export type LegalTable = {
  columns: string[];
  rows: string[][];
};

export type LegalSection = {
  heading: string;
  /** One-line description used in the summary table at the top. */
  summary?: string;
  body: string[];
  /** Optional table shown under the section text. */
  table?: LegalTable;
};

export type LegalSlug = 'terms' | 'return-policy' | 'privacy';

export type LegalPageProps = {
  slug: LegalSlug;
  title: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
};

/** Documents listed in the sidebar, in display order. */
export const LEGAL_DOCS: {slug: LegalSlug; href: string; label: string}[] = [
  {slug: 'terms', href: '/terms', label: 'Terms & Conditions'},
  {slug: 'return-policy', href: '/return-policy', label: 'Return & Refund Policy'},
  {slug: 'privacy', href: '/privacy', label: 'Privacy Policy'}
];

const sectionId = (index: number) => `section-${index + 1}`;

function firstSentence(text: string) {
  const match = text.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : text).trim();
}

/** Highlights the section currently in view (sidebar scroll-spy). */
function useActiveSection(count: number) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const elements = Array.from({length: count}, (_, i) =>
      document.getElementById(sectionId(i))
    ).filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActive(elements.indexOf(visible[0].target as HTMLElement));
        }
      },
      {rootMargin: '-120px 0px -60% 0px'}
    );
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [count]);
  return active;
}

/**
 * True once the element has scrolled out of view. Used to show "back to top"
 * only when the document list (sidebar) can no longer be seen. On desktop the
 * sidebar is sticky, so it never leaves the screen and the button stays hidden.
 */
function useScrolledPast(ref: React.RefObject<HTMLElement | null>) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return past;
}

export function LegalLayout({slug, title, lastUpdated, intro, sections}: LegalPageProps) {
  const router = useRouter();
  const active = useActiveSection(sections.length);
  const [tocOpen, setTocOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const showBackToTop = useScrolledPast(navRef);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-16 sm:px-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-[#3c5e45] hover:bg-[#3c5e45]/10"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
          {/* Sidebar */}
          <aside className="mb-8 lg:mb-0">
            <nav
              ref={navRef}
              aria-label="Legal documents"
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:sticky lg:top-28"
            >
              <p className="text-lg font-bold text-gray-900">Legal</p>

              <ul className="mt-4 space-y-1">
                {LEGAL_DOCS.map(doc => {
                  const isCurrent = doc.slug === slug;
                  return (
                    <li key={doc.slug}>
                      <Link
                        href={doc.href}
                        aria-current={isCurrent ? 'page' : undefined}
                        className={`block rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                          isCurrent
                            ? 'bg-[#3c5e45]/10 text-[#2d4a35]'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {doc.label}
                      </Link>

                      {isCurrent ? (
                        <>
                          {/* Mobile/tablet: collapsible "On this page" */}
                          <button
                            type="button"
                            onClick={() => setTocOpen(o => !o)}
                            aria-expanded={tocOpen}
                            className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden"
                          >
                            On this page
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${tocOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                          <ul
                            className={`mt-1 space-y-0.5 border-l border-gray-100 pl-3 ml-3 ${
                              tocOpen ? 'block' : 'hidden'
                            } lg:block`}
                          >
                            {sections.map((s, i) => (
                              <li key={s.heading}>
                                <a
                                  href={`#${sectionId(i)}`}
                                  onClick={() => setTocOpen(false)}
                                  className={`block rounded-md px-2 py-1.5 text-sm leading-snug transition-colors ${
                                    active === i
                                      ? 'font-semibold text-[#3c5e45]'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  {i + 1}. {s.heading}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Document */}
          <article className="min-w-0">
            <h1 className="text-2xl font-extrabold uppercase leading-tight tracking-tight text-gray-900 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-gray-500">Last updated: {lastUpdated}</p>

            {intro ? (
              <p className="mt-6 text-[15px] leading-7 text-gray-800">{intro}</p>
            ) : null}

            <p className="mt-6 text-[15px] leading-7 text-gray-800">
              This document is made up of the following sections:
            </p>

            <LegalTableView
              className="mt-4"
              table={{
                columns: ['Section', 'What it covers'],
                rows: sections.map((s, i) => [
                  `${i + 1}. ${s.heading}`,
                  s.summary ?? firstSentence(s.body[0] ?? '')
                ])
              }}
              linkFirstColumn
            />

            <div className="mt-10 space-y-10">
              {sections.map((s, i) => (
                <section key={s.heading} id={sectionId(i)} className="scroll-mt-28">
                  <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
                    {i + 1}. {s.heading}
                  </h2>
                  <div className="mt-3 space-y-3">
                    {s.body.map((p, j) => (
                      <p key={j} className="text-[15px] leading-7 text-gray-700">
                        {p}
                      </p>
                    ))}
                  </div>
                  {s.table ? <LegalTableView className="mt-4" table={s.table} /> : null}
                </section>
              ))}
            </div>
          </article>
        </div>
      </div>

      {/* Back to top: sits just above the support chat bubble (same right
          edge, centred on its 56px width). */}
      <button
        type="button"
        aria-label="Back to top"
        title="Back to top"
        onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
        className={`fixed right-[26px] ${Z.floating} flex h-11 w-11 items-center justify-center rounded-full bg-[#2d4a35] text-white shadow-lg transition-all duration-200 hover:bg-[#3c5e45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbd897] bottom-[calc(env(safe-area-inset-bottom,10px)+8.75rem)] md:bottom-[5.5rem] ${
          showBackToTop
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-3 opacity-0'
        }`}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </main>
  );
}

function LegalTableView({
  table,
  className = '',
  linkFirstColumn = false
}: {
  table: LegalTable;
  className?: string;
  linkFirstColumn?: boolean;
}) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-gray-200 ${className}`}>
      <table
        className={`w-full border-collapse text-left text-sm ${
          // Two columns fit on a phone; wider tables scroll sideways instead.
          table.columns.length > 2 ? 'min-w-[520px]' : ''
        }`}
      >
        <thead>
          <tr className="bg-[#2d4a35] text-white">
            {table.columns.map(col => (
              <th
                key={col}
                scope="col"
                className="border-r border-white/15 px-4 py-3 text-center font-semibold last:border-r-0"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r} className="border-t border-gray-200 align-top">
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={`border-r border-gray-200 px-3 py-3 leading-6 last:border-r-0 sm:px-4 ${
                    c === 0
                      ? 'w-[32%] bg-gray-50 font-semibold text-gray-900'
                      : 'text-gray-700'
                  }`}
                >
                  {linkFirstColumn && c === 0 ? (
                    <a href={`#${sectionId(r)}`} className="hover:text-[#3c5e45] hover:underline">
                      {cell}
                    </a>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
