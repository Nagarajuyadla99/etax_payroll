import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Mail,
  MessageSquare,
  Linkedin,
  Twitter,
  Search,
  Menu,
  User,
  LogOut,
  ShieldCheck
} from "lucide-react";

export default function Navbar({ toggle }) {
  const nav = useNavigate();

  const [openProfile, setOpenProfile] = useState(false);
  const [openNotify, setOpenNotify] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const profileRef = useRef();
  const notifyRef = useRef();

  const logout = () => {
    localStorage.removeItem("token");
    nav("/");
  };

  // close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setOpenProfile(false);
      }
      if (notifyRef.current && !notifyRef.current.contains(e.target)) {
        setOpenNotify(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="w-full sticky top-0 z-50
                    backdrop-blur-md bg-white/70 
                    border-b border-white/40 shadow-sm">

      <div className="flex items-center justify-between px-4 md:px-8 py-3">

        {/* LEFT SECTION */}
        <div className="flex items-center gap-4">

          {/* Mobile Sidebar Button */}
          <button
            onClick={toggle}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>

          {/* Desktop Search */}
          <div className="hidden md:flex items-center bg-gray-100 
                          rounded-xl px-3 py-2 w-80">
            <Search size={16} className="text-gray-500 mr-2" />
            <input
              type="text"
              placeholder="Search employees, payroll..."
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>

        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-3 md:gap-5">

          {/* Mobile Search Icon */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Search size={18} />
          </button>

          {/* Social Icons (Desktop Only) */}
          <div className="hidden md:flex items-center gap-4">

            <IconBox color="indigo">
              <MessageSquare size={18} />
            </IconBox>

            <IconBox color="sky">
              <Mail size={18} />
            </IconBox>

            <IconBox color="blue">
              <Linkedin size={18} />
            </IconBox>

            <IconBox color="black">
              <Twitter size={18} />
            </IconBox>

          </div>


          

          {/* Notifications */}
          <div className="relative" ref={notifyRef}>
            <div
              onClick={() => setOpenNotify(!openNotify)}
              className="relative p-2 rounded-xl 
                         bg-amber-50 text-amber-600
                         hover:bg-amber-100 cursor-pointer"
            >
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 
                               bg-red-500 text-white text-[10px]
                               px-1.5 py-0.5 rounded-full">
               3
              </span>
            </div>

            {/* Animated Dropdown */}
            {openNotify && (
              <div className="absolute right-0 mt-3 w-72 
                              bg-white rounded-2xl shadow-xl 
                              border border-gray-100
                              animate-fadeIn p-4 space-y-3">

                <h4 className="font-semibold text-sm">Notifications</h4>

                <div className="text-sm p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer">
                  Payroll processed successfully
                </div>

                <div className="text-sm p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer">
                  2 new leave requests
                </div>

                <div className="text-sm p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer">
                  Tax update available
                </div>

              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <div
              onClick={() => setOpenProfile(!openProfile)}
              className="flex items-center gap-2 cursor-pointer 
                         px-3 py-2 rounded-xl hover:bg-gray-100"
            >
              <div className="w-8 h-8 rounded-full 
                              bg-indigo-600 text-white 
                              flex items-center justify-center text-sm">
                A
              </div>
              <span className="hidden md:block text-sm font-medium">
                Admin
              </span>
            </div>

            {openProfile && (
              <div className="absolute right-0 mt-3 w-48 
                              bg-white rounded-2xl shadow-xl 
                              border border-gray-100 
                              animate-fadeIn p-2">

                <DropdownItem icon={<User size={16} />} label="Profile" />
                <DropdownItem icon={<ShieldCheck size={16} />} label="Security" />
                <DropdownItem
                  icon={<LogOut size={16} />}
                  label="Logout"
                  onClick={logout}
                  danger
                />
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Expandable Search */}
      {showSearch && (
        <div className="md:hidden px-4 pb-3">
          <div className="flex items-center bg-gray-100 rounded-xl px-3 py-2">
            <Search size={16} className="text-gray-500 mr-2" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Reusable Components ---------- */

function IconBox({ children, color }) {
  return (
    <div className={`p-2 rounded-xl hover:scale-105 transition
      ${color === "indigo" && "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"}
      ${color === "sky" && "bg-sky-50 text-sky-600 hover:bg-sky-100"}
      ${color === "blue" && "bg-blue-50 text-blue-700 hover:bg-blue-100"}
      ${color === "black" && "bg-gray-100 text-black hover:bg-gray-200"}
    `}>
      {children}
    </div>
  );
}

function DropdownItem({ icon, label, onClick, danger }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg 
      text-sm cursor-pointer transition
      ${danger
        ? "text-red-600 hover:bg-red-50"
        : "hover:bg-gray-100"}`}
    >
      {icon}
      {label}
    </div>
  );
}
