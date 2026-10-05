// Compatibility facade for the existing screens. Implementations are Supabase
// queries/RPCs in src/services; no Laravel API or bearer-token client remains.
export { errorMessage } from './services/common';
export type { UMUser as User } from './services/common';
export { marketplace } from './services/items';
export type { Item, ItemFilters } from './services/items';
export { transactions } from './services/transactions';
export type { Transaction, Rating } from './services/transactions';
export { account } from './services/account';
export { messaging } from './services/messaging';
export type { Conversation, Message } from './services/messaging';
export { notifications } from './services/notifications';
export type { Notice } from './services/notifications';
export { admin } from './services/admin';
export { uploadItemImage, uploadPaymentProof, getPaymentProofSignedUrl } from './services/storage';
