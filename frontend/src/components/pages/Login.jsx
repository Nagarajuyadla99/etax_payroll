/**
 * PayWise — Enterprise Payroll Management Platform
 * Premium fintech UI — light theme, multi-color design system
 * Production-ready React component
 * 
 * ✅ Enhanced UI/UX — Enterprise-grade visual refresh
 *    - Upgraded typography with Inter + Playfair Display
 *    - Refined spacing, alignment, and visual hierarchy
 *    - Polished animations and micro-interactions
 *    - Improved hero section with gradient mesh background
 *    - Enhanced card designs with glass-morphism effects
 *    - Better mobile responsiveness
 *    - All business logic & auth flow preserved exactly
 */

import { useEffect, useRef, useCallback } from "react";
import logo1 from "../assets/images/logo_brixigo3.png";
import { useState, useContext } from "react";
import { AuthContext } from "../../Moduels/Context/AuthContext";
import { useNavigate } from "react-router-dom";
import RegisterModal from "./RegisterModal";
import ResetPassword from "./ResetPassword";
import api from "../../services/api";



/* ─────────────────────────────────────────────
   GLOBAL STYLES — ENHANCED ENTERPRISE UI
───────────────────────────────────────────── */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ============================================
   PAYWISE DESIGN SYSTEM — REFINED FINTECH PALETTE
============================================ */
:root {
  /* Core Backgrounds */
  --bg-base:        #F8FAFC;
  --bg-card:        #FFFFFF;
  --bg-subtle:      #F1F5F9;
  --bg-muted:       #E2E8F0;

  /* Primary Slate (text/headers) */
  --slate-900:      #0F172A;
  --slate-800:      #1E293B;
  --slate-700:      #334155;
  --slate-600:      #475569;
  --slate-500:      #64748B;
  --slate-400:      #94A3B8;
  --slate-300:      #CBD5E1;
  --slate-200:      #E2E8F0;
  --slate-100:      #F1F5F9;

  /* Action Blue */
  --blue-700:       #1D4ED8;
  --blue-600:       #2563EB;
  --blue-500:       #3B82F6;
  --blue-400:       #60A5FA;
  --blue-100:       #DBEAFE;
  --blue-50:        #EFF6FF;

  /* Secondary Teal */
  --teal-700:       #0F766E;
  --teal-600:       #0D9488;
  --teal-500:       #14B8A6;
  --teal-100:       #CCFBF1;
  --teal-50:        #F0FDFA;

  /* Success Green (salary/payments) */
  --green-700:      #15803D;
  --green-600:      #16A34A;
  --green-500:      #22C55E;
  --green-100:      #DCFCE7;
  --green-50:       #F0FDF4;

  /* Warning Amber */
  --amber-700:      #B45309;
  --amber-600:      #D97706;
  --amber-500:      #F59E0B;
  --amber-100:      #FEF3C7;
  --amber-50:       #FFFBEB;

  /* Danger Red */
  --red-600:        #DC2626;
  --red-100:        #FEE2E2;

  /* Borders */
  --border:         #E2E8F0;
  --border-focus:   #2563EB;

  /* Shadows — refined depth system */
  --shadow-xs:      0 1px 2px rgba(15,23,42,0.04);
  --shadow-sm:      0 2px 8px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);
  --shadow-md:      0 4px 16px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04);
  --shadow-lg:      0 12px 40px rgba(15,23,42,0.10), 0 4px 12px rgba(15,23,42,0.05);
  --shadow-xl:      0 24px 64px rgba(15,23,42,0.12), 0 8px 24px rgba(15,23,42,0.06);
  --shadow-card:    0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);
  --shadow-card-hover: 0 20px 50px rgba(15,23,42,0.10), 0 6px 16px rgba(15,23,42,0.05);

  /* Typography */
  --font-display:   'DM Serif Display', Georgia, serif;
  --font-body:      'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif;

  /* Transitions */
  --ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);
}

html { scroll-behavior: smooth; }

body {
  background: var(--bg-base);
  color: var(--slate-900);
  font-family: var(--font-body);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* ============================================
   SELECTION
============================================ */
::selection {
  background: rgba(37,99,235,0.12);
  color: var(--slate-900);
}

/* ============================================
   NAVBAR — Refined glass header
============================================ */
.pw-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(226,232,240,0.6);
  transition: all 0.3s var(--ease-out-expo);
}

.pw-nav.scrolled {
  box-shadow: 0 1px 12px rgba(15,23,42,0.06);
}

.nav-links button {
  position: relative;
}

.nav-links button::after {
  content: "";
  position: absolute;
  left: 12px;
  bottom: 4px;
  height: 2px;
  width: 0%;
  background: linear-gradient(90deg, var(--blue-600), var(--blue-400));
  border-radius: 2px;
  transition: width 0.3s var(--ease-out-expo);
}

.nav-links button:hover::after,
.nav-links button.active::after {
  width: calc(100% - 24px);
}

/* ============================================
   BUTTONS — Enhanced with better depth
============================================ */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-body);
  font-weight: 600;
  cursor: pointer;
  border: none;
  outline: none;
  text-decoration: none;
  transition: all 0.25s var(--ease-out-expo);
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.btn-primary {
  background: linear-gradient(135deg, var(--blue-600) 0%, var(--blue-700) 100%);
  color: #fff;
  box-shadow: 0 4px 14px rgba(37,99,235,0.28), 0 1px 3px rgba(37,99,235,0.12);
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(37,99,235,0.35), 0 2px 6px rgba(37,99,235,0.18);
}
.btn-primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(37,99,235,0.25);
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--slate-700);
  border: 1.5px solid var(--border);
  box-shadow: var(--shadow-xs);
}
.btn-secondary:hover:not(:disabled) {
  border-color: var(--blue-400);
  color: var(--blue-600);
  box-shadow: var(--shadow-sm), 0 0 0 3px rgba(59,130,246,0.06);
  transform: translateY(-1px);
}

.btn-success {
  background: linear-gradient(135deg, var(--green-600), var(--green-700));
  color: #fff;
  box-shadow: 0 4px 14px rgba(22,163,74,0.28);
}
.btn-success:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(22,163,74,0.38);
}

.btn-teal {
  background: linear-gradient(135deg, var(--teal-500), var(--teal-700));
  color: #fff;
  box-shadow: 0 4px 14px rgba(20,184,166,0.28);
}
.btn-teal:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(20,184,166,0.38);
}

.btn-sm  { padding: 8px 16px; font-size: 13px; border-radius: 8px; }
.btn-md  { padding: 11px 22px; font-size: 14px; border-radius: 10px; }
.btn-lg  { padding: 14px 28px; font-size: 15px; border-radius: 12px; }
.btn-xl  { padding: 16px 36px; font-size: 15px; border-radius: 12px; letter-spacing: 0; }

/* ============================================
   CARDS — Refined with subtle glass effect
============================================ */
.pw-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow-card);
  transition: all 0.35s var(--ease-out-expo);
}
.pw-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(226,232,240,0.4);
}

.pw-card-flat {
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(226,232,240,0.7);
  border-radius: 18px;
  box-shadow: var(--shadow-card);
}

/* ============================================
   FORM INPUTS — Refined feel
============================================ */
.pw-input-wrap { position: relative; }

.pw-label {
  display: block;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--slate-500);
  text-transform: uppercase;
  letter-spacing: 0.7px;
  margin-bottom: 6px;
}

.pw-input {
  width: 100%;
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px 12px 42px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--slate-900);
  outline: none;
  transition: all 0.2s var(--ease-out-expo);
}
.pw-input::placeholder { color: var(--slate-400); }
.pw-input:focus {
  border-color: var(--blue-500);
  box-shadow: 0 0 0 3.5px rgba(59,130,246,0.12);
}
.pw-input.error {
  border-color: var(--red-600);
  box-shadow: 0 0 0 3px rgba(220,38,38,0.10);
}
.pw-input.success {
  border-color: var(--green-500);
  box-shadow: 0 0 0 3px rgba(34,197,94,0.10);
}
.pw-input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--slate-400);
  pointer-events: none;
  display: flex;
  transition: color 0.2s;
}

/* ============================================
   BADGES — More refined
============================================ */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  padding: 4px 11px;
  border-radius: 999px;
}
.badge-blue   { background: var(--blue-50);  color: var(--blue-700); border: 1px solid var(--blue-100); }
.badge-green  { background: var(--green-50); color: var(--green-700); border: 1px solid var(--green-100); }
.badge-teal   { background: var(--teal-50);  color: var(--teal-700); border: 1px solid var(--teal-100); }
.badge-amber  { background: var(--amber-50); color: var(--amber-700); border: 1px solid var(--amber-100); }
.badge-slate  { background: var(--slate-100); color: var(--slate-700); border: 1px solid var(--slate-200); }

/* ============================================
   STAT PILLS
============================================ */
.stat-up   { color: var(--green-600); background: var(--green-50); border-radius: 6px; padding: 2px 7px; font-size: 12px; font-weight: 700; }
.stat-down { color: var(--red-600);   background: var(--red-100);  border-radius: 6px; padding: 2px 7px; font-size: 12px; font-weight: 700; }

/* ============================================
   MODAL — Enhanced with better backdrop
============================================ */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,0.45);
  backdrop-filter: blur(8px) saturate(150%);
  -webkit-backdrop-filter: blur(8px) saturate(150%);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.25s var(--ease-out-expo);
  overflow-y: auto;
}
.modal-card {
  background: var(--bg-card);
  border: 1px solid rgba(226,232,240,0.6);
  border-radius: 22px;
  box-shadow: 0 32px 80px rgba(15,23,42,0.18), 0 12px 32px rgba(15,23,42,0.08);
  width: 100%;
  max-width: 440px;
  padding: 36px 40px 32px;
  position: relative;
  animation: modalSlideUp 0.35s var(--ease-out-expo);
  margin: auto;
}

/* ============================================
   ANIMATIONS — Refined timing
============================================ */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes modalSlideUp {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-10px); }
}
@keyframes countUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}

.float-card { animation: float 6s ease-in-out infinite; }
.float-card-2 { animation: float 6s ease-in-out infinite; animation-delay: 2s; }
.float-card-3 { animation: float 6s ease-in-out infinite; animation-delay: 4s; }

.fade-in-up { animation: fadeInUp 0.6s var(--ease-out-expo) both; }
.fade-in-up-1 { animation: fadeInUp 0.6s var(--ease-out-expo) 0.1s both; }
.fade-in-up-2 { animation: fadeInUp 0.6s var(--ease-out-expo) 0.2s both; }
.fade-in-up-3 { animation: fadeInUp 0.6s var(--ease-out-expo) 0.3s both; }

/* ============================================
   HERO SECTION — Refined gradient mesh
============================================ */
.hero-section {
  background: linear-gradient(165deg, #FFFFFF 0%, #F0F7FF 35%, #F0FDFA 70%, #FAFBFF 100%);
  border-bottom: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.hero-section::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 600px 500px at 75% 15%, rgba(37,99,235,0.07) 0%, transparent 70%),
    radial-gradient(ellipse 500px 400px at 25% 75%, rgba(20,184,166,0.06) 0%, transparent 70%),
    radial-gradient(ellipse 400px 300px at 50% 50%, rgba(139,92,246,0.03) 0%, transparent 70%);
  pointer-events: none;
}
.hero-grid {
  background-image:
    linear-gradient(rgba(37,99,235,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(37,99,235,0.035) 1px, transparent 1px);
  background-size: 48px 48px;
  position: absolute;
  inset: 0;
  pointer-events: none;
  mask-image: radial-gradient(ellipse 70% 60% at 60% 40%, black 20%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 60% 40%, black 20%, transparent 70%);
}
.hero-cols {
  display: flex;
  gap: 72px;
}

.hero-left {
  flex: 1;
  min-width: 300px;
}

.hero-right {
  flex: 1;
  min-width: 280px;
}

/* Mobile */
@media (max-width: 768px) {
  .hero-cols {
    flex-direction: column;
    gap: 36px;
  }
  .nav-links {
    display: flex;
    gap: 8px;
  }

  .mobile-menu {
    display: none;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }

  .mobile-menu {
    display: block;
  }

  .hero-right {
    align-items: center !important;
  }

  .hero-section {
    padding: 60px 20px 70px !important;
  }
}

/* ============================================
   FEATURES — Enhanced card grid
============================================ */
.feature-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.25s var(--ease-out-expo);
}

.feature-card:hover .feature-icon-wrap {
  transform: scale(1.08) rotate(-2deg);
}

/* ============================================
   PRICING
============================================ */
.pricing-popular {
  border: 2px solid var(--blue-500);
  position: relative;
  background: linear-gradient(180deg, rgba(239,246,255,0.4) 0%, #FFFFFF 40%);
}
.pricing-popular-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, var(--blue-600), var(--blue-700));
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 16px;
  border-radius: 999px;
  white-space: nowrap;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(37,99,235,0.25);
}

/* ============================================
   FOOTER
============================================ */
.pw-footer {
  background: var(--slate-900);
  color: var(--slate-400);
}

/* ============================================
   DIVIDER
============================================ */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--slate-400);
  font-size: 12px;
  font-weight: 600;
}
.divider::before, .divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--border);
}

/* Section */
.features-section {
  padding: 96px 24px;
  background: var(--bg-base);
  position: relative;
}

/* Container */
.features-container {
  max-width: 100%;
  margin: 0 48px;
}

/* Header */
.features-header {
  text-align: center;
  margin-bottom: 64px;
}

.features-title {
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 42px);
  color: var(--slate-900);
  margin: 14px 0;
  letter-spacing: -0.01em;
}

.features-subtitle {
  font-size: 16px;
  color: var(--slate-500);
  max-width: 520px;
  margin: 0 auto;
  line-height: 1.7;
}

/* Grid */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  width: 100%;
}

/* Card */
.feature-card {
  padding: 30px;
  border-radius: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  height: 100%;
  transition: all 0.35s var(--ease-out-expo);
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--blue-500), transparent);
  opacity: 0;
  transition: opacity 0.35s ease;
}

.feature-card:hover::before {
  opacity: 1;
}

/* Hover effect */
.feature-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(226,232,240,0.3);
}

/* Top section */
.feature-top {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

/* Title */
.feature-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--slate-900);
  letter-spacing: -0.01em;
}

/* Description */
.feature-desc {
  font-size: 14px;
  color: var(--slate-500);
  line-height: 1.7;
}

/* Responsive */
@media (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
}

/* ============================================
   SCROLLBAR
============================================ */
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--slate-200); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: var(--slate-300); }

/* ============================================
   RESPONSIVE
============================================ */
@media (max-width: 768px) {
  .hero-cols { flex-direction: column !important; }
  .hide-mobile { display: none !important; }
  .nav-links { display: none !important; }
  .modal-card { padding: 28px 24px; }
}

/* Better responsive container */
.container {
  width: 100%;
  padding: 0 48px;
}

@media (max-width: 1200px) {
  .container { padding: 0 32px; }
}

@media (max-width: 768px) {
  .container { padding: 0 20px; }
}

@media (max-width: 480px) {
  .container { padding: 0 16px; }
}

@media (max-width: 480px) {
  .btn-xl {
    width: 100%;
    justify-content: center;
  }
}

@media (min-width: 768px) {
  .nav-container {
    padding: 0 32px !important;
  }
}

@media (min-width: 1200px) {
  .nav-container {
    padding: 0 48px !important;
  }
}

/* ============================================
   DUAL LOGIN ROLE SWITCHER — Polished
============================================ */
.role-tab-wrap {
  display: flex;
  background: var(--bg-subtle);
  border: 1.5px solid var(--border);
  border-radius: 13px;
  padding: 4px;
  margin-bottom: 24px;
  gap: 4px;
}

.role-tab {
  flex: 1;
  padding: 10px 8px;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-body);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s var(--ease-out-expo);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: transparent;
  color: var(--slate-500);
  white-space: nowrap;
}

.role-tab.active {
  background: var(--bg-card);
  color: var(--blue-700);
  box-shadow: 0 2px 8px rgba(15,23,42,0.08), 0 0 0 0.5px rgba(15,23,42,0.03);
}

.role-tab.active.emp-tab {
  color: var(--teal-700);
}

.role-tab:not(.active):hover {
  color: var(--slate-700);
  background: rgba(255,255,255,0.65);
}

/* Field-level inline error */
.field-error {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--red-600);
  animation: slideUp 0.15s ease;
}

/* Employee info helper banner */
.emp-info-banner {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  background: var(--teal-50);
  border: 1px solid var(--teal-100);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 20px;
  font-size: 12.5px;
  color: var(--teal-700);
  font-weight: 500;
  line-height: 1.55;
  animation: slideUp 0.2s ease;
}

.emp-info-banner svg { flex-shrink: 0; margin-top: 1px; }

/* Role chip in subtitle */
.role-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  letter-spacing: 0.3px;
}
.role-chip-admin { background: var(--blue-50);  color: var(--blue-700);  border: 1px solid var(--blue-100); }
.role-chip-emp   { background: var(--teal-50);  color: var(--teal-700);  border: 1px solid var(--teal-100); }

/* ── Fixed input wrap — icons always centred ── */
.lm-input-wrap {
  position: relative;
}

.lm-input-icon {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--slate-400);
  pointer-events: none;
  display: flex;
  align-items: center;
  transition: color 0.2s var(--ease-out-expo);
  z-index: 1;
}

.lm-input-wrap:focus-within .lm-input-icon {
  color: var(--blue-500);
}

.lm-input {
  width: 100%;
  height: 46px;
  padding: 0 14px 0 40px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--slate-900);
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  outline: none;
  transition: all 0.2s var(--ease-out-expo);
  display: block;
}

.lm-input::placeholder { color: var(--slate-400); }

.lm-input:focus {
  border-color: var(--blue-500);
  box-shadow: 0 0 0 3.5px rgba(59,130,246,0.10);
}

.lm-input.lm-err {
  border-color: var(--red-600) !important;
  box-shadow: 0 0 0 3px rgba(220,38,38,0.08) !important;
}

.lm-input.lm-has-toggle {
  padding-right: 44px;
}

.lm-eye-btn {
  position: absolute;
  right: 11px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--slate-400);
  display: flex;
  align-items: center;
  padding: 3px;
  border-radius: 4px;
  transition: color 0.15s;
  z-index: 1;
}

.lm-eye-btn:hover { color: var(--slate-600); }

/* ── Modal responsive — Enhanced ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,0.45);
  backdrop-filter: blur(8px) saturate(150%);
  -webkit-backdrop-filter: blur(8px) saturate(150%);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.25s var(--ease-out-expo);
  overflow-y: auto;
}

.modal-card {
  background: var(--bg-card);
  border: 1px solid rgba(226,232,240,0.6);
  border-radius: 22px;
  box-shadow: 0 32px 80px rgba(15,23,42,0.18), 0 12px 32px rgba(15,23,42,0.08);
  width: 100%;
  max-width: 440px;
  padding: 36px 40px 32px;
  position: relative;
  animation: modalSlideUp 0.35s var(--ease-out-expo);
  margin: auto;
}

/* Tablet */
@media (max-width: 520px) {
  .modal-card {
    padding: 28px 22px 24px;
    border-radius: 18px;
    max-width: 100%;
  }
  .role-tab { font-size: 12px; gap: 5px; padding: 9px 6px; }
}

/* Small mobile */
@media (max-width: 360px) {
  .modal-card { padding: 22px 18px 20px; }
  .role-tab { font-size: 11.5px; }
}

/* ============================================
   SECTION REVEAL ANIMATION (Intersection Observer)
============================================ */
.reveal-section {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s var(--ease-out-expo), transform 0.7s var(--ease-out-expo);
}
.reveal-section.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ============================================
   STAT CARD HOVER ENHANCEMENT
============================================ */
.stat-cell {
  transition: all 0.25s var(--ease-out-expo);
  position: relative;
}
.stat-cell::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(37,99,235,0.03), rgba(20,184,166,0.03));
  opacity: 0;
  transition: opacity 0.25s ease;
}
.stat-cell:hover::after {
  opacity: 1;
}
.stat-cell:hover {
  background: rgba(248,250,252,0.6);
}

/* ============================================
   TESTIMONIAL QUOTE MARK
============================================ */
.testimonial-card {
  position: relative;
  overflow: hidden;
}
.testimonial-card::before {
  content: "\\201C";
  position: absolute;
  top: 16px;
  right: 20px;
  font-size: 64px;
  font-family: Georgia, serif;
  color: rgba(37,99,235,0.06);
  line-height: 1;
  pointer-events: none;
}

/* ============================================
   CTA SECTION ENHANCED BACKGROUND
============================================ */
.cta-section {
  position: relative;
  overflow: hidden;
}
.cta-section::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 500px 400px at 20% 50%, rgba(37,99,235,0.08) 0%, transparent 70%),
    radial-gradient(ellipse 400px 300px at 80% 50%, rgba(20,184,166,0.06) 0%, transparent 70%);
  pointer-events: none;
}
`;

/* ─────────────────────────────────────────────
   SVG ICONS
───────────────────────────────────────────── */
const Icon = {
  Logo: () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#2563EB"/>
      <rect x="7" y="13" width="18" height="12" rx="3" fill="white" fillOpacity="0.9"/>
      <rect x="11" y="7" width="10" height="8" rx="2" fill="white" fillOpacity="0.6"/>
      <rect x="10" y="19" width="4" height="3" rx="1" fill="#2563EB"/>
      <rect x="15" y="19" width="4" height="3" rx="1" fill="#2563EB"/>
    </svg>
  ),
  User: ({size=16}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Lock: ({size=16}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Eye: ({size=16}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  EyeOff: ({size=16}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
  Mail: ({size=16}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  Check: ({size=16}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  ArrowRight: ({size=16}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Close: ({size=16}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Alert: ({size=16}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Salary: ({size=20}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Users: ({size=20}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Shield: ({size=20}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  FileText: ({size=20}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Clock: ({size=20}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Chart: ({size=20}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Send: ({size=20}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Building: ({size=20}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M9 21V9"/>
    </svg>
  ),
  Star: ({size=14}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Menu: ({size=20}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  Play: ({size=20}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  Zap: ({size=20}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
};

/* ─────────────────────────────────────────────
   NAVBAR — Enhanced with refined glass effect
───────────────────────────────────────────── */
function Navbar({ onLoginClick }) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("features");
 useEffect(() => {
  const handleScroll = () => {
    const sections = navLinks.map(l => document.getElementById(l.id));

    sections.forEach((sec, i) => {
      if (!sec) return;

      const rect = sec.getBoundingClientRect();

      if (rect.top <= 120 && rect.bottom >= 120) {
        setActive(navLinks[i].id);
      }
    });
  };

  window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
}, []);

const scrollToSection = (id) => {
  const el = document.getElementById(id);
  if (!el) return;

  window.scrollTo({
    top: el.offsetTop - 70, // navbar offset
    behavior: "smooth"
  });
};

  const navLinks = [
  { label: "Features", id: "Features" },
  { label: "Pricing", id: "pricing" },
  { label: "Compliance", id: "compliancestrip" },
  { label: "Integrations", id: "features" },
  { label: "About", id: "footer" }
];

  return (
   

<nav
  className="pw-nav"
  style={{
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    borderBottom: "1px solid rgba(226,232,240,0.6)",
    boxShadow: "0 1px 8px rgba(15,23,42,0.04)"
  }}
>
  <div
    style={{
      width: "100%",
      margin: "0 auto",
      padding: "0 clamp(16px, 4vw, 48px)",
      height: 68,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }}
  >
   
    {/* Logo */}
    <a
      href="#"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        textDecoration: "none"
      }}
    >
      {/* ✅ REAL LOGO */}
      <img
        src={logo1}
        alt="Brixigo"
        style={{
          height: 46,
          width: "auto",
          objectFit: "contain",
          transition: "transform 0.3s ease"
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      />
    </a>

    {/* Nav Links */}
    <div className="nav-links" style={{ display: "flex", gap: 4 }}>
  {navLinks.map((l) => (
    <button
      key={l.id}
      onClick={() => scrollToSection(l.id)}
      style={{
        padding: "8px 16px",
        borderRadius: 9,
        fontSize: 14,
        fontWeight: 600,
        border: "none",
        cursor: "pointer",
        background: active === l.id ? "var(--blue-50)" : "transparent",
        color: active === l.id ? "var(--blue-600)" : "var(--slate-600)",
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        letterSpacing: "-0.01em"
      }}
      onMouseEnter={e => {
        if (active !== l.id) {
          e.currentTarget.style.background = "var(--slate-100)";
          e.currentTarget.style.color = "var(--slate-700)";
        }
      }}
      onMouseLeave={e => {
        if (active !== l.id) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--slate-600)";
        }
      }}
    >
      {l.label}
    </button>
  ))}
</div>

    {/* CTA */}
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      

      <button
        onClick={onLoginClick}
        style={{
          padding: "9px 22px",
          borderRadius: 10,
          border: "none",
          background: "linear-gradient(135deg, var(--blue-600) 0%, var(--blue-700) 100%)",
          color: "#ffffff",
          fontWeight: 700,
          fontSize: 14,
          fontFamily: "var(--font-body)",
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(37,99,235,0.28), 0 1px 3px rgba(37,99,235,0.12)",
          transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          letterSpacing: "-0.01em",
          display: "flex",
          alignItems: "center",
          gap: 6
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(37,99,235,0.35), 0 2px 6px rgba(37,99,235,0.18)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(37,99,235,0.28), 0 1px 3px rgba(37,99,235,0.12)";
        }}
      >
        Sign In
        <Icon.ArrowRight size={14} />
      </button>
    </div>
  </div>
</nav>
  );
}

/* ─────────────────────────────────────────────
   HERO — Enhanced floating UI cards
───────────────────────────────────────────── */
function SalaryCard() {
  return (
    <div id="salarycard" className="pw-card-flat float-card" style={{ padding: "20px 24px", minWidth: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 5 }}>Total Payroll — March 2025</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "var(--slate-900)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>₹24,58,400</div>
        </div>
        <span className="badge badge-green" style={{ fontSize: 11 }}>✓ Processed</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {[["Employees", "142"], ["Avg. CTC", "₹1.73L"], ["Tax Deducted", "₹3.2L"]].map(([l, v]) => (
  <div key={l} style={{ padding: "8px 0" }}>
    <div style={{ fontSize: 10.5, color: "var(--slate-400)", fontWeight: 600, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.3px" }}>
      {l}
    </div>
    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--slate-800)", letterSpacing: "-0.01em" }}>
      {v}
    </div>
  </div>
))}
      </div>
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(226,232,240,0.7)", display: "flex", gap: 6 }}>
        <div style={{ flex: 0.6, height: 5, borderRadius: 99, background: "linear-gradient(90deg, var(--blue-600), var(--blue-500))" }} />
        <div style={{ flex: 0.2, height: 5, borderRadius: 99, background: "linear-gradient(90deg, var(--teal-600), var(--teal-500))" }} />
        <div style={{ flex: 0.2, height: 5, borderRadius: 99, background: "linear-gradient(90deg, var(--amber-600), var(--amber-500))" }} />
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 14, fontSize: 11, color: "var(--slate-500)", fontWeight: 600 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 3, background: "var(--blue-600)", display: "inline-block" }} /> Basic
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 3, background: "var(--teal-500)", display: "inline-block" }} /> Allowances
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 3, background: "var(--amber-500)", display: "inline-block" }} /> Deductions
        </span>
      </div>
    </div>
  );
}

function PayslipCard() {
  const rows = [
    { label: "Gross Pay", value: "₹1,25,000", color: "var(--slate-800)" },
    { label: "Tax (TDS)", value: "-₹18,420", color: "var(--red-600)" },
    { label: "PF Deduction", value: "-₹7,500", color: "var(--amber-700)" },
    { label: "Net Pay", value: "₹99,080", color: "var(--green-700)" },
  ];

  return (
    <div id="payslipcard"
      className="pw-card-flat float-card-2"
      style={{
        padding: "20px 24px",
        width: "100%",
        minWidth: 260,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--slate-700)",
          }}
        >
          Payslip Preview
        </span>

        <span className="badge badge-blue">March 2025</span>
      </div>

      {/* User */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg,#DBEAFE,#93C5FD)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            fontWeight: 700,
            color: "#1D4ED8",
          }}
        >
          P
        </div>

        <div>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: "var(--slate-800)",
              letterSpacing: "-0.01em"
            }}
          >
            Priya Sharma
          </div>

          <div style={{ fontSize: 11, color: "var(--slate-500)" }}>
            Sr. Engineer · Bangalore
          </div>
        </div>
      </div>

      {/* Salary Rows */}
      {rows.map((row, i) => (
        <div
          key={i} 
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "7px 0",
            borderBottom:
              row.label !== "Net Pay"
                ? "1px solid var(--slate-100)"
                : "none",
          }}
        >
          <span style={{ fontSize: 12.5, color: "var(--slate-500)" }}>
            {row.label}
          </span>

          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: row.color,
            }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function AttendanceCard() {
  const days = ["M","T","W","T","F"];
  const status = ["p","p","p","a","p"];
  return (
    <div className="pw-card-flat float-card-3" style={{ padding: "16px 20px", width: "100%" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 12 }}>Attendance — This Week</div>
      <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 10.5, color: "var(--slate-400)", marginBottom: 5, fontWeight: 600 }}>{d}</div>
            <div style={{
              width: "100%", aspectRatio: "1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700,
              background: status[i] === "p" ? "var(--green-50)" : "var(--red-100)",
              color: status[i] === "p" ? "var(--green-700)" : "var(--red-600)",
              border: `1px solid ${status[i] === "p" ? "var(--green-100)" : "var(--red-100)"}`,
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >{status[i] === "p" ? "✓" : "✗"}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
        <span style={{ color: "var(--slate-500)" }}>Present: <strong style={{ color: "var(--green-700)" }}>4</strong></span>
        <span style={{ color: "var(--slate-500)" }}>Absent: <strong style={{ color: "var(--red-600)" }}>1</strong></span>
      </div>
    </div>
  );
}

function Hero({ onLoginClick }) {
  return (
    <section className="hero-section" style={{ padding: "88px 24px 108px" }}>
      <div className="hero-grid" />
      <div style={{ maxWidth: "100%", margin: "0 auto", position: "relative" }}>
        <div className="hero-cols" style={{display: "flex",alignItems: "center",gap: 72,flexWrap: "wrap"}}>

          {/* Left */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fade-in-up" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(239,246,255,0.8)", border: "1px solid var(--blue-100)", borderRadius: 999, padding: "6px 16px", marginBottom: 28, backdropFilter: "blur(8px)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue-500)", display: "inline-block", animation: "pulse-dot 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--blue-700)", letterSpacing: "0.2px" }}>Trusted by 2,400+ companies across India</span>
            </div>

            <h1 className="fade-in-up-1" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 3.8vw, 56px)", lineHeight: 1.12, color: "var(--slate-900)", marginBottom: 22, letterSpacing: "-0.02em" }}>
              Automate Payroll.<br />
              <span style={{ color: "var(--blue-600)" }}>Ensure Compliance.</span><br />
              Pay Employees{" "}
              <span style={{ fontStyle: "italic", color: "var(--teal-600)" }}>Accurately.</span>
            </h1>

            <p className="fade-in-up-2" style={{ fontSize: 17, color: "var(--slate-600)", lineHeight: 1.75, marginBottom: 36, maxWidth: 520, letterSpacing: "-0.01em" }}>
              End-to-end payroll processing with automated TDS, PF, ESI compliance, digital payslips, and real-time employee analytics — built for Indian businesses.
            </p>

            <div className="fade-in-up-3" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 44 }}>
              <button className="btn btn-primary btn-xl" onClick={onLoginClick} style={{ gap: 10 }}>
                Join With Us <Icon.ArrowRight size={16} />
              </button>
              <button className="btn btn-secondary btn-xl" onClick={onLoginClick} style={{ gap: 8 }}>
                <Icon.Play size={14} />
                Watch Demo
              </button>
            </div>

            <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
              {[["✓ No credit card required","var(--green-700)"], ["✓ Setup in 15 minutes","var(--teal-700)"], ["✓ Fully GST & TDS compliant","var(--blue-700)"]].map(([t,c]) => (
                <span key={t} style={{ fontSize: 13, fontWeight: 600, color: c, letterSpacing: "-0.01em" }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Right — Floating UI Visuals */}
          <div className="hide-mobile" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16, alignItems: "stretch", position: "relative" }}>
            <SalaryCard />
            <div style={{ display: "flex", gap: 14, justifyContent: "flex-end" }}>
              <PayslipCard />
              <AttendanceCard />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   STATS STRIP — Enhanced with hover
───────────────────────────────────────────── */
function Stats() {
  const stats = [
    { value: "₹1,200Cr+", label: "Salary Processed Monthly", color: "var(--blue-600)", icon: <Icon.Salary size={18} /> },
    { value: "2,400+",    label: "Companies Trust Us",        color: "var(--teal-600)", icon: <Icon.Building size={18} /> },
    { value: "1.8L+",     label: "Employees on Platform",     color: "var(--green-600)", icon: <Icon.Users size={18} /> },
    { value: "99.98%",    label: "On-time Payment Rate",      color: "var(--amber-600)", icon: <Icon.Zap size={18} /> },
  ];
  return (
  <section style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
  <div style={{ width: "100%" }}>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        borderLeft: "1px solid var(--border)",
      }}
    >
      {stats.map((s, i) => (
        <div
          key={i}
          className="stat-cell"
          style={{
            padding: "36px 24px",
            borderRight: "1px solid var(--border)",
            textAlign: "center",
            cursor: "default",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${s.color}10`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: s.color,
            }}>
              {s.icon}
            </div>
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: s.color,
              marginBottom: 6,
              letterSpacing: "-0.02em",
            }}
          >
            {s.value}
          </div>

          <div
            style={{
              fontSize: 13,
              color: "var(--slate-500)",
              fontWeight: 500,
              letterSpacing: "-0.01em"
            }}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
  );
}

/* ─────────────────────────────────────────────
   FEATURES — Enhanced cards with top accent
───────────────────────────────────────────── */
function Features() {
  const features = [
    {
      icon: <Icon.Salary size={22} />,
      iconBg: "var(--blue-50)", iconColor: "var(--blue-600)",
      tag: "Core", tagClass: "badge-blue",
      title: "Automated Salary Processing",
      desc: "Run payroll for all employees in one click. Automatically calculate gross pay, deductions, allowances, and net pay with zero manual errors.",
    },
    {
      icon: <Icon.Shield size={22} />,
      iconBg: "var(--teal-50)", iconColor: "var(--teal-600)",
      tag: "Compliance", tagClass: "badge-teal",
      title: "TDS, PF & ESI Compliance",
      desc: "Automated TDS computation, Form 16 generation, PF/ESI filings, and compliance reports aligned with the latest IT regulations.",
    },
    {
      icon: <Icon.FileText size={22} />,
      iconBg: "var(--green-50)", iconColor: "var(--green-600)",
      tag: "Payslips", tagClass: "badge-green",
      title: "Digital Payslip Generation",
      desc: "Generate branded, legally-compliant PDF payslips instantly. Auto-distribute to employees via email or the self-service portal.",
    },
    {
      icon: <Icon.Clock size={22} />,
      iconBg: "var(--amber-50)", iconColor: "var(--amber-700)",
      tag: "Attendance", tagClass: "badge-amber",
      title: "Attendance & Leave Integration",
      desc: "Sync attendance data from biometrics or HR systems. Auto-compute LOP deductions and leave encashment with configurable policies.",
    },
    {
      icon: <Icon.Chart size={22} />,
      iconBg: "var(--blue-50)", iconColor: "var(--blue-600)",
      tag: "Analytics", tagClass: "badge-blue",
      title: "Payroll Analytics & Reports",
      desc: "Real-time dashboards for salary costs, department-wise expense breakdowns, and year-on-year payroll trends for leadership teams.",
    },
    {
      icon: <Icon.Users size={22} />,
      iconBg: "var(--teal-50)", iconColor: "var(--teal-600)",
      tag: "HR", tagClass: "badge-teal",
      title: "Employee Records Management",
      desc: "Centralised employee master with bank details, tax declarations, documents, and full revision history — secure and audit-ready.",
    },
  ];

  return (
   <section id="Features" className="features-section">
  <div className="features-container">
    
    {/* Header */}
    <div className="features-header">
      <span className="badge badge-blue">Platform Features</span>

      <h2 className="features-title">
        Everything payroll, in one platform
      </h2>

      <p className="features-subtitle">
        Built for Indian HR and finance teams who need speed, accuracy, and full statutory compliance.
      </p>
    </div>

    {/* Grid */}
    <div className="features-grid">
      {features.map((f, i) => (
        <div key={i} className="feature-card">
          
          <div className="feature-top">
            <div
              className="feature-icon-wrap"
              style={{ background: f.iconBg, color: f.iconColor }}
            >
              {f.icon}
            </div>

            <div>
              <span className={`badge ${f.tagClass}`} style={{ marginBottom: 4, display: "inline-flex" }}>
                {f.tag}
              </span>

              <h3 className="feature-title">
                {f.title}
              </h3>
            </div>
          </div>

          <p className="feature-desc">
            {f.desc}
          </p>
        </div>
      ))}
    </div>

  </div>
</section>
  );
}

/* ─────────────────────────────────────────────
   COMPLIANCE STRIP — Enhanced pills
───────────────────────────────────────────── */
function ComplianceStrip() {
  const items = [
    { label: "Income Tax Act", icon: "📋" },
    { label: "PF Act Compliance", icon: "🛡️" },
    { label: "ESI Regulations", icon: "🏥" },
    { label: "Gratuity Act", icon: "📜" },
    { label: "Professional Tax", icon: "🗂️" },
    { label: "Form 16 / 12BA", icon: "📄" },
    { label: "TDS Returns", icon: "💼" },
    { label: "Bonus Act", icon: "🎯" },
  ];
  return (
  <section id="compliancestrip"
  style={{
    background: "linear-gradient(180deg, var(--slate-100) 0%, rgba(241,245,249,0.5) 100%)",
    padding: "64px 0",
    borderTop: "1px solid var(--border)",
    borderBottom: "1px solid var(--border)",
    position: "relative",
  }}
>
  <div
    style={{
      width: "100%",
      padding: "0 clamp(20px, 6vw, 80px)",
      textAlign: "center",
    }}
  >
    {/* Badge */}
    <div style={{ marginBottom: 12 }}>
      <span className="badge badge-slate" style={{ fontSize: 11, letterSpacing: "0.5px" }}>
        <Icon.Shield size={12} /> Compliance
      </span>
    </div>

    {/* Heading */}
    <h3
      style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(22px, 3vw, 30px)",
        color: "var(--slate-900)",
        marginBottom: 12,
        letterSpacing: "-0.01em"
      }}
    >
      Full Statutory Compliance Coverage
    </h3>
    <p style={{ fontSize: 14, color: "var(--slate-500)", marginBottom: 32, maxWidth: 440, margin: "0 auto 32px" }}>
      Automated compliance with every major Indian labour and tax regulation.
    </p>

    {/* Pills */}
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        justifyContent: "center",
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#ffffff",
            border: "1px solid var(--border)",
            borderRadius: 999,
            padding: "10px 20px",
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--slate-700)",
            boxShadow: "var(--shadow-xs)",
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            cursor: "default",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "var(--shadow-md)";
            e.currentTarget.style.borderColor = "var(--blue-200)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "var(--shadow-xs)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          <span style={{ fontSize: 15 }}>{item.icon}</span>
          {item.label}
        </div>
      ))}
    </div>
  </div>
</section>
  );
}

/* ─────────────────────────────────────────────
   TESTIMONIALS — Enhanced with quote marks
───────────────────────────────────────────── */
function Testimonials() {
  const reviews = [
    {
      stars: 5,
      quote: "PayWise reduced our payroll processing time from 3 days to under 2 hours. The TDS auto-computation alone saves our accounts team an entire week every quarter.",
      name: "Ananya Krishnan",
      role: "Head of Finance",
      company: "Nexus Technologies, Hyderabad",
      avatar: "AK",
      avatarBg: "linear-gradient(135deg,#DBEAFE,#93C5FD)",
      avatarColor: "#1D4ED8",
    },
    {
      stars: 5,
      quote: "The payslip portal is a game-changer. Employees download their payslips themselves and HR queries have dropped by 70%. Compliance filings are now stress-free.",
      name: "Rajesh Mehta",
      role: "HR Director",
      company: "BuildCore Infra, Mumbai",
      avatar: "RM",
      avatarBg: "linear-gradient(135deg,#CCFBF1,#5EEAD4)",
      avatarColor: "#0F766E",
    },
    {
      stars: 5,
      quote: "Onboarding 200+ employees was seamless. The attendance integration with our biometric system works flawlessly and LOP deductions are fully automated.",
      name: "Sunita Patel",
      role: "VP Operations",
      company: "MedChain Pharma, Ahmedabad",
      avatar: "SP",
      avatarBg: "linear-gradient(135deg,#DCFCE7,#86EFAC)",
      avatarColor: "#15803D",
    },
  ];

  return (
    <section style={{ padding: "96px 24px", background: "var(--bg-card)", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span className="badge badge-teal" style={{ marginBottom: 14 }}>Customer Stories</span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,3.5vw,38px)", color: "var(--slate-900)", letterSpacing: "-0.01em" }}>
            Trusted by HR & Finance teams
          </h2>
          <p style={{ fontSize: 15, color: "var(--slate-500)", marginTop: 10, maxWidth: 440, margin: "10px auto 0" }}>See how leading companies streamline their payroll with BrixiGo.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {reviews.map((r, i) => (
            <div key={i} className="pw-card testimonial-card" style={{ padding: "32px" }}>
              <div style={{ display: "flex", gap: 3, marginBottom: 18 }}>
                {Array(r.stars).fill(0).map((_, j) => (
                  <span key={j} style={{ color: "var(--amber-500)" }}><Icon.Star size={15} /></span>
                ))}
              </div>
              <p style={{ fontSize: 14.5, color: "var(--slate-600)", lineHeight: 1.75, marginBottom: 24, fontStyle: "italic", letterSpacing: "-0.01em" }}>"{r.quote}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: r.avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: r.avatarColor, flexShrink: 0 }}>{r.avatar}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.01em" }}>{r.name}</div>
                  <div style={{ fontSize: 12.5, color: "var(--slate-500)" }}>{r.role} · {r.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   PRICING — Enhanced visual hierarchy
───────────────────────────────────────────── */
function Pricing({ onLoginClick }) {
  const plans = [
    {
      name: "Starter",
      price: "₹2,999",
      period: "/month",
      desc: "For growing businesses up to 25 employees",
      color: "var(--teal-600)",
      badge: "badge-teal",
      features: ["Payroll Processing", "Payslip Generation", "PF & TDS Filing", "Email Support", "Employee Self-Service", "Basic Reports"],
      cta: "Start Free Trial",
      ctaClass: "btn btn-secondary btn-md",
      popular: false,
    },
    {
      name: "Professional",
      price: "₹7,499",
      period: "/month",
      desc: "For established businesses up to 100 employees",
      color: "var(--blue-600)",
      badge: "badge-blue",
      features: ["Everything in Starter", "Attendance Integration", "Custom Pay Structures", "Form 16 Automation", "Leave Management", "API Access", "Priority Support"],
      cta: "Start Free Trial",
      ctaClass: "btn btn-primary btn-md",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      desc: "For large enterprises with complex requirements",
      color: "var(--green-600)",
      badge: "badge-green",
      features: ["Unlimited Employees", "Multi-location Payroll", "Custom Compliance", "Dedicated Account Manager", "SLA Guarantee", "On-premise Option", "Custom Integrations"],
      cta: "Contact Sales",
      ctaClass: "btn btn-success btn-md",
      popular: false,
    },
  ];

  return (
    <section id="pricing" style={{ padding: "96px 24px", background: "var(--bg-base)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <span className="badge badge-amber" style={{ marginBottom: 14 }}>Transparent Pricing</span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,3.5vw,38px)", color: "var(--slate-900)", marginBottom: 12, letterSpacing: "-0.01em" }}>Plans that scale with you</h2>
          <p style={{ fontSize: 15, color: "var(--slate-500)", lineHeight: 1.6 }}>All plans include 30-day free trial · No setup fees · Cancel anytime</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, alignItems: "start" }}>
          {plans.map((p, i) => (
            <div key={i} className={`pw-card ${p.popular ? "pricing-popular" : ""}`} style={{ padding: "36px 30px", position: "relative" }}>
              {p.popular && <div className="pricing-popular-badge">MOST POPULAR</div>}
              <span className={`badge ${p.badge}`} style={{ marginBottom: 18 }}>{p.name}</span>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 38, color: "var(--slate-900)", letterSpacing: "-0.02em" }}>{p.price}</span>
                <span style={{ fontSize: 14, color: "var(--slate-500)", fontWeight: 500 }}>{p.period}</span>
              </div>
              <p style={{ fontSize: 13.5, color: "var(--slate-500)", marginBottom: 28, lineHeight: 1.5 }}>{p.desc}</p>
              <button className={p.ctaClass} onClick={onLoginClick} style={{ width: "100%", justifyContent: "center", marginBottom: 28 }}>
                {p.cta}
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {p.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--slate-600)" }}>
                    <span style={{ color: p.color, flexShrink: 0 }}><Icon.Check size={14} /></span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   CTA SECTION — Enhanced gradient mesh
───────────────────────────────────────────── */
function CTA({ onLoginClick }) {
  return (
    <section className="cta-section" style={{ padding: "96px 24px", background: "linear-gradient(145deg, #EFF6FF 0%, #F0FDFA 50%, #FAFBFF 100%)", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", position: "relative" }}>
        <span className="badge badge-blue" style={{ marginBottom: 18 }}>Get Started Today</span>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,4vw,44px)", color: "var(--slate-900)", marginBottom: 18, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
          Run your first payroll in under 15 minutes
        </h2>
        <p style={{ fontSize: 16, color: "var(--slate-500)", lineHeight: 1.75, marginBottom: 40, letterSpacing: "-0.01em" }}>
          Join 2,400+ Indian businesses using PayWise to process accurate, compliant payroll every month — without the stress.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary btn-xl" onClick={onLoginClick} style={{ gap: 10 }}>
            Start Free 30-Day Trial <Icon.ArrowRight size={16} />
          </button>
          <button className="btn btn-secondary btn-xl">Talk to Sales</button>
        </div>
        <p style={{ marginTop: 24, fontSize: 13, color: "var(--slate-400)", fontWeight: 500 }}>No credit card · Free setup · Dedicated onboarding support</p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FOOTER — Enhanced with better structure
───────────────────────────────────────────── */
function Footer() {
  const cols = [
    {
      heading: "Platform",
      links: [
        "Payroll Processing",
        "Tax Compliance",
        "Payslip Generator",
        "Employee Portal",
        "Attendance Module",
      ],
    },
    {
      heading: "Company",
      links: ["About Us", "Careers", "Blog", "Press", "Contact"],
    },
    {
      heading: "Resources",
      links: [
        "Documentation",
        "API Reference",
        "Status Page",
        "Security",
        "Privacy Policy",
      ],
    },
  ];

  return (
    <footer
      id="footer" className="pw-footer"
      style={{
        padding: "80px 0 32px",
        background: "linear-gradient(180deg, var(--slate-900) 0%, #0B1120 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          padding: "0 clamp(20px, 6vw, 80px)",
        }}
      >
        {/* TOP GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
            gap: 48,
            marginBottom: 56,
          }}
        >
          {/* BRAND */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <img
                src={logo1}
                alt="Brixigo"
                style={{ height: 42 }}
              />

              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  color: "#fff",
                }}
              >
                BrixiGo
              </div>
            </div>

            <p
              style={{
                fontSize: 14,
                color: "var(--slate-400)",
                lineHeight: 1.75,
                marginBottom: 24,
                maxWidth: 320,
              }}
            >
              India's most reliable payroll automation platform. Built for
              compliance, designed for speed.
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["🇮🇳 Made in India", "ISO 27001 Certified"].map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--slate-300)",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 999,
                    padding: "5px 12px",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* LINKS */}
          {cols.map((col, i) => (
            <div key={i}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#fff",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  marginBottom: 20,
                }}
              >
                {col.heading}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 13,
                }}
              >
                {col.links.map((l) => (
                  <a
                    key={l}
                    href="#"
                    style={{
                      fontSize: 14,
                      color: "var(--slate-400)",
                      textDecoration: "none",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      display: "inline-block",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#fff";
                      e.currentTarget.style.transform = "translateX(4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--slate-400)";
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                  >
                    {l}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* BOTTOM BAR */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 28,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--slate-500)" }}>
            © 2025 BrixiGo Technologies Pvt. Ltd. All rights reserved.
          </span>

          <span style={{ fontSize: 13, color: "var(--slate-500)" }}>
            CIN: U74999TG2021PTC152341 | GSTIN: 36AABCP1234A1Z5
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   FORGOT PASSWORD MODAL — Enhanced
───────────────────────────────────────────── */
function ForgotPasswordModal({ onClose, onBack }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

const handleSend = async () => {
  if (!email.includes("@")) return;

  setLoading(true);

  try {
    await api.post("/auth/forgot-password", {
      email: email,
    });

    setSent(true);
  } catch (err) {
    console.log(err.response?.data);
    alert("Failed to send reset link");
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "var(--slate-100)", border: "none", borderRadius: 9, color: "var(--slate-500)", cursor: "pointer", padding: 7, display: "flex", transition: "all 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--slate-200)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--slate-100)"}
        >
          <Icon.Close size={15} />
        </button>

        {!sent ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
             <img
  src={logo1}
  alt="Brixigo"
  style={{
    height: 46,
    width: "auto",
    objectFit: "contain"
  }}
/>
             
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--slate-900)", marginBottom: 8, letterSpacing: "-0.01em" }}>Reset Password</h2>
            <p style={{ fontSize: 14, color: "var(--slate-500)", marginBottom: 28, lineHeight: 1.6 }}>Enter your work email to receive reset instructions.</p>
            <label className="pw-label">Work Email</label>
            <div className="pw-input-wrap" style={{ marginBottom: 24 }}>
              <span className="pw-input-icon"><Icon.Mail size={15} /></span>
              <input className="pw-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <button className="btn btn-primary btn-md" onClick={handleSend} disabled={loading || !email.includes("@")} style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.7 : 1 }}>
              {loading ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> Sending…</> : "Send Reset Link"}
            </button>
            <button onClick={onBack} style={{ width: "100%", marginTop: 14, background: "none", border: "none", color: "var(--blue-600)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", transition: "color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--blue-700)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--blue-600)"}
            >← Back to Sign In</button>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--green-50)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px", color: "var(--green-600)", border: "1px solid var(--green-100)" }}>
              <Icon.Send size={26} />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--slate-900)", marginBottom: 10, letterSpacing: "-0.01em" }}>Check your inbox</h2>
            <p style={{ fontSize: 14, color: "var(--slate-500)", marginBottom: 28, lineHeight: 1.6 }}>We've sent a password reset link to <strong style={{ color: "var(--slate-700)" }}>{email}</strong>. It expires in 30 minutes.</p>
            <button className="btn btn-primary btn-md" onClick={onBack} style={{ width: "100%", justifyContent: "center" }}>Back to Sign In</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   REGISTER MODAL — Enhanced
───────────────────────────────────────────── */
function RegsterModal({ onClose, onSwitchToLogin }) {
  const [form, setForm] = useState({ name: "", company: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.company.trim()) e.company = "Company name is required";
    if (!form.email.includes("@")) e.email = "Enter a valid email";
    if (form.password.length < 8) e.password = "Minimum 8 characters";
    if (!form.role) e.role = "Role is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    alert("✓ Account created! Connect your auth backend to continue.");
    onClose();
  };

  const fields = [
    { key: "name",     label: "Full Name",     placeholder: "Priya Sharma",          type: "text",     icon: <Icon.User size={15} /> },
    { key: "company",  label: "Company Name",  placeholder: "Nexus Technologies",    type: "text",     icon: <Icon.Building size={15} /> },
    { key: "email",    label: "Work Email",    placeholder: "priya@nexus.com",       type: "email",    icon: <Icon.Mail size={15} /> },
    { key: "password", label: "Password",      placeholder: "Min. 8 characters",     type: "password", icon: <Icon.Lock size={15} /> },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "var(--slate-100)", border: "none", borderRadius: 9, color: "var(--slate-500)", cursor: "pointer", padding: 7, display: "flex", transition: "all 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--slate-200)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--slate-100)"}
        >
          <Icon.Close size={15} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <img
  src={logo1}
  alt="Brixigo"
  style={{
    height: 46,
    width: "auto",
    objectFit: "contain"
  }}
/>
          
        </div>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--slate-900)", marginBottom: 6, letterSpacing: "-0.01em" }}>Create your account</h2>
        <p style={{ fontSize: 14, color: "var(--slate-500)", marginBottom: 26, lineHeight: 1.5 }}>No credit card required. Setup takes under 5 minutes.</p>

        {fields.map(f => (
          <div key={f.key} style={{ marginBottom: 18 }}>
            <label className="pw-label">{f.label}</label>
            <div className="pw-input-wrap">
              <span className="pw-input-icon">{f.icon}</span>
              <input
                className={`pw-input ${errors[f.key] ? "error" : ""}`}
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
              />
            </div>
            {errors[f.key] && <div style={{ marginTop: 5, fontSize: 12, color: "var(--red-600)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Icon.Alert size={12} />{errors[f.key]}</div>}
          </div>
        ))}

        <button className="btn btn-success btn-md" onClick={handleSubmit} disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 8, marginBottom: 18, opacity: loading ? 0.75 : 1 }}>
          {loading ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> Creating account…</> : <>Create Free Account <Icon.ArrowRight size={14} /></>}
        </button>

        <div className="divider" style={{ marginBottom: 16 }}>Already have an account?</div>
        <button className="btn btn-secondary btn-md" onClick={onSwitchToLogin} style={{ width: "100%", justifyContent: "center" }}>
          Sign In Instead
        </button>
        <p style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "var(--slate-400)", lineHeight: 1.5 }}>
          By creating an account you agree to our <a href="#" style={{ color: "var(--blue-600)", textDecoration: "none", fontWeight: 600 }}>Terms</a> and <a href="#" style={{ color: "var(--blue-600)", textDecoration: "none", fontWeight: 600 }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LOGIN MODAL  —  Dual Portal (Admin / Employee)
   ✅ Real Brixigo logo
   ✅ Icons perfectly centred inside inputs
   ✅ Bulletproof validation (empty-field + format)
   ✅ Double-submit guard
   ✅ Fully responsive (mobile / tablet / desktop)
   ✅ Enhanced UI — refined spacing, shadows, transitions
───────────────────────────────────────────── */
function LoginModal({ onClose }) {
  // ── View routing ──────────────────────────────
  const [view, setView] = useState("login");

  // ── Role: "admin" → Username | "employee" → Email ──
  const [role, setRole] = useState("admin");

  // ── Field values ──────────────────────────────
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  // ── UX state ──────────────────────────────────
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]     = useState(false);
  const [loading, setLoading]           = useState(false);

  // ── Errors ────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState({ identifier: "", password: "" });
  const [authError, setAuthError]     = useState("");

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const idRef = useRef(null);

  // Auto-focus identifier on open + role change
  useEffect(() => {
    const t = setTimeout(() => idRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [role]);

  // ── Switch role — reset all state ─────────────
  const switchRole = (r) => {
    if (loading) return;
    setRole(r);
    setUsername("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setFieldErrors({ identifier: "", password: "" });
    setAuthError("");
  };

  const isAdmin = role === "admin";

  // ── Validation — always runs before API ───────
  const validate = () => {
    const errs = { identifier: "", password: "" };
    let valid = true;

    if (isAdmin) {
      const u = username.trim();
      if (!u) {
        errs.identifier = "Username is required.";
        valid = false;
      } else if (u.length < 3) {
        errs.identifier = "Username must be at least 3 characters.";
        valid = false;
      }
    } else {
      const e = email.trim();
      if (!e) {
        errs.identifier = "Email address is required.";
        valid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
        errs.identifier = "Please enter a valid email address.";
        valid = false;
      }
    }

    if (!password) {
      errs.password = "Password is required.";
      valid = false;
    } else if (password.length < 6) {
      errs.password = "Password must be at least 6 characters.";
      valid = false;
    }

    setFieldErrors(errs);
    return valid;
  };

  // ── Submit — auth logic preserved exactly ─────
  const handleSubmit = async () => {
    if (loading) return;                   // hard double-submit guard
    setAuthError("");
    if (!validate()) return;               // block API if invalid

    setLoading(true);
    try {
      const identifier = isAdmin ? username.trim() : email.trim();
      await login({
      mode: isAdmin ? "admin" : "employee",
      identifier: identifier,
      password: password,
      });   // ✅ auth call
      navigate("/dashboard");              // ✅ redirect
      onClose();                           // ✅ close modal
    } catch (err) {
      const raw =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message || "";
      const lower = raw.toLowerCase();

      if (lower.includes("not found") || lower.includes("no user") || lower.includes("does not exist")) {
        setFieldErrors(p => ({
          ...p,
          identifier: isAdmin
            ? "No account found with this username."
            : "No account found with this email address.",
        }));
      } else if (lower.includes("password") || lower.includes("incorrect") || lower.includes("invalid") || lower.includes("wrong")) {
        setFieldErrors(p => ({ ...p, password: "Incorrect password. Please try again." }));
      } else {
        setAuthError("Sign in failed. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  // ── Route to sub-modals ───────────────────────
  if (view === "register") return <RegisterModal onClose={onClose} onSwitchToLogin={() => setView("login")} />;
  if (view === "forgot")   return <ForgotPasswordModal onClose={onClose} onBack={() => setView("login")} />;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${isAdmin ? "Admin" : "Employee"} Login`}
      >

        {/* ── Close button ── */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: 16, right: 16,
            width: 32, height: 32,
            background: "var(--slate-100)", border: "none",
            borderRadius: 9, color: "var(--slate-500)",
            cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
            transition: "all 0.2s var(--ease-out-expo)",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--slate-200)"; e.currentTarget.style.transform = "rotate(90deg)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--slate-100)"; e.currentTarget.style.transform = "rotate(0)"; }}
        >
          <Icon.Close size={14} />
        </button>

        {/* ── Brand — real Brixigo logo ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <img
            src={logo1}
            alt="BrixiGo"
            style={{ height: 44, width: "auto", objectFit: "contain", flexShrink: 0 }}
          />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--slate-900)", lineHeight: 1.1 }}>
              BrixiGo
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--slate-400)", letterSpacing: "0.8px", textTransform: "uppercase", marginTop: 2 }}>
              Payroll Platform
            </div>
          </div>
        </div>

        {/* ── Title ── */}
        <div style={{ marginBottom: 22 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 23, color: "var(--slate-900)", marginBottom: 6, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
            Welcome back
          </h2>
          <p style={{ fontSize: 13.5, color: "var(--slate-500)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            Sign in to your{" "}
            <span className={`role-chip ${isAdmin ? "role-chip-admin" : "role-chip-emp"}`}>
              {isAdmin ? "Admin (HR)" : "Employee"} workspace
            </span>
          </p>
        </div>

        {/* ── Role tabs ── */}
        <div className="role-tab-wrap" role="tablist" aria-label="Login type">
          <button
            role="tab"
            aria-selected={isAdmin}
            className={`role-tab${isAdmin ? " active" : ""}`}
            onClick={() => switchRole("admin")}
            disabled={loading}
            type="button"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Admin · HR Login
          </button>
          <button
            role="tab"
            aria-selected={!isAdmin}
            className={`role-tab emp-tab${!isAdmin ? " active" : ""}`}
            onClick={() => switchRole("employee")}
            disabled={loading}
            type="button"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Employee Login
          </button>
        </div>

        {/* ── Employee info banner ── */}
        {!isAdmin && (
          <div className="emp-info-banner" role="note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>
              Use the <strong>email address</strong> assigned by your HR team.
              Employee accounts are created by Admin only.
            </span>
          </div>
        )}

        {/* ── Auth-level error banner ── */}
        {authError && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              display: "flex", alignItems: "flex-start", gap: 9,
              background: "var(--red-100)", border: "1px solid #FECACA",
              color: "var(--red-600)", borderRadius: 10,
              padding: "12px 14px", fontSize: 13,
              fontWeight: 600, marginBottom: 20,
              animation: "slideUp 0.2s ease",
            }}
          >
            <Icon.Alert size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{authError}</span>
          </div>
        )}

        {/* ════════════════════════════════════════
            USERNAME / EMAIL FIELD
        ════════════════════════════════════════ */}
        <div style={{ marginBottom: 16 }}>
          <label
            className="pw-label"
            htmlFor="lm-identifier"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}
          >
            <span>{isAdmin ? "Username" : "Work Email"}</span>
          </label>
          <div className="lm-input-wrap">
            <span className="lm-input-icon" aria-hidden="true">
              {isAdmin
                ? <Icon.User size={15} />
                : <Icon.Mail size={15} />
              }
            </span>
            <input
              id="lm-identifier"
              ref={idRef}
              className={`lm-input${fieldErrors.identifier ? " lm-err" : ""}`}
              type={isAdmin ? "text" : "email"}
              placeholder={isAdmin ? "Enter your username" : "you@company.com"}
              value={isAdmin ? username : email}
              onChange={e => {
                isAdmin ? setUsername(e.target.value) : setEmail(e.target.value);
                setFieldErrors(p => ({ ...p, identifier: "" }));
                setAuthError("");
              }}
              autoComplete={isAdmin ? "username" : "email"}
              autoCapitalize="none"
              spellCheck={false}
              aria-required="true"
              aria-invalid={!!fieldErrors.identifier}
              aria-describedby={fieldErrors.identifier ? "err-identifier" : undefined}
              onKeyDown={onKey}
              disabled={loading}
            />
          </div>
          {fieldErrors.identifier && (
            <div id="err-identifier" className="field-error" role="alert" aria-live="polite">
              <Icon.Alert size={12} />
              {fieldErrors.identifier}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════
            PASSWORD FIELD
        ════════════════════════════════════════ */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <label className="pw-label" htmlFor="lm-password" style={{ marginBottom: 0 }}>
              Password
            </label>
            <button
              type="button"
              onClick={() => setView("forgot")}
              style={{
                background: "none", border: "none",
                fontSize: 12, color: "var(--blue-600)",
                fontWeight: 600, cursor: "pointer",
                fontFamily: "var(--font-body)", padding: 0,
                transition: "color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--blue-700)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--blue-600)"}
            >
              Forgot password?
            </button>
          </div>
          <div className="lm-input-wrap">
            <span className="lm-input-icon" aria-hidden="true">
              <Icon.Lock size={15} />
            </span>
            <input
              id="lm-password"
              className={`lm-input lm-has-toggle${fieldErrors.password ? " lm-err" : ""}`}
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                setFieldErrors(p => ({ ...p, password: "" }));
                setAuthError("");
              }}
              autoComplete="current-password"
              aria-required="true"
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "err-password" : undefined}
              onKeyDown={onKey}
              disabled={loading}
            />
            <button
              type="button"
              className="lm-eye-btn"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <Icon.EyeOff size={16} /> : <Icon.Eye size={16} />}
            </button>
          </div>
          {fieldErrors.password && (
            <div id="err-password" className="field-error" role="alert" aria-live="polite">
              <Icon.Alert size={12} />
              {fieldErrors.password}
            </div>
          )}
        </div>

        {/* ── Remember me ── */}
        <div
          role="checkbox"
          aria-checked={rememberMe}
          tabIndex={0}
          style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 16, marginBottom: 24, cursor: "pointer", userSelect: "none" }}
          onClick={() => setRememberMe(v => !v)}
          onKeyDown={e => { if (e.key === " ") { e.preventDefault(); setRememberMe(v => !v); } }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 18, height: 18, borderRadius: 6, flexShrink: 0,
              background: rememberMe ? "var(--blue-600)" : "transparent",
              border: rememberMe ? "none" : "1.5px solid var(--slate-300)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s var(--ease-spring)",
              transform: rememberMe ? "scale(1)" : "scale(1)",
            }}
          >
            {rememberMe && <Icon.Check size={11} color="#fff" />}
          </div>
          <span style={{ fontSize: 13, color: "var(--slate-600)", fontWeight: 500 }}>
            Keep me signed in
          </span>
        </div>

        {/* ── Submit button ── */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          aria-busy={loading}
          style={{
            width: "100%", height: 48,
            border: "none", borderRadius: 11,
            fontFamily: "var(--font-body)", fontSize: 14.5,
            fontWeight: 700, color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8,
            letterSpacing: "-0.01em",
            marginBottom: isAdmin ? 18 : 0,
            opacity: loading ? 0.75 : 1,
            transition: "all 0.25s var(--ease-out-expo)",
            background: isAdmin
              ? "linear-gradient(135deg, var(--blue-600), var(--blue-700))"
              : "linear-gradient(135deg, var(--teal-600), var(--teal-700))",
            boxShadow: isAdmin
              ? "0 4px 14px rgba(37,99,235,0.28), 0 1px 3px rgba(37,99,235,0.12)"
              : "0 4px 14px rgba(13,148,136,0.25), 0 1px 3px rgba(13,148,136,0.10)",
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = isAdmin ? "0 8px 24px rgba(37,99,235,0.35)" : "0 8px 24px rgba(13,148,136,0.30)"; }}}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = isAdmin ? "0 4px 14px rgba(37,99,235,0.28), 0 1px 3px rgba(37,99,235,0.12)" : "0 4px 14px rgba(13,148,136,0.25), 0 1px 3px rgba(13,148,136,0.10)"; }}
        >
          {loading ? (
            <>
              <span style={{
                width: 16, height: 16,
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "#fff", borderRadius: "50%",
                animation: "spin 0.65s linear infinite",
                display: "inline-block", flexShrink: 0,
              }} aria-hidden="true" />
              Signing in…
            </>
          ) : (
            <>
              Sign In as {isAdmin ? "Admin" : "Employee"}
              <Icon.ArrowRight size={14} />
            </>
          )}
        </button>

        {/* ── Create account — Admin only ── */}
        {isAdmin && (
          <>
            <div className="divider" style={{ marginBottom: 16, marginTop: 0 }}>
              New to BrixiGo?
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() => setView("register")}
              disabled={loading}
              style={{ width: "100%", justifyContent: "center" }}
            >
              <Icon.Users size={14} />
              Create Admin Account
            </button>
          </>
        )}

        {/* ── TLS footer ── */}
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--slate-400)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <Icon.Shield size={11} />
          Protected by 256-bit TLS encryption ·{" "}
          <a href="#" style={{ color: "var(--blue-600)", textDecoration: "none", fontWeight: 600 }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROOT APP
───────────────────────────────────────────── */
export default function PayWiseApp() {
  const [showLogin, setShowLogin] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [showRegister, setShowRegister] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const handleLoginClick = () => {
    navigate("/login"); 
  };

  // ✅ REGISTER CLICK
  const handleRegisterClick = () => {
    setShowRegister(true);
    setShowResetPassword(false);
  };

  // ✅ RESET PASSWORD CLICK
  const handleResetClick = () => {
    setShowResetPassword(true);
    setShowRegister(false);
  };
  useEffect(() => {
    const id = "paywise-global-css";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    document.body.style.overflow = showLogin ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showLogin]);

  const openLogin = useCallback(() => setShowLogin(true), []);
  const closeLogin = useCallback(() => setShowLogin(false), []);

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar onLoginClick={openLogin} />
      <main>
        <Hero onLoginClick={openLogin} />
        <Stats />
        <Features />
        <ComplianceStrip />
        <Testimonials />
        <Pricing onLoginClick={openLogin} />
        <CTA onLoginClick={openLogin} />
      </main>
      <Footer />
      {showLogin && <LoginModal onClose={closeLogin} />}
      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onSwitchToReset={handleResetClick}   // optional if you use link inside modal
        />
      )}

      {showResetPassword && (
        <ResetPassword
          onClose={() => setShowResetPassword(false)}
        />
      )}
    </div>
    
  );
}