'use client';

import { useMutation } from 'convex/react';
import { useState } from 'react';
import { Button } from 'react-bootstrap';
import { toast } from 'sonner';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { formatPropertyMoney } from '../../../inventory-management/components/money';

type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'other';

type PaymentEvidence = {
  kind: 'receipt' | 'cash_attestation';
  fileName?: string | null;
  note?: string | null;
  fileUrl?: string | null;
  createdAt: number;
};

type ReservationPayment = {
  _id: string;
  amount: number;
  paymentMethod: string;
  paidAt?: number;
  evidence?: PaymentEvidence | null;
};

const STATUS_LABEL: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-600', text: 'Pending' },
  confirmed: { bg: 'bg-blue-600', text: 'Confirmed' },
  'checked-in': { bg: 'bg-green-600', text: 'Checked In' },
  'checked-out': { bg: 'bg-gray-600', text: 'Checked Out' },
  cancelled: { bg: 'bg-red-600', text: 'Cancelled' },
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'other', label: 'Other' },
];

export function ReservationStatusBadge({ status }: { status: string }) {
  const config = STATUS_LABEL[status] || { bg: 'bg-gray-400', text: status };
  return (
    <p className={`w-fit h-fit px-2 py-1 text-white rounded-sm ${config.bg}`}>
      {config.text}
    </p>
  );
}

export function ReservationPaymentHistory({
  payments,
  currency,
}: {
  payments: ReservationPayment[];
  currency?: string;
}) {
  if (!payments.length) {
    return (
      <p className="mb-4 text-sm text-gray-600">No guest payments recorded yet.</p>
    );
  }

  return (
    <div className="mb-4 rounded border border-gray-200 p-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">Payment evidence</p>
      <ul className="mb-0 space-y-2 text-sm">
        {payments.map((payment) => (
          <li key={payment._id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
            <div>
              <p className="mb-0 font-medium">
                {formatPropertyMoney(payment.amount, currency)} · {payment.paymentMethod.replace('_', ' ')}
              </p>
              <p className="mb-0 text-gray-600">
                {payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '—'}
              </p>
              {payment.evidence?.kind === 'cash_attestation' && (
                <p className="mb-0 text-gray-700">
                  Cash attested{payment.evidence.note ? `: ${payment.evidence.note}` : ''}
                </p>
              )}
              {payment.evidence?.kind === 'receipt' && (
                <p className="mb-0 text-gray-700">
                  Receipt: {payment.evidence.fileName || 'file'}
                  {payment.evidence.fileUrl ? (
                    <>
                      {' · '}
                      <a href={payment.evidence.fileUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                        View
                      </a>
                    </>
                  ) : null}
                </p>
              )}
              {!payment.evidence && (
                <p className="mb-0 text-amber-700">No evidence on file</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReservationLifecycleActions({
  reservationId,
  status,
  totalAmount,
  paidTotal = 0,
  depositAmount = 0,
  currency,
  layout = 'full',
}: {
  reservationId: Id<'reservations'>;
  status: string;
  totalAmount: number;
  paidTotal?: number;
  depositAmount?: number;
  currency?: string;
  layout?: 'full' | 'compact';
}) {
  const confirmReservation = useMutation(api.reservations.confirmReservation);
  const checkInReservation = useMutation(api.reservations.checkInReservation);
  const checkOutReservation = useMutation(api.reservations.checkOutReservation);
  const cancelReservation = useMutation(api.reservations.cancelReservation);
  const generateUploadUrl = useMutation(api.reservations.generateReservationPaymentUploadUrl);

  const [busy, setBusy] = useState(false);
  const [collecting, setCollecting] = useState<'check-in' | 'check-out' | null>(null);
  const credited = Math.max(paidTotal, depositAmount);
  const remaining = Math.max(0, totalAmount - credited);
  const [amount, setAmount] = useState(remaining);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cashAttested, setCashAttested] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const canConfirm = status === 'pending';
  const canCheckIn = status === 'pending' || status === 'confirmed';
  const canCheckOut = status === 'checked-in';
  const canCancel = status === 'pending' || status === 'confirmed';
  const needsEvidence = Number.isFinite(amount) && amount > 0;

  const run = async (action: () => Promise<{ success: boolean; message: string }>) => {
    setBusy(true);
    try {
      const response = await action();
      if (response.success) {
        toast.success(response.message);
        setCollecting(null);
        setCashAttested(false);
        setReceiptFile(null);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error(error);
      toast.error('Reservation action failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const startCollecting = (kind: 'check-in' | 'check-out') => {
    setAmount(remaining);
    setMethod('cash');
    setCashAttested(false);
    setReceiptFile(null);
    setCollecting(kind);
  };

  const submitCollection = async () => {
    const collected = Number.isFinite(amount) ? amount : 0;
    if (collected > 0) {
      if (method === 'cash' && !cashAttested) {
        toast.error('Confirm cash was received and counted');
        return;
      }
      if (method !== 'cash' && !receiptFile) {
        toast.error('Attach a receipt or transfer confirmation');
        return;
      }
    }

    let evidence:
      | {
          cashAttested?: boolean;
          evidenceStorageId?: Id<'_storage'>;
          evidenceFileName?: string;
          evidenceMimeType?: string;
          evidenceFileSize?: number;
        }
      | undefined;

    if (collected > 0) {
      if (method === 'cash') {
        evidence = { cashAttested: true };
      } else if (receiptFile) {
        const postUrl = await generateUploadUrl({ reservationId });
        const result = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': receiptFile.type || 'application/octet-stream' },
          body: receiptFile,
        });
        if (!result.ok) {
          toast.error('Failed to upload payment evidence');
          return;
        }
        const { storageId } = (await result.json()) as { storageId: Id<'_storage'> };
        evidence = {
          evidenceStorageId: storageId,
          evidenceFileName: receiptFile.name,
          evidenceMimeType: receiptFile.type || undefined,
          evidenceFileSize: receiptFile.size,
        };
      }
    }

    if (collecting === 'check-in') {
      return run(() =>
        checkInReservation({
          reservationId,
          amountCollected: collected,
          paymentMethod: method,
          ...evidence,
        }),
      );
    }
    return run(() =>
      checkOutReservation({
        reservationId,
        amountCollected: collected,
        paymentMethod: method,
        ...evidence,
      }),
    );
  };

  const paymentFields = collecting ? (
    <div className={layout === 'full' ? 'mt-3 grid gap-2 sm:grid-cols-2' : 'mt-2 flex flex-col gap-2'}>
      <label className="text-sm">
        Amount collected{currency ? ` (${currency})` : ''}
        <input
          type="number"
          min={0}
          step="0.01"
          value={Number.isFinite(amount) ? amount : 0}
          onChange={(event) => setAmount(Number(event.target.value))}
          className="mt-1 w-full border rounded p-2"
        />
      </label>
      <label className="text-sm">
        Method
        <select
          value={method}
          onChange={(event) => {
            setMethod(event.target.value as PaymentMethod);
            setCashAttested(false);
            setReceiptFile(null);
          }}
          className="mt-1 w-full border rounded p-2"
        >
          {PAYMENT_METHODS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {needsEvidence && method === 'cash' && (
        <label className="text-sm sm:col-span-2 flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={cashAttested}
            onChange={(event) => setCashAttested(event.target.checked)}
          />
          <span>Cash received and counted at the desk</span>
        </label>
      )}
      {needsEvidence && method !== 'cash' && (
        <label className="text-sm sm:col-span-2">
          Receipt / transfer confirmation *
          <input
            type="file"
            accept="image/*,.pdf"
            className="mt-1 block w-full text-sm"
            onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
          />
        </label>
      )}
      <div className="flex items-end gap-2 sm:col-span-2">
        <Button variant="dark" size="sm" disabled={busy} onClick={() => void submitCollection()}>
          {collecting === 'check-in' ? 'Complete check-in' : 'Complete check-out'}
        </Button>
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => setCollecting(null)}>
          Back
        </Button>
      </div>
    </div>
  ) : null;

  if (layout === 'compact') {
    return (
      <div className="flex flex-col items-start gap-1">
        <div className="flex flex-wrap items-center gap-1">
          {canConfirm && (
            <Button
              variant="outline-primary"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (!confirm('Confirm this reservation?')) return;
                void run(() => confirmReservation({ reservationId }));
              }}
            >
              Confirm
            </Button>
          )}
          {canCheckIn && (
            <Button variant="outline-success" size="sm" disabled={busy} onClick={() => startCollecting('check-in')}>
              Check in
            </Button>
          )}
          {canCheckOut && (
            <Button variant="outline-dark" size="sm" disabled={busy} onClick={() => startCollecting('check-out')}>
              Check out
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline-danger"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (!confirm('Cancel this reservation?')) return;
                void run(() => cancelReservation({ reservationId }));
              }}
            >
              Cancel
            </Button>
          )}
        </div>
        {paymentFields}
      </div>
    );
  }

  return (
    <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">Stay status</p>
          <ReservationStatusBadge status={status} />
        </div>
        <div className="text-sm text-gray-700">
          <p className="mb-0"><strong>Total:</strong> {formatPropertyMoney(totalAmount, currency)}</p>
          <p className="mb-0"><strong>Paid:</strong> {formatPropertyMoney(credited, currency)}</p>
          <p className="mb-0"><strong>Balance:</strong> {formatPropertyMoney(remaining, currency)}</p>
        </div>
      </div>
      <p className="mt-2 mb-0 text-sm text-gray-600">
        Status changes only through these actions. Payment over zero needs evidence — cash attestation or a receipt file.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {canConfirm && (
          <Button
            variant="outline-primary"
            disabled={busy}
            onClick={() => {
              if (!confirm('Confirm this reservation?')) return;
              void run(() => confirmReservation({ reservationId }));
            }}
          >
            Confirm
          </Button>
        )}
        {canCheckIn && (
          <Button variant="success" disabled={busy} onClick={() => startCollecting('check-in')}>
            Check in
          </Button>
        )}
        {canCheckOut && (
          <Button variant="dark" disabled={busy} onClick={() => startCollecting('check-out')}>
            Check out
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outline-danger"
            disabled={busy}
            onClick={() => {
              if (!confirm('Cancel this reservation?')) return;
              void run(() => cancelReservation({ reservationId }));
            }}
          >
            Cancel stay
          </Button>
        )}
      </div>
      {paymentFields}
    </div>
  );
}
