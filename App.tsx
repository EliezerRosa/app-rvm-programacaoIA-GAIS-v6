import React, { useState, useEffect, useCallback, useMemo, ErrorInfo, ReactNode } from 'react';
import { Publisher, Participation, Workbook, Rule, MeetingData, ParticipationType, AiScheduleResult, SpecialEvent, EventTemplate } from './types';
import { initStorage, getAllData, savePublisher, deletePublisher, saveParticipation, deleteParticipation, deleteParticipationsByWeek, saveWorkbook, deleteWorkbook, saveRule, deleteRule, clearAllData, saveSpecialEvent, deleteSpecialEvent, getAllEventTemplates, saveEventTemplate, deleteEventTemplate, saveParticipationsBulk } from './lib/storage';
import PublisherTable from './components/PublisherTable';
import PublisherForm from './components/PublisherForm';
import ParticipationTable from './components/ParticipationTable';
import ParticipationForm from './components/ParticipationForm';
import WorkbookList from './components/WorkbookList';
import WorkbookUploadModal from './components/WorkbookUploadModal';
import ConfirmationModal from './components/ConfirmationModal';
import MeetingSchedule from './components/MeetingSchedule';
import MeetingScheduleForm from './components/MeetingScheduleForm';
import RuleManagerModal from './components/RuleManagerModal';
import AiSchedulerModal from './components/AiSchedulerModal';
import AiScheduleResultsModal from './components/AiScheduleResultsModal';
import SpecialEventsModal from './components/SpecialEventsModal';
import EventTemplateManagerModal from './components/EventTemplateManagerModal';
import HistoricalDataModal, { HistoricalData } from './components/HistoricalDataModal';
import StatisticsDashboard from './components/StatisticsDashboard';
import ManualAssignment, { ManualAssignmentState } from './components/ManualAssignment'; 
import DevTools from './components/DevTools';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, SparklesIcon, CogIcon, ClipboardDocumentCheckIcon } from './components/icons';
import { getScheduleHtml } from './lib/scheduleTemplate';
<<<<<<< HEAD
import { saveBackupToGithub, loadBackupFromGithub, GithubBackupConfig } from './lib/githubBackup';

    // --- GITHUB BACKUP (direto para EliezerRosa/app-rvm-programacaoIA-GAIS-v6) ---
    // GITHUB BACKUP MELHORADO
    const [githubToken, setGithubToken] = useState(() => localStorage.getItem('GITHUB_TOKEN') || '');
    const [githubStatus, setGithubStatus] = useState<string | null>(null);
    const [githubBranch, setGithubBranch] = useState('main');
    const [githubFile, setGithubFile] = useState('backup.json');
    const [githubFolder, setGithubFolder] = useState('backups');
    const githubConfig: GithubBackupConfig = {
        owner: 'EliezerRosa',
        repo: 'app-rvm-programacaoIA-GAIS-v6',
        path: `${githubFolder.replace(/\/$/, '')}/${githubFile}`,
        token: githubToken,
        branch: githubBranch
    };

    // Salva token no localStorage para automação
    useEffect(() => { localStorage.setItem('GITHUB_TOKEN', githubToken); }, [githubToken]);

    const handleGithubBackup = async () => {
        setGithubStatus('Salvando backup no GitHub...');
        try {
            const data = await getAllData();
            await saveBackupToGithub(githubConfig, data, `Backup manual via app (${githubFile})`);
            setGithubStatus('Backup salvo no GitHub com sucesso!');
        } catch (e: any) {
            setGithubStatus('Erro ao salvar backup no GitHub: ' + e.message);
        }
        setTimeout(() => setGithubStatus(null), 4000);
    };

    const handleGithubRestore = async () => {
        setGithubStatus('Carregando backup do GitHub...');
        try {
            const data = await loadBackupFromGithub(githubConfig);
            if (!data.publishers || !data.participations || !data.workbooks) {
                throw new Error('Arquivo de backup inválido.');
            }
            if (window.confirm('Isso substituirá TODOS os dados existentes. Tem certeza?')) {
                await clearAllData();
                await Promise.all([
                    ...data.publishers.map((p: Publisher) => savePublisher(p)),
                    saveParticipationsBulk(data.participations),
                    ...data.workbooks.map((w: Workbook) => saveWorkbook(w)),
                    ...(data.rules || []).map((r: Rule) => saveRule(r)),
                    ...(data.eventTemplates || []).map((t: EventTemplate) => saveEventTemplate(t)),
                    ...(data.specialEvents || []).map((e: SpecialEvent) => saveSpecialEvent(e)),
                ]);
                setGithubStatus('Backup restaurado do GitHub com sucesso!');
                loadData();
            } else {
                setGithubStatus(null);
            }
        } catch (e: any) {
            setGithubStatus('Erro ao restaurar backup do GitHub: ' + e.message);
        }
        setTimeout(() => setGithubStatus(null), 4000);
    };
=======
>>>>>>> 2c7a7f2163e852e17c9cdc8f7e100434f2ebb871
import { openHtmlInNewTab, calculatePartDate, generateUUID, parseWeekDate, generateWeeksForWorkbook, inferParticipationType, normalizeName, formatWeekIdToLabel } from './lib/utils';
import { generateAiSchedule } from './lib/aiScheduler';
import { parseHistoricPdf } from './lib/historicPdfParser';

// --- ERROR BOUNDARY COMPONENT ---
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-8">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-red-500 mb-4">Ops! Ocorreu um erro.</h1>
            <p className="mb-4 text-gray-300">O aplicativo encontrou um problema inesperado.</p>
            <div className="bg-gray-800 p-4 rounded border border-gray-700 font-mono text-xs mb-6 overflow-auto max-h-64">
              {this.state.error?.message || "Erro desconhecido"}
            </div>
            <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors">
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

type ActiveTab = 'Pauta' | 'Designação Manual' | 'Participações' | 'Publicadores' | 'Apostilas' | 'Estatísticas';
type ItemToDelete = Publisher | Participation | Workbook | Rule | SpecialEvent | EventTemplate | { type: 'week'; week: string } | null;
type PublisherSortKey = 'name' | 'condition';
type ParticipationSortOrder = 'desc' | 'asc';

<<<<<<< HEAD
const AUTO_BACKUP_KEY = 'RVM_AUTO_BACKUP';
const AUTO_BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutos

const saveAutoBackup = async (state: any) => {
    try {
        const jsonString = JSON.stringify(state);
        localStorage.setItem(AUTO_BACKUP_KEY, jsonString);
    } catch (e) {
        console.error('Erro ao salvar backup automático:', e);
    }
};

const loadAutoBackup = (): any | null => {
    try {
        const saved = localStorage.getItem(AUTO_BACKUP_KEY);
        if (saved) return JSON.parse(saved);
    } catch (e) {
        console.error('Erro ao carregar backup automático:', e);
    }
    return null;
};

const downloadAutoBackup = () => {
    const saved = localStorage.getItem(AUTO_BACKUP_KEY);
    if (!saved) return;
    const blob = new Blob([saved], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `designacoes_rvm_autobackup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
};

const AppContent: React.FC = () => {
        // BACKUP AUTOMÁTICO
        useEffect(() => {
            const doBackup = async () => {
                await saveAutoBackup({
                    publishers,
                    rules,
                    participations,
                    workbooks,
                    specialEvents,
                    eventTemplates,
                    manualAssignmentState
                });
            };
            doBackup(); // Salva ao montar
            const interval = setInterval(doBackup, AUTO_BACKUP_INTERVAL);
            return () => clearInterval(interval);
        }, [publishers, rules, participations, workbooks, specialEvents, eventTemplates, manualAssignmentState]);
=======
const AppContent: React.FC = () => {
>>>>>>> 2c7a7f2163e852e17c9cdc8f7e100434f2ebb871
    // STATE MANAGEMENT
    const [activeTab, setActiveTab] = useState<ActiveTab>('Pauta');
    const [publishers, setPublishers] = useState<Publisher[]>([]);
    const [participations, setParticipations] = useState<Participation[]>([]);
    const [workbooks, setWorkbooks] = useState<Workbook[]>([]);
    const [rules, setRules] = useState<Rule[]>([]);
    const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>([]);
    const [eventTemplates, setEventTemplates] = useState<EventTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGeneratingAiSchedule, setIsGeneratingAiSchedule] = useState(false);
    const [batchGenerationProgress, setBatchGenerationProgress] = useState<string | null>(null);
    
    // PERSISTENT STATE FOR MANUAL ASSIGNMENT
    const [manualAssignmentState, setManualAssignmentState] = useState<ManualAssignmentState>({
        file: null,
        fileBase64: null,
        availableWeeks: [],
        weekLabel: '',
        parts: [],
        assignments: {}
    });

    // MODAL STATES
    const [isPublisherFormOpen, setIsPublisherFormOpen] = useState(false);
    const [publisherToEdit, setPublisherToEdit] = useState<Publisher | null>(null);
    const [isParticipationFormOpen, setIsParticipationFormOpen] = useState(false);
    const [participationToEdit, setParticipationToEdit] = useState<Participation | null>(null);
    const [isWorkbookModalOpen, setIsWorkbookModalOpen] = useState(false);
    const [workbookToEdit, setWorkbookToEdit] = useState<Workbook | null>(null);
    const [isRuleManagerOpen, setIsRuleManagerOpen] = useState(false);
    const [isAiSchedulerModalOpen, setIsAiSchedulerModalOpen] = useState(false);
    const [aiScheduleResults, setAiScheduleResults] = useState<AiScheduleResult[] | null>(null);
    const [currentAiWorkbook, setCurrentAiWorkbook] = useState<Workbook | null>(null);
    const [currentAiWeek, setCurrentAiWeek] = useState<string>('');
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<ItemToDelete>(null);
    const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
    const [scheduleToEdit, setScheduleToEdit] = useState<MeetingData | null>(null);
    const [isSpecialEventsModalOpen, setIsSpecialEventsModalOpen] = useState(false);
    const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
    const [isHistoricalDataModalOpen, setIsHistoricalDataModalOpen] = useState(false);


    // FILTER AND SORT STATES
    const [publisherSearch, setPublisherSearch] = useState('');
    const [publisherSort, setPublisherSort] = useState<PublisherSortKey>('name');
    const [participationSearch, setParticipationSearch] = useState('');
    const [participationWeekFilter, setParticipationWeekFilter] = useState('Todas as Semanas');
    const [participationSort, setParticipationSort] = useState<ParticipationSortOrder>('desc');
    const [scheduleWeekFilter, setScheduleWeekFilter] = useState('Todas as Semanas');
    const [scheduleParticipantSearch, setScheduleParticipantSearch] = useState('');

    // DATA LOADING
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            await initStorage();
            const data = await getAllData();
            setPublishers(data.publishers);
            setParticipations(data.participations);
            setWorkbooks(data.workbooks.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()));
            setRules(data.rules);
            setSpecialEvents(data.specialEvents);
            setEventTemplates(data.eventTemplates);
        } catch (error) {
            console.error("Erro fatal ao carregar dados:", error);
            // alert("Erro ao carregar dados do banco de dados local. Tente recarregar a página.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { 
        // Tenta solicitar persistência de armazenamento ao navegador
        if (navigator.storage && navigator.storage.persist) {
            navigator.storage.persist().then(persistent => {
                console.log(persistent ? "Armazenamento persistente concedido" : "Armazenamento persistente não concedido");
            });
        }
        loadData(); 
    }, [loadData]);

    // HANDLER DO DEV TOOLS
<<<<<<< HEAD
    // RESTAURAR BACKUP AUTOMÁTICO
    const handleRestoreAutoBackup = () => {
        const state = loadAutoBackup();
        if (!state) {
            alert('Nenhum backup automático encontrado.');
            return;
        }
        if (window.confirm('Restaurar o backup automático irá substituir todos os dados atuais. Continuar?')) {
            if (state.publishers) setPublishers(state.publishers);
            if (state.participations) setParticipations(state.participations);
            if (state.rules) setRules(state.rules);
            if (state.specialEvents) setSpecialEvents(state.specialEvents);
            if (state.eventTemplates) setEventTemplates(state.eventTemplates);
            if (state.workbooks) setWorkbooks(state.workbooks);
            if (state.manualAssignmentState) {
                setManualAssignmentState(state.manualAssignmentState);
                setActiveTab('Designação Manual');
            }
            alert('Backup automático restaurado!');
        }
    };

=======
>>>>>>> 2c7a7f2163e852e17c9cdc8f7e100434f2ebb871
    const handleLoadDevState = (state: any) => {
        if (state.publishers) setPublishers(state.publishers);
        if (state.participations) setParticipations(state.participations);
        if (state.rules) setRules(state.rules);
        if (state.specialEvents) setSpecialEvents(state.specialEvents);
        if (state.eventTemplates) setEventTemplates(state.eventTemplates);
        if (state.workbooks) setWorkbooks(state.workbooks);
        
        if (state.manualAssignmentState) {
            setManualAssignmentState(state.manualAssignmentState);
            setActiveTab('Designação Manual');
        }
    };

    const scheduleData: MeetingData[] = useMemo(() => {
        const weeks: { [week: string]: Participation[] } = {};
        participations.forEach(p => {
            if (!weeks[p.week]) weeks[p.week] = [];
            weeks[p.week].push(p);
        });
        return Object.keys(weeks).map(week => ({ week, parts: weeks[week] })).sort((a, b) => parseWeekDate(b.week).getTime() - parseWeekDate(a.week).getTime());
    }, [participations]);
    
    const scheduledWeeks = useMemo(() => scheduleData.map(s => s.week), [scheduleData]);

    const filteredPublishers = useMemo(() => publishers.filter(p => p.name.toLowerCase().includes(publisherSearch.toLowerCase())).sort((a, b) => {
        if (a[publisherSort] < b[publisherSort]) return -1;
        if (a[publisherSort] > b[publisherSort]) return 1;
        return 0;
    }), [publishers, publisherSearch, publisherSort]);
    const participationWeeks = useMemo(() => ['Todas as Semanas', ...Array.from(new Set(participations.map(p => p.week))).sort((a: string, b: string) => parseWeekDate(b).getTime() - parseWeekDate(a).getTime())], [participations]);
    const filteredParticipations = useMemo(() => participations.filter(p => (p.publisherName.toLowerCase().includes(participationSearch.toLowerCase()) || p.partTitle.toLowerCase().includes(participationSearch.toLowerCase())) && (participationWeekFilter === 'Todas as Semanas' || p.week === participationWeekFilter)).sort((a, b) => (participationSort === 'desc' ? new Date(b.date).getTime() - new Date(a.date).getTime() : new Date(a.date).getTime() - new Date(b.date).getTime())), [participations, participationSearch, participationWeekFilter, participationSort]);
    const scheduleWeeks = useMemo(() => ['Todas as Semanas', ...scheduleData.map(s => s.week)], [scheduleData]);
    const filteredScheduleData = useMemo(() => scheduleData.filter(m => (scheduleWeekFilter === 'Todas as Semanas' || m.week === scheduleWeekFilter) && (!scheduleParticipantSearch || m.parts.some(p => p.publisherName.toLowerCase().includes(scheduleParticipantSearch.toLowerCase())))), [scheduleData, scheduleWeekFilter, scheduleParticipantSearch]);

    // HANDLERS
    const handleSavePublisher = async (p: Publisher) => { await savePublisher(p); loadData(); };
    const handleDeletePublisher = (p: Publisher) => { setItemToDelete(p); setIsConfirmationModalOpen(true); };
    const handleSaveParticipation = async (ps: Participation[]) => { await Promise.all(ps.map(p => saveParticipation(p))); loadData(); };
    const handleDeleteParticipation = (p: Participation) => { setItemToDelete(p); setIsConfirmationModalOpen(true); };
    const handleSaveWorkbook = async (w: Workbook) => { await saveWorkbook(w); loadData(); };
    const handleDeleteWorkbook = (w: Workbook) => { setItemToDelete(w); setIsConfirmationModalOpen(true); };
    const handleSaveRule = async (r: Rule) => { await saveRule(r); loadData(); };
    const handleDeleteRule = (id: string) => { const r = rules.find(r => r.id === id); if (r) { setItemToDelete(r); setIsConfirmationModalOpen(true); } };
    
    const handleSaveSpecialEvent = async (event: SpecialEvent) => { try { await saveSpecialEvent(event); await loadData(); } catch (error) { console.error("Failed to save special event:", error); alert("Erro ao salvar o evento especial."); } };
    const handleDeleteSpecialEvent = (id: string) => { const e = specialEvents.find(e => e.id === id); if (e) { setItemToDelete(e); setIsConfirmationModalOpen(true); } };
    
    const handleSaveEventTemplate = async (template: EventTemplate) => { await saveEventTemplate(template); loadData(); };
    const handleDeleteEventTemplate = (id: string) => { const t = eventTemplates.find(t => t.id === id); if (t) { setItemToDelete(t); setIsConfirmationModalOpen(true); } };

    const handleEditWeek = (m: MeetingData) => { setScheduleToEdit(m); setIsScheduleFormOpen(true); };
    
    const handleSaveSchedule = async ({ parts, eventToUpdate }: { parts: Participation[], eventToUpdate?: SpecialEvent }) => {
        await Promise.all(parts.map(p => saveParticipation(p)));
        if (eventToUpdate) {
            await saveSpecialEvent(eventToUpdate);
        }
        loadData();
    };
    
    const handleDeleteWeek = (meeting: MeetingData) => { setItemToDelete({ type: 'week', week: meeting.week }); setIsConfirmationModalOpen(true); };
    
    const saveAiResults = async (results: AiScheduleResult[], week: string) => {
        const newParticipations: Participation[] = [];
        const eventForWeek = specialEvents.find(e => e.week === week);
        const template = eventForWeek ? eventTemplates.find(t => t.id === eventForWeek.templateId) : null;

        for (const result of results) {
            if (result.partTitle.toLowerCase().includes('cântico') || !result.studentName) continue;
            if (template && result.partTitle === eventForWeek!.theme) continue;

            const partType = inferParticipationType(result.partTitle);
            newParticipations.push({ id: generateUUID(), publisherName: result.studentName, week, partTitle: result.partTitle, type: partType, date: calculatePartDate(week) });
            if (result.helperName) newParticipations.push({ id: generateUUID(), publisherName: result.helperName, week, partTitle: 'Ajudante', type: ParticipationType.AJUDANTE, date: calculatePartDate(week) });
        }
        
        if (eventForWeek && template) {
             newParticipations.push({ id: generateUUID(), publisherName: eventForWeek.assignedTo, week, partTitle: eventForWeek.theme, type: ParticipationType.VIDA_CRISTA, date: calculatePartDate(week), duration: eventForWeek.duration });
        }
        
        await Promise.all(newParticipations.map(p => saveParticipation(p)));
    };

    const handleGenerateAiSchedule = async (workbook: Workbook, week: string) => {
        setIsAiSchedulerModalOpen(false);
        if (week === 'ALL') {
             alert("Geração em lote não disponível no momento.");
        } else {
            setIsGeneratingAiSchedule(true);
            try {
                const results = await generateAiSchedule(workbook, week, publishers, participations, rules, specialEvents, eventTemplates);
                setAiScheduleResults(results);
                setCurrentAiWorkbook(workbook);
                setCurrentAiWeek(week);
            } catch (error) { alert(`Erro ao gerar pauta: ${error instanceof Error ? error.message : String(error)}`); }
            finally { setIsGeneratingAiSchedule(false); }
        }
    };
    
    const handleSaveAiSchedule = async () => {
        if (!aiScheduleResults || !currentAiWeek) return;
        await saveAiResults(aiScheduleResults, currentAiWeek);
        setAiScheduleResults(null);
        setCurrentAiWorkbook(null);
        setCurrentAiWeek('');
        await loadData();
    };

    // Handler para salvar a pauta manual
    const handleSaveManualSchedule = async (newParticipations: Participation[]) => {
        await saveParticipationsBulk(newParticipations);
        alert("Pauta manual salva com sucesso!");
        await loadData();
        // Reset Manual State
        setManualAssignmentState({
            file: null,
            fileBase64: null,
            availableWeeks: [],
            weekLabel: '',
            parts: [],
            assignments: {}
        });
        setActiveTab('Pauta');
    };

    const handleImportHistoricalData = async (dataToImport: HistoricalData[], fileName?: string, fileBase64?: string) => {
        try {
            if (fileName && fileBase64) {
                 const newWorkbook: Workbook = {
                     id: generateUUID(),
                     name: fileName.replace('.pdf', ''),
                     fileData: fileBase64,
                     uploadDate: new Date().toISOString()
                 };
                 await saveWorkbook(newWorkbook);
            }

            const newParticipations: Participation[] = [];
            const publisherNameMap = new Map<string, Publisher>();

            for (const p of publishers) {
                publisherNameMap.set(normalizeName(p.name), p);
                if (p.aliases) {
                    for (const alias of p.aliases) {
                        publisherNameMap.set(normalizeName(alias), p);
                    }
                }
            }

            for (const weekData of dataToImport) {
                const finalWeekId = weekData.weekId;

                for (const p of weekData.participations) {
                    if (!p.publisherName || !p.partTitle) continue;

                    const normalizedName = normalizeName(p.publisherName);
                    const foundPublisher = publisherNameMap.get(normalizedName);
                    
                    if (!foundPublisher) {
                        console.warn(`Publicador "${p.publisherName}" (normalizado: ${normalizedName}) da semana ${finalWeekId} não encontrado no banco atual. Importando como texto livre.`);
                    }

                    const finalPublisherName = foundPublisher ? foundPublisher.name : p.publisherName;

                    newParticipations.push({
                        id: generateUUID(),
                        publisherName: finalPublisherName,
                        week: finalWeekId,
                        partTitle: p.partTitle,
                        type: inferParticipationType(p.partTitle),
                        date: calculatePartDate(finalWeekId)
                    });
                }
            }

            if (newParticipations.length > 0) {
                await saveParticipationsBulk(newParticipations);
                alert(`${newParticipations.length} novas designações importadas com sucesso!`);
                await loadData();
            } else {
                if (fileName) {
                    await loadData();
                    alert("Apostila salva com sucesso.");
                } else {
                    alert("Nenhuma nova designação válida para importar.");
                }
            }
        } catch (e) {
            console.error("Erro durante a importação:", e);
            alert("Ocorreu um erro ao salvar os dados importados. Por favor, tente novamente.");
        }
    };
    
    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            if (typeof itemToDelete === 'object' && 'type' in itemToDelete && itemToDelete.type === 'week') await deleteParticipationsByWeek(itemToDelete.week);
            else if ('privileges' in itemToDelete) await deletePublisher(itemToDelete.id);
            else if ('partTitle' in itemToDelete) await deleteParticipation(itemToDelete.id);
            else if ('fileData' in itemToDelete) await deleteWorkbook(itemToDelete.id);
            else if ('conditions' in itemToDelete) { const rule = itemToDelete as Rule; await deleteRule(rule.id); }
            else if ('templateId' in itemToDelete) { const event = itemToDelete as SpecialEvent; await deleteSpecialEvent(event.id); }
            else if ('impact' in itemToDelete) { const template = itemToDelete as EventTemplate; await deleteEventTemplate(template.id); }
        } catch (error) { console.error("Failed to delete item:", error); alert("Erro ao excluir o item."); }
        setItemToDelete(null);
        setIsConfirmationModalOpen(false);
        loadData();
    };

    const getItemToDeleteDisplayName = (item: ItemToDelete): string => {
        if (!item) return '';
        if (typeof item === 'object' && 'type' in item && item.type === 'week') return `a pauta completa da semana "${formatWeekIdToLabel(item.week)}"`;
        if ('partTitle' in item) return `a participação "${item.partTitle}" de ${item.publisherName}`;
        if ('conditions' in item) return `a regra "${item.description}"`;
        if ('templateId' in item) { const template = eventTemplates.find(t => t.id === (item as SpecialEvent).templateId); return `o evento "${template?.name}" da semana ${item.week}`; }
        if ('impact' in item) return `o modelo de evento "${(item as EventTemplate).name}"`;
        if ('name' in item) return `o item "${item.name}"`;
        return 'este item';
    };

    const handleOpenPrintableView = (m: MeetingData) => openHtmlInNewTab(getScheduleHtml(m, "Vila Velha - Central", publishers, specialEvents, eventTemplates));
    const handleExportData = async () => {
        const data = await getAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `designacoes_rvm_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    };
    const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const fileContent = ev.target?.result;
                if (typeof fileContent !== 'string') {
                    throw new Error("Falha ao ler o arquivo. O conteúdo não é uma string de texto.");
                }
                const data = JSON.parse(fileContent);

                if (!data.publishers || !data.participations || !data.workbooks) {
                    throw new Error("Arquivo de backup inválido.");
                }
                if (window.confirm("Isso substituirá TODOS os dados existentes. Tem certeza?")) {
                    await clearAllData();
                    await Promise.all([
                        ...data.publishers.map((p: Publisher) => savePublisher(p)),
                        saveParticipationsBulk(data.participations),
                        ...data.workbooks.map((w: Workbook) => saveWorkbook(w)),
                        ...(data.rules || []).map((r: Rule) => saveRule(r)),
                        ...(data.eventTemplates || []).map((t: EventTemplate) => saveEventTemplate(t)),
                        ...(data.specialEvents || []).map((e: SpecialEvent) => saveSpecialEvent(e)),
                    ]);
                    alert("Dados importados com sucesso!");
                    loadData();
                }
            } catch (error) {
                const typedError = error as Error;
                alert(`Erro ao importar dados: ${typedError.message}`);
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Pauta': return <MeetingSchedule scheduleData={filteredScheduleData} publishers={publishers} specialEvents={specialEvents} eventTemplates={eventTemplates} onEditWeek={handleEditWeek} onDeleteWeek={handleDeleteWeek} onOpenPrintableView={handleOpenPrintableView} />;
            case 'Designação Manual': return <ManualAssignment 
                publishers={publishers} 
                participations={participations} 
                rules={rules} 
                specialEvents={specialEvents} 
                eventTemplates={eventTemplates} 
                onSave={handleSaveManualSchedule}
                onEditPublisher={(p) => { setPublisherToEdit(p); setIsPublisherFormOpen(true); }} 
                initialState={manualAssignmentState}
                onStateChange={setManualAssignmentState}
            />;
            case 'Participações': return <ParticipationTable participations={filteredParticipations} onEdit={(p) => { setParticipationToEdit(p); setIsParticipationFormOpen(true); }} onDelete={handleDeleteParticipation} />;
            case 'Publicadores': return <PublisherTable publishers={filteredPublishers} onEdit={(p) => { setPublisherToEdit(p); setIsPublisherFormOpen(true); }} onDelete={handleDeletePublisher} />;
            case 'Apostilas': return <WorkbookList workbooks={workbooks} onEdit={(w) => { setWorkbookToEdit(w); setIsWorkbookModalOpen(true); }} onDelete={handleDeleteWorkbook} />;
            case 'Estatísticas': return <StatisticsDashboard publishers={publishers} participations={participations} />;
            default: return null;
        }
    };
    
    if (isLoading) return <div className="flex justify-center items-center h-screen"><div className="text-xl text-gray-500">Carregando banco de dados...</div></div>;
    
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 relative">
            {/* DEV TOOLS FLOATING BUTTON */}
            <DevTools 
                onLoadState={handleLoadDevState} 
                currentState={{
                    publishers, 
                    rules, 
                    participations, // FIX: Ensure included
                    workbooks,      // FIX: Ensure included
                    specialEvents,  // FIX: Ensure included
                    eventTemplates, // FIX: Ensure included
                    manualAssignmentState
                }} 
            />

            <div className="sticky top-0 z-30 bg-gray-100 dark:bg-gray-900 shadow-md">
                <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex justify-between items-center py-4">
                    <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Designações na RVM</h1>
                    <div className="flex items-center space-x-2">
                        {/* GitHub Backup Controls */}
                        <div className="flex flex-col items-end space-y-1 mr-2 bg-gray-50 dark:bg-gray-800 p-2 rounded shadow border border-gray-200 dark:border-gray-700">
                            <details className="mb-1 w-full">
                                <summary className="text-xs text-gray-700 dark:text-gray-200 cursor-pointer">Como usar backup no GitHub?</summary>
                                <div className="text-xs text-gray-700 dark:text-gray-200 mt-1 space-y-1">
                                    <div>1. Acesse <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">github.com/settings/tokens</a></div>
                                    <div>2. Clique em <b>Generate new token</b> (classic)</div>
                                    <div>3. Marque o escopo <b>repo</b> e gere o token</div>
                                    <div>4. Copie o token e cole no campo abaixo</div>
                                    <div>5. Use os botões para salvar/restaurar backups JSON no repositório</div>
                                    <div className="mt-1 text-[10px] text-gray-500">O token é salvo apenas no seu navegador.</div>
                                </div>
                            </details>
                            <input type="text" placeholder="Token GitHub" value={githubToken} onChange={e => setGithubToken(e.target.value)} className="px-2 py-1 text-xs rounded border border-gray-300 dark:bg-gray-800 dark:text-gray-100 w-44" title="Personal Access Token" />
                            <div className="flex space-x-1 mt-1">
                                <input type="text" placeholder="Branch" value={githubBranch} onChange={e => setGithubBranch(e.target.value)} className="px-1 py-1 text-xs rounded border border-gray-300 dark:bg-gray-800 dark:text-gray-100 w-20" title="Branch" />
                                <input type="text" placeholder="Pasta" value={githubFolder} onChange={e => setGithubFolder(e.target.value)} className="px-1 py-1 text-xs rounded border border-gray-300 dark:bg-gray-800 dark:text-gray-100 w-20" title="Pasta" />
                                <input type="text" placeholder="Arquivo" value={githubFile} onChange={e => setGithubFile(e.target.value)} className="px-1 py-1 text-xs rounded border border-gray-300 dark:bg-gray-800 dark:text-gray-100 w-28" title="Arquivo" />
                            </div>
                            <div className="flex space-x-1 mt-1">
                                <button onClick={handleGithubBackup} className="p-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700" title="Salvar backup no GitHub">Salvar GitHub</button>
                                <button onClick={handleGithubRestore} className="p-1 text-xs bg-green-600 text-white rounded hover:bg-green-700" title="Restaurar backup do GitHub">Restaurar GitHub</button>
                            </div>
                            {githubStatus && <span className={`text-xs font-bold ${githubStatus.startsWith('Erro') ? 'text-red-600' : 'text-green-600'}`}>{githubStatus}</span>}
                        </div>
<<<<<<< HEAD
                        {/* GitHub Backup Controls */}
                        <div className="flex flex-col items-end space-y-1 mr-2">
                            <input type="text" placeholder="Token GitHub" value={githubToken} onChange={e => setGithubToken(e.target.value)} className="px-2 py-1 text-xs rounded border border-gray-300 dark:bg-gray-800 dark:text-gray-100" style={{width:140}} title="Personal Access Token" />
                            <input type="text" placeholder="Dono" value={githubOwner} onChange={e => setGithubOwner(e.target.value)} className="px-2 py-1 text-xs rounded border border-gray-300 dark:bg-gray-800 dark:text-gray-100" style={{width:90}} title="Owner" />
                            <input type="text" placeholder="Repositório" value={githubRepo} onChange={e => setGithubRepo(e.target.value)} className="px-2 py-1 text-xs rounded border border-gray-300 dark:bg-gray-800 dark:text-gray-100" style={{width:110}} title="Repo" />
                            <input type="text" placeholder="Caminho" value={githubPath} onChange={e => setGithubPath(e.target.value)} className="px-2 py-1 text-xs rounded border border-gray-300 dark:bg-gray-800 dark:text-gray-100" style={{width:160}} title="Path" />
                            <div className="flex space-x-1 mt-1">
                                <button onClick={handleGithubBackup} className="p-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700" title="Salvar backup no GitHub">Salvar GitHub</button>
                                <button onClick={handleGithubRestore} className="p-1 text-xs bg-green-600 text-white rounded hover:bg-green-700" title="Restaurar backup do GitHub">Restaurar GitHub</button>
                            </div>
                            {githubStatus && <span className="text-xs" style={{maxWidth:180,display:'block',color:githubStatus.startsWith('Erro')?'#dc2626':'#059669'}}>{githubStatus}</span>}
                        </div>
                                                <button onClick={handleRestoreAutoBackup} className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400" title="Restaurar Backup Automático"><span role="img" aria-label="restore">♻️</span></button>
                                                <button onClick={downloadAutoBackup} className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400" title="Baixar Backup Automático"><span role="img" aria-label="download">💾</span></button>
=======
>>>>>>> 2c7a7f2163e852e17c9cdc8f7e100434f2ebb871
                        <input type="file" id="import-file" className="hidden" accept=".json" onChange={handleImportData} />
                        <button onClick={() => document.getElementById('import-file')?.click()} className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400" title="Importar Backup"><ArrowUpTrayIcon className="w-6 h-6"/></button>
                        <button onClick={handleExportData} className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400" title="Exportar Backup"><ArrowDownTrayIcon className="w-6 h-6"/></button>
                        <button onClick={() => setIsRuleManagerOpen(true)} className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400" title="Gerenciar Regras"><SparklesIcon className="w-6 h-6"/></button>
                        <button onClick={() => setIsSpecialEventsModalOpen(true)} className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400" title="Gerenciar Eventos"><CogIcon className="w-6 h-6"/></button>
                    </div>
                </div></header>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="border-b border-gray-200 dark:border-gray-700"><nav className="-mb-px flex space-x-6 overflow-x-auto">
                    {(['Pauta', 'Designação Manual', 'Participações', 'Publicadores', 'Apostilas', 'Estatísticas'] as ActiveTab[]).map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`${activeTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-1`}>
                        {tab === 'Designação Manual' && <ClipboardDocumentCheckIcon className="w-4 h-4"/>}
                        {tab}
                    </button>))}
                </nav></div></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3"><div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="w-full md:w-auto flex-grow">{batchGenerationProgress ? (<div className="text-sm text-indigo-600 animate-pulse">{batchGenerationProgress}</div>) : activeTab === 'Pauta' && (<div className="flex flex-wrap gap-4"><select value={scheduleWeekFilter} onChange={e => setScheduleWeekFilter(e.target.value)} className="px-3 py-2 bg-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-black focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm">{scheduleWeeks.map(w => <option key={w} value={w}>{formatWeekIdToLabel(w)}</option>)}</select><input type="search" placeholder="Buscar por participante..." value={scheduleParticipantSearch} onChange={e => setScheduleParticipantSearch(e.target.value)} className="w-full md:w-64 px-3 py-2 bg-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-black placeholder-gray-500 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"/></div>)}{activeTab === 'Publicadores' && (<div className="flex gap-4"><input type="search" placeholder="Buscar por nome..." value={publisherSearch} onChange={e => setPublisherSearch(e.target.value)} className="w-full md:w-64 px-3 py-2 bg-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-black placeholder-gray-500 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"/><select value={publisherSort} onChange={e => setPublisherSort(e.target.value as PublisherSortKey)} className="px-3 py-2 bg-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-black focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"><option value="name">Ordenar por Nome</option><option value="condition">Ordenar por Condição</option></select></div>)}{activeTab === 'Participações' && (<div className="flex flex-wrap gap-4"><input type="search" placeholder="Buscar por nome ou parte..." value={participationSearch} onChange={e => setParticipationSearch(e.target.value)} className="w-full md:w-64 px-3 py-2 bg-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-black placeholder-gray-500 focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"/><select value={participationWeekFilter} onChange={e => setParticipationWeekFilter(e.target.value)} className="px-3 py-2 bg-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-black focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm">{participationWeeks.map(w => <option key={w} value={w}>{formatWeekIdToLabel(w)}</option>)}</select><select value={participationSort} onChange={e => setParticipationSort(e.target.value as ParticipationSortOrder)} className="px-3 py-2 bg-white border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-black focus:outline-none focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm"><option value="desc">Mais Recentes</option><option value="asc">Mais Antigas</option></select></div>)}</div>
                    <div className="flex-shrink-0 flex space-x-2">{activeTab === 'Pauta' && <button onClick={() => setIsAiSchedulerModalOpen(true)} className="btn-primary flex items-center"><SparklesIcon className="w-5 h-5 mr-2"/>Gerar Pauta com IA</button>}{activeTab === 'Participações' && <><button onClick={() => setIsHistoricalDataModalOpen(true)} className="btn-primary">Importar Histórico</button><button onClick={() => { setParticipationToEdit(null); setIsParticipationFormOpen(true); }} className="btn-primary">Adicionar Designação</button></>}{activeTab === 'Publicadores' && <button onClick={() => { setPublisherToEdit(null); setIsPublisherFormOpen(true); }} className="btn-primary">Adicionar Publicador</button>}{activeTab === 'Apostilas' && <button onClick={() => { setWorkbookToEdit(null); setIsWorkbookModalOpen(true); }} className="btn-primary">Adicionar Apostila</button>}</div>
                </div></div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{renderTabContent()}</main>

            {/* Modals */}
            <PublisherForm isOpen={isPublisherFormOpen} onClose={() => setIsPublisherFormOpen(false)} onSave={handleSavePublisher} publisherToEdit={publisherToEdit} publishers={publishers} />
            <ParticipationForm isOpen={isParticipationFormOpen} onClose={() => setIsParticipationFormOpen(false)} onSave={handleSaveParticipation} participationToEdit={participationToEdit} publishers={publishers} rules={rules} specialEvents={specialEvents} eventTemplates={eventTemplates} />
            <WorkbookUploadModal isOpen={isWorkbookModalOpen} onClose={() => setIsWorkbookModalOpen(false)} onSave={handleSaveWorkbook} workbookToEdit={workbookToEdit} />
            <RuleManagerModal isOpen={isRuleManagerOpen} onClose={() => setIsRuleManagerOpen(false)} rules={rules} onSave={handleSaveRule} onDelete={handleDeleteRule} />
            <AiSchedulerModal isOpen={isAiSchedulerModalOpen} onClose={() => setIsAiSchedulerModalOpen(false)} onGenerate={handleGenerateAiSchedule} workbooks={workbooks} scheduledWeeks={scheduledWeeks} isGenerating={isGeneratingAiSchedule} />
            {aiScheduleResults && <AiScheduleResultsModal isOpen={!!aiScheduleResults} onClose={() => setAiScheduleResults(null)} onSave={handleSaveAiSchedule} results={aiScheduleResults} workbookName={currentAiWeek} />}
            <ConfirmationModal isOpen={isConfirmationModalOpen} onClose={() => setIsConfirmationModalOpen(false)} onConfirm={confirmDelete} title="Confirmar Exclusão" message={`Você tem certeza que deseja excluir ${getItemToDeleteDisplayName(itemToDelete)}? Esta ação não pode ser desfeita.`} />
            <MeetingScheduleForm isOpen={isScheduleFormOpen} onClose={() => setIsScheduleFormOpen(false)} onSave={handleSaveSchedule} scheduleToEdit={scheduleToEdit} publishers={publishers} specialEvents={specialEvents} eventTemplates={eventTemplates} />
            <SpecialEventsModal isOpen={isSpecialEventsModalOpen} onClose={() => setIsSpecialEventsModalOpen(false)} specialEvents={specialEvents} eventTemplates={eventTemplates} onSave={handleSaveSpecialEvent} onDelete={handleDeleteSpecialEvent} onManageTemplates={() => setIsTemplateManagerOpen(true)} />
            <EventTemplateManagerModal isOpen={isTemplateManagerOpen} onClose={() => setIsTemplateManagerOpen(false)} templates={eventTemplates} onSave={handleSaveEventTemplate} onDelete={handleDeleteEventTemplate} />
            <HistoricalDataModal isOpen={isHistoricalDataModalOpen} onClose={() => setIsHistoricalDataModalOpen(false)} onImport={handleImportHistoricalData} existingWeeks={scheduledWeeks} parsePdf={parseHistoricPdf} />
        </div>
    );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;