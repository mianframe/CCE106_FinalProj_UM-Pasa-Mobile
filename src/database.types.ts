export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  student_number: string | null;
  full_name: string;
  department: string | null;
  program: string | null;
  role: 'student' | 'admin';
  created_at: string;
  updated_at: string;
};

export type ItemRow = {
  id: string;
  seller_id: string;
  title: string;
  category: string;
  description: string;
  department: string;
  program: string | null;
  course_code: string;
  listing_type: 'sell' | 'rent';
  accepted_payment_methods: string[];
  minimum_rental_days: number | null;
  maximum_rental_days: number | null;
  daily_rental_rate: number | string | null;
  rental_duration_days: number | null;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  price: number | string | null;
  image_path: string | null;
  status: 'available' | 'pending' | 'sold';
  moderation_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TransactionRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  item_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  payment_method: 'gcash' | 'maya' | 'bank_transfer' | 'cash_on_pickup' | 'other';
  other_payment_method: string | null;
  rental_duration_days: number | null;
  rental_due_date: string | null;
  payment_proof_path: string | null;
  payment_proof_uploaded_at: string | null;
  meetup_location: string | null;
  meetup_time: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationRow = {
  id: string;
  starter_id: string;
  recipient_id: string;
  item_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  type: 'text' | 'meetup_proposal' | 'system';
  proposal_status: string | null;
  meetup_location: string | null;
  meetup_time: string | null;
  meta: Json | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RatingRow = {
  id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  transaction_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  message: string;
  type: string;
  related_type: 'transaction' | 'conversation' | 'item' | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Pick<ProfileRow, 'id' | 'full_name'> & Partial<ProfileRow>, Partial<ProfileRow>>;
      items: Table<ItemRow, Omit<ItemRow, 'id' | 'archived_at' | 'created_at' | 'updated_at'> & Partial<Pick<ItemRow, 'id' | 'archived_at' | 'created_at' | 'updated_at'>>, Partial<ItemRow>>;
      transactions: Table<TransactionRow, Omit<TransactionRow, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<TransactionRow, 'id' | 'created_at' | 'updated_at'>>, Partial<TransactionRow>>;
      conversations: Table<ConversationRow, Omit<ConversationRow, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<ConversationRow, 'id' | 'created_at' | 'updated_at'>>, Partial<ConversationRow>>;
      messages: Table<MessageRow, Omit<MessageRow, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<MessageRow, 'id' | 'created_at' | 'updated_at'>>, Partial<MessageRow>>;
      ratings: Table<RatingRow, Omit<RatingRow, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<RatingRow, 'id' | 'created_at' | 'updated_at'>>, Partial<RatingRow>>;
      notifications: Table<NotificationRow, Omit<NotificationRow, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<NotificationRow, 'id' | 'created_at' | 'updated_at'>>, Partial<NotificationRow>>;
    };
    Views: Record<string, never>;
    Functions: {
      save_listing: { Args: { p_item_id: string | null; p_data: Json }; Returns: string };
      delete_listing: { Args: { p_item_id: string }; Returns: boolean };
      mark_listing_sold: { Args: { p_item_id: string }; Returns: string };
      request_item: { Args: { p_item_id: string; p_payment_method: string; p_other_payment_method?: string | null; p_rental_duration_days?: number | null }; Returns: string };
      approve_transaction: { Args: { p_transaction_id: string; p_meetup_location: string; p_meetup_time: string }; Returns: string };
      reject_transaction: { Args: { p_transaction_id: string }; Returns: string };
      complete_transaction: { Args: { p_transaction_id: string }; Returns: string };
      rate_transaction: { Args: { p_transaction_id: string; p_rating: number; p_comment?: string | null }; Returns: string };
      set_item_moderation: { Args: { p_item_id: string; p_status: 'approved' | 'rejected'; p_rejection_reason?: string | null }; Returns: string };
      send_message: { Args: { p_conversation_id?: string | null; p_recipient_id?: string | null; p_item_id?: string | null; p_body?: string | null; p_type?: string; p_meetup_location?: string | null; p_meetup_time?: string | null }; Returns: string };
      respond_to_meetup_proposal: { Args: { p_message_id: string; p_accept: boolean }; Returns: string };
      admin_list_profiles: { Args: Record<string, never>; Returns: { id: string; email: string; full_name: string; role: 'student' | 'admin'; student_number: string | null; created_at: string }[] };
      public_profile_summaries: { Args: { p_ids: string[] }; Returns: { id: string; full_name: string; role: 'student' | 'admin' }[] };
      public_profile_reviews: { Args: { p_user_id: string }; Returns: { review_id: string; rating: number; comment: string | null; created_at: string; reviewer_name: string; item_title: string | null }[] };
      admin_set_profile_role: { Args: { p_user_id: string; p_role: 'student' | 'admin' }; Returns: undefined };
      delete_user_account: { Args: Record<string, never>; Returns: undefined };
      delete_conversation: { Args: { p_conversation_id: string }; Returns: boolean };
      mark_conversation_read: { Args: { p_conversation_id: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
