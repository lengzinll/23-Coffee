"use client";

import { useEffect, useRef } from "react";

export function MouseGlow() {
    const glowRef = useRef<HTMLDivElement>(null);
    const posRef = useRef({ x: -9999, y: -9999 });
    const animRef = useRef<number>(0);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            posRef.current = { x: e.clientX, y: e.clientY };
        };

        const animate = () => {
            if (glowRef.current) {
                glowRef.current.style.transform = `translate(${posRef.current.x - 300}px, ${posRef.current.y - 300}px)`;
            }
            animRef.current = requestAnimationFrame(animate);
        };

        window.addEventListener("mousemove", handleMouseMove);
        animRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            cancelAnimationFrame(animRef.current);
        };
    }, []);

    return (
        <div
            ref={glowRef}
            aria-hidden
            className="pointer-events-none fixed top-0 left-0 z-0 w-[600px] h-[600px] will-change-transform"
            style={{
                background: "radial-gradient(circle, rgba(250, 38, 38, 0.07) 0%, rgba(255, 49, 49, 0.03) 20%, transparent 70%)",
                transform: "translate(-9999px, -9999px)",
            }}
        />
    );
}
