

import React from 'react';
import { Publisher } from '../types';
import { PencilIcon, TrashIcon, UserCircleIcon } from './icons';

interface PublisherTableProps {
  publishers: Publisher[];
  onEdit: (publisher: Publisher) => void;
  onDelete: (publisher: Publisher) => void;
}

const PublisherTable: React.FC<PublisherTableProps> = ({ publishers, onEdit, onDelete }) => {

  const formatPhone = (phone: string) => {
    if (!phone) return 'N/A';
    const cleaned = ('' + phone).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };
  
  const getGenderColor = (gender: 'brother' | 'sister') => {
      return gender === 'brother' ? 'text-blue-500' : 'text-pink-500';
  }

  const getAgeGroupTag = (ageGroup: string) => {
    switch (ageGroup) {
      case 'Jovem':
        return <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200">Jovem</span>;
      case 'Criança':
        return <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Criança</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nome</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Condição</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Telefone</th>
                <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Ações</span>
                </th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {publishers.map((publisher) => (
                <tr key={publisher.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 ${getGenderColor(publisher.gender)}`}>
                            <UserCircleIcon />
                        </div>
                        <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                          {publisher.name}
                          {!publisher.isServing && <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Não Atuante</span>}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{publisher.gender === 'brother' ? 'Irmão' : 'Irmã'}</div>
                        </div>
                    </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                publisher.condition === 'Ancião' || publisher.condition === 'Servo Ministerial' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            }`}>
                                {publisher.condition}
                            </span>
                             {getAgeGroupTag(publisher.ageGroup)}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatPhone(publisher.phone)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-4">
                            <button onClick={() => onEdit(publisher)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200">
                                <PencilIcon className="w-5 h-5"/>
                            </button>
                            <button onClick={() => onDelete(publisher)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200">
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
                {publishers.map((publisher) => (
                    <li key={publisher.id} className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className={`flex-shrink-0 h-10 w-10 ${getGenderColor(publisher.gender)}`}>
                                    <UserCircleIcon/>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                                      {publisher.name}
                                      {!publisher.isServing && <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Não Atuante</span>}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                        {publisher.condition}
                                        {getAgeGroupTag(publisher.ageGroup)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => onEdit(publisher)} className="p-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200">
                                    <PencilIcon className="w-5 h-5"/>
                                </button>
                                <button onClick={() => onDelete(publisher)} className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Telefone: {formatPhone(publisher.phone)}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    </div>
  );
};

export default PublisherTable;