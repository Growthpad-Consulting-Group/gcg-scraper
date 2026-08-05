'use client';

import React from "react";
import { Icon } from "@iconify/react";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Step {
    title: string;
    description: string;
    color?: 'blue' | 'green' | 'purple' | 'amber' | 'rose';
}

interface EmptyStateProps {
    icon?: string;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        icon?: string;
        loading?: boolean;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
        icon?: string;
    };
    steps?: Step[];
    variant?: 'default' | 'premium' | 'success' | 'warning';
    className?: string;
}

const GenericEmptyState: React.FC<EmptyStateProps> = ({
    icon = "solar:box-minimalistic-broken",
    title,
    description,
    action,
    secondaryAction,
    steps,
    variant = 'default',
    className = ""
}) => {
    const { resolvedMode: mode } = useTheme();

    const getVariantStyles = () => {
        switch (variant) {
            case 'success':
                return {
                    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
                    iconColor: "text-emerald-500 dark:text-emerald-400",
                    titleColor: "text-gray-900 dark:text-white"
                };
            case 'warning':
                return {
                    iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
                    iconColor: "text-amber-500 dark:text-amber-400",
                    titleColor: "text-gray-900 dark:text-white"
                };
            case 'premium':
                return {
                    iconBg: "bg-gcg-orange/10 dark:bg-blue-500/10",
                    iconColor: "text-gcg-orange dark:text-blue-400",
                    titleColor: "text-gray-900 dark:text-white"
                };
            default:
                return {
                    iconBg: "bg-gray-100 dark:bg-gray-800",
                    iconColor: "text-gray-400 dark:text-gray-500",
                    titleColor: "text-gray-900 dark:text-white"
                };
        }
    };

    const styles = getVariantStyles();

    const getStepColor = (color?: string) => {
        switch (color) {
            case 'green': return 'bg-emerald-500 text-white';
            case 'purple': return 'bg-purple-500 text-white';
            case 'amber': return 'bg-amber-500 text-white';
            case 'rose': return 'bg-rose-500 text-white';
            default: return 'bg-blue-600 text-white';
        }
    };

    const getStepBg = (color?: string) => {
        switch (color) {
            case 'green': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-300';
            case 'purple': return 'bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-300';
            case 'amber': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-300';
            case 'rose': return 'bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-300';
            default: return 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300';
        }
    };

    return (
        <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
            {/* Icon Section */}
            <div className="relative mb-8">
                {variant === 'premium' && (
                    <div className="absolute inset-0 bg-gcg-orange/20 dark:bg-blue-500/20 rounded-3xl rotate-6 animate-pulse -z-10"></div>
                )}
                <div className={`w-20 h-20 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 flex items-center justify-center transition-transform hover:scale-110 duration-500 ${styles.iconBg} ${mode === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                    <Icon icon={icon} className={`w-10 h-10 ${styles.iconColor}`} />
                </div>
            </div>

            {/* Content Section */}
            <h3 className={`text-2xl font-bold mb-3 capitalize ${styles.titleColor}`}>
                {title}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md font-medium leading-relaxed">
                {description}
            </p>

            {/* Steps Section */}
            {steps && steps.length > 0 && (
                <div className="w-full max-w-xl mx-auto mb-10 text-left space-y-3">
                    {steps.map((step, index) => (
                        <div key={index} className={`flex items-start gap-4 p-4 rounded-2xl border border-transparent transition-all hover:border-gray-200 dark:hover:border-gray-700 ${getStepBg(step.color)}`}>
                            <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-black shadow-lg ${getStepColor(step.color)}`}>
                                {index + 1}
                            </div>
                            <div>
                                <div className="font-bold text-sm uppercase tracking-tight mb-0.5">{step.title}</div>
                                <div className="text-xs opacity-80 font-medium leading-relaxed">{step.description}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions Section */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
                {action && (
                    <button
                        onClick={action.onClick}
                        disabled={action.loading}
                        className="relative inline-flex items-center gap-3 px-8 py-3.5 bg-gcg-orange dark:bg-gcg-orange hover:bg-gcg-orange-dark dark:hover:bg-gcg-orange-dark text-white rounded-2xl font-bold text-sm transition-all shadow-xl hover:shadow-gcg-orange/40 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        {action.loading ? (
                            <Icon icon="solar:restart-broken" className="w-4 h-4 animate-spin" />
                        ) : (
                            <Icon icon={action.icon || "solar:add-circle-broken"} className="w-4 h-4" />
                        )}
                        {action.label}
                    </button>
                )}

                {secondaryAction && (
                    <button
                        onClick={secondaryAction.onClick}
                        className="flex items-center gap-3 px-8 py-3.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl font-bold text-sm transition-all shadow-sm hover:shadow-md"
                    >
                        <Icon icon={secondaryAction.icon || "solar:refresh-broken"} className="w-4 h-4" />
                        {secondaryAction.label}
                    </button>
                )}
            </div>
        </div>
    );
};

export default GenericEmptyState;
