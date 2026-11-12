/* Lucian UX/UI Prompt #070 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#070 */
/* eslint-disable react-refresh/only-export-components */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useMemo,
    useEffect,
    useRef,
    useLayoutEffect,
} from 'react';

export type ToastType =
    | 'success'
    | 'error'
    | 'warning'
    | 'info'
    | 'wait'
    | 'loading'
    | 'ok'
    | 'err';

export interface ToastItem {
    id: string;
    type: ToastType;
    title?: string;
    message: React.ReactNode;
    duration?: number; // ms, default 4500. 0 means persistent
    action?: {
        label: string;
        onClick: () => void;
    };
    autoDone?: boolean;
    autoDoneDuration?: number;
    doneTitle?: string;
    doneMessage?: string;
}

export interface ToastContextType {
    toasts: ToastItem[];
    addToast: (toast: Omit<ToastItem, 'id'>) => string;
    removeToast: (id: string, dir?: number) => void;
    updateToast: (id: string, updates: Partial<ToastItem>) => void;
    clearAllToasts: () => void;
    showToast: (message: React.ReactNode, type?: ToastType) => string;
    toast: {
        success: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) => string;
        error: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) => string;
        warning: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) => string;
        info: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) => string;
        wait: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) => string;
        loading: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) => string;
        promise: <T>(
            promise: Promise<T>,
            msgs: {
                loading?: { title?: string; message: React.ReactNode };
                success?: { title?: string; message: React.ReactNode } | ((data: T) => { title?: string; message: React.ReactNode });
                error?: { title?: string; message: React.ReactNode } | ((err: unknown) => { title?: string; message: React.ReactNode });
            }
        ) => Promise<T>;
    };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Standalone toast helper for quick triggers outside React component trees if needed
let globalAddToast: ((toast: Omit<ToastItem, 'id'>) => string) | null = null;

export const globalToast = {
    success: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
        globalAddToast?.({ type: 'success', message, title, ...options }),
    error: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
        globalAddToast?.({ type: 'error', message, title, ...options }),
    warning: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
        globalAddToast?.({ type: 'warning', message, title, ...options }),
    info: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
        globalAddToast?.({ type: 'info', message, title, ...options }),
    wait: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
        globalAddToast?.({ type: 'wait', message, title, ...options }),
    loading: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
        globalAddToast?.({ type: 'loading', message, title, ...options }),
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a <ToastProvider>');
    }
    return context;
};

interface InternalToastItem extends ToastItem {
    left: number;
    initialDuration: number;
    isLeaving?: boolean;
    leaveDir?: number;
    isEntering?: boolean;
}

const TOAST_ICONS = {
    ok: (
        <svg viewBox="0 0 18 18" aria-hidden="true">
            <path d="M4 9.4l3.2 3.2L14 5.6" />
        </svg>
    ),
    err: (
        <svg viewBox="0 0 18 18" aria-hidden="true">
            <path d="M9 5v5M9 13h.01" />
        </svg>
    ),
    warn: (
        <svg viewBox="0 0 18 18" aria-hidden="true">
            <path d="M9 3.5L2.5 15h13L9 3.5z" />
            <path d="M9 7.5v3.5M9 13.5h.01" />
        </svg>
    ),
    info: (
        <svg viewBox="0 0 18 18" aria-hidden="true">
            <path d="M3.5 4.5h11v7h-6l-3 2.5v-2.5h-2z" />
        </svg>
    ),
    wait: <i aria-hidden="true" />,
};

const getToastMeta = (type: ToastType) => {
    switch (type) {
        case 'success':
        case 'ok':
            return { color: 'var(--ux-mint)', icon: TOAST_ICONS.ok, role: 'status' as const };
        case 'error':
        case 'err':
            return { color: 'var(--ux-danger)', icon: TOAST_ICONS.err, role: 'alert' as const };
        case 'warning':
            return { color: 'var(--ux-warn)', icon: TOAST_ICONS.warn, role: 'status' as const };
        case 'wait':
        case 'loading':
            return { color: 'var(--ux-warn)', icon: TOAST_ICONS.wait, role: 'status' as const };
        case 'info':
        default:
            return { color: 'var(--ux-accent)', icon: TOAST_ICONS.info, role: 'status' as const };
    }
};

interface ToastCardProps {
    toast: InternalToastItem;
    onClose: (id: string, dir?: number) => void;
    onReLayout: () => void;
    domRef: (el: HTMLDivElement | null) => void;
}

export const AdminToastCard: React.FC<ToastCardProps> = ({
    toast,
    onClose,
    onReLayout,
    domRef,
}) => {
    const meta = getToastMeta(toast.type);
    const cardElRef = useRef<HTMLDivElement | null>(null);
    const dragDataRef = useRef({ startX: 0, dx: 0, isDragging: false, pointerId: -1 });

    useLayoutEffect(() => {
        const el = cardElRef.current;
        if (!el) return;
        if (toast.isEntering) {
            // Force reflow for spring entrance animation
            void el.offsetWidth;
            const animId = requestAnimationFrame(() => {
                el.classList.remove('enter');
                onReLayout();
            });
            return () => cancelAnimationFrame(animId);
        }
    }, [toast.isEntering, onReLayout]);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button')) return;
        const el = e.currentTarget;
        dragDataRef.current = {
            startX: e.clientX,
            dx: 0,
            isDragging: true,
            pointerId: e.pointerId,
        };
        try {
            el.setPointerCapture(e.pointerId);
        } catch {
            // ignore if unsupported
        }
        el.classList.add('drag');
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragDataRef.current.isDragging) return;
        const dx = e.clientX - dragDataRef.current.startX;
        dragDataRef.current.dx = dx;
        const el = e.currentTarget;
        el.style.setProperty('--dx', `${dx}px`);
        el.style.setProperty('--o', `${Math.max(0.2, 1 - Math.abs(dx) / 260)}`);
    };

    const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragDataRef.current.isDragging) return;
        dragDataRef.current.isDragging = false;
        const el = e.currentTarget;
        try {
            if (el.hasPointerCapture(dragDataRef.current.pointerId)) {
                el.releasePointerCapture(dragDataRef.current.pointerId);
            }
        } catch {
            // ignore
        }
        el.classList.remove('drag');
        const dx = dragDataRef.current.dx;
        if (Math.abs(dx) > 90) {
            onClose(toast.id, dx > 0 ? 1 : -1);
        } else {
            el.style.setProperty('--dx', '0px');
            el.style.removeProperty('--o');
            onReLayout();
        }
    };

    // Main title vs descriptive sub-message
    const mainTitle = toast.title ?? (typeof toast.message === 'string' ? toast.message : '');
    const subMessage = toast.title ? toast.message : null;

    let classNames = 'u070-t';
    if (toast.isEntering) classNames += ' enter';
    if (toast.isLeaving) {
        classNames += ' leave';
        if (toast.leaveDir) classNames += ' side';
    }

    return (
        <div
            id={toast.id}
            ref={(el) => {
                cardElRef.current = el;
                domRef(el);
            }}
            className={classNames}
            role={meta.role}
            style={{
                '--c': meta.color,
                ...(toast.leaveDir ? { '--dir': toast.leaveDir } : {}),
            } as React.CSSProperties}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUpOrCancel}
            onPointerCancel={handlePointerUpOrCancel}
        >
            <span className="u070-ic" aria-hidden="true">
                {meta.icon}
            </span>

            <span className="u070-tx">
                <b>{mainTitle}</b>
                {subMessage && <small>{subMessage}</small>}
            </span>

            {toast.action && (
                <button
                    type="button"
                    className="u070-act"
                    onClick={(e) => {
                        e.stopPropagation();
                        toast.action?.onClick();
                        onClose(toast.id);
                    }}
                >
                    {toast.action.label}
                </button>
            )}

            <button
                type="button"
                className="u070-x"
                aria-label="Đóng thông báo"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose(toast.id);
                }}
            >
                <svg viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
                </svg>
            </button>

            {toast.initialDuration > 0 && <span className="u070-bar" aria-hidden="true" />}
        </div>
    );
};

export interface ToastContainerProps {
    toasts: ToastItem[];
    onClose: (id: string, dir?: number) => void;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'bottom-center';
}

export const AdminToastContainer: React.FC<ToastContainerProps> = ({
    toasts,
    onClose,
    position = 'bottom-right',
}) => {
    const [open, setOpen] = useState(false);
    const [liveMessage, setLiveMessage] = useState('');
    const zoneRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const openRef = useRef(open);
    const toastsRef = useRef<ToastItem[]>(toasts);

    useEffect(() => {
        openRef.current = open;
    }, [open]);

    useEffect(() => {
        toastsRef.current = toasts;
    }, [toasts]);

    const isTop = position.startsWith('top');

    // Announce newest toasts via aria-live polite region
    const prevToastsCountRef = useRef(toasts.length);
    useEffect(() => {
        if (toasts.length > prevToastsCountRef.current && toasts[0]) {
            const newest = toasts[0];
            const text = newest.title || (typeof newest.message === 'string' ? newest.message : 'Thông báo mới');
            setLiveMessage(text);
        }
        prevToastsCountRef.current = toasts.length;
    }, [toasts]);

    // Layout calculation for stacking layers vs fan-out list
    const updateLayout = useCallback(() => {
        let acc = 0;
        const activeToasts = (toastsRef.current as InternalToastItem[]).filter((t) => !t.isLeaving);

        activeToasts.forEach((t, i) => {
            const el = cardRefs.current.get(t.id);
            if (!el) return;

            el.classList.toggle('back', !openRef.current && i > 0);

            if (openRef.current) {
                const yVal = isTop ? `${acc}px` : `-${acc}px`;
                el.style.setProperty('--y', yVal);
                el.style.setProperty('--s', '1');
                el.style.setProperty('--o', '1');
                el.inert = false;
                acc += el.offsetHeight + 8;
            } else {
                const yVal = isTop ? `${i * 14}px` : `-${i * 14}px`;
                el.style.setProperty('--y', yVal);
                el.style.setProperty('--s', (1 - i * 0.06).toFixed(2));
                el.style.setProperty('--o', i > 2 ? '0' : '1');
                el.inert = i > 0;
            }

            el.style.zIndex = `${50 - i}`;
        });

        if (zoneRef.current) {
            const zoneHeight = openRef.current && activeToasts.length > 0 ? Math.max(68, acc) : 68;
            zoneRef.current.style.height = `${zoneHeight}px`;
        }
    }, [isTop]);

    // Re-run layout on state changes
    useEffect(() => {
        updateLayout();
    }, [updateLayout, open, toasts]);

    // High-performance countdown loop: pauses completely when hovered or focused
    useEffect(() => {
        let lastTime = performance.now();
        let animId: number;

        const loop = (now: number) => {
            const dt = now - lastTime;
            lastTime = now;

            if (!openRef.current) {
                const active = (toastsRef.current as InternalToastItem[]).filter((t) => !t.isLeaving);
                const topToast = active[0];

                if (topToast && topToast.initialDuration > 0 && topToast.left !== Infinity) {
                    topToast.left -= dt;
                    const cardEl = cardRefs.current.get(topToast.id);
                    if (cardEl) {
                        const ratio = Math.max(0, topToast.left / topToast.initialDuration);
                        cardEl.style.setProperty('--left', ratio.toFixed(3));
                    }
                    if (topToast.left <= 0) {
                        onClose(topToast.id);
                    }
                }
            }

            animId = requestAnimationFrame(loop);
        };

        animId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animId);
    }, [onClose]);

    // Hover & focus event listeners to fan out and freeze countdown
    const handlePointerEnter = (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse') {
            setOpen(true);
        }
    };

    const handlePointerLeave = (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse') {
            const zone = zoneRef.current;
            if (zone && !zone.contains(document.activeElement)) {
                setOpen(false);
            }
        }
    };

    const handleFocusIn = () => {
        setOpen(true);
    };

    const handleFocusOut = (e: React.FocusEvent) => {
        const zone = zoneRef.current;
        if (zone && !zone.contains(e.relatedTarget as Node)) {
            setOpen(false);
        }
    };

    const handleZoneClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        if (toasts.length > 1) {
            setOpen((prev) => !prev);
        }
    };

    if (toasts.length === 0) return null;

    const positionClass = `u070-pos-${position} ${isTop ? 'u070-pos-top' : 'u070-pos-bottom'}`;

    return (
        <aside
            aria-label="Thông báo hệ thống"
            className={`ux u070 u070-root ${positionClass}`}
        >
            <style>{`
                .u070 {
                  --ux-page: #F4F2EE;
                  --ux-surface: #FFFFFF;
                  --ux-surface-2: #F5F3EF;
                  --ux-surface-3: #EAE7E1;
                  --ux-ink: #16151B;
                  --ux-ink-2: #57535F;
                  --ux-ink-3: #8E8A97;
                  --ux-line: rgba(22,21,27,.09);
                  --ux-line-2: rgba(22,21,27,.17);
                  --ux-accent: #6A57F2;
                  --ux-accent-2: #2F8FE0;
                  --ux-accent-soft: rgba(106,87,242,.12);
                  --ux-accent-ink: #FFFFFF;
                  --ux-mint: #119C72;
                  --ux-warn: #D6731E;
                  --ux-danger: #D93A55;
                  --ux-glass: rgba(255,255,255,.58);
                  --ux-glass-line: rgba(255,255,255,.85);
                  --ux-shadow: rgba(40,30,80,.14);
                  --ux-shadow-strong: rgba(40,30,80,.3);
                  --ux-grad: linear-gradient(120deg,#7B61FF,#3D8BFF 55%,#1FB89A);
                  --ux-ease: cubic-bezier(.2,.8,.2,1);
                  --ux-spring: cubic-bezier(.34,1.45,.64,1);

                  font-family: inherit;
                  color: var(--ux-ink);
                  -webkit-font-smoothing: antialiased;
                  letter-spacing: -.01em;
                  -webkit-tap-highlight-color: transparent;
                  word-break: keep-all;
                  overflow-wrap: break-word;
                }

                @media (prefers-color-scheme: dark) {
                  :root:not([data-theme="light"]) .u070 {
                    --ux-page: #07080D;
                    --ux-surface: #13141C;
                    --ux-surface-2: #1A1B25;
                    --ux-surface-3: #252632;
                    --ux-ink: #F4F0E8;
                    --ux-ink-2: rgba(244,240,232,.68);
                    --ux-ink-3: rgba(244,240,232,.42);
                    --ux-line: rgba(255,255,255,.08);
                    --ux-line-2: rgba(255,255,255,.16);
                    --ux-accent: #B7A4FF;
                    --ux-accent-2: #7DB4FF;
                    --ux-accent-soft: rgba(183,164,255,.15);
                    --ux-accent-ink: #0B0C12;
                    --ux-mint: #7EE8C0;
                    --ux-warn: #FFB26B;
                    --ux-danger: #FF7D8C;
                    --ux-glass: rgba(255,255,255,.07);
                    --ux-glass-line: rgba(255,255,255,.18);
                    --ux-shadow: rgba(0,0,0,.45);
                    --ux-shadow-strong: rgba(0,0,0,.72);
                    --ux-grad: linear-gradient(120deg,#B7A4FF,#7DB4FF 55%,#A5F2D3);
                  }
                }

                :root[data-theme="dark"] .u070,
                .dark .u070,
                [data-theme="dark"] .u070 {
                  --ux-page: #07080D;
                  --ux-surface: #13141C;
                  --ux-surface-2: #1A1B25;
                  --ux-surface-3: #252632;
                  --ux-ink: #F4F0E8;
                  --ux-ink-2: rgba(244,240,232,.68);
                  --ux-ink-3: rgba(244,240,232,.42);
                  --ux-line: rgba(255,255,255,.08);
                  --ux-line-2: rgba(255,255,255,.16);
                  --ux-accent: #B7A4FF;
                  --ux-accent-2: #7DB4FF;
                  --ux-accent-soft: rgba(183,164,255,.15);
                  --ux-accent-ink: #0B0C12;
                  --ux-mint: #7EE8C0;
                  --ux-warn: #FFB26B;
                  --ux-danger: #FF7D8C;
                  --ux-glass: rgba(255,255,255,.07);
                  --ux-glass-line: rgba(255,255,255,.18);
                  --ux-shadow: rgba(0,0,0,.45);
                  --ux-shadow-strong: rgba(0,0,0,.72);
                  --ux-grad: linear-gradient(120deg,#B7A4FF,#7DB4FF 55%,#A5F2D3);
                }

                .u070, .u070 *, .u070 *::before, .u070 *::after {
                  box-sizing: border-box;
                }

                :where(.u070) :is(button,input,textarea,select) {
                  font: inherit;
                  color: inherit;
                }
                :where(.u070) button {
                  cursor: pointer;
                }
                .u070 :focus-visible {
                  outline: 2px solid var(--ux-accent);
                  outline-offset: 3px;
                }
                .u070 [hidden] {
                  display: none !important;
                }

                @media (prefers-reduced-motion: reduce) {
                  .u070, .u070 *, .u070 *::before, .u070 *::after {
                    animation-duration: .001ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: .001ms !important;
                    scroll-behavior: auto !important;
                  }
                }

                .u070-root {
                  position: fixed;
                  z-index: 9999;
                  pointer-events: none;
                  width: 360px;
                  max-width: calc(100vw - 32px);
                }
                .u070-pos-bottom-right {
                  bottom: 24px;
                  right: 24px;
                }
                .u070-pos-bottom-left {
                  bottom: 24px;
                  left: 24px;
                }
                .u070-pos-top-right {
                  top: 24px;
                  right: 24px;
                }
                .u070-pos-top-left {
                  top: 24px;
                  left: 24px;
                }
                .u070-pos-bottom-center {
                  bottom: 24px;
                  left: 50%;
                  transform: translateX(-50%);
                }

                @media (max-width: 640px) {
                  .u070-root.u070-pos-bottom-right,
                  .u070-root.u070-pos-bottom-left,
                  .u070-root.u070-pos-bottom-center {
                    left: 16px;
                    right: 16px;
                    bottom: 16px;
                    width: auto;
                    max-width: none;
                    transform: none;
                  }
                  .u070-root.u070-pos-top-right,
                  .u070-root.u070-pos-top-left {
                    left: 16px;
                    right: 16px;
                    top: 16px;
                    width: auto;
                    max-width: none;
                    transform: none;
                  }
                }

                .u070-zone {
                  position: relative;
                  width: 100%;
                  outline: none;
                  pointer-events: auto;
                  transition: height .35s var(--ux-spring);
                }

                .u070-t {
                  position: absolute;
                  left: 0;
                  right: 0;
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  min-height: 68px;
                  padding: 12px 14px 12px 14px;
                  border-radius: 20px;
                  background: var(--ux-surface);
                  box-shadow: 0 0 0 1px var(--ux-line), 0 16px 30px -18px var(--ux-shadow-strong);
                  transform: translate(var(--dx, 0px), var(--y, 0px)) scale(var(--s, 1));
                  opacity: var(--o, 1);
                  transition: transform .5s var(--ux-spring), opacity .35s;
                  touch-action: pan-y;
                  user-select: none;
                  -webkit-user-select: none;
                  pointer-events: auto;
                  cursor: grab;
                }
                .u070-t:active {
                  cursor: grabbing;
                }
                .u070-pos-bottom .u070-t {
                  bottom: 0;
                  transform-origin: 50% 100%;
                }
                .u070-pos-top .u070-t {
                  top: 0;
                  transform-origin: 50% 0%;
                }
                .u070-t.drag {
                  transition: none !important;
                }
                .u070-pos-bottom .u070-t.enter {
                  transform: translateY(90px) scale(.9);
                  opacity: 0;
                }
                .u070-pos-top .u070-t.enter {
                  transform: translateY(-90px) scale(.9);
                  opacity: 0;
                }
                .u070-t.leave {
                  transform: translate(var(--dx, 0px), var(--y, 0px)) scale(var(--s, 1));
                  opacity: 0;
                  pointer-events: none;
                }
                .u070-t.leave.side {
                  transform: translate(calc(var(--dir, 1) * 420px), var(--y, 0px)) rotate(calc(var(--dir, 1) * 8deg));
                  opacity: 0;
                  pointer-events: none;
                }
                .u070-t > * {
                  transition: opacity .25s;
                }
                .u070-t.back > * {
                  opacity: 0;
                  pointer-events: none;
                }
                .u070-ic {
                  width: 36px;
                  height: 36px;
                  flex: none;
                  border-radius: 12px;
                  display: grid;
                  place-items: center;
                  background: color-mix(in srgb, var(--c) 15%, transparent);
                  color: var(--c);
                  transition: background .3s, color .3s;
                }
                .u070-ic svg {
                  width: 18px;
                  height: 18px;
                  fill: none;
                  stroke: currentColor;
                  stroke-width: 2.4;
                  stroke-linecap: round;
                  stroke-linejoin: round;
                }
                .u070-ic i {
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  border: 2.5px solid currentColor;
                  border-right-color: transparent;
                  animation: u070-spin .7s linear infinite;
                }
                @keyframes u070-spin {
                  to { transform: rotate(360deg); }
                }
                .u070-tx {
                  flex: 1;
                  min-width: 0;
                }
                .u070-tx b {
                  display: block;
                  font-size: 14px;
                  font-weight: 750;
                  letter-spacing: -.02em;
                  color: var(--ux-ink);
                  line-height: 1.3;
                }
                .u070-tx small {
                  display: block;
                  margin-top: 2px;
                  font-size: 12.5px;
                  font-weight: 550;
                  color: var(--ux-ink-3);
                  line-height: 1.35;
                  white-space: normal;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                }
                .u070-act {
                  height: 32px;
                  padding: 0 11px;
                  border: 0;
                  border-radius: 10px;
                  background: var(--ux-surface-2);
                  font-size: 12.5px;
                  font-weight: 750;
                  color: var(--ux-ink);
                  white-space: nowrap;
                  flex-shrink: 0;
                  transition: background .2s, transform .2s;
                }
                .u070-act:hover {
                  background: var(--ux-surface-3);
                }
                .u070-act:active {
                  transform: scale(.95);
                }
                .u070-x {
                  width: 30px;
                  height: 30px;
                  flex: none;
                  border: 0;
                  padding: 0;
                  border-radius: 50%;
                  display: grid;
                  place-items: center;
                  background: none;
                  color: var(--ux-ink-3);
                  transition: background .2s, color .2s;
                }
                .u070-x:hover {
                  background: var(--ux-surface-2);
                  color: var(--ux-ink);
                }
                .u070-x svg {
                  width: 14px;
                  height: 14px;
                  fill: none;
                  stroke: currentColor;
                  stroke-width: 2.4;
                  stroke-linecap: round;
                }
                .u070-act:focus-visible, .u070-x:focus-visible {
                  outline: 2px solid var(--ux-accent);
                  outline-offset: 1px;
                }
                .u070-bar {
                  position: absolute;
                  left: 16px;
                  right: 16px;
                  bottom: 0;
                  height: 2px;
                  border-radius: 2px;
                  background: var(--c);
                  opacity: .5;
                  transform-origin: 0 50%;
                  transform: scaleX(var(--left, 1));
                  transition: background .3s;
                }
                .u070-live {
                  position: absolute;
                  width: 1px;
                  height: 1px;
                  overflow: hidden;
                  clip: rect(0 0 0 0);
                }
            `}</style>

            <div
                ref={zoneRef}
                className="u070-zone"
                role="region"
                aria-label="Notifications"
                tabIndex={-1}
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                onFocusCapture={handleFocusIn}
                onBlurCapture={handleFocusOut}
                onClick={handleZoneClick}
            >
                {(toasts as InternalToastItem[]).map((item) => (
                    <AdminToastCard
                        key={item.id}
                        toast={item}
                        onClose={onClose}
                        onReLayout={updateLayout}
                        domRef={(el) => {
                            if (el) cardRefs.current.set(item.id, el);
                            else cardRefs.current.delete(item.id);
                        }}
                    />
                ))}

                <div className="u070-live" aria-live="polite">
                    {liveMessage}
                </div>
            </div>
        </aside>
    );
};

export interface ToastProviderProps {
    children: React.ReactNode;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'bottom-center';
    defaultDuration?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
    children,
    position = 'bottom-right',
    defaultDuration = 4500,
}) => {
    const [toasts, setToasts] = useState<InternalToastItem[]>([]);

    const removeToast = useCallback((id: string, dir?: number) => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('leave');
            if (dir) {
                el.style.setProperty('--dir', String(dir));
                el.classList.add('side');
            }
        }

        setToasts((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    return { ...item, isLeaving: true, leaveDir: dir || 0 };
                }
                return item;
            })
        );

        setTimeout(() => {
            setToasts((prev) => prev.filter((item) => item.id !== id));
        }, 450);
    }, []);

    const updateToast = useCallback(
        (id: string, updates: Partial<ToastItem>) => {
            setToasts((prev) =>
                prev.map((item) => {
                    if (item.id === id) {
                        const newType = updates.type ?? item.type;
                        const newDuration =
                            updates.duration !== undefined
                                ? updates.duration
                                : item.initialDuration || defaultDuration;

                        return {
                            ...item,
                            ...updates,
                            type: newType,
                            left: newDuration > 0 ? newDuration : Infinity,
                            initialDuration: newDuration,
                        };
                    }
                    return item;
                })
            );
        },
        [defaultDuration]
    );

    const clearAllToasts = useCallback(() => {
        setToasts((prev) =>
            prev.map((item) => ({ ...item, isLeaving: true, leaveDir: 0 }))
        );
        setTimeout(() => {
            setToasts([]);
        }, 450);
    }, []);

    const addToast = useCallback(
        (toast: Omit<ToastItem, 'id'>): string => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const isWaitType = toast.type === 'wait' || toast.type === 'loading';
            const duration = toast.duration !== undefined ? toast.duration : defaultDuration;
            const initialLeft = isWaitType ? Infinity : (duration > 0 ? duration : Infinity);

            const newToast: InternalToastItem = {
                id,
                duration,
                initialDuration: duration,
                left: initialLeft,
                isEntering: true,
                ...toast,
            };

            setToasts((prev) => [newToast, ...prev]);

            // If autoDone is enabled for wait toasts, transition to done after autoDoneDuration
            if (isWaitType && toast.autoDone) {
                const isReducedMotion =
                    typeof window !== 'undefined' &&
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                const autoDoneTimeout = toast.autoDoneDuration || (isReducedMotion ? 300 : 1800);
                setTimeout(() => {
                    updateToast(id, {
                        type: 'success',
                        title: toast.doneTitle || 'Hoàn tất',
                        message: toast.doneMessage || 'Đã hoàn thành thao tác',
                        duration: defaultDuration,
                    });
                }, autoDoneTimeout);
            }

            return id;
        },
        [defaultDuration, updateToast]
    );

    // Bind to global toast helper for utility use outside React tree
    useEffect(() => {
        globalAddToast = addToast;
        return () => {
            globalAddToast = null;
        };
    }, [addToast]);

    const successToast = useCallback(
        (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
            addToast({ type: 'success', message, title, ...options }),
        [addToast]
    );

    const errorToast = useCallback(
        (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
            addToast({ type: 'error', message, title, ...options }),
        [addToast]
    );

    const warningToast = useCallback(
        (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
            addToast({ type: 'warning', message, title, ...options }),
        [addToast]
    );

    const infoToast = useCallback(
        (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
            addToast({ type: 'info', message, title, ...options }),
        [addToast]
    );

    const waitToast = useCallback(
        (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
            addToast({ type: 'wait', message, title, ...options }),
        [addToast]
    );

    const loadingToast = useCallback(
        (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
            addToast({ type: 'loading', message, title, ...options }),
        [addToast]
    );

    const promiseToast = useCallback(
        <T,>(
            promise: Promise<T>,
            msgs: {
                loading?: { title?: string; message: React.ReactNode };
                success?: { title?: string; message: React.ReactNode } | ((data: T) => { title?: string; message: React.ReactNode });
                error?: { title?: string; message: React.ReactNode } | ((err: unknown) => { title?: string; message: React.ReactNode });
            }
        ): Promise<T> => {
            const id = addToast({
                type: 'wait',
                title: msgs.loading?.title ?? 'Đang lưu...',
                message: msgs.loading?.message ?? 'Vui lòng chờ trong giây lát',
                duration: 0,
            });

            return promise
                .then((data) => {
                    const succ = typeof msgs.success === 'function' ? msgs.success(data) : msgs.success;
                    updateToast(id, {
                        type: 'success',
                        title: succ?.title ?? 'Hoàn tất',
                        message: succ?.message ?? 'Đã lưu thành công!',
                        duration: defaultDuration,
                    });
                    return data;
                })
                .catch((err) => {
                    const errConf = typeof msgs.error === 'function' ? msgs.error(err) : msgs.error;
                    const errMsg =
                        err instanceof Error
                            ? err.message
                            : typeof err === 'string'
                            ? err
                            : 'Có lỗi xảy ra khi xử lý dữ liệu';
                    updateToast(id, {
                        type: 'error',
                        title: errConf?.title ?? 'Lỗi xử lý',
                        message: errConf?.message ?? errMsg,
                        duration: defaultDuration,
                    });
                    throw err;
                });
        },
        [addToast, updateToast, defaultDuration]
    );

    const toast = useMemo(
        () => ({
            success: successToast,
            error: errorToast,
            warning: warningToast,
            info: infoToast,
            wait: waitToast,
            loading: loadingToast,
            promise: promiseToast,
        }),
        [successToast, errorToast, warningToast, infoToast, waitToast, loadingToast, promiseToast]
    );

    const showToast = useCallback(
        (message: React.ReactNode, type: ToastType = 'info'): string => {
            return addToast({ type, message });
        },
        [addToast]
    );

    const contextValue = useMemo(
        () => ({
            toasts,
            addToast,
            removeToast,
            updateToast,
            clearAllToasts,
            showToast,
            toast,
        }),
        [toasts, addToast, removeToast, updateToast, clearAllToasts, showToast, toast]
    );

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <AdminToastContainer
                toasts={toasts}
                onClose={removeToast}
                position={position}
            />
        </ToastContext.Provider>
    );
};

export default ToastProvider;
