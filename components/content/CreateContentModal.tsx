
import React, { useState } from 'react';
import { ContentType, CreateContentDTO } from '../../types';
import { apiService } from '../../services/apiService';
import Modal from '../Modal';
import { FileUploader } from './FileUploader';

interface CreateContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluationId: number;
  onSuccess: () => void;
}

export const CreateContentModal: React.FC<CreateContentModalProps> = ({ isOpen, onClose, evaluationId, onSuccess }) => {
  const [step, setStep] = useState<'details' | 'files'>('details');
  const [createdContentId, setCreatedContentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<CreateContentDTO>({
    title: '',
    description: '',
    contentType: ContentType.Text,
    textBody: '',
    orderIndex: 0,
    isPublic: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newContent = await apiService.createContent(evaluationId, formData);
      
      if (formData.contentType === ContentType.File) {
        setCreatedContentId(newContent.contentID);
        setStep('files');
      } else {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error(error);
      alert('Error al crear el contenido');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = () => {
    onSuccess();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar Contenido">
      {step === 'details' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Título</label>
            <input 
              type="text" 
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Descripción (Opcional)</label>
            <input 
              type="text" 
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo de Contenido</label>
            <div className="mt-2 flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="radio" 
                  name="contentType" 
                  value={ContentType.Text} 
                  checked={formData.contentType === ContentType.Text}
                  onChange={() => setFormData({...formData, contentType: ContentType.Text, textBody: ''})}
                  className="mr-2 text-primary focus:ring-primary"
                />
                Texto / HTML
              </label>
              <label className="flex items-center cursor-pointer">
                <input 
                  type="radio" 
                  name="contentType" 
                  value={ContentType.File} 
                  checked={formData.contentType === ContentType.File}
                  onChange={() => setFormData({...formData, contentType: ContentType.File, textBody: ''})}
                  className="mr-2 text-primary focus:ring-primary"
                />
                Archivos
              </label>
              <label className="flex items-center cursor-pointer">
                <input 
                  type="radio" 
                  name="contentType" 
                  value={ContentType.Video} 
                  checked={formData.contentType === ContentType.Video}
                  onChange={() => setFormData({...formData, contentType: ContentType.Video, textBody: ''})}
                  className="mr-2 text-primary focus:ring-primary"
                />
                Video Embebido
              </label>
            </div>
          </div>

          {formData.contentType === ContentType.Text && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Contenido</label>
              <textarea 
                rows={5}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md font-sans"
                placeholder="Escriba el contenido aquí..."
                value={formData.textBody || ''}
                onChange={e => setFormData({...formData, textBody: e.target.value})}
              />
            </div>
          )}

          {formData.contentType === ContentType.Video && (
            <div>
              <label className="block text-sm font-medium text-text-primary">URL del Video (YouTube/Vimeo)</label>
              <input 
                type="url" 
                required
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                placeholder="https://www.youtube.com/watch?v=..."
                value={formData.textBody || ''}
                onChange={e => setFormData({...formData, textBody: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">El video se incrustará automáticamente en la evaluación.</p>
            </div>
          )}

          {formData.contentType === ContentType.File && (
            <div className="p-3 bg-blue-50 rounded border border-blue-100 text-sm text-blue-800">
              Podrás subir los archivos en el siguiente paso.
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4 border-t">
             <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Cancelar</button>
             <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-opacity-90 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : (formData.contentType === ContentType.File ? 'Siguiente: Subir Archivos' : 'Crear Contenido')}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
           <div className="text-center text-gray-600 mb-4">
             Contenido <strong>{formData.title}</strong> creado. Ahora sube tus archivos.
           </div>
           {createdContentId && (
             <FileUploader 
                evaluationId={evaluationId} 
                contentId={createdContentId} 
                onUploadComplete={handleUploadComplete}
              />
           )}
           <div className="flex justify-end mt-4">
              <button onClick={handleUploadComplete} className="px-4 py-2 text-sm text-primary font-medium">Finalizar</button>
           </div>
        </div>
      )}
    </Modal>
  );
};