import React, { useState, useEffect } from 'react';
import { Workbook } from '../types';
import { generateUUID } from '../lib/utils';

interface WorkbookUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workbook: Workbook) => void;
  workbookToEdit: Workbook | null;
}

const WorkbookUploadModal: React.FC<WorkbookUploadModalProps> = ({ isOpen, onClose, onSave, workbookToEdit }) => {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const MAX_SIZE_MB = 5; // Limite seguro para localStorage
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  useEffect(() => {
    if (isOpen) {
        if (workbookToEdit) {
            setName(workbookToEdit.name);
        } else {
            setName('');
        }
        // Always reset file and error on open
        setFile(null);
        setError('');
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    }
  }, [isOpen, workbookToEdit]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        if (selectedFile.type !== 'application/pdf') {
            e.target.value = ''; // Reset file input
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
        if (!name && !workbookToEdit) { // Only autofill if name is empty on creation
          setName(selectedFile.name.replace(/\.pdf$/i, ''));
        }
        setError('');
    }
  };

  const handleClose = () => {
    setIsUploading(false); // Make sure this is reset
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome da apostila é obrigatório.');
      return;
    }

    if (!workbookToEdit && !file) {
      setError('Por favor, selecione um arquivo PDF.');
      return;
    }
    
    setIsUploading(true);

    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            const workbookData: Workbook = {
                id: workbookToEdit ? workbookToEdit.id : generateUUID(),
                name,
                fileData: base64String,
                uploadDate: new Date().toISOString(), // Always update date on new file upload
            };
            onSave(workbookData);
            handleClose();
        };
        reader.onerror = () => {
            setError("Ocorreu um erro ao ler o arquivo.");
            setIsUploading(false);
        }
        reader.readAsDataURL(file);
    } else if (workbookToEdit) {
        const updatedWorkbook: Workbook = {
            ...workbookToEdit,
            name: name,
        };
        onSave(updatedWorkbook);
        handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={handleClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4 flex flex-col" style={{maxHeight: '90vh'}} onClick={e => e.stopPropagation()}>
        <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {workbookToEdit ? 'Editar Apostila' : 'Fazer Upload de Apostila'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden">
          <div className="p-6 flex-grow overflow-y-auto space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome da Apostila</label>
              <input type="text" name="name" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm text-black"/>
            </div>
            <div>
                <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Arquivo PDF</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                <span>Selecione um arquivo</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="application/pdf" onChange={handleFileChange} />
                            </label>
                            <p className="pl-1">ou arraste e solte aqui</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-500">PDF até {MAX_SIZE_MB}MB {workbookToEdit && '(Opcional para substituir o existente)'}</p>
                    </div>
                </div>
                {file && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{workbookToEdit ? 'Novo arquivo selecionado:' : 'Arquivo selecionado:'} {file.name}</p>}
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
          <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end space-x-3">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
              Cancelar
            </button>
            <button type="submit" disabled={isUploading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed">
              {isUploading ? 'Enviando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkbookUploadModal;