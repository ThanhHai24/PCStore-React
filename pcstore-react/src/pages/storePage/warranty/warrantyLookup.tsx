import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Barcode,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  Copy,
  Check,
  ExternalLink,
  Printer,
  RefreshCw,
  HelpCircle,
  MapPin,
  Phone,
  Sparkles,
  History,
  X,
  Cpu,
  Award,
} from 'lucide-react';
import {
  warrantyLookupService,
  type WarrantyLookupResult,
  type SuggestedSerialItem,
} from '../../../services/warrantyLookupService';

const RECENT_SERIALS_STORAGE_KEY = 'pcstore_recent_warranty_serials';

function formatDateVN(dateStr?: string | null): string {
  if (!dateStr) return 'Chưa cập nhật';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTimeVN(dateStr?: string | null): string {
  if (!dateStr) return 'Chưa cập nhật';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export const WarrantyLookup: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [serialInput, setSerialInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [result, setResult] = useState<WarrantyLookupResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedSerial, setCopiedSerial] = useState<boolean>(false);

  const [suggestedSerials, setSuggestedSerials] = useState<SuggestedSerialItem[]>([]);
  const [recentSerials, setRecentSerials] = useState<string[]>([]);

  // Load recent searched serials from localStorage & suggested serials
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SERIALS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSerials(parsed.slice(0, 5));
        }
      }
    } catch {
      // ignore
    }

    warrantyLookupService.getSuggestedSerials().then((list) => {
      setSuggestedSerials(list);
    });
  }, []);

  const saveRecentSerial = useCallback((serial: string) => {
    const clean = serial.trim().toUpperCase();
    if (!clean) return;
    setRecentSerials((prev) => {
      const next = [clean, ...prev.filter((s) => s.toUpperCase() !== clean)].slice(0, 5);
      try {
        localStorage.setItem(RECENT_SERIALS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const performLookup = useCallback(
    async (querySerial: string, updateUrl = true) => {
      const clean = querySerial.trim();
      if (!clean) {
        setErrorMessage('Vui lòng nhập mã số Serial (S/N) của sản phẩm để tra cứu.');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      setHasSearched(true);

      if (updateUrl) {
        setSearchParams({ serial: clean }, { replace: true });
      }

      try {
        const data = await warrantyLookupService.lookupBySerial(clean);
        if (data) {
          setResult(data);
          saveRecentSerial(data.serialNumber);
        } else {
          setResult(null);
          setErrorMessage(
            `Không tìm thấy thông tin bảo hành cho mã Serial "${clean}". Vui lòng kiểm tra lại ký tự vừa nhập hoặc liên hệ Hotline 1900.xxxx để được hỗ trợ.`
          );
        }
      } catch (err: any) {
        setResult(null);
        setErrorMessage(
          err?.message || 'Đã xảy ra lỗi trong quá trình tra cứu thông tin bảo hành.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [saveRecentSerial, setSearchParams]
  );

  // Auto-lookup if ?serial=... is in URL
  useEffect(() => {
    const urlSerial = searchParams.get('serial') || searchParams.get('sn');
    if (urlSerial && urlSerial.trim()) {
      setSerialInput(urlSerial.trim());
      performLookup(urlSerial.trim(), false);
    }
  }, [searchParams, performLookup]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(serialInput, true);
  };

  const handleSelectQuickSerial = (sn: string) => {
    setSerialInput(sn);
    performLookup(sn, true);
  };

  const handleClearRecent = () => {
    setRecentSerials([]);
    try {
      localStorage.removeItem(RECENT_SERIALS_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleCopySerial = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSerial(true);
    setTimeout(() => setCopiedSerial(false), 2000);
  };

  const handlePrintCertificate = () => {
    if (!result) return;
    const printWin = window.open('', '_blank', 'width=850,height=700');
    if (!printWin) return;

    const statusText =
      result.warrantyStatus === 'ACTIVE'
        ? 'CÒN HẠN BẢO HÀNH'
        : result.warrantyStatus === 'EXPIRING_SOON'
          ? 'SẮP HẾT HẠN BẢO HÀNH'
          : result.warrantyStatus === 'VOID'
            ? 'ĐÃ HỦY HIỆU LỰC'
            : 'ĐÃ HẾT HẠN BẢO HÀNH';

    printWin.document.write(`
      <html>
        <head>
          <title>Chứng Nhận Bảo Hành Điện Tử - ${result.serialNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1e293b; padding: 32px; margin: 0; }
            .cert-box { border: 2px solid #1d4ed8; border-radius: 16px; padding: 28px; max-width: 720px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
            .brand { font-size: 24px; font-weight: 900; color: #1d4ed8; }
            .badge { padding: 6px 14px; border-radius: 999px; font-weight: bold; font-size: 12px; background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
            .title { text-align: center; font-size: 20px; font-weight: 800; text-transform: uppercase; margin: 16px 0 24px; color: #0f172a; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
            .label { font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .val { font-size: 15px; font-weight: 700; color: #0f172a; }
            .dates { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
            .date-card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center; }
            .footer { margin-top: 24px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="cert-box">
            <div class="header">
              <div>
                <div class="brand">PCSTORE VIETNAM</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Hệ thống Bảo hành Điện tử Chính hãng</div>
              </div>
              <div class="badge">${statusText}</div>
            </div>
            <div class="title">CHỨNG NHẬN BẢO HÀNH ĐIỆN TỬ SẢN PHẨM</div>
            <div class="grid">
              <div class="card">
                <div class="label">Tên sản phẩm</div>
                <div class="val">${result.productName}</div>
                <div style="font-size: 12px; color: #475569; margin-top: 4px;">Mã SP: ${result.productCode} | Hãng: ${result.brandName}</div>
              </div>
              <div class="card">
                <div class="label">Số Serial (S/N) định danh</div>
                <div class="val" style="font-family: monospace; font-size: 17px; color: #1d4ed8;">${result.serialNumber}</div>
                <div style="font-size: 12px; color: #475569; margin-top: 4px;">Đơn hàng: ${result.orderCode || 'Chính hãng PCStore'}</div>
              </div>
            </div>
            <div class="dates">
              <div class="date-card">
                <div class="label">Ngày kích hoạt bảo hành</div>
                <div class="val" style="color: #0284c7;">${formatDateVN(result.startDate)}</div>
              </div>
              <div class="date-card">
                <div class="label">Ngày hết hạn bảo hành</div>
                <div class="val" style="color: #e11d48;">${formatDateVN(result.endDate)}</div>
              </div>
              <div class="date-card">
                <div class="label">Thời hạn còn lại</div>
                <div class="val" style="color: #16a34a;">${result.remainingDays > 0 ? `${result.remainingDays} ngày` : 'Đã hết hạn'}</div>
              </div>
            </div>
            <div class="card">
              <div class="label">Chính sách bảo hành áp dụng</div>
              <div class="val" style="font-size: 14px;">${result.policyName} (${result.durationMonths} tháng / ${result.durationDays} ngày)</div>
              <div style="font-size: 12px; color: #475569; margin-top: 4px;">${result.policyDescription}</div>
            </div>
            <div class="footer">
              <span>Thời điểm trích xuất: ${new Date().toLocaleString('vi-VN')}</span>
              <span>Hotline Bảo hành: 098.741.4899 - 0707.08.6666</span>
            </div>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="max-w-[1250px] mx-auto px-4 py-6 space-y-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 flex items-center space-x-1.5">
        <Link to="/" className="hover:text-blue-600 font-medium transition-colors">
          Trang chủ
        </Link>
        <span>&gt;</span>
        <span className="text-gray-800 font-bold uppercase">Tra cứu bảo hành sản phẩm</span>
      </nav>

      {/* Hero Search Section */}
      <div className="relative rounded-3xl overflow-hidden bg-blue-600 text-white shadow-xl border border-blue-400/20">
        {/* Decorative background circles */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 px-5 py-8 sm:px-10 sm:py-12 max-w-4xl mx-auto text-center space-y-6">

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Tra Cứu Thời Hạn Bảo Hành Sản Phẩm
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Nhập mã số <strong className="text-white">Serial (S/N)</strong> in trên tem sản phẩm, vỏ hộp hoặc phiếu xuất kho để kiểm tra thông tin sản phẩm.
            </p>
          </div>

          {/* Search Form */}
          <form
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto bg-white p-2 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-2 border-white/40"
          >
            <div className="relative flex-1 flex items-center">
              <Barcode className="w-5 h-5 text-blue-600 ml-3.5 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                placeholder="Nhập mã Serial sản phẩm (VD: GIGA-M27Q-FIFO-8821)..."
                className="w-full pl-3 pr-9 py-3 text-gray-900 placeholder-gray-400 text-sm sm:text-base font-mono font-bold focus:outline-none bg-transparent"
              />
              {serialInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSerialInput('');
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Xóa mã vừa nhập"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm px-7 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang tra cứu...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Tra Cứu Bảo Hành</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900">
              Đang truy xuất dữ liệu bảo hành điện tử...
            </h3>
            <p className="text-xs text-gray-500">
              Hệ thống đang kiểm tra mã Serial <span className="font-mono font-bold text-blue-600">{serialInput}</span> trên cơ sở dữ liệu chính hãng
            </p>
          </div>
        </div>
      )}

      {/* Error / Not Found State */}
      {!isLoading && hasSearched && errorMessage && !result && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-rose-200 shadow-sm max-w-3xl mx-auto text-center space-y-5 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <XCircle className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
              Không tìm thấy thông tin Serial
            </span>
            <h2 className="text-lg sm:text-xl font-black text-gray-900">
              Chưa tìm thấy dữ liệu bảo hành cho mã &ldquo;{serialInput}&rdquo;
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
              {errorMessage}
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 text-left text-xs text-gray-600 max-w-lg mx-auto space-y-2 border border-gray-200/80">
            <div className="font-bold text-gray-900 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Lưu ý khi nhập mã Serial (S/N):</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-gray-600 pl-1">
              <li>Nhập chính xác dãy ký tự chữ và số in dưới mã vạch (Barcode) trên vỏ hộp hoặc thân linh kiện.</li>
              <li>Không nhập mã vạch EAN/UPC hoặc mã Model sản phẩm vào ô Serial.</li>
              <li>Nếu bạn vừa mua hàng trong hôm nay, dữ liệu bảo hành điện tử có thể mất 15-30 phút để đồng bộ lên hệ thống.</li>
            </ul>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* WARRANTY LOOKUP RESULT SECTION                                      */}
      {/* =================================================================== */}
      {!isLoading && result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* 1. Top Status & Electronic Warranty Certificate Header */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-md overflow-hidden">
            {/* Status Header Bar */}
            <div
              className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${result.warrantyStatus === 'ACTIVE'
                ? 'bg-emerald-50/80 border-emerald-200'
                : result.warrantyStatus === 'EXPIRING_SOON'
                  ? 'bg-amber-50/80 border-amber-200'
                  : 'bg-rose-50/80 border-rose-200'
                }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${result.warrantyStatus === 'ACTIVE'
                    ? 'bg-emerald-600 text-white'
                    : result.warrantyStatus === 'EXPIRING_SOON'
                      ? 'bg-amber-500 text-white'
                      : 'bg-rose-600 text-white'
                    }`}
                >
                  {result.warrantyStatus === 'ACTIVE' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : result.warrantyStatus === 'EXPIRING_SOON' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full border ${result.warrantyStatus === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : result.warrantyStatus === 'EXPIRING_SOON'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                    >
                      {result.warrantyStatus === 'ACTIVE'
                        ? 'Đang trong thời hạn bảo hành'
                        : result.warrantyStatus === 'EXPIRING_SOON'
                          ? 'Sắp hết hạn bảo hành (≤ 30 ngày)'
                          : result.warrantyStatus === 'VOID'
                            ? 'Đã hủy hiệu lực bảo hành'
                            : 'Đã hết thời hạn bảo hành'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-600">Mã Serial (S/N):</span>
                    <span className="font-mono text-sm sm:text-base font-black text-gray-900 tracking-wide">
                      {result.serialNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopySerial(result.serialNumber)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-gray-200 hover:border-blue-400 text-[11px] font-semibold text-gray-700 hover:text-blue-600 transition-colors cursor-pointer"
                      title="Sao chép mã Serial"
                    >
                      {copiedSerial ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Highlight Warranty Dates Row (Ngày kích hoạt, Ngày hết hạn, Thời gian còn lại) */}
            <div className="p-6 bg-gradient-to-b from-gray-50/70 to-white border-b border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Ngày kích hoạt bảo hành */}
                <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-xs flex items-start space-x-4 relative overflow-hidden">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                      Ngày kích hoạt bảo hành
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-blue-700 font-mono">
                      {formatDateVN(result.startDate)}
                    </div>
                  </div>
                </div>

                {/* Card 2: Ngày hết hạn bảo hành */}
                <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-xs flex items-start space-x-4 relative overflow-hidden">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                      Ngày hết hạn bảo hành
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
                      {formatDateVN(result.endDate)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Product Information & Warranty Policy Details */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Product Info Card (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center space-x-2 border-b border-gray-100 pb-2.5">
                  <Package className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-extrabold text-gray-900 uppercase tracking-wide">
                    Thông Tin Sản Phẩm Chính Hãng
                  </h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 bg-gray-50/70 p-4 rounded-2xl border border-gray-200/80">
                  <div className="w-full sm:w-40 h-40 bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                    <img
                      src={result.productImage}
                      alt={result.productName}
                      className="max-w-full max-h-full object-contain hover:scale-105 transition-transform"
                    />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-700 font-bold text-xs">
                        {result.brandName}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-gray-200/80 text-gray-700 font-semibold text-xs">
                        {result.categoryName}
                      </span>
                      <span className="text-xs font-mono text-gray-500">
                        Mã SP: <strong className="text-gray-800">{result.productCode}</strong>
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-gray-900 leading-snug">
                      {result.productName}
                    </h3>

                    {result.productPrice && result.productPrice > 0 && (
                      <div className="text-xs text-gray-500">
                        Giá niêm yết tham khảo:{' '}
                        <span className="text-sm font-extrabold text-red-600">
                          {result.productPrice.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    )}

                    <div className="pt-1 flex flex-wrap items-center gap-2.5">
                      {result.productId && (
                        <Link
                          to={`/product/${result.productId}`}
                          className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-colors"
                        >
                          <span>Xem chi tiết sản phẩm</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Specifications Table */}
                {result.specifications && result.specifications.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-blue-600" />
                      <span>Thông số kỹ thuật thiết bị</span>
                    </h4>
                    <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100 text-xs">
                      {result.specifications.slice(0, 6).map((spec, idx) => (
                        <div
                          key={idx}
                          className={`grid grid-cols-12 px-4 py-2.5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
                            }`}
                        >
                          <div className="col-span-4 font-semibold text-gray-600">
                            {spec.key}
                          </div>
                          <div className="col-span-8 font-bold text-gray-900">
                            {spec.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Warranty Policy & Purchase Details (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                <div className="flex items-center space-x-2 border-b border-gray-100 pb-2.5">
                  <Award className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-extrabold text-gray-900 uppercase tracking-wide">
                    Chi Tiết Bảo hành
                  </h2>
                </div>

                <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 space-y-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                      Chính sách bảo hành áp dụng
                    </div>
                    <div className="text-sm sm:text-base font-black text-gray-900 mt-1">
                      {result.policyName}
                    </div>
                    <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                      {result.policyDescription}
                    </p>
                  </div>

                  <div className="border-t border-blue-100 pt-3 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Số Serial (S/N):</span>
                      <span className="font-mono font-bold text-gray-900">
                        {result.serialNumber}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Ngày kích hoạt bảo hành:</span>
                      <span className="font-bold text-blue-700">
                        {formatDateVN(result.startDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Ngày hết hạn bảo hành:</span>
                      <span className="font-bold text-rose-600">
                        {formatDateVN(result.endDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Thời hạn bảo hành chuẩn:</span>
                      <span className="font-bold text-gray-900">
                        {result.durationMonths} tháng ({result.durationDays} ngày)
                      </span>
                    </div>
                    {result.orderCode && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Mã đơn hàng xuất bán:</span>
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {result.orderCode}
                        </span>
                      </div>
                    )}
                    {result.customerName && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Khách hàng sở hữu:</span>
                        <span className="font-bold text-gray-900">
                          {result.customerName}{' '}
                          {result.customerPhoneMasked ? `(${result.customerPhoneMasked})` : ''}
                        </span>
                      </div>
                    )}
                    {result.goodsReceiptCode && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Mã lô nhập kho chính hãng:</span>
                        <span className="font-mono font-semibold text-gray-700">
                          {result.goodsReceiptCode}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Số lần đã tiếp nhận bảo hành:</span>
                      <span className="font-bold text-emerald-700">
                        {result.requestsCount} lần
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Warranty Lifecycle Timeline */}
            {result.timeline && result.timeline.length > 0 && (
              <div className="px-6 pb-6 pt-2 border-t border-gray-100">
                <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2 pt-4">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Lịch Sử Kích Hoạt & Bảo Hành Thiết Bị</span>
                </h3>
                <div className="relative border-l-2 border-blue-200 ml-3 space-y-4 pl-6 py-1">
                  {result.timeline.map((event, idx) => (
                    <div key={event.id || idx} className="relative">
                      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white bg-blue-600 ring-4 ring-blue-50" />
                      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/80">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-gray-900 text-xs sm:text-sm">
                            {event.title}
                          </span>
                          <span className="text-[11px] font-mono text-gray-500 bg-white px-2.5 py-0.5 rounded-md border border-gray-200 w-fit">
                            {formatDateTimeVN(event.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {event.description}
                        </p>
                        {event.actor && (
                          <div className="mt-1.5 text-[11px] text-gray-400">
                            Đơn vị thực hiện: <strong className="text-gray-700">{event.actor}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* GUIDE: HOW TO FIND SERIAL NUMBER & WARRANTY COMMITMENTS             */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* Left: Where to find S/N */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-gray-100 pb-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900">
                Hướng Dẫn Tìm Mã Số Serial (S/N) Trên Sản Phẩm
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xs">
                01
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Trên Vỏ Hộp & Tem Hãng</h3>
              <p className="text-gray-600 leading-relaxed">
                Tìm nhãn mã vạch của nhà sản xuất dán ở mặt hông vỏ hộp, dòng chữ ký hiệu{' '}
                <strong className="text-gray-900">S/N</strong> hoặc{' '}
                <strong className="text-gray-900">Serial No.</strong>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xs">
                02
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Trên Thân Linh Kiện</h3>
              <p className="text-gray-600 leading-relaxed">
                Tem Serial được dán trực tiếp trên Backplate (VGA), khe ATX 24-pin (Mainboard), mặt lưng (Màn hình / Laptop) hoặc thân ổ cứng SSD/RAM.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xs">
                03
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Trên Hóa Đơn Mua Hàng</h3>
              <p className="text-gray-600 leading-relaxed">
                Mã Serial xuất kho được in trực tiếp trên Phiếu xuất kho kiêm bảo hành hoặc trong lịch sử đơn hàng của bạn.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Warranty Center Contacts */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-gray-100 pb-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900">
                Trung Tâm Tiếp Nhận Bảo Hành
              </h2>
              <p className="text-xs text-gray-500">
                Làm việc từ 08:30 – 20:30 tất cả các ngày trong tuần
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-blue-700">TT Bảo Hành Hà Nội - Cơ sở 1</div>
                <div className="text-gray-600 mt-0.5">
                  123, Hà Nội.
                </div>
              </div>
              <a
                href="tel:0987414899"
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>0912.345.999</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarrantyLookup;
