import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  ArrowDownLeft, 
  ArrowUpRight, 
  LayoutDashboard, 
  ClipboardList, 
  Settings, 
  AlertCircle,
  Search, 
  Loader2, 
  CheckCircle2,
  Filter,
  ArrowRight,
  Database,
  RefreshCcw,
  WifiOff,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Boxes,
  Layers,
  Film,
  Tag,
  Palette,
  Cpu,
  Truck,
  UserCheck,
  User,
  Navigation,
  Plus,
  Trash2,
  MapPin,
  Hash,
  Download,
  FileText,
  Calendar,
  FileDigit,
  TrendingUp,
  Activity,
  History,
  Clock,
  BarChart3,
  Pencil,
  X,
  LogOut
} from 'lucide-react';

// Logo embedded as data URL so it always shows (login, sidebar, PDF) on any host including Vercel
import { LOGO_DATA_URL } from './src/logoDataUrl.js';
const LOGO_URL = LOGO_DATA_URL;
// PDF: bundled so download works on Vercel and everywhere
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const API_URL = "https://script.google.com/macros/s/AKfycbzX5jA4nZ0ktbKAeAT4vY7juWe7OBY6cCiqBQVUUShX5atMUZFhCAc-cD4Wa35FN4NC1g/exec"; 

export default function App() {
  // Simple login for Vehicle Dispatch portal (persist in localStorage so refresh keeps login)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try { return localStorage.getItem('mumuksh_dispatch_auth') === '1'; } catch { return false; }
  });
  const [loginForm, setLoginForm] = useState({ userId: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Logo image for UI & PDF
  const [logoImage, setLogoImage] = useState(null);

  const [view, setView] = useState('loading_process');
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Report data states
  const [inwardReport, setInwardReport] = useState([]);
  const [outwardReport, setOutwardReport] = useState([]);
  const [loadingReport, setLoadingReport] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  
  // Edit states
  const [editingItem, setEditingItem] = useState(null);
  const [editType, setEditType] = useState(null); // 'inward', 'outward', 'loading'
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);
  
  // Script loading state for PDF
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  // General Form States
  const [form, setForm] = useState({
    id: '', productName: '', category: '', materialType: '', vendor: '', usedAs: '', 
    rolls: '', kgs: '', batch: '', width: '', gsm: '', meters: '', dtx: '', 
    glueType: '', colour: '', line: '', supervisor: '', machineNo: '', 
    user: 'Store Head', properties: '', hiHo: '', nonWovenUsedFor: ''
  });

  // Loading Process State
  const [loadingForm, setLoadingForm] = useState({
    dispatchFrom: "Mumuksh Impex LLP, Ranala Shivar, Ranala, Nadurbar, Maharastra-425411",
    dispatchTo: '', vehicleNo: '', driverName: '', driverNo: '', transporterName: '', lrNo: '',
    challanNo: '', date: new Date().toISOString().split('T')[0],
    vehicleIn: '',  // Gadi kis date ko kitne baje aayi (datetime-local)
    vehicleOut: '', // Gadi kis date ko kitne baje gayi (datetime-local)
    loadingType: 'regular', // 'regular' or 'grade'
    items: [{ product: '', size: '', pcs: '', packPerCtn: '', totalCtn: '', avgWeightKg: '' }],
    gradeItems: [{ grade: '', bags: '', kgs: '' }], // For A, B, C grade diapers
    polyItems: [{ name: '', size: '', kgs: '' }] // For Poly Bags with KGs
  });

  const diaperSizes = ["S", "M", "L", "XL", "XXL", "New Born"];
  const mainCategories = ["Raw Material", "Packing Material", "PE Backsheet"];
  const machines = ["M-01", "M-02", "M-03", "M-04"];
  const propertiesOptions = ["SSS", "SSMMS"];
  const diaperGrades = ["A Grade", "B Grade", "C Grade"];

  const subCategories = {
    "Raw Material": ["SAP", "Pulp", "Non-Woven", "Elastic", "Glue", "Hook", "Y-Cut Side Tape", "S-Cut", "Frontal Tape"],
    "Packing Material": ["Corrugated Boxes", "Polybags", "Outer Bags", "Tape Rolls"],
    "PE Backsheet": ["Printed PE Film", "Plain PE Film"]
  };

  // PDF Engine Loader
  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const initPDF = async () => {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js');
        if (window.jspdf) {
          window.jsPDF = window.jspdf.jsPDF;
          setScriptsLoaded(true);
        }
      } catch (err) { console.error("PDF Library Error", err); }
    };
    initPDF();
  }, []);

  // Logo loader for PDF (HTMLImageElement) - use public URL so build works on Vercel
  useEffect(() => {
    const img = new Image();
    img.src = LOGO_URL;
    img.onload = () => setLogoImage(img);
  }, []);

  const notify = (msg, type = 'success') => {
    setMessage({ msg, type });
    if (type !== 'error') setTimeout(() => setMessage(null), 6000);
  };

  const callAPI = async (payload) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });
      return await response.json();
    } catch (err) { throw err; }
  };

  const fetchStock = async () => {
    setLoading(true);
    try {
      const result = await callAPI({ action: 'GET_STOCK' });
      if (result && result.status === 'success') setStock(result.data);
    } catch (err) {
      notify("Connectivity Error: Could not reach backend.", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  // Fetch report data functions
  const fetchInwardReport = async () => {
    setReportLoading(true);
    try {
      const result = await callAPI({ action: 'GET_INWARD_REPORT' });
      if (result && result.status === 'success') {
        setInwardReport(result.data || []);
      } else {
        // Fallback to mock data if API doesn't support it yet
        setInwardReport([
          { id: 1, material: "SAP High Retention", vendor: "BASF", qty: "2,400 KG", date: "2026-01-25", time: "10:30 AM", category: "Raw Material", materialType: "SAP" },
          { id: 2, material: "Non-Woven Fabric", vendor: "Texon", qty: "18 Rolls", date: "2026-01-25", time: "09:15 AM", category: "Raw Material", materialType: "Non-Woven" },
          { id: 3, material: "Hotmelt Glue", vendor: "Henkel", qty: "40 Box", date: "2026-01-24", time: "Yesterday", category: "Raw Material", materialType: "Glue" },
          { id: 4, material: "Elastic 610 DTX", vendor: "Elastic Co", qty: "25 Box", date: "2026-01-25", time: "11:00 AM", category: "Raw Material", materialType: "Elastic" },
          { id: 5, material: "Corrugated Boxes", vendor: "Packaging Ltd", qty: "500 Pcs", date: "2026-01-24", time: "Yesterday", category: "Packing Material", materialType: "Corrugated Boxes" }
        ]);
      }
    } catch (err) {
      // Fallback to mock data
      setInwardReport([
        { id: 1, material: "SAP High Retention", vendor: "BASF", qty: "2,400 KG", date: "2026-01-25", time: "10:30 AM", category: "Raw Material", materialType: "SAP" },
        { id: 2, material: "Non-Woven Fabric", vendor: "Texon", qty: "18 Rolls", date: "2026-01-25", time: "09:15 AM", category: "Raw Material", materialType: "Non-Woven" },
        { id: 3, material: "Hotmelt Glue", vendor: "Henkel", qty: "40 Box", date: "2026-01-24", time: "Yesterday", category: "Raw Material", materialType: "Glue" }
      ]);
    } finally { setReportLoading(false); }
  };

  const fetchOutwardReport = async () => {
    setReportLoading(true);
    try {
      const result = await callAPI({ action: 'GET_OUTWARD_REPORT' });
      if (result && result.status === 'success') {
        setOutwardReport(result.data || []);
      } else {
        setOutwardReport([
          { id: 1, material: "Pulp Roll (PLP-01)", machine: "M-01", qty: "450 KG", date: "2026-01-25", time: "11:45 AM", supervisor: "Rajesh Kumar", category: "Raw Material" },
          { id: 2, material: "S-Cut Tape", machine: "M-03", qty: "4 Rolls", date: "2026-01-25", time: "10:00 AM", supervisor: "Vikram Singh", category: "Raw Material" },
          { id: 3, material: "Elastic 610 DTX", machine: "M-02", qty: "2 Box", date: "2026-01-25", time: "08:30 AM", supervisor: "Amit Patel", category: "Raw Material" },
          { id: 4, material: "Non-Woven Fabric", machine: "M-01", qty: "12 Rolls", date: "2026-01-25", time: "02:15 PM", supervisor: "Rajesh Kumar", category: "Raw Material" },
          { id: 5, material: "Hotmelt Glue", machine: "M-04", qty: "8 Box", date: "2026-01-25", time: "01:00 PM", supervisor: "Suresh Yadav", category: "Raw Material" }
        ]);
      }
    } catch (err) {
      setOutwardReport([
        { id: 1, material: "Pulp Roll (PLP-01)", machine: "M-01", qty: "450 KG", date: "2026-01-25", time: "11:45 AM", supervisor: "Rajesh Kumar", category: "Raw Material" },
        { id: 2, material: "S-Cut Tape", machine: "M-03", qty: "4 Rolls", date: "2026-01-25", time: "10:00 AM", supervisor: "Vikram Singh", category: "Raw Material" },
        { id: 3, material: "Elastic 610 DTX", machine: "M-02", qty: "2 Box", date: "2026-01-25", time: "08:30 AM", supervisor: "Amit Patel", category: "Raw Material" }
      ]);
    } finally { setReportLoading(false); }
  };


  const fetchLoadingReport = async () => {
    setReportLoading(true);
    try {
      const result = await callAPI({ action: 'GET_LOADING_REPORT' });
      if (result && result.status === 'success') {
        setLoadingReport(result.data || []);
      } else {
        setLoadingReport([
          { id: 1, vehicleNo: "MH-18-BC-4412", dispatchTo: "ABC Distributors", totalCtn: 450, date: "2026-01-25", status: "In Transit", driverName: "Ramesh Kumar", challanNo: "CH-001", items: [{ product: "Freshkins Std Pant (L)", size: "L", ctn: 250 }, { product: "Premium Baby (M)", size: "M", ctn: 200 }] },
          { id: 2, vehicleNo: "GJ-05-XX-1029", dispatchTo: "Central Hub", totalCtn: 820, date: "2026-01-25", status: "Loading", driverName: "Suresh Patel", challanNo: "CH-002", items: [{ product: "Freshkins Std Pant (S)", size: "S", ctn: 500 }, { product: "Freshkins Std Pant (XL)", size: "XL", ctn: 320 }] },
          { id: 3, vehicleNo: "MH-15-ZA-5521", dispatchTo: "Local Dealer", totalCtn: 120, date: "2026-01-24", status: "Delivered", driverName: "Amit Shah", challanNo: "CH-003", items: [{ product: "Premium Baby (New Born)", size: "New Born", ctn: 120 }] },
          { id: 4, vehicleNo: "MH-12-AB-7890", dispatchTo: "Regional Warehouse", totalCtn: 650, date: "2026-01-25", status: "In Transit", driverName: "Vikram Mehta", challanNo: "CH-004", items: [{ product: "Freshkins Std Pant (L)", size: "L", ctn: 350 }, { product: "Premium Baby (M)", size: "M", ctn: 300 }] }
        ]);
      }
    } catch (err) {
      setLoadingReport([
        { id: 1, vehicleNo: "MH-18-BC-4412", dispatchTo: "ABC Distributors", totalCtn: 450, date: "2026-01-25", status: "In Transit", driverName: "Ramesh Kumar", challanNo: "CH-001", items: [{ product: "Freshkins Std Pant (L)", size: "L", ctn: 250 }, { product: "Premium Baby (M)", size: "M", ctn: 200 }] },
        { id: 2, vehicleNo: "GJ-05-XX-1029", dispatchTo: "Central Hub", totalCtn: 820, date: "2026-01-25", status: "Loading", driverName: "Suresh Patel", challanNo: "CH-002", items: [{ product: "Freshkins Std Pant (S)", size: "S", ctn: 500 }, { product: "Freshkins Std Pant (XL)", size: "XL", ctn: 320 }] },
        { id: 3, vehicleNo: "MH-15-ZA-5521", dispatchTo: "Local Dealer", totalCtn: 120, date: "2026-01-24", status: "Delivered", driverName: "Amit Shah", challanNo: "CH-003", items: [{ product: "Premium Baby (New Born)", size: "New Born", ctn: 120 }] }
      ]);
    } finally { setReportLoading(false); }
  };

  // ---------------------------------------------------------------------------
  // AUTH: Simple single-user login for Vehicle Dispatch portal
  // ---------------------------------------------------------------------------
  const handleLogin = (e) => {
    e.preventDefault();
    const id = (loginForm.userId || '').trim().toLowerCase();
    const pwd = loginForm.password || '';

    // Single allowed user: ID "dispatch", Password "mumuksh"
    if (id === 'dispatch' && pwd === 'mumuksh') {
      try { localStorage.setItem('mumuksh_dispatch_auth', '1'); } catch (_) {}
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Invalid ID or password');
    }
  };

  // Load report data when view changes
  useEffect(() => {
    if (view === 'inward_report') fetchInwardReport();
    if (view === 'outward_report') fetchOutwardReport();
  }, [view]);

  // Delete handler
  const handleDelete = async (type, rowIndex) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    setLoading(true);
    try {
      const actionMap = {
        'inward': 'DELETE_INWARD',
        'outward': 'DELETE_OUTWARD',
        'loading': 'DELETE_LOADING'
      };
      
      const result = await callAPI({ action: actionMap[type], rowIndex });
      if (result && result.status === 'success') {
        notify(result.message);
        // Refresh reports
        if (type === 'inward') fetchInwardReport();
        if (type === 'outward') fetchOutwardReport();
        if (type === 'loading') fetchLoadingReport();
        fetchStock();
      } else {
        notify(result?.message || "Delete failed", "error");
      }
    } catch (err) {
      notify("Delete request failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Edit handler
  const handleEdit = (item, type) => {
    setEditingItem(item);
    setEditType(type);
  };

  // Update handler
  const handleUpdate = async () => {
    if (!editingItem) return;
    
    setLoading(true);
    try {
      const actionMap = {
        'inward': 'UPDATE_INWARD',
        'outward': 'UPDATE_OUTWARD',
        'loading': 'UPDATE_LOADING'
      };
      
      const payload = { 
        action: actionMap[editType], 
        rowIndex: editingItem.rowIndex,
        ...editingItem
      };
      
      const result = await callAPI(payload);
      if (result && result.status === 'success') {
        notify(result.message);
        setEditingItem(null);
        setEditType(null);
        // Refresh reports
        if (editType === 'inward') fetchInwardReport();
        if (editType === 'outward') fetchOutwardReport();
        if (editType === 'loading') fetchLoadingReport();
        fetchStock();
      } else {
        notify(result?.message || "Update failed", "error");
      }
    } catch (err) {
      notify("Update request failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (actionType) => {
    setLoading(true);
    try {
      let payload = { action: actionType, user: 'Store Head' };
      if (actionType === 'LOADING_PROCESS') {
        payload = { ...payload, ...loadingForm };
      } else {
        payload = { ...payload, ...form, qty_rolls: parseFloat(form.rolls || 0), qty_kgs: parseFloat(form.kgs || 0) };
      }

      const result = await callAPI(payload);
      if (result && result.status === 'success') {
        notify(result.message);
        if (actionType !== 'LOADING_PROCESS') {
          setForm({ 
            id: '', productName: '', category: '', materialType: '', vendor: '', usedAs: '', 
            rolls: '', kgs: '', batch: '', width: '', gsm: '', meters: '', dtx: '',
            glueType: '', colour: '', line: '', supervisor: '', machineNo: '', 
            user: 'Store Head', properties: '', hiHo: '', nonWovenUsedFor: ''
          });
        }
        fetchStock();
        setTimeout(() => setView('dashboard'), 1500);
      } else {
        notify(result?.message || "Operation failed", "error");
      }
    } catch (err) { notify("Request Failed.", "error"); } 
    finally { setLoading(false); }
  };

  const generateChallanPDF = () => {
    if (!loadingForm.vehicleNo || !loadingForm.challanNo) return notify("Challan No and Vehicle No are required.", "error");

    try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header with logo (best-effort: if logo fails, continue without breaking PDF)
    // Logo on left, text centered
    try {
      if (logoImage) {
        doc.addImage(logoImage, "PNG", 15, 10, 20, 20);
      }
    } catch (e) {
      console.error("Logo render error in PDF", e);
    }

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("MUMUKSH IMPEX LLP", pageWidth / 2, 18, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Mumuksh Impex LLP, Ranala Shivar, Ranala, Nadurbar, Maharastra-425411", pageWidth / 2, 24, {
      align: "center",
    });
    doc.line(15, 30, pageWidth - 15, 30);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("LOADING CHALLAN", pageWidth / 2, 38, { align: "center" });

    // Header details
    const leftX = 15;
    const rightX = pageWidth - 85;
    let y = 46;
    const lineH = 6;
    const loadingTypeLabel =
      loadingForm.loadingType === "grade" ? "Grade Based (A / B / C)" : "Regular (Carton Based)";

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    // Left column
    doc.text("Ship From:", leftX, y);
    doc.setFont("helvetica", "normal");
    const shipFromLines = doc.splitTextToSize(loadingForm.dispatchFrom || "", 80);
    doc.text(leftX + 25, y, shipFromLines);
    y += lineH * Math.max(1, shipFromLines.length);

    doc.setFont("helvetica", "bold");
    doc.text("Dispatch To:", leftX, y);
    doc.setFont("helvetica", "normal");
    const dispatchToLines = doc.splitTextToSize(loadingForm.dispatchTo || "", 80);
    doc.text(leftX + 25, y, dispatchToLines);
    y += lineH * Math.max(1, dispatchToLines.length);

    doc.setFont("helvetica", "bold");
    doc.text("Vehicle No:", leftX, y);
    doc.setFont("helvetica", "normal");
    doc.text(leftX + 25, y, loadingForm.vehicleNo || "-");
    y += lineH;

    doc.setFont("helvetica", "bold");
    doc.text("Driver Name:", leftX, y);
    doc.setFont("helvetica", "normal");
    doc.text(leftX + 25, y, loadingForm.driverName || "-");
    y += lineH;

    doc.setFont("helvetica", "bold");
    doc.text("Driver Phone:", leftX, y);
    doc.setFont("helvetica", "normal");
    doc.text(leftX + 25, y, loadingForm.driverNo || "-");
    y += lineH;

    doc.setFont("helvetica", "bold");
    doc.text("Transporter:", leftX, y);
    doc.setFont("helvetica", "normal");
    doc.text(leftX + 25, y, loadingForm.transporterName || "-");
    y += lineH;

    doc.setFont("helvetica", "bold");
    doc.text("LR No:", leftX, y);
    doc.setFont("helvetica", "normal");
    doc.text(leftX + 25, y, loadingForm.lrNo || "-");
    y += lineH;

    // Right column
    let yRight = 46;
    doc.setFont("helvetica", "bold");
    doc.text("Challan No:", rightX, yRight);
    doc.setFont("helvetica", "normal");
    doc.text(rightX + 28, yRight, loadingForm.challanNo || "-");
    yRight += lineH;

    doc.setFont("helvetica", "bold");
    doc.text("Dispatch Date:", rightX, yRight);
    doc.setFont("helvetica", "normal");
    doc.text(
      rightX + 28,
      yRight,
      loadingForm.date ? new Date(loadingForm.date).toLocaleDateString("en-GB") : "-"
    );
    yRight += lineH;

    doc.setFont("helvetica", "bold");
    doc.text("Loading Type:", rightX, yRight);
    doc.setFont("helvetica", "normal");
    doc.text(rightX + 28, yRight, loadingTypeLabel);
    yRight += lineH;

    if (loadingForm.vehicleIn || loadingForm.vehicleOut) {
      doc.setFont("helvetica", "bold");
      doc.text("Vehicle In:", leftX, y);
      doc.setFont("helvetica", "normal");
      doc.text(leftX + 25, y, loadingForm.vehicleIn ? new Date(loadingForm.vehicleIn).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");
      y += lineH;
      doc.setFont("helvetica", "bold");
      doc.text("Vehicle Out:", leftX, y);
      doc.setFont("helvetica", "normal");
      doc.text(leftX + 25, y, loadingForm.vehicleOut ? new Date(loadingForm.vehicleOut).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");
      y += lineH;
    }

    const startY = Math.max(y, yRight) + 6;

    // Main loading section: Grade-based or Regular
    let currentY = startY;

    if (loadingForm.loadingType === "grade") {
      const gradeItems = loadingForm.gradeItems || [];
      const gradeTableData = gradeItems.map((item, index) => [
        index + 1,
        item.grade || "",
        item.bags || "0",
        item.kgs || "0",
      ]);

      doc.autoTable({
        startY: currentY,
        head: [["Sr.", "Grade", "No. of Bags", "Total KGs"]],
        body: gradeTableData,
        theme: "grid",
        headStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
        columnStyles: {
          0: { halign: "center" }, // Sr.
          1: { halign: "center" }, // Grade
          2: { halign: "center" }, // No. of Bags
          3: { halign: "center" }, // Total KGs
        },
        styles: { textColor: [0, 0, 0], halign: "center" },
        foot: [
          [
            "",
            "GRAND TOTAL",
            gradeItems.reduce((acc, i) => acc + (parseFloat(i.bags) || 0), 0).toString(),
            gradeItems.reduce((acc, i) => acc + (parseFloat(i.kgs) || 0), 0).toString(),
          ],
        ],
        footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
      });

      currentY = doc.lastAutoTable.finalY + 8;
    } else {
      const items = loadingForm.items || [];
      const tableData = items.map((item, index) => [
        index + 1,
        `${item.product || ""} ${item.size ? `(${item.size})` : ""}`.trim(),
        item.packPerCtn || "",
        item.totalCtn || "",
        item.avgWeightKg || "-",
      ]);

      const totalCtn = (items || []).reduce((acc, i) => acc + (parseFloat(i.totalCtn) || 0), 0);
      const totalEstKg = (items || []).reduce((acc, i) => acc + (parseFloat(i.totalCtn) || 0) * (parseFloat(i.avgWeightKg) || 0), 0);

      doc.autoTable({
        startY: currentY,
        head: [["Sr.", "Item Description", "Packs/Ctn", "Total Ctn", "Avg Wt (KG)"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
        columnStyles: {
          0: { halign: "center" },
          1: { halign: "left" },
          2: { halign: "center" },
          3: { halign: "center" },
          4: { halign: "center" },
        },
        styles: { textColor: [0, 0, 0] },
        foot: [
          [
            "",
            "GRAND TOTAL",
            "",
            totalCtn.toString(),
            totalEstKg > 0 ? totalEstKg.toString() + " KG" : "-",
          ],
        ],
        footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
      });

      currentY = doc.lastAutoTable.finalY + 8;
    }

    // Poly Bag section (print only if any value entered)
    const polyItemsRaw = loadingForm.polyItems || [];
    const polyItems = polyItemsRaw.filter((p) => {
      const name = (p?.name || "").toString().trim();
      const size = (p?.size || "").toString().trim();
      const kgsStr = (p?.kgs ?? "").toString().trim();
      const kgsNum = parseFloat(kgsStr);
      return name !== "" || size !== "" || (Number.isFinite(kgsNum) && kgsNum > 0);
    });

    if (polyItems.length > 0) {
      const polyTableData = polyItems.map((p, index) => [
        index + 1,
        p.name || "",
        p.size || "",
        p.kgs || "0",
      ]);

      doc.autoTable({
        startY: currentY,
        head: [["Sr.", "Poly Bag Name", "Size", "Total KGs"]],
        body: polyTableData,
        theme: "grid",
        headStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
        columnStyles: {
          0: { halign: "center" }, // Sr.
          1: { halign: "left" }, // Poly Bag Name
          2: { halign: "center" }, // Size
          3: { halign: "center" }, // Total KGs
        },
        styles: { textColor: [0, 0, 0] },
        foot: [
          [
            "",
            "TOTAL POLY KGs",
            "",
            polyItems.reduce((acc, p) => acc + (parseFloat(p.kgs) || 0), 0).toString(),
          ],
        ],
        footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
      });

      currentY = doc.lastAutoTable.finalY + 8;
    }

    // Signature area
    const finalY = currentY + 20;
    doc.setFont("helvetica", "bold");
    doc.text("Authorized Signatory", pageWidth - 60, finalY);

    doc.save(`CHALLAN_${loadingForm.challanNo}.pdf`);
    notify("Challan downloaded.", "success");
    } catch (err) {
      console.error("PDF error", err);
      notify("Could not generate PDF. Please try again.", "error");
    }
  };

  const exportChallanExcel = () => {
    const escape = (v) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [
      ["LOADING CHALLAN"],
      ["Ship From", loadingForm.dispatchFrom || ""],
      ["Challan No.", loadingForm.challanNo || ""],
      ["Dispatch Date", loadingForm.date || ""],
      ["Dispatch To", loadingForm.dispatchTo || ""],
      ["Vehicle No.", loadingForm.vehicleNo || ""],
      ["Driver Name", loadingForm.driverName || ""],
      ["Driver Phone", loadingForm.driverNo || ""],
      ["Transporter Name", loadingForm.transporterName || ""],
      ["LR No.", loadingForm.lrNo || ""],
      ["Loading Type", loadingForm.loadingType === "grade" ? "Grade Based (A/B/C)" : "Regular (Carton Based)"],
      ["Vehicle In (Date & Time)", loadingForm.vehicleIn ? new Date(loadingForm.vehicleIn).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""],
      ["Vehicle Out (Date & Time)", loadingForm.vehicleOut ? new Date(loadingForm.vehicleOut).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""],
      [],
    ];
    if (loadingForm.loadingType === "grade") {
      rows.push(["Sr.", "Grade", "No. of Bags", "Total KGs"]);
      (loadingForm.gradeItems || []).forEach((item, i) => {
        rows.push([i + 1, item.grade || "", item.bags || "0", item.kgs || "0"]);
      });
    } else {
      rows.push(["Sr.", "Item Description", "Packs/Ctn", "Total Ctn", "Avg Wt (KG)"]);
      (loadingForm.items || []).forEach((item, i) => {
        rows.push([i + 1, `${item.product || ""} ${item.size ? `(${item.size})` : ""}`.trim(), item.packPerCtn || "", item.totalCtn || "", item.avgWeightKg || ""]);
      });
    }
    const polyItems = (loadingForm.polyItems || []).filter((p) => (p?.name ?? "").trim() !== "" || (p?.size ?? "").trim() !== "" || (parseFloat(p?.kgs) || 0) > 0);
    if (polyItems.length > 0) {
      rows.push([]);
      rows.push(["Sr.", "Poly Bag Name", "Size", "Total KGs"]);
      polyItems.forEach((p, i) => rows.push([i + 1, p.name || "", p.size || "", p.kgs || "0"]));
    }
    const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CHALLAN_${loadingForm.challanNo || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Challan exported to Excel (CSV).", "success");
  };

  const addLoadingItem = () => {
    setLoadingForm({
      ...loadingForm,
      items: [...(loadingForm.items || []), { product: '', size: '', packPerCtn: '', totalCtn: '', avgWeightKg: '' }],
    });
  };

  const updateLoadingItem = (index, field, value) => {
    const newItems = [...(loadingForm.items || [])];
    newItems[index][field] = value;
    setLoadingForm({ ...loadingForm, items: newItems });
  };

  // Grade-based diaper loading (A/B/C grade)
  const addGradeItem = () => {
    setLoadingForm({
      ...loadingForm,
      gradeItems: [...(loadingForm.gradeItems || []), { grade: '', bags: '', kgs: '' }],
    });
  };

  const updateGradeItem = (index, field, value) => {
    const newGradeItems = [...(loadingForm.gradeItems || [])];
    newGradeItems[index][field] = value;
    setLoadingForm({ ...loadingForm, gradeItems: newGradeItems });
  };

  const addPolyItem = () => {
    setLoadingForm({
      ...loadingForm,
      polyItems: [...(loadingForm.polyItems || []), { name: '', size: '', kgs: '' }]
    });
  };

  const updatePolyItem = (index, field, value) => {
    const newPolyItems = [...(loadingForm.polyItems || [])];
    newPolyItems[index][field] = value;
    setLoadingForm({ ...loadingForm, polyItems: newPolyItems });
  };

  const lowStockItems = useMemo(() => stock.filter(i => Number(i.Current_Stock) < Number(i.Min_Stock)), [stock]);
  const filteredStock = useMemo(() => stock.filter(item => 
    item.Name?.toString().toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.Material_ID?.toString().toLowerCase().includes(searchTerm.toLowerCase())
  ), [stock, searchTerm]);

  /**
   * OPTIMIZED DASHBOARD VIEW: OVERVIEW MODE
   */
  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Executive Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total SKU" value={stock.length} icon={<Package className="text-blue-600"/>} trend="Master Inventory" />
        <StatCard label="Critical Low" value={lowStockItems.length} icon={<AlertCircle className="text-red-600"/>} warning={lowStockItems.length > 0} trend="Action Required" />
        <StatCard label="Production Today" value="842 Ctn" icon={<BarChart3 className="text-emerald-600"/>} trend="+12% from Ytd" />
        <StatCard label="Pending Loading" value="4 Vehicles" icon={<Truck className="text-purple-600"/>} trend="In Yard" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Material Management Overview */}
        <div className="space-y-8">
          <OverviewCard 
            title="Material Inward (GRN)" 
            icon={<ArrowDownLeft className="text-emerald-600" />} 
            subtitle="Latest receipts into warehouse"
            items={[
              { label: "SAP High Retention", sub: "Vendor: BASF", value: "2,400 KG", time: "10:30 AM" },
              { label: "Non-Woven Fabric", sub: "Vendor: Texon", value: "18 Rolls", time: "09:15 AM" },
              { label: "Hotmelt Glue", sub: "Vendor: Henkel", value: "40 Box", time: "Yesterday" }
            ]}
            onViewAll={() => setView('inward_report')}
          />

          <OverviewCard 
            title="Material Issue (Floor)" 
            icon={<ArrowUpRight className="text-blue-600" />} 
            subtitle="Recent stock issued to machine"
            items={[
              { label: "Pulp Roll (PLP-01)", sub: "To Machine: M-01", value: "450 KG", time: "11:45 AM" },
              { label: "S-Cut Tape", sub: "To Machine: M-03", value: "4 Rolls", time: "10:00 AM" },
              { label: "Elastic 610 DTX", sub: "To Machine: M-02", value: "2 Box", time: "08:30 AM" }
            ]}
            onViewAll={() => setView('outward_report')}
          />
        </div>

        {/* Finished Goods & Logistics Overview */}
        <div className="space-y-8">

          <OverviewCard 
            title="Vehicle Loading" 
            icon={<Truck className="text-orange-600" />} 
            subtitle="Recent dispatches & loading logs"
            items={[
              { label: "MH-18-BC-4412", sub: "To: ABC Distributors", value: "450 Ctn", time: "In Transit" },
              { label: "GJ-05-XX-1029", sub: "To: Central Hub", value: "820 Ctn", time: "Loading" },
              { label: "MH-15-ZA-5521", sub: "To: Local Dealer", value: "120 Ctn", time: "Delivered" }
            ]}
            onViewAll={() => setView('loading_report')}
          />
        </div>
      </div>
      
      {/* Quick Access to Stock Reports */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 flex items-center justify-between">
         <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
               <Database size={32} />
            </div>
            <div>
               <h3 className="text-xl font-black text-slate-900">Master Stock Analytics</h3>
               <p className="text-slate-500 text-sm">Review full inventory report with SKU details</p>
            </div>
         </div>
         <button onClick={() => setView('inventory')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all">
            Open Report <ArrowRight size={18} />
         </button>
      </div>
    </div>
  );

  /**
   * REUSABLE: Dynamic Form Component for Raw Materials
   */
  const renderDynamicForm = (mode) => (
    <div className="max-w-4xl mx-auto bg-white p-6 md:p-10 rounded-[2.5rem] border shadow-2xl transition-all">
      <div className="flex items-center gap-4 mb-8">
        <div className={`w-12 h-12 ${mode === 'INWARD' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'} rounded-xl flex items-center justify-center`}>
          {mode === 'INWARD' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
        </div>
        <div>
          <h3 className="text-2xl font-black text-slate-900 leading-none">
            {mode === 'INWARD' ? 'Raw Material Inward' : 'Material Issue (To Floor)'}
          </h3>
          <p className="text-slate-500 font-medium text-sm mt-1">Inventory update for production materials</p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mainCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setForm({...form, category: cat, materialType: ''})}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${form.category === cat ? 'border-blue-600 bg-blue-50 text-blue-700 ring-4 ring-blue-100' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'}`}
            >
              {cat === "Raw Material" && <Layers size={32} />}
              {cat === "Packing Material" && <Boxes size={32} />}
              {cat === "PE Backsheet" && <Film size={32} />}
              <span className="font-black text-sm tracking-tight uppercase">{cat}</span>
            </button>
          ))}
        </div>

        {form.category && (
          <div className="pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Specific Material Type</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold appearance-none" value={form.materialType} onChange={e => setForm({...form, materialType: e.target.value})}>
                  <option value="">-- Choose Material --</option>
                  {subCategories[form.category]?.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              
              {mode === 'OUTWARD' && (
                <div>
                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 px-1 italic">Issue to Machine No.</label>
                  <select className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl outline-none font-bold appearance-none" value={form.machineNo} onChange={e => setForm({...form, machineNo: e.target.value})}>
                    <option value="">-- Select Machine --</option>
                    {machines.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
              {form.category !== "PE Backsheet" && form.materialType !== "SAP" && form.materialType !== "Pulp" && form.materialType !== "Elastic" && form.materialType !== "Glue" && form.materialType !== "Hook" && form.materialType !== "Y-Cut Side Tape" && form.materialType !== "S-Cut" && form.materialType !== "Frontal Tape" && form.category !== "Packing Material" && (
                <Input label="Material ID / Product Code" value={form.id} onChange={e => setForm({...form, id: e.target.value.toUpperCase()})} />
              )}
            </div>

            {form.materialType && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95">
                <Input label="Vendor Name" value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} />
                {form.materialType === "SAP" ? (
                  <>
                    <Input label="Product Code" value={form.id} onChange={e => setForm({...form, id: e.target.value.toUpperCase()})} />
                    <Input label="Total Weight (KGs)" type="number" value={form.kgs} onChange={e => setForm({...form, kgs: e.target.value})} />
                    <Input label="No. of Bags" type="number" value={form.rolls} onChange={e => setForm({...form, rolls: e.target.value})} />
                  </>
                ) : (
                  <>
                    <Input label="Total Weight (KGs)" type="number" value={form.kgs} onChange={e => setForm({...form, kgs: e.target.value})} />
                    <Input label="No of Rolls" type="number" value={form.rolls} onChange={e => setForm({...form, rolls: e.target.value})} />
                  </>
                )}
                {/* Properties Dropdown and HI/HO Radio Buttons */}
                {form.category === "Raw Material" && form.materialType && form.materialType !== "SAP" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Properties</label>
                      <select 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold appearance-none focus:ring-4 focus:ring-blue-100 transition-all" 
                        value={form.properties} 
                        onChange={e => setForm({...form, properties: e.target.value})}
                      >
                        <option value="">-- Select Properties --</option>
                        {propertiesOptions.map(prop => (
                          <option key={prop} value={prop}>{prop}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Type</label>
                      <div className="flex gap-4">
                        <label className="flex-1 p-4 bg-slate-50 border-2 rounded-2xl cursor-pointer transition-all hover:bg-slate-100 flex items-center justify-center gap-2 font-bold text-slate-700" style={{ borderColor: form.hiHo === 'HI' ? '#2563eb' : '#e2e8f0', backgroundColor: form.hiHo === 'HI' ? '#eff6ff' : '#f8fafc' }}>
                          <input 
                            type="radio" 
                            name="hiHo" 
                            value="HI" 
                            checked={form.hiHo === 'HI'} 
                            onChange={e => setForm({...form, hiHo: e.target.value})}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>HI</span>
                        </label>
                        <label className="flex-1 p-4 bg-slate-50 border-2 rounded-2xl cursor-pointer transition-all hover:bg-slate-100 flex items-center justify-center gap-2 font-bold text-slate-700" style={{ borderColor: form.hiHo === 'HO' ? '#2563eb' : '#e2e8f0', backgroundColor: form.hiHo === 'HO' ? '#eff6ff' : '#f8fafc' }}>
                          <input 
                            type="radio" 
                            name="hiHo" 
                            value="HO" 
                            checked={form.hiHo === 'HO'} 
                            onChange={e => setForm({...form, hiHo: e.target.value})}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>HO</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}
                {/* Non-Woven Foam Used For Field */}
                {form.category === "Raw Material" && form.materialType === "Non-Woven" && (
                  <div className="md:col-span-2">
                    <Input 
                      label="Non-Woven Foam Used For" 
                      placeholder="e.g., Backsheet, Topsheet, etc." 
                      value={form.nonWovenUsedFor} 
                      onChange={e => setForm({...form, nonWovenUsedFor: e.target.value})} 
                    />
                  </div>
                )}
                {mode === 'OUTWARD' && (
                  <div className="md:col-span-2 pt-4">
                    <Input label="Issue Authorized By (Supervisor)" value={form.supervisor} onChange={e => setForm({...form, supervisor: e.target.value})} icon={<UserCheck size={14}/>} />
                  </div>
                )}
              </div>
            )}
            <button onClick={() => handleSubmit(mode)} disabled={loading || !form.materialType} className={`w-full py-5 mt-8 rounded-2xl font-black text-lg text-white shadow-xl flex items-center justify-center gap-3 transition-all ${mode === 'INWARD' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {loading ? <Loader2 className="animate-spin" /> : mode === 'INWARD' ? <CheckCircle2 size={24} /> : <ArrowUpRight size={24} />} Confirm {mode}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Material Inward (GRN) Detailed Report
   */
  const renderInwardReport = () => (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 bg-gradient-to-r from-emerald-50 to-blue-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white">
              <ArrowDownLeft size={28} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900">Material Inward Report (GRN)</h3>
              <p className="text-slate-500 font-medium text-sm mt-1">Complete history of all material receipts into warehouse</p>
            </div>
          </div>
          <button onClick={fetchInwardReport} className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm flex items-center gap-2">
            <RefreshCcw size={18} /> Refresh
          </button>
        </div>
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white border-b text-[11px] font-black uppercase text-slate-400 tracking-[0.15em] z-10">
              <tr>
                <th className="px-8 py-6">Date & Time</th>
                <th className="px-8 py-6">Material</th>
                <th className="px-8 py-6">Category</th>
                <th className="px-8 py-6">Vendor</th>
                <th className="px-8 py-6 text-right">Quantity</th>
                <th className="px-8 py-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reportLoading ? (
                <tr><td colSpan="5" className="px-8 py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={32} /></td></tr>
              ) : inwardReport.length === 0 ? (
                <tr><td colSpan="5" className="px-8 py-20 text-center text-slate-400 font-bold">No records found</td></tr>
              ) : (
                inwardReport.map((item, idx) => (
                  <tr key={idx} className="hover:bg-emerald-50/30 transition-all">
                    <td className="px-8 py-6">
                      <div className="font-black text-slate-800">{new Date(item.date).toLocaleDateString('en-GB')}</div>
                      <div className="text-xs text-slate-400 font-bold mt-1 flex items-center gap-1"><Clock size={10} /> {item.time}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="font-black text-slate-800 text-lg">{item.material}</div>
                      <div className="text-xs text-slate-400 font-mono mt-1">{item.materialType || 'N/A'}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase">{item.category || 'Material'}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="font-bold text-slate-700">{item.vendor}</div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="font-black text-2xl text-emerald-600">{item.qty}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(item, 'inward')} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition" title="Edit">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete('inward', item.rowIndex)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /**
   * Material Issue (Floor) Detailed Report
   */
  const renderOutwardReport = () => (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 bg-gradient-to-r from-blue-50 to-purple-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
              <ArrowUpRight size={28} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900">Material Issue Report (Floor)</h3>
              <p className="text-slate-500 font-medium text-sm mt-1">Complete history of stock issued to production machines</p>
            </div>
          </div>
          <button onClick={fetchOutwardReport} className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm flex items-center gap-2">
            <RefreshCcw size={18} /> Refresh
          </button>
        </div>
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white border-b text-[11px] font-black uppercase text-slate-400 tracking-[0.15em] z-10">
              <tr>
                <th className="px-8 py-6">Date & Time</th>
                <th className="px-8 py-6">Material</th>
                <th className="px-8 py-6">Machine</th>
                <th className="px-8 py-6">Supervisor</th>
                <th className="px-8 py-6 text-right">Quantity</th>
                <th className="px-8 py-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reportLoading ? (
                <tr><td colSpan="5" className="px-8 py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={32} /></td></tr>
              ) : outwardReport.length === 0 ? (
                <tr><td colSpan="5" className="px-8 py-20 text-center text-slate-400 font-bold">No records found</td></tr>
              ) : (
                outwardReport.map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-all">
                    <td className="px-8 py-6">
                      <div className="font-black text-slate-800">{new Date(item.date).toLocaleDateString('en-GB')}</div>
                      <div className="text-xs text-slate-400 font-bold mt-1 flex items-center gap-1"><Clock size={10} /> {item.time}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="font-black text-slate-800 text-lg">{item.material}</div>
                      <div className="text-xs text-slate-400 font-mono mt-1">{item.category || 'Material'}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-4 py-2 rounded-xl bg-blue-100 text-blue-700 text-sm font-black">{item.machine}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="font-bold text-slate-700 flex items-center gap-2"><User size={14} /> {item.supervisor}</div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="font-black text-2xl text-blue-600">{item.qty}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(item, 'outward')} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition" title="Edit">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete('outward', item.rowIndex)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /**
   * Vehicle Loading Detailed Report
   */
  const renderVehicleLoadingReport = () => (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 bg-gradient-to-r from-orange-50 to-red-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center text-white">
              <Truck size={28} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900">Vehicle Loading Report</h3>
              <p className="text-slate-500 font-medium text-sm mt-1">Complete dispatch history and loading logs</p>
            </div>
          </div>
          <button onClick={fetchLoadingReport} className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm flex items-center gap-2">
            <RefreshCcw size={18} /> Refresh
          </button>
        </div>
        <div className="overflow-auto max-h-[70vh] space-y-6 p-8">
          {reportLoading ? (
            <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-blue-600" size={32} /></div>
          ) : loadingReport.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-bold">No records found</div>
          ) : (
            loadingReport.map((item, idx) => (
              <div key={idx} className="bg-slate-50 rounded-[2rem] border border-slate-200 p-6 hover:shadow-lg transition-all">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vehicle No</div>
                    <div className="text-2xl font-black text-slate-900">{item.vehicleNo}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dispatch To</div>
                    <div className="text-lg font-bold text-slate-800">{item.dispatchTo}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Driver</div>
                    <div className="text-lg font-bold text-slate-800 flex items-center gap-2"><User size={16} /> {item.driverName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</div>
                    <span className={`px-4 py-2 rounded-xl text-sm font-black ${
                      item.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                      item.status === 'In Transit' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>{item.status}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Challan No</div>
                    <div className="font-mono font-bold text-slate-700">{item.challanNo}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</div>
                    <div className="font-bold text-slate-700">{new Date(item.date).toLocaleDateString('en-GB')}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      {item.loadingType === 'grade' ? 'Total KGs (Diaper Grade)' : 'Total Cartons'}
                    </div>
                    {item.loadingType === 'grade' ? (
                      <div className="text-2xl font-black text-purple-600">
                        {item.gradeItems?.reduce((sum, i) => sum + (parseFloat(i.kgs) || 0), 0) || 0} KG
                      </div>
                    ) : (
                      <div className="text-2xl font-black text-orange-600">{item.totalCtn} Ctn</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Poly KGs</div>
                    <div className="text-xl font-black text-slate-800">
                      {(item.polyItems || []).reduce((sum, i) => sum + (parseFloat(i.kgs) || 0), 0)} KG
                    </div>
                  </div>
                </div>
                {item.loadingType === 'grade' && item.gradeItems && item.gradeItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-3">Grade Based Items (Bill by KGs)</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {item.gradeItems.map((gradeItem, pIdx) => (
                        <div key={pIdx} className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                          <div className="font-bold text-purple-800 text-sm">{gradeItem.grade}</div>
                          <div className="text-xs text-purple-600 mt-1">Bags: {gradeItem.bags} | KGs: {gradeItem.kgs}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {item.polyItems && item.polyItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Poly Bags (Bill by KGs)</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {item.polyItems.map((poly, pIdx) => (
                        <div key={pIdx} className="bg-white p-3 rounded-xl border border-slate-100">
                          <div className="font-bold text-slate-800 text-sm">{poly.name}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Size: {poly.size || '-'} | KGs: {poly.kgs || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {item.loadingType !== 'grade' && item.items && item.items.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Loaded Items</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {item.items.map((product, pIdx) => (
                        <div key={pIdx} className="bg-white p-3 rounded-xl border border-slate-100">
                          <div className="font-bold text-slate-800 text-sm">{product.product}</div>
                          <div className="text-xs text-slate-500 mt-1">Size: {product.size} | Qty: {product.ctn} Ctn</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button onClick={() => handleEdit(item, 'loading')} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-100 transition flex items-center gap-2">
                    <Pencil size={14} /> Edit
                  </button>
                  <button onClick={() => handleDelete('loading', item.rowIndex)} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition flex items-center gap-2">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // LOGIN SCREEN: Vehicle Dispatch Portal access
  // ---------------------------------------------------------------------------
  const renderLogin = () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-8">
        <div className="text-center space-y-2">
          <img
            src={LOGO_URL}
            alt="Mumuksh Impex LLP"
            className="mx-auto mb-3 max-h-24 w-auto object-contain"
          />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mumuksh Impex LLP</h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Vehicle Dispatch Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Login ID
            </label>
            <input
              type="text"
              className="w-full p-3.5 rounded-2xl border border-slate-200 outline-none text-sm font-medium text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100"
              value={loginForm.userId}
              onChange={(e) => setLoginForm({ ...loginForm, userId: e.target.value })}
              placeholder="dispatch"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Password
            </label>
            <input
              type="password"
              className="w-full p-3.5 rounded-2xl border border-slate-200 outline-none text-sm font-medium text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {loginError && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-2xl px-3 py-2">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm tracking-wide shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck size={16} />
            Sign in to Dispatch
          </button>
        </form>

        <p className="text-[10px] text-slate-400 text-center">
          Authorized access only • Mumuksh Impex LLP
        </p>
      </div>
    </div>
  );

  // If not logged in, show only login portal
  if (!isAuthenticated) {
    return renderLogin();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans selection:bg-blue-100">
      <nav className="w-full md:w-72 bg-slate-900 text-white flex flex-col p-6 space-y-2 shrink-0">
        <div className="mb-10 px-2">
          <div className="flex items-center gap-3 mb-2">
            <img
              src={LOGO_URL}
              alt="Mumuksh Impex LLP"
              className="h-10 w-auto object-contain"
            />
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white uppercase">Mumuksh Impex LLP</h1>
              <p className="text-slate-500 text-[9px] uppercase font-bold tracking-widest">Vehicle Dispatch Portal</p>
            </div>
          </div>
        </div>
        <div className="pt-2 pb-2 px-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest border-t border-slate-800/50 mt-2">
          Dispatch
        </div>
        <NavItem
          active={view === 'loading_process'}
          icon={<Truck size={18} />}
          label="Vehicle Loading"
          onClick={() => setView('loading_process')}
        />
        <div className="mt-auto pt-6 border-t border-slate-800/50">
          <button
            type="button"
            onClick={() => {
              try { localStorage.removeItem('mumuksh_dispatch_auth'); } catch (_) {}
              setIsAuthenticated(false);
              setLoginForm({ userId: '', password: '' });
              setLoginError('');
            }}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 transition-all"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-10 overflow-y-auto bg-slate-50/50">
        {message && (
          <div className={`fixed top-8 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-8 px-8 py-5 rounded-3xl shadow-2xl z-50 flex items-start gap-4 border max-w-sm bg-white animate-in slide-in-from-right duration-300 ${message.type === 'error' ? 'border-red-100 text-red-600' : 'border-emerald-100 text-emerald-600'}`}>
            {message.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
            <div className="flex-1">
              <p className="font-black text-sm uppercase">{message.type === 'error' ? 'Alert' : 'Done'}</p>
              <p className="text-slate-600 text-sm font-medium leading-snug">{message.msg}</p>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 px-1">×</button>
          </div>
        )}

        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 shrink-0">
              <Truck size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
                Vehicle Dispatch Portal
              </p>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 capitalize tracking-tighter mt-1">
                Vehicle Loading & Challan
              </h2>
            </div>
          </div>
        </header>

        {view === 'loading_process' && renderLoadingProcess()}
      </main>
    </div>
  );

  /**
   * VEHICLE LOADING MODULE
   */
  function renderLoadingProcess() {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border shadow-2xl">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center"><Truck size={32} /></div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 leading-none">Vehicle Dispatch</h3>
              <p className="text-slate-500 font-medium text-sm mt-1">Generate loading sheet and delivery challan</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Ship From</label>
              <textarea
                rows={3}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-slate-800 text-sm resize-y focus:ring-2 focus:ring-blue-100 focus:bg-white"
                placeholder="Company name, address, city, state, PIN"
                value={loadingForm.dispatchFrom}
                onChange={e => setLoadingForm({ ...loadingForm, dispatchFrom: e.target.value })}
              />
            </div>
            <Input
              label="Challan No."
              value={loadingForm.challanNo}
              onChange={e => setLoadingForm({ ...loadingForm, challanNo: e.target.value.toUpperCase() })}
              icon={<FileDigit size={14} />}
            />
            <Input
              label="Dispatch Date"
              type="date"
              value={loadingForm.date}
              onChange={e => setLoadingForm({ ...loadingForm, date: e.target.value })}
              icon={<Calendar size={14} />}
            />
            <Input
              label="Dispatch To"
              placeholder="Customer Name"
              value={loadingForm.dispatchTo}
              onChange={e => setLoadingForm({ ...loadingForm, dispatchTo: e.target.value })}
              icon={<Navigation size={14} />}
            />
            <Input
              label="Vehicle No."
              placeholder="MH-18-XX-XXXX"
              value={loadingForm.vehicleNo}
              onChange={e => setLoadingForm({ ...loadingForm, vehicleNo: e.target.value.toUpperCase() })}
              icon={<Truck size={14} />}
            />
            <Input
              label="Driver Name"
              value={loadingForm.driverName}
              onChange={e => setLoadingForm({ ...loadingForm, driverName: e.target.value })}
              icon={<User size={14} />}
            />
            <Input
              label="Driver Phone"
              type="tel"
              value={loadingForm.driverNo}
              onChange={e => setLoadingForm({ ...loadingForm, driverNo: e.target.value })}
              icon={<UserCheck size={14} />}
            />
            <Input
              label="Transporter Name"
              placeholder="Transporter / Logistics Partner"
              value={loadingForm.transporterName}
              onChange={e => setLoadingForm({ ...loadingForm, transporterName: e.target.value })}
              icon={<Truck size={14} />}
            />
            <Input
              label="LR No."
              placeholder="LR / Consignment No."
              value={loadingForm.lrNo}
              onChange={e => setLoadingForm({ ...loadingForm, lrNo: e.target.value })}
              icon={<FileDigit size={14} />}
            />
            <Input
              label="Vehicle In (Date & Time)"
              type="datetime-local"
              value={loadingForm.vehicleIn}
              onChange={e => setLoadingForm({ ...loadingForm, vehicleIn: e.target.value })}
              icon={<Clock size={14} />}
            />
            <Input
              label="Vehicle Out (Date & Time)"
              type="datetime-local"
              value={loadingForm.vehicleOut}
              onChange={e => setLoadingForm({ ...loadingForm, vehicleOut: e.target.value })}
              icon={<Clock size={14} />}
            />
          </div>
        </div>
        <div className="bg-white p-6 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="mb-6">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Loading Type</label>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button 
                onClick={() => setLoadingForm({...loadingForm, loadingType: 'regular'})} 
                className={`flex-1 py-4 rounded-xl font-black text-sm transition-all ${loadingForm.loadingType === 'regular' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                Regular (Carton Based)
              </button>
              <button 
                onClick={() => setLoadingForm({...loadingForm, loadingType: 'grade'})} 
                className={`flex-1 py-4 rounded-xl font-black text-sm transition-all ${loadingForm.loadingType === 'grade' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'}`}
              >
                Grade Based (A/B/C)
              </button>
            </div>
          </div>

          {loadingForm.loadingType === 'regular' ? (
            <>
              <div className="flex justify-between items-center mb-8">
                <h4 className="text-xl font-black text-slate-800">Product Loading Entry</h4>
                <button onClick={addLoadingItem} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all"><Plus size={14} /> Add Line</button>
              </div>
              <div className="space-y-4">
                {loadingForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-4 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 items-end">
                    <div className="md:col-span-3"><Input label="Product" placeholder="Freshkins Std Pant, Premium Baby..." value={item.product} onChange={e => updateLoadingItem(index, 'product', e.target.value)} /></div>
                    <div className="md:col-span-2"><Input label="Size" placeholder="S-42, M-75, L-38..." value={item.size} onChange={e => updateLoadingItem(index, 'size', e.target.value)} /></div>
                    <div className="md:col-span-2"><Input label="Pack/Ctn" type="number" placeholder="48, 72..." value={item.packPerCtn} onChange={e => updateLoadingItem(index, 'packPerCtn', e.target.value)} /></div>
                    <div className="md:col-span-2"><Input label="Total Ctn" type="number" placeholder="100, 250..." value={item.totalCtn} onChange={e => updateLoadingItem(index, 'totalCtn', e.target.value)} /></div>
                    <div className="md:col-span-2"><Input label="Avg Wt (KG)" type="number" placeholder="12, 15..." value={item.avgWeightKg} onChange={e => updateLoadingItem(index, 'avgWeightKg', e.target.value)} /></div>
                    <div className="md:col-span-1 flex justify-center pb-3"><button onClick={() => setLoadingForm({...loadingForm, items: loadingForm.items.filter((_, i) => i !== index)})} className="p-3 text-red-400 hover:text-red-600 transition-colors"><Trash2 size={20}/></button></div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-8">
                <h4 className="text-xl font-black text-slate-800">Grade Based Diaper Loading (Bill by KGs)</h4>
                <button onClick={addGradeItem} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-xs hover:bg-purple-700 transition-all"><Plus size={14} /> Add Grade</button>
              </div>
              <div className="space-y-4">
                {loadingForm.gradeItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-4 p-6 bg-purple-50/50 rounded-[2rem] border border-purple-100 items-end">
                    <div className="md:col-span-4">
                      <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 block">Grade</label>
                      <select className="w-full p-4 bg-white border border-purple-200 rounded-2xl outline-none font-bold appearance-none" value={item.grade} onChange={e => updateGradeItem(index, 'grade', e.target.value)}>
                        <option value="">-- Select Grade --</option>
                        {diaperGrades.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-3"><Input label="No. of Bags" type="number" value={item.bags} onChange={e => updateGradeItem(index, 'bags', e.target.value)} icon={<Hash size={12}/>} /></div>
                    <div className="md:col-span-4"><Input label="Total KGs" type="number" value={item.kgs} onChange={e => updateGradeItem(index, 'kgs', e.target.value)} icon={<Hash size={12}/>} /></div>
                    <div className="md:col-span-1 flex justify-center pb-3"><button onClick={() => setLoadingForm({...loadingForm, gradeItems: loadingForm.gradeItems.filter((_, i) => i !== index)})} className="p-3 text-red-400 hover:text-red-600 transition-colors"><Trash2 size={20}/></button></div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Poly Bag Loading (Optional - same challan) */}
        <div className="bg-white p-6 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-xl font-black text-slate-800">Poly Bag Loading (Optional)</h4>
            <button
              onClick={addPolyItem}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all"
            >
              <Plus size={14} /> Add Poly Bag
            </button>
          </div>
          <div className="space-y-4">
            {(loadingForm.polyItems || []).map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-4 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 items-end"
              >
                <div className="md:col-span-4">
                  <Input
                    label="Poly Bag Name"
                    placeholder="e.g., Outer Poly S, Master Poly"
                    value={item.name}
                    onChange={e => updatePolyItem(index, 'name', e.target.value)}
                  />
                </div>
                <div className="md:col-span-4">
                  <Input
                    label="Size (e.g., S-42, M-42)"
                    placeholder="S-42 / M-42 / L-38"
                    value={item.size}
                    onChange={e => updatePolyItem(index, 'size', e.target.value)}
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    label="Total KGs"
                    type="number"
                    value={item.kgs}
                    onChange={e => updatePolyItem(index, 'kgs', e.target.value)}
                    icon={<Hash size={12} />}
                  />
                </div>
                <div className="md:col-span-1 flex justify-center pb-3">
                  <button
                    onClick={() =>
                      setLoadingForm({
                        ...loadingForm,
                        polyItems: (loadingForm.polyItems || []).filter((_, i) => i !== index)
                      })
                    }
                    className="p-3 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-8">
          <div><h4 className="text-2xl font-black mb-2">Ready to Dispatch?</h4><p className="text-slate-400 font-medium">{loadingForm.loadingType === 'grade' ? 'Verify total bags and KGs before submitting data to billing.' : 'Verify total carton count before submitting data to billing.'}</p></div>
          <div className="flex items-center gap-10">
             {loadingForm.loadingType === 'regular' ? (
               <div className="flex items-center gap-8">
                 <div className="text-center">
                   <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Load</div>
                   <div className="text-4xl font-black text-blue-400">
                     {loadingForm.items.reduce((acc, i) => acc + (parseFloat(i.totalCtn) || 0), 0)} <span className="text-sm">Ctn</span>
                   </div>
                 </div>
                 {loadingForm.items.some(i => i.avgWeightKg && Number(i.avgWeightKg) > 0) && (
                   <div className="text-center">
                     <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Est. Weight</div>
                     <div className="text-4xl font-black text-emerald-400">
                       {Math.round(loadingForm.items.reduce((acc, i) => acc + (parseFloat(i.totalCtn) || 0) * (parseFloat(i.avgWeightKg) || 0), 0))} <span className="text-sm">KG</span>
                     </div>
                   </div>
                 )}
               </div>
             ) : (
               <div className="text-center space-y-2">
                 <div>
                   <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Bags</div>
                   <div className="text-3xl font-black text-purple-400">
                     {loadingForm.gradeItems.reduce((acc, i) => acc + (parseFloat(i.bags) || 0), 0)} <span className="text-sm">Bags</span>
                   </div>
                 </div>
                 <div>
                   <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total KGs</div>
                   <div className="text-3xl font-black text-purple-400">
                     {loadingForm.gradeItems.reduce((acc, i) => acc + (parseFloat(i.kgs) || 0), 0)} <span className="text-sm">KG</span>
                   </div>
                 </div>
               </div>
             )}
             <div className="relative">
               <button
                 type="button"
                 onClick={() => setShowPrintDropdown((v) => !v)}
                 className="px-10 py-5 bg-blue-600 hover:bg-blue-700 rounded-2xl font-black text-lg transition-all shadow-2xl shadow-blue-900/50 flex items-center gap-2"
               >
                 <FileText size={22} /> Print <ChevronDown size={20} className={showPrintDropdown ? "rotate-180" : ""} />
               </button>
               {showPrintDropdown && (
                 <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-xl py-2 z-50">
                   <button
                     type="button"
                     onClick={() => { generateChallanPDF(); setShowPrintDropdown(false); }}
                     className="w-full px-5 py-3 text-left font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                   >
                     <FileText size={18} className="text-red-500" /> PDF
                   </button>
                   <button
                     type="button"
                     onClick={() => { exportChallanExcel(); setShowPrintDropdown(false); }}
                     className="w-full px-5 py-3 text-left font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                   >
                     <Download size={18} className="text-emerald-600" /> Excel
                   </button>
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>
    );
  }
}

// UI COMPONENTS
function OverviewCard({ title, icon, subtitle, items, onViewAll }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 w-fit">{icon}</div>
          <div>
            <h3 className="text-xl font-black text-slate-800 leading-none">{title}</h3>
            <p className="text-slate-400 text-xs mt-1 font-medium">{subtitle}</p>
          </div>
        </div>
        {onViewAll && (
          <button onClick={onViewAll} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
            <ChevronRight size={24}/>
          </button>
        )}
      </div>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-50 group hover:border-blue-100 hover:bg-white transition-all">
            <div className="flex items-center gap-4">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
               <div>
                  <div className="font-bold text-slate-800 text-sm group-hover:text-blue-700">{item.label}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{item.sub}</div>
               </div>
            </div>
            <div className="text-right">
               <div className="font-black text-slate-900 text-sm">{item.value}</div>
               <div className="text-[9px] text-slate-400 flex items-center gap-1 justify-end font-bold"><Clock size={10}/> {item.time}</div>
            </div>
          </div>
        ))}
        {onViewAll && (
          <button onClick={onViewAll} className="w-full mt-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
            View Full Report <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, warning, trend }) {
  return (
    <div className={`p-8 bg-white rounded-[2.5rem] border transition-all duration-500 ${warning ? 'border-red-100 ring-4 ring-red-50' : 'border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1'}`}>
      <div className="flex justify-between items-start mb-6">
        <div className="p-4 rounded-2xl bg-slate-50/80 w-fit">{icon}</div>
        <div className={`text-[10px] font-black px-2 py-1 rounded-lg ${warning ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{trend}</div>
      </div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</p>
      <p className={`text-4xl font-black tracking-tighter ${warning ? 'text-red-600' : 'text-slate-900'}`}>{value || 0}</p>
    </div>
  );
}

function Input({ label, icon, ...props }) {
  return (
    <div className="w-full">
      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{icon} {label}</label>
      <input className="w-full p-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-800 transition-all placeholder:text-slate-300" {...props} />
    </div>
  );
}

function NavItem({ active, icon, label, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-2xl shadow-blue-900/40 translate-x-2' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
      <div className="flex items-center gap-4">{icon} <span className="font-bold text-sm tracking-tight">{label}</span></div>
      {active && <ChevronRight size={16} />}
    </button>
  );
}
