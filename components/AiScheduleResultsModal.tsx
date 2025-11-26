import React from 'react';
import { AiScheduleResult } from '../types';
import { InformationCircleIcon } from './icons';

interface AiScheduleResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  results: AiScheduleResult[];
  workbookName: string;
}

const AiScheduleResultsModal: React.FC<AiScheduleResultsModalProps> = ({ isOpen, onClose, onSave, results, workbookName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 flex flex-col" style={{maxHeight: '90vh'}} onClick={e => e.stopPropagation()}>
        <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sugestões de Pauta para {workbookName}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Revise as designações sugeridas pela IA. Você pode salvá-las ou cancelar.</p>
        </div>
        
        <div className="flex-grow overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Parte</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Designado(s)</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {results.map((res, index) => (
                <tr key={index}>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{res.partTitle}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    <div className="flex items-center">
                        <span>
                          {res.helperName ? `${res.studentName} / ${res.helperName}` : res.studentName}
                        </span>
                        <span title={res.reason} className="ml-2 text-gray-400 hover:text-gray-600 cursor-help">
                            <InformationCircleIcon className="h-5 w-5" />
                        </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500">
            Cancelar
          </button>
          <button onClick={onSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">
            Salvar Designações
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiScheduleResultsModal;