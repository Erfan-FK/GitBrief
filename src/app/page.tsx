import { Faq } from "@/components/landing/faq";
import { Gallery } from "@/components/landing/gallery";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LiveExample } from "@/components/landing/live-example";
import { PreviewStrip } from "@/components/landing/preview-strip";
import { ScoreTeaser } from "@/components/landing/score-teaser";

export default function Home() {
  return (
    <>
      <Hero />
      <PreviewStrip />
      <HowItWorks />
      <LiveExample />
      <ScoreTeaser />
      <Gallery />
      <Faq />
    </>
  );
}
