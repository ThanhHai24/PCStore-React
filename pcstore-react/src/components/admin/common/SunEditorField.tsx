import React, { useEffect, useRef } from 'react';
import suneditor, { plugins } from 'suneditor';
import 'suneditor/css/editor';
import 'suneditor/css/contents';
import { AdminLabel } from './formElements';
import { uploadImage, validateImageFile } from '../../../services/imgbbService';

export interface SunEditorFieldProps {
    label?: React.ReactNode;
    required?: boolean;
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    height?: string;
    minHeight?: string;
    helperText?: string;
    error?: string;
    className?: string;
}

const EDITOR_PLUGINS = [
    plugins.font,
    plugins.fontSize,
    plugins.blockStyle,
    plugins.fontColor,
    plugins.backgroundColor,
    plugins.align,
    plugins.list_bulleted,
    plugins.list_numbered,
    plugins.lineHeight,
    plugins.blockquote,
    plugins.hr,
    plugins.table,
    plugins.link,
    plugins.image,
    plugins.video,
];

const EDITOR_BUTTON_LIST = [
    ['undo', 'redo'],
    '|',
    ['blockStyle', 'font', 'fontSize'],
    '|',
    ['bold', 'underline', 'italic', 'strike', 'removeFormat'],
    '|',
    ['fontColor', 'backgroundColor'],
    '|',
    ['align', 'list_bulleted', 'list_numbered', 'outdent', 'indent', 'lineHeight'],
    '|',
    ['blockquote', 'hr', 'table', 'link', 'image', 'video'],
    '|',
    ['fullScreen', 'codeView', 'preview'],
];

export const SunEditorField: React.FC<SunEditorFieldProps> = ({
    label,
    required,
    value,
    onChange,
    placeholder = 'Nhập mô tả chi tiết sản phẩm...',
    height = '320px',
    minHeight = '240px',
    helperText,
    error,
    className = '',
}) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const editorRef = useRef<SunEditor.Instance | null>(null);
    const onChangeRef = useRef(onChange);
    const lastValueRef = useRef<string>(value || '');

    onChangeRef.current = onChange;

    useEffect(() => {
        const target = textareaRef.current;
        if (!target) return;

        const instance = suneditor.create(target, {
            value: value || '',
            placeholder,
            width: '100%',
            height,
            minHeight,
            toolbar_sticky: -1,
            charCounter: true,
            plugins: EDITOR_PLUGINS,
            buttonList: EDITOR_BUTTON_LIST,
            image: {
                canResize: true,
                createFileInput: true,
                createUrlInput: true,
                allowMultiple: true,
            },
            events: {
                onChange: ({ data }) => {
                    const nextValue = data === '<p><br></p>' ? '' : data;
                    lastValueRef.current = nextValue;
                    onChangeRef.current(nextValue);
                },
                onImageUploadBefore: async ({ $, info }) => {
                    const files = info?.files;
                    if (!files || files.length === 0) {
                        return true;
                    }

                    const fileArray = Array.from(files);
                    try {
                        $.ui.showLoading();
                        for (const file of fileArray) {
                            const validation = validateImageFile(file, 32);
                            if (!validation.valid) {
                                $.ui.alertOpen(validation.error || 'Tệp ảnh không hợp lệ', 'error');
                                continue;
                            }
                            const uploadedUrl = await uploadImage(file);
                            const altAttr = (info.alt || file.name || '').replace(/"/g, '&quot;');
                            const widthStyle = info.inputWidth ? ` style="width: ${info.inputWidth};"` : '';
                            $.html.insert(
                                `<p><img src="${uploadedUrl}" alt="${altAttr}"${widthStyle} /></p>`,
                                { skipCleaning: false }
                            );
                        }
                    } catch (err: any) {
                        $.ui.alertOpen(err?.message || 'Tải ảnh lên thất bại', 'error');
                    } finally {
                        $.ui.hideLoading();
                    }

                    return false;
                },
            },
        });

        editorRef.current = instance;
        lastValueRef.current = value || '';

        return () => {
            try {
                instance.destroy();
            } catch {
                // Ignore cleanup errors if DOM node was already removed
            }
            editorRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const instance = editorRef.current;
        if (!instance) return;

        const incoming = value || '';
        if (incoming !== lastValueRef.current) {
            lastValueRef.current = incoming;
            instance.$.html.set(incoming);
        }
    }, [value]);

    return (
        <div className={className}>
            {label && <AdminLabel required={required}>{label}</AdminLabel>}
            <div
                className={`rounded-lg overflow-hidden border transition-all ${
                    error
                        ? 'border-rose-400 focus-within:ring-2 focus-within:ring-rose-500/20'
                        : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15'
                }`}
            >
                <textarea ref={textareaRef} className="hidden" defaultValue={value || ''} />
            </div>
            {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
            {!error && helperText && <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>}
        </div>
    );
};

export default SunEditorField;
