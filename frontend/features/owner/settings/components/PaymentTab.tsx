'use client';

import {useState} from 'react';
import Image from 'next/image';
import {toast} from 'sonner';
import {Plus, Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
  useSettingsQuery,
  useUpdateSettingsMutation
} from '@/lib/hooks/useSettings';
import {uploadPaymentImage} from '@/lib/api/uploadApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import type {
  PaymentChannel,
  PaymentSection,
  SiteSetting
} from '@/lib/types/settings';

const EMPTY_PAYMENT: PaymentSection = {
  image: '',
  accountName: '',
  accountNumber: '',
  instructions: '',
  channels: [],
  activeChannelId: ''
};

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `ch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getDefaultChannels(): PaymentChannel[] {
  return [
    {
      id: createId(),
      name: 'GCash',
      image: '',
      accountName: '',
      accountNumber: '',
      instructions: '',
      enabled: true
    },
    {
      id: createId(),
      name: 'Maya',
      image: '',
      accountName: '',
      accountNumber: '',
      instructions: '',
      enabled: true
    },
    {
      id: createId(),
      name: 'Bank',
      image: '',
      accountName: '',
      accountNumber: '',
      instructions: '',
      enabled: true
    }
  ];
}

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
      <div className="rounded-2xl bg-white dark:bg-gray-900 shadow p-10 text-sm text-gray-500 dark:text-gray-400">
        Loading payment settings...
      </div>
    );
  }

  if (!settingsQuery.data) {
    return (
      <div className="rounded-2xl bg-white dark:bg-gray-900 shadow p-10 text-sm text-red-600">
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

  const initialChannels =
    payment.channels && payment.channels.length > 0
      ? payment.channels.map(ch => ({
          id: ch.id || createId(),
          name: ch.name || '',
          image: ch.image || '',
          accountName: ch.accountName || '',
          accountNumber: ch.accountNumber || '',
          instructions: ch.instructions || '',
          enabled: ch.enabled !== false
        }))
      : getDefaultChannels();

  const [channels, setChannels] = useState<PaymentChannel[]>(initialChannels);
  const [activeChannelId, setActiveChannelId] = useState(
    payment.activeChannelId || initialChannels[0]?.id || ''
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const activeChannel =
    channels.find(ch => ch.id === activeChannelId) || channels[0];

  const updateChannel = (id: string, patch: Partial<PaymentChannel>) => {
    setChannels(prev =>
      prev.map(ch => (ch.id === id ? {...ch, ...patch} : ch))
    );
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
  };

  const handleAddChannel = () => {
    const newChannel: PaymentChannel = {
      id: createId(),
      name: `Channel ${channels.length + 1}`,
      image: '',
      accountName: '',
      accountNumber: '',
      instructions: '',
      enabled: true
    };
    setChannels(prev => [...prev, newChannel]);
    setActiveChannelId(newChannel.id);
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
  };

  const handleRemoveChannel = (id: string) => {
    if (channels.length <= 1) {
      toast.error('At least one payment channel is required.');
      return;
    }
    const next = channels.filter(ch => ch.id !== id);
    setChannels(next);
    if (activeChannelId === id) {
      setActiveChannelId(next[0]?.id || '');
    }
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
  };

  const handlePickImage = (file: File | null) => {
    if (!activeChannel) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setRemoveImage(false);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleRemoveImage = () => {
    if (!activeChannel) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    updateChannel(activeChannel.id, {image: ''});
    setRemoveImage(true);
  };

  const handleSave = async () => {
    let updatedChannels = [...channels];
    let uploadedUrl: string | undefined;
    const hasImage = !!(activeChannel && imageFile);

    if (hasImage) setIsUploadingImage(true);

    try {
      if (activeChannel && imageFile) {
        if (!imageFile.type.startsWith('image/')) {
          toast.error('The payment image must be an image file.');
          setIsUploadingImage(false);
          return;
        }
        if (imageFile.size > 5 * 1024 * 1024) {
          toast.error('The payment image must be 5 MB or smaller.');
          setIsUploadingImage(false);
          return;
        }
        const res = await uploadPaymentImage(imageFile);
        uploadedUrl = res.imageUrl;
        updatedChannels = updatedChannels.map(ch =>
          ch.id === activeChannelId ? {...ch, image: uploadedUrl || ''} : ch
        );
        setChannels(updatedChannels);
      }
    } catch (error) {
      toast.error(
        getFriendlyErrorMessage(error, 'Failed to upload the payment image')
      );
      setIsUploadingImage(false);
      return;
    }

    const activeUpdatedChannel =
      updatedChannels.find(ch => ch.id === activeChannelId) ||
      updatedChannels[0];
    const paymentPayload = {
      ...payment,
      image: activeUpdatedChannel?.image || '',
      accountName: activeUpdatedChannel?.accountName || '',
      accountNumber: activeUpdatedChannel?.accountNumber || '',
      instructions: activeUpdatedChannel?.instructions || '',
      channels: updatedChannels,
      activeChannelId
    };

    updateMutation.mutate(
      {
        ...settings,
        payment: paymentPayload
      },
      {
        onSuccess: () => {
          toast.success('Payment instructions updated.');
          setImageFile(null);
          setImagePreview(null);
          setRemoveImage(false);
          setIsUploadingImage(false);
        },
        onError: error => {
          toast.error(
            getFriendlyErrorMessage(
              error,
              'Failed to update payment instructions'
            )
          );
          setIsUploadingImage(false);
        }
      }
    );
  };

  const isSaving = isUploadingImage || updateMutation.isPending;
  const shownImage =
    imagePreview ?? (activeChannel?.image ? activeChannel.image : null);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white dark:bg-gray-900 shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Payment instructions
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Add multiple payment channels (e.g., GCash, Maya, Bank). Select a
          channel above to edit its details and image. Customers will see the
          selected channel&apos;s details when paying.
        </p>

        <div className="mt-6">
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
            Payment method
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeChannelId}
              onChange={e => {
                setActiveChannelId(e.target.value);
                setImageFile(null);
                setImagePreview(null);
                setRemoveImage(false);
              }}
              className="h-10 rounded-lg border border-gray-200 dark:border-gray-700 px-3 text-sm"
            >
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>
                  {ch.name || 'Unnamed channel'}
                </option>
              ))}
            </select>
            <Input
              value={activeChannel?.name || ''}
              onChange={e =>
                activeChannel &&
                updateChannel(activeChannel.id, {name: e.target.value})
              }
              className="max-w-xs h-10"
              placeholder="Channel name"
            />
            <button
              type="button"
              onClick={() =>
                activeChannel &&
                setChannels(prev =>
                  prev.map(ch =>
                    ch.id === activeChannel.id
                      ? {...ch, enabled: !(ch.enabled !== false)}
                      : ch
                  )
                )
              }
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors ${
                activeChannel?.enabled !== false
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-gray-300 bg-gray-100 text-gray-500'
              }`}
              aria-pressed={activeChannel?.enabled !== false}
            >
              <span
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  activeChannel?.enabled !== false
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                    activeChannel?.enabled !== false ? 'left-4' : 'left-0.5'
                  }`}
                />
              </span>
              {activeChannel?.enabled !== false ? 'On' : 'Off'}
            </button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddChannel}
            >
              <Plus size={14} className="mr-1" />
              Add Method
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-600"
              onClick={() =>
                activeChannel && handleRemoveChannel(activeChannel.id)
              }
            >
              <Trash2 size={14} className="mr-1" />
              Remove
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Account picture
            </p>
            <p className="text-xs mb-2 text-gray-500 dark:text-gray-400">
              A QR / screenshot for this payment method.
            </p>
            <label
              className={`block w-full cursor-pointer overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                shownImage
                  ? ''
                  : 'flex h-40 items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700'
              }`}
            >
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
                  width={0}
                  height={0}
                  sizes="100vw"
                  style={{width: '100%', height: 'auto'}}
                  className="block"
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
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Instructions
            </p>
            <textarea
              value={activeChannel?.instructions || ''}
              onChange={e =>
                activeChannel &&
                updateChannel(activeChannel.id, {instructions: e.target.value})
              }
              rows={5}
              placeholder="e.g. Send your payment through this method, take a screenshot of the receipt, then upload it below."
              className="mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-[#3c5e45] focus:ring-2 focus:ring-[#3c5e45]/20"
            />
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
