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
  const [orderModalOpen, setOrderModalOpen] = useState(false);
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
    router.push('/');
    setTimeout(() => scrollToSection(id), 100);
    setMobileMenuOpen(false);
  };

  const handleOrderNowClick = () => {
    setOrderModalOpen(true);
    setMobileMenuOpen(false);
  };

  const handleContinueAsGuest = () => {
    setOrderModalOpen(false);
    router.push('/order');
  };

  const handleGoToSignIn = () => {
    setOrderModalOpen(false);
    router.push('/sign-in');
  };

  const handleGoToSignUp = () => {
    setOrderModalOpen(false);
    router.push('/sign-up');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between">
        <a
          onClick={e => {
            e.preventDefault();
            handleNavClick('home');
          }}
          className="flex items-center gap-3 cursor-default"
        >
          <Image
            src="/assets/logo.png"
            alt="DonClaudio's Logo"
            width={48}
            height={48}
          />
          <div>
            <h1 className="font-bold text-xl text-[#3c5e45]">
              DonClaudio&apos;s
            </h1>
            <p className="text-xs text-[#a4bbab]">Lechon House</p>
          </div>
        </a>

        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={e => {
                e.preventDefault();
                handleNavClick(item.id);
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

        <div className="hidden lg:flex gap-4 items-center">
          <Link href="/sign-in">Login</Link>
          <Button
            onClick={handleOrderNowClick}
            className="flex items-center gap-2 bg-[#3c5e45]"
          >
            <ShoppingCart className="w-4 h-4" />
            Order Now
          </Button>
        </div>

        <div className="flex lg:hidden items-center">
          <Button
            type="button"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            variant="ghost"
            size="icon"
            className="text-[#3c5e45] hover:bg-[#3c5e45]/10 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white/95 backdrop-blur-sm px-4 sm:px-6 py-4 flex flex-col gap-4">
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

          <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-gray-700 hover:opacity-80"
            >
              Login
            </Link>
            <Button
              onClick={handleOrderNowClick}
              className="flex items-center justify-center gap-2 bg-[#3c5e45] text-sm px-3 py-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Order Now
            </Button>
          </div>
        </div>
      )}

      {orderModalOpen && (
        <div
          className="fixed inset-0 z-60 h-dvh flex items-center justify-center bg-black/50 px-4"
          onClick={() => setOrderModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-130 rounded-xl bg-white shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <Button
              type="button"
              onClick={() => setOrderModalOpen(false)}
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="px-8 pb-8 pt-12 text-center">
              <div className="flex items-center justify-center gap-3">
                <Image
                  src="/assets/logo.png"
                  alt="DonClaudio's Logo"
                  width={56}
                  height={56}
                />
                <span className="text-2xl font-extrabold text-[#3c5e45]">
                  DonClaudio&apos;s
                </span>
              </div>

              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Sign up / Log in
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Welcome to DonClaudio&apos;s! Log in or create an account to
                start ordering.
              </p>

              <div className="mt-8 space-y-3">
                <Button
                  onClick={handleGoToSignUp}
                  size="lg"
                  className="w-full bg-[#3c5e45]"
                >
                  Sign up
                </Button>

                <Button
                  type="button"
                  onClick={handleGoToSignIn}
                  variant="link"
                  className="w-full text-sm font-semibold text-[#3c5e45]"
                >
                  Log in
                </Button>

                <div className="flex items-center gap-3 pt-2">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-gray-400">or</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <Button
                  type="button"
                  onClick={handleContinueAsGuest}
                  variant="link"
                  className="w-full text-sm font-semibold text-gray-700"
                >
                  Continue as Guest
                </Button>
              </div>

              <p className="mt-6 text-xs text-gray-500">
                By continuing, you agree to our Terms &amp; Conditions and
                Privacy Notice.
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}