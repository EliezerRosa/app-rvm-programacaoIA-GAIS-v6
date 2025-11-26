
import React from 'react';
import { Workbook } from '../types';
import { EyeIcon, TrashIcon, DocumentTextIcon, PencilIcon } from './icons';

interface WorkbookListProps {
  workbooks: Workbook[];
  onDelete: (workbook: Workbook) => void;
  onEdit: (workbook: Workbook) => void;
}

const WorkbookList: React.FC<WorkbookListProps> = ({ workbooks, onDelete, onEdit }) => {

  const handleView = (workbook: Workbook) => {
    try {
      const byteCharacters = atob(workbook.fileData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const file = new Blob([byteArray], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
    } catch (e) {
      console.error("Error opening PDF", e);
      alert("Não foi possível abrir o PDF. O arquivo pode estar corrompido.");
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {workbooks.map((workbook) => (
          <li key={workbook.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10 text-indigo-600">
                  <DocumentTextIcon />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{workbook.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Upload em: {formatDate(workbook.uploadDate)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => handleView(workbook)} className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-500">
                  <EyeIcon className="w-5 h-5" />
                  <span className="sr-only">Visualizar</span>
                </button>
                <button onClick={() => onEdit(workbook)} className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-500">
                  <PencilIcon className="w-5 h-5" />
                  <span className="sr-only">Editar</span>
                </button>
                <button onClick={() => onDelete(workbook)} className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400">
                  <TrashIcon className="w-5 h-5" />
                   <span className="sr-only">Excluir</span>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WorkbookList;