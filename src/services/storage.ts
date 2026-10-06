import { supabase } from '../supabase';
import { currentAuthUser } from './common';

export async function uploadItemImage(uri: string): Promise<string> {
  const user = await currentAuthUser();
  const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
  const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
  if (arrayBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image file is too large. Please select a photo under 5MB.');
  }

  const { error } = await supabase.storage.from('items').upload(fileName, arrayBuffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload listing photo: ${error.message}`);
  }

  const { data } = supabase.storage.from('items').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function uploadPaymentProof(transactionId: string, uri: string): Promise<string> {
  await currentAuthUser();
  const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${transactionId}/${Date.now()}_proof.${fileExt}`;
  const contentType = fileExt === 'png' ? 'image/png' : fileExt === 'pdf' ? 'application/pdf' : 'image/jpeg';

  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
  if (arrayBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error('Payment proof file is too large. Please select an image under 5MB.');
  }

  const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(fileName, arrayBuffer, {
    contentType,
    upsert: true,
  });

  if (uploadError) {
    throw new Error(`Failed to upload payment proof: ${uploadError.message}`);
  }

  const { error: updateError } = await supabase.from('transactions').update({
    payment_proof_path: fileName,
    payment_proof_uploaded_at: new Date().toISOString(),
  }).eq('id', transactionId);

  if (updateError) {
    throw new Error(`Payment proof uploaded, but failed to link transaction: ${updateError.message}`);
  }

  return fileName;
}

export async function getPaymentProofSignedUrl(filePath: string): Promise<string | null> {
  if (!filePath) return null;
  const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(filePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
