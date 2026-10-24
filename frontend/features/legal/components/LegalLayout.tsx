export type LegalSection = { heading: string; body: string[] };

export type LegalPageProps = {
  title: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
};

export function LegalLayout({ title, lastUpdated, intro, sections }: LegalPageProps) {
  return (
    <main className="mx-auto max-w-3xl p-4">
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
