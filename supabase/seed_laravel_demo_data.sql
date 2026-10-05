-- ============================================================
-- UM-PASA: LARAVEL SEEDER TO SUPABASE POSTGRESQL TRANSLATION
-- Translates DatabaseSeeder.php into Supabase
--
-- Includes:
-- 1. All users with role, profile, and password 'password'
-- 2. All 8 items (sales, rentals, pending, rejected, sold)
-- 3. All 4 transactions (pending, approved with proof, completed sale, overdue rental)
-- 4. All conversations & messages (including meetup proposal)
-- 5. All ratings and reviews
-- 6. All 11 notifications
-- ============================================================

create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;
set search_path = public, extensions, auth;

-- Helper function to seed or update an auth user and public profile
create or replace function private.seed_or_get_user(
  p_email text,
  p_name text,
  p_role text,
  p_dept text default null,
  p_prog text default null,
  p_student_no text default null
) returns uuid
language plpgsql
security definer
as $seed_user$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = lower(trim(p_email));
  if v_user_id is null then
    v_user_id := gen_random_uuid();
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmed_at,
      is_sso_user,
      is_anonymous,
      is_super_admin,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      lower(trim(p_email)),
      extensions.crypt('password', extensions.gen_salt('bf')),
      now(),
      now(),
      false,
      false,
      false,
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_name, 'role', p_role),
      now(),
      now()
    );
  else
    update auth.users
    set encrypted_password = extensions.crypt('password', extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = jsonb_build_object('full_name', p_name, 'role', p_role),
        updated_at = now()
    where id = v_user_id;
  end if;

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(p_email)), 'email_verified', true, 'full_name', p_name),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  ) on conflict (provider, provider_id) do nothing;

  insert into public.profiles (
    id,
    full_name,
    student_number,
    department,
    program,
    role,
    created_at,
    updated_at
  ) values (
    v_user_id,
    p_name,
    p_student_no,
    p_dept,
    p_prog,
    p_role,
    now(),
    now()
  ) on conflict (id) do update set
    full_name = excluded.full_name,
    student_number = coalesce(excluded.student_number, public.profiles.student_number),
    department = coalesce(excluded.department, public.profiles.department),
    program = coalesce(excluded.program, public.profiles.program),
    role = excluded.role,
    updated_at = now();

  return v_user_id;
end;
$seed_user$;

do $seeder$
declare
  v_admin_id uuid;
  v_student_id uuid;
  v_seller_id uuid;
  v_buyer_id uuid;
  v_renter_id uuid;
  v_seller2_id uuid;

  v_item_calc uuid;
  v_item_arduino uuid;
  v_item_uniform uuid;
  v_item_manual uuid;
  v_item_dsa uuid;
  v_item_acc uuid;
  v_item_java uuid;
  v_item_clicker uuid;

  v_tx_pending uuid;
  v_tx_approved uuid;
  v_tx_completed uuid;
  v_tx_rental uuid;

  v_conv_buyer uuid;
  v_conv_renter uuid;
begin
  -- ------------------------------------------------------------
  -- 1. SEED ALL BASE & DEMO USERS (Password: 'password')
  -- ------------------------------------------------------------
  v_admin_id := private.seed_or_get_user(
    'admin@umindanao.edu.ph',
    'Admin User',
    'admin',
    'Department of Computing Education',
    'BS in Information Technology',
    'UM-ADMIN-01'
  );

  v_student_id := private.seed_or_get_user(
    'student@umindanao.edu.ph',
    'Student User',
    'student',
    'Department of Computing Education',
    'BS in Information Technology',
    '2026-00001'
  );

  v_seller_id := private.seed_or_get_user(
    'seller@umindanao.edu.ph',
    'Ava Seller',
    'student',
    'Department of Engineering Education',
    'Major in Computer Engineering',
    '2026-00002'
  );

  v_buyer_id := private.seed_or_get_user(
    'buyer@umindanao.edu.ph',
    'Marco Buyer',
    'student',
    'Department of Computing Education',
    'BS in Computer Science',
    '2026-00003'
  );

  v_renter_id := private.seed_or_get_user(
    'renter@umindanao.edu.ph',
    'Bea Renter',
    'student',
    'Department of Accounting Education',
    'BS in Accountancy',
    '2026-00004'
  );

  v_seller2_id := private.seed_or_get_user(
    'seller2@umindanao.edu.ph',
    'Jessa Seller',
    'student',
    'Department of Hospitality Education',
    'BS in Tourism Management',
    '2026-00005'
  );

  -- Keep current developer admin active if present
  perform private.seed_or_get_user(
    'ian.coronia@umindanao.edu.ph',
    'Ian Coronia',
    'admin',
    'Department of Computing Education',
    'BS in Information Technology',
    'UM-ADMIN-02'
  );

  -- ------------------------------------------------------------
  -- 2. SEED ITEMS
  -- ------------------------------------------------------------
  -- Available Sale: Engineering Calculator
  select id into v_item_calc from public.items where title = 'Engineering Calculator FX-991ES' limit 1;
  if v_item_calc is null then
    insert into public.items (
      seller_id, title, category, description, department, program, course_code,
      listing_type, condition, price, accepted_payment_methods,
      status, moderation_status
    ) values (
      v_seller_id, 'Engineering Calculator FX-991ES', 'Calculators',
      'Scientific calculator with clean keys, fresh battery, and a protective case.',
      'Department of Engineering Education', 'Major in Computer Engineering', 'ENG101',
      'sell', 'good', 650.00, array['gcash', 'cash_on_pickup']::text[],
      'available', 'approved'
    ) returning id into v_item_calc;
  end if;

  -- Available Rental: Arduino Starter Kit
  select id into v_item_arduino from public.items where title = 'Arduino Starter Kit Rental' limit 1;
  if v_item_arduino is null then
    insert into public.items (
      seller_id, title, category, description, department, program, course_code,
      listing_type, condition, price, daily_rental_rate, minimum_rental_days,
      maximum_rental_days, rental_duration_days, accepted_payment_methods,
      status, moderation_status
    ) values (
      v_seller_id, 'Arduino Starter Kit Rental', 'Lab & Science',
      'Starter kit with board, jumper wires, breadboard, LEDs, sensors, and USB cable.',
      'Department of Computing Education', 'BS in Information Technology', 'IT311',
      'rent', 'like_new', 75.00, 75.00, 2, 7, 7, array['gcash', 'maya', 'cash_on_pickup']::text[],
      'available', 'approved'
    ) returning id into v_item_arduino;
  end if;

  -- Pending Moderation: Nursing Uniform Set
  select id into v_item_uniform from public.items where title = 'Nursing Uniform Set for Review' limit 1;
  if v_item_uniform is null then
    insert into public.items (
      seller_id, title, category, description, department, program, course_code,
      listing_type, condition, price, accepted_payment_methods,
      status, moderation_status
    ) values (
      v_seller_id, 'Nursing Uniform Set for Review', 'Uniforms',
      'Complete uniform set waiting for admin moderation before it appears publicly.',
      'Department of Arts and Sciences Education', 'BS in Psychology', 'NSTP101',
      'sell', 'good', 850.00, array['cash_on_pickup']::text[],
      'available', 'pending'
    ) returning id into v_item_uniform;
  end if;

  -- Rejected Moderation: Photocopied Lab Manual
  select id into v_item_manual from public.items where title = 'Rejected Photocopied Lab Manual' limit 1;
  if v_item_manual is null then
    insert into public.items (
      seller_id, title, category, description, department, program, course_code,
      listing_type, condition, price, accepted_payment_methods,
      status, moderation_status, rejection_reason
    ) values (
      v_seller_id, 'Rejected Photocopied Lab Manual', 'Books',
      'Example rejected listing so the seller can see moderation feedback.',
      'Department of Computing Education', 'BS in Computer Science', 'CS204',
      'sell', 'fair', 120.00, array['gcash']::text[],
      'available', 'rejected', 'Please upload a clearer photo and confirm that the material is allowed for resale.'
    ) returning id into v_item_manual;
  end if;

  -- Pending Request Item: Data Structures Textbook
  select id into v_item_dsa from public.items where title = 'Data Structures Textbook' limit 1;
  if v_item_dsa is null then
    insert into public.items (
      seller_id, title, category, description, department, program, course_code,
      listing_type, condition, price, accepted_payment_methods,
      status, moderation_status
    ) values (
      v_seller_id, 'Data Structures Textbook', 'Books',
      'Used reference book with highlights on stacks, queues, trees, and graphs.',
      'Department of Computing Education', 'BS in Computer Science', 'CS202',
      'sell', 'good', 480.00, array['gcash', 'bank_transfer']::text[],
      'pending', 'approved'
    ) returning id into v_item_dsa;
  end if;

  -- Approved Request Item: Accounting Review Handouts
  select id into v_item_acc from public.items where title = 'Accounting Review Handouts' limit 1;
  if v_item_acc is null then
    insert into public.items (
      seller_id, title, category, description, department, program, course_code,
      listing_type, condition, price, accepted_payment_methods,
      status, moderation_status
    ) values (
      v_seller2_id, 'Accounting Review Handouts', 'Books',
      'Clean review handouts for accounting majors, bundled by topic.',
      'Department of Accounting Education', 'BS in Accountancy', 'ACC201',
      'sell', 'like_new', 300.00, array['maya', 'cash_on_pickup']::text[],
      'pending', 'approved'
    ) returning id into v_item_acc;
  end if;

  -- Completed Sale: Java Programming Book
  select id into v_item_java from public.items where title = 'Java Programming Book' limit 1;
  if v_item_java is null then
    insert into public.items (
      seller_id, title, category, description, department, program, course_code,
      listing_type, condition, price, accepted_payment_methods,
      status, moderation_status
    ) values (
      v_seller_id, 'Java Programming Book', 'Books',
      'Completed sale sample with receipt and ratings already available.',
      'Department of Computing Education', 'BS in Information Technology', 'IT203',
      'sell', 'good', 520.00, array['gcash']::text[],
      'sold', 'approved'
    ) returning id into v_item_java;
  end if;

  -- Available Second Seller Item: Tourism Presentation Clicker
  select id into v_item_clicker from public.items where title = 'Tourism Presentation Clicker' limit 1;
  if v_item_clicker is null then
    insert into public.items (
      seller_id, title, category, description, department, program, course_code,
      listing_type, condition, price, accepted_payment_methods,
      status, moderation_status
    ) values (
      v_seller2_id, 'Tourism Presentation Clicker', 'Gadgets',
      'Wireless clicker with laser pointer for class reports and defenses.',
      'Department of Hospitality Education', 'BS in Tourism Management', 'TM102',
      'sell', 'like_new', 350.00, array['gcash', 'maya']::text[],
      'available', 'approved'
    ) returning id into v_item_clicker;
  end if;

  -- ------------------------------------------------------------
  -- 3. SEED TRANSACTIONS
  -- ------------------------------------------------------------
  -- Pending Transaction: Buyer -> Seller for Data Structures Textbook
  select id into v_tx_pending from public.transactions where item_id = v_item_dsa limit 1;
  if v_tx_pending is null then
    insert into public.transactions (
      buyer_id, seller_id, item_id, status, payment_method
    ) values (
      v_buyer_id, v_seller_id, v_item_dsa, 'pending', 'gcash'
    ) returning id into v_tx_pending;
  end if;

  -- Approved Transaction: Renter -> Second Seller for Accounting Review Handouts
  select id into v_tx_approved from public.transactions where item_id = v_item_acc limit 1;
  if v_tx_approved is null then
    insert into public.transactions (
      buyer_id, seller_id, item_id, status, payment_method,
      meetup_location, meetup_time, payment_proof_path, payment_proof_uploaded_at
    ) values (
      v_renter_id, v_seller2_id, v_item_acc, 'approved', 'maya',
      'UM Main Library Lobby', now() + interval '1 day 15 hours 30 minutes',
      'demo-payment-proof-sample.pdf', now() - interval '2 hours'
    ) returning id into v_tx_approved;
  end if;

  -- Completed Sale: Buyer -> Seller for Java Programming Book
  select id into v_tx_completed from public.transactions where item_id = v_item_java limit 1;
  if v_tx_completed is null then
    insert into public.transactions (
      buyer_id, seller_id, item_id, status, payment_method,
      meetup_location, meetup_time
    ) values (
      v_buyer_id, v_seller_id, v_item_java, 'completed', 'gcash',
      'DPT Building Entrance', now() - interval '2 days 10 hours'
    ) returning id into v_tx_completed;
  end if;

  -- Completed Rental: Renter -> Seller for Arduino Starter Kit Rental
  select id into v_tx_rental from public.transactions where item_id = v_item_arduino limit 1;
  if v_tx_rental is null then
    insert into public.transactions (
      buyer_id, seller_id, item_id, status, payment_method,
      rental_duration_days, rental_due_date, meetup_location, meetup_time
    ) values (
      v_renter_id, v_seller_id, v_item_arduino, 'completed', 'cash_on_pickup',
      3, (current_date - interval '1 day')::date,
      'Engineering Lab 2', now() - interval '5 days 13 hours'
    ) returning id into v_tx_rental;
  end if;

  -- ------------------------------------------------------------
  -- 4. SEED CONVERSATIONS & MESSAGES
  -- ------------------------------------------------------------
  -- Conversation 1: Buyer & Seller about Data Structures Textbook
  select id into v_conv_buyer from public.conversations where item_id = v_item_dsa limit 1;
  if v_conv_buyer is null then
    insert into public.conversations (
      starter_id, recipient_id, item_id, last_message_at
    ) values (
      v_buyer_id, v_seller_id, v_item_dsa, now() - interval '15 minutes'
    ) returning id into v_conv_buyer;

    insert into public.messages (
      conversation_id, sender_id, body, type, read_at, meta
    ) values (
      v_conv_buyer, v_buyer_id, 'Hi, is Data Structures Textbook still available?',
      'text', now() - interval '14 minutes', '{"item_title":"Data Structures Textbook"}'::jsonb
    );

    insert into public.messages (
      conversation_id, sender_id, body, type, read_at, meta
    ) values (
      v_conv_buyer, v_seller_id, 'Yes, it is still available. I can meet at the university.',
      'text', now() - interval '10 minutes', '{"item_title":"Data Structures Textbook"}'::jsonb
    );

    insert into public.messages (
      conversation_id, sender_id, body, type, proposal_status,
      meetup_location, meetup_time, meta
    ) values (
      v_conv_buyer, v_seller_id, 'Meetup proposal sent.',
      'meetup_proposal', 'pending',
      'UM Main Library Lobby', now() + interval '1 day 16 hours',
      '{"item_title":"Data Structures Textbook"}'::jsonb
    );
  end if;

  -- Conversation 2: Renter & Second Seller about Accounting Handouts
  select id into v_conv_renter from public.conversations where item_id = v_item_acc limit 1;
  if v_conv_renter is null then
    insert into public.conversations (
      starter_id, recipient_id, item_id, last_message_at
    ) values (
      v_renter_id, v_seller2_id, v_item_acc, now() - interval '30 minutes'
    ) returning id into v_conv_renter;

    insert into public.messages (
      conversation_id, sender_id, body, type, read_at, meta
    ) values (
      v_conv_renter, v_renter_id, 'Hi, is Accounting Review Handouts still available?',
      'text', now() - interval '25 minutes', '{"item_title":"Accounting Review Handouts"}'::jsonb
    );

    insert into public.messages (
      conversation_id, sender_id, body, type, read_at, meta
    ) values (
      v_conv_renter, v_seller2_id, 'Yes, it is still available. I can meet at the university.',
      'text', now() - interval '20 minutes', '{"item_title":"Accounting Review Handouts"}'::jsonb
    );
  end if;

  -- ------------------------------------------------------------
  -- 5. SEED RATINGS
  -- ------------------------------------------------------------
  insert into public.ratings (
    reviewer_id, reviewed_user_id, transaction_id, rating, comment
  ) values
    (v_buyer_id, v_seller_id, v_tx_completed, 5, 'Smooth meetup and the item matched the description.'),
    (v_seller_id, v_buyer_id, v_tx_completed, 5, 'Buyer arrived on time and paid as agreed.')
  on conflict (reviewer_id, transaction_id) do nothing;

  -- ------------------------------------------------------------
  -- 6. SEED NOTIFICATIONS
  -- ------------------------------------------------------------
  insert into public.notifications (user_id, type, related_type, related_id, message, is_read)
  values
    (v_seller_id, 'request', 'transaction', v_tx_pending, 'New request received for Data Structures Textbook.', false),
    (v_buyer_id, 'message', 'transaction', v_tx_pending, 'A seller replied about Data Structures Textbook.', false),
    (v_renter_id, 'approval', 'transaction', v_tx_approved, 'Your request for Accounting Review Handouts was approved.', false),
    (v_seller2_id, 'payment_proof', 'transaction', v_tx_approved, 'Payment proof was uploaded for Accounting Review Handouts.', false),
    (v_buyer_id, 'completion', 'transaction', v_tx_completed, 'Transaction completed for Java Programming Book.', true),
    (v_seller_id, 'rating', 'transaction', v_tx_completed, 'Marco Buyer left a new rating.', false),
    (v_renter_id, 'rental_overdue', 'transaction', v_tx_rental, 'Rental for Arduino Starter Kit Rental is overdue.', false),
    (v_seller_id, 'item_pending', 'item', v_item_uniform, 'Your listing Nursing Uniform Set for Review is waiting for admin approval.', true),
    (v_seller_id, 'item_rejected', 'item', v_item_manual, 'Your listing Rejected Photocopied Lab Manual was rejected by admin.', false),
    (v_seller_id, 'item_approved', 'item', v_item_calc, 'Your listing Engineering Calculator FX-991ES is visible in the marketplace.', true),
    (v_seller2_id, 'item_approved', 'item', v_item_clicker, 'Your listing Tourism Presentation Clicker is visible in the marketplace.', true);

end;
$seeder$;
