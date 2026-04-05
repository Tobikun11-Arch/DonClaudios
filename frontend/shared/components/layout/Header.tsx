'use client';

import Image from 'next/image';
import {Button} from '@/components/ui/button';
import {ShoppingCart, Menu, X} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {navItems} from '@/shared/constants/navigation';
import {scrollToSection} from '@/shared/utils/scroll';

export default function Header() {
  const [activeSection, setActiveSection] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = (id: string) => {
    scrollToSection(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto px-10 py-3 flex items-center justify-between">
        <a
          href="#home"
          onClick={e => {
            e.preventDefault();
            handleNavClick('home');
          }}
          className="flex items-center gap-3"
        >
          <Image
            src="/assets/logo.png"
            alt="DonClaudio's Logo"
            width={48}
            height={48}
          />
          <div>
            <h1 className="font-bold text-xl" style={{color: '#3c5e45'}}>
              DonClaudio&apos;s
            </h1>
            <p className="text-xs" style={{color: '#a4bbab'}}>
              Lechon House
            </p>
          </div>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
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

        {/* Desktop Actions */}
        <div className="hidden lg:flex gap-4 items-center">
          <Link href="/sign-in">Login</Link>
          <Button
            onClick={() => router.push('/order')}
            className="flex items-center gap-2 bg-[#3c5e45]"
          >
            <ShoppingCart className="w-4 h-4" />
            Order Now
          </Button>
        </div>

        {/* Mobile Burger Icon */}
        <div className="flex lg:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="p-2 rounded-md text-[#3c5e45] hover:bg-[#3c5e45]/10 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white/95 backdrop-blur-sm px-10 py-4 flex flex-col gap-4">
          {navItems.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={e => {
                e.preventDefault();
                handleNavClick(item.id);
              }}
              className={`text-sm font-medium transition-colors hover:opacity-80 py-1 ${
                activeSection === item.id ? 'font-bold' : ''
              }`}
              style={{
                color: activeSection === item.id ? '#3c5e45' : '#a4bbab'
              }}
            >
              {item.label}
            </a>
          ))}

          {/* Actions at bottom of mobile menu */}
          <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-gray-700 hover:opacity-80"
            >
              Login
            </Link>
            <Button
              onClick={() => router.push('/order')}
              className="flex items-center justify-center gap-2 bg-[#3c5e45] text-sm px-3 py-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Order Now
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
