import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Loader2, File as FileIcon, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { asBlob } from 'html-docx-js-typescript';
import { saveAs } from 'file-saver';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const previewRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Vui lòng chọn file PDF hoặc hình ảnh (JPG, PNG).');
        return;
      }
      setFile(selectedFile);
      setError('');
      setHtmlContent('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(droppedFile.type)) {
        setError('Vui lòng chọn file PDF hoặc hình ảnh (JPG, PNG).');
        return;
      }
      setFile(droppedFile);
      setError('');
      setHtmlContent('');
    }
  };

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError('');
    setHtmlContent('');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];

          const prompt = `Bạn là một chuyên gia về văn thư lưu trữ và Nghị định 30/2020/NĐ-CP của Việt Nam.
Tôi sẽ cung cấp cho bạn một file PDF hoặc hình ảnh văn bản.
Nhiệm vụ của bạn là:
1. Đọc và trích xuất toàn bộ nội dung văn bản từ file này.
2. Định dạng lại nội dung đó dưới dạng HTML để hiển thị trên web và có thể copy sang Word.
3. Áp dụng các quy tắc trình bày văn bản theo Nghị định 30/2020/NĐ-CP vào mã HTML bằng CSS inline (ví dụ: Quốc hiệu, Tiêu ngữ căn giữa, in đậm; Tên cơ quan ban hành; Số ký hiệu; Trích yếu; Nội dung căn đều hai bên, lùi đầu dòng; Chữ ký, nơi nhận...).
4. Sử dụng font chữ Times New Roman, cỡ chữ 14pt (hoặc 13pt tùy thành phần theo NĐ 30), line-height khoảng 1.5.
5. Chỉ trả về mã HTML sạch, không kèm theo markdown code block (như \`\`\`html) hay bất kỳ văn bản giải thích nào khác. Mã HTML của bạn sẽ được chèn trực tiếp vào thẻ <div>.`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type,
                },
              },
              prompt
            ],
            config: {
              temperature: 0.2,
            }
          });

          let resultHtml = response.text || '';
          resultHtml = resultHtml.replace(/^```html\n?/, '').replace(/\n?```$/, '');
          
          setHtmlContent(resultHtml);
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Đã xảy ra lỗi trong quá trình xử lý file.');
        } finally {
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        setError('Lỗi khi đọc file.');
        setIsProcessing(false);
      };
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Đã xảy ra lỗi.');
      setIsProcessing(false);
    }
  };

  const downloadWord = async () => {
    if (!htmlContent || !previewRef.current) return;

    const header = `<!DOCTYPE html><html>
    <head>
      <meta charset='utf-8'>
      <title>Export HTML to Word</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 14pt; }
        p { margin: 0 0 6pt 0; line-height: 1.5; }
        table { width: 100% !important; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid black; padding: 4px 8px; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; }
        img { max-width: 100%; height: auto; }
      </style>
    </head><body>`;
    const footer = "</body></html>";
    const sourceHTML = header + previewRef.current.innerHTML + footer;
    
    try {
      const blob = await asBlob(sourceHTML, {
        orientation: 'portrait',
        margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1 inch margins
      }) as Blob;
      
      saveAs(blob, `${file?.name.replace(/\.[^/.]+$/, "") || 'van-ban'}_ND30.docx`);
    } catch (err) {
      console.error('Error generating docx:', err);
      setError('Lỗi khi tạo file DOCX.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-semibold tracking-tight">Chuyển đổi PDF sang Word - phường Đông Mai</h1>
          </div>
          <div className="text-slate-500 text-sm hidden sm:block italic">
            Phát triển bởi phòng Văn Hóa - Xã Hội phường Đông Mai
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Upload */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-medium mb-4">1. Tải lên file PDF hoặc Ảnh</h2>
              
              <div 
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={handleFileChange}
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Kéo thả file PDF hoặc Ảnh vào đây</p>
                    <p className="text-xs text-slate-500 mt-1">Hỗ trợ PDF, JPG, PNG (văn bản chụp)</p>
                  </div>
                </div>
              </div>

              {file && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <FileIcon className="w-5 h-5 text-indigo-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button
                onClick={processFile}
                disabled={!file || isProcessing}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang xử lý (có thể mất vài phút)...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Chuyển đổi sang Word
                  </>
                )}
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-medium text-slate-900 mb-2">Hướng dẫn sử dụng</h3>
              <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
                <li>Tải lên file PDF hoặc Ảnh chụp văn bản (JPG, PNG).</li>
                <li>Hệ thống AI sẽ tự động đọc chữ và định dạng lại theo chuẩn Nghị định 30/2020/NĐ-CP.</li>
                <li>Kiểm tra lại nội dung ở phần Xem trước.</li>
                <li>Nhấn "Tải xuống Word" để lưu file về máy (định dạng .docx).</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">2. Xem trước & Tải về</h2>
              <button
                onClick={downloadWord}
                disabled={!htmlContent}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 py-1.5 px-3 rounded-md text-sm font-medium hover:bg-slate-50 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Download className="w-4 h-4" />
                Tải xuống Word
              </button>
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              {htmlContent ? (
                <div className="flex-1 overflow-auto p-8 bg-[#f3f4f6]">
                  {/* A4 Paper simulation */}
                  <div 
                    ref={previewRef}
                    className="bg-white mx-auto shadow-sm preview-content"
                    style={{
                      width: '210mm',
                      minHeight: '297mm',
                      padding: '20mm 15mm 20mm 30mm',
                      boxSizing: 'border-box',
                      fontFamily: '"Times New Roman", Times, serif',
                      fontSize: '14pt',
                      lineHeight: '1.5',
                      color: 'black',
                      overflowWrap: 'break-word',
                      wordWrap: 'break-word'
                    }}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                  <FileText className="w-12 h-12 mb-3 opacity-20" />
                  <p>Nội dung xem trước sẽ hiển thị ở đây sau khi chuyển đổi.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
