// Loading states and skeleton components

// Skeleton loading component
interface SkeletonProps {
    className?: string;
    lines?: number;
    height?: string;
    variant?: 'default' | 'rounded' | 'circular';
}

export function Skeleton({ className = "", lines = 1, height = "h-4", variant = 'default' }: SkeletonProps) {
    const getVariantClasses = () => {
        switch (variant) {
            case 'rounded':
                return 'rounded-lg';
            case 'circular':
                return 'rounded-full';
            default:
                return 'rounded';
        }
    };

    return (
        <div className={`animate-pulse ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className={`${height} bg-gray-200 dark:bg-gray-700 ${getVariantClasses()} mb-2 ${i === lines - 1 ? "w-3/4" : "w-full"
                        }`}
                />
            ))}
        </div>
    );
}

// Card skeleton
interface CardSkeletonProps {
    className?: string;
}

export function CardSkeleton({ className = "" }: CardSkeletonProps) {
    return (
        <div
            className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}
        >
            <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2 animate-pulse" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                </div>
            </div>
            <div className="space-y-3">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6 animate-pulse" />
            </div>
        </div>
    );
}

// Table skeleton
interface TableSkeletonProps {
    rows?: number;
    columns?: number;
    className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4, className = "" }: TableSkeletonProps) {
    return (
        <div
            className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
        >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse" />
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="px-6 py-4">
                        <div className="flex space-x-4">
                            {Array.from({ length: columns }).map((_, j) => (
                                <div
                                    key={j}
                                    className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${j === 0 ? "w-1/4" : j === 1 ? "w-1/3" : "w-1/2"
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Spinner with text
type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';
type SpinnerColor = 'blue' | 'green' | 'red' | 'yellow' | 'purple';

interface SpinnerProps {
    size?: SpinnerSize;
    text?: string;
    color?: SpinnerColor;
    className?: string;
}

export function Spinner({
    size = "md",
    text = "Loading...",
    color = "blue",
    className = "",
}: SpinnerProps) {
    const sizeClasses: Record<SpinnerSize, string> = {
        sm: "w-6 h-6",
        md: "w-8 h-8",
        lg: "w-12 h-12",
        xl: "w-16 h-16",
    };

    const colorClasses: Record<SpinnerColor, string> = {
        blue: "border-t-blue-500",
        green: "border-t-green-500",
        red: "border-t-red-500",
        yellow: "border-t-yellow-500",
        purple: "border-t-purple-500",
    };

    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <div
                className={`${sizeClasses[size]} border-4 border-gray-200 dark:border-gray-700 ${colorClasses[color]} rounded-full animate-spin mb-3`}
            />
            {text && (
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );
}

// Pulse dots
interface PulseDotsProps {
    className?: string;
}

export function PulseDots({ className = "" }: PulseDotsProps) {
    return (
        <div className={`flex space-x-2 ${className}`}>
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                />
            ))}
        </div>
    );
}

// Shimmer effect
interface ShimmerProps {
    className?: string;
    width?: string;
    height?: string;
}

export function Shimmer({ className = "", width = "w-full", height = "h-4" }: ShimmerProps) {
    return (
        <div
            className={`${width} ${height} bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden ${className}`}
        >
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
    );
}

// Content loader with skeleton
type ContentLoaderType = 'card' | 'table' | 'text';

interface ContentLoaderProps {
    type?: ContentLoaderType;
    count?: number;
    className?: string;
    showHeader?: boolean;
}

export function ContentLoader({
    type = "card",
    count = 1,
    className = "",
    showHeader = true,
}: ContentLoaderProps) {
    const renderSkeleton = () => {
        switch (type) {
            case "card":
                return <CardSkeleton className={className} />;
            case "table":
                return <TableSkeleton className={className} />;
            case "text":
                return <Skeleton lines={3} className={className} />;
            default:
                return <CardSkeleton className={className} />;
        }
    };

    return (
        <div className="space-y-4">
            {showHeader && (
                <div className="flex items-center justify-between">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse" />
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                </div>
            )}

            {Array.from({ length: count }).map((_, i) => (
                <div key={i}>{renderSkeleton()}</div>
            ))}
        </div>
    );
}

// Loading overlay
interface LoadingOverlayProps {
    isVisible?: boolean;
    text?: string;
    backdrop?: boolean;
    className?: string;
}

export function LoadingOverlay({
    isVisible = false,
    text = "Loading...",
    backdrop = true,
    className = "",
}: LoadingOverlayProps) {
    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 min-h-screen z-[9999] flex items-center justify-center ${backdrop ? "bg-white/80 backdrop-blur-sm" : ""
                } ${className}`}
        >
            <div className="text-center">
                <Spinner size="lg" text={text} />
            </div>
        </div>
    );
}
