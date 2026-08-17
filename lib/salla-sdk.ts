/**
 * Salla SDK utility
 *
 * Wraps window.salla with graceful fallbacks for dev / non-embedded contexts.
 * All methods are client-safe — they guard against SSR via the typeof window check.
 */

type SallaSDKType = {
    notify?: {
        success?: (msg: string) => void;
        error?: (msg: string) => void;
        warning?: (msg: string) => void;
    };
    modal?: {
        confirm?: (opts: {
            title?: string;
            text?: string;
            icon?: string;
            showCancelButton?: boolean;
            confirmButtonText?: string;
            cancelButtonText?: string;
        }) => Promise<{ isConfirmed: boolean }>;
    };
};

function sdk(): SallaSDKType | null {
    if (typeof window !== "undefined" && (window as any).salla) {
        return (window as any).salla as SallaSDKType;
    }
    return null;
}

export const SallaSDK = {
    notify: {
        success(message: string) {
            sdk()?.notify?.success?.(message);
        },
        error(message: string) {
            sdk()?.notify?.error?.(message);
        },
        warning(message: string) {
            sdk()?.notify?.warning?.(message);
        },
    },

    /**
     * Shows a Salla confirm dialog.
     * Falls back to window.confirm() when the SDK is not available (dev/standalone).
     */
    async confirm(options: {
        title: string;
        text: string;
        confirmText?: string;
        cancelText?: string;
    }): Promise<boolean> {
        const s = sdk();
        if (s?.modal?.confirm) {
            const result = await s.modal.confirm({
                title: options.title,
                text: options.text,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: options.confirmText ?? "Confirm",
                cancelButtonText: options.cancelText ?? "Cancel",
            });
            return result.isConfirmed;
        }
        // Fallback for development / standalone usage
        return window.confirm(`${options.title}\n\n${options.text}`);
    },
};
