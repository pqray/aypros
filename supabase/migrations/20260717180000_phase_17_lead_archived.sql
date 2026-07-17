-- Fase 17: remover lead do pipeline registra atividade propria.
alter type public.activity_type add value if not exists 'lead_archived';
