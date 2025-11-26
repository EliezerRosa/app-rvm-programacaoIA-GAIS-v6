import React, { useState } from 'react';

interface ScheduleUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
  isGenerating: boolean;
}

const ScheduleUploadModal: React.FC<ScheduleUploadModalProps> = ({ isOpen, onClose, onUpload, isGenerating }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const MAX_SIZE_MB = 5;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        if (selectedFile.type !== 'application/pdf') {
            e.target.value = '';
            setFile(null);
            setError('Por favor, selecione um arquivo PDF.');
            return;
        }

        if (selectedFile.size > MAX_SIZE_BYTES) {
            e.target.value = '';
            setFile(null);
            setError(`O arquivo é muito grande. O limite é de ${MAX_SIZE_MB}MB.`);
            return;
        }
        setFile(selectedFile);
        setError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor, selecione um arquivo PDF.');
      return;
    }
    onUpload(file);
  };

  const handleClose = () => {
    if (isGenerating) return;
    setFile(null);
    setError('');
    const fileInput = document.getElementById('schedule-pdf-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={handleClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Adicionar Pauta via PDF</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Faça o upload de uma apostila em PDF. A IA irá analisar o conteúdo, extrair as partes e sugerir designações para os publicadores com base no histórico e nas regras definidas.
          </p>
          <div>
            <label htmlFor="schedule-pdf-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Arquivo PDF da Apostila</label>
            <div className="mt-1">
              <input
                id="schedule-pdf-upload"
                name="schedule-pdf-upload"
                type="file"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                accept="application/pdf"
                onChange={handleFileChange}
              />
            </div>
             {file && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Arquivo selecionado: {file.name}</p>}
             {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button type="button" onClick={handleClose} disabled={isGenerating} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={!file || isGenerating} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-300 disabled:cursor-not-allowed">
              {isGenerating ? 'Analisando e Gerando...' : 'Gerar Pauta com IA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleUploadModal;
