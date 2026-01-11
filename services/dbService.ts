import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase";
import { Company, Task, CommonText } from "../types";

// Helper to remove undefined fields because Firestore throws errors on them
// Also explicitly removes 'id' to prevent it from being saved in the document data
const sanitizeData = (data: any) => {
  const cleaned: any = {};
  Object.keys(data).forEach(key => {
    if (key === 'id') return; // Never save 'id' as a field
    if (data[key] !== undefined) {
      cleaned[key] = data[key];
    }
  });
  return cleaned;
};

// --- Companies ---

export const subscribeCompanies = (userId: string, callback: (companies: Company[]) => void) => {
  const q = query(collection(db, "companies"), where("userId", "==", userId));
  return onSnapshot(q, (snapshot) => {
    // CRITICAL FIX: Spread data first, then overwrite id with doc.id
    const companies = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Company));
    callback(companies);
  });
};

export const addCompany = async (company: Omit<Company, "id">) => {
  return addDoc(collection(db, "companies"), sanitizeData(company));
};

export const updateCompany = async (id: string, data: Partial<Company>) => {
  return updateDoc(doc(db, "companies", id), sanitizeData(data));
};

// Cascade delete: Delete company AND its related tasks
export const deleteCompany = async (companyId: string) => {
  const batch = writeBatch(db);
  
  // Delete the company
  const companyRef = doc(db, "companies", companyId);
  batch.delete(companyRef);

  // Find related tasks
  const tasksQ = query(collection(db, "tasks"), where("companyId", "==", companyId));
  const tasksSnapshot = await getDocs(tasksQ);
  tasksSnapshot.forEach((tDoc) => {
    batch.delete(tDoc.ref);
  });

  await batch.commit();
};

// --- Tasks ---

export const subscribeTasks = (userId: string, callback: (tasks: Task[]) => void) => {
  const q = query(collection(db, "tasks"), where("userId", "==", userId));
  return onSnapshot(q, (snapshot) => {
    // CRITICAL FIX: Spread data first, then overwrite id with doc.id
    const tasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
    callback(tasks);
  });
};

export const addTask = async (task: Omit<Task, "id">) => {
  return addDoc(collection(db, "tasks"), sanitizeData(task));
};

export const updateTask = async (id: string, data: Partial<Task>) => {
  return updateDoc(doc(db, "tasks", id), sanitizeData(data));
};

export const deleteTask = async (id: string) => {
  return deleteDoc(doc(db, "tasks", id));
};

// Logic for "Progressing" a task: Archive old, create new
export const progressTask = async (currentTask: Task, nextTaskData: Partial<Task>) => {
  const batch = writeBatch(db);

  // 1. Mark current task as history/completed
  const currentTaskRef = doc(db, "tasks", currentTask.id);
  batch.update(currentTaskRef, {
    isHistory: true,
    completedAt: Date.now()
  });

  // 2. Create new task
  const newTaskRef = doc(collection(db, "tasks"));
  
  // CRITICAL FIX: Destructure ID out to prevent saving it
  const { id, ...taskDataWithoutId } = currentTask;

  const rawNewTask = {
    ...taskDataWithoutId,
    ...nextTaskData,
    isHistory: false,
    createdAt: Date.now(),
    // Clear specific fields that shouldn't carry over unless specified
    deadline: nextTaskData.deadline, 
    eventDate: nextTaskData.eventDate,
    eventEndDate: nextTaskData.eventEndDate,
    startTime: nextTaskData.startTime,
    endTime: nextTaskData.endTime,
    note: nextTaskData.note || '',
    esQuestions: nextTaskData.esQuestions || [] // Reset questions usually
  };
  
  const newTask = sanitizeData(rawNewTask);
  
  batch.set(newTaskRef, newTask);
  await batch.commit();
};

// --- Common Texts ---

export const subscribeCommonTexts = (userId: string, callback: (texts: CommonText[]) => void) => {
  const q = query(collection(db, "commonTexts"), where("userId", "==", userId));
  return onSnapshot(q, (snapshot) => {
    // CRITICAL FIX: Spread data first, then overwrite id with doc.id
    const texts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CommonText));
    callback(texts);
  });
};

export const addCommonText = async (text: Omit<CommonText, "id">) => {
  return addDoc(collection(db, "commonTexts"), sanitizeData(text));
};

export const updateCommonText = async (id: string, data: Partial<CommonText>) => {
  return updateDoc(doc(db, "commonTexts", id), sanitizeData(data));
};

export const deleteCommonText = async (id: string) => {
  return deleteDoc(doc(db, "commonTexts", id));
};