-- ============================================================
-- UM-PASA SEED SCRIPT: SAMPLE LISTINGS & ADMIN USER
-- ============================================================

-- 1. Auto-confirm any pending users (so login works immediately without email verification)
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;

-- 2. Make ian.coronia@umindanao.edu.ph an admin
update public.profiles
set role = 'admin',
    department = 'Department of Computing Education',
    program = 'BS in Information Technology'
where id in (select id from auth.users where email like 'ian%');

-- 3. Add sample approved marketplace listings
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
  rental_duration_days,
  condition,
  price,
  status,
  moderation_status
)
select
  p.id,
  item.title,
  item.category,
  item.description,
  item.department,
  item.program,
  item.course_code,
  item.listing_type,
  item.accepted_payment_methods,
  item.minimum_rental_days,
  item.maximum_rental_days,
  item.daily_rental_rate,
  item.rental_duration_days,
  item.condition,
  item.price,
  'available',
  'approved'
from (
  select id from public.profiles limit 1
) p
cross join (
  values
    (
      'Casio Scientific Calculator FX-991ES Plus',
      'Calculators',
      'Original Casio scientific calculator in excellent condition. Ideal for Engineering and Computing math courses.',
      'Department of Engineering Education',
      'Major in Computer Engineering',
      'MATH101',
      'sell',
      array['gcash', 'cash_on_pickup']::text[],
      null::int, null::int, null::numeric, null::int,
      'like_new',
      750.00::numeric
    ),
    (
      'Data Structures and Algorithms in C++ (5th Ed.)',
      'Books',
      'Official textbook for IT/CS core courses. Clean pages with minimal highlights.',
      'Department of Computing Education',
      'BS in Information Technology',
      'CC103',
      'sell',
      array['gcash', 'maya', 'cash_on_pickup']::text[],
      null::int, null::int, null::numeric, null::int,
      'good',
      450.00::numeric
    ),
    (
      'Arduino Uno R3 Starter Kit with Sensors',
      'Lab & Science',
      'Complete microcontroller kit for embedded systems lab projects. Includes breadboard, jumper wires, and sensor pack.',
      'Department of Computing Education',
      'BS in Computer Science',
      'CS202',
      'rent',
      array['cash_on_pickup', 'gcash']::text[],
      3, 30, 50.00::numeric, 30,
      'good',
      50.00::numeric
    ),
    (
      'UM College Uniform Set (Men Large)',
      'Uniforms',
      'Set of 2 college polo uniforms and 1 slacks. Properly washed and well-maintained.',
      'Department of Business Administration Education',
      'BS in Business Administration - Major in Financial Management',
      'GENED',
      'sell',
      array['cash_on_pickup']::text[],
      null::int, null::int, null::numeric, null::int,
      'good',
      600.00::numeric
    ),
    (
      'Drawing Board and T-Square Set (Engineering)',
      'Engineering Tools',
      '24x36 drafting board with transparent edge T-square, triangle rulers, and compass.',
      'Department of Engineering Education',
      'Major in Computer Engineering',
      'ENG101',
      'rent',
      array['gcash', 'cash_on_pickup']::text[],
      7, 60, 40.00::numeric, 60,
      'like_new',
      40.00::numeric
    )
) as item(
  title, category, description, department, program, course_code,
  listing_type, accepted_payment_methods, minimum_rental_days,
  maximum_rental_days, daily_rental_rate, rental_duration_days,
  condition, price
);
