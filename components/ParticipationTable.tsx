

import React from 'react';
import { Participation, ParticipationType } from '../types';
import { PencilIcon, TrashIcon } from './icons';

interface ParticipationTableProps {
  participations: Participation[];
  onEdit: (participation: Participation) => void;
  onDelete: (participation: Participation) => void;
}

const ParticipationTable: React.FC<ParticipationTableProps> = ({ participations, onEdit, onDelete }) => {
  
  const getTypeColor = (type: ParticipationType) => {
    switch (type) {
        case ParticipationType.TESOUROS: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        case ParticipationType.MINISTERIO: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        case ParticipationType.VIDA_CRISTA: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        case ParticipationType.ORACAO_INICIAL:
        case ParticipationType.ORACAO_FINAL:
             return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        case ParticipationType.PRESIDENTE:
        case ParticipationType.DIRIGENTE:
             return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
        case ParticipationType.CANTICO:
        case ParticipationType.COMENTARIOS_FINAIS:
             return 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nome</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Semana</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Parte</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Ações</span>
                </th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {participations.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{p.publisherName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{p.week}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{p.partTitle}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(p.type)}`}>
                            {p.type}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-4">
                            <button onClick={() => onEdit(p)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200">
                                <PencilIcon className="w-5 h-5"/>
                            </button>
                            <button onClick={() => onDelete(p)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        
        {/* Mobile Card View */}
        <div className="md:hidden">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {participations.map((p) => (
                    <li key={p.id} className="p-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.publisherName}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{p.week}</p>
                                 <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{p.partTitle}</p>
                            </div>
                            <div className="flex-shrink-0 flex items-center space-x-2">
                                <button onClick={() => onEdit(p)} className="p-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200">
                                    <PencilIcon className="w-5 h-5"/>
                                </button>
                                <button onClick={() => onDelete(p)} className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                        <div className="mt-2">
                             <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(p.type)}`}>
                                {p.type}
                            </span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    </div>
  );
};

export default ParticipationTable;