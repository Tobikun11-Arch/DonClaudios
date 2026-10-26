'use client';

import {ChevronLeft} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';

export type LegalSection = { heading: string; body: string[] };

export type LegalPageProps = {
  title: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
};

export function LegalLayout({ title, lastUpdated, intro, sections }: LegalPageProps) {
  const router = useRouter();
  return (
    <main className="mx-auto max-w-3xl px-4 pt-24 pb-8">
      <Button
        type="button"
        variant="ghost"
        className="mb-6 text-[#3c5e45] hover:text-[#3c5e45] hover:bg-[#3c5e45]/10"
        onClick={() => router.back()}
      >
        <ChevronLeft className="h-5 w-5 mr-2" />
        Back
      </Button>
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-sm text-gray-600 mb-4">Last updated: {lastUpdated}</p>
      {intro && <p className="mb-6">{intro}</p>}

      {sections.map((s, i) => (
        <section key={s.heading} className="mb-6">
          <h2 className="text-xl font-semibold mb-2">
            {i + 1}. {s.heading}
          </h2>
          {s.body.map((p, j) => (
            <p key={j} className="mb-2 text-gray-700">
              {p}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}