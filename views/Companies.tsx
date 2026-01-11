import React, { useState, useEffect } from 'react';
import { Plus, Globe, Building2, Trash2, Search, ExternalLink } from 'lucide-react';
// Firebase imports - MUST be at the top
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Company, Task } from '../types';
import { addCompany, updateCompany, deleteCompany } from '../services/dbService';
import { Modal, Button, Input, Select } from '../components/UI';

interface CompaniesProps {
  userId: string;
  companies: Company[];
  tasks: Task[];
}

export const Companies: React.FC<CompaniesProps> = ({ userId, companies, tasks }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  
  // デバッグ用: プロップスで渡ってきたデータにIDが含まれているか確認
  useEffect(() => {
    if (companies.length > 0) {
      const missingIds = companies.filter(c => !c.id);
      if (missingIds.length > 0) {
        console.error("Warning: Some companies are missing IDs!", missingIds);
      }
    }
  }, [companies]);

  // Form State
  const [formData, setFormData] = useState<Partial<Company>>({
    name: '',
    industry: '',
    priority: '第一志望群',
    mypageId: '',
    url: ''
  });

  // Filter Logic
  const filteredCompanies = companies.filter(company => {
    const term = searchTerm.toLowerCase();
    const nameMatch = company.name.toLowerCase().includes(term);
    const industryMatch = company.industry ? company.industry.toLowerCase().includes(term) : false;
    return nameMatch || industryMatch;
  });

  const resetForm = () => {
    setFormData({
      name: '',
      industry: '',
      priority: '第一志望群',
      mypageId: '',
      url: ''
    });
    setIsEditMode(false);
    setSelectedCompany(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenDetail = (company: Company) => {
    if (!company.id) {
      alert("エラー: 選択された企業のデータにIDが含まれていません。");
      return;
    }
    setSelectedCompany(company);
    setFormData(company);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      // CRITICAL: IDをデータから除外する
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _ignoredId, ...cleanData } = formData as any;

      if (selectedCompany) {
        if (!selectedCompany.id) throw new Error("Update target has no ID");
        await updateCompany(selectedCompany.id, cleanData);
      } else {
        await addCompany({
          ...cleanData,
          userId,
          createdAt: Date.now()
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました");
    }
  };

  // 修正版削除関数: ダイアログなしで即削除（Tasks.tsxと同じパターン）
  const handleDelete = async (e: React.MouseEvent) => {
    // フォーム送信と伝播を止める
    e.preventDefault();
    e.stopPropagation();

    const id = selectedCompany?.id;
    console.log("1. 削除プロセス開始 ID:", id);

    // DBオブジェクトのチェック
    if (!db) {
      alert("DB接続エラー: firebase.jsからのインポートを確認してください");
      return;
    }

    // IDチェック
    if (!id) {
      alert("エラー: 削除対象のIDが見つかりません。");
      return;
    }

    // ダイアログ削除: 即時実行
    try {
      console.log("2. 削除実行開始（確認ダイアログなし）");
      
      // サービスのdeleteCompany関数を使用（関連タスクも削除するため）
      await deleteCompany(id);
      
      console.log("3. 削除成功！");
      alert("企業情報を削除しました");
      
      setIsModalOpen(false);
      resetForm();
      
    } catch (error: any) {
      console.error("削除エラー発生:", error);
      alert("削除できませんでした: " + error.message);
    }
  };

  // Get History Tasks for selected company
  const historyTasks = selectedCompany 
    ? tasks
        .filter(t => t.companyId === selectedCompany.id && t.isHistory)
        .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    : [];

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">企業管理</h2>
        
        <div className="flex w-full md:w-auto gap-3 items-center">
            {/* Search Bar */}
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                    type="text"
                    placeholder="企業名や業界で検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                />
            </div>

            <Button onClick={handleOpenCreate} className="whitespace-nowrap">
              <div className="flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                新規登録
              </div>
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCompanies.map((company) => (
          <div 
            key={company.id} 
            onClick={() => handleOpenDetail(company)}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                company.priority === '第一志望群' ? 'bg-red-100 text-red-700' :
                company.priority === '第二志望群' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}>
                {company.priority}
              </span>
              <Building2 className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">{company.name}</h3>
            <p className="text-sm text-slate-500 mb-4">{company.industry}</p>
            {company.url && (
              <a 
                href={company.url} 
                target="_blank" 
                rel="noreferrer" 
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center text-xs text-blue-600 hover:underline"
              >
                <Globe className="w-3 h-3 mr-1" />
                企業HP/マイページ
              </a>
            )}
          </div>
        ))}
        {filteredCompanies.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
                <Search className="w-12 h-12 mb-3 opacity-20" />
                <p>条件に一致する企業は見つかりませんでした</p>
            </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isEditMode ? "企業詳細・編集" : "企業新規登録"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="企業名" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            required
            placeholder="例: 株式会社テック"
          />
          <Input 
            label="業界" 
            value={formData.industry} 
            onChange={e => setFormData({...formData, industry: e.target.value})} 
            placeholder="例: IT, 商社"
          />
          <Select
            label="志望度"
            value={formData.priority}
            onChange={e => setFormData({...formData, priority: e.target.value as any})}
            options={[
              { value: '第一志望群', label: '第一志望群' },
              { value: '第二志望群', label: '第二志望群' },
              { value: '第三志望群', label: '第三志望群' },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="マイページID" 
              value={formData.mypageId} 
              onChange={e => setFormData({...formData, mypageId: e.target.value})} 
            />
            <div className="flex flex-col">
              <Input 
                label="URL" 
                value={formData.url} 
                onChange={e => setFormData({...formData, url: e.target.value})} 
                placeholder="https://..."
              />
              {/* URLがある場合のみリンクを表示 */}
              {formData.url && (
                <div className="text-right -mt-2">
                  <a 
                    href={formData.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    マイページへ移動
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* History Section for Edit Mode */}
          {isEditMode && selectedCompany && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h4 className="font-bold text-slate-700 mb-4">これまでの取り組み（履歴）</h4>
              {historyTasks.length === 0 ? (
                <p className="text-sm text-slate-400">完了したタスクはありません</p>
              ) : (
                <div className="space-y-3">
                  {historyTasks.map(task => (
                    <div key={task.id} className="flex items-center text-sm">
                      <div className="w-24 text-slate-500 text-xs">
                        {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : '-'}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-slate-800">{task.phase}</span>
                        <span className="text-slate-400 text-xs ml-2">({task.type})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-6 mt-6 border-t border-slate-100">
            {isEditMode ? (
              /* IMPORTANT: type="button" to prevent form submission */
              <Button type="button" variant="danger" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2 inline" />
                削除
              </Button>
            ) : <div></div>}
            <div className="flex space-x-3">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>キャンセル</Button>
              <Button type="submit">{isEditMode ? '保存' : '登録'}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};