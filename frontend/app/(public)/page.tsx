import {HeroSection, Highlights, Promo, About, Contact} from '@/features/home';
import Footer from '@/shared/components/layout/Footer';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <Highlights />
      <Promo />
      <About />
      <Contact />
      <Footer />
    </>
  );
}
