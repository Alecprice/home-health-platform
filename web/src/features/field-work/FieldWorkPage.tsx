import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { db, type NativeRecoveryItem } from '../../offline/db';
import { demoPatients, demoVisits, patientName } from '../../data/demo';
import type { ExpenseCategory, FieldExpense, MileageLog, VehicleType } from '../../types/domain';
import { captureReceiptPhoto } from '../../native/receipt';
import { calculateMileage, localDateInputValue, parseExpenseAmount } from './fieldWorkLogic';
import { createUuid } from '../../utils/id';

const expenseLabels: Record<ExpenseCategory, string> = {
  fuel: 'Fuel / gas', parking: 'Parking', toll: 'Tolls', meal: 'Meal', lodging: 'Lodging', supplies: 'Work supplies', other: 'Other'
};

type MileageForm = { date: string; visitId: string; vehicleType: VehicleType | ''; purpose: string; origin: string; destination: string; start: string; end: string; miles: string; notes: string };
type ExpenseForm = { date: string; visitId: string; category: ExpenseCategory | ''; amount: string; merchant: string; purpose: string; notes: string; receiptName: string; receiptUri: string; receiptPreviewUrl: string; receiptPersistent: boolean };

const emptyMileage = (): MileageForm => ({ date: localDateInputValue(), visitId: '', vehicleType: '', purpose: '', origin: '', destination: '', start: '', end: '', miles: '', notes: '' });
const emptyExpense = (): ExpenseForm => ({ date: localDateInputValue(), visitId: '', category: '', amount: '', merchant: '', purpose: '', notes: '', receiptName: '', receiptUri: '', receiptPreviewUrl: '', receiptPersistent: false });

export function FieldWorkPage() {
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [expenses, setExpenses] = useState<FieldExpense[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [recoveredReceipts, setRecoveredReceipts] = useState<NativeRecoveryItem[]>([]);
  const [mileage, setMileage] = useState<MileageForm>(() => emptyMileage());
  const [expense, setExpense] = useState<ExpenseForm>(() => emptyExpense());

  const refresh = async () => {
    try {
      const [nextMileage, nextExpenses, recovered] = await Promise.all([
        db.mileageLogs.orderBy('createdAt').reverse().toArray(),
        db.fieldExpenses.orderBy('createdAt').reverse().toArray(),
        db.nativeRecoveries.where('[kind+status]').equals(['receipt', 'pending']).sortBy('createdAt')
      ]);
      setMileageLogs(nextMileage);
      setExpenses(nextExpenses);
      setRecoveredReceipts(recovered.reverse());
    } catch {
      setStatus('Unable to read the device field-work ledger. Local storage may be unavailable.');
    }
  };

  useEffect(() => { void refresh(); }, []);

  const totalMiles = useMemo(() => mileageLogs.reduce((sum, row) => sum + row.miles, 0), [mileageLogs]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, row) => sum + row.amount, 0), [expenses]);
  const fuelTotal = useMemo(() => expenses.filter(row => row.category === 'fuel').reduce((sum, row) => sum + row.amount, 0), [expenses]);

  const selectedVisitPatient = (visitId: string) => demoVisits.find(row => row.id === visitId)?.patientId;

  const chooseMileageVisit = (visitId: string) => {
    const visit = demoVisits.find(row => row.id === visitId);
    const patient = visit ? demoPatients.find(row => row.id === visit.patientId) : undefined;
    setMileage(current => ({
      ...current,
      visitId,
      destination: visitId && patient && !current.destination ? patient.address : current.destination,
      purpose: visitId && visit && !current.purpose ? `${visit.type} visit` : current.purpose
    }));
  };

  const saveMileage = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!mileage.vehicleType) { setStatus('Choose the vehicle used before saving mileage.'); return; }
    const calculation = calculateMileage(mileage);
    if (calculation.error) { setStatus(calculation.error); return; }
    if (!mileage.date || !mileage.purpose.trim() || calculation.miles === undefined) { setStatus('Date, purpose, and valid mileage are required.'); return; }

    const row: MileageLog = {
      id: createUuid(), date: mileage.date, visitId: mileage.visitId || undefined,
      patientId: selectedVisitPatient(mileage.visitId), vehicleType: mileage.vehicleType,
      purpose: mileage.purpose.trim().slice(0, 500), origin: mileage.origin.trim().slice(0, 500) || undefined, destination: mileage.destination.trim().slice(0, 500) || undefined,
      startOdometer: calculation.start, endOdometer: calculation.end, miles: calculation.miles,
      notes: mileage.notes.trim().slice(0, 4000) || undefined, createdAt: new Date().toISOString()
    };
    setBusy(true);
    try {
      await db.mileageLogs.add(row);
      setMileage(emptyMileage());
      setStatus(`Saved ${row.miles.toFixed(1)} business miles on this device.`);
      await refresh();
    } catch {
      setStatus('Mileage could not be saved. Check device storage and try again.');
    } finally { setBusy(false); }
  };

  const saveExpense = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!expense.category) { setStatus('Choose an expense category before saving.'); return; }
    const amount = parseExpenseAmount(expense.amount);
    if (amount === undefined || !expense.date || !expense.purpose.trim()) { setStatus('Date, purpose, and a valid expense amount greater than $0 are required.'); return; }
    const row: FieldExpense = {
      id: createUuid(), date: expense.date, visitId: expense.visitId || undefined,
      patientId: selectedVisitPatient(expense.visitId), category: expense.category, amount,
      merchant: expense.merchant.trim().slice(0, 500) || undefined, purpose: expense.purpose.trim().slice(0, 500),
      receiptName: expense.receiptName || undefined, receiptUri: expense.receiptUri || undefined,
      receiptPreviewUrl: expense.receiptPreviewUrl || undefined, notes: expense.notes.trim().slice(0, 4000) || undefined,
      createdAt: new Date().toISOString()
    };
    setBusy(true);
    try {
      await db.fieldExpenses.add(row);
      setExpense(emptyExpense());
      const overlapWarning = row.category === 'fuel' && mileageLogs.some(log => log.date === row.date && log.vehicleType === 'personal');
      setStatus(`Saved ${expenseLabels[row.category]} expense of $${row.amount.toFixed(2)} on this device.${overlapWarning ? ' Note: personal-vehicle mileage is also logged for this date; agency policy may not reimburse both mileage and fuel.' : ''}`);
      await refresh();
    } catch {
      setStatus('Expense could not be saved. Check device storage and try again.');
    } finally { setBusy(false); }
  };

  const captureReceipt = async () => {
    if (busy) return;
    setBusy(true);
    setStatus('Opening camera…');
    try {
      const result = await captureReceiptPhoto();
      setExpense(current => ({ ...current, receiptName: result.name, receiptUri: result.uri ?? '', receiptPreviewUrl: result.previewUrl ?? '', receiptPersistent: result.persistent }));
      setStatus(result.persistent ? 'Receipt captured into app-private device storage.' : 'Receipt captured, but durable device storage could not be confirmed. Do not assume the receipt will survive an app restart.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to capture receipt photo.');
    } finally { setBusy(false); }
  };

  const attachRecoveredReceipt = async (item: NativeRecoveryItem) => {
    if (busy) return;
    setExpense(current => ({
      ...current, receiptName: item.name ?? 'recovered-receipt.jpg', receiptUri: item.uri ?? '',
      receiptPreviewUrl: item.previewUrl ?? '', receiptPersistent: item.persistent === true
    }));
    try {
      await db.nativeRecoveries.delete(item.id);
      setRecoveredReceipts(current => current.filter(row => row.id !== item.id));
      setStatus('Recovered receipt attached after Android restored the camera result. Review it before saving the expense.');
    } catch {
      setStatus('Recovered receipt was attached, but its recovery record could not be marked consumed.');
    }
  };

  const visitLabel = (visitId?: string) => {
    if (!visitId) return 'General field work';
    const visit = demoVisits.find(row => row.id === visitId);
    const patient = visit ? demoPatients.find(row => row.id === visit.patientId) : undefined;
    return patient ? `${patientName(patient)} · ${visit?.type}` : 'Linked visit';
  };

  const ledger = useMemo(() => [
    ...mileageLogs.map(row => ({ key: `m-${row.id}`, createdAt: row.createdAt, title: `${row.miles.toFixed(1)} miles`, detail: `${visitLabel(row.visitId)} · ${row.vehicleType} vehicle`, date: row.date })),
    ...expenses.map(row => ({ key: `e-${row.id}`, createdAt: row.createdAt, title: `$${row.amount.toFixed(2)} · ${expenseLabels[row.category]}`, detail: `${visitLabel(row.visitId)}${row.merchant ? ` · ${row.merchant}` : ''}`, date: row.date }))
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [mileageLogs, expenses]);

  return (
    <div className="page">
      <div className="page-heading"><div><p className="eyebrow">Field work</p><h1>Mileage & expenses</h1><p>Optional operational tracking, kept separate from the signed clinical note.</p></div><span className="badge safe">Device-local demo</span></div>
      {status && <p className="info-callout" role="status">{status}</p>}

      <div className="metric-grid"><article><span>Miles logged</span><strong>{totalMiles.toFixed(1)}</strong><small>demo workspace</small></article><article><span>Fuel</span><strong>${fuelTotal.toFixed(2)}</strong><small>recorded expenses</small></article><article><span>Other expenses</span><strong>${Math.max(0, totalExpenses - fuelTotal).toFixed(2)}</strong><small>parking, tolls, supplies, etc.</small></article></div>

      <div className="detail-grid field-work-grid">
        <form className="panel" onSubmit={saveMileage}>
          <div className="panel-heading"><div><h2>Log mileage</h2><p className="helper">Choose a visit when possible. Use either the odometer pair or total miles—not both.</p></div><span className="badge">Optional</span></div>
          <div className="form-grid two-column">
            <label>Date<input required type="date" value={mileage.date} onChange={e => setMileage({ ...mileage, date: e.target.value })} /></label>
            <label>Vehicle<select required value={mileage.vehicleType} onChange={e => setMileage({ ...mileage, vehicleType: e.target.value as VehicleType | '' })}><option value="">Choose vehicle…</option><option value="personal">Personal vehicle</option><option value="agency">Agency vehicle</option><option value="rental">Rental</option></select></label>
            <label className="span-two">Linked visit<select value={mileage.visitId} onChange={e => chooseMileageVisit(e.target.value)}><option value="">Not linked to a visit</option>{demoVisits.map(visit => { const patient = demoPatients.find(row => row.id === visit.patientId); return patient ? <option value={visit.id} key={visit.id}>{patientName(patient)} · {visit.type}</option> : null; })}</select></label>
            <label>Start odometer<input type="number" min="0" step="0.1" inputMode="decimal" value={mileage.start} onChange={e => setMileage({ ...mileage, start: e.target.value })} placeholder="Optional" /></label>
            <label>End odometer<input type="number" min="0" step="0.1" inputMode="decimal" value={mileage.end} onChange={e => setMileage({ ...mileage, end: e.target.value })} placeholder="Optional" /></label>
            <label>Total miles<input type="number" min="0" step="0.1" inputMode="decimal" value={mileage.miles} onChange={e => setMileage({ ...mileage, miles: e.target.value })} placeholder="Use if no odometer" /></label>
            <label>Purpose<input required maxLength={500} value={mileage.purpose} onChange={e => setMileage({ ...mileage, purpose: e.target.value })} placeholder="Why was this travel needed?" /></label>
            <label>Origin<input maxLength={500} value={mileage.origin} onChange={e => setMileage({ ...mileage, origin: e.target.value })} /></label>
            <label>Destination<input maxLength={500} value={mileage.destination} onChange={e => setMileage({ ...mileage, destination: e.target.value })} /></label>
            <label className="span-two">Notes<textarea maxLength={4000} value={mileage.notes} onChange={e => setMileage({ ...mileage, notes: e.target.value })} /></label>
          </div><button className="button primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save mileage'}</button>
        </form>

        <form className="panel" onSubmit={saveExpense}>
          <div className="panel-heading"><div><h2>Log an expense</h2><p className="helper">Record what actually happened. Eligibility and reimbursement remain agency policy.</p></div><span className="badge">Optional</span></div>
          <div className="form-grid two-column">
            <label>Date<input required type="date" value={expense.date} onChange={e => setExpense({ ...expense, date: e.target.value })} /></label>
            <label>Category<select required value={expense.category} onChange={e => setExpense({ ...expense, category: e.target.value as ExpenseCategory | '' })}><option value="">Choose category…</option>{Object.entries(expenseLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label>Amount<input required type="number" min="0.01" step="0.01" inputMode="decimal" value={expense.amount} onChange={e => setExpense({ ...expense, amount: e.target.value })} placeholder="0.00" /></label>
            <label>Merchant<input maxLength={500} value={expense.merchant} onChange={e => setExpense({ ...expense, merchant: e.target.value })} /></label>
            <label className="span-two">Linked visit<select value={expense.visitId} onChange={e => setExpense({ ...expense, visitId: e.target.value })}><option value="">Not linked to a visit</option>{demoVisits.map(visit => { const patient = demoPatients.find(row => row.id === visit.patientId); return patient ? <option value={visit.id} key={visit.id}>{patientName(patient)} · {visit.type}</option> : null; })}</select></label>
            <label className="span-two">Purpose<input required maxLength={500} value={expense.purpose} onChange={e => setExpense({ ...expense, purpose: e.target.value })} placeholder="Why was this expense needed?" /></label>
            <div className="span-two receipt-field"><span className="field-label">Receipt</span><div className="button-row"><button className="button ghost" disabled={busy} type="button" onClick={() => void captureReceipt()}>📷 Capture receipt</button><button className="button ghost" disabled type="button" title="Durable file-import storage is not implemented yet">📄 Import receipt file — coming later</button></div>{recoveredReceipts.length > 0 && <div className="recovery-callout"><strong>Recovered camera result</strong><p>Android restored {recoveredReceipts.length} receipt photo{recoveredReceipts.length === 1 ? '' : 's'} after the app was interrupted.</p><button className="button ghost" type="button" disabled={busy} onClick={() => void attachRecoveredReceipt(recoveredReceipts[0])}>Attach latest recovered receipt</button></div>}{expense.receiptPreviewUrl && <img className="receipt-preview" src={expense.receiptPreviewUrl} alt="Receipt preview" />}<small>{expense.receiptName ? `${expense.receiptName}${expense.receiptPersistent ? ' · app-private copy saved' : ' · durable storage not confirmed'}` : 'No receipt attached.'}</small></div>
            <label className="span-two">Notes<textarea maxLength={4000} value={expense.notes} onChange={e => setExpense({ ...expense, notes: e.target.value })} /></label>
          </div><button className="button primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save expense'}</button>
        </form>
      </div>

      <section className="panel"><div className="panel-heading"><h2>Recent field-work entries</h2><span className="badge">{ledger.length} entries</span></div><div className="ledger-list">{ledger.map(row => <article className="ledger-row" key={row.key}><div><strong>{row.title}</strong><span>{row.detail}</span></div><span>{row.date}</span></article>)}{!ledger.length && <p className="helper">No mileage or expense entries yet.</p>}</div></section>
      <section className="info-callout"><strong>Reimbursement-safe design</strong><p>We record facts without assuming that mileage, fuel, meals, or other expenses are reimbursable. Rates, eligible categories, approval rules, and whether fuel may be claimed alongside mileage remain agency policy.</p></section>
    </div>
  );
}
