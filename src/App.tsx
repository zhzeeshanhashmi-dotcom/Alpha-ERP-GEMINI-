/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  Receipt, 
  Truck, 
  Briefcase, 
  Wallet, 
  Plus, 
  Search, 
  LogOut, 
  Moon, 
  Sun, 
  Download, 
  Users, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Eye,
  EyeOff,
  X,
  Printer,
  Edit,
  Trash2,
  ArrowRight,
  Filter,
  RotateCcw,
  Trophy,
  Settings,
  Tag,
  Layers,
  Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isAfter } from 'date-fns';
import type { 
  User, 
  Session, 
  LedgerEntry, 
  Quotation, 
  Invoice, 
  Challan, 
  Investment, 
  EarnestMoney,
  LedgerType,
  PaymentMode,
  LineItem
} from './types';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants & Defaults ---
const TEAM_CODE = 'ASS2026';
const DASH_COLORS = ['#ef4444', '#8b5cf6', '#f59e0b', '#f97316', '#ec4899', '#3b82f6', '#10b981'];

const DEFAULT_CATEGORIES = [
  'Opening Balance', 'Earnest Money', 'Investment', 'Cost of Goods Sold', 
  'Invoice', 'Salary', 'Office Expenses', 'Utility', 'Loan', 'Gifts', 
  'Meal', 'Bike Petrol', 'Fuel', 'Entertainment', 'Staff Expenses', 'Other'
];

const DEFAULT_SUB_CATEGORIES = ['Monthly', 'Weekly', 'One-time', 'Advance', 'Balance'];

// --- Helper Functions ---
const pkrF = (n: number) => {
  const val = Math.round(n || 0);
  const sg = val < 0 ? '-' : '';
  return sg + Math.abs(val).toLocaleString('en-PK');
};

const pkrC = (n: number) => `PKR ${pkrF(n)}`;

const getUID = () => Date.now() + Math.floor(Math.random() * 1000);

const getTod = () => new Date().toISOString().split('T')[0];

// --- Main App Component ---
export default function App() {
  // --- Auth State ---
  const [session, setSession] = useState<Session | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [authMsg, setAuthMsg] = useState<{ text: string, type: 'ok' | 'err' } | null>(null);

  // --- App State ---
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState('overview');
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [subCategories, setSubCategories] = useState<string[]>(DEFAULT_SUB_CATEGORIES);
  const [printHeaderSpace, setPrintHeaderSpace] = useState<number>(40); // in mm
  const [printData, setPrintData] = useState<{ type: string, doc: any } | null>(null);

  // --- UI State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string, type: string, data?: any } | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerFilter, setLedgerFilter] = useState({ type: '', cat: '', mode: '' });
  const [quotationFilter, setQuotationFilter] = useState('All');

  // --- Initialization ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('ass_theme') as 'light' | 'dark' || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    const savedUsers = JSON.parse(localStorage.getItem('ass_users') || '[]');
    setUsers(savedUsers);

    const savedSession = JSON.parse(localStorage.getItem('ass_session') || 'null');
    if (savedSession) {
      const user = savedUsers.find((u: User) => u.username === savedSession.username);
      if (user && (user.status === 'approved' || user.role === 'admin')) {
        setSession(savedSession);
        loadUserData(user.username);
      } else {
        localStorage.removeItem('ass_session');
      }
    }
    setIsAuthReady(true);
  }, []);

  const loadUserData = (username: string) => {
    const prefix = `bms4_${username}_`;
    setLedger(JSON.parse(localStorage.getItem(`${prefix}ledger`) || '[]'));
    setQuotations(JSON.parse(localStorage.getItem(`${prefix}quotations`) || '[]'));
    setInvoices(JSON.parse(localStorage.getItem(`${prefix}invoices`) || '[]'));
    setChallans(JSON.parse(localStorage.getItem(`${prefix}challans`) || '[]'));
    setCategories(JSON.parse(localStorage.getItem(`${prefix}categories`) || JSON.stringify(DEFAULT_CATEGORIES)));
    setSubCategories(JSON.parse(localStorage.getItem(`${prefix}subCategories`) || JSON.stringify(DEFAULT_SUB_CATEGORIES)));
    setPrintHeaderSpace(Number(localStorage.getItem(`${prefix}printHeaderSpace`) || '40'));
  };

  const saveUserData = (key: string, data: any) => {
    if (!session) return;
    const prefix = `bms4_${session.username}_`;
    localStorage.setItem(`${prefix}${key}`, typeof data === 'string' ? data : JSON.stringify(data));
  };

  // --- Auth Handlers ---
  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = (formData.get('username') as string).toLowerCase().trim();
    const password = formData.get('password') as string;

    const user = users.find(u => u.username === username);
    if (!user) return setAuthMsg({ text: 'Username not found.', type: 'err' });
    if (user.password !== password) return setAuthMsg({ text: 'Incorrect password.', type: 'err' });
    
    if (user.status === 'pending') return setAuthMsg({ text: 'Account pending approval.', type: 'err' });
    if (user.status === 'rejected') return setAuthMsg({ text: 'Account access rejected.', type: 'err' });

    const newSession = {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      loggedInAt: new Date().toISOString()
    };
    setSession(newSession);
    localStorage.setItem('ass_session', JSON.stringify(newSession));
    loadUserData(user.username);
    setAuthMsg(null);
  };

  const handleSignup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const displayName = formData.get('name') as string;
    const username = (formData.get('username') as string).toLowerCase().trim();
    const password = formData.get('password') as string;
    const code = formData.get('code') as string;

    if (code !== TEAM_CODE) return setAuthMsg({ text: 'Incorrect Team Code.', type: 'err' });
    if (users.find(u => u.username === username)) return setAuthMsg({ text: 'Username taken.', type: 'err' });

    const isFirst = users.length === 0;
    const newUser: User = {
      id: getUID(),
      username,
      displayName,
      password,
      role: isFirst ? 'admin' : 'member',
      status: isFirst ? 'approved' : 'pending',
      createdAt: new Date().toISOString()
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('ass_users', JSON.stringify(updatedUsers));

    if (isFirst) {
      const newSession = {
        username: newUser.username,
        displayName: newUser.displayName,
        role: newUser.role,
        loggedInAt: new Date().toISOString()
      };
      setSession(newSession);
      localStorage.setItem('ass_session', JSON.stringify(newSession));
      loadUserData(newUser.username);
    } else {
      setAuthMsg({ text: 'Signup successful! Awaiting admin approval.', type: 'ok' });
      setAuthTab('login');
    }
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('ass_session');
    setActiveTab('overview');
  };

  // --- Theme Handler ---
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('ass_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // --- Data Calculations ---
  const financialSummary = useMemo(() => {
    // Basic Ledger Summary
    const deposit = ledger.filter(r => r.type === 'Deposit').reduce((s, r) => s + r.amount, 0);
    const credit = ledger.filter(r => r.type === 'Credit').reduce((s, r) => s + r.amount, 0);
    const payables = ledger.filter(r => r.type === 'Payables').reduce((s, r) => s + r.amount, 0);
    const receivables = ledger.filter(r => r.type === 'Receivables').reduce((s, r) => s + r.amount, 0);
    
    // Earnest Money Logic
    const earnestPending = ledger
      .filter(r => r.cat === 'Earnest Money' && r.earnestStatus !== 'Released')
      .reduce((s, r) => s + r.amount, 0);
    
    // Investment Logic
    const investmentOwed = ledger
      .filter(r => r.cat === 'Investment')
      .reduce((s, r) => {
        if (r.investmentAction === 'Taken') return s + r.amount;
        if (r.investmentAction === 'Return') return s - r.amount;
        return s;
      }, 0);

    return { 
      deposit, 
      credit, 
      payables, 
      receivables, 
      net: deposit - credit,
      earnestPending,
      investmentOwed
    };
  }, [ledger]);

  const filteredLedger = useMemo(() => {
    return ledger.filter(r => {
      const mf = (!ledgerFilter.type || r.type === ledgerFilter.type) &&
                 (!ledgerFilter.cat || r.cat === ledgerFilter.cat) &&
                 (!ledgerFilter.mode || (r as any).paymentMode === ledgerFilter.mode);
      const ms = !ledgerSearch || [r.desc, r.cat, r.subCat, r.projectName, r.caseName, r.refNo, r.remarks, r.investorName]
                 .some(f => (f || '').toLowerCase().includes(ledgerSearch.toLowerCase()));
      return mf && ms;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ledger, ledgerFilter, ledgerSearch]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      if (quotationFilter === 'All') return true;
      return q.status === quotationFilter;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [quotations, quotationFilter]);

  // --- Data Handlers ---
  const handleSaveLedger = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    
    // Auto-increment Sr No for new entries
    const nextId = ledger.length > 0 ? Math.max(...ledger.map(l => Number(l.id) || 0)) + 1 : 1;
    
    const entry: LedgerEntry = {
      id: modalContent?.data?.id || nextId.toString(),
      date: formData.get('date') as string,
      desc: formData.get('desc') as string,
      amount,
      type: formData.get('type') as LedgerType,
      cat: formData.get('cat') as string,
      subCat: formData.get('subCat') as string,
      projectName: formData.get('projectName') as string,
      caseName: formData.get('caseName') as string,
      refNo: formData.get('refNo') as string,
      remarks: formData.get('remarks') as string,
      investorName: formData.get('investorName') as string,
      investmentAction: formData.get('investmentAction') as any,
      earnestStatus: formData.get('earnestStatus') as any,
    };

    const updatedLedger = modalContent?.data?.id 
      ? ledger.map(l => l.id === entry.id ? entry : l)
      : [entry, ...ledger];
    
    setLedger(updatedLedger);
    saveUserData('ledger', updatedLedger);
    setIsModalOpen(false);
  };

  const handleDeleteLedger = (id: number) => {
    const updatedLedger = ledger.filter(l => l.id !== id);
    setLedger(updatedLedger);
    saveUserData('ledger', updatedLedger);
  };

  const handleSaveQuotation = (q: Quotation) => {
    const updated = quotations.some(item => item.id === q.id)
      ? quotations.map(item => item.id === q.id ? q : item)
      : [q, ...quotations];
    setQuotations(updated);
    saveUserData('quotations', updated);
    setIsModalOpen(false);
  };

  const handleDeleteQuotation = (id: number) => {
    if (!confirm('Are you sure you want to delete this quotation?')) return;
    const updated = quotations.filter(q => q.id !== id);
    setQuotations(updated);
    saveUserData('quotations', updated);
  };

  const handleSaveInvoice = (inv: Invoice) => {
    const updated = invoices.some(item => item.id === inv.id)
      ? invoices.map(item => item.id === inv.id ? inv : item)
      : [inv, ...invoices];
    setInvoices(updated);
    saveUserData('invoices', updated);
    setIsModalOpen(false);
  };

  const handleDeleteInvoice = (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    const updated = invoices.filter(i => i.id !== id);
    setInvoices(updated);
    saveUserData('invoices', updated);
  };

  const handleSaveChallan = (ch: Challan) => {
    const updated = challans.some(item => item.id === ch.id)
      ? challans.map(item => item.id === ch.id ? ch : item)
      : [ch, ...challans];
    setChallans(updated);
    saveUserData('challans', updated);
    setIsModalOpen(false);
  };

  const handleDeleteChallan = (id: number) => {
    if (!confirm('Are you sure you want to delete this challan?')) return;
    const updated = challans.filter(c => c.id !== id);
    setChallans(updated);
    saveUserData('challans', updated);
  };

  const handleQuickAction = (entry: LedgerEntry, updates: Partial<LedgerEntry>) => {
    const updatedLedger = ledger.map(l => l.id === entry.id ? { ...l, ...updates } : l);
    setLedger(updatedLedger);
    saveUserData('ledger', updatedLedger);
  };

  const handleAddCategory = (type: 'cat' | 'sub') => {
    const name = prompt(`Enter new ${type === 'cat' ? 'Category' : 'Sub Category'} name:`);
    if (!name) return;
    if (type === 'cat') {
      const updated = [...categories, name];
      setCategories(updated);
      saveUserData('categories', updated);
    } else {
      const updated = [...subCategories, name];
      setSubCategories(updated);
      saveUserData('subCategories', updated);
    }
  };

  const handleRemoveCategory = (type: 'cat' | 'sub', name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}"?`)) return;
    if (type === 'cat') {
      const updated = categories.filter(c => c !== name);
      setCategories(updated);
      saveUserData('categories', updated);
    } else {
      const updated = subCategories.filter(c => c !== name);
      setSubCategories(updated);
      saveUserData('subCategories', updated);
    }
  };

  const handleExportData = () => {
    const wb = XLSX.utils.book_new();
    
    // Ledger
    const wsLedger = XLSX.utils.json_to_sheet(ledger);
    XLSX.utils.book_append_sheet(wb, wsLedger, "Ledger");
    
    // Quotations
    const wsQuotations = XLSX.utils.json_to_sheet(quotations.map(q => ({
      ...q,
      items: JSON.stringify(q.items)
    })));
    XLSX.utils.book_append_sheet(wb, wsQuotations, "Quotations");
    
    // Invoices
    const wsInvoices = XLSX.utils.json_to_sheet(invoices.map(i => ({
      ...i,
      items: JSON.stringify(i.items)
    })));
    XLSX.utils.book_append_sheet(wb, wsInvoices, "Invoices");
    
    // Challans
    const wsChallans = XLSX.utils.json_to_sheet(challans.map(c => ({
      ...c,
      items: JSON.stringify(c.items)
    })));
    XLSX.utils.book_append_sheet(wb, wsChallans, "Challans");

    // Categories
    const wsCats = XLSX.utils.json_to_sheet(categories.map(c => ({ name: c })));
    XLSX.utils.book_append_sheet(wb, wsCats, "Categories");
    
    // SubCategories
    const wsSubCats = XLSX.utils.json_to_sheet(subCategories.map(s => ({ name: s })));
    XLSX.utils.book_append_sheet(wb, wsSubCats, "SubCategories");

    XLSX.writeFile(wb, `Alpha_Scientific_Data_${getTod()}.xlsx`);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        // Ledger
        if (wb.SheetNames.includes("Ledger")) {
          const data = XLSX.utils.sheet_to_json(wb.Sheets["Ledger"]) as LedgerEntry[];
          setLedger(data);
          saveUserData('ledger', data);
        }
        
        // Quotations
        if (wb.SheetNames.includes("Quotations")) {
          const data = XLSX.utils.sheet_to_json(wb.Sheets["Quotations"]) as any[];
          const parsed = data.map(q => ({ ...q, items: JSON.parse(q.items) }));
          setQuotations(parsed);
          saveUserData('quotations', parsed);
        }
        
        // Invoices
        if (wb.SheetNames.includes("Invoices")) {
          const data = XLSX.utils.sheet_to_json(wb.Sheets["Invoices"]) as any[];
          const parsed = data.map(i => ({ ...i, items: JSON.parse(i.items) }));
          setInvoices(parsed);
          saveUserData('invoices', parsed);
        }
        
        // Challans
        if (wb.SheetNames.includes("Challans")) {
          const data = XLSX.utils.sheet_to_json(wb.Sheets["Challans"]) as any[];
          const parsed = data.map(c => ({ ...c, items: JSON.parse(c.items) }));
          setChallans(parsed);
          saveUserData('challans', parsed);
        }

        // Categories
        if (wb.SheetNames.includes("Categories")) {
          const data = XLSX.utils.sheet_to_json(wb.Sheets["Categories"]) as any[];
          const parsed = data.map(c => c.name);
          setCategories(parsed);
          saveUserData('categories', parsed);
        }
        
        // SubCategories
        if (wb.SheetNames.includes("SubCategories")) {
          const data = XLSX.utils.sheet_to_json(wb.Sheets["SubCategories"]) as any[];
          const parsed = data.map(s => s.name);
          setSubCategories(parsed);
          saveUserData('subCategories', parsed);
        }

        alert("Data imported successfully!");
      } catch (err) {
        console.error(err);
        alert("Error importing data. Please check the file format.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePrint = (type: string, doc: any) => {
    setPrintData({ type, doc });
    setTimeout(() => {
      window.print();
      setPrintData(null);
    }, 500);
  };

  // --- Render Helpers ---
  if (!isAuthReady) return null;

  if (!session) {
    return (
      <>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gradient-to-br from-[#0f1117] via-[#1a1d3a] to-[#0f1117] overflow-y-auto no-print">
        <div className="w-full max-w-md animate-fade-up">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl inline-flex items-center justify-center text-3xl mb-4 shadow-[0_0_40px_rgba(59,130,246,0.4)]">
              <Shield className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-[#f0f2ff] tracking-tight">Alpha Scientific Safety</h1>
            <p className="text-sm text-[#8892b0] mt-1">Business Management Portal</p>
          </div>

          <div className="bg-[#1e2030] border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="grid grid-cols-2 bg-white/5 rounded-xl p-1 mb-6 gap-1">
              <button 
                onClick={() => { setAuthTab('login'); setAuthMsg(null); }}
                className={cn("py-2 text-sm font-bold rounded-lg transition-all", authTab === 'login' ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg" : "text-[#8892b0]")}
              >
                Sign In
              </button>
              <button 
                onClick={() => { setAuthTab('signup'); setAuthMsg(null); }}
                className={cn("py-2 text-sm font-bold rounded-lg transition-all", authTab === 'signup' ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg" : "text-[#8892b0]")}
              >
                Sign Up
              </button>
            </div>

            {authTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8892b0]">Username</label>
                  <input name="username" type="text" required placeholder="Enter your username" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[#f0f2ff] outline-none focus:border-blue-500/60 focus:bg-blue-500/5 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8892b0]">Password</label>
                  <div className="relative">
                    <input name="password" type={showPassword ? "text" : "password"} required placeholder="Enter your password" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[#f0f2ff] outline-none focus:border-blue-500/60 focus:bg-blue-500/5 transition-all" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6480] hover:text-white transition-colors">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all active:scale-95">
                  Sign In
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8892b0]">Full Name</label>
                  <input name="name" type="text" required placeholder="Your full name" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[#f0f2ff] outline-none focus:border-blue-500/60 focus:bg-blue-500/5 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8892b0]">Username</label>
                  <input name="username" type="text" required placeholder="Choose a username" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[#f0f2ff] outline-none focus:border-blue-500/60 focus:bg-blue-500/5 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8892b0]">Password</label>
                  <div className="relative">
                    <input name="password" type={showPassword ? "text" : "password"} required placeholder="Min 6 characters" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[#f0f2ff] outline-none focus:border-blue-500/60 focus:bg-blue-500/5 transition-all" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6480] hover:text-white transition-colors">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8892b0]">Team Code</label>
                  <input name="code" type="text" required placeholder="Enter team invite code" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[#f0f2ff] outline-none focus:border-blue-500/60 focus:bg-blue-500/5 transition-all" />
                </div>
                <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all active:scale-95">
                  Create Account
                </button>
              </form>
            )}

            {authMsg && (
              <div className={cn("mt-4 p-3 rounded-xl text-center text-xs font-semibold border animate-fade-up", authMsg.type === 'ok' ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-red-500/15 text-red-400 border-red-500/30")}>
                {authMsg.text}
              </div>
            )}

            <p className="text-[11px] text-[#5a6480] text-center mt-6 leading-relaxed">
              Ask your admin for the <strong className="text-[#8892b0]">Team Code</strong>.
            </p>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {printData && <PrintLayout data={printData} headerSpace={printHeaderSpace} />}
      
      <div className="no-print flex-1 flex flex-col pb-24">
        {/* Header */}
        <header className="sticky top-0 z-[200] bg-[var(--s1)] border-b border-[var(--bd)] px-4 h-14 flex items-center justify-between shadow-[var(--shadow)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white shadow-lg">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">Alpha Scientific Safety</h1>
            <p className="text-[10px] text-[var(--mt)] font-medium">Business Management</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="w-10 h-6 bg-[var(--s2)] border border-[var(--bd)] rounded-full p-1 flex items-center transition-all">
            <div className={cn("w-4 h-4 rounded-full flex items-center justify-center transition-transform duration-300", theme === 'dark' ? "translate-x-4 bg-purple-500" : "translate-x-0 bg-blue-500")}>
              {theme === 'dark' ? <Moon size={10} className="text-white" /> : <Sun size={10} className="text-white" />}
            </div>
          </button>
          
          {session.role === 'admin' && (
            <button 
              onClick={() => { setModalContent({ title: 'User Management', type: 'admin' }); setIsModalOpen(true); }}
              className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors" 
              title="Users"
            >
              <Users size={18} />
            </button>
          )}

          <button 
            onClick={() => {
              const data = { ledger, quotations, invoices, challans };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `ASS_Backup_${getTod()}.json`;
              a.click();
            }}
            className="p-2 text-[var(--mt)] hover:bg-[var(--s2)] rounded-lg transition-colors" 
            title="Export Data"
          >
            <Download size={18} />
          </button>
          
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[var(--s2)] rounded-lg border border-[var(--bd)]">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-md flex items-center justify-center text-white text-[10px] font-black">
              {session.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            <span className="text-[11px] font-bold max-w-[80px] truncate">{session.displayName}</span>
          </div>

          <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="sticky top-14 z-[199] bg-[var(--s1)] border-b-2 border-[var(--bd)] flex overflow-x-auto scrollbar-hide px-2">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'ledger', label: 'Ledger', icon: BookOpen },
          { id: 'quotations', label: 'Quotations', icon: FileText },
          { id: 'invoices', label: 'Invoices', icon: Receipt },
          { id: 'challans', label: 'Challans', icon: Truck },
          { id: 'invest', label: 'Investments', icon: Briefcase },
          { id: 'earnest', label: 'Earnest Money', icon: Wallet },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-shrink-0 px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-[2px] flex items-center gap-2",
              activeTab === tab.id ? "text-blue-500 border-blue-500" : "text-[var(--mt)] border-transparent hover:text-[var(--tx)]"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 animate-fade-up">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Financial Summary */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--mt)]">Financial Summary</h2>
                <div className="flex-1 h-px bg-[var(--bd)]" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard 
                  label="Net Balance" 
                  value={pkrC(financialSummary.net)} 
                  sub={financialSummary.net >= 0 ? "Positive Balance" : "Negative Balance"} 
                  color="green" 
                  icon={<TrendingUp size={16} />}
                />
                <KPICard 
                  label="Earnest Pending" 
                  value={pkrC(financialSummary.earnestPending)} 
                  sub="Held by Dept" 
                  color="yellow" 
                  icon={<Wallet size={16} />}
                />
                <KPICard 
                  label="Investment Owed" 
                  value={pkrC(financialSummary.investmentOwed)} 
                  sub="To Investors" 
                  color="purple" 
                  icon={<Briefcase size={16} />}
                />
                <KPICard 
                  label="Payables" 
                  value={pkrC(financialSummary.payables)} 
                  sub="Pending Payments" 
                  color="red" 
                  icon={<TrendingDown size={16} />}
                />
              </div>
            </section>

            {/* Module Overview */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--mt)]">Module Overview</h2>
                <div className="flex-1 h-px bg-[var(--bd)]" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <ModuleCard 
                  title="Ledger" 
                  badge={`${ledger.length} Entries`} 
                  icon={<BookOpen size={14} />} 
                  color="blue"
                  rows={[
                    { label: 'Credits', value: pkrC(financialSummary.cr), color: 'text-green-500' },
                    { label: 'Debits', value: pkrC(financialSummary.db), color: 'text-red-500' }
                  ]}
                />
                <ModuleCard 
                  title="Quotations" 
                  badge={`${quotations.length} Total`} 
                  icon={<FileText size={14} />} 
                  color="yellow"
                  rows={[
                    { label: 'Sent', value: quotations.filter(q => q.status === 'Sent').length.toString(), color: 'text-yellow-500' },
                    { label: 'Approved', value: quotations.filter(q => q.status === 'Approved').length.toString(), color: 'text-green-500' }
                  ]}
                />
                <ModuleCard 
                  title="Invoices" 
                  badge={`${invoices.length} Total`} 
                  icon={<Receipt size={14} />} 
                  color="green"
                  rows={[
                    { label: 'Received', value: invoices.filter(i => i.status === 'Received').length.toString(), color: 'text-green-500' },
                    { label: 'Unpaid', value: invoices.filter(i => i.status === 'Not Received').length.toString(), color: 'text-red-500' }
                  ]}
                />
              </div>
            </section>

            {/* Analytics & Activity */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--bd)] flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-[var(--mt)]">Spending By Category</h3>
                  <span className="text-[10px] text-[var(--mt2)] font-bold">Top Debits</span>
                </div>
                <div className="p-4 space-y-3">
                  {Object.entries(
                    ledger.filter(r => r.type === 'Debit').reduce((acc, r) => {
                      const cat = r.cat || 'Other';
                      acc[cat] = (acc[cat] || 0) + (r.amount || 0);
                      return acc;
                    }, {} as Record<string, number>)
                  )
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .slice(0, 5)
                  .map(([cat, amt], idx) => (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span>{cat}</span>
                        <span>{pkrC(amt as number)}</span>
                      </div>
                      <div className="h-2 bg-[var(--s2)] rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: DASH_COLORS[idx % DASH_COLORS.length], opacity: 0.8 }}
                        />
                      </div>
                    </div>
                  ))}
                  {ledger.filter(r => r.type === 'Debit').length === 0 && (
                    <div className="text-center py-8 text-[var(--mt)] text-xs">No debit entries yet.</div>
                  )}
                </div>
              </div>

              <div className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--bd)] flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-[var(--mt)]">Recent Activity</h3>
                  <span className="text-[10px] text-[var(--mt2)] font-bold">Last 5 Entries</span>
                </div>
                <div className="divide-y divide-[var(--bd)]">
                  {ledger.slice(0, 5).map(entry => (
                    <div key={entry.id} className="p-3 flex items-center gap-3 hover:bg-[var(--s2)] transition-colors">
                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        entry.type === 'Credit' ? "bg-green-500" : entry.type === 'Debit' ? "bg-red-500" : "bg-yellow-500"
                      )} />
                      <div className="flex-1 min-width-0">
                        <p className="text-xs font-bold truncate">{entry.desc}</p>
                        <p className="text-[10px] text-[var(--mt)]">{entry.cat} • {entry.date}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn(
                          "text-xs font-black",
                          entry.type === 'Credit' ? "text-green-500" : entry.type === 'Debit' ? "text-red-500" : "text-yellow-500"
                        )}>
                          {entry.type === 'Credit' ? '+' : '-'}{pkrF(entry.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {ledger.length === 0 && (
                    <div className="text-center py-8 text-[var(--mt)] text-xs">No entries yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="space-y-4">
            <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mt)]" size={16} />
                <input 
                  type="text" 
                  placeholder="Search ledger..." 
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[var(--s2)] border border-[var(--bd)] rounded-xl text-sm outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex-1 md:flex-none">
                  <select 
                    value={ledgerFilter.type}
                    onChange={(e) => setLedgerFilter({ ...ledgerFilter, type: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--s2)] border border-[var(--bd)] rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="">All Types</option>
                    <option value="Deposit">Deposit</option>
                    <option value="Credit">Credit</option>
                    <option value="Payables">Payables</option>
                    <option value="Receivables">Receivables</option>
                  </select>
                </div>
                <div className="flex-1 md:flex-none">
                  <select 
                    value={ledgerFilter.cat}
                    onChange={(e) => setLedgerFilter({ ...ledgerFilter, cat: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--s2)] border border-[var(--bd)] rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--s2)] border-b border-[var(--bd)]">
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--mt)]">Sr No</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--mt)]">Date</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--mt)]">Description</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--mt)]">Category</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--mt)]">Project/Case</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--mt)] text-right">Amount</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--mt)] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--bd)]">
                    {filteredLedger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-[var(--s2)] transition-colors group">
                        <td className="px-4 py-3 text-[11px] font-mono text-[var(--mt)]">{entry.id}</td>
                        <td className="px-4 py-3 text-[11px] font-medium whitespace-nowrap">{entry.date}</td>
                        <td className="px-4 py-3">
                          <p className="text-[11px] font-bold">{entry.desc}</p>
                          {entry.refNo && <p className="text-[9px] text-[var(--mt)] font-mono">Ref: {entry.refNo}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-[var(--s2)] border border-[var(--bd)] rounded-full text-[9px] font-bold text-[var(--mt)]">
                            {entry.cat}
                          </span>
                          {entry.subCat && <p className="text-[9px] text-[var(--mt)] mt-0.5">{entry.subCat}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[10px] font-bold truncate max-w-[120px]">{entry.projectName || '-'}</p>
                          <p className="text-[9px] text-[var(--mt)] truncate max-w-[120px]">{entry.caseName || '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className={cn(
                            "text-[11px] font-black",
                            entry.type === 'Deposit' ? "text-green-500" : entry.type === 'Credit' ? "text-red-500" : "text-yellow-500"
                          )}>
                            {entry.type === 'Credit' ? '-' : '+'}{pkrF(entry.amount)}
                          </p>
                          <p className="text-[8px] font-bold uppercase opacity-50">{entry.type}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => { setModalContent({ title: 'Edit Entry', type: 'ledger', data: entry }); setIsModalOpen(true); }}
                              className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteLedger(entry.id)}
                              className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredLedger.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-[var(--mt)] text-sm">
                          No matching entries found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quotations' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <KPICard label="Total" value={quotations.length.toString()} sub="all time" color="blue" icon={<FileText size={16} />} />
              <KPICard label="Awaiting Reply" value={quotations.filter(q => q.status === 'Sent').length.toString()} sub="sent to clients" color="yellow" icon={<Clock size={16} />} />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {['All', 'Draft', 'Sent', 'Approved', 'Rejected', 'Converted'].map(status => (
                <button 
                  key={status} 
                  onClick={() => setQuotationFilter(status)}
                  className={cn(
                    "px-3 py-1.5 border border-[var(--bd)] rounded-full text-[10px] font-bold transition-all",
                    quotationFilter === status ? "bg-blue-500 text-white border-blue-500" : "bg-[var(--s2)] text-[var(--mt)] hover:bg-[var(--s2)] hover:text-[var(--tx)]"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
            <div className="grid gap-3">
              {filteredQuotations.map(q => (
                <DocCard 
                  key={q.id} 
                  type="quotation" 
                  doc={q} 
                  onEdit={() => { setModalContent({ title: 'Edit Quotation', type: 'quotation', data: q }); setIsModalOpen(true); }}
                  onDelete={() => handleDeleteQuotation(q.id)}
                  onPrint={() => handlePrint('quotation', q)}
                />
              ))}
              {filteredQuotations.length === 0 && <div className="text-center py-12 text-[var(--mt)] text-sm">No quotations found for this status.</div>}
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <KPICard label="Not Received" value={invoices.filter(i => i.status === 'Not Received').length.toString()} sub="pending payment" color="red" icon={<AlertCircle size={16} />} />
              <KPICard label="Received" value={invoices.filter(i => i.status === 'Received').length.toString()} sub="paid in full" color="green" icon={<CheckCircle2 size={16} />} />
            </div>
            <div className="grid gap-3">
              {invoices.map(i => (
                <DocCard 
                  key={i.id} 
                  type="invoice" 
                  doc={i} 
                  onEdit={() => { setModalContent({ title: 'Edit Invoice', type: 'invoice', data: i }); setIsModalOpen(true); }}
                  onDelete={() => handleDeleteInvoice(i.id)}
                  onPrint={() => handlePrint('invoice', i)}
                />
              ))}
              {invoices.length === 0 && <div className="text-center py-12 text-[var(--mt)] text-sm">No invoices yet.</div>}
            </div>
          </div>
        )}

        {activeTab === 'challans' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <KPICard label="Pending" value={challans.filter(c => c.status === 'Pending').length.toString()} sub="to be dispatched" color="yellow" icon={<Clock size={16} />} />
              <KPICard label="Delivered" value={challans.filter(c => c.status === 'Delivered').length.toString()} sub="completed" color="green" icon={<CheckCircle2 size={16} />} />
            </div>
            <div className="grid gap-3">
              {challans.map(c => (
                <DocCard 
                  key={c.id} 
                  type="challan" 
                  doc={c} 
                  onEdit={() => { setModalContent({ title: 'Edit Delivery Challan', type: 'challan', data: c }); setIsModalOpen(true); }}
                  onDelete={() => handleDeleteChallan(c.id)}
                  onPrint={() => handlePrint('challan', c)}
                />
              ))}
              {challans.length === 0 && <div className="text-center py-12 text-[var(--mt)] text-sm">No delivery challans yet.</div>}
            </div>
          </div>
        )}

        {activeTab === 'invest' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Total Taken" value={pkrC(ledger.filter(r => r.cat === 'Investment' && r.investmentAction === 'Taken').reduce((s, r) => s + (r.amount || 0), 0))} sub="from investors" color="cyan" icon={<Briefcase size={16} />} />
              <KPICard label="Total Returned" value={pkrC(ledger.filter(r => r.cat === 'Investment' && r.investmentAction === 'Return').reduce((s, r) => s + (r.amount || 0), 0))} sub="paid back" color="green" icon={<CheckCircle2 size={16} />} />
              <KPICard label="Net Owed" value={pkrC(financialSummary.investmentOwed)} sub="remaining" color="red" icon={<AlertCircle size={16} />} />
              <KPICard label="Records" value={ledger.filter(r => r.cat === 'Investment').length.toString()} sub="entries" color="blue" icon={<Clock size={16} />} />
            </div>
            <div className="grid gap-3">
              {ledger.filter(r => r.cat === 'Investment').map(inv => (
                <InvestmentCard 
                  key={inv.id} 
                  investment={inv} 
                  onEdit={() => { setModalContent({ title: 'Edit Investment', type: 'ledger', data: inv }); setIsModalOpen(true); }}
                  onReturn={() => handleQuickAction(inv, { investmentAction: 'Return', type: 'Credit' })}
                />
              ))}
              {ledger.filter(r => r.cat === 'Investment').length === 0 && <div className="text-center py-12 text-[var(--mt)] text-sm">No investment records yet.</div>}
            </div>
          </div>
        )}

        {activeTab === 'earnest' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Pending" value={pkrC(financialSummary.earnestPending)} sub="money held" color="yellow" icon={<Clock size={16} />} />
              <KPICard label="Total Deposited" value={pkrC(ledger.filter(r => r.cat === 'Earnest Money' && r.earnestStatus === 'Deposited').reduce((s, r) => s + (r.amount || 0), 0))} sub="all time" color="blue" icon={<Wallet size={16} />} />
              <KPICard label="Won (Held)" value={pkrC(ledger.filter(r => r.cat === 'Earnest Money' && r.earnestStatus === 'Won (Held as Guarantee)').reduce((s, r) => s + (r.amount || 0), 0))} sub="guarantees" color="green" icon={<CheckCircle2 size={16} />} />
              <KPICard label="Released" value={pkrC(ledger.filter(r => r.cat === 'Earnest Money' && r.earnestStatus === 'Released').reduce((s, r) => s + (r.amount || 0), 0))} sub="returned" color="cyan" icon={<CheckCircle2 size={16} />} />
            </div>
            <div className="grid gap-3">
              {ledger.filter(r => r.cat === 'Earnest Money').map(em => (
                <EarnestCard 
                  key={em.id} 
                  earnest={em} 
                  onEdit={() => { setModalContent({ title: 'Edit Earnest Money', type: 'ledger', data: em }); setIsModalOpen(true); }}
                  onStatusChange={(status) => handleQuickAction(em, { earnestStatus: status as any, type: status === 'Released' ? 'Deposit' : em.type })}
                />
              ))}
              {ledger.filter(r => r.cat === 'Earnest Money').length === 0 && <div className="text-center py-12 text-[var(--mt)] text-sm">No earnest money records yet.</div>}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Tag size={16} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Manage Categories</h3>
                </div>
                <button 
                  onClick={() => handleAddCategory('cat')}
                  className="px-3 py-1.5 bg-blue-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 hover:bg-blue-600 transition-all"
                >
                  <Plus size={12} /> Add Category
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {categories.map(cat => (
                  <div key={cat} className="group relative px-3 py-2 bg-[var(--s2)] border border-[var(--bd)] rounded-xl flex items-center justify-between hover:border-blue-500/50 transition-all">
                    <span className="text-[11px] font-bold truncate pr-6">{cat}</span>
                    <button 
                      onClick={() => handleRemoveCategory('cat', cat)}
                      className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                    <Layers size={16} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Manage Sub Categories</h3>
                </div>
                <button 
                  onClick={() => handleAddCategory('sub')}
                  className="px-3 py-1.5 bg-purple-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 hover:bg-purple-600 transition-all"
                >
                  <Plus size={12} /> Add Sub Category
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {subCategories.map(sub => (
                  <div key={sub} className="group relative px-3 py-2 bg-[var(--s2)] border border-[var(--bd)] rounded-xl flex items-center justify-between hover:border-purple-500/50 transition-all">
                    <span className="text-[11px] font-bold truncate pr-6">{sub}</span>
                    <button 
                      onClick={() => handleRemoveCategory('sub', sub)}
                      className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Printer size={16} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider">Print Settings</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Header Space (mm)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={printHeaderSpace} 
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPrintHeaderSpace(val);
                        saveUserData('printHeaderSpace', val.toString());
                      }}
                      className="flex-1 h-2 bg-[var(--s2)] rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-sm font-bold w-12 text-center">{printHeaderSpace}mm</span>
                  </div>
                  <p className="text-[10px] text-[var(--mt)] mt-1">Adjust this to leave space for your letterhead at the top of printed documents.</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                  <Download size={16} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider">Data Backup & Restore</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[var(--s2)] border border-[var(--bd)] rounded-2xl space-y-4">
                  <div>
                    <h4 className="text-xs font-bold mb-1">Export Data</h4>
                    <p className="text-[10px] text-[var(--mt)]">Download all your records, quotations, invoices, and settings in Excel format.</p>
                  </div>
                  <button 
                    onClick={handleExportData}
                    className="w-full py-2.5 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
                  >
                    <Download size={14} /> Export to Excel
                  </button>
                </div>

                <div className="p-4 bg-[var(--s2)] border border-[var(--bd)] rounded-2xl space-y-4">
                  <div>
                    <h4 className="text-xs font-bold mb-1">Import Data</h4>
                    <p className="text-[10px] text-[var(--mt)]">Restore your data from a previously exported Excel file.</p>
                  </div>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept=".xlsx, .xls"
                      onChange={handleImportData}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <button 
                      className="w-full py-2.5 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                    >
                      <Upload size={14} /> Import from Excel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FAB */}
      <button 
        onClick={() => {
          if (activeTab === 'quotations') {
            setModalContent({ title: 'New Quotation', type: 'quotation' });
          } else if (activeTab === 'invoices') {
            setModalContent({ title: 'New Invoice', type: 'invoice' });
          } else if (activeTab === 'challans') {
            setModalContent({ title: 'New Delivery Challan', type: 'challan' });
          } else {
            setModalContent({ title: 'New Ledger Entry', type: 'ledger' });
          }
          setIsModalOpen(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:bg-blue-600 transition-all active:scale-90 z-[300]"
      >
        <Plus size={28} />
      </button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-lg bg-[var(--s1)] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-[var(--bd)] flex items-center justify-between shrink-0">
                <h3 className="text-lg font-black tracking-tight">{modalContent?.title || 'New Entry'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[var(--s2)] rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                {modalContent?.type === 'admin' ? (
                  <div className="space-y-4">
                    {users.map(u => (
                      <div key={u.username} className="p-4 bg-[var(--s2)] rounded-xl border border-[var(--bd)] flex items-center justify-between">
                        <div>
                          <p className="font-bold text-[var(--mt)]">{u.displayName}</p>
                          <p className="text-xs text-[var(--st)]">@{u.username} • {u.role}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select 
                            value={u.status} 
                            onChange={(e) => {
                              const updatedUsers = users.map(user => user.username === u.username ? { ...user, status: e.target.value as any } : user);
                              setUsers(updatedUsers);
                              localStorage.setItem('ass_users', JSON.stringify(updatedUsers));
                            }}
                            className={cn(
                              "text-[10px] font-bold px-2 py-1 rounded-md border border-[var(--bd)]",
                              u.status === 'approved' ? "bg-green-500/10 text-green-500" : 
                              u.status === 'rejected' ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500"
                            )}
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : modalContent?.type === 'quotation' ? (
                  <QuotationForm 
                    data={modalContent?.data} 
                    onSave={handleSaveQuotation} 
                  />
                ) : modalContent?.type === 'invoice' ? (
                  <InvoiceForm 
                    data={modalContent?.data} 
                    onSave={handleSaveInvoice} 
                  />
                ) : modalContent?.type === 'challan' ? (
                  <ChallanForm 
                    data={modalContent?.data} 
                    onSave={handleSaveChallan} 
                  />
                ) : (
                  <LedgerForm 
                    data={modalContent?.data} 
                    onSave={handleSaveLedger} 
                    categories={categories}
                    subCategories={subCategories}
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}

// --- Sub-Components ---

function LedgerForm({ data, onSave, categories, subCategories }: { data?: LedgerEntry, onSave: (e: React.FormEvent<HTMLFormElement>) => void, categories: string[], subCategories: string[] }) {
  const [cat, setCat] = useState(data?.cat || categories[0] || 'Other');

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Sr No</label>
          <input type="text" disabled value={data?.id || 'Auto'} className="input-field opacity-50" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Date</label>
          <input name="date" type="date" required defaultValue={data?.date || getTod()} className="input-field" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Description</label>
        <input name="desc" type="text" required defaultValue={data?.desc} placeholder="e.g. Office Rent" className="input-field" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Amount (PKR)</label>
          <input name="amount" type="number" required defaultValue={data?.amount} placeholder="0" className="input-field" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Payment Type</label>
          <select name="type" defaultValue={data?.type || 'Deposit'} className="input-field">
            <option value="Deposit">Deposit</option>
            <option value="Credit">Credit</option>
            <option value="Payables">Payables</option>
            <option value="Receivables">Receivables</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Category</label>
          <select 
            name="cat" 
            value={cat} 
            onChange={(e) => setCat(e.target.value)}
            className="input-field"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Sub Category</label>
          <select name="subCat" defaultValue={data?.subCat || subCategories[0]} className="input-field">
            {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Project Name</label>
          <input name="projectName" type="text" defaultValue={data?.projectName} placeholder="e.g. Govt Tender" className="input-field" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Case Name</label>
          <input name="caseName" type="text" defaultValue={data?.caseName} placeholder="e.g. Case-001" className="input-field" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Reference No</label>
          <input name="refNo" type="text" defaultValue={data?.refNo} placeholder="Transaction ID" className="input-field" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Remarks</label>
          <input name="remarks" type="text" defaultValue={data?.remarks} placeholder="..." className="input-field" />
        </div>
      </div>

      {cat === 'Earnest Money' && (
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-3">
          <p className="text-[10px] font-black uppercase text-blue-500">Earnest Money Details</p>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Status</label>
            <select name="earnestStatus" defaultValue={data?.earnestStatus || 'Deposited'} className="input-field">
              <option value="Deposited">Deposited</option>
              <option value="Won (Held as Guarantee)">Won (Held as Guarantee)</option>
              <option value="Released">Released</option>
            </select>
          </div>
        </div>
      )}

      {cat === 'Investment' && (
        <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-3">
          <p className="text-[10px] font-black uppercase text-purple-500">Investment Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Action</label>
              <select name="investmentAction" defaultValue={data?.investmentAction || 'Taken'} className="input-field">
                <option value="Taken">Taken</option>
                <option value="Return">Return</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Investor Name</label>
              <input name="investorName" type="text" defaultValue={data?.investorName} placeholder="Name" className="input-field" />
            </div>
          </div>
        </div>
      )}

      <button type="submit" className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl shadow-lg hover:bg-blue-600 transition-all mt-4">
        {data?.id ? 'Update Entry' : 'Save Entry'}
      </button>
    </form>
  );
}

function QuotationForm({ data, onSave }: { data?: Quotation, onSave: (q: Quotation) => void }) {
  const [items, setItems] = useState<LineItem[]>(data?.items || [{ desc: '', qty: 1, rate: 0, taxPercent: 0 }]);
  const [subject, setSubject] = useState(data?.subject || '');
  const [client, setClient] = useState(data?.client || '');
  const [date, setDate] = useState(data?.date || getTod());
  const [status, setStatus] = useState(data?.status || 'Draft');
  const [notes, setNotes] = useState(data?.notes || '');

  const addItem = () => {
    setItems([...items, { desc: '', qty: 1, rate: 0, taxPercent: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
  const totalTax = items.reduce((sum, item) => sum + (item.qty * item.rate * (item.taxPercent / 100)), 0);
  const total = subtotal + totalTax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: data?.id || getUID(),
      subject,
      client,
      date,
      status,
      notes,
      items,
      gst: 0,
      wht: 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Subject</label>
          <input 
            type="text" 
            required 
            value={subject} 
            onChange={(e) => setSubject(e.target.value)} 
            placeholder="e.g. Lab Equipment Supply" 
            className="input-field" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Client Name</label>
          <input 
            type="text" 
            required 
            value={client} 
            onChange={(e) => setClient(e.target.value)} 
            placeholder="e.g. Health Dept" 
            className="input-field" 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Date</label>
          <input 
            type="date" 
            required 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="input-field" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Status</label>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value as any)} 
            className="input-field"
          >
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Converted">Converted</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-blue-500">Line Items</h4>
          <button 
            type="button" 
            onClick={addItem}
            className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
        
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
          {items.map((item, idx) => (
            <div key={idx} className="p-3 bg-[var(--s2)] border border-[var(--bd)] rounded-xl space-y-3 relative group">
              <button 
                type="button" 
                onClick={() => removeItem(idx)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
              
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-[var(--mt)]">Description</label>
                <input 
                  type="text" 
                  required 
                  value={item.desc} 
                  onChange={(e) => updateItem(idx, 'desc', e.target.value)} 
                  placeholder="Item description..." 
                  className="input-field text-xs" 
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-[var(--mt)]">Qty</label>
                  <input 
                    type="number" 
                    required 
                    min="1"
                    value={item.qty} 
                    onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))} 
                    className="input-field text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-[var(--mt)]">Rate</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    value={item.rate} 
                    onChange={(e) => updateItem(idx, 'rate', Number(e.target.value))} 
                    className="input-field text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-[var(--mt)]">Tax %</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    max="100"
                    value={item.taxPercent} 
                    onChange={(e) => updateItem(idx, 'taxPercent', Number(e.target.value))} 
                    className="input-field text-xs" 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-[var(--s2)] border border-[var(--bd)] rounded-2xl space-y-2">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-[var(--mt)]">Subtotal</span>
          <span>{pkrC(subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs font-bold">
          <span className="text-[var(--mt)]">Total Tax</span>
          <span className="text-yellow-600">+{pkrC(totalTax)}</span>
        </div>
        <div className="h-px bg-[var(--bd)] my-1" />
        <div className="flex justify-between text-sm font-black">
          <span>Grand Total</span>
          <span className="text-green-600">{pkrC(total)}</span>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Notes</label>
        <textarea 
          value={notes} 
          onChange={(e) => setNotes(e.target.value)} 
          placeholder="Terms and conditions..." 
          className="input-field min-h-[80px] py-2" 
        />
      </div>

      <button type="submit" className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl shadow-lg hover:bg-blue-600 transition-all">
        {data?.id ? 'Update Quotation' : 'Create Quotation'}
      </button>
    </form>
  );
}

function InvoiceForm({ data, onSave }: { data?: Invoice, onSave: (i: Invoice) => void }) {
  const [items, setItems] = useState<LineItem[]>(data?.items || [{ desc: '', qty: 1, rate: 0, taxPercent: 0 }]);
  const [subject, setSubject] = useState(data?.subject || '');
  const [client, setClient] = useState(data?.client || '');
  const [date, setDate] = useState(data?.date || getTod());
  const [status, setStatus] = useState(data?.status || 'Not Received');
  const [num, setNum] = useState(data?.num || '');

  const addItem = () => {
    setItems([...items, { desc: '', qty: 1, rate: 0, taxPercent: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
  const totalTax = items.reduce((sum, item) => sum + (item.qty * item.rate * (item.taxPercent / 100)), 0);
  const total = subtotal + totalTax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: data?.id || getUID(),
      subject,
      client,
      date,
      status,
      items,
      num,
      gst: 0,
      wht: 0,
      notes: '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Invoice #</label>
          <input 
            type="text" 
            required 
            value={num} 
            onChange={(e) => setNum(e.target.value)} 
            placeholder="INV-001" 
            className="input-field" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Subject</label>
          <input 
            type="text" 
            required 
            value={subject} 
            onChange={(e) => setSubject(e.target.value)} 
            placeholder="e.g. Lab Supply" 
            className="input-field" 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Client Name</label>
          <input 
            type="text" 
            required 
            value={client} 
            onChange={(e) => setClient(e.target.value)} 
            placeholder="e.g. Health Dept" 
            className="input-field" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Date</label>
          <input 
            type="date" 
            required 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="input-field" 
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Status</label>
        <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value as any)} 
          className="input-field"
        >
          <option value="Not Received">Not Received</option>
          <option value="Received">Received</option>
          <option value="Partial">Partial</option>
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-blue-500">Line Items</h4>
          <button 
            type="button" 
            onClick={addItem}
            className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
        
        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 scrollbar-hide">
          {items.map((item, idx) => (
            <div key={idx} className="p-3 bg-[var(--s2)] border border-[var(--bd)] rounded-xl space-y-3 relative group">
              <button 
                type="button" 
                onClick={() => removeItem(idx)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
              
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-[var(--mt)]">Description</label>
                <input 
                  type="text" 
                  required 
                  value={item.desc} 
                  onChange={(e) => updateItem(idx, 'desc', e.target.value)} 
                  placeholder="Item description..." 
                  className="input-field text-xs" 
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-[var(--mt)]">Qty</label>
                  <input 
                    type="number" 
                    required 
                    min="1"
                    value={item.qty} 
                    onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))} 
                    className="input-field text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-[var(--mt)]">Rate</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    value={item.rate} 
                    onChange={(e) => updateItem(idx, 'rate', Number(e.target.value))} 
                    className="input-field text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-[var(--mt)]">Tax %</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    max="100"
                    value={item.taxPercent} 
                    onChange={(e) => updateItem(idx, 'taxPercent', Number(e.target.value))} 
                    className="input-field text-xs" 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-[var(--s2)] border border-[var(--bd)] rounded-2xl space-y-2">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-[var(--mt)]">Subtotal</span>
          <span>{pkrC(subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs font-bold">
          <span className="text-[var(--mt)]">Total Tax</span>
          <span className="text-yellow-600">+{pkrC(totalTax)}</span>
        </div>
        <div className="h-px bg-[var(--bd)] my-1" />
        <div className="flex justify-between text-sm font-black">
          <span>Grand Total</span>
          <span className="text-green-600">{pkrC(total)}</span>
        </div>
      </div>

      <button type="submit" className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl shadow-lg hover:bg-blue-600 transition-all">
        {data?.id ? 'Update Invoice' : 'Create Invoice'}
      </button>
    </form>
  );
}

function ChallanForm({ data, onSave }: { data?: Challan, onSave: (c: Challan) => void }) {
  const [items, setItems] = useState<LineItem[]>(data?.items || [{ desc: '', qty: 1, rate: 0, taxPercent: 0 }]);
  const [client, setClient] = useState(data?.client || '');
  const [date, setDate] = useState(data?.date || getTod());
  const [status, setStatus] = useState(data?.status || 'Pending');
  const [address, setAddress] = useState(data?.address || '');

  const addItem = () => {
    setItems([...items, { desc: '', qty: 1, rate: 0, taxPercent: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: data?.id || getUID(),
      client,
      date,
      status,
      items,
      address,
      subject: '',
      notes: '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Client Name</label>
          <input 
            type="text" 
            required 
            value={client} 
            onChange={(e) => setClient(e.target.value)} 
            placeholder="e.g. Health Dept" 
            className="input-field" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Date</label>
          <input 
            type="date" 
            required 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="input-field" 
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Delivery Address</label>
        <input 
          type="text" 
          required 
          value={address} 
          onChange={(e) => setAddress(e.target.value)} 
          placeholder="e.g. 123 Street, City" 
          className="input-field" 
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--mt)]">Status</label>
        <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value as any)} 
          className="input-field"
        >
          <option value="Pending">Pending</option>
          <option value="Dispatched">Dispatched</option>
          <option value="Delivered">Delivered</option>
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-blue-500">Items to Deliver</h4>
          <button 
            type="button" 
            onClick={addItem}
            className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
        
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
          {items.map((item, idx) => (
            <div key={idx} className="p-3 bg-[var(--s2)] border border-[var(--bd)] rounded-xl space-y-3 relative group">
              <button 
                type="button" 
                onClick={() => removeItem(idx)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
              
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-3 space-y-1">
                  <label className="text-[9px] font-bold uppercase text-[var(--mt)]">Description</label>
                  <input 
                    type="text" 
                    required 
                    value={item.desc} 
                    onChange={(e) => updateItem(idx, 'desc', e.target.value)} 
                    placeholder="Item description..." 
                    className="input-field text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-[var(--mt)]">Qty</label>
                  <input 
                    type="number" 
                    required 
                    min="1"
                    value={item.qty} 
                    onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))} 
                    className="input-field text-xs" 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl shadow-lg hover:bg-blue-600 transition-all">
        {data?.id ? 'Update Challan' : 'Create Challan'}
      </button>
    </form>
  );
}

function KPICard({ label, value, sub, color, icon }: { label: string, value: string, sub: string, color: string, icon: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    green: 'border-green-500/30 bg-green-500/5 text-green-500',
    blue: 'border-blue-500/30 bg-blue-500/5 text-blue-500',
    red: 'border-red-500/30 bg-red-500/5 text-red-500',
    yellow: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-500',
    purple: 'border-purple-500/30 bg-purple-500/5 text-purple-500',
  };

  return (
    <div className={cn("glass-card p-4 border-l-4 transition-transform hover:-translate-y-1", colorMap[color])}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-black uppercase tracking-widest opacity-70">{label}</span>
        <div className="opacity-50">{icon}</div>
      </div>
      <div className="text-lg font-black tracking-tight">{value}</div>
      <div className="text-[10px] font-medium opacity-60 mt-1">{sub}</div>
    </div>
  );
}

function ModuleCard({ title, badge, icon, color, rows }: { title: string, badge: string, icon: React.ReactNode, color: string, rows: { label: string, value: string, color: string }[] }) {
  const colorMap: Record<string, string> = {
    blue: 'before:bg-blue-500',
    yellow: 'before:bg-yellow-500',
    green: 'before:bg-green-500',
    purple: 'before:bg-purple-500',
    cyan: 'before:bg-cyan-500',
    rose: 'before:bg-rose-500',
  };

  return (
    <div className={cn("glass-card overflow-hidden relative before:absolute before:top-0 before:left-0 before:right-0 before:h-1 transition-all hover:shadow-md", colorMap[color])}>
      <div className="p-3 border-b border-[var(--bd)] flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[var(--s2)] flex items-center justify-center text-blue-500">
          {icon}
        </div>
        <div>
          <h4 className="text-xs font-black">{title}</h4>
          <span className="text-[9px] font-bold text-[var(--mt)] px-1.5 py-0.5 bg-[var(--s2)] rounded-full border border-[var(--bd)]">
            {badge}
          </span>
        </div>
      </div>
      <div className="p-3 space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex justify-between items-center text-[10px] border-b border-black/5 last:border-0 pb-1 last:pb-0">
            <span className="text-[var(--mt)] font-medium">{row.label}</span>
            <span className={cn("font-black", row.color)}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryItem({ label, value, color }: { label: string, value: string, color: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-green-500',
    red: 'text-red-500',
    yellow: 'text-yellow-500',
    blue: 'text-blue-500',
  };
  return (
    <div className="glass-card p-3 text-center">
      <div className="text-[9px] font-black uppercase tracking-widest text-[var(--mt)] mb-1">{label}</div>
      <div className={cn("text-sm font-black tracking-tight", colorMap[color])}>{value}</div>
    </div>
  );
}

function DocCard({ type, doc, onEdit, onDelete, onPrint }: { type: 'quotation' | 'invoice' | 'challan', doc: any, onEdit: () => void, onDelete: () => void, onPrint: () => void, key?: any }) {
  const ref = type === 'quotation' ? `QT-${doc.id}` : type === 'invoice' ? (doc.num || `INV-${doc.id}`) : `DC-${doc.id}`;
  
  const statusColors: Record<string, string> = {
    Draft: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    Sent: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Approved: 'bg-green-500/10 text-green-500 border-green-500/20',
    Rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
    Converted: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'Not Received': 'bg-red-500/10 text-red-500 border-red-500/20',
    Received: 'bg-green-500/10 text-green-500 border-green-500/20',
    Partial: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    Pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    Dispatched: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
  };

  const subtotal = doc.items?.reduce((a: number, i: any) => a + (i.qty * i.rate), 0) || 0;
  const taxAmt = doc.items?.reduce((a: number, i: any) => a + (i.qty * i.rate * (i.taxPercent || 0) / 100), 0) || 0;
  const total = subtotal + taxAmt;

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-[var(--bd)] flex items-start justify-between">
        <div>
          <div className="text-[10px] font-black text-blue-500 uppercase tracking-wider mb-1">{ref}</div>
          <h4 className="text-sm font-bold">{doc.subject || doc.product || type}</h4>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--mt)] font-medium">
            <span>👤 {doc.client}</span>
            <span>•</span>
            <span>📅 {doc.date}</span>
          </div>
        </div>
        <span className={cn("px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border", statusColors[doc.status])}>
          {doc.status}
        </span>
      </div>
      {type !== 'challan' ? (
        <div className="grid grid-cols-3 bg-[var(--s2)] divide-x divide-[var(--bd)]">
          <div className="p-3 text-center">
            <div className="text-[8px] font-black uppercase tracking-widest text-[var(--mt)] mb-0.5">Subtotal</div>
            <div className="text-xs font-bold">{pkrF(subtotal)}</div>
          </div>
          <div className="p-3 text-center">
            <div className="text-[8px] font-black uppercase tracking-widest text-[var(--mt)] mb-0.5">Tax Amt</div>
            <div className="text-xs font-bold text-yellow-600">{pkrF(taxAmt)}</div>
          </div>
          <div className="p-3 text-center">
            <div className="text-[8px] font-black uppercase tracking-widest text-[var(--mt)] mb-0.5">Total</div>
            <div className="text-xs font-black text-green-600">{pkrF(total)}</div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-[var(--s2)] text-[10px] text-[var(--mt)] font-medium">
          {doc.items?.length || 0} item(s) • {doc.address || 'No address'}
        </div>
      )}
      <div className="p-2 bg-[var(--s1)] flex items-center gap-2">
        <button 
          onClick={onEdit}
          className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider text-blue-500 hover:bg-blue-500/5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <Edit size={12} /> Edit
        </button>
        <button 
          onClick={onPrint}
          className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--mt)] hover:bg-[var(--s2)] rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <Printer size={12} /> Print
        </button>
        <button 
          onClick={onDelete}
          className="p-2 text-red-500 hover:bg-red-500/5 rounded-lg transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function InvestmentCard({ investment, onEdit, onReturn }: { investment: LedgerEntry, onEdit: () => void, onReturn: () => void, key?: any }) {
  return (
    <div className="glass-card p-4 flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          investment.investmentAction === 'Taken' ? "bg-purple-500/10 text-purple-500" : "bg-green-500/10 text-green-500"
        )}>
          <Briefcase size={20} />
        </div>
        <div>
          <p className="text-sm font-black tracking-tight">{investment.investorName || 'Unknown Investor'}</p>
          <div className="flex items-center gap-2 text-[10px] text-[var(--mt)] font-bold">
            <span className="uppercase">{investment.investmentAction}</span>
            <span>•</span>
            <span>{investment.projectName || 'No Project'}</span>
            <span>•</span>
            <span>{investment.date}</span>
          </div>
        </div>
      </div>
      <div className="text-right flex items-center gap-4">
        <div>
          <p className={cn(
            "text-sm font-black",
            investment.investmentAction === 'Taken' ? "text-purple-500" : "text-green-500"
          )}>
            {investment.investmentAction === 'Taken' ? '+' : '-'}{pkrF(investment.amount)}
          </p>
          <p className="text-[9px] text-[var(--mt2)] font-bold uppercase">{investment.caseName || 'No Case'}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {investment.investmentAction === 'Taken' && (
            <button 
              onClick={onReturn}
              title="Record Return"
              className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button onClick={onEdit} className="p-2 hover:bg-[var(--s2)] rounded-lg">
            <Edit size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function EarnestCard({ earnest, onEdit, onStatusChange }: { earnest: LedgerEntry, onEdit: () => void, onStatusChange: (s: string) => void, key?: any }) {
  const statusColors: Record<string, string> = {
    'Deposited': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    'Won (Held as Guarantee)': 'bg-green-500/10 text-green-500 border-green-500/20',
    'Released': 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  };

  return (
    <div className="glass-card p-4 flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
          <Wallet size={20} />
        </div>
        <div>
          <p className="text-sm font-black tracking-tight">{earnest.caseName || 'Untitled Case'}</p>
          <div className="flex items-center gap-2 text-[10px] text-[var(--mt)] font-bold">
            <span>{earnest.projectName || 'No Project'}</span>
            <span>•</span>
            <span>{earnest.date}</span>
          </div>
        </div>
      </div>
      <div className="text-right flex items-center gap-4">
        <div className="flex flex-col items-end gap-1">
          <p className="text-sm font-black text-blue-500">{pkrF(earnest.amount)}</p>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase border",
            statusColors[earnest.earnestStatus || 'Deposited']
          )}>
            {earnest.earnestStatus}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {earnest.earnestStatus === 'Deposited' && (
            <button 
              onClick={() => onStatusChange('Won (Held as Guarantee)')}
              title="Mark as Won"
              className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg"
            >
              <Trophy size={14} />
            </button>
          )}
          {earnest.earnestStatus !== 'Released' && (
            <button 
              onClick={() => onStatusChange('Released')}
              title="Mark as Released"
              className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg"
            >
              <CheckCircle2 size={14} />
            </button>
          )}
          <button onClick={onEdit} className="p-2 hover:bg-[var(--s2)] rounded-lg">
            <Edit size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, options, value, onChange }: { label: string, options: string[], value: string, onChange: (v: string) => void }) {
  return (
    <div className="p-2">
      <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--mt)] mb-1">{label}</label>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-none outline-none text-[11px] font-bold cursor-pointer"
      >
        <option value="">All</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function PrintLayout({ data, headerSpace }: { data: { type: string, doc: any }, headerSpace: number }) {
  const { type, doc } = data;
  const ref = type === 'quotation' ? `QT-${doc.id}` : type === 'invoice' ? (doc.num || `INV-${doc.id}`) : `DC-${doc.id}`;
  
  const subtotal = doc.items?.reduce((a: number, i: any) => a + (i.qty * i.rate), 0) || 0;
  const taxAmt = doc.items?.reduce((a: number, i: any) => a + (i.qty * i.rate * (i.taxPercent || 0) / 100), 0) || 0;
  const total = subtotal + taxAmt;

  return (
    <div className="print-only bg-white text-black p-8 min-h-screen" style={{ paddingTop: `${headerSpace}mm` }}>
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-1">{type}</h1>
          <p className="text-sm font-bold text-gray-500">Ref: {ref}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">Date: {doc.date}</p>
          <p className="text-sm font-bold mt-1">Status: {doc.status}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Client Details</h3>
          <p className="text-lg font-bold">{doc.client}</p>
          {doc.address && <p className="text-sm mt-1 text-gray-600">{doc.address}</p>}
        </div>
        {doc.subject && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Subject</h3>
            <p className="text-sm font-bold">{doc.subject}</p>
          </div>
        )}
      </div>

      <table className="w-full mb-12">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-3 text-[10px] font-black uppercase tracking-widest">Description</th>
            <th className="py-3 text-[10px] font-black uppercase tracking-widest text-right">Qty</th>
            {type !== 'challan' && (
              <>
                <th className="py-3 text-[10px] font-black uppercase tracking-widest text-right">Rate</th>
                <th className="py-3 text-[10px] font-black uppercase tracking-widest text-right">Tax %</th>
                <th className="py-3 text-[10px] font-black uppercase tracking-widest text-right">Total</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {doc.items?.map((item: any, idx: number) => (
            <tr key={idx}>
              <td className="py-4 text-sm font-medium">{item.desc}</td>
              <td className="py-4 text-sm font-bold text-right">{item.qty}</td>
              {type !== 'challan' && (
                <>
                  <td className="py-4 text-sm font-bold text-right">{item.rate.toLocaleString()}</td>
                  <td className="py-4 text-sm font-bold text-right">{item.taxPercent}%</td>
                  <td className="py-4 text-sm font-black text-right">
                    {((item.qty * item.rate) + (item.qty * item.rate * item.taxPercent / 100)).toLocaleString()}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {type !== 'challan' && (
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm font-bold text-gray-500">
              <span>Subtotal</span>
              <span>{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-500">
              <span>Total Tax</span>
              <span>{taxAmt.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xl font-black border-t-2 border-black pt-2">
              <span>Grand Total</span>
              <span>{total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {doc.notes && (
        <div className="mt-12">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Notes</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{doc.notes}</p>
        </div>
      )}

      <div className="fixed bottom-12 left-8 right-8 flex justify-between items-end border-t border-gray-100 pt-8">
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-gray-300">Generated by</p>
          <p className="text-[10px] font-bold">Alpha Scientific Safety Portal</p>
        </div>
        <div className="text-right">
          <div className="w-32 h-px bg-black mb-2"></div>
          <p className="text-[10px] font-black uppercase tracking-widest">Authorized Signature</p>
        </div>
      </div>
    </div>
  );
}
