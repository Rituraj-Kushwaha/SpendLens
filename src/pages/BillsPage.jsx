import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, CheckCircle, AlertTriangle, Clock, X, ChevronLeft, ChevronRight, Trash2, Edit3 } from 'lucide-react';
import Button from '../components/Button';
import { billService } from '../services/billService';
import { useToast } from '../context/ToastContext';
import { useCurrency } from '../context/CurrencyContext';
import './BillsPage.css';

// ─── Helpers ─────────────────────────────────────────────────────────────
function daysUntil(dateStr) {
    if (!dateStr) return null;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
    return Math.round((d - now) / 86400000);
}

function DueBadge({ dueDate, status }) {
    if (status === 'paid') return <span className="bills-due-tag bills-due-tag--paid">✓ Paid</span>;
    if (status === 'skipped') return <span className="bills-due-tag bills-due-tag--normal">Skipped</span>;
    const days = daysUntil(dueDate);
    if (days === null) return null;
    if (days < 0) return <span className="bills-due-tag bills-due-tag--overdue">Overdue {Math.abs(days)}d</span>;
    if (days === 0) return <span className="bills-due-tag bills-due-tag--today">Due Today</span>;
    if (days <= 3) return <span className="bills-due-tag bills-due-tag--soon">Due in {days}d</span>;
    return <span className="bills-due-tag bills-due-tag--normal">Due in {days}d</span>;
}

const FREQ_OPTIONS = [
    { value: 'one-time', label: 'One-time', desc: 'Single payment, no recurrence' },
    { value: 'weekly', label: 'Weekly', desc: 'Repeats every 7 days' },
    { value: 'monthly', label: 'Monthly', desc: 'Same date each month' },
    { value: 'quarterly', label: 'Quarterly', desc: 'Every 3 months' },
    { value: 'yearly', label: 'Yearly', desc: 'Once a year' },
    { value: 'custom', label: 'Custom', desc: 'Set your own interval' },
];

const PAYMENT_METHODS = ['UPI', 'Card', 'Cash', 'BankTransfer', 'NetBanking', 'Other'];
const TOTAL_STEPS = 7;

// ─── 7-Step Add Bill Modal ────────────────────────────────────────────────
function AddBillModal({ onClose, onSaved, categories }) {
    const toast = useToast();
    const { formatCurrency: fc } = useCurrency();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [dupeWarning, setDupeWarning] = useState(null);
    const [form, setForm] = useState({
        title: '', category_id: '', amount: '',
        bill_date: new Date().toISOString().slice(0, 10),
        due_date: '',
        frequency: 'monthly', interval_days: '', tenure: '',
        notes: '', skipDuplicateCheck: false,
    });
    const [preview, setPreview] = useState(null);
    const [newCatName, setNewCatName] = useState('');
    const [addingCat, setAddingCat] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const back = () => setStep(s => Math.max(1, s - 1));
    const next = () => setStep(s => Math.min(TOTAL_STEPS, s + 1));

    const canNext = () => {
        if (step === 1) return form.title.trim().length > 0;
        if (step === 2) return form.category_id !== '';
        if (step === 3) return form.amount && parseFloat(form.amount) > 0;
        if (step === 4) return form.bill_date !== '';
        if (step === 5) return form.frequency !== '';
        return true;
    };

    const handleSubmit = async (skipDupe = false) => {
        setLoading(true);
        try {
            const payload = {
                ...form,
                amount: parseFloat(form.amount),
                tenure: form.tenure ? parseInt(form.tenure) : null,
                interval_days: form.interval_days ? parseInt(form.interval_days) : null,
                due_date: form.due_date || null,
                skipDuplicateCheck: skipDupe,
            };
            const res = await billService.createBill(payload);
            if (res.status === 409) {
                setDupeWarning(res.data.data.existingBill);
                return;
            }
            setPreview(res.data.data);
            setStep(7); // go to confirmation
        } catch (err) {
            if (err.response?.status === 409) {
                setDupeWarning(err.response.data.data.existingBill);
                return;
            }
            toast.error(err.response?.data?.error || 'Failed to create bill');
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1: return (
                <div className="modal-step">
                    <h3>What's the bill called?</h3>
                    <input
                        className="modal-input"
                        placeholder="e.g. Netflix, Rent, Electricity..."
                        value={form.title}
                        onChange={e => set('title', e.target.value)}
                        autoFocus
                    />
                </div>
            );
            case 2: return (
                <div className="modal-step">
                    <h3>Pick a category</h3>
                    <div className="modal-cat-grid">
                        {categories.map(c => (
                            <button
                                key={c.category_id}
                                className={`modal-cat-chip ${form.category_id === c.category_id ? 'modal-cat-chip--active' : ''}`}
                                onClick={() => set('category_id', c.category_id)}
                            >
                                {c.category_name}
                            </button>
                        ))}
                        <button className="modal-cat-chip modal-cat-chip--add" onClick={() => setAddingCat(true)}>
                            + Custom
                        </button>
                    </div>
                    {addingCat && (
                        <div className="modal-cat-new">
                            <input
                                className="modal-input"
                                placeholder="Category name"
                                value={newCatName}
                                onChange={e => setNewCatName(e.target.value)}
                            />
                            <Button size="sm" variant="primary" onClick={async () => {
                                if (!newCatName.trim()) return;
                                const res = await billService.createCategory(newCatName.trim());
                                const cat = res.data.data.category;
                                categories.push(cat);
                                set('category_id', cat.category_id);
                                setAddingCat(false);
                                setNewCatName('');
                            }}>Add</Button>
                        </div>
                    )}
                </div>
            );
            case 3: return (
                <div className="modal-step">
                    <h3>How much is it?</h3>
                    <div className="modal-amount-wrap">
                        <span className="modal-currency">₹</span>
                        <input
                            className="modal-input modal-input--amount"
                            type="number"
                            placeholder="0.00"
                            value={form.amount}
                            onChange={e => set('amount', e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>
            );
            case 4: return (
                <div className="modal-step">
                    <h3>First billing date</h3>
                    <input
                        type="date"
                        className="modal-input"
                        value={form.bill_date}
                        onChange={e => set('bill_date', e.target.value)}
                    />
                    <p className="modal-hint">Optional: Due date (payment deadline)</p>
                    <input
                        type="date"
                        className="modal-input"
                        value={form.due_date}
                        onChange={e => set('due_date', e.target.value)}
                    />
                </div>
            );
            case 5: return (
                <div className="modal-step">
                    <h3>How often does this repeat?</h3>
                    <div className="modal-freq-grid">
                        {FREQ_OPTIONS.map(o => (
                            <button
                                key={o.value}
                                className={`modal-freq-card ${form.frequency === o.value ? 'modal-freq-card--active' : ''}`}
                                onClick={() => set('frequency', o.value)}
                            >
                                <span className="modal-freq-card__name">{o.label}</span>
                                <span className="modal-freq-card__desc">{o.desc}</span>
                            </button>
                        ))}
                    </div>
                    {form.frequency === 'custom' && (
                        <div className="modal-custom-interval">
                            <label>Days between occurrences</label>
                            <input type="number" className="modal-input" value={form.interval_days} onChange={e => set('interval_days', e.target.value)} placeholder="e.g. 14" />
                        </div>
                    )}
                </div>
            );
            case 6: return form.frequency === 'one-time' ? (
                <div className="modal-step">
                    <h3>Any notes?</h3>
                    <textarea className="modal-input modal-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." />
                    <p className="modal-hint">One-time bills don't need a tenure.</p>
                </div>
            ) : (
                <div className="modal-step">
                    <h3>How long does this run?</h3>
                    <button className={`modal-tenure-opt ${!form.tenure ? 'modal-tenure-opt--active' : ''}`} onClick={() => set('tenure', '')}>
                        <strong>Ongoing forever</strong>
                        <span>No end date — runs until you cancel</span>
                    </button>
                    <div className={`modal-tenure-opt ${form.tenure ? 'modal-tenure-opt--active' : ''}`}>
                        <strong>Fixed tenure</strong>
                        <span>
                            <input
                                type="number"
                                className="modal-tenure-input"
                                placeholder="e.g. 12"
                                value={form.tenure}
                                onChange={e => set('tenure', e.target.value)}
                            />
                            {' '}
                            {form.frequency === 'monthly' ? 'months' : form.frequency === 'quarterly' ? 'quarters' : form.frequency === 'yearly' ? 'years' : 'occurrences'}
                        </span>
                    </div>
                    <textarea className="modal-input modal-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." />
                </div>
            );
            case 7: return preview ? (
                <div className="modal-step">
                    <div className="modal-confirm-icon">✅</div>
                    <h3>Bill Created!</h3>
                    <p className="modal-hint">{preview.schedulesCreated} payment schedules generated</p>
                    <div className="modal-preview-dates">
                        <strong>First 3 due dates:</strong>
                        {preview.schedulesPreview?.map((s, i) => (
                            <div key={i} className="modal-preview-date">
                                {new Date(s.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                        ))}
                    </div>
                    <Button variant="primary" size="lg" fullWidth onClick={() => { onSaved(); onClose(); }}>Done</Button>
                </div>
            ) : null;
            default: return null;
        }
    };

    return (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-box">
                <div className="modal-header">
                    <div className="modal-progress">
                        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                            <div key={i} className={`modal-progress-dot ${i < step ? 'modal-progress-dot--done' : i === step - 1 ? 'modal-progress-dot--active' : ''}`} />
                        ))}
                    </div>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>

                {dupeWarning && (
                    <div className="modal-dupe-warn">
                        <strong>⚠️ Similar bill found:</strong> "{dupeWarning.title}" for ₹{dupeWarning.amount} created on {new Date(dupeWarning.bill_date).toLocaleDateString('en-IN')}.
                        <div className="modal-dupe-actions">
                            <Button size="sm" variant="ghost" onClick={() => setDupeWarning(null)}>Cancel</Button>
                            <Button size="sm" variant="primary" onClick={() => { setDupeWarning(null); handleSubmit(true); }}>Create Anyway</Button>
                        </div>
                    </div>
                )}

                <div className="modal-body">{renderStep()}</div>

                {step < 7 && (
                    <div className="modal-footer">
                        {step > 1 && <Button variant="ghost" size="md" icon={<ChevronLeft size={16} />} onClick={back}>Back</Button>}
                        {step < 6
                            ? <Button variant="primary" size="md" onClick={next} disabled={!canNext()}>Continue <ChevronRight size={16} /></Button>
                            : <Button variant="primary" size="md" loading={loading} onClick={() => handleSubmit(false)} disabled={loading}>Create Bill</Button>
                        }
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Mark as Paid Modal ────────────────────────────────────────────────────
function MarkPaidModal({ schedule, onClose, onPaid }) {
    const toast = useToast();
    const { formatCurrency: fc } = useCurrency();
    const [form, setForm] = useState({ payment_method: 'UPI', payment_reference: '', amount: schedule?.amount || '' });
    const [loading, setLoading] = useState(false);

    const handlePay = async () => {
        setLoading(true);
        try {
            await billService.markPaid(schedule.schedule_id, form);
            toast.success(`${schedule.title} marked as paid`);
            onPaid();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Payment failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-box modal-box--small">
                <div className="modal-header">
                    <h3>Confirm Payment</h3>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="modal-body">
                    <p className="modal-hint">{schedule?.title} · {fc(schedule?.amount)}</p>
                    <label className="modal-label">Payment Method</label>
                    <div className="modal-methods">
                        {PAYMENT_METHODS.map(m => (
                            <button key={m} className={`modal-method-chip ${form.payment_method === m ? 'modal-method-chip--active' : ''}`}
                                onClick={() => setForm(f => ({ ...f, payment_method: m }))}>
                                {m}
                            </button>
                        ))}
                    </div>
                    <label className="modal-label">Reference / UTR (optional)</label>
                    <input className="modal-input" placeholder="e.g. UTR123456789" value={form.payment_reference}
                        onChange={e => setForm(f => ({ ...f, payment_reference: e.target.value }))} />
                    <label className="modal-label">Amount Paid</label>
                    <input type="number" className="modal-input" value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="modal-footer">
                    <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" size="md" loading={loading} onClick={handlePay}>Confirm Payment</Button>
                </div>
            </div>
        </div>
    );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────
function DeleteModal({ bill, onClose, onDeleted }) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);

    const handleDelete = async (mode) => {
        setLoading(true);
        try {
            await billService.deleteBill(bill.bill_id, { mode });
            toast.success('Bill deleted');
            onDeleted();
            onClose();
        } catch {
            toast.error('Failed to delete');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-box modal-box--small">
                <div className="modal-header">
                    <h3>Delete "{bill.title}"?</h3>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="modal-body">
                    <p className="modal-hint">Choose what to delete:</p>
                    <Button variant="ghost" size="md" fullWidth loading={loading}
                        onClick={() => handleDelete('future')}>
                        🗑 Delete all future occurrences
                    </Button>
                </div>
                <div className="modal-footer">
                    <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Bills Page ────────────────────────────────────────────────────────
export default function BillsPage() {
    const toast = useToast();
    const { formatCurrency: fc } = useCurrency();

    const [pending, setPending] = useState([]);
    const [paidThisMonth, setPaidThisMonth] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState('upcoming'); // upcoming | paid
    const [showAdd, setShowAdd] = useState(false);
    const [paySchedule, setPaySchedule] = useState(null);
    const [deleteBill, setDeleteBill] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [dashRes, catRes] = await Promise.all([
                billService.getDashboardSchedules(),
                billService.getCategories(),
            ]);
            setPending(dashRes.data.data.pending || []);
            setPaidThisMonth(dashRes.data.data.paidThisMonth || []);
            setCategories(catRes.data.data.categories || []);
        } catch (err) {
            toast.error('Failed to load bills');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const overdue = useMemo(() => pending.filter(s => s.status === 'overdue' || daysUntil(s.due_date) < 0), [pending]);
    const upcoming = useMemo(() => pending.filter(s => s.status !== 'overdue' && daysUntil(s.due_date) >= 0), [pending]);

    const visiblePending = useMemo(() => {
        const list = [...overdue, ...upcoming];
        if (!search) return list;
        return list.filter(s => s.title?.toLowerCase().includes(search.toLowerCase()));
    }, [overdue, upcoming, search]);

    const visiblePaid = useMemo(() => {
        if (!search) return paidThisMonth;
        return paidThisMonth.filter(s => s.title?.toLowerCase().includes(search.toLowerCase()));
    }, [paidThisMonth, search]);

    const totalPending = pending.reduce((s, b) => s + parseFloat(b.amount || 0), 0);

    return (
        <div className="bills-page-enter">
            {/* Header */}
            <div className="bills-header">
                <div>
                    <h2>My Bills</h2>
                    <p className="bills-header__sub">
                        <AlertTriangle size={13} style={{ color: 'var(--accent-red)' }} /> {overdue.length} overdue ·{' '}
                        <Clock size={13} style={{ color: 'var(--accent-amber, #f59e0b)' }} /> {upcoming.length} upcoming ·{' '}
                        {fc(totalPending)} pending
                    </p>
                </div>
                <div className="bills-header__actions">
                    <div className="bills-search">
                        <Search size={15} className="bills-search__icon" />
                        <input type="text" placeholder="Search bills..." className="bills-search__input"
                            value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={() => setShowAdd(true)}>Add Bill</Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bills-filters">
                <button className={`bills-filter-tab ${tab === 'upcoming' ? 'bills-filter-tab--active' : ''}`} onClick={() => setTab('upcoming')}>
                    Upcoming & Overdue <span className="mono">({overdue.length + upcoming.length})</span>
                </button>
                <button className={`bills-filter-tab ${tab === 'paid' ? 'bills-filter-tab--active' : ''}`} onClick={() => setTab('paid')}>
                    Paid This Month <span className="mono">({paidThisMonth.length})</span>
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="bills-loading">Loading...</div>
            ) : tab === 'upcoming' ? (
                <div className="bills-table-wrap">
                    {visiblePending.length === 0 ? (
                        <div className="bills-empty">
                            <CheckCircle size={40} style={{ color: 'var(--accent-green)' }} />
                            <p>All caught up! No pending bills.</p>
                        </div>
                    ) : (
                        <table className="bills-table">
                            <thead>
                                <tr>
                                    <th>Bill</th>
                                    <th>Category</th>
                                    <th>Amount</th>
                                    <th>Due Date</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {visiblePending.map(s => {
                                    const isOverdue = s.status === 'overdue' || daysUntil(s.due_date) < 0;
                                    return (
                                        <tr key={s.schedule_id} className={`bills-row ${isOverdue ? 'bills-row--overdue' : ''}`}>
                                            <td><span className="bills-name">{s.title}</span></td>
                                            <td><span className="bills-cat-badge">{s.category}</span></td>
                                            <td className="mono bills-amount">{fc(s.amount)}</td>
                                            <td className="mono">{s.due_date ? new Date(s.due_date).toLocaleDateString('en-IN') : '—'}</td>
                                            <td><DueBadge dueDate={s.due_date} status={s.status} /></td>
                                            <td>
                                                <div className="bills-row__actions">
                                                    <button className="bills-btn-pay" onClick={() => setPaySchedule(s)}>
                                                        <CheckCircle size={14} /> Pay
                                                    </button>
                                                    <button className="bills-btn-del" onClick={() => setDeleteBill({ bill_id: s.bill_id, title: s.title })}>
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            ) : (
                <div className="bills-table-wrap">
                    {visiblePaid.length === 0 ? (
                        <div className="bills-empty">
                            <p style={{ color: 'var(--text-muted)' }}>No bills paid this month yet.</p>
                        </div>
                    ) : (
                        <table className="bills-table">
                            <thead>
                                <tr>
                                    <th>Bill</th>
                                    <th>Category</th>
                                    <th>Amount</th>
                                    <th>Paid Date</th>
                                    <th>Method</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visiblePaid.map(s => (
                                    <tr key={s.schedule_id} className="bills-row">
                                        <td><span className="bills-name">{s.title}</span></td>
                                        <td><span className="bills-cat-badge">{s.category}</span></td>
                                        <td className="mono bills-amount">{fc(s.paid_amount || s.amount)}</td>
                                        <td className="mono">{s.paid_date ? new Date(s.paid_date).toLocaleDateString('en-IN') : '—'}</td>
                                        <td><span className="bills-cat-badge">{s.payment_method || '—'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Modals */}
            {showAdd && <AddBillModal categories={categories} onClose={() => setShowAdd(false)} onSaved={fetchData} />}
            {paySchedule && <MarkPaidModal schedule={paySchedule} onClose={() => setPaySchedule(null)} onPaid={fetchData} />}
            {deleteBill && <DeleteModal bill={deleteBill} onClose={() => setDeleteBill(null)} onDeleted={fetchData} />}
        </div>
    );
}
