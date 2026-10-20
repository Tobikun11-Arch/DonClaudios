'use client';

import {useState} from 'react';
import Image from 'next/image';
import {toast} from 'sonner';
import {Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
  useSettingsQuery,
  useUpdateSettingsMutation
} from '@/lib/hooks/useSettings';
import {uploadPaymentImage} from '@/lib/api/uploadApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import type {PaymentSection, SiteSetting} from '@/lib/types/settings';

const EMPTY_PAYMENT: PaymentSection = {
  image: '',
  accountName: '',
  accountNumber: '',
  instructions: ''
};

/**
 * Owner-facing editor for the MANUAL PAYMENT instructions. Everything saved
 * here is what the customer sees on their order page AFTER the cashier
 * confirms the order: the account picture, the account name/number and the
 * "how to send payment" text.
 */
export function PaymentTab() {
  const settingsQuery = useSettingsQuery();

  if (settingsQuery.isLoading && !settingsQuery.data) {
    return (
      <div className="rounded-2xl bg-white shadow p-10 text-sm text-gray-500">
        Loading payment settings...
      </div>
    );
  }

  if (!settingsQuery.data) {
    return (
      <div className="rounded-2xl bg-white shadow p-10 text-sm text-red-600">
        Failed to load payment settings.
      </div>
    );
  }

  return (
    <PaymentForm
      key={JSON.stringify(settingsQuery.data.payment)}
      settings={settingsQuery.data}
    />
  );
}

function PaymentForm({settings}: {settings: SiteSetting}) {
  const payment = settings.payment ?? EMPTY_PAYMENT;
  const updateMutation = useUpdateSettingsMutation();

  const [accountName, setAccountName] = useState(payment.accountName);
  const [accountNumber, setAccountNumber] = useState(payment.accountNumber);
  const [instructions, setInstructions] = useState(payment.instructions);
  const [existingImage, setExistingImage] = useState(payment.image);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const handlePickImage = (file: File | null) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setRemoveImage(false);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setExistingImage('');
    setRemoveImage(true);
  };

  const handleSave = async () => {
    let imageUrl: string | null | undefined;
    try {
      if (imageFile) {
        if (!imageFile.type.startsWith('image/')) {
          toast.error('The payment image must be an image file.');
          return;
        }
        if (imageFile.size > 5 * 1024 * 1024) {
          toast.error('The payment image must be 5 MB or smaller.');
          return;
        }
        const res = await uploadPaymentImage(imageFile);
        imageUrl = res.imageUrl;
      } else if (removeImage) {
        imageUrl = null;
      }
    } catch (error) {
      toast.error(
        getFriendlyErrorMessage(error, 'Failed to upload the payment image')
      );
      return;
    }

    updateMutation.mutate(
      {
        ...settings,
        payment: {
          image: imageUrl !== undefined ? (imageUrl ?? '') : existingImage,
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          instructions
        }
      },
      {
        onSuccess: () => {
          toast.success('Payment instructions updated.');
          setImageFile(null);
          setImagePreview(null);
          setRemoveImage(false);
        },
        onError: error =>
          toast.error(
            getFriendlyErrorMessage(
              error,
              'Failed to update payment instructions'
            )
          )
      }
    );
  };

  const isSaving = updateMutation.isPending;
  const shownImage = imagePreview ?? (existingImage || null);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white shadow p-6">
        <h2 className="text-lg font-bold text-gray-900">Payment instructions</h2>
        <p className="mt-1 text-sm text-gray-500">
          Shown to customers on their order page after your cashier confirms
          the order (never before). Customers upload their payment proof here
          too, so make the details easy to follow.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-gray-900">Account picture</p>
              <p className="text-xs text-gray-500">
                A QR / screenshot of your GCash, Maya or bank account.
              </p>
              <label className="mt-2 flex h-36 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handlePickImage(e.target.files?.[0] ?? null)}
                />
                {shownImage ? (
                  <Image
                    src={shownImage}
                    alt="Payment account"
                    width={640}
                    height={288}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="px-4 text-center text-sm font-semibold text-[#3c5e45]">
                    Click to upload an image
                  </span>
                )}
              </label>
              {shownImage ? (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
                >
                  <Trash2 size={12} />
                  Remove image
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-gray-900">Account name</p>
              <Input
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                placeholder="e.g. DonClaudio's Lechon House"
                className="mt-2"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Account number</p>
              <Input
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                placeholder="e.g. 0917 123 4567 / BPI 1234-5678-90"
                className="mt-2"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                Payment instructions
              </p>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={5}
                placeholder="e.g. Send your payment through GCash or bank transfer, take a screenshot of the receipt, then upload it below the instructions on your order page."
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#3c5e45] focus:ring-2 focus:ring-[#3c5e45]/20"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            className="rounded-full bg-[#3c5e45] text-white hover:bg-[#3c5e45]"
            disabled={isSaving}
            onClick={handleSave}
          >
            {isSaving ? 'Saving...' : 'Save payment instructions'}
          </Button>
        </div>
      </div>
    </div>
  );
}
