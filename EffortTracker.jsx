import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { Link } from 'react-router-dom';
import "../styles/EffortTracker.css";
import "../styles/EffortTrackerCustom.css";
import ExcelJS from 'exceljs';

const MONTHS_KEY = 'effortTrackerMonths';

const getMondays = (startMonth, endMonth) => {
  const mondays = [];
  let date = new Date(startMonth + "-01");
  const end = new Date(endMonth + "-01");
  end.setMonth(end.getMonth() + 1);
  while (date.getDay() !== 1) date.setDate(date.getDate() + 1);
  while (date < end) {
    mondays.push(new Date(date));
    date.setDate(date.getDate() + 7);
  }
  return mondays;
};
 
// Utility: default two-month window (current + next month) when no state stored.
const getDefaultMonths = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const startMonth = `${year}-${month.toString().padStart(2, '0')}`;
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  const endMonth = `${nextYear}-${nextMonth.toString().padStart(2, '0')}`;
  return [startMonth, endMonth];
};
 
const EffortTracker = () => {
  // effortRows: summary rows (one per Application/Resource/Role) with pre-aggregated totals in DB
  const [effortRows, setEffortRows] = useState([]);
  // months: ordered list of visible YYYY-MM strings (dynamic range the user is inspecting)
  const [months, setMonths] = useState(() => {
    // Try restoring persisted selection from localStorage for UX continuity
    try {
      const saved = JSON.parse(localStorage.getItem(MONTHS_KEY) || '[]');
      if (Array.isArray(saved) && saved.length) {
        let curr = [...saved];
        // If only one month was saved, add the sequential next month so two months exist by default
        if (curr.length === 1) {
          const next = new Date(curr[0] + '-01');
          next.setMonth(next.getMonth() + 1);
          curr.push(next.toISOString().slice(0, 7));
        } else if (curr.length === 0) {
          return getDefaultMonths();
        }
        // ensure order and remove accidental duplicates
        curr = Array.from(new Set(curr)).sort();
        return curr;
      }
    } catch (e) { /* ignore parse errors and fall back */ }
    return getDefaultMonths();
  });
  // roleEfforts: raw weekly (Monday) effort entries keyed by composite string
  const [roleEfforts, setRoleEfforts] = useState({});
  // mondays: concrete Date objects for each week column based on current month range
  const [mondays, setMondays] = useState([]);
  // editingKey: identifies which composite row is in edit mode (enables inputs)
  const [editingKey, setEditingKey] = useState(null); // composite key when editing
  // editValues: temporary numeric values for Monday columns while editing (YYYY-MM-DD -> value)
  const [editValues, setEditValues] = useState({}); // dateISO -> value
  // editGrade: temp Grade selection during edit
  const [editGrade, setEditGrade] = useState(''); // grade being edited
  // savingRow: spinner/disable state while persisting edits
  const [savingRow, setSavingRow] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);
  const [search, setSearch] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  // Derived month boundaries (first and last visible month)
  const startMonth = months[0];
  const endMonth = months[months.length - 1];

  // --- ADD: role & permission flags (fixes canUpload / canAdd undefined errors) ---
  const getRoleFromStorage = () => {
    try {
      const authRaw = localStorage.getItem("auth");
      const authData = authRaw ? JSON.parse(authRaw) : {};
      const roleVal =
        (authData && (authData.role_name || authData.role)) ||
        (authData?.user && (authData.user.role_name || authData.user.role)) ||
        "";
      return String(roleVal || "").toLowerCase().trim();
    } catch (e) {
      return "";
    }
  };
  const role = getRoleFromStorage();
  const isAdmin = role === "admin";
  const isManager = role === "manager";

  // permission flags used by UI/handlers
  const canUpload = isAdmin || isManager;
  const canAdd = isAdmin || isManager;
  const canEdit = isAdmin || isManager;
  const canAddMonth = isAdmin || isManager;
  const canRemoveMonth = isAdmin; // only admin
  const canBulk = isAdmin || isManager;
  const canDelete = isAdmin; // only admin

  const notAllowedAlert = () => alert("You are not authorized to perform this action.");
  // --- END ADD ---
 
  // Bulk update modal states
const [bulkModal, setBulkModal] = useState(null);   // { key, x, y }
const [bulkStart, setBulkStart] = useState("");
const [bulkEnd, setBulkEnd] = useState("");
const [bulkValue, setBulkValue] = useState("");
const [bulkSaving, setBulkSaving] = useState(false);
 
  // Initial load of effort summary rows.
  useEffect(() => {
    api.get("/efforttracker").then((res) => setEffortRows(res.data));
  }, []);
 
  // Persist month selection so user returns to same view.
  useEffect(() => { localStorage.setItem(MONTHS_KEY, JSON.stringify(months)); }, [months]);
 
  // Whenever master rows OR selected month window changes, fetch weekly effort rows
  // for each master combination (ApplicationID/ResourceID/RoleName) in view.
  useEffect(() => {
    // Recompute visible Monday dates for header columns.
    setMondays(getMondays(startMonth, endMonth));
 
    // For each master row fetch all weekly RoleEffort rows (no start/end filter)
    // so we can detect effort dates beyond the current visible month range and auto-extend.
    const masters = effortRows.filter(r => r.ApplicationID && r.ResourceID && r.RoleName);
    masters.forEach(row => {
      const key = `${row.ApplicationID}_${row.ResourceID}_${row.RoleName}`;
      api.get(`/role_effort?application_id=${row.ApplicationID}&resource_id=${row.ResourceID}&role_name=${row.RoleName}`)
        .then(res => {
          const data = Array.isArray(res.data) ? res.data : [];
          setRoleEfforts(prev => ({ ...prev, [key]: data }));
 
          // find max month from returned dates
          if (data.length) {
            let maxDate = null;
            data.forEach(e => {
              const d = new Date(e.EffortDate);
              if (!isNaN(d) && (!maxDate || d > maxDate)) maxDate = d;
            });
            if (maxDate) {
              const targetMonth = maxDate.toISOString().slice(0,7);
              setMonths(prev => {
                let curr = Array.isArray(prev) ? [...prev] : [];
                // extend until last month covers targetMonth
                while (curr.length === 0 || curr[curr.length - 1] < targetMonth) {
                  if (curr.length === 0) {
                    curr = [targetMonth];
                    break;
                  }
                  const last = new Date(curr[curr.length - 1] + '-01');
                  last.setMonth(last.getMonth() + 1);
                  curr = [...curr, last.toISOString().slice(0,7)];
                }
                return curr;
              });
            }
          }
        })
        .catch(() => {
        });
    });
  }, [effortRows, startMonth, endMonth]);
 
  // Auto-extend months if backend returns effort rows that lie beyond current end month.
  useEffect(() => {
    let maxDate = null;
    Object.values(roleEfforts).forEach(arr => {
      (arr || []).forEach(e => {
        const d = new Date(e.EffortDate);
        if(!maxDate || d > maxDate) maxDate = d;
      });
    });
    if(maxDate){
      const targetMonth = maxDate.toISOString().slice(0,7);
      if(months[months.length-1] < targetMonth){
        setMonths(prev => {
          let curr = [...prev];
            while(curr[curr.length-1] < targetMonth){
              const last = new Date(curr[curr.length-1] + '-01');
              last.setMonth(last.getMonth()+1);
              curr = [...curr, last.toISOString().slice(0,7)];
            }
          return curr;
        });
      }
    }
  }, [roleEfforts]);
 
  // Update a specific month selection (either start index 0 or last index length-1 normally).
  const handleMonthChange = (index, value) => {
    const newMonths = [...months];
    newMonths[index] = value;
    setMonths(newMonths);
  };
 
  // Add next sequential calendar month to the visible range (cannot insert gaps).
  const addMonth = () => {
    if (!canAddMonth) { notAllowedAlert(); return; }
    // Confirmation prevents accidental expansion leading to wide tables.
    if(!window.confirm('Add next month column?')) return;
    const newEndMonth = new Date(months[months.length - 1] + '-01');
    newEndMonth.setMonth(newEndMonth.getMonth() + 1);
    const newMonthStr = newEndMonth.toISOString().slice(0,7);
    setMonths([...months, newMonthStr]);
  };
 
  // Remove ONLY the last month; triggers backend deletion of all weekly entries in that month
  // and then refreshes master + clears relevant caches.
  const removeMonth = async () => {
    if (!canRemoveMonth) { notAllowedAlert(); return; }
    if (months.length <= 2) return;
    const last = months[months.length - 1];
    if(!window.confirm(`Remove last month ${last}? This will delete its effort data permanently.`)) return;
    try {
      await api.delete(`/role_effort/month/${last}`);
    } catch(e){
      console.error(e);
      alert('Failed to delete month data');
      return;
    }
    const updated = months.slice(0, months.length - 1);
    setMonths(updated);
    // refresh master + efforts after deletion
    try {
      const masterRes = await api.get('/efforttracker');
      setEffortRows(masterRes.data);
      setRoleEfforts({});
    } catch(e){ console.error(e); }
  };
 
  // // Export current view to real .xlsx using ExcelJS
  // const exportToExcel = async () => {
  //   try {
  //     const workbook = new ExcelJS.Workbook();
  //     const sheet = workbook.addWorksheet('Effort Tracker');
  //     const headers = ['S.No', 'Application ID', 'Application Name', 'Resource ID', 'Resource Name', 'Role Name', ...mondays.map(m => m.toISOString().slice(0,10)), 'Total Effort', 'Rate', 'Total Cost'];
  //     sheet.addRow(headers);
  //     const headerRow = sheet.getRow(1);
  //     headerRow.eachCell(cell => {
  //       cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  //       cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
  //       cell.alignment = { vertical: 'middle', horizontal: 'center' };
  //       cell.border = { top: {style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
  //     });
 
  //     // Use filteredRows (current view) when exporting
  //     filteredRows.forEach((row, idx) => {
  //       const key = `${row.ApplicationID}_${row.ResourceID}_${row.RoleName}`;
  //       const effArr = roleEfforts[key] || [];
  //       const rowVals = [idx + 1, row.ApplicationID || '', row.ApplicationName || '', row.ResourceID || '', row.ResourceName || '', row.RoleName || ''];
  //       mondays.forEach(m => {
  //         const dateIso = m.toISOString().slice(0,10);
  //         const eff = effArr.find(e => new Date(e.EffortDate).toISOString().slice(0,10) === dateIso);
  //         rowVals.push(eff ? eff.MondayValue : 0);
  //       });
  //       rowVals.push(computeTotal(row));
  //       rowVals.push(row.Rate || '');
  //       rowVals.push(computeCost(row));
  //       const newRow = sheet.addRow(rowVals);
  //       newRow.eachCell(cell => {
  //         cell.border = { top: {style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
  //         cell.alignment = { vertical: 'middle', horizontal: 'left' };
  //       });
  //     });
 
  //     sheet.columns.forEach((c, i) => { c.width = i < 6 ? 18 : 14; });
 
  //     const buf = await workbook.xlsx.writeBuffer();
  //     const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  //     const url = URL.createObjectURL(blob);
  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = `effort_tracker_${months[0]}_to_${months[months.length-1]}.xlsx`;
  //     document.body.appendChild(a);
  //     a.click();
  //     document.body.removeChild(a);
  //     URL.revokeObjectURL(url);
  //   } catch (err) {
  //     console.error('Export failed', err);
  //     alert('Export failed');
  //   }
  // };


  const exportToExcel = async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Effort Tracker');

    const headers = [
      'S.No',
      'Application ID',
      'Application Name',
      'Resource ID',
      'Resource Name',
      'Role Name',
      ...mondays.map(m => m.toISOString().slice(0, 10)),
      'Total Effort',
      'Rate',
      'Total Cost'
    ];

    sheet.addRow(headers);

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const fillColor = colNumber <= 5
        ? 'FFFFA500' // Orange
        : 'FF2563EB'; // Blue

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor }
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Use filteredRows (current view) when exporting
    filteredRows.forEach((row, idx) => {
      const key = `${row.ApplicationID}_${row.ResourceID}_${row.RoleName}`;
      const effArr = roleEfforts[key] || [];

      const rowVals = [
        idx + 1,
        row.ApplicationID || '',
        row.ApplicationName || '',
        row.ResourceID || '',
        row.ResourceName || '',
        row.RoleName || ''
      ];

      mondays.forEach(m => {
        const dateIso = m.toISOString().slice(0, 10);
        const eff = effArr.find(e => new Date(e.EffortDate).toISOString().slice(0, 10) === dateIso);
        rowVals.push(eff ? eff.MondayValue : 0);
      });

      rowVals.push(computeTotal(row));
      rowVals.push(row.Rate || '');
      rowVals.push(computeCost(row));

      const newRow = sheet.addRow(rowVals);
      newRow.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'left'
        };
      });
    });

    sheet.columns.forEach((c, i) => {
      c.width = i < 6 ? 18 : 14;
    });

    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `effort_tracker_${months[0]}_to_${months[months.length - 1]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export failed', err);
    alert('Export failed');
  }
  };

    function triggerUploadDialog(){
    if (!canUpload) { notAllowedAlert(); return; }
    if(fileInputRef.current){
      fileInputRef.current.value = null;
      fileInputRef.current.click();
    }
  }
 
  async function handleCsvChange(e){
    // upload input change still fires only when file selected via input; guard here as well
    if (!canUpload) { notAllowedAlert(); return; }
    const f = e.target.files[0];
    if(!f) return;
    const fd = new FormData();
    fd.append("csv_file", f);
    setUploading(true);
    try {
      const res = await api.post("/effort/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const data = res.data;
      setUploadResult(data);
      // Auto-extend visible month range to cover uploaded effort date columns
      if(Array.isArray(data.effort_columns)){
        const dateCols = data.effort_columns.filter(c=>/^\d{4}-\d{2}-\d{2}$/.test(c));
        if(dateCols.length){
          const monthsFromDates = dateCols.map(c=>c.slice(0,7));
            const minMonth = monthsFromDates.reduce((a,b)=> a<b? a:b);
            const maxMonth = monthsFromDates.reduce((a,b)=> a>b? a:b);
            setMonths(prev => {
              let curr = [...prev];
              // ensure start coverage
              while(curr[0] > minMonth){
                const first = new Date(curr[0] + '-01');
                first.setMonth(first.getMonth()-1);
                curr = [first.toISOString().slice(0,7), ...curr];
              }
              // ensure end coverage
              while(curr[curr.length-1] < maxMonth){
                const last = new Date(curr[curr.length-1] + '-01');
                last.setMonth(last.getMonth()+1);
                curr = [...curr, last.toISOString().slice(0,7)];
              }
              return curr;
            });
        }
      }
      // refresh effort + clear cached efforts so weekly fetch re-runs
      const effortRes = await api.get("/efforttracker");
      setEffortRows(effortRes.data);
      setRoleEfforts({});
    } catch(err){
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }
async function applyEditExisting(row) {
  if (!canEdit) { notAllowedAlert(); return; }
  try {
    const items = mondays.map(m => {
  // Convert Monday date → strict YYYY-MM-DD format
  const isoDate = m.toISOString().substring(0, 10);
 
  return {
    EffortDate: isoDate,
    MondayValue: Number(editValues[isoDate] || 0)  // ensure number
  };
});
 
 
  const payload = {
  master_id: Number(row.id),
  ApplicationID: row.ApplicationID,
  ResourceID: Number(row.ResourceID),     // MUST be number
  RoleName: row.RoleName,
  items: items.map(it => ({
    EffortDate: it.EffortDate,            // MUST be "YYYY-MM-DD"
    MondayValue: Number(it.MondayValue)   // MUST be number
  })),
  Grade: editGrade || null
};

    await api.put("/role_effort/update_existing", payload,{ headers: { "Content-Type": "application/json" } });

    // reload only this row
    const key = `${row.ApplicationID}_${row.ResourceID}_${row.RoleName}`;
    const eff = await api.get(
      `/role_effort?application_id=${row.ApplicationID}&resource_id=${row.ResourceID}&role_name=${row.RoleName}`
    );
    setRoleEfforts(prev => ({ ...prev, [key]: eff.data }));

    const masters = await api.get("/efforttracker");
    setEffortRows(masters.data);
 
    cancelEdit();
  } catch (err) {
  console.log("422 ERROR BODY:", err.response?.data);
    alert("Edit failed");
  }
}
 
 
  // Begin editing: snapshot current Monday values into editValues map and grade state.
  function startEdit(row){
    if (!canEdit) { notAllowedAlert(); return; }
    const key = `${row.ApplicationID}_${row.ResourceID}_${row.RoleName}`;
    setEditingKey(key);
    const arr = roleEfforts[key] || [];
    const map = {};
    arr.forEach(e=>{ map[new Date(e.EffortDate).toISOString().slice(0,10)] = e.MondayValue; });
    // ensure all monday columns present
    mondays.forEach(m=>{ const d=m.toISOString().slice(0,10); if(map[d]===undefined) map[d]=0; });
    setEditValues(map);
    setEditGrade(row.Grade || '');
  }
  // Cancel editing: revert temp state.
  function cancelEdit(){ setEditingKey(null); setEditValues({}); setEditGrade(''); }
  // Track inline numeric changes while user types.
  function changeEffort(dateIso, val){
    setEditValues(ev=>({...ev, [dateIso]: val}));
  }
  // Persist all Monday values (bulk upsert) + optional Grade change, then refresh.
  async function saveEdit(row){
    // ---------------- BULK UPDATE SECTION ----------------
 
// generate Mondays between two months
function getMondaysBetween(startMonth, endMonth) {
  const results = [];
 
  const start = new Date(startMonth + "-01");
  const end = new Date(endMonth + "-01");
  end.setMonth(end.getMonth() + 1); // include whole end month
 
  let d = new Date(start);
 
  // move to first Monday
  while (d.getDay() !== 1) {
    d.setDate(d.getDate() + 1);
  }
 
  // collect Mondays
  while (d < end) {
    results.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
 
  return results;
}
 
// MAIN BULK APPLY FUNCTION
async function applyBulkUpdate(row, bulkStartMonth, bulkEndMonth, bulkValue) {
  if (!canBulk) { notAllowedAlert(); return; }
  try {
    const mondaysToUpdate = getMondaysBetween(bulkStartMonth, bulkEndMonth);

    const items = mondaysToUpdate.map(m => ({
      EffortDate: m.toISOString().slice(10),
      MondayValue: parseFloat(bulkValue) || 0
    }));

    await api.post("/api/role_effort/bulk_upsert", {
      master_id: row.id,
      ApplicationID: row.ApplicationID,
      ResourceID: row.ResourceID,
      RoleName: row.RoleName,
      items,
      Grade: null
    });
 
    // Refresh UI
    const effortRes = await api.get('/efforttracker');
    setEffortRows(effortRes.data);
 
    const key = `${row.ApplicationID}_${row.ResourceID}_${row.RoleName}`;
    const effRes = await api.get(`/role_effort?application_id=${row.ApplicationID}&resource_id=${row.ResourceID}&role_name=${row.RoleName}`);
    setRoleEfforts(prev => ({ ...prev, [key]: effRes.data }));
 
    alert("Bulk update successful");
  } catch (err) {
    console.error(err);
    alert("Bulk update failed");
  }
}
}

function displayEffortCell(row, m) {
  const key = `${row.ApplicationID}_${row.ResourceID}_${row.RoleName}`;
  // Use YYYY-MM-DD to match EffortDate keys stored elsewhere
  const dateIso = m.toISOString().slice(0, 10);
  if (editingKey === key) {
    // keep the raw edit value (string) so user can type; fallback to 0 for display class
    const raw = editValues[dateIso];
    const val = parseFloat(raw || 0);
    return (
      <input
        type="number"
        step="0.01"
        value={raw !== undefined ? raw : (val || 0)}
        onChange={e => changeEffort(dateIso, e.target.value)}
        className={`effort-input ${val > 1 ? 'over-threshold' : ''}`}
      />
    );
  }
  const effort = (roleEfforts[key] || []).find(
    e => new Date(e.EffortDate).toISOString().slice(0, 10) === dateIso
  );
  const value = effort ? effort.MondayValue : 0;
  return (
    <input
      type="text"
      value={value.toFixed(2)}
      disabled
      className={`effort-readonly ${value > 1 ? 'over-threshold' : ''}`}
    />
  );
}

  
  function computeTotal(row){
    const key = `${row.ApplicationID}_${row.ResourceID}_${row.RoleName}`;
    if(editingKey === key){
      const sum = mondays.reduce((acc,m)=> acc + (parseFloat(editValues[m.toISOString().slice(0,10)]||0)||0), 0);
      return (sum * 5).toFixed(2);
    }
    const efforts = roleEfforts[key] || [];
    if(!efforts.length && row.TotalEffort !== undefined && row.TotalEffort !== null){
      return (parseFloat(row.TotalEffort) || 0).toFixed(2);
    }
    const sum = efforts.reduce((acc, e) => acc + (e.MondayValue || 0), 0);
    return (sum * 5).toFixed(2);
  }
  function computeCost(row){
    const key = `${row.ApplicationID}_${row.ResourceID}_${row.RoleName}`;
    const efforts = roleEfforts[key] || [];
    const rate = parseFloat(row.Rate) || 0;
    if(!efforts.length && row.TotalCost !== undefined && row.TotalCost !== null){
      return (parseFloat(row.TotalCost) || 0).toFixed(2);
    }
    const totalEffort = parseFloat(computeTotal(row)) || 0;
    return (totalEffort * rate).toFixed(2);
  }
 
  // Delete a master row and ALL its associated weekly effort entries (cascade style behavior via API logic).
  async function deleteRow(row){
    if (!canDelete) { notAllowedAlert(); return; }
    if(!window.confirm('Delete this row and its effort entries?')) return;
    try {
      // Use correct API endpoint and model PK (EffortTracker.Id)
      await api.delete(`/efforttracker/${row.Id ?? row.id}`);
      // Refresh master rows and clear cached efforts for this row
      const effortRes = await api.get('/efforttracker');
      setEffortRows(effortRes.data);
      const key = `${row.ApplicationID}_${row.ResourceID}_${row.RoleName}`;
      setRoleEfforts(prev => {
        const cp = { ...prev };
        delete cp[key];
        return cp;
      });
    } catch(e){
      console.error(e);
      alert('Delete failed');
    }
  }
  //open modal
  function openBulkModal(e, row) {
  e.stopPropagation();
  const rect = e.currentTarget.getBoundingClientRect();
  const key = `${row.ApplicationID}_${row.ResourceID}_${row.RoleName}`;
  
  setBulkModal({
    key,
    x: rect.right + 8,
    y: rect.top,
    row
  });
 
  setBulkStart(startMonth);
  setBulkEnd(endMonth);
  setBulkValue("");
}
  //close modal
  function closeBulkModal() {
  setBulkModal(null);
  setBulkStart("");
  setBulkEnd("");
  setBulkValue("");
  setBulkSaving(false);
}
 
  //bulk update values
  async function handleBulkApply() {
    if (!canBulk) { notAllowedAlert(); return; }
    if (!bulkStart || !bulkEnd || bulkValue === "") {
      alert("Select start month, end month and value.");
      return;
    }
 
    if (isNaN(parseFloat(bulkValue))) {
      alert("Value must be numeric.");
      return;
    }
 
    setBulkSaving(true);
 
    try {
      // Generate all Mondays between start and end month
      const mondaysToUpdate = getMondays(bulkStart, bulkEnd);
      const items = mondaysToUpdate.map(m => ({
        EffortDate: m.toISOString().slice(0, 10),
        MondayValue: parseFloat(bulkValue) || 0
      }));
      const row = bulkModal.row;
      // Use correct API and payload as per backend
      await api.post("/role_effort/bulk_upsert", {
        master_id: row.Id ?? row.id,
        ApplicationID: row.ApplicationID,
        ResourceID: row.ResourceID,
        RoleName: row.RoleName,
        items,
        Grade: row.Grade || null
      });
      // Refresh master rows and efforts
      const effortRes = await api.get("/efforttracker");
      setEffortRows(effortRes.data);

      const key = `${row.ApplicationID}_${row.ResourceID}_${row.RoleName}`;
      const effRes = await api.get(`/role_effort?application_id=${row.ApplicationID}&resource_id=${row.ResourceID}&role_name=${row.RoleName}`);
      setRoleEfforts(prev => ({ ...prev, [key]: effRes.data }));

      closeBulkModal();
 
    } catch (err) {
      console.error(err);
      alert("Bulk update failed");
      setBulkSaving(false);
    }
  }
 
  
  const [addRow, setAddRow] = useState({
    ApplicationID: "",
    ApplicationName: "",
    ResourceID: "",
    ResourceName: "",
    RoleName: "",
    Rate: "",
    Grade: "",
    effortValues: {},
  });
  const [addRowLoading, setAddRowLoading] = useState(false);
  const [addRowError, setAddRowError] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);
  // Toggles for inline creation of Application or Resource to streamline data entry.
  const [showNewApp, setShowNewApp] = useState(false);
  const [newApp, setNewApp] = useState({ id: '', name: '' });
  const [applications, setApplications] = useState([]);
  const [resourcesList, setResourcesList] = useState([]);
  const [existingAppConflict, setExistingAppConflict] = useState(null);
  const [showNewRes, setShowNewRes] = useState(false);
  const [newRes, setNewRes] = useState({ id: '', name: '', role: '' });
 
  // Load applications and resources for dropdowns
  useEffect(() => {
    api.get('/applications').then(r => setApplications(r.data || [])).catch(() => {});
    api.get('/resources').then(r => setResourcesList(r.data || [])).catch(() => {});
  }, []);
 
  // ensure handler exists and is stable
  const handleNewAppFieldChange = (field, value) => {
    setNewApp(prev => ({ ...prev, [field]: value }));
    const idVal = (field === 'id' ? value : newApp.id || '').trim().toLowerCase();
    const nameVal = (field === 'name' ? value : newApp.name || '').trim().toLowerCase();
    const byId = applications.find(a => a.ApplicationID && a.ApplicationID.toLowerCase() === idVal);
    const byName = applications.find(a => a.ApplicationName && a.ApplicationName.toLowerCase() === nameVal);
    if (byId && idVal) setExistingAppConflict({ type: 'id', record: byId });
    else if (byName && nameVal) setExistingAppConflict({ type: 'name', record: byName });
    else setExistingAppConflict(null);
  };
 
  // Auto-populate ApplicationName if ApplicationID already exists server-side.
  useEffect(() => {
    if (!addRow.ApplicationID) return;
    api.get(`/application/${addRow.ApplicationID}/name`)
      .then(res => setAddRow(prev => ({ ...prev, ApplicationName: res.data.ApplicationName || '' })))
      .catch(()=> setAddRow(prev => ({ ...prev, ApplicationName: '' })));
  }, [addRow.ApplicationID]);
 
  // In Add Row: handle ResourceID change to auto-populate ResourceName, RoleName, and Rate
  const handleAddRowChange = async (field, value) => {
    if (field === "ResourceID") {
      setAddRow((prev) => ({ ...prev, ResourceID: value }));
      if (value) {
        try {
          const res = await api.get(`/resource/${value}/details`);
          setAddRow((prev) => ({
            ...prev,
            ResourceName: res.data.ResourceName || "",
            RoleName: res.data.RoleName || "",
            Rate: res.data.Rate !== null && res.data.Rate !== undefined ? res.data.Rate : ""
          }));
        } catch {
          setAddRow((prev) => ({ ...prev, ResourceName: "", RoleName: "", Rate: "" }));
        }
      }
      return;
    }
    if (field === "RoleName") {
      setAddRow((prev) => ({ ...prev, RoleName: value }));
      if (value) {
        try {
          const res = await api.get(`/api/role/${value}/rate`);
          setAddRow((prev) => ({
            ...prev,
            Rate: res.data.Rate !== null && res.data.Rate !== undefined ? res.data.Rate : ""
          }));
        } catch {
          setAddRow((prev) => ({ ...prev, Rate: "" }));
        }
      }
      return;
    }
    if (field === "ApplicationID") {
      setAddRow((prev) => ({ ...prev, ApplicationID: value }));
      const app = applications.find(a => a.ApplicationID === value);
      setAddRow((prev) => ({
        ...prev,
        ApplicationName: app ? app.ApplicationName : ""
      }));
      return;
    }
    setAddRow((prev) => ({ ...prev, [field]: value }));
  };
 
  // Derived totals for new row (sum of Monday values * 5). Rate pulled from role/resource.
  const addRowTotalEffort = Object.values(addRow.effortValues).reduce(
    (acc, v) => acc + (parseFloat(v) || 0),
    0
  ) * 5;
  const addRowTotalCost = (addRowTotalEffort * (parseFloat(addRow.Rate) || 0)).toFixed(2);
 
  // // Generic form field change handler.
  // function handleAddRowChange(field, value) {
  //   setAddRow((prev) => ({ ...prev, [field]: value }));
  // }
  // Monday value change for new row creation.
  function handleAddRowEffortChange(dateIso, value) {
    setAddRow((prev) => ({
      ...prev,
      effortValues: { ...prev.effortValues, [dateIso]: value },
    }));
  }
 
  // Submit new master row WITH weekly effort items via combined backend endpoint.
  async function handleAddRowSubmit(e) {
    e.preventDefault();
    if (!canAdd) { notAllowedAlert(); return; }
    setAddRowLoading(true);
    setAddRowError("");
    try {
      const items = mondays.map(m => ({
        EffortDate: m.toISOString().slice(0, 10),
        MondayValue: parseFloat(addRow.effortValues[m.toISOString().slice(0, 10)] || 0) || 0
      }));
      await api.post('/efforttracker_with_efforts', {
        ApplicationID: addRow.ApplicationID.trim(), 
        ApplicationName: addRow.ApplicationName,
        ResourceID: addRow.ResourceID,
        ResourceName: addRow.ResourceName,
        RoleName: addRow.RoleName,
        Rate: parseFloat(addRow.Rate) || null,
        Grade: addRow.Grade || null,
        items
      });
      const effortRowsRes = await api.get('/efforttracker');
      setEffortRows(effortRowsRes.data);
      setRoleEfforts({});
      setAddRow({
        ApplicationID: "",
        ApplicationName: "",
        ResourceID: "",
        ResourceName: "",
        RoleName: "",
        Rate: "",
        Grade: "",
        effortValues: {},
      });
      setShowAddRow(false);
    } catch (err) {
      console.error(err);
      setAddRowError('Failed to add row. Please check your input.');
    } finally {
      setAddRowLoading(false);
    }
  }
  // Reset add form.
  function handleAddRowCancel() {
    setShowAddRow(false);
    setAddRow({
      ApplicationID: "",
      ApplicationName: "",
      ResourceID: "",
      ResourceName: "",
      RoleName: "",
      Rate: "",
      Grade: "",
      effortValues: {},
    });
    setAddRowError("");
  }
 
  // Inline create new application (persists then auto-selects into addRow form).
  async function handleAddApplication(e) {
    e.preventDefault();
    if (!newApp.id || !newApp.name) return;
    if (existingAppConflict) {
      alert(existingAppConflict.type === 'id' ? `ApplicationID already exists: ${existingAppConflict.record.ApplicationID}` : `ApplicationName already exists: ${existingAppConflict.record.ApplicationName}`);
      return;
    }
    try {
      await api.post('/application', { ApplicationID: newApp.id, ApplicationName: newApp.name });
      setAddRow(prev => ({ ...prev, ApplicationID: newApp.id, ApplicationName: newApp.name }));
      setShowNewApp(false);
      setNewApp({ id: '', name: '' });
      try{ const res = await api.get('/applications'); setApplications(res.data || []); } catch(_){}
    } catch {
      alert('Failed to add application');
    }
  }
  // Inline create new resource (persists then attaches to form).
  async function handleAddResource(e) {
    e.preventDefault();
    if (!newRes.id || !newRes.name) return;
    try {
      await api.post('/resource', { ResourceID: newRes.id, ResourceName: newRes.name, RoleName: newRes.role });
      // Refresh resources to ensure future lookups include the new one
      try { await api.get('/resources'); } catch(_) {}
      setAddRow(prev => ({ ...prev, ResourceID: newRes.id, ResourceName: newRes.name, RoleName: newRes.role }));
      setShowNewRes(false);
      setNewRes({ id: '', name: '', role: '' });
    } catch {
      alert('Failed to add resource');
    }
  }
 
  // Filtered rows based on search and filterBy
  const filteredRows = effortRows.filter(row => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    switch (filterBy) {
      case "ApplicationID":
        return row.ApplicationID && row.ApplicationID.toString().toLowerCase().includes(s);
      case "ApplicationName":
        return row.ApplicationName && row.ApplicationName.toLowerCase().includes(s);
      case "ResourceID":
        return row.ResourceID && row.ResourceID.toString().toLowerCase().includes(s);
      case "ResourceName":
        return row.ResourceName && row.ResourceName.toLowerCase().includes(s);
      case "RoleName":
        return row.RoleName && row.RoleName.toLowerCase().includes(s);
      default:
        return (
          (row.ApplicationID && row.ApplicationID.toString().toLowerCase().includes(s)) ||
          (row.ApplicationName && row.ApplicationName.toLowerCase().includes(s)) ||
          (row.ResourceID && row.ResourceID.toString().toLowerCase().includes(s)) ||
          (row.ResourceName && row.ResourceName.toLowerCase().includes(s)) ||
          (row.RoleName && row.RoleName.toLowerCase().includes(s))
        );
    }
  });
  // Pagination logic
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const paginatedRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
 
  return (
    <div>
      <div className="et-header-bar">
        <div className="et-header-actions">
          <button
            className="et-btn"
            onClick={triggerUploadDialog}
            // visual disabled when not allowed
            style={{ cursor: canUpload ? "pointer" : "not-allowed", opacity: canUpload ? 1 : 0.6 }}
          >
            {uploading ? 'Uploading...' : 'Upload CSV'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display:'none' }}
            onChange={handleCsvChange}
          />
          <button
            className={`et-btn ${showAddRow ? 'close' : 'add'}`}
            onClick={() => {
              if (!canAdd) { notAllowedAlert(); return; }
              setShowAddRow(v => !v);
            }}
            style={{ cursor: canAdd ? "pointer" : "not-allowed", opacity: canAdd ? 1 : 0.6 }}
          >
            {showAddRow ? 'Close' : 'Add'}
          </button>
          {/* <button
          // Disable New APP Btn 
            disabled
            className="et-btn newapp"
            onClick={() => { setShowNewApp(v => !v); setShowNewRes(false); }}
          >
            New Application
          </button>
          <button
            className="et-btn newres"
            onClick={() => { setShowNewRes(v => !v); setShowNewApp(false); }}
          >
            New Resource
          </button> */}
        </div>
        <h1 style={{paddingRight:'50px'}}>Effort Tracker</h1>
      </div>
      <div style={{
  marginTop: '8px',
  marginLeft: '20px',
  fontSize: '14px',
  color: '#B00000',
  fontWeight: 'bold'
}}>
  🔴 Values highlighted in red are greater than 1 (Threshold Exceeded)
</div>
      {showNewApp && (
        <div className="et-form-inline">
          <form onSubmit={handleAddApplication} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 'bold' }}>Add Application:</span>
            <input type="text" placeholder="App ID" value={newApp.id} onChange={e => handleNewAppFieldChange('id', e.target.value)} required style={{ width: 80 }} />
            <input type="text" placeholder="App Name" value={newApp.name} onChange={e => handleNewAppFieldChange('name', e.target.value)} required style={{ width: 120 }} />
            <button type="submit" className="et-btn save" disabled={!!existingAppConflict}>Save</button>
            <button type="button" className="et-btn cancel" onClick={() => { setShowNewApp(false); setNewApp({ id:'', name:'' }); setExistingAppConflict(null); }}>Cancel</button>
            {existingAppConflict && (
              <span style={{ color: '#b91c1c', marginLeft: 8 }}>Existing: {existingAppConflict.record.ApplicationID} — {existingAppConflict.record.ApplicationName}</span>
            )}
          </form>
        </div>
      )}
      {showNewRes && (
        <div className="et-form-inline">
          <form onSubmit={handleAddResource} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 'bold' }}>Add Resource:</span>
            <input required type="text" placeholder="Resource ID" value={newRes.id} onChange={e => setNewRes(r => ({ ...r, id: e.target.value }))}  style={{ width: 80 }} />
            <input required type="text" placeholder="Resource Name" value={newRes.name} onChange={e => setNewRes(r => ({ ...r, name: e.target.value }))}  style={{ width: 120 }} />
            <input required type="text" placeholder="Role" value={newRes.role} onChange={e => setNewRes(r => ({ ...r, role: e.target.value }))} style={{ width: 80 }} />
            <button type="submit" className="et-btn save">Save</button>
            <button type="button" className="et-btn cancel" onClick={() => setShowNewRes(false)}>Cancel</button>
          </form>
        </div>
      )}
      {/* Pagination and search/filter controls in one flex row */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18}}>
        <div className="et-pagination-bar">
          <button className="et-pagination-btn" onClick={()=>setCurrentPage(1)} disabled={currentPage===1}>First</button>
          <button className="et-pagination-btn" onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1}>Prev</button>
          {Array.from({length: totalPages}, (_,i) => i+1).filter(p => p===1 || p===totalPages || Math.abs(p-currentPage)<=2).map(p => (
            <button
              key={p}
              className={`et-pagination-btn${p===currentPage?' active':''}`}
              onClick={()=>setCurrentPage(p)}
              disabled={p===currentPage}
            >{p}</button>
          ))}
          <button className="et-pagination-btn" onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages || totalPages===0}>Next</button>
          <button className="et-pagination-btn" onClick={()=>setCurrentPage(totalPages)} disabled={currentPage===totalPages || totalPages===0}>Last</button>
          <span className="et-pagination-info">Page {currentPage} of {totalPages}</span>
        </div>
        <div className="et-search-bar">
          <label>Filter By:&nbsp;
            <select value={filterBy} onChange={e => setFilterBy(e.target.value)}>
              <option value="all">All</option>
              <option value="ApplicationID">Application ID</option>
              <option value="ApplicationName">Application Name</option>
              <option value="ResourceID">Resource ID</option>
              <option value="ResourceName">Resource Name</option>
              <option value="RoleName">Role Name</option>
            </select>
          </label>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      {uploadResult && (
        <div className="et-upload-result">
          <strong>Upload Result:</strong>&nbsp;
          Inserted: {uploadResult.inserted} | Skipped: {uploadResult.skipped} | Duplicates: {uploadResult.duplicates} | Weekly Rows: {uploadResult.role_effort_created}<br/>
          Columns detected: {uploadResult.effort_columns.join(', ')}
        </div>
      )}
      <div className="et-table-container">
        <div className="et-table-controls">
          <label>Start Month: <input type="month" value={startMonth} onChange={e => handleMonthChange(0, e.target.value)} /></label>
          <label>End Month: <input type="month" value={endMonth} onChange={e => handleMonthChange(months.length - 1, e.target.value)} /></label>
          <button
            onClick={() => { if (!canAddMonth) { notAllowedAlert(); return; } addMonth(); }}
            className="et-btn"
            style={{ cursor: canAddMonth ? "pointer" : "not-allowed", opacity: canAddMonth ? 1 : 0.6 }}
          >
            Add Month
          </button>
          <button
            onClick={() => { if (!canRemoveMonth) { notAllowedAlert(); return; } removeMonth(); }}
            className="et-btn remove"
            style={{ cursor: canRemoveMonth ? "pointer" : "not-allowed", opacity: canRemoveMonth ? 1 : 0.6 }}
          >
            Remove Month
          </button>
          <button
            onClick={exportToExcel}
            className="et-btn"
            style={{ marginLeft: 8 }}
          >
            Download as Excel
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="effort-table">
            <thead>
              <tr>
                <th className="orange">S.No</th>
                <th className="orange">Application ID</th>
                <th className="orange">Application Name</th>
                <th className="orange">Resource ID</th>
                <th className="orange">Resource Name</th>
                <th className="orange">Role Name</th>
                {mondays.map(m => <th key={m.toISOString()} className="blue date-col">{m.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</th>)}
                <th className="blue">Total Effort</th>
                <th className="blue">Rate</th>
                <th className="blue">Total Cost</th>
                <th className="blue">Actions</th>
              </tr>
            </thead>
            <tbody>
              {showAddRow && (
                <tr className="et-table-row-add">
                  <td></td>
                  <td>
                    <select
                      value={addRow.ApplicationID}
                      onChange={e => handleAddRowChange("ApplicationID", e.target.value)}
                      style={{ width: 120 }}
                      required
                    >
                      <option value="">Select Application</option>
                      {applications.map(app => (
                        <option key={app.ApplicationID} value={app.ApplicationID}>
                          {app.ApplicationID} - {app.ApplicationName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Application Name"
                      value={addRow.ApplicationName}
                      onChange={e => handleAddRowChange("ApplicationName", e.target.value)}
                      style={{ width: 120 }}
                      required
                      disabled
                    />
                  </td>
                  <td>
                    <select
                      value={addRow.ResourceID}
                      onChange={e => handleAddRowChange("ResourceID", e.target.value)}
                      style={{ width: 100 }}
                      required
                    >
                      <option value="">Select Resource</option>
                      {resourcesList.map(res => (
                        <option key={res.ResourceID} value={res.ResourceID}>
                          {res.ResourceID} - {res.ResourceName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Resource Name"
                      value={addRow.ResourceName}
                      onChange={e => handleAddRowChange("ResourceName", e.target.value)}
                      style={{ width: 120 }}
                      required
                      disabled
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      placeholder="Role"
                      value={addRow.RoleName}
                      onChange={e => handleAddRowChange("RoleName", e.target.value)}
                      style={{ width: 80 }}
                      required
                      disabled
                    />
                  </td>
                  {mondays.map(m => (
                    <td key={m.toISOString()} className="date-col">
                      <input
                        type="number"
                        step="0.01"
                        value={addRow.effortValues[m.toISOString().slice(0, 10)] || ""}
                        onChange={e => handleAddRowEffortChange(m.toISOString().slice(0, 10), e.target.value)}
                        className="effort-input"
                      />
                    </td>
                  ))}
                  <td>
                    <input
                      type="text"
                      value={addRowTotalEffort.toFixed(2)}
                      disabled
                      className="effort-readonly"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={addRow.Rate}
                      disabled
                      className="effort-readonly"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={addRowTotalCost}
                      disabled
                      className="effort-readonly"
                    />
                  </td>
                  <td>
                    <button
                      onClick={handleAddRowSubmit}
                      disabled={addRowLoading}
                      className="et-btn save"  style={{ backgroundColor: 'green' ,margin:'1px'}}
                    >
                      {addRowLoading ? "Adding..." : "Add"}
                    </button>
                    <button
                      type="button "
                      onClick={handleAddRowCancel}
                      className="et-btn cancel" style={{ backgroundColor: 'grey' }}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              )}
              {paginatedRows.length === 0 && !showAddRow ? (
                <tr>
                  <td colSpan={5 + mondays.length + 5} style={{ textAlign: 'center', color: '#dc2626', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    No results found
                  </td>
                </tr>
              ) : paginatedRows.map((row, idx) => {
                const keyBase = `${row.ApplicationID}_${row.ResourceID}_${row.RoleName}`;
                return (
                  <tr key={keyBase + '_' + idx} className={idx % 2 === 0 ? 'et-table-row-even' : 'et-table-row-odd'}>
                    <td>{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                    <td><Link to={`/application/${row.ApplicationID}`} state={{ from: 'efforttracker' }}>{row.ApplicationID}</Link></td>
                    <td><Link to={`/application/${row.ApplicationID}`} state={{ from: 'efforttracker' }}>{row.ApplicationName}</Link></td>
                    <td>{row.ResourceID}</td>
                    <td>{row.ResourceName}</td>
                    <td>{row.RoleName}</td>
                    {mondays.map(m => (
                      <td key={m.toISOString()} className="date-col">{displayEffortCell(row,m)}</td>
                    ))}
                    <td>{computeTotal(row)}</td>
                    <td>{row.Rate}</td>
                    <td>{computeCost(row)}</td>
 
<td className="et-table-actions">
  <div className="et-iconbar">
    {/* Show Bulk + Edit + Delete when NOT editing this row */}
    {editingKey !== keyBase && (
      <>
        {/* Bulk Update icon */}
        <button
          className="et-icon-btn et-icon-bulk"
          title="Bulk Update"
          onClick={(e) => {
            if (!canBulk) { notAllowedAlert(); return; }
            openBulkModal(e, row);
          }}
          style={{ cursor: canBulk ? "pointer" : "not-allowed", opacity: canBulk ? 1 : 0.6 }}
        >
          {/* Grid-like icon */}
          <svg viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1"></rect>
            <rect x="14" y="14" width="7" height="7" rx="1"></rect>
          </svg>
        </button>

        {/* Edit icon */}
        <button
          className="et-icon-btn et-icon-edit"
          title="Edit"
          onClick={() => {
            if (!canEdit) { notAllowedAlert(); return; }
            startEdit(row);
          }}
          style={{ cursor: canEdit ? "pointer" : "not-allowed", opacity: canEdit ? 1 : 0.6 }}
        >
          {/* Pencil icon */}
          <svg viewBox="0 0 24 24">
            <path d="M3 21l3.5-0.5L20.5 6.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L6.5 16.5 6 20.5 3 21z"></path>
            <line x1="6.5" y1="16.5" x2="9.5" y2="19.5"></line>
          </svg>
        </button>

        {/* Delete icon */}
        <button
          className="et-icon-btn et-icon-delete"
          title="Delete"
          onClick={() => {
            if (!canDelete) { notAllowedAlert(); return; }
            deleteRow(row);
          }}
          style={{ cursor: canDelete ? "pointer" : "not-allowed", opacity: canDelete ? 1 : 0.6 }}
        >
          {/* Trash can icon */}
          <svg viewBox="0 0 24 24">
            <path d="M3 6h18"></path>
            <path d="M8 6V4h8v2"></path>
            <rect x="6" y="6" width="12" height="14" rx="2"></rect>
            <line x1="10" y1="10" x2="10" y2="18"></line>
            <line x1="14" y1="10" x2="14" y2="18"></line>
          </svg>
        </button>
      </>
    )}

    {/* Show Save + Cancel when editing this row */}
    {editingKey === keyBase && (
      <>
        {/* Save icon */}
        <button
          className="et-icon-btn et-icon-save"
          title="Save"
          onClick={() => {
            if (!canEdit) { notAllowedAlert(); return; }
            applyEditExisting(row);
          }}
          disabled={savingRow}
          style={{ cursor: canEdit ? "pointer" : "not-allowed", opacity: canEdit ? 1 : 0.6 }}
        >
          {/* Checkmark icon */}
          <svg viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>

        {/* Cancel icon */}
        <button
          className="et-icon-btn et-icon-cancel"
          title="Cancel"
          onClick={cancelEdit}
        >
          {/* X icon */}
          <svg viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </>
    )}
  </div>
</td>


                 </tr>
               );
             })}
        </tbody>
          </table>
          {/* Bulk modal */}

{/* Bulk modal */}
{bulkModal && (
  <div className="bulk-modal-overlay">
    <div className="bulk-modal">
      <div style={{ fontWeight: 600, marginBottom: 8 }}>
        Bulk Update
      </div>
      {/* show readable names instead of composite key */}
      <div style={{ marginBottom: 8, fontSize: 14 }}>
        <strong>Application:</strong> {bulkModal.row?.ApplicationName || bulkModal.row?.ApplicationID || bulkModal.key}<br/>
        <strong>Resource:</strong> {bulkModal.row?.ResourceName || bulkModal.row?.ResourceID || ''}<br/>
        <strong>Role:</strong> {bulkModal.row?.RoleName || ''}
      </div>
      <div className="row">
        <label>Start</label>
        <input type="month" value={bulkStart} onChange={e => setBulkStart(e.target.value)} />
      </div>
      <div className="row">
        <label>End</label>
        <input type="month" value={bulkEnd} onChange={e => setBulkEnd(e.target.value)} />
      </div>
      <div className="row">
        <label>Value</label>
        <input
          type="number"
          step="0.01"
          value={bulkValue}
          onChange={e => setBulkValue(e.target.value)}
          placeholder="0.50"
        />
      </div>
      <div className="actions">
        <button className="et-btn-apply" onClick={handleBulkApply} disabled={bulkSaving}
          style={{
            background: "#064e16ff",
            color: "#fff",
            border: "none",
            padding: "10px 18px",
            margin: "3px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            transition: "background .2s, transform .15s"
          }}
        >
          {bulkSaving ? "Updating..." : "Apply"}
        </button>
        <button className="et-btn small-cancel" onClick={closeBulkModal}
          style={{
            background: "#93959aff",
            color: "black",
            border: "none",
            padding: "10px 18px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            transition: "background .2s, transform .15s"
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

        </div>
      </div>
      </div>
  );
};
 
export default EffortTracker;