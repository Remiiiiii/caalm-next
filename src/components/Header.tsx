"use client";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background shadow-drop-1">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <div className="flex items-center">
          <Image
            src="/placeholder.svg"
            alt="Caalm Logo"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="ml-2 text-xl font-bold text-navy">Caalm</span>
        </div>
        <nav className="hidden items-center space-x-6 md:flex">
          <a
            href="#features"
            className="text-navy hover:text-coral transition-colors font-medium"
          >
            Features
          </a>
          <a
            href="#solutions"
            className="text-navy hover:text-coral transition-colors font-medium"
          >
            Solutions
          </a>
          <a
            href="#pricing"
            className="text-navy hover:text-coral transition-colors font-medium"
          >
            Pricing
          </a>
          <a
            href="#contact"
            className="text-navy hover:text-coral transition-colors font-medium"
          >
            Contact
          </a>
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <Link href="/login">
            <Button
              variant="ghost"
              className="text-navy hover:text-coral hover:bg-coral/10"
            >
              Sign In
            </Button>
          </Link>
          <Link href="/login">
            <Button className="bg-coral hover:bg-coral-dark text-white">
              Get Started
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden text-navy"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {isMenuOpen && (
        <div className="md:hidden py-4 border-t border-border bg-background">
          <nav className="flex flex-col space-y-4">
            <a href="#features" className="text-navy font-medium">
              Features
            </a>
            <a href="#solutions" className="text-navy font-medium">
              Solutions
            </a>
            <a href="#pricing" className="text-navy font-medium">
              Pricing
            </a>
            <a href="#contact" className="text-navy font-medium">
              Contact
            </a>
            <div className="flex flex-col space-y-2 pt-4">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="justify-start text-navy hover:text-coral hover:bg-coral/10"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/login">
                <Button className="justify-start bg-coral hover:bg-coral-dark text-white">
                  Get Started
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
