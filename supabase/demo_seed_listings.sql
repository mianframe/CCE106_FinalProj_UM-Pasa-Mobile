-- ==============================================================================
-- UM-PASA SEED SCRIPT: DEMO MARKETPLACE LISTINGS
-- Safe, Idempotent, and Non-Destructive: PRESERVES ALL EXISTING USERS & ACCOUNTS
-- ==============================================================================
-- Instructions: Run this script in your Supabase SQL Editor.
-- It will populate realistic University of Mindanao marketplace listings
-- across Books, Uniforms, Calculators, Engineering Tools, and Lab Equipment.
-- It assigns seller_id to existing profile(s) in your database without altering them.
-- ==============================================================================

do $$
declare
  v_seller_id uuid;
  v_count integer;
begin
  -- 1. Grab an existing active user/seller (prefers a student profile, falls back to any profile)
  select id into v_seller_id
  from public.profiles
  where role = 'student'
  limit 1;

  if v_seller_id is null then
    select id into v_seller_id
    from public.profiles
    limit 1;
  end if;

  if v_seller_id is null then
    raise notice 'No profiles found in public.profiles. Please create at least one account before running this seed.';
    return;
  end if;

  raise notice 'Using profile % as the demo seller for seeded listings.', v_seller_id;

  -- 2. Insert realistic academic listings (idempotent: checks for existing titles)
  insert into public.items (
    seller_id,
    title,
    category,
    description,
    department,
    program,
    course_code,
    listing_type,
    accepted_payment_methods,
    minimum_rental_days,
    maximum_rental_days,
    daily_rental_rate,
    condition,
    price,
    status,
    moderation_status,
    created_at
  )
  select
    v_seller_id,
    d.title,
    d.category,
    d.description,
    d.department,
    d.program,
    d.course_code,
    d.listing_type,
    d.accepted_payment_methods,
    d.minimum_rental_days,
    d.maximum_rental_days,
    d.daily_rental_rate,
    d.condition,
    d.price,
    d.status,
    d.moderation_status,
    now() - (d.days_ago || ' hours')::interval
  from (
    values
      -- CALCULATORS
      (
        'Casio fx-991EX ClassWiz Scientific Calculator',
        'Calculators',
        'Authentic Casio ClassWiz with 552 functions, natural textbook display, and solar power. Recommended for Engineering, Math, and Architecture courses. No scratches, clean battery.',
        'Department of Engineering Education',
        'Major in Computer Engineering',
        'MATH111',
        'sell',
        array['cash_on_pickup', 'gcash']::text[],
        null::int, null::int, null::numeric,
        'like_new',
        950.00::numeric,
        'available',
        'approved',
        3
      ),
      (
        'Casio fx-991ES Plus 2nd Edition (Rental)',
        'Calculators',
        'Available for midterm/final exam week rentals. Includes protective slide-on hard case and fresh battery. Meetup on campus SUB or Library.',
        'Department of Computing Education',
        'BS in Computer Science',
        'CC102',
        'rent',
        array['cash_on_pickup', 'gcash']::text[],
        2, 30, 25.00::numeric,
        'good',
        25.00::numeric,
        'available',
        'approved',
        5
      ),
      (
        'Sharp EL-W506T Scientific Calculator (422 Functions)',
        'Calculators',
        'WriteView 4-line display scientific calculator. Used for one semester in Statistics. Works flawlessly.',
        'Department of Arts and Sciences Education',
        'BS in Psychology',
        'STAT101',
        'sell',
        array['cash_on_pickup']::text[],
        null::int, null::int, null::numeric,
        'like_new',
        780.00::numeric,
        'available',
        'approved',
        12
      ),

      -- TEXTBOOKS
      (
        'University Physics with Modern Physics (Young & Freedman)',
        'Books',
        'Standard physics reference book for engineering students. Complete chapters with practice problem sets. Clean pages, covered with plastic wrapper.',
        'Department of Engineering Education',
        'Major in Electrical Engineering',
        'PHYS101',
        'sell',
        array['cash_on_pickup', 'gcash']::text[],
        null::int, null::int, null::numeric,
        'good',
        650.00::numeric,
        'available',
        'approved',
        8
      ),
      (
        'Thomas Calculus: Early Transcendentals (14th Edition)',
        'Books',
        'Comprehensive calculus textbook covering differential and integral calculus, multivariable, and vector calculus. Essential for 1st/2nd year STEM students.',
        'Department of Engineering Education',
        'Major in Electronics Engineering',
        'CALC101',
        'sell',
        array['cash_on_pickup', 'gcash']::text[],
        null::int, null::int, null::numeric,
        'like_new',
        580.00::numeric,
        'available',
        'approved',
        18
      ),
      (
        'Data Structures & Algorithms in Java (Goodrich & Tamassia)',
        'Books',
        'Official reference textbook for BSCS and BSIT 2nd year. Covers trees, graphs, heaps, and algorithmic complexity. Very minimal pencil annotations.',
        'Department of Computing Education',
        'BS in Information Technology',
        'IT211',
        'sell',
        array['cash_on_pickup', 'gcash']::text[],
        null::int, null::int, null::numeric,
        'good',
        490.00::numeric,
        'available',
        'approved',
        24
      ),
      (
        'Financial Accounting & Reporting 2024 Edition (Valix)',
        'Books',
        'Comprehensive CPA board exam syllabus reviewer for BSA and BSMA students. Volume 1 and 2 discussion and conceptual questions.',
        'Department of Accounting Education',
        'BS in Accountancy',
        'ACTG101',
        'sell',
        array['cash_on_pickup', 'gcash']::text[],
        null::int, null::int, null::numeric,
        'like_new',
        520.00::numeric,
        'available',
        'approved',
        6
      ),
      (
        'Fundamentals of Nursing (Potter & Perry 10th Ed)',
        'Books',
        'Hardbound clinical textbook for clinical skills, nursing process, and patient care management. Available for semester rental with refundable security deposit.',
        'Department of Arts and Sciences Education',
        'BS in Psychology',
        'NURS102',
        'rent',
        array['cash_on_pickup', 'gcash']::text[],
        7, 90, 35.00::numeric,
        'good',
        35.00::numeric,
        'available',
        'approved',
        30
      ),
      (
        'Revised Penal Code: Criminal Law Book 1 & 2 (Reyes)',
        'Books',
        'Annotated criminal law textbook covering felonies and criminal liability. Clean margins, no missing pages.',
        'Department of Criminal Justice Education',
        'BS in Criminology',
        'CRIM101',
        'sell',
        array['cash_on_pickup']::text[],
        null::int, null::int, null::numeric,
        'good',
        480.00::numeric,
        'available',
        'approved',
        40
      ),

      -- UNIFORMS & APPAREL
      (
        'UM Official College Department Polo (Male, Size Medium)',
        'Uniforms',
        'Original UM embroidered college polo. Used for only one term, washed and ironed, no tears or stains. Ready for campus dress code.',
        'Department of Computing Education',
        'BS in Information Technology',
        'GE101',
        'sell',
        array['cash_on_pickup', 'gcash']::text[],
        null::int, null::int, null::numeric,
        'like_new',
        280.00::numeric,
        'available',
        'approved',
        9
      ),
      (
        'UM PE Uniform Shirt & Jogging Pants Set (Size Large)',
        'Uniforms',
        'Complete Physical Education set with school crest print. Breathable drifit fabric shirt with drawstring pants. Clean condition.',
        'Department of Teacher Education',
        'Bachelor in Physical Education',
        'PE101',
        'sell',
        array['cash_on_pickup', 'gcash']::text[],
        null::int, null::int, null::numeric,
        'good',
        360.00::numeric,
        'available',
        'approved',
        14
      ),
      (
        'Hospital Duty Scrub Suit (Navy Blue, Unisex Size S)',
        'Uniforms',
        'Three-pocket medical top with drawstring cargo pants. Preshrunk antimicrobial cotton-polyester blend. Perfect for lab duties and skills demonstrations.',
        'Department of Hospitality Education',
        'BS in Hotel and Restaurant Management',
        'LAB101',
        'sell',
        array['cash_on_pickup', 'gcash']::text[],
        null::int, null::int, null::numeric,
        'like_new',
        420.00::numeric,
        'available',
        'approved',
        20
      ),

      -- ENGINEERING & DRAFTING TOOLS
      (
        'Rotring 36-Inch Acrylic T-Square with Beveled Edge',
        'Engineering Tools',
        'Professional grade drafting T-square with transparent ruling edges and calibrated head. Indispensable for Plate 1-10 drafting coursework.',
        'Department of Engineering Education',
        'Major in Computer Engineering',
        'ENGG101',
        'sell',
        array['cash_on_pickup', 'gcash']::text[],
        null::int, null::int, null::numeric,
        'good',
        590.00::numeric,
        'available',
        'approved',
        7
      ),
      (
        'Portable A3 Technical Drawing Board with Parallel Motion Ruler',
        'Engineering Tools',
        'Sturdy A3 drawing board with magnetic paper clamp and dual protractor guides. Available for plate deadline rentals. Great for architecture and engineering students.',
        'Department of Engineering Education',
        'Major in Electrical Engineering',
        'DRAW101',
        'rent',
        array['cash_on_pickup', 'gcash']::text[],
        3, 21, 40.00::numeric,
        'like_new',
        40.00::numeric,
        'available',
        'approved',
        11
      ),
      (
        'Triangular Architect Scale & Professional Compass Set',
        'Engineering Tools',
        'Solid aluminum triangular reduction scale ruler (1:100 to 1:500) paired with a heavy-duty quick-release precision compass set in hard travel case.',
        'Department of Engineering Education',
        'Major in Electronics Engineering',
        'TECH102',
        'sell',
        array['cash_on_pickup']::text[],
        null::int, null::int, null::numeric,
        'like_new',
        340.00::numeric,
        'available',
        'approved',
        15
      ),

      -- LAB & SCIENCE
      (
        'UM Laboratory Coat (100% Cotton, Unisex Size M)',
        'Lab & Science',
        'Mandatory white laboratory coat for Biology, Chemistry, and Organic Synthesis laboratory classes. Features knee-length cut and reinforced front pockets.',
        'Department of Arts and Sciences Education',
        'BS in Psychology',
        'CHEM101',
        'sell',
        array['cash_on_pickup', 'gcash']::text[],
        null::int, null::int, null::numeric,
        'like_new',
        320.00::numeric,
        'available',
        'approved',
        16
      ),
      (
        '14-Piece Anatomy Dissection Kit with Stainless Steel Scalpels',
        'Lab & Science',
        'High-grade surgical steel dissection kit containing dissecting forceps, scissors, scalpels, needles, and magnifying glass in leatherette zip pouch.',
        'Department of Arts and Sciences Education',
        'BS in Psychology',
        'BIO102',
        'rent',
        array['cash_on_pickup', 'gcash']::text[],
        2, 14, 30.00::numeric,
        'good',
        30.00::numeric,
        'available',
        'approved',
        22
      ),
      (
        'Littmann-Style Dual Head Diagnostic Stethoscope (Classic)',
        'Lab & Science',
        'High acoustic sensitivity stethoscope with soft sealing eartips and tunable diaphragm. High clarity for vital signs and clinical assessment practice.',
        'Department of Arts and Sciences Education',
        'BS in Psychology',
        'PHYS102',
        'sell',
        array['cash_on_pickup', 'gcash']::text[],
        null::int, null::int, null::numeric,
        'like_new',
        1150.00::numeric,
        'available',
        'approved',
        2
      ),

      -- GADGETS & STUDY SUPPLIES
      (
        'Huion Inspiroy H640P Graphic Drawing Tablet',
        'Gadgets',
        'Battery-free stylus drawing tablet with 8192 levels of pressure sensitivity. Compatible with Android phones, Mac, and Windows. Ideal for digital art, UI design, and notes.',
        'Department of Computing Education',
        'BS in Information Technology',
        'IT301',
        'sell',
        array['cash_on_pickup', 'gcash']::text[],
        null::int, null::int, null::numeric,
        'like_new',
        1250.00::numeric,
        'available',
        'approved',
        1
      ),
      (
        'Rechargeable LED Desk Study Lamp (Touch Dimmer & Warm Light)',
        'Supplies',
        'Dorm study lamp with 3 color temperatures (warm, natural, white) and adjustable brightness. Built-in battery lasts up to 8 hours during brownouts.',
        'Department of Computing Education',
        'BS in Computer Science',
        'GEN101',
        'sell',
        array['cash_on_pickup']::text[],
        null::int, null::int, null::numeric,
        'good',
        290.00::numeric,
        'available',
        'approved',
        13
      ),

      -- 2 PENDING ITEMS (Allows Admin to demonstrate the listing review workflow during the demo!)
      (
        'Civil Engineering Field Transit Level & Tripod (Rental)',
        'Engineering Tools',
        'Surveying optical level for field work exercises. Calibrated 32x magnification telescope with aluminum leveling rod. Submitting for admin verification.',
        'Department of Engineering Education',
        'Major in Computer Engineering',
        'SURV101',
        'rent',
        array['cash_on_pickup', 'gcash']::text[],
        1, 10, 80.00::numeric,
        'like_new',
        80.00::numeric,
        'available',
        'pending',
        1
      ),
      (
        'Business Marketing Management (Kotler & Keller 16th Ed)',
        'Books',
        'Strategic brand marketing and consumer behavior framework textbook. Clean condition, slight cover wear.',
        'Department of Business Administration Education',
        'BS in Business Administration - Major in Marketing Management',
        'MKTG101',
        'sell',
        array['cash_on_pickup', 'gcash']::text[],
        null::int, null::int, null::numeric,
        'good',
        420.00::numeric,
        'available',
        'pending',
        1
      )
  ) as d(
    title, category, description, department, program, course_code,
    listing_type, accepted_payment_methods,
    minimum_rental_days, maximum_rental_days, daily_rental_rate,
    condition, price, status, moderation_status, days_ago
  )
  where not exists (
    select 1 from public.items where title = d.title
  );

  get diagnostics v_count = row_count;
  raise notice 'Successfully seeded % new demo listings without modifying existing accounts.', v_count;
end $$;
