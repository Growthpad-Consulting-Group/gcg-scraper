import React, { ReactNode } from 'react';
import { Icon } from '@iconify/react';

interface ModalLeftPanelProps {
    /** Main title of the modal */
    title: string;
    /** Subtitle or description */
    subtitle?: string;
    /** Icon to display in header */
    icon: string;
    /** Background color for icon (defaults to gcg-brown) */
    iconBg?: 'gcg-brown' | 'gcg-orange' | 'emerald' | 'amber' | 'blue' | 'rose';
    /** Panel gradient tone — 'brand' for the standard muted orange/brown, 'danger'/'warning' for destructive or cautionary flows */
    variant?: 'brand' | 'danger' | 'warning';
    /** Theme mode */
    mode?: 'light' | 'dark';
    /** Custom content to render in the panel */
    children?: ReactNode;
    /** Optional footer content (like tips) */
    footer?: ReactNode;
    /** Split title into multiple lines (defaults to true) */
    splitTitle?: boolean;
}

/**
 * Reusable Modal Left Panel Component
 * Provides consistent premium branding and structure for all modals
 */
const ModalLeftPanel: React.FC<ModalLeftPanelProps> = ({
    title,
    subtitle,
    icon,
    iconBg = 'gcg-brown',
    variant = 'brand',
    children,
    footer }) => {
    const iconBgClasses: Record<string, string> = {
        'gcg-brown': 'bg-gcg-brown/10 border-gcg-brown/20 text-gcg-brown',
        'gcg-orange': 'bg-gcg-orange-dark/10 border-gcg-orange-dark/20 text-gcg-orange-dark',
        emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    };

    const variantClasses: Record<string, { bg: string; glow: string }> = {
        brand: { bg: 'bg-gcg-brown', glow: 'bg-gcg-orange/20' },
        danger: { bg: 'bg-gray-950', glow: 'bg-rose-500/10' },
        warning: { bg: 'bg-gray-950', glow: 'bg-amber-500/10' },
    };
    const { bg, glow } = variantClasses[variant];

    return (
        <div className={`hidden md:flex md:col-span-2 flex-col p-8 ${bg} text-white relative overflow-hidden border-r border-white/10`}>
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className={`absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 ${glow} rounded-full blur-3xl pointer-events-none`} />

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="mb-6">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${iconBgClasses[iconBg]}`}>
                        <Icon icon={icon} className="text-xl" />
                    </div>
                    <h2 className="text-lg font-bold leading-tight mb-4">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-white/50 text-sm">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Dynamic Content Area */}
                {children && (
                    <div className="space-y-6 flex-1 overflow-y-auto">
                        {children}
                    </div>
                )}

                {/* Footer / Tips Section */}
                {footer && (
                    <div className="mt-8">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

// Reusable Card Component for content sections
export const SummaryCard: React.FC<{
    title?: string;
    icon?: string;
    children: ReactNode
}> = ({ title, icon, children }) => (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 shadow-lg transition-all duration-300 hover:bg-white/10">
        {title && (
            <div className="flex items-center gap-2 mb-4">
                {icon && <Icon icon={icon} className="w-4 h-4 text-gcg-brown" />}
                <div className="text-sm text-white/40 font-semibold">
                    {title}
                </div>
            </div>
        )}
        {children}
    </div>
);

// Reusable Info Item Component
export const InfoItem: React.FC<{
    label: string;
    value: string;
    icon: string;
}> = ({ label, value, icon }) => (
    <div className="flex items-center gap-3 group">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-gcg-brown/20 transition-colors">
            <Icon icon={icon} className="w-4 h-4 text-gcg-brown" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="text-xs text-white/40 font-semibold">{label}</div>
            <div className="text-sm font-medium text-white/90 truncate">{value}</div>
        </div>
    </div>
);

// Reusable Pro Tip Component
export const ProTip: React.FC<{
    children: ReactNode;
    icon?: string;
}> = ({ children, icon = 'solar:lightbulb-bolt-broken' }) => (
    <div className="bg-gcg-orange-dark/20 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
        <div className="flex gap-3">
            <Icon icon={icon} className="w-5 h-5 text-gcg-brown shrink-0 mt-0.5" />
            <div>
                <h4 className="font-bold text-sm text-white mb-1">Pro Tip</h4>
                <p className="text-sm text-white/60 leading-relaxed">
                    {children}
                </p>
            </div>
        </div>
    </div>
);

// Reusable Image Preview Component
export const ImagePreview: React.FC<{
    src?: string;
    alt: string;
    fallbackIcon?: string;
    badge?: ReactNode;
    glow?: boolean;
}> = ({ src, alt, fallbackIcon = 'solar:box-broken', badge, glow }) => (
    <div className="relative">
        <div className={`relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 ${glow ? 'shadow-2xl shadow-gcg-brown/20' : ''}`}>
            {src ? (
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-48 object-cover"
                />
            ) : (
                <div className="w-full h-48 flex items-center justify-center">
                    <Icon icon={fallbackIcon} className="w-16 h-16 text-white/20" />
                </div>
            )}
        </div>
        {badge && (
            <div className="absolute top-3 right-3">
                {badge}
            </div>
        )}
    </div>
);

// Reusable Step Indicator Component
export const StepIndicator: React.FC<{
    steps: Array<{
        number: number;
        label: string;
        icon: string;
        description?: string;
    }>;
    currentStep: number;
    variant?: 'vertical' | 'horizontal';
}> = ({ steps, currentStep, variant = 'vertical' }) => {
    const isVertical = variant === 'vertical';

    return (
        <div className={`flex ${isVertical ? 'flex-col space-y-4' : 'flex-row space-x-4'}`}>
            {steps.map((step) => {
                const isActive = step.number === currentStep;
                const isCompleted = step.number < currentStep;

                return (
                    <div
                        key={step.number}
                        className={`flex ${isVertical ? 'flex-row' : 'flex-col'} items-center gap-3`}
                    >
                        <div className={`
                            w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all
                            ${isActive ? 'bg-gcg-brown/20 border-gcg-brown text-gcg-brown' : ''}
                            ${isCompleted ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : ''}
                            ${!isActive && !isCompleted ? 'bg-white/5 border-white/20 text-white/40' : ''}
                        `}>
                            <Icon icon={step.icon} className="w-5 h-5" />
                        </div>
                        <div className={`flex-1 ${isVertical ? '' : 'text-center'}`}>
                            <div className={`text-xs font-bold ${isActive ? 'text-white' : 'text-white/60'}`}>
                                {step.label}
                            </div>
                            {step.description && (
                                <div className="text-[10px] text-white/40 mt-0.5">
                                    {step.description}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// Reusable Price Comparison Component
export const PriceComparison: React.FC<{
    originalPrice: number;
    suggestedPrice: number;
    currency?: string;
}> = ({ originalPrice, suggestedPrice, currency = '$' }) => {
    const difference = suggestedPrice - originalPrice;
    const percentChange = ((difference / originalPrice) * 100).toFixed(1);
    const isIncrease = difference > 0;

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                    <div className="text-xs font-semibold text-white/50 mb-1">
                        Original
                    </div>
                    <div className="text-2xl font-bold text-white/60 line-through">
                        {currency}{originalPrice.toFixed(2)}
                    </div>
                </div>
                <Icon
                    icon="solar:arrow-right-broken"
                    className="w-6 h-6 text-gcg-brown mx-4"
                />
                <div className="flex-1 text-right">
                    <div className="text-xs font-semibold text-gcg-brown mb-1">
                        Suggested
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {currency}{suggestedPrice.toFixed(2)}
                    </div>
                </div>
            </div>
            <div className={`text-center text-sm font-medium ${isIncrease ? 'text-emerald-400' : 'text-red-400'}`}>
                {isIncrease ? '+' : ''}{currency}{Math.abs(difference).toFixed(2)} ({isIncrease ? '+' : ''}{percentChange}%)
            </div>
        </div>
    );
};

export default ModalLeftPanel;
