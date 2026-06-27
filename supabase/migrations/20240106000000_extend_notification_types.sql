-- Extend notification types to support reactions, follows, and competitive events
ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'user_performance',
    'bar_performance',
    'comment',
    'yermat',
    'new_follower',
    'rank_beaten',
    'personal_best',
    'medal_earned'
  ));
