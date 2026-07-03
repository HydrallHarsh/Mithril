import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CogneeStack } from "@/components/landing/CogneeStack";
import { ComparisonTable } from "@/components/landing/ComparisonTable";
import { LandingCta } from "@/components/landing/LandingCta";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { FloatingDock } from "@/components/landing/FloatingDock";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-black font-body text-zinc-100">
      <LandingNav />
      <main>
        <HeroSection />
        <HowItWorks />
        <CogneeStack />
        <ComparisonTable />
        <LandingCta />
      </main>
      <LandingFooter />
      <FloatingDock />
    </div>
  );
}
