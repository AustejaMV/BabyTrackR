import React from "react";
import { Home, Baby, Utensils, Droplet, Clock, BarChart3 } from "lucide-react";
import { Link, useLocation } from "react-router";
import { VoiceControl } from "./VoiceControl";
import { APP_VERSION } from "../version";

export function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/tracking", icon: BarChart3, label: "Tracking" },
    { path: "/sleep", icon: Baby, label: "Sleep" },
    { path: "/feeding", icon: Utensils, label: "Feed" },
    { path: "/diapers", icon: Droplet, label: "Diaper" },
    { path: "/tummy-time", icon: Clock, label: "Tummy" },
  ];

  return (
    <>
      <VoiceControl />
      <span className="fixed bottom-[4.25rem] right-2 text-[9px] text-gray-400 dark:text-gray-500 select-none z-40">
        v{APP_VERSION}
      </span>
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
        <div className="max-w-lg mx-auto flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full ${
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}