import LandingNav from './components/LandingNav';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import HowItWorksSection from './components/HowItWorksSection';
import TechStackSection from './components/TechStackSection';
import CTASection from './components/CTASection';
import LandingFooter from './components/LandingFooter';

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: '#07070E' }}>
      <LandingNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TechStackSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
