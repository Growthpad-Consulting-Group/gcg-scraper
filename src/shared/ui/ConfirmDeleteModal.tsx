'use client';

import { useState, useEffect, FC } from 'react';
import SimpleModal from '@/shared/ui/SimpleModal';
import { Icon } from '@iconify/react';
import FormActions from './FormActions';
import ModalLeftPanel from './ModalLeftPanel';
import { motion } from 'framer-motion';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (hasDependencies: boolean) => void;
    itemName: string;
    mode: 'light' | 'dark';
    productCount?: number;
    itemType?: string;
    isDeleting?: boolean;
    itemId?: string;
    /** Optional async dependency check (e.g. "does this item have linked records?"). */
    checkDependencies?: (itemId: string) => Promise<{ hasDependencies: boolean; dependencyCount?: number }>;
}

const ConfirmDeleteModal: FC<ConfirmDeleteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    itemName,
    mode,
    productCount: initialProductCount = 0,
    itemType = "item",
    isDeleting = false,
    itemId,
    checkDependencies,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [productCount, setProductCount] = useState(initialProductCount);
    const [hasDependencies, setHasDependencies] = useState(false);

    useEffect(() => {
        if (isOpen && itemId && checkDependencies) {
            runDependencyCheck();
        } else {
            setProductCount(0);
            setHasDependencies(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, itemId]);

    const runDependencyCheck = async () => {
        if (!itemId || !checkDependencies) return;

        setIsLoading(true);
        try {
            const result = await checkDependencies(itemId);
            setHasDependencies(result.hasDependencies);
            setProductCount(result.dependencyCount || 0);
        } catch (error) {
            console.error('Error checking dependencies:', error);
            setHasDependencies(false);
            setProductCount(0);
        } finally {
            setIsLoading(false);
        }
    };

    const isArchiving = itemType === 'product';
    const variant = isArchiving ? 'warning' : 'danger';

    return (
      <SimpleModal
        isOpen={isOpen}
        onClose={onClose}
        title={isArchiving ? "Archive Item" : "Delete Item"}
        mode={mode}
        width="max-w-5xl"
        variant={variant}
        noPadding={true}
        disableOutsideClick={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-5 min-h-[500px]">
          {/* LEFT PANEL - Inlined */}
          <ModalLeftPanel
            title={isArchiving ? "Archive" : "Delete"}
            subtitle={
              isArchiving
                ? "Move to archived storage"
                : "Remove this item permanently"
            }
            icon={
              isArchiving
                ? "solar:archive-minimalistic-bold"
                : "solar:trash-bin-trash-bold"
            }
            iconBg="gcg-brown"
          >
            {/* Status Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-auto"
            >
              <div className="py-3 px-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-bold opacity-60">
                  Status: Restricted
                </span>
              </div>
            </motion.div>
          </ModalLeftPanel>

          {/* RIGHT PANEL */}
          <div
            className={`col-span-1 md:col-span-3 p-10 flex flex-col justify-center ${
              mode === "dark" ? "bg-gray-900" : "bg-white"
            }`}
          >
            <div className="space-y-8">
              {/* HEADER */}
              <div className="space-y-2">
                <h3
                  className={`text-3xl font-bold ${mode === "dark" ? "text-white" : "text-gray-900"}`}
                >
                  {isArchiving ? "Archive Item?" : `Delete ${itemType}?`}
                </h3>
                <div
                  className={`p-4 rounded-2xl inline-block max-w-full border ${
                    mode === "dark"
                      ? "bg-white/5 border-white/10"
                      : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <span
                    className={`text-lg font-bold truncate block max-w-[400px] ${mode === "dark" ? "text-white" : "text-gray-900"}`}
                  >
                    "{itemName}"
                  </span>
                </div>
              </div>

              {/* WARNING CARD */}
              <div
                className={`w-full p-6 rounded-3xl border ${
                  isArchiving
                    ? mode === "dark"
                      ? "bg-amber-900/10 border-amber-500/20"
                      : "bg-amber-50 border-amber-100 shadow-sm"
                    : mode === "dark"
                      ? "bg-rose-900/10 border-rose-500/20"
                      : "bg-rose-50 border-rose-100 shadow-sm"
                }`}
              >
                <div className="flex gap-5">
                  <div
                    className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${
                      isArchiving
                        ? "bg-amber-500/20 text-amber-600"
                        : "bg-rose-500/20 text-rose-600"
                    }`}
                  >
                    <Icon
                      icon={
                        isArchiving
                          ? "solar:info-circle-broken"
                          : "solar:info-circle-broken"
                      }
                      className="w-5 h-5"
                    />
                  </div>
                  <div className="space-y-5 flex-1">
                    <div>
                      <h4
                        className={`text-sm font-bold capitalize mb-1 ${isArchiving ? "text-amber-700 dark:text-amber-400" : "text-rose-700 dark:text-rose-400"}`}
                      >
                        {isArchiving ? "Archive Details" : "Delete Warning"}
                      </h4>
                      <p
                        className={`text-sm leading-relaxed font-medium ${isArchiving ? "text-amber-800/80 dark:text-amber-300/60" : "text-rose-800/80 dark:text-rose-300/60"}`}
                      >
                        {isArchiving
                          ? "This item will be archived but can be restored anytime."
                          : "This item will be permanently deleted and cannot be recovered."}
                      </p>
                    </div>

                    {/* DEPENDENCIES MINI-LIST */}
                    {productCount > 0 && !isArchiving && (
                      <div
                        className={`p-5 rounded-[2rem] border ${mode === "dark" ? "bg-black/20 border-white/5" : "bg-white border-gray-100 shadow-sm"}`}
                      >
                        <div className="flex items-center gap-4 mb-3">
                          <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center text-xs font-bold shadow-lg shadow-rose-500/20">
                            {productCount}
                          </div>
                          <p className="text-xs font-bold text-gray-400">
                            Active{" "}
                            {itemType === "product" ? "Variations" : "Products"}{" "}
                            Impacted
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 font-semibold leading-relaxed pl-12 italic">
                          These related items will also be affected.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="pt-2">
                <FormActions
                  onCancel={onClose}
                  onSave={() => onConfirm(hasDependencies)}
                  loading={isDeleting || isLoading}
                  mode={mode}
                  variant={isArchiving ? "primary" : "danger"}
                  saveText={
                    isLoading
                      ? "Processing..."
                      : isDeleting
                        ? isArchiving
                          ? "Archiving..."
                          : "Deleting..."
                        : productCount > 0 && !isArchiving
                          ? `Delete Anyway (${productCount} linked)`
                          : isArchiving
                            ? "Archive Item"
                            : "Delete Item"
                  }
                  saveIcon={
                    isLoading
                      ? "svg-spinners:ring-resize"
                      : isArchiving
                        ? "solar:archive-bold"
                        : "solar:trash-bin-minimalistic-bold"
                  }
                  size="default"
                  layout="reverse"
                  fullWidth={true}
                  cancelText="Keep Item"
                />
              </div>
            </div>
          </div>
        </div>
      </SimpleModal>
    );
};

export default ConfirmDeleteModal;
