import {adminRepository} from '../repositories/admin.repository';

interface StoreStatusResult {
  isOpen: boolean;
  closingTime: string;
  advanceCloseMinutes: number;
  isManuallyClosed: boolean;
  manualCloseReason: string;
  closesAt: string;
  reason?: string;
  reopenMessage: string;
}

function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time24;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export const storeStatusService = {
  async getStoreStatus(): Promise<StoreStatusResult> {
    const admins = await adminRepository.listAll();
    const admin = admins[0];

    if (!admin) {
      return {
        isOpen: false,
        closingTime: '22:00',
        advanceCloseMinutes: 30,
        isManuallyClosed: false,
        manualCloseReason: '',
        closesAt: '10:00 PM',
        reason: 'Store not configured',
        reopenMessage: 'Please check back later'
      };
    }

    const closingTime = admin.closingTime || '22:00';
    const advanceCloseMinutes = admin.advanceCloseMinutes || 30;
    const isManuallyClosed = admin.isManuallyClosed || false;
    const manualCloseReason = admin.manualCloseReason || '';

    if (isManuallyClosed) {
      return {
        isOpen: false,
        closingTime,
        advanceCloseMinutes,
        isManuallyClosed,
        manualCloseReason,
        closesAt: formatTime12h(closingTime),
        reason: manualCloseReason || 'Temporarily closed by management',
        reopenMessage: 'We will reopen once the issue is resolved'
      };
    }

    const now = new Date();
    const [closingHours, closingMinutes] = closingTime.split(':').map(Number);

    const effectiveCloseTime = new Date(now);
    effectiveCloseTime.setHours(closingHours, closingMinutes - advanceCloseMinutes, 0, 0);

    const isPastClosing = now >= effectiveCloseTime;

    if (isPastClosing) {
      return {
        isOpen: false,
        closingTime,
        advanceCloseMinutes,
        isManuallyClosed,
        manualCloseReason,
        closesAt: formatTime12h(closingTime),
        reason: 'Store hours have ended',
        reopenMessage: 'We open again tomorrow'
      };
    }

    return {
      isOpen: true,
      closingTime,
      advanceCloseMinutes,
      isManuallyClosed,
      manualCloseReason,
      closesAt: formatTime12h(closingTime),
      reason: undefined,
      reopenMessage: ''
    };
  },

  async updateStoreSettings(data: {
    closingTime?: string;
    advanceCloseMinutes?: number;
    isManuallyClosed?: boolean;
    manualCloseReason?: string;
  }) {
    const admins = await adminRepository.listAll();
    const admin = admins[0];

    if (!admin) {
      throw new Error('No admin found');
    }

    const updateData: Record<string, unknown> = {};
    if (data.closingTime !== undefined) updateData.closingTime = data.closingTime;
    if (data.advanceCloseMinutes !== undefined) updateData.advanceCloseMinutes = data.advanceCloseMinutes;
    if (data.isManuallyClosed !== undefined) updateData.isManuallyClosed = data.isManuallyClosed;
    if (data.manualCloseReason !== undefined) updateData.manualCloseReason = data.manualCloseReason;

    const updated = await adminRepository.updateProfile(admin._id.toString(), updateData);

    if (!updated) {
      throw new Error('Failed to update store settings');
    }

    return {
      closingTime: updated.closingTime,
      advanceCloseMinutes: updated.advanceCloseMinutes,
      isManuallyClosed: updated.isManuallyClosed,
      manualCloseReason: updated.manualCloseReason
    };
  }
};
