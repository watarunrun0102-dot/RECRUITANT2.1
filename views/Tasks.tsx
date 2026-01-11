import React, { useState, useMemo, useEffect } from 'react';
import { Plus, ArrowRight, Clock, FileText, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
// Firebase imports - MUST be at the top
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Company, Task, ApplicationType, SelectionPhase } from '../types';
import { addTask, updateTask, progressTask } from '../services/dbService';
import { Modal, Button, Input, Select } from '../components/UI';

interface TasksProps {
  userId: string;
  companies: Company[];
  tasks: Task[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export const Tasks: React.FC<TasksProps> = ({ userId, companies, tasks }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'progress'>('create');
  const [currentTask, setCurrentTask] = useState<Task | null>(null);

  // デバッグ: 読み込み時のデータチェック
  useEffect(() => {
    if (tasks.length > 0) {
      // 重複IDのチェック
      const ids = tasks.map(t => t.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        console.error("Critical Warning: Duplicate Task IDs detected in view!", tasks);
      }
    }
  }, [tasks]);

  // Form Data
  const [formData, setFormData] = useState<Partial<Task>>({
    companyId: '',
    type: ApplicationType.SELECTION,
    phase: SelectionPhase.ES,
    esQuestions: [],
    note: ''
  });

  // Filter Active Tasks
  const activeTasks = useMemo(() => {
    return tasks.filter(t => !t.isHistory).sort((a, b) => {
      // Sort by nearest deadline/event date
      const dateA = a.deadline || a.eventDate || a.eventEndDate || Infinity;
      const dateB = b.deadline || b.eventDate || b.eventEndDate || Infinity;
      return dateA - dateB;
    });
  }, [tasks]);

  // Analytics Data
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeTasks.forEach(t => {
      counts[t.phase] = (counts[t.phase] || 0) + 1;
    });
    const data = Object.entries(counts).map(([name, value]) => ({ name, value }));
    return data.length > 0 ? data : [{ name: 'なし', value: 1 }]; // Placeholder to prevent empty chart error
  }, [activeTasks]);

  const passRateData = useMemo(() => {
     // Simplified Pass Rate Logic
     const outcomes = {
       [ApplicationType.SELECTION]: { progress: 0, offer: 0, rejected: 0 },
       [ApplicationType.INTERNSHIP]: { progress: 0, offer: 0, rejected: 0 },
       [ApplicationType.EVENT]: { progress: 0, offer: 0, rejected: 0 },
     };

     tasks.forEach(t => {
       if (t.isHistory) return; 
       
       if (t.phase === SelectionPhase.OFFER || t.phase === SelectionPhase.PARTICIPATION_CONFIRMED) {
         outcomes[t.type].offer++;
       } else if (t.phase === SelectionPhase.REJECTED) {
         outcomes[t.type].rejected++;
       } else {
         outcomes[t.type].progress++;
       }
     });

     return Object.entries(outcomes).map(([type, data]) => ({
       name: type,
       ...data
     }));
  }, [tasks]);


  // Modal Handlers
  const openCreate = () => {
    setModalMode('create');
    setFormData({
      companyId: companies[0]?.id || '',
      type: ApplicationType.SELECTION,
      phase: SelectionPhase.ES,
      esQuestions: [],
      note: ''
    });
    setIsModalOpen(true);
  };

  const openEdit = (task: Task) => {
    if (!task.id) {
      alert("エラー: 選択されたタスクにIDが含まれていません。");
      return;
    }
    setModalMode('edit');
    setCurrentTask(task);
    setFormData(task);
    setIsModalOpen(true);
  };

  const openProgress = (task: Task) => {
    setModalMode('progress');
    setCurrentTask(task);
    let nextPhase = SelectionPhase.INTERVIEW;
    if (task.phase === SelectionPhase.ES) nextPhase = SelectionPhase.TEST;
    else if (task.phase === SelectionPhase.TEST) nextPhase = SelectionPhase.INTERVIEW;

    setFormData({
        ...task,
        phase: nextPhase,
        deadline: undefined, // Clear dates
        eventDate: undefined,
        startTime: undefined,
        endTime: undefined,
        // ES設問を引き継ぐように修正
        esQuestions: task.esQuestions || [] 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // CRITICAL: IDをデータから除外する
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _ignoredId, ...cleanData } = formData as any;

      if (modalMode === 'create') {
        const company = companies.find(c => c.id === formData.companyId);
        await addTask({
          ...cleanData,
          companyName: company?.name || 'Unknown',
          userId,
          isHistory: false,
          createdAt: Date.now()
        });
      } else if (modalMode === 'edit' && currentTask) {
         if (!currentTask.id) throw new Error("Update target has no ID");
         await updateTask(currentTask.id, cleanData);
      } else if (modalMode === 'progress' && currentTask) {
         await progressTask(currentTask, cleanData);
      }
      setIsModalOpen(false);
      setCurrentTask(null); 
    } catch (err) {
      console.error(err);
      alert("エラーが発生しました");
    }
  };

  // 修正版削除関数: ダイアログなしで即削除
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    // 1. フォーム送信と伝播を止める
    e.preventDefault();
    e.stopPropagation();

    console.log("1. 削除プロセス開始 ID:", id);

    // DBオブジェクトのチェック
    if (!db) {
      alert("DB接続エラー: firebase.jsからのインポートを確認してください");
      return;
    }

    // ダイアログ削除: 即時実行
    try {
      console.log("2. 削除実行開始（確認ダイアログなし）");
      const taskRef = doc(db, "tasks", id); 
      
      await deleteDoc(taskRef);
      
      console.log("3. 削除成功！");
      alert("タスクを削除しました"); 
      
      // データはonSnapshotで自動更新されるため、モーダルを閉じるだけでOK
      setIsModalOpen(false);
      setCurrentTask(null);
      
    } catch (error: any) {
      console.error("削除エラー発生:", error);
      alert("削除できませんでした: " + error.message);
    }
  };

  // Helper for ES Questions
  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      esQuestions: [...(prev.esQuestions || []), { question: '', answer: '' }]
    }));
  };

  const updateQuestion = (index: number, field: 'question' | 'answer', val: string) => {
    const newQs = [...(formData.esQuestions || [])];
    newQs[index][field] = val;
    setFormData({...formData, esQuestions: newQs});
  };

  const needsDeadline = [SelectionPhase.ES, SelectionPhase.TEST].includes(formData.phase as any);
  const needsEventDate = [SelectionPhase.GD, SelectionPhase.INTERVIEW, SelectionPhase.FINAL_INTERVIEW, SelectionPhase.OTHER, SelectionPhase.PARTICIPATION_CONFIRMED].includes(formData.phase as any);

  return (
    <div className="space-y-8">
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-bold text-slate-700 mb-4">現在のタスク内訳</h3>
            <div style={{ width: '100%', height: '300px' }} className="relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie 
                          data={pieData} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={80} 
                          label={pieData.length > 1} // プレースホルダーの時はラベル出さない
                        >
                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.name === 'なし' ? '#e2e8f0' : COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
             <h3 className="font-bold text-slate-700 mb-4">現在のステータス状況</h3>
             <div style={{ width: '100%', height: '300px' }} className="relative">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={passRateData}>
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="progress" name="進行中" stackId="a" fill="#3b82f6" />
                        <Bar dataKey="offer" name="内定/参加" stackId="a" fill="#10b981" />
                        <Bar dataKey="rejected" name="お見送り" stackId="a" fill="#ef4444" />
                    </BarChart>
                </ResponsiveContainer>
             </div>
        </div>
      </div>

      {/* List Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">選考タスク一覧</h2>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2 inline" />
            タスク追加
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeTasks.length === 0 && <p className="text-slate-400">進行中のタスクはありません</p>}
          {activeTasks.map(task => {
              const displayDate = task.deadline || task.eventDate || task.eventEndDate;
              const isUrgent = displayDate ? (displayDate - Date.now() < 3 * 86400000 && displayDate > Date.now()) : false;

              return (
                <div key={task.id} className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all relative ${isUrgent ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-3">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">{task.type}</span>
                        <div className="flex space-x-1">
                             <button onClick={() => openEdit(task)} className="text-xs text-slate-400 hover:text-blue-600 px-2 py-1">編集</button>
                        </div>
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 leading-tight mb-1">{task.companyName}</h3>
                    <div className="flex items-center text-blue-600 font-semibold mb-3">
                        <span className="mr-2">{task.phase}</span>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600 mb-4">
                        {displayDate && (
                            <div className={`flex items-center ${isUrgent ? 'text-red-600 font-bold' : ''}`}>
                                <Clock className="w-4 h-4 mr-2" />
                                {new Date(displayDate).toLocaleDateString()} 
                                {task.startTime && ` ${task.startTime}~`}
                            </div>
                        )}
                        {task.esQuestions && task.esQuestions.length > 0 && (
                            <div className="flex items-center text-slate-500">
                                <FileText className="w-4 h-4 mr-2" />
                                ES設問 {task.esQuestions.length}問
                            </div>
                        )}
                    </div>

                    <Button className="w-full mt-2" onClick={() => openProgress(task)}>
                        次のステップへ
                        <ArrowRight className="w-4 h-4 ml-2 inline" />
                    </Button>
                </div>
              );
          })}
        </div>
      </div>

      {/* Task Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalMode === 'create' ? "新規タスク登録" : modalMode === 'edit' ? "タスク編集" : "次の選考へ進む"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {modalMode === 'create' && (
             <Select
                label="企業"
                value={formData.companyId}
                onChange={e => setFormData({...formData, companyId: e.target.value})}
                options={companies.map(c => ({ value: c.id, label: c.name }))}
                disabled={companies.length === 0}
             />
          )}
          {modalMode === 'progress' && (
              <div className="bg-blue-50 p-3 rounded mb-4 text-sm text-blue-800">
                  <span className="font-bold">前のステップ:</span> {currentTask?.phase} <br/>
                  このタスクを履歴に保存し、新しいタスクを作成します。
              </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Select
                label="応募形式"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as any})}
                options={Object.values(ApplicationType).map(v => ({ value: v, label: v }))}
            />
            <Select
                label="選考段階"
                value={formData.phase}
                onChange={e => setFormData({...formData, phase: e.target.value as any})}
                options={Object.values(SelectionPhase).map(v => ({ value: v, label: v }))}
            />
          </div>

          {/* Dynamic Date Fields */}
          {needsDeadline && (
            <Input 
                type="date"
                label="提出期限"
                value={formData.deadline ? new Date(formData.deadline).toISOString().split('T')[0] : ''}
                onChange={e => setFormData({...formData, deadline: e.target.value ? new Date(e.target.value).getTime() : undefined})}
            />
          )}

          {needsEventDate && (
             <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
                <Input 
                    type="date"
                    label="開催日"
                    value={formData.eventDate ? new Date(formData.eventDate).toISOString().split('T')[0] : ''}
                    onChange={e => setFormData({...formData, eventDate: e.target.value ? new Date(e.target.value).getTime() : undefined})}
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input label="開始時間" type="time" value={formData.startTime || ''} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                    <Input label="終了時間" type="time" value={formData.endTime || ''} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                </div>
             </div>
          )}

          {/* ES Questions */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">ES設問 / メモ</label>
                <button type="button" onClick={addQuestion} className="text-xs text-blue-600 hover:underline">+ 設問追加</button>
            </div>
            {formData.esQuestions?.map((q, idx) => (
                <div key={idx} className="mb-4 bg-slate-50 p-3 rounded">
                    <input 
                        className="w-full mb-2 bg-transparent border-b border-slate-300 focus:outline-none focus:border-blue-500 text-sm font-bold placeholder-slate-400"
                        placeholder="設問内容..."
                        value={q.question}
                        onChange={e => updateQuestion(idx, 'question', e.target.value)}
                    />
                    <textarea 
                        className="w-full p-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="回答..."
                        rows={3}
                        value={q.answer}
                        onChange={e => updateQuestion(idx, 'answer', e.target.value)}
                    />
                    <div className="text-right text-xs text-slate-400 mt-1">{q.answer.length}文字</div>
                </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
             {modalMode === 'edit' ? (
                /* IMPORTANT: type="button" to prevent form submission */
                <Button type="button" variant="danger" onClick={(e) => {
                  if (currentTask?.id) handleDelete(e, currentTask.id);
                }}>
                    <Trash2 className="w-4 h-4 mr-2 inline" />
                    削除
                </Button>
             ) : (
                <div></div>
             )}
             <div className="flex space-x-3">
                 <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>キャンセル</Button>
                 <Button type="submit">{modalMode === 'progress' ? '更新して次へ' : '保存'}</Button>
             </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};