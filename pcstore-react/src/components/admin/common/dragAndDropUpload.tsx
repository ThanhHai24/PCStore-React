// Lucian UX/UI Prompt #032 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#032
import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface UploadFileItem {
    id: string;
    file: File;
    name: string;
    size: number;
    extension: string;
    typeColor: string;
    progress: number;
    status: 'uploading' | 'done' | 'fail';
    statusText: string;
    previewUrl?: string;
}

export interface DragAndDropUploadProps {
    multiple?: boolean;
    accept?: string;
    maxFiles?: number;
    maxSizeMB?: number;
    title?: string;
    browseText?: string;
    subtitle?: string;
    className?: string;
    showFileList?: boolean;
    autoUpload?: boolean;
    onFileSelect?: (file: File) => void;
    onFilesSelect?: (files: File[]) => void;
    onUpload?: (file: File) => Promise<string>;
    onSuccess?: (file: File, url?: string) => void;
    onError?: (file: File, error: Error) => void;
}

const TYPE_COLORS: Record<string, string> = {
    pdf: '#E5484D',
    png: '#3D8BFF',
    jpg: '#22A06B',
    jpeg: '#22A06B',
    webp: '#00B4D8',
    gif: '#F77F00',
    svg: '#E056FD',
    fig: '#8B6CFF',
};

function formatSize(bytes: number): string {
    if (bytes >= 1048576) {
        return (bytes / 1048576).toFixed(1) + ' MB';
    }
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

export const DragAndDropUpload: React.FC<DragAndDropUploadProps> = ({
    multiple = false,
    accept = 'image/*',
    maxFiles = 10,
    maxSizeMB = 32,
    title = 'Kéo thả tệp ảnh vào đây hoặc',
    browseText = 'chọn từ máy',
    subtitle = 'PNG, JPG, WEBP, GIF · Tối đa 32 MB mỗi tệp',
    className = '',
    showFileList = true,
    onFileSelect,
    onFilesSelect,
    onUpload,
    onSuccess,
    onError,
}) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isOver, setIsOver] = useState(false);
    const dragDepth = useRef(0);
    const [fileList, setFileList] = useState<UploadFileItem[]>([]);

    // Detect prefers-reduced-motion
    const [reducedMotion, setReducedMotion] = useState(false);
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(mediaQuery.matches);
        const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
    }, []);

    // Clean up created object URLs on unmount
    useEffect(() => {
        return () => {
            fileList.forEach((item) => {
                if (item.previewUrl) {
                    URL.revokeObjectURL(item.previewUrl);
                }
            });
        };
    }, [fileList]);

    const runUploadAnimation = useCallback(
        (item: UploadFileItem) => {
            const bytes = item.size;
            const startTime = performance.now();
            const duration = reducedMotion ? 250 : 1000 + Math.random() * 600;

            let animId: number;
            let isCancelled = false;

            const updateItem = (updates: Partial<UploadFileItem>) => {
                setFileList((prev) =>
                    prev.map((it) => (it.id === item.id ? { ...it, ...updates } : it))
                );
            };

            // If actual upload function is provided
            if (onUpload) {
                let uploadCompleted = false;
                let uploadFailed = false;
                let uploadedUrl = '';
                let failError: any = null;

                onUpload(item.file)
                    .then((url) => {
                        uploadCompleted = true;
                        uploadedUrl = url;
                        onSuccess?.(item.file, url);
                    })
                    .catch((err) => {
                        uploadFailed = true;
                        failError = err;
                        onError?.(item.file, err);
                    });

                const frame = (now: number) => {
                    if (isCancelled) return;
                    const elapsed = now - startTime;
                    const p = Math.min(1, elapsed / duration);

                    if (uploadFailed) {
                        updateItem({
                            progress: 0.62,
                            status: 'fail',
                            statusText: `Lỗi tải lên · dừng ở 62%`,
                        });
                        return;
                    }

                    if (p < 0.9 || !uploadCompleted) {
                        const shownP = Math.min(p, 0.9);
                        updateItem({
                            progress: shownP,
                            statusText: `${formatSize(bytes * shownP)} / ${formatSize(bytes)} · ${Math.round(
                                shownP * 100
                            )}%`,
                        });
                        animId = requestAnimationFrame(frame);
                    } else {
                        updateItem({
                            progress: 1,
                            status: 'done',
                            statusText: `${formatSize(bytes)} · Đã tải lên`,
                        });
                        if (onFileSelect) onFileSelect(item.file);
                        if (onFilesSelect) onFilesSelect([item.file]);
                    }
                };

                animId = requestAnimationFrame(frame);
            } else {
                // Simulated smooth progress with real file handover
                const frame = (now: number) => {
                    if (isCancelled) return;
                    const elapsed = now - startTime;
                    const p = Math.min(1, elapsed / duration);

                    updateItem({
                        progress: p,
                        statusText: `${formatSize(bytes * p)} / ${formatSize(bytes)} · ${Math.round(
                            p * 100
                        )}%`,
                    });

                    if (p < 1) {
                        animId = requestAnimationFrame(frame);
                    } else {
                        updateItem({
                            progress: 1,
                            status: 'done',
                            statusText: `${formatSize(bytes)} · Sẵn sàng`,
                        });
                        if (onFileSelect) onFileSelect(item.file);
                        if (onFilesSelect) onFilesSelect([item.file]);
                        onSuccess?.(item.file);
                    }
                };

                animId = requestAnimationFrame(frame);
            }

            return () => {
                isCancelled = true;
                cancelAnimationFrame(animId);
            };
        },
        [reducedMotion, onUpload, onSuccess, onError, onFileSelect, onFilesSelect]
    );

    // Add files to upload queue
    const addFiles = useCallback(
        (files: FileList | File[]) => {
            const arr = Array.from(files);
            if (arr.length === 0) return;

            if (!showFileList) {
                // If file list below is disabled, immediately pass valid files
                const validFiles = arr.filter(
                    (file) => !maxSizeMB || file.size <= maxSizeMB * 1024 * 1024
                );
                if (validFiles.length > 0) {
                    if (onFileSelect) onFileSelect(validFiles[0]);
                    if (onFilesSelect) onFilesSelect(validFiles);
                    onSuccess?.(validFiles[0]);
                }
                return;
            }

            const newItems: UploadFileItem[] = [];

            for (const file of arr) {
                // Size validation
                if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
                    const ext = (file.name.split('.').pop() || '').toLowerCase();
                    newItems.push({
                        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        file,
                        name: file.name,
                        size: file.size,
                        extension: ext.slice(0, 4).toUpperCase() || 'FILE',
                        typeColor: TYPE_COLORS[ext] || '#8E8A97',
                        progress: 0.45,
                        status: 'fail',
                        statusText: `Vượt quá giới hạn ${maxSizeMB} MB`,
                    });
                    continue;
                }

                const ext = (file.name.split('.').pop() || '').toLowerCase();
                const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;

                const item: UploadFileItem = {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    file,
                    name: file.name,
                    size: file.size,
                    extension: ext.slice(0, 4).toUpperCase() || 'FILE',
                    typeColor: TYPE_COLORS[ext] || '#8E8A97',
                    progress: 0,
                    status: 'uploading',
                    statusText: `0 KB / ${formatSize(file.size)} · 0%`,
                    previewUrl: preview,
                };

                newItems.push(item);
            }

            if (!multiple) {
                // Single mode: replace list
                setFileList(newItems.slice(0, 1));
                if (newItems[0] && newItems[0].status === 'uploading') {
                    runUploadAnimation(newItems[0]);
                }
            } else {
                // Multiple mode: keep at most maxFiles
                setFileList((prev) => {
                    const combined = [...newItems, ...prev].slice(0, maxFiles);
                    return combined;
                });
                newItems.forEach((it) => {
                    if (it.status === 'uploading') {
                        runUploadAnimation(it);
                    }
                });
            }
        },
        [multiple, maxFiles, maxSizeMB, runUploadAnimation]
    );

    // Retry a failed item
    const handleRetry = (id: string) => {
        const item = fileList.find((f) => f.id === id);
        if (!item) return;

        setFileList((prev) =>
            prev.map((it) =>
                it.id === id
                    ? {
                          ...it,
                          progress: 0,
                          status: 'uploading',
                          statusText: `Đang kết nối lại...`,
                      }
                    : it
            )
        );

        runUploadAnimation({
            ...item,
            progress: 0,
            status: 'uploading',
        });
    };

    // Drag and Drop Event Handlers
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepth.current++;
        setIsOver(true);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepth.current--;
        if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setIsOver(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepth.current = 0;
        setIsOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(e.target.files);
            e.target.value = '';
        }
    };

    const handleZoneClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div ref={rootRef} className={`ux u032-container ${className}`}>
            <style>{`
                .u032-container {
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
                    width: 100%;
                    max-width: 480px;
                    box-sizing: border-box;
                    font-family: inherit;
                    color: var(--ux-ink);
                    -webkit-font-smoothing: antialiased;
                }

                @media (prefers-color-scheme: dark) {
                    :root:not([data-theme="light"]) .u032-container,
                    .u032-container[data-theme="dark"] {
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

                .u032-zone {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 196px;
                    border: 0;
                    padding: 0 16px;
                    border-radius: 26px;
                    background: var(--ux-surface);
                    color: var(--ux-ink);
                    cursor: pointer;
                    transition: transform .5s var(--ux-spring), background-color .3s var(--ux-ease);
                    box-sizing: border-box;
                    text-align: center;
                }

                .u032-zone:focus-visible {
                    outline: 2px solid var(--ux-accent);
                    outline-offset: 4px;
                }

                .u032-zone svg.u032-dash {
                    position: absolute;
                    left: 1px;
                    top: 1px;
                    width: calc(100% - 2px);
                    height: calc(100% - 2px);
                    overflow: visible;
                    pointer-events: none;
                }

                .u032-dash rect {
                    fill: none;
                    stroke: var(--ux-line-2);
                    stroke-width: 2;
                    stroke-dasharray: 8 7;
                    transition: stroke .3s var(--ux-ease);
                }

                .u032-zone:hover .u032-dash rect,
                .u032-container.is-over .u032-dash rect {
                    stroke: var(--ux-accent);
                    animation: u032-march .9s linear infinite;
                }

                @keyframes u032-march {
                    to { stroke-dashoffset: -30; }
                }

                .u032-container.is-over .u032-zone {
                    transform: scale(1.03);
                    background: color-mix(in srgb, var(--ux-accent) 7%, var(--ux-surface));
                }

                .u032-orb {
                    width: 60px;
                    height: 60px;
                    border-radius: 20px;
                    display: grid;
                    place-items: center;
                    color: #fff;
                    background: linear-gradient(140deg, #5B8CFF, #8B6CFF);
                    box-shadow: 0 16px 28px -14px rgba(91,108,255,.8);
                    transition: transform .5s var(--ux-spring);
                }

                .u032-orb svg {
                    width: 28px;
                    height: 28px;
                    fill: none;
                    stroke: currentColor;
                    stroke-width: 2;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }

                .u032-zone:hover .u032-orb {
                    transform: translateY(-4px);
                }

                .u032-container.is-over .u032-orb {
                    transform: translateY(-8px) scale(1.1) rotate(-6deg);
                }

                .u032-zone b {
                    margin-top: 14px;
                    font-size: 15.5px;
                    font-weight: 720;
                    letter-spacing: -.02em;
                    color: var(--ux-ink);
                }

                .u032-zone b em {
                    font-style: normal;
                    color: var(--ux-accent);
                    margin-left: 4px;
                }

                .u032-zone small {
                    margin-top: 4px;
                    font-size: 12.5px;
                    color: var(--ux-ink-3);
                }

                .u032-file {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    opacity: 0;
                    pointer-events: none;
                }

                .u032-list {
                    margin: 14px 0 0;
                    padding: 0;
                    list-style: none;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .u032-row {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    height: 62px;
                    padding: 0 12px;
                    border-radius: 18px;
                    background: var(--ux-surface);
                    box-shadow: 0 0 0 1px var(--ux-line);
                    overflow: hidden;
                    animation: u032-in .5s var(--ux-spring);
                    box-sizing: border-box;
                }

                @keyframes u032-in {
                    from { transform: translateY(-10px) scale(.96); opacity: 0; }
                }

                .u032-ic {
                    width: 36px;
                    height: 40px;
                    flex: none;
                    border-radius: 9px;
                    display: grid;
                    place-items: end center;
                    padding-bottom: 5px;
                    font-size: 8.5px;
                    font-weight: 800;
                    letter-spacing: .04em;
                    color: #fff;
                    background: var(--c);
                    box-sizing: border-box;
                }

                .u032-meta {
                    flex: 1;
                    min-width: 0;
                }

                .u032-meta b {
                    display: block;
                    font-size: 14px;
                    font-weight: 660;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    color: var(--ux-ink);
                }

                .u032-meta small {
                    display: block;
                    margin-top: 3px;
                    font-size: 12px;
                    color: var(--ux-ink-3);
                    font-variant-numeric: tabular-nums;
                }

                .u032-bar {
                    position: absolute;
                    left: 0;
                    bottom: 0;
                    height: 3px;
                    width: 100%;
                    background: var(--ux-accent);
                    transform-origin: 0 50%;
                    transform: scaleX(var(--p, 0));
                    transition: transform .2s linear, background-color .3s, opacity .5s .4s;
                }

                .u032-row.done .u032-bar {
                    background: var(--ux-mint);
                    opacity: 0;
                }

                .u032-row.fail .u032-bar {
                    background: var(--ux-danger);
                }

                .u032-st {
                    width: 30px;
                    height: 30px;
                    flex: none;
                    border-radius: 50%;
                    display: grid;
                    place-items: center;
                }

                .u032-st svg {
                    width: 16px;
                    height: 16px;
                    fill: none;
                    stroke: currentColor;
                    stroke-width: 2.6;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }

                .u032-row.done .u032-st {
                    background: var(--ux-mint);
                    color: var(--ux-accent-ink);
                    animation: u032-pop .45s var(--ux-spring);
                }

                @keyframes u032-pop {
                    from { transform: scale(.3); }
                }

                .u032-row.done .u032-st path {
                    stroke-dasharray: 16;
                    stroke-dashoffset: 16;
                    animation: u032-draw .4s var(--ux-ease) .15s forwards;
                }

                @keyframes u032-draw {
                    to { stroke-dashoffset: 0; }
                }

                .u032-row.fail .u032-meta small {
                    color: var(--ux-danger);
                }

                .u032-retry {
                    height: 32px;
                    padding: 0 12px;
                    border: 0;
                    border-radius: 10px;
                    background: color-mix(in srgb, var(--ux-danger) 12%, transparent);
                    color: var(--ux-danger);
                    font-size: 12.5px;
                    font-weight: 700;
                    white-space: nowrap;
                    cursor: pointer;
                    transition: opacity .2s;
                }

                .u032-retry:hover {
                    opacity: 0.85;
                }

                .u032-retry:focus-visible {
                    outline: 2px solid var(--ux-danger);
                    outline-offset: 2px;
                }

                .u032-spin {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 2.5px solid var(--ux-surface-3);
                    border-top-color: var(--ux-accent);
                    animation: u032-rot .8s linear infinite;
                }

                @keyframes u032-rot {
                    to { transform: rotate(360deg); }
                }

                @media (prefers-reduced-motion: reduce) {
                    .u032-container,
                    .u032-container *,
                    .u032-container *::before,
                    .u032-container *::after {
                        animation-duration: .001ms !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: .001ms !important;
                        scroll-behavior: auto !important;
                    }
                }
            `}</style>

            <button
                className="u032-zone"
                type="button"
                onClick={handleZoneClick}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <svg className="u032-dash" aria-hidden="true">
                    <rect width="100%" height="100%" rx="25" />
                </svg>
                <span className="u032-orb" aria-hidden="true">
                    <svg viewBox="0 0 28 28">
                        <path d="M8.5 20.5H7a5 5 0 0 1-.6-10 7 7 0 0 1 13.4-1.6A5.5 5.5 0 0 1 21 20.5h-1.5M14 13v10M10.5 16.5L14 13l3.5 3.5" />
                    </svg>
                </span>
                <b>
                    {title} <em>{browseText}</em>
                </b>
                <small>{subtitle}</small>
            </button>

            <input
                ref={fileInputRef}
                className="u032-file"
                type="file"
                multiple={multiple}
                accept={accept}
                tabIndex={-1}
                aria-hidden="true"
                onChange={handleInputChange}
            />

            {showFileList && fileList.length > 0 && (
                <ul className="u032-list" aria-live="polite">
                    {fileList.map((item) => (
                        <li
                            key={item.id}
                            className={`u032-row ${
                                item.status === 'done'
                                    ? 'done'
                                    : item.status === 'fail'
                                    ? 'fail'
                                    : ''
                            }`}
                            style={{ '--p': item.progress } as React.CSSProperties}
                        >
                            <span
                                className="u032-ic"
                                style={{ '--c': item.typeColor } as React.CSSProperties}
                                aria-hidden="true"
                            >
                                {item.extension}
                            </span>
                            <span className="u032-meta">
                                <b>{item.name}</b>
                                <small>{item.statusText}</small>
                            </span>
                            <span className="u032-st">
                                {item.status === 'uploading' && (
                                    <span className="u032-spin" aria-hidden="true" />
                                )}
                                {item.status === 'done' && (
                                    <svg viewBox="0 0 16 16" aria-hidden="true">
                                        <path d="M3.5 8.4l3 3 6-6.4" />
                                    </svg>
                                )}
                                {item.status === 'fail' && (
                                    <button
                                        className="u032-retry"
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRetry(item.id);
                                        }}
                                    >
                                        Thử lại
                                    </button>
                                )}
                            </span>
                            <span className="u032-bar" aria-hidden="true" />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default DragAndDropUpload;

