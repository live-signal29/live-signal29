import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-9 w-16 items-center rounded-full bg-muted hover:bg-muted/80 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      aria-label="Toggle theme"
    >
      <span
        className={`inline-block h-7 w-7 transform rounded-full bg-background shadow-lg transition-transform duration-300 ease-in-out ${
          theme === "dark" ? "translate-x-8" : "translate-x-1"
        }`}
      >
        <span className="flex h-full w-full items-center justify-center">
          {theme === "dark" ? (
            <Moon className="h-4 w-4 text-primary" />
          ) : (
            <Sun className="h-4 w-4 text-amber-500" />
          )}
        </span>
      </span>
    </button>
  );
};
