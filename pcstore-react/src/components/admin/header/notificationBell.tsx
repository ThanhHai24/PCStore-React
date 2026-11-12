/* Lucian UX/UI Prompt #074 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#074 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface NotificationItem {
    id: string;
    title: string;
    content: string;
    time: string;
    gradient: string;
    icon: string;
    isRead: boolean;
    category?: 'order' | 'inventory' | 'warranty' | 'review' | 'system';
    isNew?: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
    {
        id: 'notif-1',
        title: 'Đơn hàng mới #DH-202411-089',
        content: 'Khách hàng Nguyễn Văn An vừa đặt PC Gaming Intel i7-14700K / RTX 4070.',
        time: 'Vừa xong',
        gradient: 'linear-gradient(140deg,#8B6CFF,#5B8CFF)',
        icon: '🛒',
        isRead: false,
        category: 'order',
    },
    {
        id: 'notif-2',
        title: 'Cảnh báo tồn kho thấp',
        content: 'VGA ASUS ROG Strix GeForce RTX 4080 Super chỉ còn 1 sản phẩm trong kho.',
        time: '15 phút trước',
        gradient: 'linear-gradient(140deg,#FFB547,#FF7A45)',
        icon: '⚠️',
        isRead: false,
        category: 'inventory',
    },
    {
        id: 'notif-3',
        title: 'Yêu cầu bảo hành mới #BH-041',
        content: 'Khách hàng gửi yêu cầu kiểm tra kỹ thuật RAM Corsair Vengeance DDR5.',
        time: '1 giờ trước',
        gradient: 'linear-gradient(140deg,#22C3A6,#0EA5E9)',
        icon: '🛡️',
        isRead: true,
        category: 'warranty',
    },
    {
        id: 'notif-4',
        title: 'Đánh giá 5 sao mới',
        content: 'Trần Quốc Bảo vừa đánh giá 5 sao cho màn hình Dell UltraSharp 27" 4K.',
        time: 'Hôm qua',
        gradient: 'linear-gradient(140deg,#FF7A93,#B04FD0)',
        icon: '⭐',
        isRead: true,
        category: 'review',
    },
];

const NEW_NOTIFICATION: NotificationItem = {
    id: 'notif-5',
    title: 'Thanh toán thành công #DH-202411-092',
    content: 'Đơn hàng vừa thanh toán qua VNPAY thành công: 32.500.000đ.',
    time: 'Vừa xong',
    gradient: 'linear-gradient(140deg,#3D8BFF,#22C3A6)',
    icon: '💳',
    isRead: false,
    category: 'order',
    isNew: true,
};

export const NotificationBell: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
    const [items, setItems] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
    const [isRinging, setIsRinging] = useState(false);
    const [announcement, setAnnouncement] = useState('');

    const rootRef = useRef<HTMLDivElement>(null);
    const bellBtnRef = useRef<HTMLButtonElement>(null);
    const badgeRef = useRef<HTMLSpanElement>(null);
    const prevUnreadCountRef = useRef<number>(0);

    const unreadCount = items.filter((item) => !item.isRead).length;

    // Badge pop animation when unread count increases
    useEffect(() => {
        const isReducedMotion =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (unreadCount > prevUnreadCountRef.current && !isReducedMotion && badgeRef.current) {
            badgeRef.current.animate(
                [
                    { transform: 'scale(1)' },
                    { transform: 'scale(1.5)' },
                    { transform: 'scale(1)' },
                ],
                { duration: 450, easing: 'cubic-bezier(.34, 1.5, .64, 1)' }
            );
        }
        prevUnreadCountRef.current = unreadCount;
    }, [unreadCount]);

    // Simulated incoming real-time notification
    useEffect(() => {
        const isReducedMotion =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const delay = isReducedMotion ? 400 : 2400;

        const timer = setTimeout(() => {
            setItems((prev) => {
                // Avoid duplicating if effect re-runs
                if (prev.some((it) => it.id === NEW_NOTIFICATION.id)) return prev;
                return [NEW_NOTIFICATION, ...prev];
            });

            // Bell shake animation
            setIsRinging(true);
            setAnnouncement(`Thông báo mới: ${NEW_NOTIFICATION.title}`);

            // Release the 'new' push-in class on next frame
            requestAnimationFrame(() => {
                setTimeout(() => {
                    setItems((prev) =>
                        prev.map((it) =>
                            it.id === NEW_NOTIFICATION.id ? { ...it, isNew: false } : it
                        )
                    );
                }, 50);
            });
        }, delay);

        return () => clearTimeout(timer);
    }, []);

    // Close on outside click
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('pointerdown', handleOutsideClick);
        }
        return () => {
            document.removeEventListener('pointerdown', handleOutsideClick);
        };
    }, [isOpen]);

    // Close on Escape key and return focus to bell
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
                bellBtnRef.current?.focus();
            }
        },
        [isOpen]
    );

    // Toggle read state for single item
    const handleItemClick = (id: string) => {
        setItems((prev) =>
            prev.map((it) => (it.id === id ? { ...it, isRead: true } : it))
        );
    };

    // Staggered "Mark all read" clearing dots sequentially
    const handleMarkAllRead = () => {
        const unreadItems = items.filter((it) => !it.isRead);
        unreadItems.forEach((it, index) => {
            setTimeout(() => {
                setItems((prev) =>
                    prev.map((item) =>
                        item.id === it.id ? { ...item, isRead: true } : item
                    )
                );
            }, index * 110);
        });
    };

    const filteredItems = items.filter((item) => {
        if (activeTab === 'unread') return !item.isRead;
        return true;
    });

    return (
        <div
            ref={rootRef}
            className={`ux u074 ${isOpen ? '' : 'is-closed'}`}
            onKeyDown={handleKeyDown}
        >
            <style>{`
                .u074 {
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

                  position: relative;
                  display: inline-block;
                  font-family: inherit;
                  color: var(--ux-ink);
                  -webkit-font-smoothing: antialiased;
                  letter-spacing: -.01em;
                  -webkit-tap-highlight-color: transparent;
                  word-break: keep-all;
                  overflow-wrap: break-word;
                }

                @media (prefers-color-scheme: dark) {
                  :root:not([data-theme="light"]) .u074 {
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

                :root[data-theme="dark"] .u074,
                .dark .u074,
                [data-theme="dark"] .u074 {
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

                .u074, .u074 *, .u074 *::before, .u074 *::after {
                  box-sizing: border-box;
                }

                :where(.u074) :is(button,input,textarea,select) {
                  font: inherit;
                  color: inherit;
                }
                :where(.u074) button {
                  cursor: pointer;
                }
                .u074 :focus-visible {
                  outline: 2px solid var(--ux-accent);
                  outline-offset: 3px;
                }
                .u074 [hidden] {
                  display: none !important;
                }

                @media (prefers-reduced-motion: reduce) {
                  .u074, .u074 *, .u074 *::before, .u074 *::after {
                    animation-duration: .001ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: .001ms !important;
                    scroll-behavior: auto !important;
                  }
                }

                .u074-bell {
                  position: relative;
                  width: 40px;
                  height: 40px;
                  border: 0;
                  padding: 0;
                  border-radius: 50%;
                  display: grid;
                  place-items: center;
                  background: var(--ux-surface);
                  color: var(--ux-ink);
                  box-shadow: 0 0 0 1px var(--ux-line), 0 10px 20px -14px var(--ux-shadow-strong);
                  transition: transform .3s var(--ux-spring), background-color .2s;
                }
                .u074-bell:hover {
                  background: var(--ux-surface-2);
                }
                .u074-bell:active {
                  transform: scale(.9);
                }
                .u074-bell:focus-visible {
                  outline: 2px solid var(--ux-accent);
                  outline-offset: 2px;
                }
                .u074-bell svg {
                  width: 20px;
                  height: 20px;
                  fill: none;
                  stroke: currentColor;
                  stroke-width: 2;
                  stroke-linecap: round;
                  stroke-linejoin: round;
                  transform-origin: 50% 15%;
                }
                .u074-bell.ring svg {
                  animation: u074-ring .9s var(--ux-ease);
                }
                @keyframes u074-ring {
                  10% { transform: rotate(18deg); }
                  25% { transform: rotate(-16deg); }
                  40% { transform: rotate(12deg); }
                  55% { transform: rotate(-8deg); }
                  70% { transform: rotate(4deg); }
                }

                .u074-badge {
                  position: absolute;
                  right: -2px;
                  top: -2px;
                  min-width: 19px;
                  height: 19px;
                  padding: 0 5px;
                  border-radius: 10px;
                  background: #FF5A6E;
                  color: #fff;
                  font-size: 11px;
                  font-weight: 800;
                  line-height: 19px;
                  text-align: center;
                  box-shadow: 0 0 0 2px var(--ux-surface);
                  font-variant-numeric: tabular-nums;
                  transition: transform .4s var(--ux-spring);
                }
                .u074-badge.zero {
                  transform: scale(0);
                }

                .u074-pan {
                  position: absolute;
                  right: -6px;
                  top: calc(100% + 10px);
                  width: 360px;
                  max-width: calc(100vw - 28px);
                  display: flex;
                  flex-direction: column;
                  border-radius: 24px;
                  background: var(--ux-surface);
                  box-shadow: 0 0 0 1px var(--ux-line), 0 30px 50px -30px var(--ux-shadow-strong);
                  transform-origin: calc(100% - 24px) -8px;
                  transition: transform .45s var(--ux-spring), opacity .25s;
                  z-index: 60;
                  overflow: visible;
                }
                .u074-pan::before {
                  content: "";
                  position: absolute;
                  right: 20px;
                  top: -6px;
                  width: 13px;
                  height: 13px;
                  border-radius: 3px;
                  background: var(--ux-surface);
                  transform: rotate(45deg);
                  box-shadow: -1px -1px 0 0 var(--ux-line);
                }

                .u074.is-closed .u074-pan {
                  transform: scale(.4);
                  opacity: 0;
                  pointer-events: none;
                  transition: transform .3s var(--ux-ease), opacity .2s;
                }

                .u074-ph {
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  padding: 14px 14px 10px;
                  border-bottom: 1px solid var(--ux-line);
                }
                .u074-tab {
                  height: 30px;
                  padding: 0 12px;
                  border: 0;
                  border-radius: 999px;
                  background: none;
                  font-size: 12.5px;
                  font-weight: 700;
                  color: var(--ux-ink-3);
                  transition: background-color .25s, color .25s;
                }
                .u074-tab[aria-selected="true"] {
                  background: var(--ux-ink);
                  color: var(--ux-page);
                }
                .u074-tab:focus-visible, .u074-all:focus-visible {
                  outline: 2px solid var(--ux-accent);
                  outline-offset: 2px;
                }
                .u074-all {
                  margin-left: auto;
                  border: 0;
                  padding: 4px 6px;
                  background: none;
                  font-size: 12px;
                  font-weight: 700;
                  color: var(--ux-accent);
                  transition: opacity .2s;
                }
                .u074-all:disabled {
                  color: var(--ux-ink-3);
                  cursor: default;
                  opacity: 0.5;
                }

                .u074-list {
                  position: relative;
                  flex: 1;
                  margin: 0;
                  padding: 6px 8px 10px;
                  list-style: none;
                  overflow-y: auto;
                  overflow-x: hidden;
                  max-height: 380px;
                }
                .u074-it {
                  display: grid;
                  grid-template-rows: 1fr;
                  transition: grid-template-rows .45s var(--ux-ease);
                }
                .u074-it.new {
                  grid-template-rows: 0fr;
                }
                .u074-it.hide {
                  display: none;
                }
                .u074-it > div {
                  min-height: 0;
                  overflow: hidden;
                }
                .u074-row {
                  position: relative;
                  display: flex;
                  gap: 12px;
                  width: 100%;
                  padding: 10px 26px 10px 10px;
                  border: 0;
                  border-radius: 14px;
                  background: none;
                  text-align: left;
                  transition: background-color .2s, transform .5s var(--ux-spring), opacity .3s;
                }
                .u074-row:hover {
                  background: var(--ux-surface-2);
                }
                .u074-row:focus-visible {
                  outline: 2px solid var(--ux-accent);
                  outline-offset: -2px;
                }
                .u074-it.new .u074-row {
                  transform: translateY(-30px);
                  opacity: 0;
                }

                .u074-av {
                  position: relative;
                  width: 36px;
                  height: 36px;
                  flex: none;
                  border-radius: 50%;
                  background: var(--g);
                  display: grid;
                  place-items: center;
                }
                .u074-av em {
                  position: absolute;
                  right: -3px;
                  bottom: -3px;
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  display: grid;
                  place-items: center;
                  background: var(--ux-surface);
                  font-style: normal;
                  font-size: 10px;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }

                .u074-tx {
                  flex: 1;
                  min-width: 0;
                  font-size: 12.5px;
                  line-height: 1.45;
                  color: var(--ux-ink-2);
                }
                .u074-tx b {
                  display: block;
                  color: var(--ux-ink);
                  font-weight: 750;
                  letter-spacing: -.02em;
                  margin-bottom: 1px;
                }
                .u074-tx span {
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                }
                .u074-tx small {
                  display: block;
                  margin-top: 3px;
                  font-size: 11px;
                  font-weight: 600;
                  color: var(--ux-ink-3);
                }

                .u074-dot {
                  position: absolute;
                  right: 10px;
                  top: 50%;
                  width: 8px;
                  height: 8px;
                  margin-top: -4px;
                  border-radius: 50%;
                  background: var(--ux-accent);
                  transition: transform .35s var(--ux-spring), opacity .25s;
                }
                .u074-row.read .u074-dot {
                  transform: scale(0);
                  opacity: 0;
                }
                .u074-row.read .u074-tx {
                  color: var(--ux-ink-3);
                }
                .u074-row.read .u074-tx b {
                  color: var(--ux-ink-2);
                }

                .u074-empty {
                  padding: 28px 16px;
                  text-align: center;
                  font-size: 13px;
                  font-weight: 600;
                  color: var(--ux-ink-3);
                }
                .u074-live {
                  position: absolute;
                  width: 1px;
                  height: 1px;
                  overflow: hidden;
                  clip: rect(0 0 0 0);
                }
            `}</style>

            {/* Bell button */}
            <button
                ref={bellBtnRef}
                className={`u074-bell ${isRinging ? 'ring' : ''}`}
                type="button"
                aria-expanded={isOpen}
                aria-label={`Thông báo, ${unreadCount} chưa đọc`}
                onClick={() => setIsOpen((prev) => !prev)}
                onAnimationEnd={() => setIsRinging(false)}
            >
                <svg viewBox="0 0 22 22" aria-hidden="true">
                    <path d="M5.5 15V10a5.5 5.5 0 0 1 11 0v5l1.5 1.5h-14zM9 18.5a2 2 0 0 0 4 0" />
                </svg>
                <span
                    ref={badgeRef}
                    className={`u074-badge ${unreadCount === 0 ? 'zero' : ''}`}
                    aria-hidden="true"
                >
                    {unreadCount}
                </span>
            </button>

            {/* Dropdown panel */}
            <div
                className="u074-pan"
                role="region"
                aria-label="Danh sách thông báo"
                inert={!isOpen}
            >
                <div className="u074-ph" role="tablist" aria-label="Lọc thông báo">
                    <button
                        className="u074-tab"
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'all'}
                        onClick={() => setActiveTab('all')}
                    >
                        Tất cả
                    </button>
                    <button
                        className="u074-tab"
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'unread'}
                        onClick={() => setActiveTab('unread')}
                    >
                        Chưa đọc ({unreadCount})
                    </button>
                    <button
                        className="u074-all"
                        type="button"
                        disabled={unreadCount === 0}
                        onClick={handleMarkAllRead}
                    >
                        Đánh dấu đã đọc
                    </button>
                </div>

                <ul className="u074-list" aria-live="polite">
                    {filteredItems.length === 0 ? (
                        <li className="u074-empty">Không có thông báo nào</li>
                    ) : (
                        filteredItems.map((item) => (
                            <li
                                key={item.id}
                                className={`u074-it ${item.isNew ? 'new' : ''}`}
                            >
                                <div>
                                    <button
                                        type="button"
                                        className={`u074-row ${item.isRead ? 'read' : ''}`}
                                        aria-label={`${item.title}, ${item.content}, ${item.time}${
                                            item.isRead ? '' : ', chưa đọc'
                                        }`}
                                        onClick={() => handleItemClick(item.id)}
                                    >
                                        <span
                                            className="u074-av"
                                            style={{ '--g': item.gradient } as React.CSSProperties}
                                            aria-hidden="true"
                                        >
                                            <em>{item.icon}</em>
                                        </span>

                                        <span className="u074-tx">
                                            <b>{item.title}</b>
                                            <span>{item.content}</span>
                                            <small>{item.time}</small>
                                        </span>

                                        <span className="u074-dot" aria-hidden="true" />
                                    </button>
                                </div>
                            </li>
                        ))
                    )}
                </ul>

                <div className="u074-live" aria-live="polite">
                    {announcement}
                </div>
            </div>
        </div>
    );
};

export default NotificationBell;
