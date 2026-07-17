-- Cairn — seed fixtures. DEMO DATA ONLY, all doctors are fictional.
-- Names are prefixed [DEMO] so they are unmistakable in any UI.
-- Idempotent: fixed UUIDs + on conflict do nothing; safe to re-run.

insert into doctors (id, full_name, title, specialties, bio, languages, consultation_fee, is_active)
values
  (
    '11111111-1111-4111-a111-111111111101',
    '[DEMO] Dr. Amara Osei',
    'Clinical Psychologist',
    array['anxiety', 'depression'],
    'Fictional seed profile. Works with adults navigating anxiety and low mood, with a CBT-first approach.',
    array['en', 'fr'],
    8000,
    true
  ),
  (
    '11111111-1111-4111-a111-111111111102',
    '[DEMO] Dr. Jonas Lindqvist',
    'Psychiatrist',
    array['psychiatry', 'depression'],
    'Fictional seed profile. Consultant psychiatrist; medication review and treatment-resistant depression.',
    array['en', 'sv'],
    12000,
    true
  ),
  (
    '11111111-1111-4111-a111-111111111103',
    '[DEMO] Dr. Priya Raman',
    'Trauma Therapist',
    array['trauma', 'anxiety'],
    'Fictional seed profile. EMDR-trained therapist supporting recovery from trauma and PTSD.',
    array['en', 'ta'],
    9000,
    true
  ),
  (
    '11111111-1111-4111-a111-111111111104',
    '[DEMO] Dr. Mateo Alvarez',
    'Adolescent Counselor',
    array['adolescent', 'relationships'],
    'Fictional seed profile. Counselor for teens and young adults; family and relationship dynamics.',
    array['en', 'es'],
    7000,
    true
  ),
  (
    '11111111-1111-4111-a111-111111111105',
    '[DEMO] Dr. Hana Sato',
    'Addiction Specialist',
    array['addiction', 'depression'],
    'Fictional seed profile. Harm-reduction focused addiction specialist and recovery planner.',
    array['en', 'ja'],
    9500,
    true
  ),
  (
    '11111111-1111-4111-a111-111111111106',
    '[DEMO] Dr. Leah Rosen',
    'Grief Counselor',
    array['grief', 'relationships'],
    'Fictional seed profile. Grief and bereavement counselor; loss, life transitions, and couples work.',
    array['en', 'he'],
    7500,
    true
  )
on conflict (id) do nothing;

-- Two weeks of availability for every [DEMO] doctor: weekdays only,
-- 50-minute sessions starting 09/10/11/14/15/16h (server time).

insert into availability_slots (doctor_id, starts_at, ends_at)
select
  d.id,
  s.slot_start,
  s.slot_start + interval '50 minutes'
from doctors d
cross join generate_series(1, 14) as gs (day)
cross join unnest(array[9, 10, 11, 14, 15, 16]) as hrs (hour)
cross join lateral (
  select date_trunc('day', now()) + make_interval(days => gs.day, hours => hrs.hour) as slot_start
) s
where d.full_name like '[DEMO]%'
  and extract(isodow from s.slot_start) between 1 and 5
on conflict (doctor_id, starts_at) do nothing;
