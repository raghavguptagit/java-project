import React, { useEffect, useState } from 'react';
import { Check, Plus, Printer, X } from 'lucide-react';
import { apiRequest, formatDate, formatINR, statusColorClass } from '../lib/api';
import type { Bill, Flat, Payment, PaymentMethod, User } from '../types';

export function BillingView({ user, onNotify }: { user: User; onNotify: (msg: string) => void }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Issue bill form
  const [showCreate, setShowCreate] = useState(false);
  const [flatId, setFlatId] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('December 2026');
  const [dueDate, setDueDate] = useState('2026-12-15');
  const [maintAmount, setMaintAmount] = useState('4200');
  const [waterAmount, setWaterAmount] = useState('650');

  // Payment submission modal
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('UPI');
  const [payRef, setPayRef] = useState('');

  // Receipt modal
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [b, p, f] = await Promise.all([
        apiRequest<Bill[]>('/bills'),
        apiRequest<Payment[]>('/payments'),
        apiRequest<Flat[]>('/flats'),
      ]);
      setBills(b);
      setPayments(p);
      setFlats(f);
      if (!flatId && f.length > 0) setFlatId(f[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [user.id]);

  async function handleIssueBill(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiRequest('/bills', {
        method: 'POST',
        body: JSON.stringify({
          flatId,
          billingPeriod,
          dueDate,
          items: [
            { description: 'Monthly Maintenance Charge', amount: Number(maintAmount) },
            { description: 'Water & Utility Charge', amount: Number(waterAmount) },
          ],
        }),
      });
      setShowCreate(false);
      onNotify('Maintenance bill issued successfully.');
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue bill.');
    }
  }

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payingBill) return;
    try {
      await apiRequest(`/bills/${payingBill.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(payAmount),
          method: payMethod,
          transactionReference: payRef,
          idempotencyKey: `${payingBill.id}-${payRef}`,
        }),
      });
      setPayingBill(null);
      setPayRef('');
      onNotify(
        user.role === 'SOCIETY_ADMIN'
          ? 'Payment recorded and verified.'
          : 'Payment submitted for Society Admin verification.'
      );
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment submission failed.');
    }
  }

  async function handleVerify(paymentId: string) {
    try {
      await apiRequest(`/payments/${paymentId}/verify`, { method: 'POST' });
      onNotify('Payment verified and receipt generated.');
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    }
  }

  async function handleReject(paymentId: string) {
    try {
      await apiRequest(`/payments/${paymentId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Reference not matched in bank statement' }),
      });
      onNotify('Payment marked as rejected.');
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rejection failed.');
    }
  }

  const isAdmin = user.role === 'SOCIETY_ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Maintenance Bills & Payments</h2>
          <p className="text-xs text-slate-500">
            {isAdmin ? 'Issue bills, track arrears, and verify offline payments' : 'View your flat bills, submit payments, and print receipts'}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowCreate((s) => !s)}
            className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-medium rounded-lg flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Bill</span>
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
          {error}
        </div>
      )}

      {showCreate && isAdmin && (
        <form onSubmit={handleIssueBill} className="p-5 bg-white border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Flat</label>
            <select
              value={flatId}
              onChange={(e) => setFlatId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {flats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.unitNumber} ({f.residentName || 'Vacant'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Billing Period</label>
            <input
              type="text"
              required
              value={billingPeriod}
              onChange={(e) => setBillingPeriod(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Maintenance (₹)</label>
            <input
              type="number"
              required
              min="1"
              value={maintAmount}
              onChange={(e) => setMaintAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Water (₹)</label>
              <input
                type="number"
                required
                min="0"
                value={waterAmount}
                onChange={(e) => setWaterAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg cursor-pointer"
            >
              Create
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 text-sm font-semibold text-slate-900">Bills Ledger</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Bill #</th>
                <th className="px-4 py-3 font-medium">Flat / Resident</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Paid</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Loading bills...
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No maintenance bills found.
                  </td>
                </tr>
              ) : (
                bills.map((bill) => {
                  const balance = Math.max(0, bill.totalAmount - bill.amountPaid);
                  return (
                    <tr key={bill.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{bill.billNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{bill.flatLabel}</div>
                        <div className="text-xs text-slate-500">{bill.residentName}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{bill.billingPeriod}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{formatDate(bill.dueDate)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-medium">{formatINR(bill.totalAmount)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">{formatINR(bill.amountPaid)}</td>
                      <td className={`px-4 py-3 text-xs font-semibold ${statusColorClass(bill.status)}`}>{bill.status}</td>
                      <td className="px-4 py-3 text-right">
                        {balance > 0 && bill.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setPayingBill(bill);
                              setPayAmount(String(balance));
                            }}
                            className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md cursor-pointer"
                          >
                            Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 text-sm font-semibold text-slate-900">
          Payments & Verification Queue
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Flat / Bill</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{p.transactionReference}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{p.flatLabel}</div>
                    <div className="text-xs text-slate-500 font-mono">{p.billNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.method}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums font-medium">{formatINR(p.amount)}</td>
                  <td className={`px-4 py-3 text-xs font-semibold ${statusColorClass(p.status)}`}>{p.status}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {isAdmin && p.status === 'PENDING_VERIFICATION' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleVerify(p.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(p.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                    {p.status === 'VERIFIED' && p.receiptNumber && (
                      <button
                        type="button"
                        onClick={() => setReceiptPayment(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" /> Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {payingBill && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSubmitPayment} className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Submit Payment — {payingBill.billNumber}</h3>
              <button type="button" onClick={() => setPayingBill(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS)</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Transaction / UTR Reference</label>
              <input
                type="text"
                required
                minLength={4}
                placeholder="e.g. UPI/432891029384"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayingBill(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg cursor-pointer"
              >
                Submit Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {receiptPayment && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="text-sm font-bold text-slate-900">Green Valley Residency</div>
                <div className="text-xs text-slate-500">Official Payment Receipt</div>
              </div>
              <button type="button" onClick={() => setReceiptPayment(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No.</span>
                <span className="font-mono font-semibold">{receiptPayment.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bill No.</span>
                <span className="font-mono">{receiptPayment.billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Flat</span>
                <span className="font-medium">{receiptPayment.flatLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-mono font-bold text-emerald-700">{formatINR(receiptPayment.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method / Ref</span>
                <span className="font-mono text-xs">
                  {receiptPayment.method} · {receiptPayment.transactionReference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Verified By</span>
                <span>{receiptPayment.verifiedBy}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg cursor-pointer"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
