'use client';

import { Icon } from "@iconify/react";
import { useRef, useState, useEffect, ReactNode, CSSProperties, forwardRef } from "react";
import { createPortal } from "react-dom";

interface TooltipIconButtonProps {
  icon?: string;
  label: string | ReactNode;
  onClick?: (e: any) => void;
  mode?: "light" | "dark";
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
  position?: "top" | "bottom";
  style?: CSSProperties;
  tooltipMaxWidth?: number;
}

const TooltipIconButton = forwardRef<HTMLDivElement, TooltipIconButtonProps>((
  {
    icon,
    label,
    onClick,
    mode = "light",
    className = "",
    children,
    disabled = false,
    position = "bottom",
    style = {},
    tooltipMaxWidth = 320,
  },
  ref
) => {
  const btnRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (show && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({
        top: position === "top" ? rect.top + window.scrollY : rect.bottom + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX,
        width: rect.width,
      });
    }
  }, [show, position]);

  // Hide tooltip on scroll
  useEffect(() => {
    if (!show) return undefined;
    const hide = () => setShow(false);
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [show]);

  return (
    <>
      <div
        ref={(node) => {
          (btnRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        onClick={disabled ? undefined : onClick}
        className={`relative group z-2 p-2 rounded-full focus:outline-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          } ${className}`}
        style={style}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            onClick?.(e);
          }
        }}
        onMouseEnter={() => !disabled && setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => !disabled && setShow(true)}
        onBlur={() => setShow(false)}
        aria-label={typeof label === 'string' ? label : undefined}
        aria-disabled={disabled}
      >
        {children || (icon && <Icon icon={icon} className="h-5 w-5 text-current" />)}
      </div>
      {typeof window !== "undefined" && createPortal(
        <div
          style={{
            position: "absolute",
            top: position === "top" ? coords.top - 8 : coords.top + 8,
            left: coords.left,
            transform: position === "top" ? "translate(-50%, -100%)" : "translateX(-50%)",
            zIndex: 999999,
            pointerEvents: "none",
            opacity: show ? 1 : 0,
            transition: show ? "opacity 0.4s ease 0.2s" : "opacity 0.4s ease",
          }}
        >
          <div
            className={`
              text-sm py-2 px-3 rounded-lg shadow-lg
              text-center
              ${mode === "dark" ? "text-gray-200 bg-gray-900 border border-gray-700" : "text-gray-900 bg-white border border-gray-200"}
            `}
            style={{
              whiteSpace: "pre-line",
              maxWidth: `${tooltipMaxWidth}px`,
              minWidth: "120px",
              wordWrap: "break-word",
            }}
          >
            {label}
          </div>
        </div>,
        document.body
      )}
    </>
  );
});

TooltipIconButton.displayName = 'TooltipIconButton';
export default TooltipIconButton;
