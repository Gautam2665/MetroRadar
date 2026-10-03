"use client";

import { useRef, useState, useEffect } from "react";

interface ScrollingTextProps {
  text: string;
  className?: string;
  speed?: number; // pixels per second (default 24)
}

/**
 * ScrollingText component that smoothly auto-scrolls text back and forth (ping-pong)
 * if the text is longer than its container, matching transit vehicle displays.
 */
export function ScrollingText({
  text,
  className = "",
  speed = 24,
}: ScrollingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    const txt = textRef.current;
    if (!el || !txt) return;

    const measure = () => {
      // Small margin of 3px before triggering scroll
      const diff = txt.scrollWidth - el.clientWidth;
      setOverflow(diff > 3 ? diff : 0);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  // Duration scales with overflow distance, min 3.2s
  const duration = overflow > 0 ? Math.max(3.2, overflow / speed + 1.8) : 0;

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden relative whitespace-nowrap select-none ${className}`}
      title={text}
    >
      <span
        ref={textRef}
        className={`inline-block ${overflow > 0 ? "animate-scroll-text" : ""}`}
        style={
          overflow > 0
            ? ({
                "--scroll-amount": `-${overflow + 6}px`,
                "--scroll-duration": `${duration}s`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {text}
      </span>
    </div>
  );
}
