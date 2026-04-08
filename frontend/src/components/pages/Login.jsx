/**
 * PayWise — Enterprise Payroll Management Platform
 * Premium fintech UI — light theme, multi-color design system
 * Production-ready React component
 */

import { useEffect, useRef, useCallback } from "react";
import logo1 from "../assets/images/logo_brixigo3.png";
import { useState, useContext } from "react";
import { AuthContext } from "../../Moduels/Context/AuthContext";
import { useNavigate } from "react-router-dom";
import RegisterModal from "./RegisterModal";
import ResetPassword from "./ResetPassword";
import axios from "axios";


/* ─────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────── */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ============================================
   PAYWISE DESIGN SYSTEM — FINTECH PALETTE
============================================ */
:root {
  /* Core Backgrounds */
  --bg-base:        #F8FAFC;
  --bg-card:        #FFFFFF;
  --bg-subtle:      #F1F5F9;
  --bg-muted:       #E2E8F0;

  /* Primary Slate (text/headers) */
  --slate-900:      #0F172A;
  --slate-700:      #334155;
  --slate-500:      #64748B;
  --slate-400:      #94A3B8;
  --slate-200:      #E2E8F0;
  --slate-100:      #F1F5F9;

  /* Action Blue */
  --blue-700:       #1D4ED8;
  --blue-600:       #2563EB;
  --blue-500:       #3B82F6;
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

  /* Shadows */
  --shadow-xs:      0 1px 2px rgba(15,23,42,0.05);
  --shadow-sm:      0 2px 8px rgba(15,23,42,0.07);
  --shadow-md:      0 4px 16px rgba(15,23,42,0.09);
  --shadow-lg:      0 12px 40px rgba(15,23,42,0.12);
  --shadow-xl:      0 24px 64px rgba(15,23,42,0.14);

  /* Typography */
  --font-display:   'DM Serif Display', Georgia, serif;
  --font-body:      'DM Sans', system-ui, sans-serif;
}

html { scroll-behavior: smooth; }

body {
  background: var(--bg-base);
  color: var(--slate-900);
  font-family: var(--font-body);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* ============================================
   NAVBAR
============================================ */
.pw-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow-xs);
}
  .nav-links button {
  position: relative;
}

.nav-links button::after {
  content: "";
  position: absolute;
  left: 10px;
  bottom: 4px;
  height: 2px;
  width: 0%;
  background: #2563EB;
  transition: width 0.25s ease;
}

.nav-links button:hover::after,
.nav-links button.active::after {
  width: calc(100% - 20px);
}

/* ============================================
   BUTTONS
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
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-primary {
  background: linear-gradient(135deg, var(--blue-600), var(--blue-700));
  color: #fff;
  box-shadow: 0 4px 14px rgba(37,99,235,0.30);
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(37,99,235,0.40);
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
  border-color: var(--blue-500);
  color: var(--blue-600);
  box-shadow: var(--shadow-sm);
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
.btn-xl  { padding: 16px 36px; font-size: 16px; border-radius: 12px; }

/* ============================================
   CARDS
============================================ */
.pw-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
  transition: all 0.25s ease;
}
.pw-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--slate-200);
}

.pw-card-flat {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-xs);
}

/* ============================================
   FORM INPUTS
============================================ */
.pw-input-wrap { position: relative; }

.pw-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--slate-500);
  text-transform: uppercase;
  letter-spacing: 0.6px;
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
  transition: all 0.2s ease;
}
.pw-input::placeholder { color: var(--slate-400); }
.pw-input:focus {
  border-color: var(--blue-500);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
}
.pw-input.error {
  border-color: var(--red-600);
  box-shadow: 0 0 0 3px rgba(220,38,38,0.12);
}
.pw-input.success {
  border-color: var(--green-500);
  box-shadow: 0 0 0 3px rgba(34,197,94,0.12);
}
.pw-input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--slate-400);
  pointer-events: none;
  display: flex;
}

/* ============================================
   BADGES
============================================ */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  padding: 3px 9px;
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
   MODAL
============================================ */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,0.55);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.2s ease;
}
.modal-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: var(--shadow-xl);
  width: 100%;
  padding: 36px;
  position: relative;
  animation: slideUp 0.25s ease;
}

/* ============================================
   ANIMATIONS
============================================ */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-8px); }
}
@keyframes countUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.float-card { animation: float 5s ease-in-out infinite; }
.float-card-2 { animation: float 5s ease-in-out infinite; animation-delay: 1.5s; }
.float-card-3 { animation: float 5s ease-in-out infinite; animation-delay: 3s; }

/* ============================================
   HERO SECTION
============================================ */
.hero-section {
  background: linear-gradient(160deg, #FFFFFF 0%, #F0F9FF 40%, #F0FDFA 100%);
  border-bottom: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.hero-section::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 80% 20%, rgba(37,99,235,0.06) 0%, transparent 55%),
    radial-gradient(ellipse at 20% 80%, rgba(20,184,166,0.05) 0%, transparent 55%);
  pointer-events: none;
}
.hero-grid {
  background-image:
    linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  position: absolute;
  inset: 0;
  pointer-events: none;
  mask-image: radial-gradient(ellipse at 60% 40%, black 30%, transparent 70%);
}
  .hero-cols {
  display: flex;
  gap: 64px;
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
    gap: 32px;
  }
  .nav-links {
  display: flex;
  gap: 8px;
}

.mobile-menu {
  display: none;
}

/* Mobile */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }

  .mobile-menu {
    display: block;
  }
}

  .hero-right {
    align-items: center !important;
  }

  .hero-section {
    padding: 60px 20px 70px !important;
  }
}

/* ============================================
   FEATURES
============================================ */
.feature-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ============================================
   PRICING
============================================ */
.pricing-popular {
  border: 2px solid var(--blue-500);
  position: relative;
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
  padding: 3px 14px;
  border-radius: 999px;
  white-space: nowrap;
  letter-spacing: 0.4px;
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
  padding: 80px 24px;
  background: var(--bg-base);
}

/* Container */
.features-container {
  max-width: 100%;
  margin: 0 48px;
}

/* Header */
.features-header {
  text-align: center;
  margin-bottom: 56px;
}

.features-title {
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 40px);
  color: var(--slate-900);
  margin: 12px 0;
}

.features-subtitle {
  font-size: 16px;
  color: var(--slate-500);
  max-width: 520px;
  margin: 0 auto;
}

/* Grid */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  width: 100%;
}

/* Card */
.feature-card {
  padding: 28px;
  border-radius: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  height: 100%;
  transition: all 0.25s ease;
}

/* Hover effect */
.feature-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
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
}

/* Description */
.feature-desc {
  font-size: 14px;
  color: var(--slate-500);
  line-height: 1.65;
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

/* ============================================
   RESPONSIVE
============================================ */
@media (max-width: 768px) {
  .hero-cols { flex-direction: column !important; }
  .hide-mobile { display: none !important; }
  .nav-links { display: none !important; }
  .modal-card { padding: 24px; }
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
};

/* ─────────────────────────────────────────────
   NAVBAR
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
    transition: "all 0.2s",
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
  }}
>
  <div
    style={{
      width: "100%",
      margin: "0 auto",
      padding: "0 16px",
      height: 64,
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
          height: 50,
          width: "auto",

          objectFit: "contain"
        }}
      />
    </a>

    {/* Nav Links */}
    <div className="nav-links" style={{ display: "flex", gap: 6 }}>
  {navLinks.map((l) => (
    <button
      key={l.id}
      onClick={() => scrollToSection(l.id)}
      style={{
        padding: "8px 14px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        border: "none",
        cursor: "pointer",
        background: active === l.id ? "#EEF2FF" : "transparent",
        color: active === l.id ? "#2563EB" : "#4B5563",
        transition: "all 0.2s"
      }}
    >
      {l.label}
    </button>
  ))}
</div>

    {/* CTA */}
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      

      <button
        onClick={onLoginClick}
        style={{
          padding: "8px 18px",
          borderRadius: 8,
          border: "none",
          background: "linear-gradient(135deg, #1E3A8A, #F97316)",
          color: "#ffffff",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(249,115,22,0.35)",
          transition: "all 0.2s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 6px 18px rgba(249,115,22,0.45)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(249,115,22,0.35)";
        }}
      >
        SIGN IN
      </button>
    </div>
  </div>
</nav>
  );
}

/* ─────────────────────────────────────────────
   HERO
───────────────────────────────────────────── */
function SalaryCard() {
  return (
    <div id="salarycard" className="pw-card-flat float-card" style={{ padding: "18px 22px", minWidth: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Total Payroll — March 2025</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--slate-900)", fontFamily: "var(--font-display)" }}>₹24,58,400</div>
        </div>
        <span className="badge badge-green">✓ Processed</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {[["Employees", "142"], ["Avg. CTC", "₹1.73L"], ["Tax Deducted", "₹3.2L"]].map(([l, v]) => (
  <div key={l}>
    <div style={{ fontSize: 11, color: "var(--slate-400)", fontWeight: 600, marginBottom: 2 }}>
      {l}
    </div>
    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--slate-800)" }}>
      {v}
    </div>
  </div>
))}
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 6 }}>
        <div style={{ flex: 0.6, height: 5, borderRadius: 99, background: "var(--blue-600)" }} />
        <div style={{ flex: 0.2, height: 5, borderRadius: 99, background: "var(--teal-500)" }} />
        <div style={{ flex: 0.2, height: 5, borderRadius: 99, background: "var(--amber-500)" }} />
      </div>
      <div style={{ marginTop: 6, display: "flex", gap: 12, fontSize: 11, color: "var(--slate-500)", fontWeight: 600 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--blue-600)", display: "inline-block" }} /> Basic
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--teal-500)", display: "inline-block" }} /> Allowances
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--amber-500)", display: "inline-block" }} /> Deductions
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
        padding: "18px 22px",
        width: "100%",
        minWidth: 260, // ✅ prevents shrinking issues
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
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
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
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
              fontSize: 13,
              fontWeight: 700,
              color: "var(--slate-800)",
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
            padding: "6px 0",
            borderBottom:
              row.label !== "Net Pay"
                ? "1px solid var(--slate-100)"
                : "none",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--slate-500)" }}>
            {row.label}
          </span>

          <span
            style={{
              fontSize: 12,
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
    <div className="pw-card-flat float-card-3" style={{ padding: "14px 18px", width: "100%" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Attendance — This Week</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--slate-400)", marginBottom: 4 }}>{d}</div>
            <div style={{
              width: "100%", aspectRatio: "1", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700,
              background: status[i] === "p" ? "var(--green-50)" : "var(--red-100)",
              color: status[i] === "p" ? "var(--green-700)" : "var(--red-600)",
              border: `1px solid ${status[i] === "p" ? "var(--green-100)" : "var(--red-100)"}`,
            }}>{status[i] === "p" ? "✓" : "✗"}</div>
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
    <section className="hero-section" style={{ padding: "80px 24px 100px" }}>
      <div className="hero-grid" />
      <div style={{ maxWidth: "100%", margin: "0 auto", position: "relative" }}>
        <div className="hero-cols" style={{display: "flex",alignItems: "center",gap: 64,flexWrap: "wrap"}}>

          {/* Left */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--blue-50)", border: "1px solid var(--blue-100)", borderRadius: 999, padding: "5px 14px", marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue-500)", display: "inline-block", animation: "pulse-dot 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--blue-700)", letterSpacing: "0.3px" }}>Trusted by 2,400+ companies across India</span>
            </div>

            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 2vw, 52px)", lineHeight: 1.15, color: "var(--slate-900)", marginBottom: 20 }}>
              Automate Payroll.<br />
              <span style={{ color: "var(--blue-600)" }}>Ensure Compliance.</span><br />
              Pay Employees{" "}
              <span style={{ fontStyle: "italic", color: "var(--teal-600)" }}>Accurately.</span>
            </h1>

            <p style={{ fontSize: 17, color: "var(--slate-600)", lineHeight: 1.7, marginBottom: 32, maxWidth: 500 }}>
              End-to-end payroll processing with automated TDS, PF, ESI compliance, digital payslips, and real-time employee analytics — built for Indian businesses.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
              <button className="btn btn-primary btn-xl" onClick={onLoginClick}>
                Join With Us <Icon.ArrowRight size={16} />
              </button>
              <button className="btn btn-secondary btn-xl" onClick={onLoginClick}>
                Watch Demo
              </button>
            </div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[["✓ No credit card required","var(--green-700)"], ["✓ Setup in 15 minutes","var(--teal-700)"], ["✓ Fully GST & TDS compliant","var(--blue-700)"]].map(([t,c]) => (
                <span key={t} style={{ fontSize: 13, fontWeight: 600, color: c }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Right — Floating UI Visuals */}
          <div className="hide-mobile" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16, alignItems: "stretch", position: "relative" }}>
            <SalaryCard />
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
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
   STATS STRIP
───────────────────────────────────────────── */
function Stats() {
  const stats = [
    { value: "₹1,200Cr+", label: "Salary Processed Monthly", color: "var(--blue-600)" },
    { value: "2,400+",    label: "Companies Trust Us",        color: "var(--teal-600)" },
    { value: "1.8L+",     label: "Employees on Platform",     color: "var(--green-600)" },
    { value: "99.98%",    label: "On-time Payment Rate",      color: "var(--amber-600)" },
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
          style={{
            padding: "32px 20px",
            borderRight: "1px solid var(--border)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: s.color,
              marginBottom: 4,
            }}
          >
            {s.value}
          </div>

          <div
            style={{
              fontSize: 13,
              color: "var(--slate-500)",
              fontWeight: 500,
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
   FEATURES
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
              <span className={`badge ${f.tagClass}`}>
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
   COMPLIANCE STRIP
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
    background: "var(--slate-100)",
    padding: "56px 0",
    borderTop: "1px solid var(--border)",
    borderBottom: "1px solid var(--border)",
  }}
>
  <div
    style={{
      width: "100%",
      padding: "0 clamp(20px, 6vw, 80px)", // ✅ full width responsive padding
      textAlign: "center",
    }}
  >
    {/* Heading */}
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: "var(--slate-700)",
        textTransform: "uppercase",
        letterSpacing: "1px",
        marginBottom: 28,
      }}
    >
      Full Statutory Compliance Coverage
    </div>

    {/* Pills */}
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 14,
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
            background: "#ffffff", // ✅ FIX: visible card
            border: "1px solid var(--border)",
            borderRadius: 999, // ✅ pill style
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--slate-700)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            transition: "all 0.2s ease",
            cursor: "default",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 6px 14px rgba(0,0,0,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 2px 6px rgba(0,0,0,0.04)";
          }}
        >
          <span style={{ fontSize: 14 }}>{item.icon}</span>
          {item.label}
        </div>
      ))}
    </div>
  </div>
</section>
  );
}

/* ─────────────────────────────────────────────
   TESTIMONIALS
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
    <section style={{ padding: "80px 24px", background: "var(--bg-card)", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <span className="badge badge-teal" style={{ marginBottom: 14 }}>Customer Stories</span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,3.5vw,38px)", color: "var(--slate-900)" }}>
            Trusted by HR & Finance teams
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {reviews.map((r, i) => (
            <div key={i} className="pw-card" style={{ padding: "28px" }}>
              <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                {Array(r.stars).fill(0).map((_, j) => (
                  <span key={j} style={{ color: "var(--amber-500)" }}><Icon.Star size={14} /></span>
                ))}
              </div>
              <p style={{ fontSize: 14, color: "var(--slate-600)", lineHeight: 1.7, marginBottom: 20, fontStyle: "italic" }}>"{r.quote}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: r.avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: r.avatarColor, flexShrink: 0 }}>{r.avatar}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--slate-900)" }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "var(--slate-500)" }}>{r.role} · {r.company}</div>
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
   PRICING
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
    <section id="pricing" style={{ padding: "80px 24px", background: "var(--bg-base)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span className="badge badge-amber" style={{ marginBottom: 14 }}>Transparent Pricing</span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,3.5vw,38px)", color: "var(--slate-900)", marginBottom: 10 }}>Plans that scale with you</h2>
          <p style={{ fontSize: 15, color: "var(--slate-500)" }}>All plans include 30-day free trial · No setup fees · Cancel anytime</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, alignItems: "start" }}>
          {plans.map((p, i) => (
            <div key={i} className={`pw-card ${p.popular ? "pricing-popular" : ""}`} style={{ padding: "32px 28px", position: "relative" }}>
              {p.popular && <div className="pricing-popular-badge">MOST POPULAR</div>}
              <span className={`badge ${p.badge}`} style={{ marginBottom: 16 }}>{p.name}</span>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--slate-900)" }}>{p.price}</span>
                <span style={{ fontSize: 14, color: "var(--slate-500)", fontWeight: 500 }}>{p.period}</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--slate-500)", marginBottom: 24 }}>{p.desc}</p>
              <button className={p.ctaClass} onClick={onLoginClick} style={{ width: "100%", justifyContent: "center", marginBottom: 24 }}>
                {p.cta}
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {p.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--slate-600)" }}>
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
   CTA SECTION
───────────────────────────────────────────── */
function CTA({ onLoginClick }) {
  return (
    <section style={{ padding: "80px 24px", background: "linear-gradient(135deg, #EFF6FF 0%, #F0FDFA 100%)", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <span className="badge badge-blue" style={{ marginBottom: 16 }}>Get Started Today</span>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,4vw,42px)", color: "var(--slate-900)", marginBottom: 16, lineHeight: 1.2 }}>
          Run your first payroll in under 15 minutes
        </h2>
        <p style={{ fontSize: 16, color: "var(--slate-500)", lineHeight: 1.7, marginBottom: 36 }}>
          Join 2,400+ Indian businesses using PayWise to process accurate, compliant payroll every month — without the stress.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary btn-xl" onClick={onLoginClick}>
            Start Free 30-Day Trial <Icon.ArrowRight size={16} />
          </button>
          <button className="btn btn-secondary btn-xl">Talk to Sales</button>
        </div>
        <p style={{ marginTop: 20, fontSize: 13, color: "var(--slate-400)", fontWeight: 500 }}>No credit card · Free setup · Dedicated onboarding support</p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FOOTER
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
        padding: "70px 0 30px",
        background: "var(--slate-900)",
      }}
    >
      <div
        style={{
          width: "100%",
          padding: "0 clamp(20px, 6vw, 80px)", // ✅ full-width responsive
        }}
      >
        {/* TOP GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr", // ✅ better balance
            gap: 48,
            marginBottom: 50,
          }}
        >
          {/* BRAND */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 18,
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
                lineHeight: 1.7,
                marginBottom: 20,
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
                    padding: "4px 10px",
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
                  marginBottom: 18,
                }}
              >
                {col.heading}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
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
                      transition: "all 0.2s",
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
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 24,
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
   FORGOT PASSWORD MODAL
───────────────────────────────────────────── */
function ForgotPasswordModal({ onClose, onBack }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.includes("@")) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "var(--slate-100)", border: "none", borderRadius: 8, color: "var(--slate-500)", cursor: "pointer", padding: 7, display: "flex" }}>
          <Icon.Close size={15} />
        </button>

        {!sent ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
             <img
  src={logo1}
  alt="Brixigo"
  style={{
    height: 50,
    width: "auto",
    objectFit: "contain"
  }}
/>
             
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--slate-900)", marginBottom: 6 }}>Reset Password</h2>
            <p style={{ fontSize: 14, color: "var(--slate-500)", marginBottom: 28 }}>Enter your work email to receive reset instructions.</p>
            <label className="pw-label">Work Email</label>
            <div className="pw-input-wrap" style={{ marginBottom: 24 }}>
              <span className="pw-input-icon"><Icon.Mail size={15} /></span>
              <input className="pw-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <button className="btn btn-primary btn-md" onClick={handleSend} disabled={loading || !email.includes("@")} style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.7 : 1 }}>
              {loading ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> Sending…</> : "Send Reset Link"}
            </button>
            <button onClick={onBack} style={{ width: "100%", marginTop: 12, background: "none", border: "none", color: "var(--blue-600)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}>← Back to Sign In</button>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: "var(--green-50)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "var(--green-600)" }}>
              <Icon.Send size={26} />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--slate-900)", marginBottom: 8 }}>Check your inbox</h2>
            <p style={{ fontSize: 14, color: "var(--slate-500)", marginBottom: 28 }}>We've sent a password reset link to <strong style={{ color: "var(--slate-700)" }}>{email}</strong>. It expires in 30 minutes.</p>
            <button className="btn btn-primary btn-md" onClick={onBack} style={{ width: "100%", justifyContent: "center" }}>Back to Sign In</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   REGISTER MODAL
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
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "var(--slate-100)", border: "none", borderRadius: 8, color: "var(--slate-500)", cursor: "pointer", padding: 7, display: "flex" }}>
          <Icon.Close size={15} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <img
  src={logo1}
  alt="Brixigo"
  style={{
    height: 50,
    width: "auto",
    objectFit: "contain"
  }}
/>
          
        </div>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--slate-900)", marginBottom: 4 }}>Create your account</h2>
        <p style={{ fontSize: 14, color: "var(--slate-500)", marginBottom: 24 }}>No credit card required. Setup takes under 5 minutes.</p>

        {fields.map(f => (
          <div key={f.key} style={{ marginBottom: 16 }}>
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
            {errors[f.key] && <div style={{ marginTop: 5, fontSize: 12, color: "var(--red-600)", fontWeight: 600 }}>{errors[f.key]}</div>}
          </div>
        ))}

        <button className="btn btn-success btn-md" onClick={handleSubmit} disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 8, marginBottom: 16, opacity: loading ? 0.75 : 1 }}>
          {loading ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> Creating account…</> : <>Create Free Account <Icon.ArrowRight size={14} /></>}
        </button>

        <div className="divider" style={{ marginBottom: 16 }}>Already have an account?</div>
        <button className="btn btn-secondary btn-md" onClick={onSwitchToLogin} style={{ width: "100%", justifyContent: "center" }}>
          Sign In Instead
        </button>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--slate-400)" }}>
          By creating an account you agree to our <a href="#" style={{ color: "var(--blue-600)", textDecoration: "none" }}>Terms</a> and <a href="#" style={{ color: "var(--blue-600)", textDecoration: "none" }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LOGIN MODAL
───────────────────────────────────────────── */


function LoginModal({ onClose }) {
  const [view, setView] = useState("login");

  const [loginType, setLoginType] = useState("admin"); // 🔥 admin | employee

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  // =========================
  // HANDLE LOGIN
  // =========================
  const handleSubmit = async () => {
    setError("");

    // ------------------------
    // VALIDATION
    // ------------------------
    if (loginType === "admin") {
      if (!username.trim()) {
        setError("Please enter your username.");
        return;
      }
    } else {
      if (!email.trim()) {
        setError("Please enter your email.");
        return;
      }
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      // =========================
      // ADMIN LOGIN
      // =========================
      if (loginType === "admin") {
        await login(username, password);
      }

      // =========================
      // EMPLOYEE LOGIN
      // =========================
      else {
        const formData = new URLSearchParams();
        formData.append("username", email); // 👈 backend expects 'username'
        formData.append("password", password);

        const res = await axios.post(
  "http://localhost:9000/api/employee-auth/login",
  {
    email: email,        // ✅ backend expects email
    password: password,
  }
);

        // 🔴 FORCE PASSWORD CHANGE
        if (res.data.force_password_change) {
          navigate("/change-password", {
            state: { employee_id: res.data.employee_id },
          });
          return;
        }

        // 🔐 STORE TOKEN
        localStorage.setItem("token", res.data.access_token);
      }

      // =========================
      // SUCCESS
      // =========================
      navigate("/dashboard");
      onClose();

    } catch (error) {
      const err = error.response?.data?.detail;

  if (Array.isArray(err)) {
    // Extract readable messages from FastAPI
    const messages = err.map(e => e.msg).join(", ");
    setError(messages);
  } else if (typeof err === "string") {
    setError(err);
  } else {
    setError("Invalid credentials. Please try again.");
  }
    } finally {
      setLoading(false);
    }
  };

  if (view === "register") return null;
  if (view === "forgot") return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>

        {/* CLOSE */}
        <button onClick={onClose} className="close-btn">
          <Icon.Close size={15} />
        </button>

        {/* TITLE */}
        <h2>Welcome back</h2>
        <p>Sign in to your payroll workspace</p>

        {/* =========================
            LOGIN TYPE SWITCH
        ========================= */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => setLoginType("admin")}
            style={{
              flex: 1,
              background: loginType === "admin" ? "#2563eb" : "#e5e7eb",
              color: loginType === "admin" ? "#fff" : "#000",
              border: "none",
              padding: "8px",
              borderRadius: 6,
            }}
          >
            Admin
          </button>

          <button
            onClick={() => setLoginType("employee")}
            style={{
              flex: 1,
              background: loginType === "employee" ? "#2563eb" : "#e5e7eb",
              color: loginType === "employee" ? "#fff" : "#000",
              border: "none",
              padding: "8px",
              borderRadius: 6,
            }}
          >
            Employee
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ color: "red", marginBottom: 10 }}>
            {String(error)}
          </div>
        )}

        {/* =========================
            USERNAME / EMAIL
        ========================= */}
        <div style={{ marginBottom: 16 }}>
          <label>
            {loginType === "employee" ? "Email" : "Username"}
          </label>

          <input
            type="text"
            placeholder={
              loginType === "employee"
                ? "Enter email"
                : "Enter username"
            }
            value={loginType === "employee" ? email : username}
            onChange={(e) => {
              if (loginType === "employee") setEmail(e.target.value);
              else setUsername(e.target.value);
              setError("");
            }}
          />
        </div>

        {/* =========================
            PASSWORD
        ========================= */}
        <div style={{ marginBottom: 16 }}>
          <label>Password</label>

          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
          />
        </div>

        {/* =========================
            SUBMIT
        ========================= */}
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>

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