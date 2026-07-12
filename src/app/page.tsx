import { Faq } from "@/components/landing/faq";
import { Gallery } from "@/components/landing/gallery";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LiveExample } from "@/components/landing/live-example";
import { PreviewStrip } from "@/components/landing/preview-strip";
import { ScoreTeaser } from "@/components/landing/score-teaser";
import { getAnalyzedRepos } from "@/lib/supabase/anon";

export const revalidate = 86400; // gallery ISR — 01 §9

export default async function Home() {
  const analyzed = await getAnalyzedRepos(8).catch(() => []);
  const entries = analyzed.map((row) => ({
    repo: `${row.owner}/${row.name}`,
    score: row.score,
    stack: row.techSlugs,
  }));
  return (
    <>
      <Hero />
      <PreviewStrip />
      <HowItWorks />
      <LiveExample />
      <ScoreTeaser />
      <Gallery entries={entries} />
      <Faq />
    </>
  );
}
