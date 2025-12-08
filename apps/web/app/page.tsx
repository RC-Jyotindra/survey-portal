"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@repo/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      
      // Scroll-triggered animations
      const elements = document.querySelectorAll('.scroll-fade-in, .scroll-fade-in-left, .scroll-fade-in-right');
      elements.forEach((element) => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
          element.classList.add('visible');
        }
      });
    };
    
    window.addEventListener('scroll', handleScroll);
    // Initial check for elements already in view
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'glass backdrop-blur-md shadow-lg border-b border-white/20' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3 animate-fade-in">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Image
                  src="/globe.svg"
                  alt="Research Connect"
                  width={24}
                  height={24}
                  priority
                  className="w-6 h-6 text-white filter brightness-0 invert"
                />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Research Connect
              </span>
            </div>
            <nav className="hidden md:flex space-x-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <a href="#products" className="text-slate-600 hover:text-indigo-600 transition-all duration-300 font-medium relative group">
                Products
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="#about" className="text-slate-600 hover:text-indigo-600 transition-all duration-300 font-medium relative group">
                About
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="#contact" className="text-slate-600 hover:text-indigo-600 transition-all duration-300 font-medium relative group">
                Contact
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Animated gradient mesh background */}
          <div className="absolute inset-0 gradient-mesh-hero animate-gradient"></div>
          
          {/* Floating elements */}
          <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-xl animate-float"></div>
          <div className="absolute top-40 right-20 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-blue-400/20 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
            <div className="animate-fade-in-up">
              <h1 className="text-5xl md:text-7xl font-bold text-balance mb-8 leading-tight">
                <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-clip-text text-transparent">
                  Comprehensive Research Tools
                </span>
                <br />
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
                  for Your Organization
                </span>
              </h1>
            </div>
            
            <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-4xl mx-auto leading-relaxed text-pretty">
                Streamline your research workflow with our integrated suite of tools for survey creation, 
                panel management, and project coordination. Built for researchers, by researchers.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <Link href="/survey-builder">
                <Button appName="Survey Builder" className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-10 py-4 text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover-lift hover-glow">
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
                </Button>
              </Link>
              <Button appName="Survey Builder" className="group glass hover:bg-white/20 text-slate-700 hover:text-slate-900 border border-slate-200/50 hover:border-slate-300/50 px-10 py-4 text-lg font-semibold rounded-2xl transition-all duration-300 hover-lift backdrop-blur-sm">
                <span className="relative z-10">View Demo</span>
              </Button>
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section id="products" className="relative py-24 bg-gradient-to-b from-white to-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20 animate-fade-in-up">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Our Products
                </span>
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Choose the tools that fit your research needs and accelerate your workflow
              </p>
            </div>

            {/* Product Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Survey Builder Product */}
              <div className="group glass hover:bg-white/20 border border-white/20 hover:border-indigo-200/50 rounded-3xl p-8 hover-lift transition-all duration-500 flex flex-col relative overflow-hidden scroll-fade-in stagger-1">
                {/* Gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10 text-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                    <Image
                      src="/file-text.svg"
                      alt="Survey Builder"
                      width={36}
                      height={36}
                      priority
                      className="w-9 h-9 filter brightness-0 invert"
                    />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-4 group-hover:text-indigo-700 transition-colors duration-300">
                    Survey Builder
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Create and distribute professional surveys with advanced branching logic, real-time analytics, and seamless respondent management.
                  </p>
                </div>
                
                <ul className="relative z-10 text-left space-y-4 mb-8 flex-grow">
                  <li className="flex items-center text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                    <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mr-4 flex-shrink-0"></div>
                    Advanced question types
                  </li>
                  <li className="flex items-center text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                    <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mr-4 flex-shrink-0"></div>
                    Conditional branching
                  </li>
                  <li className="flex items-center text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                    <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mr-4 flex-shrink-0"></div>
                    Real-time analytics
                  </li>
                  <li className="flex items-center text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                    <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mr-4 flex-shrink-0"></div>
                    Multi-language support
                  </li>
                  <li className="flex items-center text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                    <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mr-4 flex-shrink-0"></div>
                    AI-powered insights
                  </li>
                </ul>
                
                <Link href="/survey-builder" className="relative z-10 w-full">
                  <Button appName="Survey Builder" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover-lift">
                    Launch Survey Builder
                  </Button>
                </Link>
              </div>

              {/* Panel Management Product */}
              <div className="group glass hover:bg-white/20 border border-white/20 hover:border-emerald-200/50 rounded-3xl p-8 hover-lift transition-all duration-500 flex flex-col relative overflow-hidden scroll-fade-in stagger-2">
                {/* Gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10 text-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                    <Image
                      src="/globe.svg"
                      alt="Panel Management"
                      width={36}
                      height={36}
                      className="w-9 h-9 filter brightness-0 invert"
                    />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-4 group-hover:text-emerald-700 transition-colors duration-300">
                    Panel Management
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Build and manage research participant panels with advanced segmentation, communication tools, and comprehensive tracking.
                  </p>
                </div>
                
                <ul className="relative z-10 text-left space-y-4 mb-8 flex-grow">
                  <li className="flex items-center text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                    <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mr-4 flex-shrink-0"></div>
                    Participant segmentation
                  </li>
                  <li className="flex items-center text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                    <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mr-4 flex-shrink-0"></div>
                    Communication tools
                  </li>
                  <li className="flex items-center text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                    <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mr-4 flex-shrink-0"></div>
                    Response tracking
                  </li>
                  <li className="flex items-center text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                    <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mr-4 flex-shrink-0"></div>
                    Quality monitoring
                  </li>
                  <li className="flex items-center text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                    <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mr-4 flex-shrink-0"></div>
                    Automated workflows
                  </li>
                </ul>
                
                <Link href="/panel-management" className="relative z-10 w-full">
                  <Button appName="Survey Builder" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover-lift">
                    Launch Panel Management
                  </Button>
                </Link>
              </div>

              {/* Project Management Product */}
              <div className="group glass hover:bg-white/20 border border-white/20 hover:border-purple-200/50 rounded-3xl p-8 hover-lift transition-all duration-500 flex flex-col relative overflow-hidden scroll-fade-in stagger-3">
                {/* Gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10 text-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                    <Image
                      src="/window.svg"
                      alt="Project Management"
                      width={36}
                      height={36}
                      className="w-9 h-9 filter brightness-0 invert"
                    />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-4 group-hover:text-purple-700 transition-colors duration-300">
                    Project Management
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Streamline research projects from planning to completion with task management, team collaboration, and progress tracking.
                  </p>
                </div>
                
                <ul className="relative z-10 text-left space-y-4 mb-8 flex-grow">
                  <li className="flex items-center text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                    <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-4 flex-shrink-0"></div>
                    Task management
                  </li>
                  <li className="flex items-center text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                    <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-4 flex-shrink-0"></div>
                    Team collaboration
                  </li>
                  <li className="flex items-center text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                    <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-4 flex-shrink-0"></div>
                    Progress tracking
                  </li>
                  <li className="flex items-center text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                    <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-4 flex-shrink-0"></div>
                    Resource allocation
                  </li>
                  <li className="flex items-center text-slate-600 group-hover:text-slate-700 transition-colors duration-300">
                    <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-4 flex-shrink-0"></div>
                    Timeline management
                  </li>
                </ul>
                
                <Link href="/project-management" className="relative z-10 w-full">
                  <Button appName="Survey Builder" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover-lift">
                    Launch Project Management
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="about" className="relative py-24 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
          {/* Background elements */}
          <div className="absolute top-0 left-0 w-full h-full gradient-mesh opacity-30"></div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20 animate-fade-in-up">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Why Research Connect?
                </span>
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Built for modern research teams with enterprise-grade features
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="group glass hover:bg-white/30 border border-white/20 hover:border-slate-200/50 rounded-2xl p-8 text-center hover-lift transition-all duration-300 scroll-fade-in stagger-1">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-indigo-100 group-hover:to-indigo-200 transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center group-hover:from-indigo-600 group-hover:to-indigo-700 transition-all duration-300">
                    <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3 group-hover:text-indigo-700 transition-colors duration-300">
                  Enterprise Security
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Bank-level security with SOC 2 compliance and end-to-end encryption
                </p>
              </div>
              
              <div className="group glass hover:bg-white/30 border border-white/20 hover:border-slate-200/50 rounded-2xl p-8 text-center hover-lift transition-all duration-300 scroll-fade-in stagger-2">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-emerald-100 group-hover:to-emerald-200 transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center group-hover:from-emerald-600 group-hover:to-emerald-700 transition-all duration-300">
                    <div className="w-4 h-4 bg-white rounded-sm transform rotate-45"></div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3 group-hover:text-emerald-700 transition-colors duration-300">
                  Lightning Fast
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Built for performance with 99.9% uptime and sub-second response times
                </p>
              </div>
              
              <div className="group glass hover:bg-white/30 border border-white/20 hover:border-slate-200/50 rounded-2xl p-8 text-center hover-lift transition-all duration-300 scroll-fade-in stagger-3">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-purple-100 group-hover:to-purple-200 transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center group-hover:from-purple-600 group-hover:to-purple-700 transition-all duration-300">
                    <div className="w-4 h-4 bg-white rounded-sm"></div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3 group-hover:text-purple-700 transition-colors duration-300">
                  Advanced Analytics
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Comprehensive insights with real-time dashboards and custom reporting
                </p>
              </div>
              
              <div className="group glass hover:bg-white/30 border border-white/20 hover:border-slate-200/50 rounded-2xl p-8 text-center hover-lift transition-all duration-300 scroll-fade-in stagger-4">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-orange-100 group-hover:to-orange-200 transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center group-hover:from-orange-600 group-hover:to-orange-700 transition-all duration-300">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3 group-hover:text-orange-700 transition-colors duration-300">
                  24/7 Support
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Dedicated support team available around the clock for your success
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20 overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-purple-500/5"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Image
                    src="/globe.svg"
                    alt="Research Connect"
                    width={24}
                    height={24}
                    className="w-6 h-6 filter brightness-0 invert"
                  />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                  Research Connect
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed max-w-sm">
                Empowering researchers with professional tools and insights to accelerate discovery and innovation.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-6 text-white">Products</h4>
              <div className="space-y-4">
                <Link href="/survey-builder" className="block text-slate-400 hover:text-white transition-all duration-300 hover:translate-x-1 group">
                  <span className="group-hover:text-indigo-400 transition-colors duration-300">Survey Builder</span>
                </Link>
                <Link href="/panel-management" className="block text-slate-400 hover:text-white transition-all duration-300 hover:translate-x-1 group">
                  <span className="group-hover:text-emerald-400 transition-colors duration-300">Panel Management</span>
                </Link>
                <Link href="/project-management" className="block text-slate-400 hover:text-white transition-all duration-300 hover:translate-x-1 group">
                  <span className="group-hover:text-purple-400 transition-colors duration-300">Project Management</span>
                </Link>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-6 text-white">Company</h4>
              <div className="space-y-4">
                <a href="#about" className="block text-slate-400 hover:text-white transition-all duration-300 hover:translate-x-1">
                  About
                </a>
                <a href="#contact" className="block text-slate-400 hover:text-white transition-all duration-300 hover:translate-x-1">
                  Contact
                </a>
                <Link href="/privacy" className="block text-slate-400 hover:text-white transition-all duration-300 hover:translate-x-1">
                  Privacy Policy
                </Link>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-6 text-white">Support</h4>
              <div className="space-y-4">
                <Link href="/help" className="block text-slate-400 hover:text-white transition-all duration-300 hover:translate-x-1">
                  Help Center
                </Link>
                <Link href="/docs" className="block text-slate-400 hover:text-white transition-all duration-300 hover:translate-x-1">
                  Documentation
                </Link>
                <Link href="/contact" className="block text-slate-400 hover:text-white transition-all duration-300 hover:translate-x-1">
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-700/50 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-slate-400">
                © {new Date().getFullYear()} Research Connect. All rights reserved.
              </p>
              <div className="flex space-x-6 text-sm text-slate-400">
                <a href="#" className="hover:text-white transition-colors duration-300">Terms of Service</a>
                <a href="#" className="hover:text-white transition-colors duration-300">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors duration-300">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
