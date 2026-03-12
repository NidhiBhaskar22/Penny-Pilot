import AmbientTechBg from "../components/AmbientTechBG";
import HeroSection from "../components/home/HeroSection";
import TrustBarSection from "../components/home/TrustBarSection";
import OverviewSection from "../components/home/OverviewSection";
import FeaturesSection from "../components/home/FeaturesSection";
import AnalysisSection from "../components/home/AnalysisSection";
import PlanningSection from "../components/home/PlanningSection";
import WorkflowSection from "../components/home/WorkflowSection";
import UseCasesSection from "../components/home/UseCasesSection";
import SecuritySection from "../components/home/SecuritySection";
import FinalCtaSection from "../components/home/FinalCtaSection";
import HomeFooter from "../components/home/HomeFooter";

const HomePage = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060912] pt-24 text-mist md:pt-28">
      <AmbientTechBg hue={24} intensity={0.15} />

      <div className="relative z-10">
        <HeroSection />
        <TrustBarSection />
        <OverviewSection />
        <WorkflowSection />
        <AnalysisSection />
        <UseCasesSection />
        <SecuritySection />
        <FinalCtaSection />
        <HomeFooter />
      </div>
    </div>
  );
};

export default HomePage;
