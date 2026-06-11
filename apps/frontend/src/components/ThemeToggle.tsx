import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const root = document.documentElement;
        if (root.classList.contains("dark")) {
            setIsDark(true);
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setIsDark(true);
            root.classList.add("dark");
        }
    }, []);

    const toggleDark = () => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.remove("dark");
            setIsDark(false);
        } else {
            root.classList.add("dark");
            setIsDark(true);
        }
    };

    return (
        <div className="absolute top-4 right-4 z-50">
            <Button variant="outline" size="sm" onClick={toggleDark}>
                {isDark ? "Light Mode" : "Dark Mode"}
            </Button>
        </div>
    );
}