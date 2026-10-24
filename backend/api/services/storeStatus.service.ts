import {adminRepository} from '../repositories/admin.repository';

interface StoreStatusResult {
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  advanceCloseMinutes: number;
  isManuallyClosed: boolean;
  isManuallyOpen: boolean;
  forceOpen: boolean;
  manualOverride: 'open' | 'closed' | null;
  closesAt: string;
  reason?: string;
  reopenMessage: string;
}

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time24;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function timeToMsOfDay(time24: string): number {
  const [hours, minutes] = time24.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return (hours || 0) * 60 * 60 * 1000 + (minutes || 0) * 60 * 1000;
}

function manilaMsOfDay(now: Date): number {
  const shifted = new Date(now.getTime() + MANILA_OFFSET_MS);
  return (
    shifted.getUTCHours() * 60 * 60 * 1000 +
    shifted.getUTCMinutes() * 60 * 1000 +
    shifted.getUTCSeconds() * 1000 +
    shifted.getUTCMilliseconds()
  );
}

export const storeStatusService = {
  async getStoreStatus(): Promise<StoreStatusResult> {
    const admins = await adminRepository.listAll();
    const admin = admins[0];

    if (!admin) {
      return {
        isOpen: false,
        openingTime: '08:00',
        closingTime: '22:00',
        advanceCloseMinutes: 30,
        isManuallyClosed: false,
        isManuallyOpen: false,
        forceOpen: false,
        manualOverride: null,
        closesAt: '10:00 PM',
        reason: 'Store not configured',
        reopenMessage: 'Please check back later'
      };
    }

    const openingTime = admin.openingTime || '08:00';
    const closingTime = admin.closingTime || '22:00';
    const advanceCloseMinutes = admin.advanceCloseMinutes || 30;
    const isManuallyClosed = admin.isManuallyClosed || false;
    const isManuallyOpen = admin.isManuallyOpen || false;

    if (isManuallyClosed) {
      return {
        isOpen: false,
        openingTime,
        closingTime,
        advanceCloseMinutes,
        isManuallyClosed: true,
        isManuallyOpen: false,
        forceOpen: false,
        manualOverride: 'closed',
        closesAt: formatTime12h(closingTime),
        reason: 'Temporarily closed by management',
        reopenMessage: 'We will reopen once the issue is resolved'
      };
    }

    if (isManuallyOpen) {
      return {
        isOpen: true,
        openingTime,
        closingTime,
        advanceCloseMinutes,
        isManuallyClosed: false,
        isManuallyOpen: true,
        forceOpen: true,
        manualOverride: 'open',
        closesAt: formatTime12h(closingTime),
        reason: undefined,
        reopenMessage: 'Manually opened by management'
      };
    }

    const nowMs = manilaMsOfDay(new Date());
    const openMs = timeToMsOfDay(openingTime);
    const closeMs = timeToMsOfDay(closingTime);
    const effectiveCloseMs = closeMs - advanceCloseMinutes * 60 * 1000;

    if (nowMs < openMs) {
      return {
        isOpen: false,
        openingTime,
        closingTime,
        advanceCloseMinutes,
        isManuallyClosed: false,
        isManuallyOpen: false,
        forceOpen: false,
        manualOverride: null,
        closesAt: formatTime12h(closingTime),
        reason: 'Store has not opened yet',
        reopenMessage: `We open at ${formatTime12h(openingTime)}`
      };
    }

    const isPastClosing = nowMs >= effectiveCloseMs;

    if (isPastClosing) {
      return {
        isOpen: false,
        openingTime,
        closingTime,
        advanceCloseMinutes,
        isManuallyClosed: false,
        isManuallyOpen: false,
        forceOpen: false,
        manualOverride: null,
        closesAt: formatTime12h(closingTime),
        reason: 'Store hours have ended',
        reopenMessage: 'We open again tomorrow'
      };
    }

    return {
      isOpen: true,
      openingTime,
      closingTime,
      advanceCloseMinutes,
      isManuallyClosed: false,
      isManuallyOpen: false,
      forceOpen: false,
      manualOverride: null,
      closesAt: formatTime12h(closingTime),
      reason: undefined,
      reopenMessage: ''
    };
  },

  async updateStoreSettings(data: {
    openingTime?: string;
    closingTime?: string;
    advanceCloseMinutes?: number;
    isManuallyClosed?: boolean;
    isManuallyOpen?: boolean;
    forceOpen?: boolean;
    manualOverride?: string | null;
  }) {
    const admins = await adminRepository.listAll();
    const admin = admins[0];

    if (!admin) {
      throw new Error('No admin found');
    }

    let nextClosed = data.isManuallyClosed;
    let nextOpen =
      data.isManuallyOpen !== undefined
        ? data.isManuallyOpen
        : data.forceOpen;

    if (data.manualOverride === 'open') {
      nextOpen = true;
      nextClosed = false;
    } else if (data.manualOverride === 'closed') {
      nextClosed = true;
      nextOpen = false;
    } else if (data.manualOverride === null) {
      nextClosed = false;
      nextOpen = false;
    }

    if (nextClosed === true) nextOpen = false;
    if (nextOpen === true) nextClosed = false;

    const updateData: Record<string, unknown> = {};
    if (data.openingTime !== undefined) updateData.openingTime = data.openingTime;
    if (data.closingTime !== undefined) updateData.closingTime = data.closingTime;
    if (data.advanceCloseMinutes !== undefined) updateData.advanceCloseMinutes = data.advanceCloseMinutes;
    if (nextClosed !== undefined) updateData.isManuallyClosed = nextClosed;
    if (nextOpen !== undefined) updateData.isManuallyOpen = nextOpen;

    const updated = await adminRepository.updateProfile(admin._id.toString(), updateData);

    if (!updated) {
      throw new Error('Failed to update store settings');
    }

    return {
      openingTime: updated.openingTime,
      closingTime: updated.closingTime,
      advanceCloseMinutes: updated.advanceCloseMinutes,
      isManuallyClosed: updated.isManuallyClosed,
      isManuallyOpen: updated.isManuallyOpen,
      forceOpen: updated.isManuallyOpen,
      manualOverride: updated.isManuallyClosed
        ? 'closed'
        : updated.isManuallyOpen
          ? 'open'
          : null
    };
  }
};