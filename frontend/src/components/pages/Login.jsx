/**
 * BrixiGo — Zoho Payroll Style Landing Page
 * Visual DNA: Zoho's exact style — white bg, green hero tint, orange-red CTAs,
 * Lato font, product screenshot mockups, left-nav sidebar tabs + right illustration,
 * horizontal logo strip, shield compliance section, testimonial carousel, dark footer
 */

import { useState, useEffect, useRef, useContext, useCallback } from "react";
import logo1 from "../assets/images/logo_brixigo3.png";
import BrixigoLogo from "../common/BrixigoLogo";
import { AuthContext } from "../../Moduels/Context/AuthContext";
import { useNavigate } from "react-router-dom";
import RegisterModal from "./RegisterModal";
import ResetPassword from "./ResetPassword";
import api from "../../services/api";

/* ═══════════════════════════════════════
   GLOBAL CSS — Zoho visual DNA
═══════════════════════════════════════ */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,400&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  /* Zoho exact palette */
  --z-orange:     #E8502A;
  --z-orange-dk:  #C43D1A;
  --z-orange-lt:  #FFF0EC;
  --z-green:      #1A7340;
  --z-green-lt:   #E8F5EE;
  --z-green-mid:  #D0EDD8;
  --z-blue:       #1565C0;
  --z-blue-lt:    #E3F0FB;
  --z-navy:       #1C2B4B;
  --z-navy-dk:    #111827;
  --z-text:       #333333;
  --z-text-md:    #555555;
  --z-text-lt:    #777777;
  --z-text-xs:    #999999;
  --z-border:     #E0E0E0;
  --z-border-lt:  #EEEEEE;
  --z-bg:         #FFFFFF;
  --z-bg-grey:    #F7F8FA;
  --z-bg-green:   #F0FAF3;
  --z-bg-hero:    #EBF8F0;

  /* Typography — Zoho uses Lato + system fonts */
  --font: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  /* Shadows */
  --sh-sm: 0 2px 8px rgba(0,0,0,0.08);
  --sh-md: 0 4px 20px rgba(0,0,0,0.10);
  --sh-lg: 0 8px 40px rgba(0,0,0,0.12);
  --sh-card: 0 1px 4px rgba(0,0,0,0.06), 0 2px 10px rgba(0,0,0,0.04);
}

html { scroll-behavior: smooth; }
body {
  font-family: var(--font);
  background: var(--z-bg);
  color: var(--z-text);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  font-size: 15px;
  line-height: 1.6;
}

/* ── NAV ── */
.zn-nav {
  background: #fff;
  border-bottom: 1px solid var(--z-border);
  position: sticky;
  top: 0;
  z-index: 200;
  transition: box-shadow .3s;
}
.zn-nav.scrolled { box-shadow: 0 2px 12px rgba(0,0,0,.08); }

/* ── BUTTONS ── */
.zb {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font);
  font-weight: 700;
  cursor: pointer;
  border: none;
  text-decoration: none;
  transition: all .22s;
  white-space: nowrap;
}
.zb-primary {
  background: var(--z-orange);
  color: #fff;
  border-radius: 4px;
  padding: 11px 24px;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(232,80,42,.25);
}
.zb-primary:hover { background: var(--z-orange-dk); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(232,80,42,.35); }
.zb-primary:active { transform: none; }

.zb-outline {
  background: transparent;
  color: var(--z-orange);
  border: 1.5px solid var(--z-orange);
  border-radius: 4px;
  padding: 10px 22px;
  font-size: 14px;
}
.zb-outline:hover { background: var(--z-orange-lt); }

.zb-ghost {
  background: transparent;
  color: var(--z-text-md);
  border: 1.5px solid var(--z-border);
  border-radius: 4px;
  padding: 10px 22px;
  font-size: 14px;
}
.zb-ghost:hover { border-color: var(--z-orange); color: var(--z-orange); }

.zb-green {
  background: var(--z-green);
  color: #fff;
  border-radius: 4px;
  padding: 11px 24px;
  font-size: 14px;
}
.zb-green:hover { background: #15603A; transform: translateY(-1px); }

/* ── SECTION HEADER ── */
.z-sec-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--z-orange);
  margin-bottom: 8px;
}
.z-sec-h2 {
  font-size: 30px;
  font-weight: 700;
  color: var(--z-text);
  line-height: 1.25;
  margin-bottom: 14px;
}
.z-sec-h3 {
  font-size: 20px;
  font-weight: 700;
  color: var(--z-text);
  line-height: 1.3;
  margin-bottom: 10px;
}
.z-sec-sub {
  font-size: 16px;
  color: var(--z-text-md);
  line-height: 1.7;
  max-width: 600px;
}

/* ── FEATURE LEFT-NAV TABS (Zoho style) ── */
.zfeat-wrap {
  display: flex;
  gap: 0;
  background: var(--z-bg);
  border: 1px solid var(--z-border);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--sh-card);
}
.zfeat-nav {
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid var(--z-border);
  background: var(--z-bg-grey);
}
.zfeat-nav-item {
  padding: 18px 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--z-text-md);
  cursor: pointer;
  border-left: 3px solid transparent;
  border-bottom: 1px solid var(--z-border-lt);
  transition: all .2s;
  display: flex;
  align-items: center;
  gap: 10px;
}
.zfeat-nav-item:last-child { border-bottom: none; }
.zfeat-nav-item:hover { background: var(--z-bg-green); color: var(--z-green); }
.zfeat-nav-item.active {
  background: #fff;
  color: var(--z-green);
  border-left-color: var(--z-orange);
  font-weight: 700;
}
.zfeat-content {
  flex: 1;
  padding: 32px 36px;
  min-height: 380px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* ── COMPLIANCE ITEMS ── */
.zcomp-item {
  display: flex;
  gap: 16px;
  padding: 20px 0;
  border-bottom: 1px solid var(--z-border-lt);
}
.zcomp-item:last-child { border-bottom: none; }
.zcomp-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: var(--z-green-lt);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--z-green);
  flex-shrink: 0;
}

/* ── ESS TABS (Zoho pill tabs) ── */
.zess-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 28px;
}
.zess-tab {
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  background: #fff;
  border: 1.5px solid var(--z-border);
  color: var(--z-text-md);
  cursor: pointer;
  transition: all .2s;
}
.zess-tab.active {
  background: var(--z-orange);
  border-color: var(--z-orange);
  color: #fff;
}
.zess-tab:not(.active):hover {
  border-color: var(--z-orange);
  color: var(--z-orange);
}

/* ── TESTIMONIAL CAROUSEL ── */
.ztesti-card {
  background: #fff;
  border: 1px solid var(--z-border);
  border-radius: 8px;
  padding: 28px 30px;
  box-shadow: var(--sh-card);
}

/* ── MODAL ── */
.zm-bg {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: zFadeIn .25s ease;
  overflow-y: auto;
}
.zm-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  width: 100%;
  max-width: 440px;
  padding: 36px 40px 32px;
  position: relative;
  animation: zSlideUp .3s ease;
  margin: auto;
}

/* ── ROLE TABS ── */
.zrole-wrap {
  display: flex;
  border: 1px solid var(--z-border);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 20px;
}
.zrole-tab {
  flex: 1;
  padding: 10px;
  font-size: 13px;
  font-weight: 700;
  font-family: var(--font);
  border: none;
  background: var(--z-bg-grey);
  color: var(--z-text-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all .2s;
  border-right: 1px solid var(--z-border);
}
.zrole-tab:last-child { border-right: none; }
.zrole-tab.active { background: var(--z-orange); color: #fff; }
.zrole-tab:not(.active):hover { background: var(--z-orange-lt); color: var(--z-orange); }

/* ── INPUTS ── */
.zf-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--z-text-md);
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: .5px;
}
.zf-wrap { position: relative; }
.zf-input {
  width: 100%;
  height: 44px;
  padding: 0 12px 0 38px;
  font-family: var(--font);
  font-size: 14px;
  color: var(--z-text);
  background: #fff;
  border: 1.5px solid var(--z-border);
  border-radius: 4px;
  outline: none;
  transition: all .2s;
}
.zf-input::placeholder { color: var(--z-text-xs); }
.zf-input:focus { border-color: var(--z-orange); box-shadow: 0 0 0 3px rgba(232,80,42,.1); }
.zf-input.err { border-color: #D32F2F; box-shadow: 0 0 0 3px rgba(211,47,47,.08); }
.zf-icon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--z-text-xs);
  pointer-events: none;
  display: flex;
  align-items: center;
  transition: color .2s;
}
.zf-wrap:focus-within .zf-icon { color: var(--z-orange); }
.zf-err-msg {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
  font-size: 12px;
  font-weight: 600;
  color: #D32F2F;
}
.zf-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--z-text-xs);
  font-size: 12px;
  margin: 16px 0;
}
.zf-divider::before, .zf-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--z-border);
}

/* ── ANIMATIONS ── */
@keyframes zFadeIn { from{opacity:0} to{opacity:1} }
@keyframes zSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
@keyframes zSpin { to{transform:rotate(360deg)} }
@keyframes zFadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }

/* ── RESPONSIVE ── */
@media(max-width:900px){
  .zfeat-nav{width:180px}
  .z-sec-h2{font-size:24px}
}
@media(max-width:768px){
  .zfeat-wrap{flex-direction:column}
  .zfeat-nav{width:100%;border-right:none;border-bottom:1px solid var(--z-border);display:flex;overflow-x:auto}
  .zfeat-nav-item{border-left:none;border-bottom:3px solid transparent;border-right:1px solid var(--z-border-lt);white-space:nowrap}
  .zfeat-nav-item.active{border-left:none;border-bottom-color:var(--z-orange)}
  .hide-mob{display:none!important}
  .zm-card{padding:28px 22px}
}
@media(max-width:520px){.zm-card{max-width:100%;border-radius:8px}}

/* ── LOGO TICKER ── */
.zlogo-track { display:flex; gap:48px; animation:zTicker 18s linear infinite; align-items:center; }
@keyframes zTicker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
.zlogo-wrap { overflow:hidden; mask-image:linear-gradient(90deg,transparent,black 10%,black 90%,transparent); }

/* ── FOOTER ── */
.zfooter { background: var(--z-navy-dk); color: #ccc; }
.zfooter a { color:#ccc; text-decoration:none; font-size:13px; transition:color .15s; }
.zfooter a:hover { color:#fff; }
.zfooter-head { font-size:13px; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:.6px; margin-bottom:14px; }

/* ── PRICING CARD ── */
.zprice-card {
  background: #fff;
  border: 1px solid var(--z-border);
  border-radius: 8px;
  padding: 32px 28px;
  box-shadow: var(--sh-card);
  transition: all .3s;
  position: relative;
}
.zprice-card:hover { transform: translateY(-4px); box-shadow: var(--sh-md); }
.zprice-popular { border-color: var(--z-orange); border-width: 2px; }
.zprice-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--z-orange);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 16px;
  border-radius: 20px;
  white-space: nowrap;
  letter-spacing: .4px;
}

/* ── DASHBOARD ILLUSTRATION ── */
.zdash {
  background: #fff;
  border: 1px solid var(--z-border);
  border-radius: 10px;
  box-shadow: var(--sh-md);
  overflow: hidden;
}
.zdash-bar {
  background: var(--z-green);
  color: #fff;
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.zdash-dot { width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.5);display:inline-block; }

/* scrollbar */
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#ddd;border-radius:99px}
`;

/* ═══════════════════════════════════════
   ICONS
═══════════════════════════════════════ */
const I = {
  User: ({s=16}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Lock: ({s=16}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Mail: ({s=16}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Eye: ({s=15}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff: ({s=15}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  Check: ({s=14}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Arrow: ({s=14}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Close: ({s=14}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Alert: ({s=13}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Shield: ({s=20}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Send: ({s=20}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Star: ({s=14}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  ChevL: ({s=18}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevR: ({s=18}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Play: ({s=14}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Info: ({s=13}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
};

/* ═══════════════════════════════════════
   DASHBOARD ILLUSTRATION (replaces Zoho screenshot)
═══════════════════════════════════════ */
function DashboardMockup() {
  return (
    <div className="zdash" style={{ width: "100%", maxWidth: 560 }}>
      <div className="zdash-bar">
        <span>BrixiGo Payroll · April 2025</span>
        <div style={{ display: "flex", gap: 6 }}>
          <span className="zdash-dot" />
          <span className="zdash-dot" />
          <span className="zdash-dot" />
        </div>
      </div>
      <div style={{ padding: 20, background: "#F7F8FA" }}>
        {/* Summary row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          {[["Total Payroll","₹26,40,000","#1A7340"],["Employees","148","#1565C0"],["TDS Deducted","₹3,84,000","#E8502A"]].map(([l,v,c]) => (
            <div key={l} style={{ background: "#fff", borderRadius: 6, padding: "12px 14px", border: "1px solid #E0E0E0" }}>
              <div style={{ fontSize: 10, color: "#777", fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".4px" }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: c, letterSpacing: "-.01em" }}>{v}</div>
            </div>
          ))}
        </div>
        {/* Salary breakdown bars */}
        <div style={{ background: "#fff", borderRadius: 6, padding: "14px 16px", border: "1px solid #E0E0E0", marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 12, textTransform: "uppercase", letterSpacing: ".5px" }}>Salary Breakdown</div>
          {[["Basic","74%","#1A7340"],["HRA","21%","#43A047"],["Transport","5%","#81C784"]].map(([l,p,c]) => (
            <div key={l} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "#555", fontWeight: 600 }}>{l}</span>
                <span style={{ color: "#333", fontWeight: 700 }}>{p}</span>
              </div>
              <div style={{ height: 6, background: "#E8F5EE", borderRadius: 99 }}>
                <div style={{ height: "100%", width: p, background: c, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
        {/* Employee list */}
        <div style={{ background: "#fff", borderRadius: 6, border: "1px solid #E0E0E0", overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #EEE", display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: ".5px" }}>
            <span>Employee</span><span>Department</span><span>Net Pay</span><span>Status</span>
          </div>
          {[["Priya Sharma","Engineering","₹1,12,400","Paid"],["Rahul Singh","Operations","₹88,600","Paid"],["Anita Rao","HR","₹72,200","Paid"]].map(([n,d,s,st]) => (
            <div key={n} style={{ padding: "10px 14px", borderBottom: "1px solid #F5F5F5", display: "flex", justifyContent: "space-between", fontSize: 12, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E8F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#1A7340" }}>{n.split(" ").map(w=>w[0]).join("")}</div>
                <span style={{ fontWeight: 600, color: "#333" }}>{n}</span>
              </div>
              <span style={{ color: "#777" }}>{d}</span>
              <span style={{ fontWeight: 700, color: "#333" }}>{s}</span>
              <span style={{ background: "#E8F5EE", color: "#1A7340", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>{st}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* phone mockup for ESS */
function PhoneMockup({ tab }) {
  const content = {
    web: (
      <div style={{ padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "#333" }}>My Payslip — April 2025</div>
        {[["Gross Pay","₹1,40,000"],["PF Deduction","-₹8,400"],["TDS","-₹21,200"],["Net Pay","₹1,10,400"]].map(([l,v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F0F0F0", fontSize: 12 }}>
            <span style={{ color: "#777" }}>{l}</span>
            <span style={{ fontWeight: 700, color: l === "Net Pay" ? "#1A7340" : l.includes("-") || l === "TDS" || l === "PF" ? "#D32F2F" : "#333" }}>{v}</span>
          </div>
        ))}
        <button style={{ marginTop: 14, width: "100%", padding: "9px", background: "#E8502A", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Download PDF</button>
      </div>
    ),
    payslip: (
      <div style={{ padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "#333" }}>Payslips</div>
        {[["March 2025","₹1,08,200","Paid"],["Feb 2025","₹1,08,200","Paid"],["Jan 2025","₹1,02,400","Paid"]].map(([m,a,s]) => (
          <div key={m} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F0F0F0" }}>
            <div><div style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>{m}</div><div style={{ fontSize: 11, color: "#777" }}>{a}</div></div>
            <span style={{ background: "#E8F5EE", color: "#1A7340", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{s}</span>
          </div>
        ))}
      </div>
    ),
    leave: (
      <div style={{ padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "#333" }}>Leave Balance</div>
        {[["Casual Leave","8 days","#1A7340"],["Sick Leave","6 days","#1565C0"],["Earned Leave","14 days","#E8502A"]].map(([t,d,c]) => (
          <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F0F0F0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>{t}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{d}</span>
          </div>
        ))}
        <button style={{ marginTop: 14, width: "100%", padding: "9px", background: "#1A7340", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Apply for Leave</button>
      </div>
    ),
    notify: (
      <div style={{ padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "#333" }}>Notifications</div>
        {[["Salary Credited","April salary ₹1,10,400 credited","2m"],["Payslip Ready","April 2025 payslip is ready","1h"],["TDS Updated","Form 16 for FY 24-25 available","1d"]].map(([t,s,tm]) => (
          <div key={t} style={{ padding: "8px 0", borderBottom: "1px solid #F0F0F0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>{t}</span>
              <span style={{ fontSize: 10, color: "#999" }}>{tm}</span>
            </div>
            <span style={{ fontSize: 11, color: "#777" }}>{s}</span>
          </div>
        ))}
      </div>
    ),
  };

  return (
    <div style={{ width: 220, background: "#1C1C1E", borderRadius: 24, padding: 8, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", flexShrink: 0 }}>
      <div style={{ background: "#fff", borderRadius: 18, overflow: "hidden" }}>
        <div style={{ background: "#1A7340", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>BrixiGo</span>
          <div style={{ display: "flex", gap: 4 }}>
            {[...Array(3)].map((_,i) => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,.6)" }} />)}
          </div>
        </div>
        <div style={{ minHeight: 200 }}>{content[tab] || content.web}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   NAVBAR
═══════════════════════════════════════ */
function Navbar({ onLoginClick }) {
  const [scrolled, setScrolled] = useState(false);
  const links = [
    { label: "Features", id: "features" }, { label: "Pricing", id: "pricing" },
    { label: "Compliance", id: "compliance" }, { label: "Customers", id: "testimonials" }, { label: "Support", id: "footer" },
  ];
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const scrollTo = id => { const el = document.getElementById(id); if (el) window.scrollTo({ top: el.offsetTop - 68, behavior: "smooth" }); };

  return (
    <nav className={`zn-nav${scrolled ? " scrolled" : ""}`}>
      <div style={{ width: "100%", padding: "0 clamp(16px,4vw,48px)", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="#" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <BrixigoLogo
            height={48}
            alt="Brixigo Technologies Pvt.Ltd."
            hoverScale={1.03}
            style={{ objectPosition: "left center", maxWidth: 220 }}
          />
        </a>
        <div className="hide-mob" style={{ display: "flex", gap: 2 }}>
          {links.map(l => (
            <button key={l.id} onClick={() => scrollTo(l.id)} style={{ padding: "8px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--z-text-md)", fontFamily: "var(--font)", borderRadius: 4, transition: "all .2s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--z-green)"; e.currentTarget.style.background = "var(--z-bg-green)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--z-text-md)"; e.currentTarget.style.background = "transparent"; }}
            >{l.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="zb zb-ghost" onClick={onLoginClick}>Sign In</button>
          <button className="zb zb-primary" onClick={onLoginClick}>Start Free Trial</button>
        </div>
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════
   HERO — Zoho style: white + light green tint, big H1, product screenshot
═══════════════════════════════════════ */
function Hero({ onLoginClick }) {
  return (
    <section style={{ background: "linear-gradient(180deg, var(--z-bg-hero) 0%, #fff 100%)", borderBottom: "1px solid var(--z-border)", padding: "72px clamp(20px,5vw,72px) 0", overflow: "hidden" }}>
      <div style={{ width: "100%" }}>
        {/* Top announcement bar */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--z-green-mid)", borderRadius: 20, padding: "6px 16px", fontSize: 13, color: "var(--z-green)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--z-orange)", display: "inline-block" }} />
            <span style={{ fontWeight: 700 }}>New fiscal year?</span>
            <span style={{ color: "var(--z-text-md)" }}>Start your payroll with a clean slate.</span>
            <a href="#" style={{ color: "var(--z-orange)", fontWeight: 700, textDecoration: "none" }}>Learn how →</a>
          </div>
        </div>

        <div style={{ display: "flex", gap: 60, alignItems: "flex-end", flexWrap: "wrap" }}>
          {/* Left copy */}
          <div style={{ flex: "0 0 auto", maxWidth: 520, paddingBottom: 60 }}>
            <h1 style={{ fontSize: "clamp(30px,3.8vw,48px)", fontWeight: 900, color: "var(--z-text)", lineHeight: 1.15, marginBottom: 20, letterSpacing: "-.01em" }}>
              Payroll made easy,<br />
              <span style={{ color: "var(--z-green)" }}>scalable,</span> and{" "}
              <span style={{ color: "var(--z-orange)" }}>compliant</span>
            </h1>
            <p style={{ fontSize: 17, color: "var(--z-text-md)", lineHeight: 1.7, marginBottom: 32, maxWidth: 460 }}>
              Transform outdated payroll practices and build a better workplace for your business with BrixiGo Payroll.
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
              <button className="zb zb-primary" onClick={onLoginClick} style={{ fontSize: 15, padding: "13px 28px" }}>Start My Free Trial</button>
              <button className="zb zb-outline" onClick={onLoginClick} style={{ gap: 7 }}><I.Play />Request a Demo</button>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {["✓ No credit card required","✓ Setup in 15 minutes","✓ GST & TDS compliant"].map(t => (
                <span key={t} style={{ fontSize: 13, color: "var(--z-text-md)", fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Right — product screenshot */}
          <div style={{ flex: 1, minWidth: 280, display: "flex", justifyContent: "center", alignItems: "flex-end" }}>
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   CUSTOMER LOGOS STRIP (Zoho style ticker)
═══════════════════════════════════════ */
function LogoStrip() {
  const logos = ["Nexus Tech","BuildCore","MedChain","GreenPulse","Axis Retail","Spectra IT","DataMind","SwiftHR","OmniPay","TalentFlow"];
  return (
    <section style={{ padding: "32px 0", background: "#fff", borderBottom: "1px solid var(--z-border)" }}>
      <p style={{ textAlign: "center", fontSize: 13, color: "var(--z-text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 20 }}>Loved by India's fastest-growing businesses</p>
      <div className="zlogo-wrap">
        <div className="zlogo-track">
          {[...logos, ...logos].map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 24px", background: "var(--z-bg-grey)", border: "1px solid var(--z-border)", borderRadius: 6, whiteSpace: "nowrap", fontSize: 13, fontWeight: 700, color: "var(--z-text-md)", minWidth: 140 }}>{l}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   FEATURES — Zoho left-nav sidebar + right illustration
═══════════════════════════════════════ */
const FEAT_DATA = [
  { id: "salary", label: "Personalize salary components", icon: "💰", title: "Customize salary structures for every employee", desc: "Accommodate diverse salary structures that suit each employee and your organisation hierarchy with custom earnings and deductions.", details: ["Custom earnings components (HRA, TA, DA)","Flexible deduction structures","Multiple pay schedules","Loan & advance management"] },
  { id: "bank", label: "Deliver salaries online", icon: "🏦", title: "Pay employees directly to their bank accounts", desc: "BrixiGo has joined hands with reputed banks in India and auto-generates bank advice so you can pay employees online — instantly.", details: ["Direct bank transfer integration","Auto bank advice generation","Multi-bank support","Payment confirmation receipts"] },
  { id: "contractor", label: "Contractor payments", icon: "🤝", title: "Simplify contractor & freelancer payments", desc: "Add contractors, set their reporting roles, handle TDS automatically, and manage their payouts alongside employees in one workflow.", details: ["Contractor onboarding workflow","Auto TDS on contractor payments","Form 16A generation","Unified payout dashboard"] },
  { id: "approvals", label: "Multi-level approvals", icon: "✅", title: "Secure every payroll run with approval layers", desc: "Ensure every pay run passes through the right hands with multi-level approvals, keeping your entire payroll process completely reliable.", details: ["Configurable approval chains","Role-based access control","Audit trail for every action","Approval notification alerts"] },
  { id: "reports", label: "Payroll reports & insights", icon: "📊", title: "Get instant insights with powerful reports", desc: "With auto-generated reports, you get a clear picture of payroll costs, employee salaries, and more to make smarter data-backed decisions.", details: ["30+ pre-built report templates","Scheduled report delivery","Cost-centre analysis","Export to Excel & PDF"] },
  { id: "scale", label: "Effortless scalability", icon: "🚀", title: "Scales from 5 to 5,000 employees seamlessly", desc: "From budding startups to established enterprises, BrixiGo grows with your business — with no data migration headaches.", details: ["Multi-company payroll","Branch & department management","Bulk employee onboarding","API-first architecture"] },
];

function FeatIllustration({ id }) {
  const illustrations = {
    salary: (
      <div style={{ background: "var(--z-bg-grey)", borderRadius: 8, padding: 20, border: "1px solid var(--z-border)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--z-text-md)", marginBottom: 14, textTransform: "uppercase", letterSpacing: ".5px" }}>Salary Structure — Priya Sharma</div>
        {[["Basic","₹70,000","#1A7340",70],["HRA","₹28,000","#1565C0",28],["Transport","₹8,000","#E8502A",8],["Medical","₹5,000","#7B1FA2",5]].map(([l,v,c,w]) => (
          <div key={l} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: "var(--z-text-md)", fontWeight: 600 }}>{l}</span>
              <span style={{ fontWeight: 700, color: "var(--z-text)" }}>{v}</span>
            </div>
            <div style={{ height: 7, background: "#E8F5EE", borderRadius: 99 }}>
              <div style={{ height: "100%", width: `${w}%`, background: c, borderRadius: 99 }} />
            </div>
          </div>
        ))}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--z-border)", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: "var(--z-text-md)" }}>Total CTC</span>
          <span style={{ fontWeight: 900, color: "var(--z-green)", fontSize: 16 }}>₹1,32,000/mo</span>
        </div>
      </div>
    ),
    bank: (
      <div style={{ background: "var(--z-bg-grey)", borderRadius: 8, padding: 20, border: "1px solid var(--z-border)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--z-text-md)", marginBottom: 14, textTransform: "uppercase", letterSpacing: ".5px" }}>Bank Transfer — April 2025</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[["HDFC Bank","142 employees","₹18,40,000","Sent"],["ICICI Bank","6 employees","₹7,20,000","Sent"],["SBI","0 employees","₹0","N/A"]].map(([bank,emp,amt,st]) => (
            <div key={bank} style={{ background: "#fff", borderRadius: 6, padding: "10px 14px", border: "1px solid var(--z-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontSize: 13, fontWeight: 700, color: "var(--z-text)" }}>{bank}</div><div style={{ fontSize: 11, color: "var(--z-text-xs)" }}>{emp}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 13, fontWeight: 700, color: "var(--z-text)" }}>{amt}</div><span style={{ fontSize: 10, fontWeight: 700, background: st==="Sent" ? "#E8F5EE" : "#F5F5F5", color: st==="Sent" ? "#1A7340" : "#999", padding: "2px 8px", borderRadius: 10 }}>{st}</span></div>
            </div>
          ))}
        </div>
      </div>
    ),
    contractor: (
      <div style={{ background: "var(--z-bg-grey)", borderRadius: 8, padding: 20, border: "1px solid var(--z-border)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--z-text-md)", marginBottom: 14, textTransform: "uppercase", letterSpacing: ".5px" }}>Contractors this month</div>
        {[["Arun K.","UI/UX Design","₹45,000","TDS 10%"],["Meera S.","Content","₹22,000","TDS 1%"],["TechSoft Ltd","Development","₹1,80,000","TDS 2%"]].map(([n,r,a,t]) => (
          <div key={n} style={{ background: "#fff", borderRadius: 6, padding: "10px 14px", border: "1px solid var(--z-border)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 12, fontWeight: 700, color: "var(--z-text)" }}>{n}</div><div style={{ fontSize: 11, color: "#777" }}>{r}</div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 12, fontWeight: 700, color: "var(--z-text)" }}>{a}</div><span style={{ fontSize: 10, color: "var(--z-orange)", fontWeight: 700 }}>{t}</span></div>
          </div>
        ))}
      </div>
    ),
    approvals: (
      <div style={{ background: "var(--z-bg-grey)", borderRadius: 8, padding: 20, border: "1px solid var(--z-border)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--z-text-md)", marginBottom: 14, textTransform: "uppercase", letterSpacing: ".5px" }}>Approval Workflow — April Run</div>
        {[["HR Manager","Approved","Priya K.","#1A7340","✓"],["Finance Head","Approved","Rajesh M.","#1A7340","✓"],["CFO","Pending","Sunita P.","#E8502A","⏳"],["CEO","Awaiting","Arun T.","#999","—"]].map(([r,s,n,c,i]) => (
          <div key={r} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: c+"22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{i}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700, color: "var(--z-text)" }}>{r}</div><div style={{ fontSize: 11, color: "#777" }}>{n}</div></div>
            <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{s}</span>
          </div>
        ))}
      </div>
    ),
    reports: (
      <div style={{ background: "var(--z-bg-grey)", borderRadius: 8, padding: 20, border: "1px solid var(--z-border)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--z-text-md)", marginBottom: 14, textTransform: "uppercase", letterSpacing: ".5px" }}>Monthly Cost by Department</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 110, marginBottom: 8 }}>
          {[["Eng","88","#1A7340"],["Sales","72","#E8502A"],["Ops","60","#1565C0"],["HR","38","#7B1FA2"],["Fin","44","#F57C00"]].map(([d,h,c]) => (
            <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--z-text-md)" }}>{h}%</span>
              <div style={{ width: "100%", height: `${h}%`, background: c, borderRadius: "4px 4px 0 0" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--z-text-xs)" }}>{d}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    scale: (
      <div style={{ background: "var(--z-bg-grey)", borderRadius: 8, padding: 20, border: "1px solid var(--z-border)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--z-text-md)", marginBottom: 14, textTransform: "uppercase", letterSpacing: ".5px" }}>Company Overview</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[["Total Employees","1,842","#1A7340"],["Active Branches","14","#1565C0"],["States Covered","12","#E8502A"],["Payroll Run","₹2.4Cr/mo","#7B1FA2"]].map(([l,v,c]) => (
            <div key={l} style={{ background: "#fff", borderRadius: 6, padding: "12px", border: "1px solid var(--z-border)", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#777", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: c }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  };
  return illustrations[id] || illustrations.salary;
}

function Features() {
  const [active, setActive] = useState("salary");
  const feat = FEAT_DATA.find(f => f.id === active);

  return (
    <section id="features" style={{ padding: "80px clamp(20px,5vw,72px)", background: "#fff" }}>
      <div style={{ width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="z-sec-label">Effortless Payroll</div>
          <h2 className="z-sec-h2">Software that makes hard things easy</h2>
          <p className="z-sec-sub" style={{ margin: "0 auto" }}>BrixiGo handles everything from salary calculations to compliance filings — so you can focus on your people.</p>
        </div>

        <div className="zfeat-wrap">
          {/* Left nav */}
          <div className="zfeat-nav">
            {FEAT_DATA.map(f => (
              <div key={f.id} className={`zfeat-nav-item${active === f.id ? " active" : ""}`} onClick={() => setActive(f.id)}>
                <span style={{ fontSize: 16 }}>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
          {/* Right content */}
          <div className="zfeat-content">
            <h3 className="z-sec-h3" style={{ marginBottom: 10, color: "var(--z-green)" }}>{feat.title}</h3>
            <p style={{ fontSize: 15, color: "var(--z-text-md)", lineHeight: 1.7, marginBottom: 24 }}>{feat.desc}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
              {feat.details.map(d => (
                <div key={d} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13.5, color: "var(--z-text-md)" }}>
                  <span style={{ color: "var(--z-green)", flexShrink: 0, marginTop: 2 }}><I.Check s={13} /></span>{d}
                </div>
              ))}
            </div>
            <FeatIllustration id={active} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   LEAVE & ATTENDANCE (Zoho style full-section)
═══════════════════════════════════════ */
function LeaveSection() {
  return (
    <section style={{ padding: "80px clamp(20px,5vw,72px)", background: "var(--z-bg-grey)", borderTop: "1px solid var(--z-border)" }}>
      <div style={{ width: "100%", display: "flex", gap: 64, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="z-sec-label">Leave and Attendance</div>
          <h2 className="z-sec-h2">Manage leave and attendance, built-in.</h2>
          <p style={{ fontSize: 16, color: "var(--z-text-md)", lineHeight: 1.75, marginBottom: 28 }}>Create custom leave types, allow employees to apply for leaves, approve or reject leaves, manage attendance — all from within BrixiGo.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[["📅 Custom Leave Types","Configure Casual, Sick, Earned, and custom leave policies per state or role."],["📍 Attendance Tracking","Integrate with biometric devices or let employees check in from the ESS portal."],["📋 Auto LOP Deduction","Missed days are automatically computed and deducted from the pay run."],["📲 Mobile Check-in","Employees can mark attendance from the BrixiGo mobile app with location tagging."]].map(([t,d]) => (
              <div key={t} style={{ display: "flex", gap: 12 }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{t.split(" ")[0]}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--z-text)", marginBottom: 3 }}>{t.slice(3)}</div>
                  <div style={{ fontSize: 13.5, color: "var(--z-text-md)", lineHeight: 1.6 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          {/* Leave calendar mockup */}
          <div className="zdash" style={{ maxWidth: 420 }}>
            <div className="zdash-bar"><span>Attendance · May 2025</span></div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 12 }}>
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                  <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--z-text-xs)", padding: "4px 0" }}>{d}</div>
                ))}
                {[null,null,null,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31].map((d,i) => {
                  const status = d ? ([7,14,21,28].includes(d) ? "wknd" : [6,13,20,27].includes(d) ? "wknd" : d === 5 || d === 12 ? "absent" : d === 1 ? "holiday" : d > 6 ? "present" : "upcoming") : null;
                  const bg = !d ? "transparent" : status === "present" ? "#E8F5EE" : status === "absent" ? "#FFEBEE" : status === "holiday" ? "#FFF8E1" : status === "wknd" ? "#F5F5F5" : "transparent";
                  const col = !d ? "transparent" : status === "present" ? "#1A7340" : status === "absent" ? "#D32F2F" : status === "holiday" ? "#F57C00" : "#999";
                  return (
                    <div key={i} style={{ textAlign: "center", padding: "5px 2px", borderRadius: 6, background: bg, fontSize: 12, fontWeight: 600, color: col }}>{d || ""}</div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 11, fontWeight: 700 }}>
                <span style={{ color: "#1A7340" }}>● Present</span>
                <span style={{ color: "#D32F2F" }}>● Absent</span>
                <span style={{ color: "#F57C00" }}>● Holiday</span>
                <span style={{ color: "#999" }}>● Weekend</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   COMPLIANCE — Zoho shield section
═══════════════════════════════════════ */
function Compliance() {
  const items = [
    { icon: "⚙️", t: "Automated adjustments", d: "Adapt easily to ever-changing tax laws. BrixiGo updates compliance rules automatically so you're always current." },
    { icon: "📄", t: "Tax forms ready in one click", d: "Download Form 12BB, 24Q, TDS, and Form 16 instantly with e-signature capability built right in." },
    { icon: "🛡️", t: "PF, ESI, LWF, PT & IT", d: "Keep your business on legal footing across all 28 states with automated statutory calculations." },
    { icon: "📊", t: "Ready-to-file reports", d: "Auto-generate pre-formatted statutory and tax reports for faster, error-free filing every quarter." },
  ];
  return (
    <section id="compliance" style={{ padding: "80px clamp(20px,5vw,72px)", background: "#fff", borderTop: "1px solid var(--z-border)" }}>
      <div style={{ width: "100%", display: "flex", gap: 64, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="z-sec-label">Simplified Compliance</div>
          <h2 className="z-sec-h2">Stay compliant, without thinking about compliance</h2>
          <p style={{ fontSize: 16, color: "var(--z-text-md)", lineHeight: 1.75, marginBottom: 32 }}>We handle regionally intricate and distinct compliance regulations all across India, so you don't have to.</p>
          <div>
            {items.map(it => (
              <div key={it.t} className="zcomp-item">
                <div className="zcomp-icon"><span style={{ fontSize: 20 }}>{it.icon}</span></div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--z-text)", marginBottom: 4 }}>{it.t}</h4>
                  <p style={{ fontSize: 14, color: "var(--z-text-md)", lineHeight: 1.65 }}>{it.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: "0 0 auto", minWidth: 280 }}>
          {/* Shield illustration */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{ width: 180, height: 180, borderRadius: "50%", background: "linear-gradient(135deg, var(--z-green-lt), var(--z-green-mid))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 40px rgba(26,115,64,.15)" }}>
              <div style={{ fontSize: 80 }}>🛡️</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[["TDS","Auto"],["PF","Compliant"],["ESI","Covered"],["Form 16","Instant"]].map(([l,v]) => (
                <div key={l} style={{ background: "var(--z-bg-grey)", border: "1px solid var(--z-border)", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "var(--z-text-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--z-green)" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   ESS — Employee Self Service (Zoho pill tabs + phone)
═══════════════════════════════════════ */
const ESS_TABS = [
  { id: "web", label: "Web & Mobile app" },
  { id: "payslip", label: "Instant Payslips" },
  { id: "leave", label: "Leave Management" },
  { id: "notify", label: "Notifications" },
];
const ESS_CONTENT = {
  web: { t: "Make payroll data accessible anywhere", d: "Let employees download payslips, tax worksheets, and Form 16s at their convenience, using their web app and mobile — instantly and securely." },
  payslip: { t: "Instant payslip access for every employee", d: "Payslips are auto-generated and published the moment your pay run is approved. Employees can view, download, or share their payslip in one tap." },
  leave: { t: "Apply for leave right from the app", d: "Employees can view their leave balance, apply for any leave type, and track approval status — all without sending a single email." },
  notify: { t: "Notify employees as soon as you pay", d: "BrixiGo automatically sends salary credit notifications and payslip alerts the moment they're released — zero manual communication needed." },
};

function ESSSection() {
  const [tab, setTab] = useState("web");
  const c = ESS_CONTENT[tab];
  return (
    <section style={{ padding: "80px clamp(20px,5vw,72px)", background: "var(--z-bg-grey)", borderTop: "1px solid var(--z-border)" }}>
      <div style={{ width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="z-sec-label">Employee Self-Service Portal</div>
          <h2 className="z-sec-h2">Give your team a modern payroll experience</h2>
        </div>
        <div className="zess-tabs" style={{ justifyContent: "center" }}>
          {ESS_TABS.map(t => (
            <button key={t.id} className={`zess-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 60, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260, maxWidth: 480 }}>
            <h3 className="z-sec-h3">{c.t}</h3>
            <p style={{ fontSize: 15, color: "var(--z-text-md)", lineHeight: 1.75 }}>{c.d}</p>
          </div>
          <PhoneMockup tab={tab} />
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   TESTIMONIALS — Zoho carousel style
═══════════════════════════════════════ */
const TESTIMONIALS = [
  { q: "BrixiGo reduced our payroll processing time from 3 days to under 2 hours. The TDS auto-computation alone saves our accounts team an entire week every quarter.", name: "Ananya Krishnan", role: "Head of Finance, Nexus Technologies" },
  { q: "The payslip portal is a game-changer. Employees download their payslips themselves and HR queries have dropped by 70%. Compliance filings are now completely stress-free.", name: "Rajesh Mehta", role: "HR Director, BuildCore Infra, Mumbai" },
  { q: "Onboarding 200+ employees was seamless. The attendance integration with our biometric system works flawlessly and LOP deductions are fully automated.", name: "Sunita Patel", role: "VP Operations, MedChain Pharma, Ahmedabad" },
  { q: "BrixiGo's bank integration with HDFC and ICICI simplifies salary payouts. Payroll accounting, expense reimbursements, and LOP sync happen automatically.", name: "Vikram Rao", role: "Finance Controller, GreenPulse Tech" },
];

function Testimonials() {
  const [idx, setIdx] = useState(0);
  const t = TESTIMONIALS[idx];
  return (
    <section id="testimonials" style={{ padding: "80px clamp(20px,5vw,72px)", background: "#fff", borderTop: "1px solid var(--z-border)" }}>
      <div style={{ width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="z-sec-label">Testimonials</div>
          <h2 className="z-sec-h2">Loved by both customers and critics</h2>
          {/* Rating row */}
          <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
            {[["App Store","4.8"],["Google Play","4.4"],["G2","4.3"],["Capterra","4.5"]].map(([p,r]) => (
              <div key={p} style={{ textAlign: "center" }}>
                <div style={{ color: "#F57C00", fontSize: 12, marginBottom: 2 }}>{"★".repeat(5)}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--z-text)" }}>{r} / 5</div>
                <div style={{ fontSize: 11, color: "var(--z-text-xs)", marginTop: 2 }}>{p}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div className="ztesti-card">
            <div style={{ color: "#F57C00", fontSize: 24, marginBottom: 18 }}>{"★".repeat(5)}</div>
            <p style={{ fontSize: 17, color: "var(--z-text)", lineHeight: 1.75, marginBottom: 24, fontStyle: "italic" }}>"{t.q}"</p>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--z-green-lt)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "var(--z-green)", flexShrink: 0 }}>
                {t.name.split(" ").map(w => w[0]).join("")}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--z-text)" }}>{t.name}</div>
                <div style={{ fontSize: 13, color: "var(--z-text-xs)" }}>{t.role}</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24, alignItems: "center" }}>
            <button onClick={() => setIdx(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)} style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px solid var(--z-border)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--z-text-md)", transition: "all .2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--z-orange)"; e.currentTarget.style.color = "var(--z-orange)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--z-border)"; e.currentTarget.style.color = "var(--z-text-md)"; }}
            ><I.ChevL /></button>
            {TESTIMONIALS.map((_, i) => (
              <div key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 24 : 8, height: 8, borderRadius: 99, background: i === idx ? "var(--z-orange)" : "var(--z-border)", cursor: "pointer", transition: "all .3s" }} />
            ))}
            <button onClick={() => setIdx(i => (i + 1) % TESTIMONIALS.length)} style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px solid var(--z-border)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--z-text-md)", transition: "all .2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--z-orange)"; e.currentTarget.style.color = "var(--z-orange)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--z-border)"; e.currentTarget.style.color = "var(--z-text-md)"; }}
            ><I.ChevR /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   PRICING
═══════════════════════════════════════ */
function Pricing({ onLoginClick }) {
  const plans = [
    { name: "Starter", price: "₹2,999", per: "/mo", desc: "Up to 25 employees", features: ["Salary Processing","Payslip Generation","PF & TDS Filing","Email Support","Employee Self-Service"], cta: "Start Free Trial", style: "ghost" },
    { name: "Professional", price: "₹7,499", per: "/mo", desc: "Up to 100 employees", popular: true, features: ["Everything in Starter","Attendance Integration","Form 16 Automation","Leave Management","API Access","Priority Support"], cta: "Start Free Trial", style: "primary" },
    { name: "Enterprise", price: "Custom", per: "", desc: "Unlimited employees", features: ["Multi-location Payroll","Custom Compliance","Dedicated Manager","SLA Guarantee","On-premise Option","Custom Integrations"], cta: "Contact Sales", style: "green" },
  ];
  return (
    <section id="pricing" style={{ padding: "80px clamp(20px,5vw,72px)", background: "var(--z-bg-grey)", borderTop: "1px solid var(--z-border)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div className="z-sec-label">Pricing</div>
          <h2 className="z-sec-h2">Plans that scale with you</h2>
          <p style={{ fontSize: 15, color: "var(--z-text-md)" }}>All plans include 30-day free trial · No setup fees · Cancel anytime</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24, alignItems: "start" }}>
          {plans.map((p, i) => (
            <div key={i} className={`zprice-card${p.popular ? " zprice-popular" : ""}`}>
              {p.popular && <div className="zprice-badge">Most Popular</div>}
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--z-text-xs)" }}>{p.name}</span>
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: "var(--z-text)", letterSpacing: "-.02em" }}>{p.price}</span>
                <span style={{ fontSize: 14, color: "var(--z-text-xs)" }}>{p.per}</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--z-text-xs)", marginBottom: 20 }}>{p.desc}</p>
              <button onClick={onLoginClick} className={`zb zb-${p.style}`} style={{ width: "100%", justifyContent: "center", marginBottom: 24, fontSize: 14 }}>{p.cta}</button>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--z-text-md)" }}>
                    <span style={{ color: "var(--z-green)", flexShrink: 0 }}><I.Check /></span>{f}
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

/* ═══════════════════════════════════════
   CTA SECTION
═══════════════════════════════════════ */
function CTA({ onLoginClick }) {
  return (
    <section style={{ padding: "72px clamp(20px,5vw,72px)", background: "var(--z-green)", borderTop: "1px solid rgba(255,255,255,.1)" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 900, color: "#fff", marginBottom: 16, lineHeight: 1.2 }}>Cloud payroll system for growing businesses</h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,.85)", marginBottom: 32, lineHeight: 1.7 }}>Join 2,400+ Indian businesses using BrixiGo to process accurate, compliant payroll every month — without the stress.</p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="zb" onClick={onLoginClick} style={{ background: "#fff", color: "var(--z-green)", borderRadius: 4, padding: "13px 28px", fontSize: 15, fontWeight: 700, boxShadow: "0 4px 16px rgba(0,0,0,.2)" }} onMouseEnter={e => e.currentTarget.style.background="#F5F5F5"} onMouseLeave={e => e.currentTarget.style.background="#fff"}>Start My Free Trial</button>
          <button className="zb" onClick={onLoginClick} style={{ background: "transparent", color: "#fff", border: "2px solid rgba(255,255,255,.5)", borderRadius: 4, padding: "11px 26px", fontSize: 15, fontWeight: 700 }} onMouseEnter={e => e.currentTarget.style.borderColor="#fff"} onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,.5)"}>Request Demo</button>
        </div>
        <div style={{ marginTop: 24, display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
          {[["50,000+","Hours of demos done"],["100,000+","Man-hours saved"],["50+","Industries served"]].map(([v,l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{v}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   FOOTER — Zoho dark navy style
═══════════════════════════════════════ */
function Footer() {
  const cols = [
    { h: "About BrixiGo", ls: ["Pricing","Features","Integrations","Customers","Employee Onboarding","Payroll Processing","Statutory Compliance"] },
    { h: "Resources", ls: ["Help Center","FAQs","Webinars","Academy","What's New","Blog","Training Program"] },
    { h: "Partners", ls: ["Partner Program","Find a Partner","Become a Partner"] },
    { h: "Quick Links", ls: ["What is Payroll?","HR Payroll Software","Payslip Templates","Free Payroll Software","Best Payroll Software","Mobile Apps","Data Security"] },
    { h: "Free Tools", ls: ["Income Tax Calculator","Bonus Calculator","Gratuity Calculator","NPS Calculator","HRA Exemption Calc","Payslip Generator"] },
  ];
  return (
    <footer id="footer" className="zfooter" style={{ padding: "56px 0 0" }}>
      <div style={{ width: "100%", padding: "0 clamp(20px,5vw,72px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr repeat(4,1fr)", gap: 40, marginBottom: 48 }}>
          <div>
            <img src={logo1} alt="Brixigo Technologies Pvt.Ltd." style={{ height: 48, width: "auto", objectFit: "contain", objectPosition: "left center", marginBottom: 14 }} />
            <p style={{ fontSize: 13, color: "#aaa", lineHeight: 1.7, marginBottom: 18, maxWidth: 220 }}>India's most reliable payroll automation platform. Built for compliance, designed for speed.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#aaa" }}>
              <span>📞 Toll-Free: 1800 572 1234</span>
              <span>✉️ support@brixigo.com</span>
              <span>🕐 Mon–Fri, 9AM–7PM</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {["ISO 27001","GDPR","SOC 2","PII"].map(t => (
                <span key={t} style={{ fontSize: 10, fontWeight: 700, color: "#999", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 4, padding: "3px 7px" }}>{t}</span>
              ))}
            </div>
          </div>
          {cols.map((c, i) => (
            <div key={i}>
              <div className="zfooter-head">{c.h}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {c.ls.map(l => <a key={l} href="#">{l}</a>)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", padding: "20px 0", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#666" }}>© 2025 BrixiGo Technologies Pvt. Ltd. All rights reserved.</span>
          <span style={{ fontSize: 12, color: "#666" }}>CIN: U74999TG2021PTC152341 | GSTIN: 36AABCP1234A1Z5</span>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════
   FORGOT PASSWORD MODAL
═══════════════════════════════════════ */
function ForgotPasswordModal({ onClose, onBack }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.includes("@")) return;
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      const d = err.response?.data?.detail;
      alert(typeof d === "string" ? d : "Failed to send reset link");
    } finally { setLoading(false); }
  };

  return (
    <div className="zm-bg" onClick={onClose}>
      <div className="zm-card" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, width: 28, height: 28, background: "#f5f5f5", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#777" }}><I.Close /></button>
        {!sent ? (
          <>
            <img src={logo1} alt="BrixiGo" style={{ height: 38, marginBottom: 20, objectFit: "contain" }} />
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--z-text)", marginBottom: 8 }}>Reset Password</h2>
            <p style={{ fontSize: 14, color: "var(--z-text-md)", marginBottom: 24, lineHeight: 1.6 }}>Enter your work email to receive reset instructions.</p>
            <label className="zf-label">Email Address</label>
            <div className="zf-wrap" style={{ marginBottom: 20 }}>
              <span className="zf-icon"><I.Mail s={15} /></span>
              <input className="zf-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <button className="zb zb-primary" onClick={handleSend} disabled={loading || !email.includes("@")} style={{ width: "100%", justifyContent: "center", opacity: loading ? .7 : 1, fontSize: 14 }}>
              {loading ? <><span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "zSpin .7s linear infinite", display: "inline-block" }} /> Sending…</> : "Send Reset Link"}
            </button>
            <button onClick={onBack} style={{ width: "100%", marginTop: 12, background: "none", border: "none", color: "var(--z-orange)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)" }}>← Back to Sign In</button>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E8F5EE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: "var(--z-green)" }}><I.Send s={24} /></div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--z-text)", marginBottom: 8 }}>Check your inbox</h2>
            <p style={{ fontSize: 14, color: "var(--z-text-md)", marginBottom: 24, lineHeight: 1.6 }}>Reset link sent to <strong>{email}</strong>. Expires in 30 min.</p>
            <button className="zb zb-primary" onClick={onBack} style={{ width: "100%", justifyContent: "center", fontSize: 14 }}>Back to Sign In</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   LOGIN MODAL
═══════════════════════════════════════ */
function LoginModal({ onClose }) {
  const [view, setView]         = useState("login");
  const [role, setRole]         = useState("admin");
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [fieldErr, setFieldErr] = useState({ id: "", pw: "" });
  const [authErr, setAuthErr]   = useState("");

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const idRef = useRef(null);

  useEffect(() => { const t = setTimeout(() => idRef.current?.focus(), 60); return () => clearTimeout(t); }, [role]);

  const switchRole = r => {
    if (loading) return;
    setRole(r); setUsername(""); setEmail(""); setPassword(""); setShowPw(false);
    setFieldErr({ id: "", pw: "" }); setAuthErr("");
  };
  const isAdmin = role === "admin";

  const validate = () => {
    const e = { id: "", pw: "" }; let ok = true;
    if (isAdmin) {
      const u = username.trim();
      if (!u) { e.id = "Username is required."; ok = false; }
      else if (u.length < 3) { e.id = "Min 3 characters."; ok = false; }
    } else {
      const em = email.trim();
      if (!em) { e.id = "Email is required."; ok = false; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { e.id = "Enter a valid email."; ok = false; }
    }
    if (!password) { e.pw = "Password is required."; ok = false; }
    else if (password.length < 6) { e.pw = "Min 6 characters."; ok = false; }
    setFieldErr(e); return ok;
  };

  const submit = async () => {
    if (loading) return;
    setAuthErr("");
    if (!validate()) return;
    setLoading(true);
    try {
      await login({ mode: isAdmin ? "admin" : "employee", identifier: isAdmin ? username.trim() : email.trim(), password });
      navigate("/dashboard"); onClose();
    } catch (err) {
      const raw = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "";
      const lo = raw.toLowerCase();
      if (lo.includes("not found") || lo.includes("no user")) setFieldErr(p => ({ ...p, id: isAdmin ? "No account found for this username." : "No account found for this email." }));
      else if (lo.includes("password") || lo.includes("incorrect") || lo.includes("invalid")) setFieldErr(p => ({ ...p, pw: "Incorrect password. Try again." }));
      else setAuthErr("Sign in failed. Check credentials and try again.");
    } finally { setLoading(false); }
  };

  if (view === "register") return <RegisterModal onClose={onClose} onSwitchToLogin={() => setView("login")} />;
  if (view === "forgot")   return <ForgotPasswordModal onClose={onClose} onBack={() => setView("login")} />;

  return (
    <div className="zm-bg" onClick={onClose}>
      <div className="zm-card" onClick={e => e.stopPropagation()} role="dialog" aria-modal>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, width: 28, height: 28, background: "#f5f5f5", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#777", transition: "all .2s" }}
          onMouseEnter={e => e.currentTarget.style.background="#eee"}
          onMouseLeave={e => e.currentTarget.style.background="#f5f5f5"}
        ><I.Close /></button>

        <img src={logo1} alt="BrixiGo" style={{ height: 38, objectFit: "contain", marginBottom: 18 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--z-text)", marginBottom: 6 }}>Welcome back</h2>
        <p style={{ fontSize: 13.5, color: "var(--z-text-md)", marginBottom: 20 }}>Sign in to your {isAdmin ? "Admin (HR)" : "Employee"} account</p>

        <div className="zrole-wrap">
          <button className={`zrole-tab${isAdmin ? " active" : ""}`} onClick={() => switchRole("admin")} disabled={loading}>
            <I.Shield s={13} /> Admin · HR Login
          </button>
          <button className={`zrole-tab${!isAdmin ? " active" : ""}`} onClick={() => switchRole("employee")} disabled={loading}>
            <I.User s={13} /> Employee Login
          </button>
        </div>

        {!isAdmin && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 4, padding: "10px 12px", marginBottom: 16, fontSize: 12.5, color: "#795548", fontWeight: 500, lineHeight: 1.55 }}>
            <I.Info s={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Use the <strong>email address</strong> assigned by your HR team. Employee accounts are created by Admin only.</span>
          </div>
        )}

        {authErr && (
          <div role="alert" style={{ display: "flex", gap: 8, background: "#FFEBEE", border: "1px solid #FFCDD2", color: "#C62828", borderRadius: 4, padding: "10px 12px", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            <I.Alert /> {authErr}
          </div>
        )}

        {/* ID field */}
        <div style={{ marginBottom: 14 }}>
          <label className="zf-label">{isAdmin ? "Username" : "Work Email"}</label>
          <div className="zf-wrap">
            <span className="zf-icon">{isAdmin ? <I.User s={15} /> : <I.Mail s={15} />}</span>
            <input ref={idRef} className={`zf-input${fieldErr.id ? " err" : ""}`} type={isAdmin ? "text" : "email"} placeholder={isAdmin ? "Enter your username" : "you@company.com"} value={isAdmin ? username : email}
              onChange={e => { isAdmin ? setUsername(e.target.value) : setEmail(e.target.value); setFieldErr(p => ({ ...p, id: "" })); setAuthErr(""); }}
              onKeyDown={e => e.key === "Enter" && submit()}
            />
          </div>
          {fieldErr.id && <div className="zf-err-msg"><I.Alert s={12} />{fieldErr.id}</div>}
        </div>

        {/* Password */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <label className="zf-label" style={{ marginBottom: 0 }}>Password</label>
            <button type="button" onClick={() => setView("forgot")} style={{ background: "none", border: "none", fontSize: 12, color: "var(--z-orange)", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)" }}>Forgot password?</button>
          </div>
          <div className="zf-wrap">
            <span className="zf-icon"><I.Lock s={15} /></span>
            <input className={`zf-input${fieldErr.pw ? " err" : ""}`} style={{ paddingRight: 40 }} type={showPw ? "text" : "password"} placeholder="Enter your password" value={password}
              onChange={e => { setPassword(e.target.value); setFieldErr(p => ({ ...p, pw: "" })); setAuthErr(""); }}
              onKeyDown={e => e.key === "Enter" && submit()}
            />
            <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa", display: "flex", alignItems: "center", padding: 3 }}>{showPw ? <I.EyeOff /> : <I.Eye />}</button>
          </div>
          {fieldErr.pw && <div className="zf-err-msg"><I.Alert s={12} />{fieldErr.pw}</div>}
        </div>

        {/* Remember */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 18px", cursor: "pointer", userSelect: "none" }} onClick={() => setRemember(v => !v)}>
          <div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, background: remember ? "var(--z-green)" : "transparent", border: remember ? "none" : "1.5px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}>
            {remember && <I.Check s={10} />}
          </div>
          <span style={{ fontSize: 13, color: "var(--z-text-md)" }}>Keep me signed in</span>
        </div>

        {/* Submit */}
        <button type="button" onClick={submit} disabled={loading} className={`zb zb-${isAdmin ? "primary" : "green"}`} style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "13px", opacity: loading ? .75 : 1, cursor: loading ? "not-allowed" : "pointer", marginBottom: isAdmin ? 14 : 0 }}>
          {loading ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "zSpin .65s linear infinite", display: "inline-block" }} /> Signing in…</> : <>Sign In as {isAdmin ? "Admin" : "Employee"} <I.Arrow /></>}
        </button>

        {isAdmin && (
          <>
            <div className="zf-divider">New to BrixiGo?</div>
            <button type="button" className="zb zb-ghost" onClick={() => setView("register")} disabled={loading} style={{ width: "100%", justifyContent: "center", fontSize: 14 }}>Create Admin Account</button>
          </>
        )}

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#aaa", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <I.Shield s={11} /> 256-bit TLS encrypted
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   ROOT APP
═══════════════════════════════════════ */
export default function BrixiGoZohoApp() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleLoginClick = () => navigate("/login");

  useEffect(() => {
    const id = "brixigo-zoho-css";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id; s.textContent = GLOBAL_CSS;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    document.body.style.overflow = showLogin ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showLogin]);

  const openLogin  = useCallback(() => setShowLogin(true), []);
  const closeLogin = useCallback(() => setShowLogin(false), []);

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar onLoginClick={openLogin} />
      <main>
        <Hero onLoginClick={openLogin} />
        <LogoStrip />
        <Features />
        <LeaveSection />
        <Compliance />
        <ESSSection />
        <Testimonials />
        <Pricing onLoginClick={openLogin} />
        <CTA onLoginClick={openLogin} />
      </main>
      <Footer />

      {showLogin && <LoginModal onClose={closeLogin} />}
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onSwitchToReset={() => { setShowResetPassword(true); setShowRegister(false); }} />}
      {showResetPassword && <ResetPassword onClose={() => setShowResetPassword(false)} />}
    </div>
  );
}