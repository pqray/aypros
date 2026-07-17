-- Fase 17: remover lead do pipeline registra atividade própria.
alter type public.activity_type add value if not exists 'lead_archived';
