import type {JwtPayload} from '../middleware/auth';
import type {OrderActor} from '../models/Order.model';
import {cashierRepository} from '../repositories/cashier.repository';
import {adminRepository} from '../repositories/admin.repository';
import {customerRepository} from '../repositories/customer.repository';

function fullName(user: any): string | null {
  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.username || user.email || null;
}

/** Display name of a signed-in user, or null when it can't be found. */
export async function lookupUserName(
  type: 'customer' | 'cashier' | 'admin',
  userId: string
): Promise<string | null> {
  try {
    const user =
      type === 'cashier'
        ? await cashierRepository.findById(userId)
        : type === 'admin'
          ? await adminRepository.findById(userId)
          : await customerRepository.findById(userId);
    return fullName(user);
  } catch {
    return null;
  }
}

/**
 * Who is making a change, for order history and staff logs. A request with
 * no signed-in user is a guest.
 */
export async function resolveActor(auth?: JwtPayload | null): Promise<OrderActor> {
  if (!auth?.userId || !auth.type) return {id: null, type: 'guest', name: null};
  return {
    id: String(auth.userId),
    type: auth.type,
    name: await lookupUserName(auth.type, String(auth.userId))
  };
}

/** "Ana Cruz (cashier)" style label. */
export function actorLabel(actor?: OrderActor | null): string {
  if (!actor) return 'someone';
  const role =
    actor.type === 'admin' ? 'owner' : actor.type === 'system' ? 'system' : actor.type;
  return actor.name ? `${actor.name} (${role})` : role;
}
