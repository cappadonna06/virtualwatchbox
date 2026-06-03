-- 026_reclassify_watch_types.sql
-- Repair miscategorized catalog_watches.watch_type.
--
-- The historical intake inference put a bare `tank` and a bare `field` token
-- in the "Field" rule with first-match-wins ordering, so Cartier Tanks (dress)
-- and anything whose text merely mentioned "field" were dumped into the Field
-- bucket. That contaminated the /discover slot-fill + upgrade algorithm, which
-- keys off watch_type.
--
-- This drains the polluted bucket: for rows currently typed 'Field', recompute
-- the type from brand/family/model using the canonical rule order
-- (scripts/watchTypeClassifier.ts) and update only when the model clearly is
-- NOT a field watch. Genuine field watches (Khaki Field, Railmaster, Explorer,
-- etc.) match a 'Field' rule and are left unchanged. Non-Field rows are never
-- touched, so per-reference nuance elsewhere is preserved.
--
-- GENERATED FILE — do not hand-edit. Regenerate with:
--   npx tsx scripts/reclassify-watch-types.ts
-- and re-run `npm run catalog:seed-full` later to pick up empty-gap fills the
-- CSV pass also applied (this migration intentionally only repairs 'Field').

update public.catalog_watches as c
set watch_type = sub.new_type
from (
  select
    id,
    watch_type,
    case
      when txt ~* 'gmt[- ]?master' then 'GMT'
      when txt ~* 'explorer ii' then 'GMT'
      when txt ~* 'sky[- ]?dweller' then 'GMT'
      when txt ~* 'spirit zulu' then 'GMT'
      when txt ~* 'aqua terra worldtimer' then 'GMT'
      when txt ~* 'daytona|cosmograph' then 'Chronograph'
      when txt ~* 'speedmaster' then 'Chronograph'
      when txt ~* 'el[ -]?primero' then 'Chronograph'
      when txt ~* 'datograph' then 'Chronograph'
      when txt ~* 'monaco' then 'Chronograph'
      when txt ~* 'submariner' then 'Diver'
      when txt ~* 'sea[- ]?dweller|deepsea|deep sea' then 'Diver'
      when txt ~* 'superocean(?!.*chrono)' then 'Diver'
      when txt ~* 'fifty fathoms(?!.*chrono)' then 'Diver'
      when txt ~* 'pelagos' then 'Diver'
      when txt ~* 'ploprof' then 'Diver'
      when txt ~* 'planet ocean(?!.*chrono)' then 'Diver'
      when txt ~* 'seamaster diver|seamaster 300' then 'Diver'
      when txt ~* 'legend diver' then 'Diver'
      when txt ~* 'hydroconquest|hydro conquest' then 'Diver'
      when txt ~* 'aquaracer|aqua racer' then 'Diver'
      when txt ~* 'aquis(?!.*(chrono|gmt))' then 'Diver'
      when txt ~* 'ocean star|seastar|sea star' then 'Diver'
      when txt ~* 'ingenieur (automatic 40|sl)|ingenieur.*(3289|3239|1832)' then 'Integrated Bracelet'
      when txt ~* 'big pilot' then 'Pilot'
      when txt ~* 'pilot''?s watch' then 'Pilot'
      when txt ~* 'fliegeruhr|flieger' then 'Pilot'
      when txt ~* 'khaki aviation|khaki x-wind|khaki takeoff|khaki pilot' then 'Pilot'
      when txt ~* 'khaki field(?!.*chrono)' then 'Field'
      when txt ~* 'railmaster' then 'Field'
      when txt ~* 'expedition north|expedition scout' then 'Field'
      when txt ~* 'tank' then 'Dress'
      when txt ~* 'reverso(?!.*chrono)' then 'Dress'
      when txt ~* 'ballon bleu' then 'Dress'
      when txt ~* 'cle de cartier|cle de' then 'Dress'
      when txt ~* 'cellini' then 'Dress'
      when txt ~* 'calatrava' then 'Dress'
      when txt ~* 'patrimony|patrimoine|traditionnelle' then 'Dress'
      when txt ~* 'saxonia' then 'Dress'
      when txt ~* 'dolcevita|dolce vita' then 'Dress'
      when txt ~* 'de ville(?!.*chrono)' then 'Dress'
      when txt ~* 'world[- ]?time|worldtimer|world tour|dual time|second time zone| gmt|^gmt' then 'GMT'
      when txt ~* 'chronograph|chronomat|chronospace|navitimer' then 'Chronograph'
      when txt ~* 'pilot|aviator|navigator|cockpit|spitfire|top gun' then 'Pilot'
      when txt ~* 'diver|divers|deep|fathom|aqua|nautical|scuba|sub ' then 'Diver'
      when txt ~* 'nautilus|royal oak|laureato|overseas|alpine eagle|polo s|odyssey|tonda pf|octo finissimo|defy' then 'Integrated Bracelet'
      when txt ~* 'field|khaki|expedition|trail|mil[- ]?spec|trench' then 'Field'
      when txt ~* 'datejust|day-?date|patrimony|portofino|portugieser|presence|elegant|flagship|master collection|baroncelli|jazzmaster|max bill|tangente|ludwig|orion|trésor|tresor|evidenza|la grande' then 'Dress'
      when txt ~* 'oyster perpetual|milgauss|air[- ]?king|prx|conquest|big bang|ingenieur' then 'Sport'
      else watch_type
    end as new_type
  from (
    select
      id,
      watch_type,
      lower(coalesce(brand, '') || ' ' || coalesce(model_family, '') || ' ' || coalesce(model, '')) as txt
    from public.catalog_watches
  ) t
) sub
where c.id = sub.id
  and c.watch_type = 'Field'
  and sub.new_type <> 'Field'
  and sub.new_type <> c.watch_type;
