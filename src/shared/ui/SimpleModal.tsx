'use client';

import { Icon } from "@iconify/react";
import { useState, useEffect, ReactNode, Ref, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/shared/contexts/ThemeContext";
import GlassPanel from "@/shared/ui/GlassPanel";

export interface SimpleModalHandle {
  handleClose: (e?: React.MouseEvent) => void;
}

interface SimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  mode?: 'light' | 'dark' | 'system';
  width?: string;
  rightElement?: ReactNode;
  hasUnsavedChanges?: boolean;
  disableOutsideClick?: boolean;
  animationDuration?: number;
  noPadding?: boolean;
  variant?: 'primary' | 'danger' | 'warning' | 'info';
  ref?: Ref<SimpleModalHandle>;
}

function SimpleModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  mode: propMode,
  width = "max-w-2xl",
  rightElement,
  hasUnsavedChanges = false,
  disableOutsideClick = false,
  noPadding = false,
  variant = 'primary',
  ref,
}: SimpleModalProps) {
  const { resolvedMode } = useTheme();
  const mode = propMode === 'system' || !propMode ? resolvedMode : propMode;
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const getVariantStyles = () =>
    mode === "dark" ? "bg-gcg-orange" : "bg-gcg-orange bg-gradient-to-r from-gcg-orange to-gcg-orange-dark";

  const getVariantAccent = () => {
    switch (variant) {
      case 'danger': return 'bg-rose-500';
      case 'warning': return 'bg-amber-500';
      case 'info': return 'bg-sky-500';
      default: return 'bg-white';
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`;
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (disableOutsideClick) return;
        if (hasUnsavedChanges) setShowConfirmDialog(true);
        else onClose();
      }
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, hasUnsavedChanges, onClose, disableOutsideClick]);

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (target.tagName === 'FORM' || target.closest('form')) return;
    }
    if (hasUnsavedChanges) setShowConfirmDialog(true);
    else onClose();
  };

  useImperativeHandle(ref, () => ({ handleClose }));

  const handleOutsideClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disableOutsideClick) {
      if (hasUnsavedChanges) setShowConfirmDialog(true);
      else onClose();
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Glass distortion backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0"
            style={{
              filter: "url(#glass-distortion)",
              backdropFilter: "blur(12px) saturate(180%)",
            }}
            onClick={handleOutsideClick}
          />

          {/* Subtle dark tint layer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/25"
            onClick={handleOutsideClick}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className={`relative w-full ${width} max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            <GlassPanel
              mode={mode}
              className={`rounded-3xl overflow-hidden ${mode === "dark" ? "bg-gray-900/50" : "bg-white/70"}`}
            >
              {/* Header */}
              <div
                className={`relative px-10 py-2 overflow-hidden ${getVariantStyles()}`}
              >
                <div className="absolute inset-0 opacity-30 pointer-events-none">
                  <div
                    className={`absolute top-0 left-0 w-48 h-48 rounded-full blur-3xl transform -translate-x-16 -translate-y-16 ${getVariantAccent()}`}
                  />
                  <div
                    className={`absolute bottom-0 right-0 w-32 h-32 rounded-full blur-2xl transform translate-x-12 translate-y-12 ${getVariantAccent()}`}
                  />
                </div>
                <div className="relative z-10 flex justify-between items-center">
                  {title && (
                    <div>
                      <h2 className="text-2xl font-bold text-white tracking-tight mb-0.5">
                        {title}
                      </h2>
                      <div className="h-1 w-12 bg-white/30 rounded-full" />
                      {subtitle && (
                        <p className="text-white/70 text-sm mt-2 leading-relaxed">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  )}
                  <div
                    className={`flex items-center gap-4 ${!title ? "ml-auto" : ""}`}
                  >
                    {rightElement}
                    <button
                      onClick={handleClose}
                      className="group p-2 bg-white/10 hover:bg-white/20 rounded-2xl transition-all duration-500 transform hover:scale-110 active:scale-90 border border-white/10 hover:border-white/20 shadow-lg"
                    >
                      <Icon
                        icon="solar:close-circle-broken"
                        className="w-6 h-6 text-white transition-transform duration-500 group-hover:rotate-90"
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div
                className={`overflow-y-auto max-h-[calc(90vh-100px)] ${mode === "dark" ? "text-white" : "text-gray-900"}`}
              >
                <div className={noPadding ? "" : "p-6"}>{children}</div>
              </div>
            </GlassPanel>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const confirmationDialog = (
    <AnimatePresence>
      {showConfirmDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0"
            style={{ filter: 'url(#glass-distortion)', backdropFilter: 'blur(12px) saturate(180%)' }}
            onClick={() => setShowConfirmDialog(false)}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/25"
            onClick={() => setShowConfirmDialog(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-sm"
          >
            <GlassPanel mode={mode} className={`rounded-3xl overflow-hidden ${mode === 'dark' ? 'bg-gray-900/50' : 'bg-white/50'}`}>
              <div className="h-1 w-full bg-gradient-to-r from-gcg-orange to-gcg-brown" />
              <div className="p-8 flex flex-col items-center text-center">
                <div className="mb-5 w-16 h-16 rounded-2xl bg-gcg-brown/10 border border-gcg-brown/30 flex items-center justify-center">
                  <Icon icon="solar:danger-triangle-bold-duotone" className="w-8 h-8 text-gcg-brown" />
                </div>
                <h3 className={`text-lg font-semibold mb-1.5 ${mode === 'dark' ? 'text-white' : 'text-gray-900'}`}>Unsaved changes</h3>
                <p className={`text-sm leading-relaxed mb-7 ${mode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Exiting now will discard all edits made in this session.
                </p>
                <div className="w-full flex gap-3">
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    className={`flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl active:scale-[0.98] font-semibold text-sm transition-all backdrop-blur-md border ring-1 ring-inset ring-white/20 ${mode === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300' : 'bg-white/40 hover:bg-white/60 border-white/40 text-gray-700'}`}
                  >
                    Keep editing
                  </button>
                  <button
                    onClick={() => { setShowConfirmDialog(false); onClose(); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gcg-orange hover:bg-gcg-orange-dark active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-lg shadow-gcg-orange/20"
                  >
                    <Icon icon="solar:door-open-broken" className="w-4 h-4" />
                    Discard & exit
                  </button>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(
    <>
      {modalContent}
      {confirmationDialog}
    </>,
    document.body
  );
}

export default SimpleModal;
