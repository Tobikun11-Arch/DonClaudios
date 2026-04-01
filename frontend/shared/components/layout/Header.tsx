'use client';

import Image from 'next/image';
import {Button} from '@/components/ui/button';
import {ShoppingCart} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';

export default function Header() {
  const [activeSection, setActiveSection] = useState('home');
  const router = useRouter();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'highlights', 'promo', 'about', 'contact'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const {offsetTop, offsetHeight} = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    {id: 'home', label: 'Home'},
    {id: 'highlights', label: 'Highlights'},
    {id: 'promo', label: 'Promo'},
    {id: 'about', label: 'About'},
    {id: 'contact', label: 'Contact'}
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto px-10 py-3 flex items-center justify-between">
        <a
          href="#home"
          onClick={e => {
            e.preventDefault();
            scrollToSection('home');
          }}
          className="flex items-center gap-3"
        >
          <Image src="/assets/logo.png" alt="DonClaudio's Logo" width={48} height={48} />
          <div>
            <h1 className="font-bold text-xl" style={{color: '#3c5e45'}}>
              DonClaudio&apos;s
            </h1>
            <p className="text-xs" style={{color: '#a4bbab'}}>
              Lechon House
            </p>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={e => {
                e.preventDefault();
                scrollToSection(item.id);
              }}
              className={`text-sm font-medium transition-colors hover:opacity-80 ${
                activeSection === item.id ? 'font-bold' : ''
              }`}
              style={{
                color: activeSection === item.id ? '#3c5e45' : '#a4bbab'
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className='flex gap-4 items-center'>
          <Link href="/sign-in">Login</Link>
          <Button
            onClick={() => router.push('/order')}
            className="flex items-center gap-2 bg-[#3c5e45]"
          >
            <ShoppingCart className="w-4 h-4" />
            Order Now
          </Button>
        </div>
      </div>
    </header>
  );
}
