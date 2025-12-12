
import React, { useEffect, useState, useCallback } from 'react';
import { EvaluationContent, ContentType, EvaluationContentFile } from '../../types';
import { apiService } from '../../services/apiService';
import { CreateContentModal } from './CreateContentModal';
import { useAuth } from '../../hooks/useAuth';
import { EyeIcon, DownloadIcon } from '../icons';

interface Props {
  evaluationId: number;
}

// Helper to detect Video URL
const getEmbedUrl = (url: string) => {
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
  
  const ytMatch = url.match(youtubeRegex);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  
  return url;
};

// Icons
const FileIcon = ({ type }: { type: string }) => {
  const ext = type.toLowerCase();
  if (ext.includes('pdf')) return <span className="text-red-500 font-bold text-xs border border-red-200 bg-red-50 px-1 rounded">PDF</span>;
  if (ext.includes('image') || ext.includes('jpg') || ext.includes('png')) return <span className="text-purple-500 font-bold text-xs border border-purple-200 bg-purple-50 px-1 rounded">IMG</span>;
  if (ext.includes('word') || ext.includes('doc')) return <span className="text-blue-500 font-bold text-xs border border-blue-200 bg-blue-50 px-1 rounded">DOC</span>;
  return <span className="text-gray-500 font-bold text-xs border border-gray-200 bg-gray-50 px-1 rounded">FILE</span>;
};

export const EvaluationContentList: React.FC<Props> = ({ evaluationId }) => {
  const [contents, setContents] = useState<EvaluationContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  
  // Check if user is teacher or admin (roles 2, 6, 7, etc as per your app)
  const isTeacher = user && [2, 6, 7, 8, 9, 10].includes(user.roleId);

  const fetchContents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getContents(evaluationId);
      // Sort by orderIndex
      setContents(data.sort((a, b) => a.orderIndex - b.orderIndex));
    } catch (error) {
      console.error('Failed to load contents', error);
    } finally {
      setLoading(false);
    }
  }, [evaluationId]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  const getFullUrl = (file: EvaluationContentFile) => {
      const baseUrl = apiService.getBaseUrl().replace(/\/$/, "");
      // If fileUrl is already absolute, use it, otherwise prepend base
      return file.fileUrl.startsWith('http') ? file.fileUrl : `${baseUrl}${file.fileUrl}`;
  };

  const handleView = (file: EvaluationContentFile) => {
    const fullUrl = getFullUrl(file);
    window.open(fullUrl, '_blank');
  };

  const handleDownload = async (file: EvaluationContentFile) => {
    const fullUrl = getFullUrl(file);
    
    try {
        // Add headers to fetch to ensure auth is passed if required
        const response = await fetch(fullUrl, {
            headers: apiService.getAuthHeaders() as any
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.fileName; 
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
    } catch (e) {
        console.error("Download error", e);
        // Fallback to simple new tab open if fetch fails (e.g. CORS)
        window.open(fullUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-2 mb-4">
        <h2 className="text-xl font-bold text-gray-800">Contenido de la Evaluación</h2>
        {isTeacher && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-90 flex items-center"
          >
            <span className="mr-2 text-lg">+</span> Agregar Contenido
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando contenido...</div>
      ) : contents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">Aún no hay contenido publicado para esta evaluación.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {contents.map((item) => (
            <div key={item.contentID} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">{item.title}</h3>
                    {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                {/* Type TEXT */}
                {item.contentType === ContentType.Text && (
                  <div className="prose max-w-none text-gray-700 text-sm whitespace-pre-wrap font-sans">
                    {item.textBody}
                  </div>
                )}

                {/* Type FILES */}
                {item.contentType === ContentType.File && (
                  <div className="space-y-2">
                     {item.files && item.files.length > 0 ? (
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {item.files.map(file => (
                                <li 
                                  key={file.fileID} 
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200 transition-colors group"
                                >
                                    <div className="flex items-center flex-1 overflow-hidden">
                                        <FileIcon type={file.fileType} />
                                        <div className="ml-3 overflow-hidden">
                                            <p className="text-sm font-medium text-gray-700 truncate group-hover:text-blue-700" title={file.fileName}>{file.fileName}</p>
                                            <p className="text-xs text-gray-400">{file.fileSizeBytes ? `${(file.fileSizeBytes / 1024).toFixed(1)} KB` : ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleView(file); }}
                                            className="text-gray-500 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                                            title="Ver archivo"
                                        >
                                            <EyeIcon className="w-5 h-5"/>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                                            className="text-gray-500 hover:text-green-600 p-1 rounded hover:bg-green-50 transition-colors"
                                            title="Descargar archivo"
                                        >
                                            <DownloadIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                     ) : (
                        <p className="text-sm text-gray-400 italic">Sin archivos adjuntos.</p>
                     )}
                  </div>
                )}

                {/* Type VIDEO */}
                {item.contentType === ContentType.Video && item.textBody && (
                  <div className="aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden">
                    <iframe 
                        src={getEmbedUrl(item.textBody)} 
                        title={item.title}
                        className="w-full h-64 md:h-96"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                    ></iframe>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isTeacher && (
        <CreateContentModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            evaluationId={evaluationId}
            onSuccess={() => {
                fetchContents();
            }}
        />
      )}
    </div>
  );
};