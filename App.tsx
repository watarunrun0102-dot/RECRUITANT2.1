import React, { useEffect, useState } from 'react';
import firebase from 'firebase/compat/app';
import { auth } from './firebase';
import { Company, Task, CommonText } from './types';
import { subscribeCompanies, subscribeTasks, subscribeCommonTexts } from './services/dbService';

// Views
import { Layout } from './components/Layout';
import { Companies } from './views/Companies';
import { Tasks } from './views/Tasks';
import { CalendarView } from './views/Calendar';
import { MyPage } from './views/MyPage';
import { Button, Input } from './components/UI';

const App: React.FC = () => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('companies');

  // Data State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [commonTexts, setCommonTexts] = useState<CommonText[]>([]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Subscriptions
  useEffect(() => {
    if (!user) {
      setCompanies([]);
      setTasks([]);
      setCommonTexts([]);
      return;
    }

    const unsubCompanies = subscribeCompanies(user.uid, setCompanies);
    const unsubTasks = subscribeTasks(user.uid, setTasks);
    const unsubTexts = subscribeCommonTexts(user.uid, setCommonTexts);

    return () => {
      unsubCompanies();
      unsubTasks();
      unsubTexts();
    };
  }, [user]);

  // Login Component (Internal to keep file count low, or could be separate)
  const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await auth.signInWithEmailAndPassword(email, password);
      } catch (err: any) {
        setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold text-center text-blue-600 mb-2">RECRUITANT 2</h1>
          <p className="text-center text-slate-500 mb-8">就職活動管理アプリケーション</p>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
            <Input label="メールアドレス" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="パスワード" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full">ログイン</Button>
          </form>
          <p className="mt-4 text-xs text-center text-slate-400">
            ※デモ用アカウントがない場合はFirebase Consoleで作成してください。
          </p>
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <LoginScreen />;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'companies' && (
        <Companies userId={user.uid} companies={companies} tasks={tasks} />
      )}
      {activeTab === 'tasks' && (
        <Tasks userId={user.uid} companies={companies} tasks={tasks} />
      )}
      {activeTab === 'calendar' && (
        <CalendarView tasks={tasks} />
      )}
      {activeTab === 'mypage' && (
        <MyPage userId={user.uid} companies={companies} commonTexts={commonTexts} />
      )}
    </Layout>
  );
};

export default App;