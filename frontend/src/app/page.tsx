import Hero from "@/components/landing/Hero";
import LandingNavbar from "@/components/landing/LandingNavbar";
import Sandbox from "@/components/landing/Sandbox";
import {
  CurriculumSection,
  SimulationsSection,
} from "@/components/landing/LandingSections";
import SiteFooter from "@/components/SiteFooter";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F3F8FC] text-slate-900">
      <LandingNavbar />
      <Hero />
      <SimulationsSection />
      <Sandbox />
      <CurriculumSection />
      <div id="about" className="scroll-mt-20">
        <SiteFooter />
      </div>
    </main>
  );
}
