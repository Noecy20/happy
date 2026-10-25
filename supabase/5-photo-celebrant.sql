-- =====================================================================
-- Happy v5.3 : photo de la personne fêtée (couverture du livre d'or)
-- À exécuter APRÈS 4-livre-dor.sql (aucune perte de données).
-- Modifiable même après publication (prepare_event ne verrouille que le prénom, la date et les liens).
-- =====================================================================

alter table public.events add column if not exists photo_url text;
