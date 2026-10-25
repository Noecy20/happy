-- ATTENTION : efface TOUTES les données de la base « happy » (à utiliser seulement pour repartir de zéro).
--   psql -U postgres -d happy -f 0-reinitialiser-local.sql
--   psql -U postgres -d happy -f happy-local.sql
drop schema if exists auth cascade;
drop schema if exists public cascade;
create schema public;
grant usage on schema public to public;
