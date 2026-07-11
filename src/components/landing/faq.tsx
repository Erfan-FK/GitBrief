import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const ITEMS = [
  {
    q: "Is it free?",
    a: "Yes — public repos are free, no signup. If gitbrief saves you time, there's a donate button in the footer.",
  },
  {
    q: "Do you store my code?",
    a: "No. We read manifests and configs via GitHub's API; we don't clone or keep your source. Analysis artifacts contain only detected technologies and generated docs.",
  },
  {
    q: "How is this different from /init?",
    a: "Generated context files often perform no better than none — LLMs hallucinate commands and paths. gitbrief parses lockfiles and scripts for ground truth, and every command in the output is verified against your repo or removed.",
  },
  {
    q: "What's a skill file?",
    a: "A SKILL.md teaches an agent how to use one technology correctly — version-matched to what your repo actually installs. Official vendor skills are fetched first; we only generate when none exists.",
  },
  {
    q: "Private repos?",
    a: "Coming soon. Today gitbrief works on public repos only; private repos will arrive with GitHub sign-in.",
  },
  {
    q: "How accurate is detection?",
    a: "Deterministic. Versions come from lockfiles — never guessed ranges — and every detection carries evidence you can inspect in the results view.",
  },
];

/** 01 §10 — single-open accordion, answers ≤3 sentences. */
export function Faq() {
  return (
    <section id="faq" className="px-6 py-24 max-md:py-16">
      <div className="mx-auto max-w-[720px]">
        <h2 className="text-center font-display text-[2rem] font-bold tracking-[-0.02em]">
          FAQ
        </h2>
        <Accordion multiple={false} className="mt-10">
          {ITEMS.map(({ q, a }) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="text-left font-display text-base font-medium hover:no-underline">
                {q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
