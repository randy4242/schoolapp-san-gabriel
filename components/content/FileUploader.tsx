
import React, { useState, useRef } from 'react';
import { apiService } from '../../services/apiService';

interface FileUploaderProps {
  evaluationId: number;
  contentId: number;
  onUploadComplete: () => void;
}

interface UploadStatus {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
}

export const FileUploader: React.FC<FileUploaderProps> = ({ evaluationId, contentId, onUploadComplete }) => {
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        progress: 0,
        status: 'pending' as const
      }));
      setUploads(prev => [...prev, ...newFiles]);
    }
  };

  const startUpload = async () => {
    setIsUploading(true);
    
    for (let i = 0; i < uploads.length; i++) {
      if (uploads[i].status === 'success') continue;

      // Update status to uploading
      setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'uploading' } : u));

      try {
        await apiService.uploadFile(
          evaluationId, 
          contentId, 
          uploads[i].file, 
          (pct) => {
            setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, progress: pct } : u));
          }
        );
        // Update status to success
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'success', progress: 100 } : u));
      } catch (error) {
        console.error(error);
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'error' } : u));
      }
    }

    setIsUploading(false);
    // Clear successful uploads after a short delay or notify parent
    const allSuccess = uploads.every(u => u.status === 'success'); // Re-check latest state
    if (onUploadComplete) onUploadComplete();
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 className="text-sm font-bold text-gray-700 mb-2">Adjuntar Archivos</h4>
      
      <div className="flex gap-2 mb-4">
        <input 
          type="file" 
          multiple 
          ref={fileInputRef}
          onChange={handleFilesSelected}
          className="hidden"
        />
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          + Seleccionar Archivos
        </button>
        {uploads.length > 0 && !isUploading && uploads.some(u => u.status !== 'success') && (
           <button 
           type="button"
           onClick={startUpload}
           className="px-3 py-2 bg-primary text-white rounded text-sm font-medium hover:opacity-90"
         >
           Iniciar Subida
         </button>
        )}
      </div>

      <div className="space-y-2">
        {uploads.map((upload, idx) => (
          <div key={idx} className="flex items-center text-sm bg-white p-2 rounded border border-gray-200">
            <div className="flex-1 truncate pr-4">
              <span className="font-medium">{upload.file.name}</span>
              <span className="text-gray-500 text-xs ml-2">({(upload.file.size / 1024).toFixed(0)} KB)</span>
            </div>
            <div className="w-24 mr-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${upload.status === 'error' ? 'bg-red-500' : 'bg-green-500'}`} 
                  style={{ width: `${upload.progress}%` }}
                ></div>
              </div>
            </div>
            <div className="w-6 text-right">
                {upload.status === 'success' && <span className="text-green-600">✓</span>}
                {upload.status === 'error' && <span className="text-red-600">✗</span>}
                {upload.status === 'uploading' && <span className="animate-spin text-primary">⟳</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};