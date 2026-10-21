import { Header } from "./landing/Header";
import { Hero } from "./landing/Hero";
import { LandingDemoProvider } from "./landing/DemoContext";
import { DemoSection } from "./landing/DemoSection";
import { RitualSection } from "./landing/RitualSection";
import { PillarsSection } from "./landing/PillarsSection";
import { DuplicateSection } from "./landing/DuplicateSection";
import { FaqSection } from "./landing/FaqSection";
import { EarlyAccessSection } from "./landing/EarlyAccessSection";
import { Footer } from "./landing/Footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <Hero />
      <LandingDemoProvider>
        <DemoSection />
        <RitualSection />
        <PillarsSection />
        <DuplicateSection />
        <FaqSection />
        <EarlyAccessSection />
      </LandingDemoProvider>
      <Footer />
    </>
  );
}
