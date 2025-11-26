
import React, { useMemo, useState } from 'react';
import { Publisher, Participation, PublisherStats, ParticipationType } from '../types';
import { ChartBarIcon, UserCircleIcon } from './icons';

interface StatisticsDashboardProps {
  publishers: Publisher[];
  participations: Participation[];
}

const StatCard: React.FC<{ title: string; value: string | number; icon?: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex items-center">
        {icon && <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 mr-4">{icon}</div>}
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
    </div>
);

const calculatePublisherStats = (publishers: Publisher[], participations: Participation[]): PublisherStats[] => {
    const publisherMap = new Map<string, Publisher>(publishers.map(p => [p.name, p]));
    const participationsByPublisher = new Map<string, Participation[]>();

    for (const part of participations) {
        if (publisherMap.has(part.publisherName)) {
            const pubId = publisherMap.get(part.publisherName)!.id;
            if (!participationsByPublisher.has(pubId)) {
                participationsByPublisher.set(pubId, []);
            }
            participationsByPublisher.get(pubId)!.push(part);
        }
    }

    return publishers.map(p => {
        const publisherParts = participationsByPublisher.get(p.id) || [];
        const stat: PublisherStats = {
            publisherId: p.id,
            publisherName: p.name,
            totalAssignments: publisherParts.length,
            lastAssignmentDate: null,
            lastAssignmentWeek: null,
            lastAssignmentTitle: null,
            lastAssignmentType: null,
            avgDaysBetweenAssignments: null,
        };

        if (publisherParts.length > 0) {
            const sortedParts = [...publisherParts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const lastPart = sortedParts[0];
            stat.lastAssignmentDate = lastPart.date;
            stat.lastAssignmentWeek = lastPart.week;
            stat.lastAssignmentTitle = lastPart.partTitle;
            stat.lastAssignmentType = lastPart.type;

            if (publisherParts.length > 1) {
                const dates = sortedParts.map(part => new Date(part.date).getTime()).reverse(); // ascending order
                const diffsInDays = [];
                for (let i = 1; i < dates.length; i++) {
                    const diffMillis = dates[i] - dates[i-1];
                    if (diffMillis > 0) { 
                       diffsInDays.push(diffMillis / (1000 * 60 * 60 * 24));
                    }
                }
                if (diffsInDays.length > 0) {
                    const totalDiff = diffsInDays.reduce((sum, diff) => sum + diff, 0);
                    stat.avgDaysBetweenAssignments = Math.round(totalDiff / diffsInDays.length);
                }
            }
        }
        return stat;
    });
};

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ publishers, participations }) => {
    const [sortKey, setSortKey] = useState<keyof PublisherStats>('lastAssignmentDate');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // Ascending date = mais antigo primeiro (bom para achar quem precisa de parte)
    const [searchTerm, setSearchTerm] = useState('');

    const publisherStats = useMemo(() => calculatePublisherStats(publishers, participations), [publishers, participations]);

    const generalStats = useMemo(() => {
        const activePublishers = publishers.filter(p => p.isServing).length;
        const totalAssignments = participations.filter(p => p.type !== ParticipationType.CANTICO).length;
        const avgPartsPerPublisher = activePublishers > 0 ? (totalAssignments / activePublishers).toFixed(1) : '0.0';
        return { activePublishers, totalAssignments, avgPartsPerPublisher };
    }, [publishers, participations]);

    const privilegeStats = useMemo(() => {
        const brothers = publishers.filter(p => p.gender === 'brother' && p.isServing);
        return {
            presidents: brothers.filter(b => b.privileges.canPreside).length,
            speakers: brothers.filter(b => b.privileges.canGiveTalks).length,
            cbsConducts: brothers.filter(b => b.privileges.canConductCBS).length,
            prayers: brothers.filter(b => b.privileges.canPray).length,
        };
    }, [publishers]);

    const sortedAndFilteredStats = useMemo(() => {
        return publisherStats
            .filter(stat => stat.publisherName.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                const valA = a[sortKey];
                const valB = b[sortKey];

                let comparison = 0;
                if (valA === null) return 1; // Nulls always last
                if (valB === null) return -1;
                if (valA > valB) {
                    comparison = 1;
                } else if (valA < valB) {
                    comparison = -1;
                }
                return sortOrder === 'asc' ? comparison : -comparison;
            });
    }, [publisherStats, searchTerm, sortKey, sortOrder]);

    const handleSort = (key: keyof PublisherStats) => {
        if (sortKey === key) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            // Se ordenar por data, padrão é ascendente (mais antigos no topo). 
            // Se ordenar por total, padrão é descendente (quem fez mais no topo).
            setSortOrder(key === 'lastAssignmentDate' ? 'asc' : 'desc');
        }
    };

    const formatDateRelative = (dateString: string | null) => {
        if (!dateString) return { text: 'Nunca', days: Infinity, color: 'text-red-600' };
        
        const now = new Date();
        const date = new Date(dateString);
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diffDays / 7);

        let color = 'text-gray-600 dark:text-gray-400';
        if (diffDays > 90) color = 'text-red-600 font-bold'; // +3 meses
        else if (diffDays > 30) color = 'text-yellow-600 dark:text-yellow-400'; // +1 mês
        else color = 'text-green-600 dark:text-green-400'; // Recente

        let text = '';
        if (weeks > 0) text = `${weeks} sem. atrás`;
        else text = `${diffDays} dias atrás`;

        return { text, days: diffDays, color };
    };
    
    const getSortIndicator = (key: keyof PublisherStats) => {
      if (sortKey !== key) return null;
      return sortOrder === 'asc' ? '▲' : '▼';
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Publicadores Atuantes" value={generalStats.activePublishers} icon={<UserCircleIcon className="w-6 h-6"/>} />
                <StatCard title="Total de Designações" value={generalStats.totalAssignments} icon={<ChartBarIcon className="w-6 h-6"/>} />
                <StatCard title="Média de Partes / Pub." value={generalStats.avgPartsPerPublisher} icon={<ChartBarIcon className="w-6 h-6" />} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Distribuição de Privilégios (Irmãos)</h3>
                    <ul className="space-y-2 text-sm">
                        <li className="flex justify-between"><span>Podem Presidir:</span> <span className="font-bold">{privilegeStats.presidents}</span></li>
                        <li className="flex justify-between"><span>Podem Fazer Discursos:</span> <span className="font-bold">{privilegeStats.speakers}</span></li>
                        <li className="flex justify-between"><span>Podem Dirigir EBC:</span> <span className="font-bold">{privilegeStats.cbsConducts}</span></li>
                        <li className="flex justify-between"><span>Podem Fazer Oração:</span> <span className="font-bold">{privilegeStats.prayers}</span></li>
                    </ul>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                 <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Análise de Participação por Publicador</h3>
                    <input type="search" placeholder="Buscar publicador..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="mt-2 w-full md:w-1/3 px-3 py-2 bg-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-black placeholder-gray-500 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"/>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th onClick={() => handleSort('publisherName')} className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer text-gray-500 dark:text-gray-300">Nome {getSortIndicator('publisherName')}</th>
                                <th onClick={() => handleSort('totalAssignments')} className="px-6 py-3 text-center text-xs font-medium uppercase cursor-pointer text-gray-500 dark:text-gray-300">Total Partes {getSortIndicator('totalAssignments')}</th>
                                <th onClick={() => handleSort('lastAssignmentDate')} className="px-6 py-3 text-left text-xs font-medium uppercase cursor-pointer text-gray-500 dark:text-gray-300">Última Designação {getSortIndicator('lastAssignmentDate')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-300">Detalhes da Última Parte</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {sortedAndFilteredStats.map(stat => {
                                const timeInfo = formatDateRelative(stat.lastAssignmentDate);
                                return (
                                    <tr key={stat.publisherId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{stat.publisherName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600 dark:text-gray-400">{stat.totalAssignments}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className={timeInfo.color}>{timeInfo.text}</div>
                                            <div className="text-xs text-gray-400">{stat.lastAssignmentDate ? new Date(stat.lastAssignmentDate).toLocaleDateString('pt-BR') : '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {stat.lastAssignmentTitle ? (
                                                <div>
                                                    <div className="font-medium truncate max-w-xs" title={stat.lastAssignmentTitle}>{stat.lastAssignmentTitle}</div>
                                                    <div className="text-xs inline-block px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 mt-1">{stat.lastAssignmentType}</div>
                                                </div>
                                            ) : <span className="text-gray-400 italic">Nenhuma</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};

export default StatisticsDashboard;
