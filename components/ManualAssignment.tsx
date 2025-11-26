import React, { useState, useEffect, useMemo } from 'react';
import { Publisher, Participation, ParticipationType, Rule, SpecialEvent, EventTemplate } from '../types';
import { calculatePartDate, generateUUID, normalizeName, validatePairing, parseWeekDate } from '../lib/utils';
import { extractScheduleFromPdf, identifyWeeksInPdf, ExtractedSchedule } from '../lib/aiScheduler';
import { validateAssignment } from '../lib/inferenceEngine';
import { ArrowUpTrayIcon, SparklesIcon, ClipboardDocumentCheckIcon, ExclamationCircleIcon, PencilIcon } from './icons';

interface PartToAssign {
    id: string;
    partTitle: string;
    type: ParticipationType;
    duration?: number;
    requiresHelper: boolean;
    preAssignedTo?: string; // Nome ou 'Presidente'
}

interface AssignmentState {
    studentId: string;
    helperId?: string;
}

// Define o estado persistente que será gerenciado pelo App.tsx
export interface ManualAssignmentState {
    file: File | null;
    fileBase64: string | null;
    availableWeeks: string[];
    weekLabel: string;
    parts: PartToAssign[];
    assignments: Record<string, AssignmentState>;
}

interface ManualAssignmentProps {
    publishers: Publisher[];
    participations: Participation[];
    rules: Rule[];
    specialEvents: SpecialEvent[];
    eventTemplates: EventTemplate[];
    onSave: (newParticipations: Participation[]) => Promise<void>;
    onEditPublisher?: (publisher: Publisher) => void;
    initialState: ManualAssignmentState;
    onStateChange: (newState: ManualAssignmentState) => void;
}

const ManualAssignment: React.FC<ManualAssignmentProps> = ({ publishers, participations, rules, specialEvents, eventTemplates, onSave, onEditPublisher, initialState, onStateChange }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false); 
    const [isGenerating, setIsGenerating] = useState(false); 
    const [error, setError] = useState('');
    const [viewingRulesPart, setViewingRulesPart] = useState<PartToAssign | null>(null);
    const [sortBy, setSortBy] = useState<'lastDate' | 'name'>('lastDate');
    const [showBlocked, setShowBlocked] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const updateState = (updates: Partial<ManualAssignmentState>) => {
        onStateChange({ ...initialState, ...updates });
    };

    const { file, fileBase64, availableWeeks, weekLabel, parts, assignments } = initialState;

    const processFile = (selectedFile: File) => {
        setError('');
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = () => {
            updateState({
                file: selectedFile,
                fileBase64: reader.result as string,
                availableWeeks: [],
                weekLabel: '',
                parts: [],
                assignments: {}
            });
        };
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            processFile(selectedFile);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === 'application/pdf') processFile(droppedFile);
            else setError('Por favor, solte apenas arquivos PDF.');
        }
    };

    const analyzePdf = async () => {
        if (!file || !fileBase64) {
            setError('Por favor, selecione um arquivo PDF e aguarde o carregamento.');
            return;
        }
        setIsAnalyzing(true);
        setError('');
        updateState({ availableWeeks: [] });
        try {
            const weeks = await identifyWeeksInPdf(fileBase64);
            if (weeks.length === 0) {
                setError('Nenhuma semana identificada. Verifique se o PDF é uma apostila válida.');
            } else {
                updateState({ availableWeeks: weeks });
            }
        } catch (err: any) {
            setError(`Erro ao analisar PDF: ${err.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSelectWeek = async (selectedWeek: string) => {
        if (!fileBase64) return;
        setIsGenerating(true);
        setError('');
        updateState({ weekLabel: '', parts: [], assignments: {} });

        try {
            const structuredData = await extractScheduleFromPdf(fileBase64, selectedWeek);
            
            const finalParts: PartToAssign[] = [];
            let currentSectionContext: ParticipationType = ParticipationType.VIDA_CRISTA;

            // LÓGICA DE PARTES FIXAS (Evita duplicação se a IA já extraiu)
            const hasPresident = structuredData.parts.some(p => p.part.toLowerCase().includes('presidente'));
            // Oração Inicial deve ser no começo (type 'OPENING' ou index baixo)
            const hasOpeningPrayer = structuredData.parts.some((p, idx) => p.part.toLowerCase().includes('oração') && !p.part.toLowerCase().includes('final') && idx < 3);
            const hasOpeningComments = structuredData.parts.some(p => p.part.toLowerCase().includes('comentários iniciais'));

            if (!hasPresident) finalParts.push({ id: 'fixed-pres', partTitle: 'Presidente', type: ParticipationType.PRESIDENTE, duration: 0, requiresHelper: false });
            if (!hasOpeningPrayer) finalParts.push({ id: 'fixed-pray-start', partTitle: 'Oração Inicial', type: ParticipationType.ORACAO_INICIAL, duration: 1, requiresHelper: false, preAssignedTo: 'Presidente' });
            if (!hasOpeningComments) finalParts.push({ id: 'fixed-comm-start', partTitle: 'Comentários Iniciais', type: ParticipationType.PRESIDENTE, duration: 1, requiresHelper: false, preAssignedTo: 'Presidente' });

            structuredData.parts.forEach((item, index) => {
                if (item.type === 'SECTION_HEADER') {
                    const titleLower = item.part.toLowerCase();
                    if (titleLower.includes('tesouros')) currentSectionContext = ParticipationType.TESOUROS;
                    else if (titleLower.includes('ministério')) currentSectionContext = ParticipationType.MINISTERIO;
                    else if (titleLower.includes('vida cristã')) currentSectionContext = ParticipationType.VIDA_CRISTA;
                    return;
                }

                const titleLower = item.part.toLowerCase();
                if (item.type === 'CÂNTICO' || titleLower.includes('término')) return;

                const partId = `part-${index}`;
                let type = currentSectionContext;
                let requiresHelper = false;
                let preAssignedTo: string | undefined = undefined;

                if (item.type === 'BIBLE_STUDY' || titleLower.includes('estudo bíblico')) {
                    type = ParticipationType.DIRIGENTE;
                } else if (item.type === 'CLOSING') {
                    if (titleLower.includes('oração')) type = ParticipationType.ORACAO_FINAL;
                    else if (titleLower.includes('comentários')) { type = ParticipationType.COMENTARIOS_FINAIS; preAssignedTo = 'Presidente'; }
                } else if (item.type === 'STUDENT_PART') {
                    if (currentSectionContext === ParticipationType.TESOUROS) type = ParticipationType.TESOUROS;
                    else {
                        type = ParticipationType.MINISTERIO;
                        requiresHelper = true;
                    }
                } 

                // Correção: Se a IA detectou uma Oração no início, vincula ao Presidente
                if (titleLower.includes('oração') && !titleLower.includes('final') && index < 3) {
                    type = ParticipationType.ORACAO_INICIAL;
                    preAssignedTo = 'Presidente';
                }

                finalParts.push({ id: partId, partTitle: item.part, type, duration: item.min, requiresHelper, preAssignedTo });

                if (item.type === 'STUDENT_PART' && !titleLower.includes('estudo bíblico')) {
                    finalParts.push({ id: `counsel-${index}`, partTitle: 'Aconselhamento', type: ParticipationType.PRESIDENTE, duration: 1, requiresHelper: false, preAssignedTo: 'Presidente' });
                }
            });
            
            const studyPartIndex = finalParts.findIndex(p => p.type === ParticipationType.DIRIGENTE);
            if (studyPartIndex !== -1) {
                 const nextPart = finalParts[studyPartIndex + 1];
                 if (!nextPart || !nextPart.partTitle.toLowerCase().includes('leitor')) {
                    finalParts.splice(studyPartIndex + 1, 0, { id: `fixed-reader-${Date.now()}`, partTitle: 'Leitor do EBC', type: ParticipationType.LEITOR, duration: 0, requiresHelper: false });
                 }
            }

            const initialAssignments: Record<string, AssignmentState> = {};
            finalParts.forEach(p => {
                initialAssignments[p.id] = { studentId: '', helperId: p.requiresHelper ? '' : undefined };
            });
            
            updateState({ 
                weekLabel: structuredData.header, 
                parts: finalParts, 
                assignments: initialAssignments 
            });

        } catch (aiError: any) {
            console.error(aiError);
            setError(`Erro na geração da pauta: ${aiError.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // Sincroniza Presidente
    useEffect(() => {
        if (parts.length === 0) return;
        const presidentPart = parts.find(p => p.type === ParticipationType.PRESIDENTE && p.partTitle === 'Presidente');
        const presidentId = presidentPart ? assignments[presidentPart.id]?.studentId : '';

        if (presidentId) {
            let changed = false;
            const nextAssignments = { ...assignments };
            parts.forEach(p => {
                if (p.preAssignedTo === 'Presidente' && nextAssignments[p.id]?.studentId !== presidentId) {
                    nextAssignments[p.id] = { ...nextAssignments[p.id], studentId: presidentId };
                    changed = true;
                }
            });
            if (changed) updateState({ assignments: nextAssignments });
        }
    }, [assignments, parts]);

    const allSelectedIds = useMemo(() => {
        const ids = new Set<string>();
        (Object.values(assignments) as AssignmentState[]).forEach(a => {
            if (a.studentId) ids.add(a.studentId);
            if (a.helperId) ids.add(a.helperId);
        });
        return ids;
    }, [assignments]);

    const getSortedCandidates = (part: PartToAssign, isHelper: boolean) => {
        const targetType = isHelper ? ParticipationType.AJUDANTE : part.type;
        const targetTitle = isHelper ? 'Ajudante' : part.partTitle;
        const parsedDate = parseWeekDate(weekLabel);
        const meetingDate = parsedDate.getTime() !== 0 ? parsedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        const candidates = publishers.map(p => {
            if (!p.isServing) return { publisher: p, isValid: false, reason: 'Não Atuante' };
            const validation = validateAssignment({ publisher: p, partType: targetType, partTitle: targetTitle, meetingDate }, rules);
            return { publisher: p, isValid: validation.isValid, reason: validation.reason };
        });

        const candidatesWithStats = candidates.map(c => {
            const history = participations
                .filter(h => normalizeName(h.publisherName) === normalizeName(c.publisher.name) && h.type === targetType)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const lastDate = history.length > 0 ? new Date(history[0].date).getTime() : 0;
            return { ...c, lastDate };
        });

        return candidatesWithStats
            .filter(c => showBlocked || c.isValid)
            .sort((a, b) => {
                if (sortBy === 'name') return a.publisher.name.localeCompare(b.publisher.name);
                if (a.isValid !== b.isValid) return a.isValid ? -1 : 1;

                if (targetType === ParticipationType.MINISTERIO || targetType === ParticipationType.AJUDANTE) {
                    const isPublisherA = a.publisher.condition === 'Publicador';
                    const isPublisherB = b.publisher.condition === 'Publicador';
                    if (isPublisherA && !isPublisherB) return -1;
                    if (!isPublisherA && isPublisherB) return 1;
                }
                
                if (a.lastDate === 0 && b.lastDate !== 0) return -1;
                if (a.lastDate !== 0 && b.lastDate === 0) return 1;
                return a.lastDate - b.lastDate;
            });
    };

    const handleAutoFill = () => {
        const newAssignments: Record<string, AssignmentState> = { ...assignments };
        const tempUsedIds = new Set<string>();
        
        (Object.values(newAssignments) as AssignmentState[]).forEach((a) => {
            if (a.studentId) tempUsedIds.add(a.studentId);
            if (a.helperId) tempUsedIds.add(a.helperId!);
        });

        parts.forEach(part => {
            let currentStudentId = newAssignments[part.id]?.studentId;
            let currentHelperId = newAssignments[part.id]?.helperId;

            if (!currentStudentId && part.preAssignedTo !== 'Presidente') {
                // STRICT VALIDATION: Auto-Fill only picks valid candidates
                const candidates = getSortedCandidates(part, false).filter(c => c.isValid);
                const bestCandidate = candidates.find(c => !tempUsedIds.has(c.publisher.id));
                if (bestCandidate) {
                    currentStudentId = bestCandidate.publisher.id;
                    newAssignments[part.id] = { ...newAssignments[part.id], studentId: currentStudentId };
                    tempUsedIds.add(currentStudentId);
                }
            } else if (currentStudentId) tempUsedIds.add(currentStudentId);

            if (part.requiresHelper && !currentHelperId && currentStudentId) {
                const candidates = getSortedCandidates(part, true).filter(c => c.isValid);
                const student = publishers.find(p => p.id === currentStudentId);
                const bestHelper = candidates.find(c => {
                    if (tempUsedIds.has(c.publisher.id)) return false;
                    if (c.publisher.id === currentStudentId) return false;
                    if (student && !validatePairing(student, c.publisher).isValid) return false;
                    return true;
                });
                if (bestHelper) {
                    currentHelperId = bestHelper.publisher.id;
                    newAssignments[part.id] = { ...newAssignments[part.id], helperId: currentHelperId };
                    tempUsedIds.add(currentHelperId);
                }
            }
        });
        updateState({ assignments: newAssignments });
    };

    const handleAssignmentChange = (partId: string, field: keyof AssignmentState, value: string) => {
        const nextAssignments = { ...assignments };
        Object.keys(nextAssignments).forEach(otherPartId => {
            if (otherPartId !== partId) {
                const otherAssignment = nextAssignments[otherPartId];
                if (otherAssignment.studentId === value) {
                    const otherPart = parts.find(p => p.id === otherPartId);
                    if (otherPart && otherPart.preAssignedTo !== 'Presidente') {
                        nextAssignments[otherPartId] = { ...otherAssignment, studentId: '' };
                    }
                }
                if (otherAssignment.helperId === value) {
                    nextAssignments[otherPartId] = { ...otherAssignment, helperId: '' };
                }
            }
        });
        nextAssignments[partId] = { ...nextAssignments[partId], [field]: value };
        updateState({ assignments: nextAssignments });
    };

    const handleSave = async () => {
        for (const part of parts) {
            const assign = assignments[part.id];
            if (!assign.studentId && part.preAssignedTo !== 'Presidente') { alert(`Selecione um designado para "${part.partTitle}".`); return; }
            if (part.requiresHelper && !assign.helperId) { alert(`Selecione um ajudante para "${part.partTitle}".`); return; }
        }
        const finalParticipations: Participation[] = [];
        const dateObj = parseWeekDate(weekLabel);
        const weekId = dateObj.getTime() !== 0 ? dateObj.toISOString().split('T')[0] : weekLabel;
        const dateStr = calculatePartDate(weekId);

        parts.forEach(part => {
            const assign = assignments[part.id];
            if (!assign.studentId) return;
            const sName = publishers.find(p => p.id === assign.studentId)?.name || assign.studentId;
            finalParticipations.push({ id: generateUUID(), week: weekId, date: dateStr, type: part.type, partTitle: part.partTitle, publisherName: sName, duration: part.duration });
            if (part.requiresHelper && assign.helperId) {
                const hName = publishers.find(p => p.id === assign.helperId)?.name || '';
                finalParticipations.push({ id: generateUUID(), week: weekId, date: dateStr, type: ParticipationType.AJUDANTE, partTitle: 'Ajudante', publisherName: hName });
            }
        });
        await onSave(finalParticipations);
        updateState({ parts: [], weekLabel: '', assignments: {} });
    };
    
    const getRelevantRules = (part: PartToAssign) => {
        return rules.filter(rule => rule.isActive).filter(rule => {
            const hasPartTypeCondition = rule.conditions.some(c => c.fact === 'partType');
            if (!hasPartTypeCondition) return true;
            return rule.conditions.some(c => 
                c.fact === 'partType' && (
                    (c.operator === 'equal' && c.value === part.type) ||
                    (c.operator === 'in' && Array.isArray(c.value) && (c.value as string[]).includes(part.type))
                )
            );
        });
    };

    const formatDate = (ts: number) => (ts === 0 ? 'Nunca' : new Date(ts).toLocaleDateString('pt-BR'));

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 relative">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">Designação Manual Inteligente (PDF)</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 absolute top-7 right-6">
                Nota: A IA pode cometer erros na extração. Verifique a pauta gerada.
            </p>

            {!weekLabel && (
                <div 
                    className={`mb-8 p-6 border-2 border-dashed rounded-lg text-center transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <ArrowUpTrayIcon className={`mx-auto h-12 w-12 ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400 justify-center">
                        <label htmlFor="manual-file-upload" className="relative cursor-pointer rounded-md bg-white dark:bg-gray-800 font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500 px-2">
                            <span>Carregar Apostila (PDF)</span>
                            <input id="manual-file-upload" type="file" className="sr-only" accept="application/pdf" onChange={handleFileChange} />
                        </label>
                        <p className="pl-1">ou arraste e solte aqui</p>
                    </div>
                    {file && <p className="mt-2 text-sm font-bold text-green-600">Arquivo: {file.name}</p>}
                    {availableWeeks.length === 0 && (
                        <button onClick={analyzePdf} disabled={!file || isAnalyzing} className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-gray-400">
                            {isAnalyzing ? <span className="animate-pulse">Analisando PDF...</span> : <> <SparklesIcon className="h-4 w-4 mr-2"/> Analisar Semanas </>}
                        </button>
                    )}
                    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                </div>
            )}

            {availableWeeks.length > 0 && !weekLabel && (
                <div className="mb-8 text-center">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Selecione uma Semana</h3>
                    {isGenerating ? (
                        <div className="flex justify-center items-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div><span className="ml-3 text-indigo-600">Extraindo pauta...</span></div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {availableWeeks.map((week) => (
                                <button key={week} onClick={() => handleSelectWeek(week)} className="px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200 font-medium">{week}</button>
                            ))}
                        </div>
                    )}
                    <button onClick={() => updateState({ availableWeeks: [], file: null, fileBase64: null })} className="mt-6 text-sm text-gray-500 hover:underline">Voltar / Trocar Arquivo</button>
                </div>
            )}

            {weekLabel && parts.length > 0 && (
                <div className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h3 className="text-lg font-medium text-indigo-600 dark:text-indigo-400">{weekLabel}</h3>
                        
                        <div className="flex items-center gap-3 flex-wrap justify-end">
                            <div className="flex items-center text-sm bg-gray-100 dark:bg-gray-700 rounded-md p-1">
                                <button onClick={() => setSortBy('lastDate')} className={`px-2 py-1 rounded ${sortBy === 'lastDate' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}>Data</button>
                                <button onClick={() => setSortBy('name')} className={`px-2 py-1 rounded ${sortBy === 'name' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}>Nome</button>
                            </div>
                            <div className="flex items-center">
                                <input id="showBlocked" type="checkbox" checked={showBlocked} onChange={e => setShowBlocked(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded"/>
                                <label htmlFor="showBlocked" className="ml-2 text-sm text-gray-600 dark:text-gray-400">Mostrar Bloqueados</label>
                            </div>
                            <button onClick={handleAutoFill} className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                                <SparklesIcon className="h-4 w-4 mr-2"/> Auto-Fill
                            </button>
                            <button onClick={() => updateState({ weekLabel: '', parts: [] })} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2">Trocar Semana</button>
                        </div>
                    </div>
                    
                    {parts.map((part) => {
                        const candidates = getSortedCandidates(part, false);
                        const helperCandidates = part.requiresHelper ? getSortedCandidates(part, true) : [];
                        const currentAssign = assignments[part.id];
                        const borderColor = part.type === ParticipationType.TESOUROS ? 'border-blue-500' : part.type === ParticipationType.MINISTERIO ? 'border-yellow-500' : 'border-red-500';

                        return (
                            <div key={part.id} className={`pl-4 py-2 border-l-4 ${borderColor} bg-gray-50 dark:bg-gray-800/50 mb-2 rounded-r`}>
                                <div className="mb-1 flex justify-between items-center">
                                    <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{part.partTitle}</span>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs text-gray-500">({part.duration} min)</span>
                                        <button onClick={() => setViewingRulesPart(part)} className="text-gray-400 hover:text-indigo-600"><ExclamationCircleIcon className="w-5 h-5" /></button>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 flex items-center gap-2">
                                        <select 
                                            className="w-full border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white text-gray-900 font-bold shadow-sm"
                                            value={currentAssign?.studentId || ''}
                                            onChange={e => handleAssignmentChange(part.id, 'studentId', e.target.value)}
                                            disabled={!!part.preAssignedTo && part.partTitle !== 'Presidente'} 
                                        >
                                            <option value="" disabled className="font-normal text-gray-500">Selecione...</option>
                                            {candidates.map(c => {
                                                const isSelectedElsewhere = allSelectedIds.has(c.publisher.id) && currentAssign?.studentId !== c.publisher.id;
                                                const style = !c.isValid ? 'text-red-500 italic' : isSelectedElsewhere ? 'text-gray-400' : 'text-gray-900';
                                                return (
                                                    <option key={c.publisher.id} value={c.publisher.id} className={`font-bold ${style}`}>
                                                        {c.publisher.name} ({c.publisher.condition}) — {formatDate(c.lastDate)}
                                                        {!c.isValid ? ` [${c.reason}]` : isSelectedElsewhere ? ' (Já designado)' : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        {currentAssign?.studentId && onEditPublisher && (
                                            <button 
                                                onClick={() => { 
                                                    const pub = publishers.find(p => p.id === currentAssign.studentId);
                                                    if(pub) onEditPublisher(pub);
                                                }}
                                                className="text-gray-400 hover:text-indigo-600"
                                                title="Editar Publicador"
                                            >
                                                <PencilIcon className="w-4 h-4"/>
                                            </button>
                                        )}
                                        {part.preAssignedTo === 'Presidente' && part.partTitle !== 'Presidente' && <p className="text-xs text-gray-500 italic w-24">Auto-Atribuído</p>}
                                    </div>
                                    {part.requiresHelper && (
                                        <div className="flex-1 flex items-center gap-2">
                                            <select 
                                                className="w-full border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white text-gray-900 font-bold shadow-sm"
                                                value={currentAssign?.helperId || ''}
                                                onChange={e => handleAssignmentChange(part.id, 'helperId', e.target.value)}
                                            >
                                                <option value="" disabled className="font-normal text-gray-500">Ajudante...</option>
                                                {helperCandidates.map(c => {
                                                    const isSelectedElsewhere = allSelectedIds.has(c.publisher.id) && currentAssign?.helperId !== c.publisher.id;
                                                    const style = !c.isValid ? 'text-red-500 italic' : isSelectedElsewhere ? 'text-gray-400' : 'text-gray-900';
                                                    return (
                                                        <option key={c.publisher.id} value={c.publisher.id} className={`font-bold ${style}`}>
                                                            {c.publisher.name} ({c.publisher.condition}) — {formatDate(c.lastDate)}
                                                            {!c.isValid ? ` [${c.reason}]` : isSelectedElsewhere ? ' (Já designado)' : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            {currentAssign?.helperId && onEditPublisher && (
                                                <button 
                                                    onClick={() => { 
                                                        const pub = publishers.find(p => p.id === currentAssign.helperId);
                                                        if(pub) onEditPublisher(pub);
                                                    }}
                                                    className="text-gray-400 hover:text-indigo-600"
                                                    title="Editar Publicador"
                                                >
                                                    <PencilIcon className="w-4 h-4"/>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div className="flex justify-end pt-4">
                        <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md shadow hover:bg-indigo-700">Salvar Pauta</button>
                    </div>
                </div>
            )}

            {viewingRulesPart && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={() => setViewingRulesPart(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4 p-6" onClick={e => e.stopPropagation()}>
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Critérios de Seleção</h3>
                            <p className="text-sm text-gray-500">Regras aplicadas para: <span className="font-medium text-indigo-600">{viewingRulesPart.partTitle}</span></p>
                        </div>
                        
                        <div className="max-h-64 overflow-y-auto mb-4">
                            <ul className="space-y-2">
                                {getRelevantRules(viewingRulesPart).map(rule => (
                                    <li key={rule.id} className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                        • {rule.description}
                                    </li>
                                ))}
                                {getRelevantRules(viewingRulesPart).length === 0 && (
                                    <li className="text-sm text-gray-500 italic">Nenhuma regra específica.</li>
                                )}
                            </ul>
                        </div>

                        <div className="flex justify-end">
                            <button onClick={() => setViewingRulesPart(null)} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManualAssignment;
